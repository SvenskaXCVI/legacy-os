import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { auditEvents, clients, projects } from "../../../db/schema";
import { actorFrom, jsonError, makeId, requireOwner, routeError, WORKSPACE_ID } from "../_lib";
import {
  captureCompletedProject,
  captureObservation,
  enqueueLearningCycle,
  runLearningCycle,
} from "../../../lib/intelligence-engine";

export async function POST(request: Request) {
  try {
    await requireOwner(request);
    const payload = (await request.json()) as {
      clientId?: string;
      title?: string;
      placement?: string;
      style?: string;
      summary?: string;
      budgetMin?: number;
      budgetMax?: number;
      targetDate?: string;
      nextAction?: string;
    };
    if (!payload.clientId || !payload.title?.trim()) {
      return jsonError("A client and project title are required");
    }
    const db = getDb();
    const client = await db
      .select({ id: clients.id })
      .from(clients)
      .where(eq(clients.id, payload.clientId))
      .get();
    if (!client) return jsonError("Client not found", 404);

    const projectId = makeId("prj");
    const actor = actorFrom(request);
    const now = new Date().toISOString();
    await db.batch([
      db.insert(projects).values({
        id: projectId,
        workspaceId: WORKSPACE_ID,
        clientId: payload.clientId,
        title: payload.title.trim(),
        lifecyclePhase: "consult",
        placement: payload.placement?.trim() || null,
        styleTagsJson: JSON.stringify(
          payload.style
            ?.split(",")
            .map((tag) => tag.trim())
            .filter(Boolean) ?? [],
        ),
        summary: payload.summary?.trim() || null,
        budgetMinCents:
          typeof payload.budgetMin === "number"
            ? Math.round(payload.budgetMin * 100)
            : null,
        budgetMaxCents:
          typeof payload.budgetMax === "number"
            ? Math.round(payload.budgetMax * 100)
            : null,
        targetDate: payload.targetDate || null,
        nextAction: payload.nextAction?.trim() || "Complete project intake",
        createdAt: now,
        updatedAt: now,
      }),
      db.insert(auditEvents).values({
        id: makeId("audit"),
        workspaceId: WORKSPACE_ID,
        actorType: "user",
        actorId: actor,
        action: "project.created",
        targetType: "project",
        targetId: projectId,
        riskLevel: "low",
        outcome: "succeeded",
        metadataJson: JSON.stringify({ clientId: payload.clientId }),
        occurredAt: now,
      }),
    ]);
    await captureObservation(
      {
        workspaceId: WORKSPACE_ID,
        projectId,
        clientId: payload.clientId,
        sourceType: "project",
        sourceId: projectId,
        category: "workflow",
        signalKey: "project.created",
        value: {
          lifecyclePhase: "consult",
          placement: payload.placement?.trim() || null,
          styleTags:
            payload.style
              ?.split(",")
              .map((tag) => tag.trim())
              .filter(Boolean) ?? [],
        },
        occurredAt: now,
      },
      db,
    );
    await enqueueLearningCycle(WORKSPACE_ID, "project_created", projectId, db);
    return Response.json({ id: projectId, status: "created" }, { status: 201 });
  } catch (error) {
    return routeError(error, "Unable to create project");
  }
}

export async function PATCH(request: Request) {
  try {
    await requireOwner(request);
    const payload = (await request.json()) as {
      id?: string;
      lifecyclePhase?: string;
      status?: string;
      nextAction?: string | null;
      nextActionAt?: string | null;
      summary?: string | null;
    };
    if (!payload.id) return jsonError("Project id is required");
    if (
      payload.lifecyclePhase &&
      !["consult", "design", "approval", "session", "healing", "complete"].includes(
        payload.lifecyclePhase,
      )
    ) {
      return jsonError("Lifecycle phase is invalid");
    }
    const db = getDb();
    const existing = await db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.id, payload.id),
          eq(projects.workspaceId, WORKSPACE_ID),
        ),
      )
      .get();
    if (!existing) return jsonError("Project not found", 404);
    const now = new Date().toISOString();
    const actor = actorFrom(request);
    const nextPhase = payload.lifecyclePhase ?? existing.lifecyclePhase;
    await db.batch([
      db
        .update(projects)
        .set({
          lifecyclePhase: nextPhase,
          status:
            payload.status ??
            (nextPhase === "complete" ? "completed" : existing.status),
          nextAction:
            payload.nextAction === undefined
              ? existing.nextAction
              : payload.nextAction,
          nextActionAt:
            payload.nextActionAt === undefined
              ? existing.nextActionAt
              : payload.nextActionAt,
          summary:
            payload.summary === undefined ? existing.summary : payload.summary,
          updatedAt: now,
        })
        .where(eq(projects.id, existing.id)),
      db.insert(auditEvents).values({
        id: makeId("audit"),
        workspaceId: WORKSPACE_ID,
        actorType: "user",
        actorId: actor,
        action: "project.updated",
        targetType: "project",
        targetId: existing.id,
        riskLevel: "low",
        outcome: "succeeded",
        metadataJson: JSON.stringify({
          priorPhase: existing.lifecyclePhase,
          nextPhase,
        }),
        occurredAt: now,
      }),
    ]);
    await captureObservation(
      {
        workspaceId: WORKSPACE_ID,
        projectId: existing.id,
        clientId: existing.clientId,
        sourceType: "project",
        sourceId: existing.id,
        category: "workflow",
        signalKey: `project.phase:${nextPhase}`,
        value: {
          priorPhase: existing.lifecyclePhase,
          nextPhase,
          nextAction: payload.nextAction ?? existing.nextAction,
        },
        occurredAt: now,
      },
      db,
    );
    if (
      nextPhase === "complete" &&
      existing.lifecyclePhase !== "complete"
    ) {
      await captureCompletedProject(WORKSPACE_ID, existing.id, db);
      await runLearningCycle(
        WORKSPACE_ID,
        "project_completed",
        existing.id,
      );
    } else {
      await enqueueLearningCycle(
        WORKSPACE_ID,
        "project_updated",
        existing.id,
        db,
      );
    }
    return Response.json({
      id: existing.id,
      status: "updated",
      lifecyclePhase: nextPhase,
      learningQueued: true,
    });
  } catch (error) {
    return routeError(error, "Unable to update project");
  }
}
