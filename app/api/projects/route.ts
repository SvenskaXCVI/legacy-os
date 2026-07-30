import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { auditEvents, clients, projects } from "../../../db/schema";
import { actorFrom, jsonError, makeId, WORKSPACE_ID } from "../_lib";

export async function POST(request: Request) {
  try {
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
    return Response.json({ id: projectId, status: "created" }, { status: 201 });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unable to create project",
      500,
    );
  }
}
