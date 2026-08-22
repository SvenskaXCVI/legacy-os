import { and, desc, eq, isNull } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "../../../db";
import { assets, auditEvents, projects } from "../../../db/schema";
import { captureAutomationSignal } from "../../../lib/automation-engine";
import {
  actorFrom,
  jsonError,
  makeId,
  requireOwner,
  resolveClientAccess,
  routeError,
  sha256,
  WORKSPACE_ID,
} from "../_lib";

type StoredObject = {
  body: BodyInit;
  httpMetadata?: { contentType?: string };
};

const assetRoles = new Set([
  "client_reference", "artist_reference", "body_photo", "mockup",
  "design_iteration", "final_design", "stencil", "session_photo",
  "fresh_tattoo", "healed_tattoo", "content_asset", "consent_document", "other",
]);
const visibilities = new Set(["internal", "client_shared", "public"]);
const rightsStatuses = new Set(["unknown", "client_provided", "studio_created", "authorized", "restricted"]);
const consentStatuses = new Set(["not_required", "pending", "granted", "revoked"]);
const contentRoles = new Set(["final_design", "session_photo", "fresh_tattoo", "healed_tattoo", "content_asset"]);

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const projectId = String(form.get("projectId") ?? "");
    const token = String(form.get("token") ?? "");
    const requestedRole = String(form.get("assetRole") ?? "");
    const parentAssetId = String(form.get("parentAssetId") ?? "");
    if (!(file instanceof File) || !projectId) {
      return jsonError("A file and project are required");
    }
    if (file.size > 25 * 1024 * 1024) {
      return jsonError("Files must be 25 MB or smaller", 413);
    }
    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    if (["exe", "dll", "js", "mjs", "html", "htm", "svg", "bat", "cmd"].includes(extension)) {
      return jsonError("This file type is not permitted", 415);
    }

    const clientAccess = await resolveClientAccess(request, token || null);
    if (!clientAccess) await requireOwner(request);
    const db = getDb();
    const project = await db
      .select({ id: projects.id, clientId: projects.clientId })
      .from(projects)
      .where(
        and(
          eq(projects.id, projectId),
          eq(projects.workspaceId, WORKSPACE_ID),
        ),
      )
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
    const parent = !clientAccess && parentAssetId
      ? await db.select().from(assets).where(and(
          eq(assets.id, parentAssetId), eq(assets.projectId, projectId),
          eq(assets.workspaceId, WORKSPACE_ID), isNull(assets.deletedAt),
        )).get()
      : null;
    if (parentAssetId && !clientAccess && !parent) return jsonError("The selected parent design was not found", 404);
    const assetRole = clientAccess
      ? "client_reference"
      : parent?.assetRole || (assetRoles.has(requestedRole) ? requestedRole : "design_iteration");
    const versionGroupId = parent?.versionGroupId || parent?.id || assetId;
    const latestVersion = parent
      ? await db.select({ version: assets.version }).from(assets)
          .where(and(eq(assets.versionGroupId, versionGroupId), eq(assets.workspaceId, WORKSPACE_ID)))
          .orderBy(desc(assets.version)).get()
      : null;
    const version = parent ? (latestVersion?.version || parent.version) + 1 : 1;

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
        assetRole,
        visibility: clientAccess ? "client_shared" : "internal",
        version,
        versionGroupId,
        parentAssetId: parent?.id || null,
        rightsStatus: clientAccess ? "client_provided" : "studio_created",
        consentStatus: "not_required",
        contentEligible: false,
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
          assetRole,
          version,
          versionGroupId,
          parentAssetId: parent?.id || null,
        }),
        occurredAt: now,
      }),
    ]);
    await captureAutomationSignal(
      {
        workspaceId: WORKSPACE_ID,
        eventType: "asset_uploaded",
        sourceType: "asset",
        sourceId: assetId,
        projectId,
        clientId: project.clientId,
        category: "knowledge",
        signalKey: `asset.uploaded:${file.type || "application/octet-stream"}`,
        value: {
          assetId,
          mediaType: file.type.startsWith("image/") ? "image" : "file",
          mimeType: file.type || "application/octet-stream",
          byteSize: file.size,
          sourceType: clientAccess ? "client_upload" : "owner_upload",
          assetRole,
          version,
          versionGroupId,
          integrityVerified: true,
        },
        priority: 70,
      },
      db,
    );

    return Response.json(
      { id: assetId, name: file.name, status: "stored" },
      { status: 201 },
    );
  } catch (error) {
    return routeError(error, "Unable to upload file");
  }
}

export async function PATCH(request: Request) {
  try {
    const access = await requireOwner(request);
    const payload = (await request.json()) as {
      id?: string;
      assetRole?: string;
      visibility?: string;
      rightsStatus?: string;
      consentStatus?: string;
      contentEligible?: boolean;
    };
    if (!payload.id) return jsonError("Asset id is required");
    const db = getDb();
    const asset = await db.select().from(assets).where(and(
      eq(assets.id, payload.id), eq(assets.workspaceId, WORKSPACE_ID), isNull(assets.deletedAt),
    )).get();
    if (!asset) return jsonError("File not found", 404);
    const assetRole = payload.assetRole ?? asset.assetRole;
    const visibility = payload.visibility ?? asset.visibility;
    const rightsStatus = payload.rightsStatus ?? asset.rightsStatus;
    const consentStatus = payload.consentStatus ?? asset.consentStatus;
    if (!assetRoles.has(assetRole) || !visibilities.has(visibility) || !rightsStatuses.has(rightsStatus) || !consentStatuses.has(consentStatus)) {
      return jsonError("One or more asset classifications are invalid");
    }
    const wantsContent = payload.contentEligible ?? asset.contentEligible;
    if (wantsContent && (!contentRoles.has(assetRole) || !["studio_created", "authorized"].includes(rightsStatus) || consentStatus !== "granted")) {
      return jsonError("Publishing eligibility requires an eligible tattoo/content role, authorized rights, and granted client consent");
    }
    const now = new Date().toISOString();
    await db.batch([
      db.update(assets).set({ assetRole, visibility, rightsStatus, consentStatus, contentEligible: wantsContent }).where(eq(assets.id, asset.id)),
      db.insert(auditEvents).values({
        id: makeId("audit"), workspaceId: WORKSPACE_ID, actorType: "owner", actorId: access.user!.id,
        action: "asset.classification_updated", targetType: "asset", targetId: asset.id,
        riskLevel: visibility === "public" || wantsContent ? "high" : "medium", outcome: "updated",
        metadataJson: JSON.stringify({ before: { assetRole: asset.assetRole, visibility: asset.visibility, rightsStatus: asset.rightsStatus, consentStatus: asset.consentStatus, contentEligible: asset.contentEligible }, after: { assetRole, visibility, rightsStatus, consentStatus, contentEligible: wantsContent } }),
        occurredAt: now,
      }),
    ]);
    return Response.json({ id: asset.id, assetRole, visibility, rightsStatus, consentStatus, contentEligible: wantsContent });
  } catch (error) {
    return routeError(error, "Unable to update asset classification");
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
      .where(
        and(
          eq(assets.id, assetId),
          eq(assets.workspaceId, WORKSPACE_ID),
          isNull(assets.deletedAt),
        ),
      )
      .get();
    if (!row) return jsonError("File not found", 404);
    const clientAccess = await resolveClientAccess(request, token);
    if (clientAccess) {
      if (
        row.clientId !== clientAccess.clientId ||
        !["client_shared", "public"].includes(row.visibility)
      ) {
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
    return routeError(error, "Unable to download file");
  }
}
