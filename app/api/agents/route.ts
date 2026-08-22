import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { agentTasks, auditEvents } from "../../../db/schema";
import {
  executeAgentTask,
  listAgentOperations,
  routeAgentTask,
} from "../../../lib/agent-engine";
import {
  actorFrom,
  makeId,
  requireOwner,
  routeError,
  WORKSPACE_ID,
} from "../_lib";

export async function GET(request: Request) {
  try {
    await requireOwner(request);
    return Response.json(await listAgentOperations(WORKSPACE_ID));
  } catch (error) {
    return routeError(error, "Unable to load AI staff operations");
  }
}

export async function POST(request: Request) {
  try {
    await requireOwner(request);
    const payload = (await request.json()) as {
      taskType?: string;
      title?: string;
      instructionSummary?: string;
      requestedAction?: string;
      projectId?: string;
      clientId?: string;
      priority?: number;
      riskLevel?: "low" | "medium" | "high" | "critical";
      idempotencyKey?: string;
      actionPayload?: Record<string, unknown>;
    };
    if (!payload.taskType?.trim() || !payload.title?.trim() || !payload.instructionSummary?.trim()) {
      return Response.json({ error: "Task type, title, and instruction are required" }, { status: 400 });
    }
    if (payload.requestedAction === "send_client_message" && (!payload.clientId || !String(payload.actionPayload?.messageBody || "").trim())) {
      return Response.json({ error: "Choose a client and provide the exact message body before requesting approval" }, { status: 400 });
    }
    if (payload.requestedAction === "schedule_appointment" && (!payload.clientId || !String(payload.actionPayload?.startsAt || "").trim())) {
      return Response.json({ error: "Choose a client and appointment start time before requesting approval" }, { status: 400 });
    }
    const task = await routeAgentTask({
      workspaceId: WORKSPACE_ID,
      taskType: payload.taskType.trim(),
      title: payload.title.trim(),
      instructionSummary: payload.instructionSummary.trim(),
      requestedAction: payload.requestedAction?.trim(),
      projectId: payload.projectId || null,
      clientId: payload.clientId || null,
      requestedByType: "owner",
      requestedById: actorFrom(request),
      sourceType: "owner_request",
      sourceId: payload.idempotencyKey || null,
      priority: Math.max(0, Math.min(100, Number(payload.priority || 50))),
      riskLevel: payload.riskLevel || "low",
      idempotencyKey: payload.idempotencyKey,
      actionPayload: payload.actionPayload,
    });
    return Response.json({ task }, { status: 201 });
  } catch (error) {
    return routeError(error, "Unable to route AI staff task");
  }
}

export async function PATCH(request: Request) {
  try {
    await requireOwner(request);
    const payload = (await request.json()) as { taskId?: string; action?: "run" | "retry" | "cancel" };
    if (!payload.taskId || !payload.action) return Response.json({ error: "taskId and action are required" }, { status: 400 });
    const db = getDb();
    const task = await db.select().from(agentTasks).where(and(eq(agentTasks.id, payload.taskId), eq(agentTasks.workspaceId, WORKSPACE_ID))).get();
    if (!task) return Response.json({ error: "Agent task not found" }, { status: 404 });
    if (payload.action === "cancel") {
      if (["succeeded", "cancelled"].includes(task.status)) return Response.json({ task, idempotent: true });
      const now = new Date().toISOString();
      await db.batch([
        db.update(agentTasks).set({ status: "cancelled", resultSummary: "Cancelled by the owner.", completedAt: now, updatedAt: now }).where(eq(agentTasks.id, task.id)),
        db.insert(auditEvents).values({ id: makeId("audit"), workspaceId: WORKSPACE_ID, actorType: "owner", actorId: actorFrom(request), action: "agent.task_cancelled", targetType: "agent_task", targetId: task.id, riskLevel: task.riskLevel, outcome: "cancelled", correlationId: task.correlationId, metadataJson: "{}", occurredAt: now }),
      ]);
    } else {
      if (payload.action === "retry") {
        if (task.attempts >= task.maxAttempts) return Response.json({ error: "Maximum retry attempts reached" }, { status: 409 });
        await db.update(agentTasks).set({ status: task.approvalRequired ? "held_for_approval" : "queued", errorSummary: null, updatedAt: new Date().toISOString() }).where(eq(agentTasks.id, task.id));
      }
      await executeAgentTask(task.id, WORKSPACE_ID, db);
    }
    return Response.json({ task: await db.select().from(agentTasks).where(eq(agentTasks.id, task.id)).get() });
  } catch (error) {
    return routeError(error, "Unable to update AI staff task");
  }
}
