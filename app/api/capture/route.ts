import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { captureEvents, clients, projects } from "../../../db/schema";
import { captureAutomationSignal } from "../../../lib/automation-engine";
import {
  actorFrom,
  requireOwner,
  routeError,
  WORKSPACE_ID,
} from "../_lib";

export async function GET(request: Request) {
  try {
    await requireOwner(request);
    const db = getDb();
    const rows = await db
      .select()
      .from(captureEvents)
      .where(eq(captureEvents.workspaceId, WORKSPACE_ID))
      .orderBy(desc(captureEvents.occurredAt))
      .limit(100);
    return Response.json({ events: rows });
  } catch (error) {
    return routeError(error, "Unable to load the capture stream");
  }
}

export async function POST(request: Request) {
  try {
    const access = await requireOwner(request);
    const payload = (await request.json()) as {
      title?: string;
      body?: string;
      projectId?: string | null;
      clientId?: string | null;
      requestKey?: string;
    };
    const title = payload.title?.trim();
    const body = payload.body?.trim();
    if (!title || !body) {
      return Response.json(
        { error: "A title and note are required" },
        { status: 400 },
      );
    }
    if (title.length > 240 || body.length > 4_000) {
      return Response.json(
        { error: "Capture notes are limited to a 240 character title and 4,000 character body" },
        { status: 400 },
      );
    }

    const db = getDb();
    const projectId = payload.projectId || null;
    let clientId = payload.clientId || null;
    if (projectId) {
      const project = await db
        .select({ id: projects.id, clientId: projects.clientId })
        .from(projects)
        .where(and(eq(projects.workspaceId, WORKSPACE_ID), eq(projects.id, projectId)))
        .get();
      if (!project) return Response.json({ error: "Project was not found" }, { status: 404 });
      clientId = project.clientId;
    } else if (clientId) {
      const client = await db
        .select({ id: clients.id })
        .from(clients)
        .where(and(eq(clients.workspaceId, WORKSPACE_ID), eq(clients.id, clientId)))
        .get();
      if (!client) return Response.json({ error: "Client was not found" }, { status: 404 });
    }

    const sourceId = `owner_note_${payload.requestKey || crypto.randomUUID()}`;
    const result = await captureAutomationSignal(
      {
        workspaceId: WORKSPACE_ID,
        projectId,
        clientId,
        actorType: "owner",
        actorId: access.user?.id || actorFrom(request),
        channel: "owner",
        eventType: "owner_note_captured",
        sourceType: "capture_note",
        sourceId,
        title,
        summary: body,
        contentPolicy: "explicit_owner_note",
        category: "knowledge",
        signalKey: "knowledge.owner_note",
        value: {
          title,
          characterCount: body.length,
          explicitlyCaptured: true,
        },
        qualityBps: 9000,
        priority: projectId ? 70 : 50,
      },
      db,
    );

    return Response.json(
      { id: result.captureId, status: "normalized" },
      { status: 201 },
    );
  } catch (error) {
    return routeError(error, "Unable to capture the note");
  }
}
