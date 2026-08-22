import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { auditEvents, automationPlaybooks } from "../../../db/schema";
import {
  listPlaybookOperations,
  processDuePlaybookSteps,
  runPlaybook,
} from "../../../lib/playbook-engine";
import { actorFrom, requireOwner, routeError, WORKSPACE_ID } from "../_lib";

export async function GET(request: Request) {
  try {
    await requireOwner(request);
    return Response.json(await listPlaybookOperations(WORKSPACE_ID));
  } catch (error) {
    return routeError(error, "Unable to load production playbooks");
  }
}

export async function POST(request: Request) {
  try {
    await requireOwner(request);
    const payload = (await request.json()) as {
      action?: "run" | "toggle" | "sweep";
      playbookKey?: string;
      enabled?: boolean;
      projectId?: string | null;
      clientId?: string | null;
      requestKey?: string;
    };
    const db = getDb();

    if (payload.action === "sweep") {
      return Response.json(await processDuePlaybookSteps(WORKSPACE_ID, db));
    }

    if (!payload.playbookKey) {
      return Response.json({ error: "A playbook is required" }, { status: 400 });
    }

    if (payload.action === "toggle") {
      if (typeof payload.enabled !== "boolean") {
        return Response.json({ error: "An enabled state is required" }, { status: 400 });
      }
      const now = new Date().toISOString();
      const playbook = await db
        .select()
        .from(automationPlaybooks)
        .where(and(eq(automationPlaybooks.workspaceId, WORKSPACE_ID), eq(automationPlaybooks.playbookKey, payload.playbookKey)))
        .get();
      if (!playbook) return Response.json({ error: "Playbook not found" }, { status: 404 });
      await db.batch([
        db.update(automationPlaybooks).set({ enabled: payload.enabled, updatedAt: now }).where(eq(automationPlaybooks.id, playbook.id)),
        db.insert(auditEvents).values({
          id: `audit_${crypto.randomUUID()}`,
          workspaceId: WORKSPACE_ID,
          actorType: "owner",
          actorId: actorFrom(request),
          action: payload.enabled ? "playbook.enabled" : "playbook.disabled",
          targetType: "automation_playbook",
          targetId: playbook.id,
          riskLevel: "low",
          outcome: "succeeded",
          metadataJson: JSON.stringify({ playbookKey: payload.playbookKey }),
          occurredAt: now,
        }),
      ]);
      return Response.json({ status: "saved", enabled: payload.enabled });
    }

    if (payload.action !== "run") {
      return Response.json({ error: "Unknown playbook action" }, { status: 400 });
    }
    const run = await runPlaybook({
      workspaceId: WORKSPACE_ID,
      playbookKey: payload.playbookKey,
      sourceEventType: payload.playbookKey === "daily_studio_brief" ? "manual_daily_brief" : "manual_playbook",
      projectId: payload.projectId || null,
      clientId: payload.clientId || null,
      idempotencyKey: `owner:${payload.requestKey || crypto.randomUUID()}:${payload.playbookKey}`,
    }, db);
    if (!run) return Response.json({ error: "This playbook is disabled or unavailable" }, { status: 409 });
    return Response.json({ run });
  } catch (error) {
    return routeError(error, "Unable to manage production playbook");
  }
}
