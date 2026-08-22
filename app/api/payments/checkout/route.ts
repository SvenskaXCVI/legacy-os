import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { auditEvents, clients, paymentCustomers, paymentRequests } from "../../../../db/schema";
import { integrationIdentifier, getStripe } from "../../../../lib/stripe";
import { recordObservedConnectorExecution } from "../../../../lib/connector-engine";
import { jsonError, makeId, resolveClientAccess } from "../../_lib";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { token?: string; paymentRequestId?: string };
    const access = await resolveClientAccess(request, payload.token || null);
    if (!access) return jsonError("Verified client access is required", 401);
    if (!payload.paymentRequestId) return jsonError("Payment request is required");
    const db = getDb();
    const payment = await db.select().from(paymentRequests).where(and(
      eq(paymentRequests.id, payload.paymentRequestId),
      eq(paymentRequests.clientId, access.clientId),
      eq(paymentRequests.workspaceId, access.workspaceId),
    )).get();
    if (!payment) return jsonError("Payment request was not found", 404);
    if (!["approved", "open", "expired"].includes(payment.status)) return jsonError("This payment is not available", 409);
    if (payment.status === "open" && payment.checkoutUrl && payment.checkoutExpiresAt && new Date(payment.checkoutExpiresAt).getTime() > Date.now() + 30_000) {
      return Response.json({ url: payment.checkoutUrl, reused: true });
    }
    const client = await db.select({ email: clients.email, firstName: clients.firstName, lastName: clients.lastName }).from(clients).where(and(
      eq(clients.id, access.clientId), eq(clients.workspaceId, access.workspaceId),
    )).get();
    if (!client?.email) return jsonError("Add a verified email before paying", 400);
    const linkedCustomer = await db.select().from(paymentCustomers).where(and(
      eq(paymentCustomers.workspaceId, access.workspaceId),
      eq(paymentCustomers.clientId, access.clientId),
      eq(paymentCustomers.provider, "stripe"),
    )).get();
    const stripe = getStripe();
    const origin = new URL(request.url).origin;
    const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60;
    const attempt = payment.checkoutAttempt + 1;
    const commonMetadata = {
      legacy_payment_request_id: payment.id,
      legacy_workspace_id: access.workspaceId,
      legacy_project_id: payment.projectId,
      legacy_client_id: access.clientId,
    };
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      ...(linkedCustomer
        ? { customer: linkedCustomer.externalCustomerId }
        : { customer_email: client.email, customer_creation: "always" as const }),
      client_reference_id: payment.id,
      line_items: [{
        price_data: {
          currency: payment.currency,
          unit_amount: payment.amountCents,
          product_data: { name: payment.title, ...(payment.description ? { description: payment.description } : {}) },
        },
        quantity: 1,
      }],
      success_url: `${origin}/?payment=success`,
      cancel_url: `${origin}/?payment=cancelled`,
      expires_at: expiresAt,
      metadata: commonMetadata,
      payment_intent_data: { metadata: commonMetadata },
      integration_identifier: integrationIdentifier(),
    }, { idempotencyKey: `legacy-checkout-${payment.id}-${attempt}` });
    if (!session.url) throw new Error("Stripe did not return a checkout URL");
    const now = new Date().toISOString();
    await db.batch([
      db.update(paymentRequests).set({
        status: "open", stripeCheckoutSessionId: session.id, checkoutUrl: session.url,
        checkoutExpiresAt: new Date(expiresAt * 1000).toISOString(), checkoutAttempt: attempt, updatedAt: now,
      }).where(eq(paymentRequests.id, payment.id)),
      db.insert(auditEvents).values({
        id: makeId("audit"), workspaceId: access.workspaceId, actorType: "client", actorId: access.clientId,
        action: "payment.checkout_opened", targetType: "payment_request", targetId: payment.id,
        riskLevel: "medium", outcome: "redirect_created", metadataJson: JSON.stringify({ attempt }), occurredAt: now,
      }),
    ]);
    await recordObservedConnectorExecution({
      workspaceId: access.workspaceId,
      connectorKey: "stripe",
      actionType: "client_checkout",
      actorType: "client",
      actorId: access.clientId,
      idempotencyKey: `stripe-checkout:${session.id}`,
      externalReference: session.id,
      resultSummary: "Stripe-hosted Checkout session created; settlement remains webhook-authoritative.",
      redactedRequest: { paymentRequestId: payment.id, amountCents: payment.amountCents, currency: payment.currency, attempt },
    }, db).catch(() => null);
    return Response.json({ url: session.url });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to start secure checkout", 500);
  }
}
