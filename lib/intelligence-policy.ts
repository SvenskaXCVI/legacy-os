export const INTELLIGENCE_POLICY_VERSION = "legacy-intelligence-v1";
export const APPROVAL_POLICY_VERSION = "legacy-autonomy-v1";

export type ConfidenceInputs = {
  evidenceQualityBps: number;
  sampleStrengthBps: number;
  replicationBps: number;
  effectStrengthBps: number;
  recencyBps: number;
  contradictionPenaltyBps?: number;
  biasPenaltyBps?: number;
};

export type AutonomyInput = {
  actionType: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  reversibility: "reversible" | "partially_reversible" | "irreversible";
  externalSideEffect: boolean;
  confidenceBps: number;
};

export type AutonomyDecision = {
  level: "observe" | "recommend" | "auto_internal" | "approval_required";
  approvalRequired: boolean;
  reason: string;
};

const clamp = (value: number) => Math.max(0, Math.min(10000, Math.round(value)));

export function scoreConfidence(input: ConfidenceInputs) {
  const weighted =
    input.evidenceQualityBps * 0.25 +
    input.sampleStrengthBps * 0.25 +
    input.replicationBps * 0.2 +
    input.effectStrengthBps * 0.2 +
    input.recencyBps * 0.1;

  return clamp(
    weighted -
      (input.contradictionPenaltyBps ?? 0) -
      (input.biasPenaltyBps ?? 0),
  );
}

export function patternSignificance(input: {
  supportCount: number;
  distinctProjects: number;
  distinctClients: number;
  effectBps: number;
}) {
  const support = Math.min(10000, (input.supportCount / 8) * 10000);
  const projects = Math.min(10000, (input.distinctProjects / 5) * 10000);
  const clients = Math.min(10000, (input.distinctClients / 4) * 10000);
  const effect = Math.min(10000, Math.abs(input.effectBps) * 5);
  return clamp(support * 0.25 + projects * 0.25 + clients * 0.25 + effect * 0.25);
}

export function isMeaningfulPattern(input: {
  supportCount: number;
  distinctProjects: number;
  distinctClients: number;
  effectBps: number;
  confidenceBps: number;
}) {
  return (
    input.supportCount >= 3 &&
    input.distinctProjects >= 3 &&
    input.distinctClients >= 2 &&
    Math.abs(input.effectBps) >= 1000 &&
    input.confidenceBps >= 6500
  );
}

const alwaysGated = new Set([
  "client_message",
  "appointment_create",
  "appointment_change",
  "publish_content",
  "financial_action",
  "social_connect",
  "social_permission_change",
  "delete_record",
  "health_guidance",
  "legal_guidance",
]);

export function decideAutonomy(input: AutonomyInput): AutonomyDecision {
  if (
    alwaysGated.has(input.actionType) ||
    input.externalSideEffect ||
    input.riskLevel === "high" ||
    input.riskLevel === "critical" ||
    input.reversibility === "irreversible"
  ) {
    return {
      level: "approval_required",
      approvalRequired: true,
      reason:
        "This action affects a client, external system, money, permissions, or data that is difficult to reverse.",
    };
  }

  if (
    input.riskLevel === "low" &&
    input.reversibility === "reversible" &&
    input.confidenceBps >= 7800
  ) {
    return {
      level: "auto_internal",
      approvalRequired: false,
      reason:
        "Low-risk, internal, reversible work may run automatically when confidence is at least 78%.",
    };
  }

  return {
    level: "recommend",
    approvalRequired: true,
    reason:
      "The evidence can support a recommendation, but the confidence or reversibility threshold for automatic action was not met.",
  };
}

export function confidenceExplanation(scoreBps: number) {
  const score = Math.round(scoreBps / 100);
  if (score >= 85) return `${score}% · strong, replicated evidence`;
  if (score >= 65) return `${score}% · meaningful but still reviewable`;
  if (score >= 40) return `${score}% · emerging signal`;
  return `${score}% · insufficient evidence`;
}

