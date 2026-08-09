import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import {
  auditEvents,
  notifications,
  workspaces,
} from "../../../db/schema";
import {
  automationSnapshot,
  runAutomationSweep,
} from "../../../lib/automation-engine";
import {
  actorFrom,
  jsonError,
  makeId,
  requireOwner,
  routeError,
  WORKSPACE_ID,
} from "../_lib";

export async function GET(request: Request) {
  try {
    await requireOwner(request);
    return Response.json(await automationSnapshot(WORKSPACE_ID));
  } catch (error) {
    return routeError(error, "Unable to load automations");
  }
}

export async function POST(request: Request) {
  try {
    await requireOwner(request);
    const payload = (await request.json().catch(() => ({}))) as {
      action?: "run" | "pause" | "resume" | "mark_notification";
      notificationId?: string;
      notificationStatus?: "read" | "dismissed";
    };
    if (payload.action === "run") {
      const result = await runAutomationSweep(
        WORKSPACE_ID,
        "owner_requested",
      );
      return Response.json({ result, snapshot: await automationSnapshot(WORKSPACE_ID) });
    }

    const db = getDb();
    const now = new Date().toISOString();
    if (payload.action === "pause" || payload.action === "resume") {
      const status = payload.action === "pause" ? "paused" : "active";
      await db.batch([
        db
          .update(workspaces)
          .set({ automationStatus: status, updatedAt: now })
          .where(eq(workspaces.id, WORKSPACE_ID)),
        db.insert(auditEvents).values({
          id: makeId("audit"),
          workspaceId: WORKSPACE_ID,
          actorType: "user",
          actorId: actorFrom(request),
          action: `automation.${status}`,
          targetType: "workspace",
          targetId: WORKSPACE_ID,
          riskLevel: "medium",
          outcome: "succeeded",
          metadataJson: JSON.stringify({ priorApprovalRequired: true }),
          occurredAt: now,
        }),
      ]);
      return Response.json(await automationSnapshot(WORKSPACE_ID));
    }

    if (
      payload.action === "mark_notification" &&
      payload.notificationId &&
      ["read", "dismissed"].includes(payload.notificationStatus || "")
    ) {
      const status = payload.notificationStatus!;
      await db
        .update(notifications)
        .set({
          status,
          readAt: status === "read" ? now : null,
          dismissedAt: status === "dismissed" ? now : null,
        })
        .where(
          and(
            eq(notifications.id, payload.notificationId),
            eq(notifications.workspaceId, WORKSPACE_ID),
          ),
        );
      return Response.json(await automationSnapshot(WORKSPACE_ID));
    }

    return jsonError("A valid automation action is required");
  } catch (error) {
    return routeError(error, "Unable to update automations");
  }
}
