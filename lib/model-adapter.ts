import { env } from "cloudflare:workers";

export type ModelRequest = {
  purpose: string;
  system: string;
  context: unknown;
  images?: Array<{ mimeType: string; dataBase64: string }>;
};

export type ModelResult = {
  provider: string;
  model: string;
  summary: string;
  usedExternalModel: boolean;
};

export type StructuredModelResult<T> = ModelResult & {
  data: T | null;
  inputTokens: number;
  outputTokens: number;
};

function configured(name: keyof typeof env) {
  const value = env[name];
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Legacy OS owns the policy, context, memory, evidence, and outcome records.
 * A model is an optional reasoning adapter, never the system of record.
 */
export async function runModel(request: ModelRequest): Promise<ModelResult> {
  if (
    !configured("AI_BASE_URL") ||
    !configured("AI_API_KEY") ||
    !configured("AI_MODEL")
  ) {
    return {
      provider: "Legacy OS",
      model: "deterministic-policy-engine-v1",
      summary: request.purpose,
      usedExternalModel: false,
    };
  }

  const baseUrl = String(env.AI_BASE_URL).replace(/\/+$/, "");
  const model = String(
    request.images?.length && env.AI_VISION_MODEL
      ? env.AI_VISION_MODEL
      : env.AI_MODEL,
  );
  const userContent = request.images?.length
    ? [
        { type: "text", text: JSON.stringify(request.context) },
        ...request.images.map((image) => ({
          type: "image_url",
          image_url: { url: `data:${image.mimeType};base64,${image.dataBase64}`, detail: "high" },
        })),
      ]
    : JSON.stringify(request.context);
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${String(env.AI_API_KEY)}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: "system", content: request.system },
        { role: "user", content: userContent },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Configured model adapter returned ${response.status}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return {
    provider: String(env.AI_PROVIDER || "OpenAI-compatible"),
    model,
    summary:
      payload.choices?.[0]?.message?.content?.trim() || request.purpose,
    usedExternalModel: true,
  };
}

function outputText(payload: { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }> }) {
  if (payload.output_text?.trim()) return payload.output_text.trim();
  return payload.output?.flatMap((item) => item.content || []).find((item) => item.type === "output_text")?.text?.trim() || "";
}

/** Structured planning adapter. Legacy validates the returned plan before any tool is routed. */
export async function runStructuredModel<T>(request: ModelRequest & { schemaName: string; schema: Record<string, unknown> }): Promise<StructuredModelResult<T>> {
  if (!configured("AI_BASE_URL") || !configured("AI_API_KEY") || !configured("AI_MODEL")) {
    return { provider: "Legacy OS", model: "deterministic-chief-planner-v1", summary: request.purpose, usedExternalModel: false, data: null, inputTokens: 0, outputTokens: 0 };
  }
  const baseUrl = String(env.AI_BASE_URL).replace(/\/+$/, "");
  const model = String(env.AI_MODEL);
  const provider = String(env.AI_PROVIDER || "OpenAI-compatible");
  const useResponses = /openai/i.test(provider) || /api\.openai\.com/i.test(baseUrl);
  const response = await fetch(`${baseUrl}/${useResponses ? "responses" : "chat/completions"}`, {
    method: "POST",
    headers: { authorization: `Bearer ${String(env.AI_API_KEY)}`, "content-type": "application/json" },
    body: JSON.stringify(useResponses ? {
      model,
      store: false,
      instructions: request.system,
      input: JSON.stringify(request.context),
      max_output_tokens: 1800,
      text: { format: { type: "json_schema", name: request.schemaName, strict: true, schema: request.schema } },
      metadata: { legacy_purpose: request.schemaName },
    } : {
      model,
      temperature: 0.2,
      messages: [{ role: "system", content: request.system }, { role: "user", content: JSON.stringify(request.context) }],
      response_format: { type: "json_schema", json_schema: { name: request.schemaName, strict: true, schema: request.schema } },
    }),
  });
  if (!response.ok) throw new Error(`Configured structured model adapter returned ${response.status}`);
  const payload = await response.json() as {
    output_text?: string;
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { input_tokens?: number; output_tokens?: number; prompt_tokens?: number; completion_tokens?: number };
  };
  const text = useResponses ? outputText(payload) : payload.choices?.[0]?.message?.content?.trim() || "";
  if (!text) throw new Error("Configured model returned no structured plan");
  return {
    provider, model, summary: request.purpose, usedExternalModel: true,
    data: JSON.parse(text) as T,
    inputTokens: payload.usage?.input_tokens ?? payload.usage?.prompt_tokens ?? 0,
    outputTokens: payload.usage?.output_tokens ?? payload.usage?.completion_tokens ?? 0,
  };
}
