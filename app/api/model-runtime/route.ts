import { getDb } from "../../../db";
import { aiEvents, aiRuns, auditEvents, usageEvents } from "../../../db/schema";
import { getModelRuntimeStatus, ModelRuntimeError, MODEL_RUNTIME_POLICY_VERSION, runStructuredModel } from "../../../lib/model-adapter";
import { actorFrom, makeId, requireOwner, routeError, WORKSPACE_ID } from "../_lib";

export async function GET(request: Request) {
  try {
    await requireOwner(request);
    return Response.json({ runtime: getModelRuntimeStatus() }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return routeError(error, "Unable to load model runtime");
  }
}

export async function POST(request: Request) {
  try {
    await requireOwner(request);
    const runtime = getModelRuntimeStatus();
    if (!runtime.configured) return Response.json({ error: "A server-side model secret must be activated before testing the production runtime.", runtime }, { status: 409 });
    const started = new Date();
    const runId = makeId("run");
    const correlationId = crypto.randomUUID();
    try {
      const model = await runStructuredModel<{ status: "ready"; summary: string }>({
        workspaceId: WORKSPACE_ID,
        purpose: "Verify the production reasoning runtime without using client content or executing tools.",
        promptVersion: "stage-34-runtime-check-v1",
        system: "You are the Legacy OS runtime readiness probe. Return only the required structured result. Do not request tools, invent records, or infer client information.",
        context: { check: "structured_response", policyVersion: MODEL_RUNTIME_POLICY_VERSION, containsClientContent: false },
        schemaName: "legacy_runtime_readiness",
        schema: { type: "object", additionalProperties: false, required: ["status", "summary"], properties: { status: { type: "string", enum: ["ready"] }, summary: { type: "string", maxLength: 180 } } },
        maxOutputTokens: 300,
      });
      if (!model.usedExternalModel || model.data?.status !== "ready") throw new ModelRuntimeError("The configured provider did not complete the readiness check.", "invalid_output");
      const completedAt = new Date().toISOString();
      await getDb().batch([
        getDb().insert(aiRuns).values({ id: runId, workspaceId: WORKSPACE_ID, correlationId, agentName: "Runtime Monitor", purpose: "Production model readiness check", provider: model.provider, model: model.model, promptVersion: "stage-34-runtime-check-v1", contextPolicyVersion: MODEL_RUNTIME_POLICY_VERSION, approvalPolicyVersion: "none-read-only", riskLevel: "low", contentCapture: "metadata_only", reasoningSummary: model.data.summary, evidenceJson: "[]", confidenceBps: 10000, status: "succeeded", startedAt: started.toISOString(), completedAt, latencyMs: model.latencyMs, createdAt: started.toISOString() }),
        getDb().insert(aiEvents).values({ id: makeId("evt"), workspaceId: WORKSPACE_ID, runId, sequence: 1, eventType: "model.runtime_verified", status: "succeeded", summary: "The configured reasoning provider returned a valid structured response.", metadataJson: JSON.stringify({ responseId: model.responseId, rawContentCaptured: false }), occurredAt: completedAt }),
        getDb().insert(usageEvents).values({ id: makeId("usage"), workspaceId: WORKSPACE_ID, runId, provider: model.provider, model: model.model, inputTokens: model.inputTokens, outputTokens: model.outputTokens, cachedInputTokens: model.cachedInputTokens, reasoningTokens: model.reasoningTokens, estimatedCostMicros: 0, pricingVersion: "provider_invoice_required", occurredAt: completedAt }),
        getDb().insert(auditEvents).values({ id: makeId("audit"), workspaceId: WORKSPACE_ID, actorType: "owner", actorId: actorFrom(request), action: "model.runtime_verified", targetType: "ai_run", targetId: runId, riskLevel: "low", outcome: "succeeded", correlationId, metadataJson: JSON.stringify({ provider: model.provider, model: model.model, responseId: model.responseId, clientContentUsed: false }), occurredAt: completedAt }),
      ]);
      return Response.json({ runtime, result: { status: "ready", summary: model.data.summary, provider: model.provider, model: model.model, latencyMs: model.latencyMs, inputTokens: model.inputTokens, outputTokens: model.outputTokens } });
    } catch (error) {
      const completedAt = new Date().toISOString();
      const code = error instanceof ModelRuntimeError ? error.code : "provider_error";
      const summary = error instanceof Error ? error.message : "Model runtime verification failed";
      await getDb().batch([
        getDb().insert(aiRuns).values({ id: runId, workspaceId: WORKSPACE_ID, correlationId, agentName: "Runtime Monitor", purpose: "Production model readiness check", provider: runtime.provider, model: runtime.model, promptVersion: "stage-34-runtime-check-v1", contextPolicyVersion: MODEL_RUNTIME_POLICY_VERSION, approvalPolicyVersion: "none-read-only", riskLevel: "low", contentCapture: "metadata_only", reasoningSummary: null, evidenceJson: "[]", confidenceBps: 0, status: "failed", startedAt: started.toISOString(), completedAt, latencyMs: new Date(completedAt).getTime() - started.getTime(), errorCode: code, errorSummary: summary.slice(0, 500), createdAt: started.toISOString() }),
        getDb().insert(auditEvents).values({ id: makeId("audit"), workspaceId: WORKSPACE_ID, actorType: "owner", actorId: actorFrom(request), action: "model.runtime_verification_failed", targetType: "ai_run", targetId: runId, riskLevel: "low", outcome: "failed", correlationId, metadataJson: JSON.stringify({ provider: runtime.provider, model: runtime.model, errorCode: code }), occurredAt: completedAt }),
      ]);
      return Response.json({ error: summary, runtime }, { status: 502 });
    }
  } catch (error) {
    return routeError(error, "Unable to verify model runtime");
  }
}
