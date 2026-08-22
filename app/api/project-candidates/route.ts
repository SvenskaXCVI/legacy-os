import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import {
  auditEvents,
  clientMessages,
  projectCandidates,
  projects,
} from "../../../db/schema";
import { captureAutomationSignal } from "../../../lib/automation-engine";
import {
  actorFrom,
  jsonError,
  makeId,
  requireOwner,
  routeError,
  WORKSPACE_ID,
} from "../_lib";

const actions = new Set(["approve", "needs_details", "reject"]);

export async function POST(request: Request) {
  try {
    await requireOwner(request);
    const payload = (await request.json()) as {
      id?: string;
      action?: "approve" | "needs_details" | "reject";
      response?: string;
    };
    if (!payload.id || !payload.action || !actions.has(payload.action)) {
      return jsonError("Candidate id and a valid review action are required");
    }
    if (payload.action === "needs_details" && !payload.response?.trim()) {
      return jsonError("Tell the client what additional information is needed");
    }

    const db = getDb();
    const candidate = await db
      .select()
      .from(projectCandidates)
      .where(
        and(
          eq(projectCandidates.id, payload.id),
          eq(projectCandidates.workspaceId, WORKSPACE_ID),
        ),
      )
      .get();
    if (!candidate) return jsonError("Project request not found", 404);
    if (candidate.proposedProjectId && payload.action === "approve") {
      return Response.json({
        id: candidate.id,
        projectId: candidate.proposedProjectId,
        status: "approved",
        idempotent: true,
      });
    }

    const now = new Date().toISOString();
    const actor = actorFrom(request);
    if (payload.action === "approve") {
      const projectId = makeId("prj");
      await db.batch([
        db.insert(projects).values({
          id: projectId,
          workspaceId: WORKSPACE_ID,
          clientId: candidate.clientId,
          title: candidate.requestedTitle,
          lifecyclePhase: "consult",
          status: "active",
          placement: candidate.placement,
          sizeDescription: candidate.sizeDescription,
          styleTagsJson: candidate.styleTagsJson,
          budgetMinCents: candidate.budgetMinCents,
          budgetMaxCents: candidate.budgetMaxCents,
          targetDate: candidate.targetDate,
          nextAction: "Review client intake and schedule consultation",
          summary: [
            candidate.concept,
            candidate.referencesSummary
              ? `References: ${candidate.referencesSummary}`
              : null,
            candidate.constraints
              ? `Constraints: ${candidate.constraints}`
              : null,
          ]
            .filter(Boolean)
            .join("\n\n"),
          clientSummary: candidate.concept,
          requestKey: `candidate:${candidate.id}`,
          createdAt: now,
          updatedAt: now,
        }),
        db
          .update(projectCandidates)
          .set({
            status: "approved",
            proposedProjectId: projectId,
            clientResponse:
              payload.response?.trim() ||
              "Your project request was approved for consultation.",
            reviewedBy: actor,
            reviewedAt: now,
            updatedAt: now,
          })
          .where(eq(projectCandidates.id, candidate.id)),
        db.insert(auditEvents).values({
          id: makeId("audit"),
          workspaceId: WORKSPACE_ID,
          actorType: "user",
          actorId: actor,
          action: "project_candidate.approved",
          targetType: "project_candidate",
          targetId: candidate.id,
          riskLevel: "medium",
          outcome: "project_created",
          metadataJson: JSON.stringify({ projectId }),
          occurredAt: now,
        }),
      ]);
      await captureAutomationSignal(
        {
          workspaceId: WORKSPACE_ID,
          eventType: "project_candidate_approved",
          sourceType: "project_candidate",
          sourceId: candidate.id,
          projectId,
          clientId: candidate.clientId,
          category: "workflow",
          signalKey: "project.candidate_approved",
          value: {
            extractionMethod: candidate.extractionMethod,
            confidenceBps: candidate.confidenceBps,
          },
          priority: 90,
        },
        db,
      );
      return Response.json({
        id: candidate.id,
        projectId,
        status: "approved",
      });
    }

    const status = payload.action === "needs_details" ? "needs_details" : "rejected";
    const response =
      payload.response?.trim() ||
      "The studio is unable to move this request forward at this time.";
    const messageId = makeId("msg");
    await db.batch([
      db
        .update(projectCandidates)
        .set({
          status,
          clientResponse: response,
          reviewedBy: actor,
          reviewedAt: now,
          updatedAt: now,
        })
        .where(eq(projectCandidates.id, candidate.id)),
      db.insert(clientMessages).values({
        id: messageId,
        workspaceId: WORKSPACE_ID,
        clientId: candidate.clientId,
        projectId: null,
        senderType: "owner",
        senderId: actor,
        body: response,
        status: "sent",
        createdAt: now,
      }),
      db.insert(auditEvents).values({
        id: makeId("audit"),
        workspaceId: WORKSPACE_ID,
        actorType: "user",
        actorId: actor,
        action: `project_candidate.${status}`,
        targetType: "project_candidate",
        targetId: candidate.id,
        riskLevel: "medium",
        outcome: "recorded",
        metadataJson: JSON.stringify({ messageId }),
        occurredAt: now,
      }),
    ]);
    await captureAutomationSignal(
      {
        workspaceId: WORKSPACE_ID,
        eventType: `project_candidate_${status}`,
        sourceType: "project_candidate",
        sourceId: candidate.id,
        clientId: candidate.clientId,
        category: "workflow",
        signalKey: `project.candidate_${status}`,
        value: { responseSent: true },
        priority: 80,
      },
      db,
    );
    return Response.json({ id: candidate.id, status, messageId });
  } catch (error) {
    return routeError(error, "Unable to review project request");
  }
}
