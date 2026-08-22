import { and, desc, eq, like, sql } from "drizzle-orm";
import { getDb } from "../db";
import {
  craftAnalysisRuns, healingAssessments, patterns, projects, recommendations,
  sessionCraftRecords, tattooSessions,
} from "../db/schema";

type Db = ReturnType<typeof getDb>;
export const CRAFT_INTELLIGENCE_POLICY_VERSION = "professional-craft-intelligence-v1";
export const CRAFT_PROMOTION_THRESHOLDS = {
  completedProjects: 3,
  distinctClients: 2,
  effectBps: 1000,
  confidenceBps: 6500,
  recordCompletenessBps: 7000,
} as const;

const makeId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;
const parseList = (value: string) => {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim()) : [];
  } catch {
    return [];
  }
};
const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");
const titleCase = (value: string) => value.split(" ").map((part) => part ? part[0].toUpperCase() + part.slice(1) : part).join(" ");
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

async function digest(value: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function craftRecordCompleteness(input: {
  machineName?: string | null; needleGroupings?: string[]; inkWash?: string[];
  voltageMinMv?: number | null; voltageMaxMv?: number | null; techniques?: string[];
  bodyArea?: string | null; skinResponse?: string | null; freshOutcomeRating?: number | null;
}) {
  const checks = [
    Boolean(input.machineName?.trim()), Boolean(input.needleGroupings?.length), Boolean(input.inkWash?.length),
    input.voltageMinMv != null && input.voltageMaxMv != null, Boolean(input.techniques?.length),
    Boolean(input.bodyArea?.trim()), Boolean(input.skinResponse?.trim()), input.freshOutcomeRating != null,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 10000);
}

type EligibleEvidence = {
  sessionId: string; projectId: string; clientId: string; completenessBps: number;
  needle: string; technique: string; healedOutcomeRating: number; touchupRequired: boolean;
};

export async function runCraftIntelligence(workspaceId: string, initiatedBy?: string | null, db: Db = getDb()) {
  const [sessionRows, craftRows, healingRows, realProjects] = await Promise.all([
    db.select().from(tattooSessions).where(eq(tattooSessions.workspaceId, workspaceId)),
    db.select().from(sessionCraftRecords).where(eq(sessionCraftRecords.workspaceId, workspaceId)),
    db.select().from(healingAssessments).where(eq(healingAssessments.workspaceId, workspaceId)),
    db.select({ id: projects.id }).from(projects).where(and(eq(projects.workspaceId, workspaceId), eq(projects.isTest, false))),
  ]);
  const projectIds = new Set(realProjects.map((row) => row.id));
  const completedSessions = new Map(sessionRows.filter((row) => row.status === "completed" && projectIds.has(row.projectId)).map((row) => [row.id, row]));
  const healingBySession = new Map<string, typeof healingRows[number]>();
  healingRows.sort((a, b) => b.assessedAt.localeCompare(a.assessedAt)).forEach((row) => {
    if (!healingBySession.has(row.sessionId) && ["healed", "late_healing"].includes(row.healingPhase)) healingBySession.set(row.sessionId, row);
  });

  const evidence: EligibleEvidence[] = [];
  for (const craft of craftRows) {
    const session = completedSessions.get(craft.sessionId);
    const healing = healingBySession.get(craft.sessionId);
    if (!session || !healing || craft.completenessBps < CRAFT_PROMOTION_THRESHOLDS.recordCompletenessBps) continue;
    const needles = [...new Set(parseList(craft.needleGroupingsJson).map(normalize))];
    const techniques = [...new Set(parseList(craft.techniquesJson).map(normalize))];
    for (const needle of needles) for (const technique of techniques) evidence.push({
      sessionId: session.id, projectId: session.projectId, clientId: session.clientId,
      completenessBps: craft.completenessBps, needle, technique,
      healedOutcomeRating: healing.healedOutcomeRating, touchupRequired: healing.touchupRequired,
    });
  }

  const neutralOutcomeBaseline = 3;
  const groups = new Map<string, EligibleEvidence[]>();
  evidence.forEach((item) => {
    const key = `${item.needle}|${item.technique}`;
    groups.set(key, [...(groups.get(key) || []), item]);
  });
  let candidates = 0;
  let promoted = 0;
  const runEvidence: Array<{ patternKey: string; status: string; supportCount: number; distinctProjects: number; distinctClients: number; confidenceBps: number }> = [];
  const now = new Date().toISOString();

  for (const [combination, rows] of groups) {
    const [needle, technique] = combination.split("|");
    const projectCount = new Set(rows.map((row) => row.projectId)).size;
    const clientCount = new Set(rows.map((row) => row.clientId)).size;
    const average = rows.reduce((sum, row) => sum + row.healedOutcomeRating, 0) / rows.length;
    const effectBps = Math.round(((average - neutralOutcomeBaseline) / neutralOutcomeBaseline) * 10000);
    const averageCompleteness = rows.reduce((sum, row) => sum + row.completenessBps, 0) / rows.length;
    const noTouchupRate = rows.filter((row) => !row.touchupRequired).length / rows.length;
    const confidenceBps = clamp(Math.round(
      Math.min(rows.length / 5, 1) * 2500 + Math.min(projectCount / 3, 1) * 2500 +
      Math.min(clientCount / 2, 1) * 2000 + (averageCompleteness / 10000) * 1500 + noTouchupRate * 1500,
    ), 0, 10000);
    const qualifies = projectCount >= CRAFT_PROMOTION_THRESHOLDS.completedProjects &&
      clientCount >= CRAFT_PROMOTION_THRESHOLDS.distinctClients && effectBps >= CRAFT_PROMOTION_THRESHOLDS.effectBps &&
      confidenceBps >= CRAFT_PROMOTION_THRESHOLDS.confidenceBps;
    const status = qualifies ? "active" : "candidate";
    if (qualifies) promoted += 1; else candidates += 1;
    const patternKey = `craft:${normalize(needle)}:${normalize(technique)}`;
    const evidenceRefs = [...new Set(rows.flatMap((row) => [`tattoo_session:${row.sessionId}`, `project:${row.projectId}`]))];
    const evidenceJson = JSON.stringify(evidenceRefs);
    const patternId = makeId("pat");
    await db.insert(patterns).values({
      id: patternId, workspaceId, patternKey,
      name: `${titleCase(needle)} + ${titleCase(technique)}`,
      description: `${titleCase(needle)} used with ${titleCase(technique)} is associated with an average healed outcome rating of ${average.toFixed(1)}/5 across ${projectCount} completed project${projectCount === 1 ? "" : "s"}.`,
      whyItMatters: qualifies ? "This repeated association may support future session preparation, but it does not prove causation and remains subject to Joshua’s professional judgment." : "The combination is being tracked, but there is not yet enough independent real-project evidence to guide work.",
      status, supportCount: rows.length, distinctProjects: projectCount, distinctClients: clientCount,
      effectBps, confidenceBps, significanceBps: qualifies ? Math.min(10000, effectBps) : 0,
      evidenceJson, evidenceHash: await digest(evidenceJson), firstSeenAt: now, lastSeenAt: now, lastEvaluatedAt: now,
      version: 1, createdAt: now, updatedAt: now,
    }).onConflictDoUpdate({ target: [patterns.workspaceId, patterns.patternKey], set: {
      description: `${titleCase(needle)} used with ${titleCase(technique)} is associated with an average healed outcome rating of ${average.toFixed(1)}/5 across ${projectCount} completed project${projectCount === 1 ? "" : "s"}.`,
      whyItMatters: qualifies ? "This repeated association may support future session preparation, but it does not prove causation and remains subject to Joshua’s professional judgment." : "The combination is being tracked, but there is not yet enough independent real-project evidence to guide work.",
      status, supportCount: rows.length, distinctProjects: projectCount, distinctClients: clientCount,
      effectBps, confidenceBps, significanceBps: qualifies ? Math.min(10000, effectBps) : 0,
      evidenceJson, evidenceHash: await digest(evidenceJson), lastSeenAt: now, lastEvaluatedAt: now,
      version: sql`${patterns.version} + 1`, updatedAt: now,
    }});
    const stored = await db.select({ id: patterns.id }).from(patterns).where(and(eq(patterns.workspaceId, workspaceId), eq(patterns.patternKey, patternKey))).get();
    if (qualifies && stored) {
      const prior = await db.select({ id: recommendations.id }).from(recommendations).where(and(eq(recommendations.patternId, stored.id), eq(recommendations.status, "proposed"))).get();
      if (prior) await db.update(recommendations).set({
        rationale: `The combination is associated with stronger recorded healed outcomes across ${projectCount} real projects and ${clientCount} clients. Compare placement, skin response, style, and design needs before using it.`,
        evidenceJson, confidenceBps, updatedAt: now,
      }).where(eq(recommendations.id, prior.id));
      else await db.insert(recommendations).values({
        id: makeId("rec"), workspaceId, patternId: stored.id, actionType: "review_craft_setup",
        title: `Review ${titleCase(needle)} + ${titleCase(technique)} for comparable work`,
        rationale: `The combination is associated with stronger recorded healed outcomes across ${projectCount} real projects and ${clientCount} clients. Compare placement, skin response, style, and design needs before using it.`,
        evidenceJson, confidenceBps, riskLevel: "medium", reversibility: "reversible",
        autonomyLevel: "owner_decision", approvalRequired: true, status: "proposed", createdAt: now, updatedAt: now,
      });
    } else if (stored) {
      await db.update(recommendations).set({ status: "withdrawn", updatedAt: now }).where(and(eq(recommendations.patternId, stored.id), eq(recommendations.status, "proposed")));
    }
    runEvidence.push({ patternKey, status, supportCount: rows.length, distinctProjects: projectCount, distinctClients: clientCount, confidenceBps });
  }

  const eligibleSessionCount = new Set(evidence.map((item) => item.sessionId)).size;
  const summary = eligibleSessionCount
    ? `${groups.size} setup-and-technique combination${groups.size === 1 ? " was" : "s were"} evaluated from ${eligibleSessionCount} completed session${eligibleSessionCount === 1 ? "" : "s"}; ${promoted} met the evidence threshold.`
    : "No completed session has both a sufficiently complete craft record and a late-healing or healed owner assessment yet.";
  const runId = makeId("craft_run");
  await db.insert(craftAnalysisRuns).values({
    id: runId, workspaceId, status: "completed", eligibleSessions: eligibleSessionCount,
    combinationsEvaluated: groups.size, candidatePatterns: candidates, promotedPatterns: promoted,
    summary, policyVersion: CRAFT_INTELLIGENCE_POLICY_VERSION, evidenceJson: JSON.stringify(runEvidence),
    initiatedBy: initiatedBy || null, createdAt: now, completedAt: now,
  });
  return { id: runId, summary, eligibleSessions: eligibleSessionCount, combinationsEvaluated: groups.size, candidatePatterns: candidates, promotedPatterns: promoted, policyVersion: CRAFT_INTELLIGENCE_POLICY_VERSION };
}

export async function listCraftIntelligence(workspaceId: string, db: Db = getDb()) {
  const [records, assessments, runs, craftPatterns, craftRecommendations] = await Promise.all([
    db.select().from(sessionCraftRecords).where(eq(sessionCraftRecords.workspaceId, workspaceId)).orderBy(desc(sessionCraftRecords.updatedAt)),
    db.select().from(healingAssessments).where(eq(healingAssessments.workspaceId, workspaceId)).orderBy(desc(healingAssessments.assessedAt)),
    db.select().from(craftAnalysisRuns).where(eq(craftAnalysisRuns.workspaceId, workspaceId)).orderBy(desc(craftAnalysisRuns.createdAt)).limit(30),
    db.select().from(patterns).where(and(eq(patterns.workspaceId, workspaceId), like(patterns.patternKey, "craft:%"))).orderBy(desc(patterns.confidenceBps)),
    db.select().from(recommendations).where(and(eq(recommendations.workspaceId, workspaceId), eq(recommendations.actionType, "review_craft_setup"))).orderBy(desc(recommendations.createdAt)),
  ]);
  return { records, assessments, runs, patterns: craftPatterns, recommendations: craftRecommendations, thresholds: CRAFT_PROMOTION_THRESHOLDS, policyVersion: CRAFT_INTELLIGENCE_POLICY_VERSION };
}
