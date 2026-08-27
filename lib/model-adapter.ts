import { env } from "cloudflare:workers";

export const MODEL_RUNTIME_POLICY_VERSION = "model-runtime-v1";

export type ModelRequest = {
  purpose: string;
  system: string;
  context: unknown;
  workspaceId?: string;
  promptVersion?: string;
  maxOutputTokens?: number;
  images?: Array<{ mimeType: string; dataBase64: string }>;
};

export type ModelResult = {
  provider: string;
  model: string;
  summary: string;
  usedExternalModel: boolean;
  responseId: string | null;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  reasoningTokens: number;
  latencyMs: number;
};

export type StructuredModelResult<T> = ModelResult & { data: T | null };

export type ModelRuntimeStatus = {
  configured: boolean;
  mode: "openai_responses" | "openai_compatible" | "deterministic";
  provider: string;
  model: string;
  visionModel: string | null;
  endpointHost: string | null;
  policyVersion: string;
  privacyMode: "stateless";
  fallbackEnabled: true;
  timeoutMs: number;
  maxOutputTokens: number;
};

type RuntimeConfig = ModelRuntimeStatus & { apiKey: string | null; baseUrl: string | null };

function value(name: keyof typeof env) {
  const candidate = env[name];
  return typeof candidate === "string" && candidate.trim() ? candidate.trim() : null;
}

function integer(name: keyof typeof env, fallback: number, minimum: number, maximum: number) {
  const parsed = Number(value(name));
  return Number.isFinite(parsed) ? Math.max(minimum, Math.min(maximum, Math.round(parsed))) : fallback;
}

function runtimeConfig(): RuntimeConfig {
  const openAiKey = value("OPENAI_API_KEY");
  const legacyKey = value("AI_API_KEY");
  const provider = value("AI_PROVIDER") || (openAiKey ? "OpenAI" : "OpenAI-compatible");
  const explicitBase = value("OPENAI_BASE_URL") || value("AI_BASE_URL");
  const openAiMode = Boolean(openAiKey) || /openai/i.test(provider) || /api\.openai\.com/i.test(explicitBase || "");
  const apiKey = openAiKey || legacyKey;
  const baseUrl = (explicitBase || (openAiMode && apiKey ? "https://api.openai.com/v1" : null))?.replace(/\/+$/, "") || null;
  const model = value("OPENAI_MODEL") || value("AI_MODEL") || (openAiKey ? "gpt-5.4-mini" : "deterministic-policy-engine-v1");
  const configured = Boolean(apiKey && baseUrl && model !== "deterministic-policy-engine-v1");
  let endpointHost: string | null = null;
  if (baseUrl) {
    try { endpointHost = new URL(baseUrl).host; } catch { endpointHost = "configured endpoint"; }
  }
  return {
    configured,
    mode: configured ? (openAiMode ? "openai_responses" : "openai_compatible") : "deterministic",
    provider: configured ? provider : "Legacy OS",
    model: configured ? model : "deterministic-policy-engine-v1",
    visionModel: value("OPENAI_VISION_MODEL") || value("AI_VISION_MODEL"),
    endpointHost,
    policyVersion: MODEL_RUNTIME_POLICY_VERSION,
    privacyMode: "stateless",
    fallbackEnabled: true,
    timeoutMs: integer("AI_REQUEST_TIMEOUT_MS", 45_000, 5_000, 120_000),
    maxOutputTokens: integer("AI_MAX_OUTPUT_TOKENS", 1_800, 200, 8_000),
    apiKey,
    baseUrl,
  };
}

export function getModelRuntimeStatus(): ModelRuntimeStatus {
  const status = runtimeConfig();
  return {
    configured: status.configured,
    mode: status.mode,
    provider: status.provider,
    model: status.model,
    visionModel: status.visionModel,
    endpointHost: status.endpointHost,
    policyVersion: status.policyVersion,
    privacyMode: status.privacyMode,
    fallbackEnabled: status.fallbackEnabled,
    timeoutMs: status.timeoutMs,
    maxOutputTokens: status.maxOutputTokens,
  };
}

export class ModelRuntimeError extends Error {
  constructor(message: string, public readonly code: "timeout" | "rate_limited" | "provider_error" | "invalid_output", public readonly status: number | null = null) {
    super(message);
    this.name = "ModelRuntimeError";
  }
}

async function hashIdentifier(valueToHash: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(valueToHash));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

function outputText(payload: { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }> }) {
  if (payload.output_text?.trim()) return payload.output_text.trim();
  return payload.output?.flatMap((item) => item.content || []).find((item) => item.type === "output_text")?.text?.trim() || "";
}

type ProviderPayload = {
  id?: string;
  output_text?: string;
  output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  choices?: Array<{ message?: { content?: string } }>;
  usage?: {
    input_tokens?: number; output_tokens?: number; prompt_tokens?: number; completion_tokens?: number;
    input_tokens_details?: { cached_tokens?: number };
    output_tokens_details?: { reasoning_tokens?: number };
  };
  error?: { message?: string; code?: string };
};

function usage(payload: ProviderPayload) {
  return {
    inputTokens: payload.usage?.input_tokens ?? payload.usage?.prompt_tokens ?? 0,
    outputTokens: payload.usage?.output_tokens ?? payload.usage?.completion_tokens ?? 0,
    cachedInputTokens: payload.usage?.input_tokens_details?.cached_tokens ?? 0,
    reasoningTokens: payload.usage?.output_tokens_details?.reasoning_tokens ?? 0,
  };
}

async function providerRequest(request: ModelRequest, structured?: { schemaName: string; schema: Record<string, unknown> }) {
  const config = runtimeConfig();
  if (!config.configured || !config.apiKey || !config.baseUrl) return null;
  const startedAt = Date.now();
  const model = request.images?.length && config.visionModel ? config.visionModel : config.model;
  const maxOutputTokens = Math.min(request.maxOutputTokens || config.maxOutputTokens, config.maxOutputTokens);
  const content = [
    { type: config.mode === "openai_responses" ? "input_text" : "text", text: JSON.stringify(request.context) },
    ...(request.images || []).map((image) => config.mode === "openai_responses"
      ? { type: "input_image", image_url: `data:${image.mimeType};base64,${image.dataBase64}`, detail: "high" }
      : { type: "image_url", image_url: { url: `data:${image.mimeType};base64,${image.dataBase64}`, detail: "high" } }),
  ];
  const safetyIdentifier = await hashIdentifier(request.workspaceId || "legacy-os-workspace");
  const promptCacheKey = await hashIdentifier(`${request.workspaceId || "workspace"}:${request.promptVersion || request.purpose}`);
  const body = config.mode === "openai_responses" ? {
    model,
    store: false,
    instructions: request.system,
    input: [{ role: "user", content }],
    max_output_tokens: maxOutputTokens,
    safety_identifier: safetyIdentifier,
    prompt_cache_key: promptCacheKey,
    metadata: { legacy_policy: MODEL_RUNTIME_POLICY_VERSION, legacy_prompt: request.promptVersion || "unversioned" },
    ...(structured ? { text: { format: { type: "json_schema", name: structured.schemaName, strict: true, schema: structured.schema } } } : {}),
  } : {
    model,
    temperature: 0.2,
    messages: [{ role: "system", content: request.system }, { role: "user", content }],
    ...(structured ? { response_format: { type: "json_schema", json_schema: { name: structured.schemaName, strict: true, schema: structured.schema } } } : {}),
  };
  let response: Response;
  try {
    response = await fetch(`${config.baseUrl}/${config.mode === "openai_responses" ? "responses" : "chat/completions"}`, {
      method: "POST",
      headers: { authorization: `Bearer ${config.apiKey}`, "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(config.timeoutMs),
    });
  } catch (error) {
    if (error instanceof Error && ["AbortError", "TimeoutError"].includes(error.name)) throw new ModelRuntimeError("The reasoning provider timed out; Legacy OS kept the deterministic result.", "timeout");
    throw new ModelRuntimeError("The reasoning provider could not be reached; Legacy OS kept the deterministic result.", "provider_error");
  }
  const payload = await response.json().catch(() => ({})) as ProviderPayload;
  if (!response.ok) {
    const code = response.status === 429 ? "rate_limited" : "provider_error";
    throw new ModelRuntimeError(payload.error?.message || `Reasoning provider returned ${response.status}`, code, response.status);
  }
  const text = config.mode === "openai_responses" ? outputText(payload) : payload.choices?.[0]?.message?.content?.trim() || "";
  if (!text) throw new ModelRuntimeError("The reasoning provider returned no usable output.", "invalid_output", response.status);
  return { config, model, text, responseId: payload.id || null, latencyMs: Date.now() - startedAt, ...usage(payload) };
}

/** Legacy owns policy, context, memory, evidence, tools, approval, and outcomes. */
export async function runModel(request: ModelRequest): Promise<ModelResult> {
  const result = await providerRequest(request);
  if (!result) return {
    provider: "Legacy OS", model: "deterministic-policy-engine-v1", summary: request.purpose,
    usedExternalModel: false, responseId: null, inputTokens: 0, outputTokens: 0,
    cachedInputTokens: 0, reasoningTokens: 0, latencyMs: 0,
  };
  return {
    provider: result.config.provider, model: result.model, summary: result.text,
    usedExternalModel: true, responseId: result.responseId, inputTokens: result.inputTokens,
    outputTokens: result.outputTokens, cachedInputTokens: result.cachedInputTokens,
    reasoningTokens: result.reasoningTokens, latencyMs: result.latencyMs,
  };
}

/** Legacy independently validates every returned entity, evidence reference, and tool. */
export async function runStructuredModel<T>(request: ModelRequest & { schemaName: string; schema: Record<string, unknown> }): Promise<StructuredModelResult<T>> {
  const result = await providerRequest(request, { schemaName: request.schemaName, schema: request.schema });
  if (!result) return {
    provider: "Legacy OS", model: "deterministic-chief-planner-v1", summary: request.purpose,
    usedExternalModel: false, data: null, responseId: null, inputTokens: 0, outputTokens: 0,
    cachedInputTokens: 0, reasoningTokens: 0, latencyMs: 0,
  };
  try {
    return {
      provider: result.config.provider, model: result.model, summary: request.purpose,
      usedExternalModel: true, data: JSON.parse(result.text) as T, responseId: result.responseId,
      inputTokens: result.inputTokens, outputTokens: result.outputTokens,
      cachedInputTokens: result.cachedInputTokens, reasoningTokens: result.reasoningTokens,
      latencyMs: result.latencyMs,
    };
  } catch {
    throw new ModelRuntimeError("The reasoning provider returned invalid structured output.", "invalid_output");
  }
}
