import Stripe from "stripe";
import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { auditEvents, notifications, paymentCustomers, paymentEvents, paymentRequests } from "../../../../db/schema";
import { getStripe, sha256Hex, stripeWebhookSecret } from "../../../../lib/stripe";
import { captureAutomationSignal } from "../../../../lib/automation-engine";
import { makeId, WORKSPACE_ID } from "../../_lib";

function identifier(value: string | { id: string } | null | undefined) {
  return typeof value === "string" ? value : value?.id || null;
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing Stripe signature", { status: 400 });
  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = await getStripe().webhooks.constructEventAsync(
      body,
      signature,
      stripeWebhookSecret(),
      undefined,
      Stripe.createSubtleCryptoProvider(),
    );
  } catch {
    return new Response("Invalid Stripe signature", { status: 400 });
  }

  const db = getDb();
  const digest = await sha256Hex(body);
  await db.insert(paymentEvents).values({
    id: makeId("payevt"), workspaceId: WORKSPACE_ID, externalEventId: event.id,
    eventType: event.type, externalObjectId: "id" in event.data.object ? String(event.data.object.id) : null,
    payloadDigest: digest, status: "received",
  }).onConflictDoNothing();
  const ledgerEvent = await db.select().from(paymentEvents).where(eq(paymentEvents.externalEventId, event.id)).get();
  if (!ledgerEvent) return new Response("Unable to record event", { status: 500 });
  if (ledgerEvent.status === "processed") return Response.json({ received: true, idempotent: true });

  try {
    let paymentRequestId: string | null = null;
    let signal: { projectId: string; clientId: string; amountCents: number; status: string } | null = null;
    const now = new Date().toISOString();

    if (["checkout.session.completed", "checkout.session.async_payment_succeeded", "checkout.session.async_payment_failed", "checkout.session.expired"].includes(event.type)) {
      const session = event.data.object as Stripe.Checkout.Session;
      paymentRequestId = session.metadata?.legacy_payment_request_id || session.client_reference_id || null;
      const payment = paymentRequestId
        ? await db.select().from(paymentRequests).where(and(eq(paymentRequests.id, paymentRequestId), eq(paymentRequests.workspaceId, WORKSPACE_ID))).get()
        : await db.select().from(paymentRequests).where(eq(paymentRequests.stripeCheckoutSessionId, session.id)).get();
      if (payment) {
        paymentRequestId = payment.id;
        const settled =
          event.type === "checkout.session.async_payment_succeeded" ||
          (event.type === "checkout.session.completed" &&
            ["paid", "no_payment_required"].includes(session.payment_status));
        if (settled) {
          const amountPaid = session.amount_total || payment.amountCents;
          await db.update(paymentRequests).set({
            status: "paid", amountPaidCents: amountPaid,
            stripePaymentIntentId: identifier(session.payment_intent),
            checkoutUrl: null, paidAt: now, updatedAt: now,
          }).where(eq(paymentRequests.id, payment.id));
          const customerId = identifier(session.customer);
          if (customerId) {
            await db.insert(paymentCustomers).values({
              id: makeId("paycus"), workspaceId: payment.workspaceId, clientId: payment.clientId,
              externalCustomerId: customerId, emailAtLink: session.customer_details?.email || null,
              createdAt: now, updatedAt: now,
            }).onConflictDoUpdate({
              target: [paymentCustomers.workspaceId, paymentCustomers.clientId, paymentCustomers.provider],
              set: { externalCustomerId: customerId, emailAtLink: session.customer_details?.email || null, updatedAt: now },
            });
          }
          signal = { projectId: payment.projectId, clientId: payment.clientId, amountCents: amountPaid, status: "paid" };
          await db.insert(notifications).values({
            id: makeId("notice"), workspaceId: payment.workspaceId, projectId: payment.projectId,
            severity: "success", category: "payments", title: "Payment received",
            body: `${payment.title} was paid successfully.`, dedupeKey: `payment-paid-${payment.id}`,
            createdAt: now,
          }).onConflictDoNothing();
        } else if (event.type !== "checkout.session.completed") {
          const nextStatus = event.type === "checkout.session.expired" ? "expired" : "failed";
          await db.update(paymentRequests).set({ status: nextStatus, checkoutUrl: null, updatedAt: now }).where(eq(paymentRequests.id, payment.id));
        }
      }
    }

    if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge;
      const intentId = identifier(charge.payment_intent);
      const payment = intentId ? await db.select().from(paymentRequests).where(eq(paymentRequests.stripePaymentIntentId, intentId)).get() : null;
      if (payment) {
        paymentRequestId = payment.id;
        const refunded = charge.amount_refunded;
        const status = refunded >= payment.amountPaidCents ? "refunded" : "partially_refunded";
        await db.update(paymentRequests).set({ amountRefundedCents: refunded, status, refundedAt: now, updatedAt: now }).where(eq(paymentRequests.id, payment.id));
        signal = { projectId: payment.projectId, clientId: payment.clientId, amountCents: refunded, status };
      }
    }

    await db.batch([
      db.update(paymentEvents).set({ paymentRequestId, status: "processed", processedAt: now, error: null }).where(eq(paymentEvents.id, ledgerEvent.id)),
      db.insert(auditEvents).values({
        id: makeId("audit"), workspaceId: WORKSPACE_ID, actorType: "system", actorId: "stripe-webhook",
        action: `stripe.${event.type}`, targetType: "payment_request", targetId: paymentRequestId,
        riskLevel: "high", outcome: "verified_and_processed", correlationId: event.id,
        metadataJson: JSON.stringify({ payloadDigest: digest }), occurredAt: now,
      }),
    ]);
    if (signal && paymentRequestId) {
      await captureAutomationSignal({
        workspaceId: WORKSPACE_ID, eventType: `payment_${signal.status}`, sourceType: "payment_request",
        sourceId: paymentRequestId, projectId: signal.projectId, clientId: signal.clientId,
        category: "financial_outcome", signalKey: `payment.${signal.status}`,
        value: { amountCents: signal.amountCents, currency: "usd", verifiedBy: "stripe_webhook" }, qualityBps: 10000, priority: 90,
      }, db).catch(() => null);
    }
    return Response.json({ received: true });
  } catch (error) {
    await db.update(paymentEvents).set({ status: "failed", error: (error instanceof Error ? error.message : "Processing failed").slice(0, 500) }).where(eq(paymentEvents.id, ledgerEvent.id));
    return new Response("Webhook processing failed", { status: 500 });
  }
}
