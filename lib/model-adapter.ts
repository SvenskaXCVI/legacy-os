import { env } from "cloudflare:workers";

export type ModelRequest = {
  purpose: string;
  system: string;
  context: unknown;
};

export type ModelResult = {
  provider: string;
  model: string;
  summary: string;
  usedExternalModel: boolean;
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
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${String(env.AI_API_KEY)}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: String(env.AI_MODEL),
      temperature: 0.2,
      messages: [
        { role: "system", content: request.system },
        { role: "user", content: JSON.stringify(request.context) },
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
    model: String(env.AI_MODEL),
    summary:
      payload.choices?.[0]?.message?.content?.trim() || request.purpose,
    usedExternalModel: true,
  };
}

