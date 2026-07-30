import { and, eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "../../../db";
import { assets, auditEvents, projects } from "../../../db/schema";
import {
  actorFrom,
  jsonError,
  makeId,
  requireOwner,
  resolveClientAccess,
  sha256,
  WORKSPACE_ID,
} from "../_lib";

type StoredObject = {
  body: BodyInit;
  httpMetadata?: { contentType?: string };
};

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const projectId = String(form.get("projectId") ?? "");
    const token = String(form.get("token") ?? "");
    if (!(file instanceof File) || !projectId) {
      return jsonError("A file and project are required");
    }
    if (file.size > 25 * 1024 * 1024) {
      return jsonError("Files must be 25 MB or smaller", 413);
    }

    const clientAccess = await resolveClientAccess(request, token || null);
    if (!clientAccess) await requireOwner(request);
    const db = getDb();
    const project = await db
      .select({ id: projects.id, clientId: projects.clientId })
      .from(projects)
      .where(eq(projects.id, projectId))
      .get();
    if (!project) return jsonError("Project not found", 404);
    if (clientAccess && project.clientId !== clientAccess.clientId) {
      return jsonError("Portal access is invalid or expired", 401);
    }

    const bytes = await file.arrayBuffer();
    const digest = await sha256(bytes);
    const assetId = makeId("asset");
    const storageKey = `${WORKSPACE_ID}/${projectId}/${assetId}/${file.name}`;
    const actor = clientAccess
      ? `client:${clientAccess.clientId}`
      : actorFrom(request);
    const now = new Date().toISOString();

    await env.MEDIA.put(storageKey, bytes, {
      httpMetadata: { contentType: file.type || "application/octet-stream" },
      customMetadata: { originalName: file.name },
    });
    await db.batch([
      db.insert(assets).values({
        id: assetId,
        workspaceId: WORKSPACE_ID,
        projectId,
        clientId: project.clientId,
        storageKey,
        originalName: file.name,
        mediaType: file.type.startsWith("image/") ? "image" : "file",
        mimeType: file.type || "application/octet-stream",
        byteSize: file.size,
        sha256: digest,
        sourceType: clientAccess ? "client_upload" : "owner_upload",
        extractionStatus: "stored",
        createdBy: actor,
        createdAt: now,
      }),
      db.insert(auditEvents).values({
        id: makeId("audit"),
        workspaceId: WORKSPACE_ID,
        actorType: clientAccess ? "client" : "user",
        actorId: actor,
        action: "asset.uploaded",
        targetType: "asset",
        targetId: assetId,
        riskLevel: "low",
        outcome: "succeeded",
        metadataJson: JSON.stringify({
          projectId,
          byteSize: file.size,
          mimeType: file.type,
        }),
        occurredAt: now,
      }),
    ]);

    return Response.json(
      { id: assetId, name: file.name, status: "stored" },
      { status: 201 },
    );
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unable to upload file",
      500,
    );
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const assetId = url.searchParams.get("id");
    const token = url.searchParams.get("token");
    if (!assetId) return jsonError("Asset id is required");
    const db = getDb();
    const row = await db
      .select()
      .from(assets)
      .where(and(eq(assets.id, assetId), eq(assets.workspaceId, WORKSPACE_ID)))
      .get();
    if (!row) return jsonError("File not found", 404);
    const clientAccess = await resolveClientAccess(request, token);
    if (clientAccess) {
      if (row.clientId !== clientAccess.clientId) {
        return jsonError("Portal access is invalid or expired", 401);
      }
    } else {
      await requireOwner(request);
    }
    const object = (await env.MEDIA.get(row.storageKey)) as StoredObject | null;
    if (!object) return jsonError("File content not found", 404);
    return new Response(object.body, {
      headers: {
        "content-type": row.mimeType,
        "content-disposition": `inline; filename="${row.originalName.replaceAll('"', "")}"`,
        "cache-control": "private, max-age=300",
      },
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unable to download file",
      500,
    );
  }
}
