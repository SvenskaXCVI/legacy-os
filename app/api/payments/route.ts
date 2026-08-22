import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { auditEvents, clients, paymentRequests, projects } from "../../../db/schema";
import { makeId, requireOwner, routeError, WORKSPACE_ID } from "../_lib";
import { getStripe, stripeConfiguration } from "../../../lib/stripe";

const allowedKinds = new Set(["deposit", "invoice", "balance", "other"]);

export async function GET(request: Request) {
  try {
    await requireOwner(request);
    const db = getDb();
    const rows = await db
      .select({
        id: paymentRequests.id,
        projectId: paymentRequests.projectId,
        projectTitle: projects.title,
        clientId: paymentRequests.clientId,
        clientFirstName: clients.firstName,
        clientLastName: clients.lastName,
        kind: paymentRequests.kind,
        title: paymentRequests.title,
        description: paymentRequests.description,
        amountCents: paymentRequests.amountCents,
        amountPaidCents: paymentRequests.amountPaidCents,
        amountRefundedCents: paymentRequests.amountRefundedCents,
        currency: paymentRequests.currency,
        status: paymentRequests.status,
        dueAt: paymentRequests.dueAt,
        approvedAt: paymentRequests.approvedAt,
        paidAt: paymentRequests.paidAt,
        refundedAt: paymentRequests.refundedAt,
        createdAt: paymentRequests.createdAt,
        updatedAt: paymentRequests.updatedAt,
      })
      .from(paymentRequests)
      .leftJoin(projects, eq(paymentRequests.projectId, projects.id))
      .leftJoin(clients, eq(paymentRequests.clientId, clients.id))
      .where(eq(paymentRequests.workspaceId, WORKSPACE_ID))
      .orderBy(desc(paymentRequests.createdAt));
    const configuration = stripeConfiguration();
    return Response.json({
      payments: rows,
      configuration: {
        configured: configuration.configured,
        keyType: configuration.keyType,
        testMode: configuration.testMode,
        liveMode: configuration.liveMode,
        liveEnabled: configuration.liveEnabled,
        webhookConfigured: configuration.webhookConfigured,
      },
    });
  } catch (error) {
    return routeError(error, "Unable to load payments");
  }
}

export async function POST(request: Request) {
  try {
    const access = await requireOwner(request);
    const payload = (await request.json()) as {
      action?: "create" | "approve" | "void" | "refund";
      id?: string;
      projectId?: string;
      kind?: string;
      title?: string;
      description?: string;
      amountCents?: number;
      amount?: number;
      dueAt?: string;
      requestKey?: string;
      refundAmountCents?: number;
      reason?: string;
    };
    const db = getDb();
    const now = new Date().toISOString();
    const actorId = access.user!.id;

    if (payload.action === "create") {
      const amountCents = Number.isInteger(payload.amountCents)
        ? Number(payload.amountCents)
        : Math.round(Number(payload.amount || 0) * 100);
      if (!payload.projectId || !payload.requestKey?.trim() || !payload.title?.trim()) {
        return Response.json({ error: "Project, title, and request key are required" }, { status: 400 });
      }
      if (!Number.isInteger(amountCents) || amountCents < 50 || amountCents > 10_000_000) {
        return Response.json({ error: "Amount must be between $0.50 and $100,000" }, { status: 400 });
      }
      if (!allowedKinds.has(payload.kind || "deposit")) {
        return Response.json({ error: "Payment type is invalid" }, { status: 400 });
      }
      const project = await db.select().from(projects).where(and(
        eq(projects.id, payload.projectId),
        eq(projects.workspaceId, WORKSPACE_ID),
      )).get();
      if (!project?.clientId) return Response.json({ error: "Project must belong to a client" }, { status: 400 });
      const existing = await db.select().from(paymentRequests).where(and(
        eq(paymentRequests.workspaceId, WORKSPACE_ID),
        eq(paymentRequests.requestKey, payload.requestKey.trim()),
      )).get();
      if (existing) return Response.json({ payment: existing, idempotent: true });
      const id = makeId("pay");
      await db.batch([
        db.insert(paymentRequests).values({
          id,
          workspaceId: WORKSPACE_ID,
          projectId: project.id,
          clientId: project.clientId,
          kind: payload.kind || "deposit",
          title: payload.title.trim().slice(0, 120),
          description: payload.description?.trim().slice(0, 500) || null,
          amountCents,
          currency: "usd",
          status: "draft",
          dueAt: payload.dueAt || null,
          requestKey: payload.requestKey.trim(),
          createdAt: now,
          updatedAt: now,
        }),
        db.insert(auditEvents).values({
          id: makeId("audit"), workspaceId: WORKSPACE_ID, actorType: "owner", actorId,
          action: "payment_request.created", targetType: "payment_request", targetId: id,
          riskLevel: "medium", outcome: "draft_created",
          metadataJson: JSON.stringify({ amountCents, currency: "usd", projectId: project.id }), occurredAt: now,
        }),
      ]);
      return Response.json({ id, status: "draft" }, { status: 201 });
    }

    if (!payload.id) return Response.json({ error: "Payment request is required" }, { status: 400 });
    const payment = await db.select().from(paymentRequests).where(and(
      eq(paymentRequests.id, payload.id),
      eq(paymentRequests.workspaceId, WORKSPACE_ID),
    )).get();
    if (!payment) return Response.json({ error: "Payment request was not found" }, { status: 404 });

    if (payload.action === "approve") {
      if (payment.status !== "draft") return Response.json({ error: "Only draft requests can be approved" }, { status: 409 });
      await db.batch([
        db.update(paymentRequests).set({ status: "approved", approvedBy: actorId, approvedAt: now, updatedAt: now }).where(eq(paymentRequests.id, payment.id)),
        db.insert(auditEvents).values({ id: makeId("audit"), workspaceId: WORKSPACE_ID, actorType: "owner", actorId, action: "payment_request.approved", targetType: "payment_request", targetId: payment.id, riskLevel: "high", outcome: "approved", occurredAt: now }),
      ]);
      return Response.json({ id: payment.id, status: "approved" });
    }

    if (payload.action === "void") {
      if (!["approved", "open", "expired", "failed"].includes(payment.status)) return Response.json({ error: "This request cannot be voided" }, { status: 409 });
      if (payment.status === "open" && payment.stripeCheckoutSessionId) {
        await getStripe().checkout.sessions.expire(payment.stripeCheckoutSessionId, {}, { idempotencyKey: `legacy-void-${payment.id}` });
      }
      await db.batch([
        db.update(paymentRequests).set({ status: "void", checkoutUrl: null, updatedAt: now }).where(eq(paymentRequests.id, payment.id)),
        db.insert(auditEvents).values({ id: makeId("audit"), workspaceId: WORKSPACE_ID, actorType: "owner", actorId, action: "payment_request.voided", targetType: "payment_request", targetId: payment.id, riskLevel: "high", outcome: "voided", occurredAt: now }),
      ]);
      return Response.json({ id: payment.id, status: "void" });
    }

    if (payload.action === "refund") {
      if (!["paid", "partially_refunded"].includes(payment.status) || !payment.stripePaymentIntentId) return Response.json({ error: "Only settled payments can be refunded" }, { status: 409 });
      const refundable = payment.amountPaidCents - payment.amountRefundedCents;
      const amount = payload.refundAmountCents == null ? refundable : Number(payload.refundAmountCents);
      if (!Number.isInteger(amount) || amount < 1 || amount > refundable) return Response.json({ error: "Refund amount exceeds the refundable balance" }, { status: 400 });
      const refund = await getStripe().refunds.create({
        payment_intent: payment.stripePaymentIntentId,
        amount,
        reason: "requested_by_customer",
        metadata: { legacy_payment_request_id: payment.id, owner_reason: payload.reason?.trim().slice(0, 120) || "Owner-approved refund" },
      }, { idempotencyKey: `legacy-refund-${payment.id}-${payment.amountRefundedCents}-${amount}` });
      await db.batch([
        db.update(paymentRequests).set({ status: "refund_pending", updatedAt: now }).where(eq(paymentRequests.id, payment.id)),
        db.insert(auditEvents).values({ id: makeId("audit"), workspaceId: WORKSPACE_ID, actorType: "owner", actorId, action: "payment.refund_requested", targetType: "payment_request", targetId: payment.id, riskLevel: "critical", outcome: refund.status || "pending", metadataJson: JSON.stringify({ amountCents: amount, refundId: refund.id }), occurredAt: now }),
      ]);
      return Response.json({ id: payment.id, status: "refund_pending" });
    }
    return Response.json({ error: "Payment action is invalid" }, { status: 400 });
  } catch (error) {
    return routeError(error, "Unable to update payment");
  }
}
