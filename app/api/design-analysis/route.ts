import { and, desc, eq, isNull } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "../../../db";
import { aiEvents, aiRuns, assetAnalyses, assets, auditEvents, toolCalls, usageEvents } from "../../../db/schema";
import { runModel } from "../../../lib/model-adapter";
import { jsonError, makeId, requireOwner, routeError, WORKSPACE_ID } from "../_lib";

const ANALYSIS_VERSION = "tattoo-design-v1";
const analyzableRoles = new Set(["mockup", "design_iteration", "final_design", "stencil"]);

type StoredImage = { arrayBuffer(): Promise<ArrayBuffer> };

function toBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

export async function GET(request: Request) {
  try {
    await requireOwner(request);
    const assetId = new URL(request.url).searchParams.get("assetId");
    if (!assetId) return jsonError("Asset id is required");
    const rows = await getDb().select().from(assetAnalyses).where(and(
      eq(assetAnalyses.workspaceId, WORKSPACE_ID), eq(assetAnalyses.assetId, assetId),
    )).orderBy(desc(assetAnalyses.createdAt));
    return Response.json({ analyses: rows });
  } catch (error) {
    return routeError(error, "Unable to load design analysis");
  }
}

export async function POST(request: Request) {
  try {
    const access = await requireOwner(request);
    const payload = (await request.json()) as { assetId?: string };
    if (!payload.assetId) return jsonError("Select a design version to analyze");
    const db = getDb();
    const asset = await db.select().from(assets).where(and(
      eq(assets.id, payload.assetId), eq(assets.workspaceId, WORKSPACE_ID), isNull(assets.deletedAt),
    )).get();
    if (!asset || !asset.projectId) return jsonError("Design asset was not found", 404);
    if (asset.mediaType !== "image" || !asset.mimeType.startsWith("image/")) return jsonError("Visual analysis requires an image asset");
    if (!analyzableRoles.has(asset.assetRole)) return jsonError("Classify this file as a mockup, design iteration, final design, or stencil before analysis");
    if (!["studio_created", "authorized"].includes(asset.rightsStatus)) return jsonError("Visual analysis requires studio-created or explicitly authorized rights");
    if (asset.byteSize > 8 * 1024 * 1024) return jsonError("Visual analysis is limited to images of 8 MB or smaller");
    const prior = await db.select().from(assetAnalyses).where(and(
      eq(assetAnalyses.assetId, asset.id), eq(assetAnalyses.assetSha256, asset.sha256),
      eq(assetAnalyses.analysisVersion, ANALYSIS_VERSION), eq(assetAnalyses.status, "succeeded"),
    )).get();
    if (prior) return Response.json({ analysis: prior, idempotent: true });
    const object = await env.MEDIA.get(asset.storageKey) as StoredImage | null;
    if (!object) return jsonError("Image content was not found", 404);
    const started = new Date();
    const result = await runModel({
      purpose: "A vision-capable model is required before Legacy OS can analyze the visible design.",
      system: "You are the Legacy OS Design Analysis service. Analyze only visible evidence in the supplied tattoo design. Explain composition, focal hierarchy, value structure, flow for placement, readability, technical risks, and questions for the artist. Do not identify people, infer sensitive traits, make medical claims, or claim certainty about unseen details. Keep the artist in creative control and clearly distinguish observation from recommendation.",
      context: {
        asset: { role: asset.assetRole, version: asset.version, mimeType: asset.mimeType, byteSize: asset.byteSize },
        requestedOutput: "Concise evidence-led design review with visible observations, why they matter, and suggested artist checks.",
      },
      images: [{ mimeType: asset.mimeType, dataBase64: toBase64(await object.arrayBuffer()) }],
    });
    if (!result.usedExternalModel) return jsonError("Configure a vision-capable AI model before running visual analysis", 503);
    const now = new Date();
    const analysisId = makeId("analysis");
    const runId = makeId("run");
    const correlationId = crypto.randomUUID();
    const latencyMs = now.getTime() - started.getTime();
    const evidence = [{ assetId: asset.id, sha256: asset.sha256, version: asset.version, role: asset.assetRole }];
    await db.batch([
      db.insert(assetAnalyses).values({
        id: analysisId, workspaceId: WORKSPACE_ID, projectId: asset.projectId, assetId: asset.id,
        assetSha256: asset.sha256, assetVersion: asset.version, analysisVersion: ANALYSIS_VERSION,
        provider: result.provider, model: result.model, status: "succeeded", summary: result.summary,
        observationsJson: "[]", evidenceJson: JSON.stringify(evidence), confidenceBps: 7000,
        createdBy: access.user!.id, createdAt: now.toISOString(),
      }),
      db.insert(aiRuns).values({
        id: runId, workspaceId: WORKSPACE_ID, projectId: asset.projectId, correlationId,
        agentName: "Design Analyst", purpose: "Evidence-led tattoo design analysis", provider: result.provider,
        model: result.model, promptVersion: ANALYSIS_VERSION, contextPolicyVersion: "asset-content-explicit-v1",
        approvalPolicyVersion: "artist-final-v1", riskLevel: "medium", contentCapture: "redacted_summaries",
        inputHash: asset.sha256, reasoningSummary: result.summary, recommendation: result.summary,
        evidenceJson: JSON.stringify(evidence), confidenceBps: 7000, status: "succeeded",
        startedAt: started.toISOString(), completedAt: now.toISOString(), latencyMs, createdAt: started.toISOString(),
      }),
      db.insert(aiEvents).values({ id: makeId("evt"), workspaceId: WORKSPACE_ID, runId, sequence: 1, eventType: "design.analysis_completed", status: "succeeded", summary: "A version-bound visual design analysis was recorded.", metadataJson: JSON.stringify({ analysisId, assetId: asset.id }), occurredAt: now.toISOString() }),
      db.insert(toolCalls).values({ id: makeId("tool"), workspaceId: WORKSPACE_ID, runId, toolName: "Vision model adapter", operation: "analyze_design", destination: result.provider, parametersHash: asset.sha256, parametersRedactedJson: JSON.stringify({ assetId: asset.id, version: asset.version, mimeType: asset.mimeType }), resultSummary: result.summary.slice(0, 500), externalSideEffect: false, status: "succeeded", latencyMs, startedAt: started.toISOString(), completedAt: now.toISOString() }),
      db.insert(usageEvents).values({ id: makeId("usage"), workspaceId: WORKSPACE_ID, runId, provider: result.provider, model: result.model, occurredAt: now.toISOString() }),
      db.insert(auditEvents).values({ id: makeId("audit"), workspaceId: WORKSPACE_ID, actorType: "owner", actorId: access.user!.id, action: "design.analysis_completed", targetType: "asset", targetId: asset.id, riskLevel: "medium", outcome: "succeeded", correlationId, metadataJson: JSON.stringify({ analysisId, assetSha256: asset.sha256, assetVersion: asset.version }), occurredAt: now.toISOString() }),
    ]);
    return Response.json({ analysis: { id: analysisId, summary: result.summary, provider: result.provider, model: result.model, confidenceBps: 7000, evidenceJson: JSON.stringify(evidence), createdAt: now.toISOString() } }, { status: 201 });
  } catch (error) {
    return routeError(error, "Unable to analyze design");
  }
}
