import { and, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "../db";
import {
  agentTasks, appointments, approvals, assets, clientMessages, clients,
  consentGrants, contentCandidates, healingCheckins, knowledgeEdges,
  knowledgeItems, memoryRecords, outcomes, patterns, paymentRequests,
  projects, recommendations as recommendationTable, specialistEvaluations, tattooSessions,
} from "../db/schema";
import { runStructuredModel } from "./model-adapter";

type Db = ReturnType<typeof getDb>;
export const SPECIALIST_INTELLIGENCE_POLICY_VERSION = "specialist-intelligence-v1";

export type SpecialistAgentKey =
  | "client_manager" | "design_director" | "knowledge_librarian" | "operations_manager"
  | "scheduling_coordinator" | "finance_manager" | "content_producer" | "analytics_advisor";

export const SPECIALIST_PROFILES: Array<{ agentKey: SpecialistAgentKey; domain: string; label: string; capabilityKey: string; success: string; stop: string }> = [
  { agentKey: "client_manager", domain: "client", label: "Client Intelligence", capabilityKey: "relationship_review", success: "Identify unanswered communication, missing intake facts, approval friction, and the safest internal follow-up.", stop: "Stop before promises, prices, artistic commitments, contact, or scheduling." },
  { agentKey: "design_director", domain: "design", label: "Design Intelligence", capabilityKey: "design_readiness", success: "Assess references, placement, versions, feedback, immutable approval, and stencil readiness from saved project evidence.", stop: "Stop before generation claims, final artistic judgment, or changing an approved artifact." },
  { agentKey: "knowledge_librarian", domain: "knowledge", label: "Knowledge Intelligence", capabilityKey: "knowledge_quality", success: "Find relevant, scoped, source-linked knowledge while preserving uncertainty and disagreement.", stop: "Stop rather than flatten conflicting sources or promote unsupported memory." },
  { agentKey: "operations_manager", domain: "operations", label: "Operations Intelligence", capabilityKey: "workflow_readiness", success: "Identify lifecycle blockers, missing next actions, unresolved approvals, and preparation work.", stop: "Stop before skipping a lifecycle gate or performing an externally effective action." },
  { agentKey: "scheduling_coordinator", domain: "scheduling", label: "Scheduling Intelligence", capabilityKey: "schedule_readiness", success: "Detect overlaps, upcoming commitments, readiness gaps, and unscheduled operational work.", stop: "Stop before creating or changing a calendar commitment." },
  { agentKey: "finance_manager", domain: "finance", label: "Finance Intelligence", capabilityKey: "financial_state", success: "Calculate planned, due, collected, refunded, and outstanding money from authoritative payment records.", stop: "Stop before treating estimates as revenue or charging, refunding, repricing, or making accounting claims." },
  { agentKey: "content_producer", domain: "content", label: "Content Intelligence", capabilityKey: "content_readiness", success: "Identify rights- and consent-safe content opportunities and missing workflow steps.", stop: "Stop before publishing or treating an unapproved asset as eligible." },
  { agentKey: "analytics_advisor", domain: "analytics", label: "Analytics Intelligence", capabilityKey: "evidence_review", success: "Separate facts from patterns and measure whether recommendations have attributable outcomes.", stop: "Stop before claiming causation, significance, or performance without recorded evidence." },
];

type Finding = { severity: "info" | "attention" | "blocked"; title: string; detail: string; evidenceRefs: string[] };
type SuggestedAction = { title: string; rationale: string; toolKey: "analyze_internal" | "draft_internal" | "create_internal_task"; evidenceRefs: string[] };
export type SpecialistEvaluationResult = {
  domain: string; capabilityKey: string; summary: string; facts: Record<string, number | string | boolean | null>;
  findings: Finding[]; recommendations: SuggestedAction[]; evidenceRefs: string[]; limitations: string[];
  confidenceBps: number; provider: string; model: string; inputTokens: number; outputTokens: number;
  cachedInputTokens: number; reasoningTokens: number;
};

const profileFor = (agentKey: string) => SPECIALIST_PROFILES.find((profile) => profile.agentKey === agentKey);
const activeStatus = (status: string) => !["cancelled", "void", "refunded", "archived", "rejected"].includes(status);
const nowMs = () => Date.now();

function pushFinding(target: Finding[], evidence: Set<string>, finding: Finding) {
  target.push(finding);
  finding.evidenceRefs.forEach((ref) => evidence.add(ref));
}

function modelSchema() {
  const evidenceRefs = { type: "array", maxItems: 8, items: { type: "string" } };
  return { type: "object", additionalProperties: false, required: ["summary", "findings", "recommendations", "confidenceBps", "limitations"], properties: {
    summary: { type: "string", maxLength: 700 },
    findings: { type: "array", maxItems: 8, items: { type: "object", additionalProperties: false, required: ["severity", "title", "detail", "evidenceRefs"], properties: { severity: { type: "string", enum: ["info", "attention", "blocked"] }, title: { type: "string", maxLength: 180 }, detail: { type: "string", maxLength: 700 }, evidenceRefs } } },
    recommendations: { type: "array", maxItems: 5, items: { type: "object", additionalProperties: false, required: ["title", "rationale", "toolKey", "evidenceRefs"], properties: { title: { type: "string", maxLength: 180 }, rationale: { type: "string", maxLength: 700 }, toolKey: { type: "string", enum: ["analyze_internal", "draft_internal", "create_internal_task"] }, evidenceRefs } } },
    confidenceBps: { type: "integer", minimum: 0, maximum: 10000 },
    limitations: { type: "array", maxItems: 6, items: { type: "string", maxLength: 300 } },
  } };
}

export async function evaluateSpecialistTask(task: typeof agentTasks.$inferSelect, db: Db = getDb()): Promise<SpecialistEvaluationResult> {
  const profile = profileFor(task.agentKey);
  if (!profile) throw new Error("This task is not assigned to a bounded specialist intelligence domain");
  const [projectRows, clientRows, appointmentRows, approvalRows, assetRows, messageRows, paymentRows, sessionRows, healingRows, contentRows, consentRows, knowledgeRows, edgeRows, memoryRows, patternRows, recommendationRows, outcomeRows] = await Promise.all([
    db.select().from(projects).where(and(eq(projects.workspaceId, task.workspaceId), eq(projects.isTest, false), isNull(projects.archivedAt))),
    db.select().from(clients).where(and(eq(clients.workspaceId, task.workspaceId), isNull(clients.archivedAt))),
    db.select().from(appointments).where(eq(appointments.workspaceId, task.workspaceId)),
    db.select().from(approvals).where(eq(approvals.workspaceId, task.workspaceId)),
    db.select().from(assets).where(and(eq(assets.workspaceId, task.workspaceId), isNull(assets.deletedAt))),
    db.select().from(clientMessages).where(eq(clientMessages.workspaceId, task.workspaceId)),
    db.select().from(paymentRequests).where(eq(paymentRequests.workspaceId, task.workspaceId)),
    db.select().from(tattooSessions).where(eq(tattooSessions.workspaceId, task.workspaceId)),
    db.select().from(healingCheckins).where(eq(healingCheckins.workspaceId, task.workspaceId)),
    db.select().from(contentCandidates).where(eq(contentCandidates.workspaceId, task.workspaceId)),
    db.select().from(consentGrants).where(eq(consentGrants.workspaceId, task.workspaceId)),
    db.select().from(knowledgeItems).where(eq(knowledgeItems.workspaceId, task.workspaceId)),
    db.select().from(knowledgeEdges).where(eq(knowledgeEdges.workspaceId, task.workspaceId)),
    db.select().from(memoryRecords).where(eq(memoryRecords.workspaceId, task.workspaceId)),
    db.select().from(patterns).where(eq(patterns.workspaceId, task.workspaceId)),
    db.select().from(recommendationTable).where(eq(recommendationTable.workspaceId, task.workspaceId)),
    db.select().from(outcomes).where(eq(outcomes.workspaceId, task.workspaceId)),
  ]);
  const projectSet = new Set(projectRows.map((row) => row.id));
  const clientSet = new Set(clientRows.map((row) => row.id));
  if (task.projectId && !projectSet.has(task.projectId)) throw new Error("Specialist project scope is unavailable or excluded from intelligence");
  if (task.clientId && !clientSet.has(task.clientId)) throw new Error("Specialist client scope is unavailable");
  if (task.projectId && task.clientId && projectRows.find((row) => row.id === task.projectId)?.clientId !== task.clientId) throw new Error("Specialist project and client scopes do not match");
  const inScope = (row: { projectId?: string | null; clientId?: string | null }) => (!task.projectId || row.projectId === task.projectId) && (!task.clientId || row.clientId === task.clientId) && (!row.projectId || projectSet.has(row.projectId)) && (!row.clientId || clientSet.has(row.clientId));
  const scopedProjects = projectRows.filter((row) => (!task.projectId || row.id === task.projectId) && (!task.clientId || row.clientId === task.clientId));
  const scopedClients = clientRows.filter((row) => (!task.clientId || row.id === task.clientId) && (!task.projectId || scopedProjects.some((project) => project.clientId === row.id)));
  const findings: Finding[] = [];
  const recommendations: SuggestedAction[] = [];
  const evidence = new Set<string>();
  const facts: Record<string, number | string | boolean | null> = { projectsInScope: scopedProjects.length, clientsInScope: scopedClients.length };
  const limitations = [profile.stop];

  if (profile.domain === "client") {
    const messages = messageRows.filter(inScope);
    const unread = messages.filter((row) => row.senderType === "client" && !row.readAt);
    const incomplete = scopedClients.filter((row) => !row.email && !row.phone && !row.instagramHandle);
    const pending = approvalRows.filter((row) => row.status === "pending" && (!row.projectId || scopedProjects.some((project) => project.id === row.projectId)));
    facts.unreadClientMessages = unread.length; facts.clientsMissingContactPath = incomplete.length; facts.pendingApprovals = pending.length; facts.relationshipProjects = scopedProjects.length;
    unread.slice(0, 4).forEach((row) => pushFinding(findings, evidence, { severity: "attention", title: "Client reply needs review", detail: "A saved inbound message is unread and should be classified before any response is sent.", evidenceRefs: [`message:${row.id}`, `client:${row.clientId}`] }));
    incomplete.forEach((row) => pushFinding(findings, evidence, { severity: "blocked", title: "No usable contact path", detail: "This client record has no email, phone, or Instagram handle.", evidenceRefs: [`client:${row.id}`] }));
    if (unread.length) recommendations.push({ title: "Prepare response drafts", rationale: "Draft internally from the linked conversation and project state; sending remains separately approval-gated.", toolKey: "draft_internal", evidenceRefs: unread.slice(0, 4).map((row) => `message:${row.id}`) });
  } else if (profile.domain === "design") {
    const projectAssets = assetRows.filter(inScope);
    const references = projectAssets.filter((row) => ["reference", "body_reference"].includes(row.assetRole));
    const designs = projectAssets.filter((row) => ["design", "design_iteration", "stencil"].includes(row.assetRole));
    const exactApprovals = approvalRows.filter((row) => row.assetId && row.assetSha256 && row.assetVersion && row.status === "approved" && (!row.projectId || scopedProjects.some((project) => project.id === row.projectId)));
    facts.referenceAssets = references.length; facts.designVersions = designs.length; facts.exactApprovedVersions = exactApprovals.length; facts.projectsMissingPlacement = scopedProjects.filter((row) => !row.placement).length;
    scopedProjects.filter((row) => !row.placement).forEach((row) => pushFinding(findings, evidence, { severity: "blocked", title: "Placement is missing", detail: "Design reasoning is incomplete without a recorded body placement.", evidenceRefs: [`project:${row.id}`] }));
    scopedProjects.filter((project) => !references.some((asset) => asset.projectId === project.id)).forEach((row) => pushFinding(findings, evidence, { severity: "attention", title: "Reference set is empty", detail: "No saved reference or body-reference asset is connected to this project.", evidenceRefs: [`project:${row.id}`] }));
    designs.filter((asset) => !exactApprovals.some((approval) => approval.assetId === asset.id)).slice(0, 3).forEach((asset) => pushFinding(findings, evidence, { severity: "info", title: "Design version is not exactly approved", detail: "The asset remains a working version until an approval binds its immutable hash and version.", evidenceRefs: [`asset:${asset.id}`, `project:${asset.projectId}`] }));
    recommendations.push({ title: "Review design readiness", rationale: "Resolve missing placement/reference evidence and verify the exact approved version before session preparation.", toolKey: "analyze_internal", evidenceRefs: [...evidence].slice(0, 8) });
  } else if (profile.domain === "knowledge") {
    const scopedKnowledge = knowledgeRows.filter((row) => !task.projectId || row.projectId === task.projectId);
    const scopedMemory = memoryRows.filter((row) => row.status === "active" && (!task.projectId || row.projectId === task.projectId) && (!task.clientId || row.clientId === task.clientId));
    const contradictions = edgeRows.filter((row) => /contradict|disagree/i.test(row.relationship));
    const unverified = scopedKnowledge.filter((row) => row.verificationStatus !== "verified");
    facts.knowledgeItems = scopedKnowledge.length; facts.activeMemories = scopedMemory.length; facts.unverifiedItems = unverified.length; facts.preservedDisagreements = contradictions.length;
    if (unverified.length) pushFinding(findings, evidence, { severity: "attention", title: "Knowledge awaits verification", detail: `${unverified.length} scoped item${unverified.length === 1 ? " is" : "s are"} marked unverified and must not be treated as settled craft truth.`, evidenceRefs: unverified.slice(0, 6).map((row) => `knowledge:${row.id}`) });
    if (contradictions.length) pushFinding(findings, evidence, { severity: "info", title: "Disagreement is preserved", detail: "Conflicting sources remain separate so specialists can reason with uncertainty instead of fabricating consensus.", evidenceRefs: contradictions.slice(0, 6).map((row) => `knowledge_edge:${row.id}`) });
    recommendations.push({ title: "Verify the highest-value sources", rationale: "Promote durable knowledge only after provenance and scope are clear.", toolKey: "analyze_internal", evidenceRefs: [...evidence].slice(0, 8) });
  } else if (profile.domain === "operations") {
    const pending = approvalRows.filter((row) => row.status === "pending" && (!row.projectId || scopedProjects.some((project) => project.id === row.projectId)));
    const missingNext = scopedProjects.filter((row) => !row.nextAction);
    const concerns = healingRows.filter((row) => inScope(row) && row.concernFlag);
    const sessions = sessionRows.filter(inScope);
    facts.activeProjects = scopedProjects.length; facts.tattooSessions = sessions.length; facts.projectsMissingNextAction = missingNext.length; facts.pendingApprovals = pending.length; facts.healingConcerns = concerns.length;
    missingNext.forEach((row) => pushFinding(findings, evidence, { severity: "attention", title: "Project has no next action", detail: `The ${row.lifecyclePhase.replaceAll("_", " ")} workflow has no recorded next step.`, evidenceRefs: [`project:${row.id}`] }));
    pending.slice(0, 4).forEach((row) => pushFinding(findings, evidence, { severity: "blocked", title: "Workflow is waiting on approval", detail: row.subject, evidenceRefs: [`approval:${row.id}`, ...(row.projectId ? [`project:${row.projectId}`] : [])] }));
    concerns.slice(0, 3).forEach((row) => pushFinding(findings, evidence, { severity: "blocked", title: "Healing concern needs owner review", detail: "The recorded concern is operationally urgent; no medical conclusion was generated.", evidenceRefs: [`healing:${row.id}`, `project:${row.projectId}`] }));
    recommendations.push({ title: "Resolve the highest workflow blocker", rationale: "Set the next internal action only from the recorded lifecycle and approval evidence.", toolKey: "create_internal_task", evidenceRefs: [...evidence].slice(0, 8) });
  } else if (profile.domain === "scheduling") {
    const scheduled = appointmentRows.filter((row) => inScope(row) && activeStatus(row.status)).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    const overlaps: Array<[typeof scheduled[number], typeof scheduled[number]]> = [];
    for (let i = 0; i < scheduled.length; i += 1) for (let j = i + 1; j < scheduled.length; j += 1) {
      const aEnd = new Date(scheduled[i].endsAt || scheduled[i].startsAt).getTime(); const bStart = new Date(scheduled[j].startsAt).getTime();
      if (bStart < aEnd) overlaps.push([scheduled[i], scheduled[j]]); else break;
    }
    const upcoming = scheduled.filter((row) => new Date(row.startsAt).getTime() >= nowMs() && new Date(row.startsAt).getTime() <= nowMs() + 7 * 86_400_000);
    const unscheduled = scopedProjects.filter((project) => !scheduled.some((appointment) => appointment.projectId === project.id));
    facts.scheduledAppointments = scheduled.length; facts.upcomingSevenDays = upcoming.length; facts.overlaps = overlaps.length; facts.unscheduledProjects = unscheduled.length;
    overlaps.forEach(([a, b]) => pushFinding(findings, evidence, { severity: "blocked", title: "Calendar overlap detected", detail: "Two active commitments overlap; Legacy will not change either appointment automatically.", evidenceRefs: [`appointment:${a.id}`, `appointment:${b.id}`] }));
    upcoming.filter((row) => row.projectId && scopedProjects.find((project) => project.id === row.projectId)?.lifecyclePhase === "lead").forEach((row) => pushFinding(findings, evidence, { severity: "attention", title: "Upcoming appointment may not be ready", detail: "The linked project is still in its lead phase and needs readiness review.", evidenceRefs: [`appointment:${row.id}`, `project:${row.projectId}`] }));
    recommendations.push({ title: "Review readiness before changing the calendar", rationale: "Resolve overlaps and preparation gaps internally; any calendar mutation remains approval-gated.", toolKey: "analyze_internal", evidenceRefs: [...evidence].slice(0, 8) });
  } else if (profile.domain === "finance") {
    const payments = paymentRows.filter(inScope);
    const requested = payments.reduce((sum, row) => sum + row.amountCents, 0);
    const collected = payments.reduce((sum, row) => sum + row.amountPaidCents, 0);
    const refunded = payments.reduce((sum, row) => sum + row.amountRefundedCents, 0);
    const outstanding = payments.reduce((sum, row) => sum + Math.max(0, row.amountCents - row.amountPaidCents), 0);
    const overdue = payments.filter((row) => row.dueAt && new Date(row.dueAt).getTime() < nowMs() && row.amountPaidCents < row.amountCents && activeStatus(row.status));
    facts.requestedCents = requested; facts.collectedCents = collected; facts.refundedCents = refunded; facts.realizedNetCents = collected - refunded; facts.outstandingCents = outstanding; facts.overdueRequests = overdue.length;
    overdue.forEach((row) => pushFinding(findings, evidence, { severity: "attention", title: "Payment request is overdue", detail: `${row.title} has an outstanding recorded balance of ${Math.max(0, row.amountCents - row.amountPaidCents)} cents.`, evidenceRefs: [`payment:${row.id}`, `project:${row.projectId}`] }));
    if (outstanding > 0) recommendations.push({ title: "Review outstanding payment requests", rationale: "Use the payment ledger as truth; do not treat requested or quoted amounts as collected revenue.", toolKey: "analyze_internal", evidenceRefs: payments.filter((row) => row.amountPaidCents < row.amountCents).slice(0, 8).map((row) => `payment:${row.id}`) });
    limitations.push("This is an operational payment ledger, not tax or accounting advice.");
  } else if (profile.domain === "content") {
    const projectAssets = assetRows.filter(inScope);
    const eligible = projectAssets.filter((row) => row.contentEligible && row.rightsStatus === "cleared" && ["granted", "not_required"].includes(row.consentStatus));
    const candidates = contentRows.filter(inScope);
    const consentedClients = new Set(consentRows.filter((row) => row.status === "granted" && row.consentType === "tattoo_media_use" && (!row.expiresAt || new Date(row.expiresAt).getTime() > nowMs())).map((row) => row.clientId));
    const opportunities = eligible.filter((asset) => !candidates.some((candidate) => candidate.sourceAssetId === asset.id));
    const blocked = projectAssets.filter((row) => row.contentEligible && (row.rightsStatus !== "cleared" || !["granted", "not_required"].includes(row.consentStatus)));
    facts.eligibleAssets = eligible.length; facts.contentCandidates = candidates.length; facts.readyOpportunities = opportunities.length; facts.blockedAssets = blocked.length; facts.clientsWithActiveMediaConsent = consentedClients.size;
    opportunities.slice(0, 5).forEach((asset) => pushFinding(findings, evidence, { severity: "info", title: "Content opportunity is ready for internal preparation", detail: "The source asset is eligible and has no existing content candidate; publishing remains a separate approval.", evidenceRefs: [`asset:${asset.id}`, ...(asset.projectId ? [`project:${asset.projectId}`] : [])] }));
    blocked.slice(0, 5).forEach((asset) => pushFinding(findings, evidence, { severity: "blocked", title: "Content use is blocked", detail: "Rights or consent evidence is insufficient for this asset.", evidenceRefs: [`asset:${asset.id}`] }));
    if (opportunities.length) recommendations.push({ title: "Prepare content candidates", rationale: "Create internal hooks, captions, and edit notes only for verified eligible assets.", toolKey: "draft_internal", evidenceRefs: opportunities.slice(0, 8).map((asset) => `asset:${asset.id}`) });
  } else {
    const completed = scopedProjects.filter((row) => row.lifecyclePhase === "complete" || row.status === "complete");
    const measured = outcomeRows.filter((row) => (!row.projectId || scopedProjects.some((project) => project.id === row.projectId)) && row.status === "measured");
    const activePatterns = patternRows.filter((row) => ["active", "promoted"].includes(row.status));
    const candidates = patternRows.filter((row) => row.status === "candidate");
    const unmeasured = recommendationRows.filter((row) => row.status === "acted" && !outcomeRows.some((outcome) => outcome.recommendationId === row.id && outcome.status === "measured"));
    facts.completedProjects = completed.length; facts.measuredOutcomes = measured.length; facts.activePatterns = activePatterns.length; facts.patternCandidates = candidates.length; facts.actedRecommendationsAwaitingOutcome = unmeasured.length;
    candidates.slice(0, 5).forEach((row) => pushFinding(findings, evidence, { severity: "info", title: "Pattern remains a candidate", detail: `${row.name} has ${row.supportCount} observations across ${row.distinctProjects} project${row.distinctProjects === 1 ? "" : "s"} at ${Math.round(row.confidenceBps / 100)}% confidence.`, evidenceRefs: [`pattern:${row.id}`] }));
    unmeasured.slice(0, 5).forEach((row) => pushFinding(findings, evidence, { severity: "attention", title: "Recommendation outcome is not measured", detail: "Legacy cannot learn whether this action worked until its outcome window is recorded.", evidenceRefs: [`recommendation:${row.id}`] }));
    if (unmeasured.length) recommendations.push({ title: "Measure acted recommendations", rationale: "Close the loop before promoting additional causal or performance claims.", toolKey: "analyze_internal", evidenceRefs: unmeasured.slice(0, 8).map((row) => `recommendation:${row.id}`) });
    limitations.push("Correlation remains distinct from causation; only recorded attribution is reported.");
  }

  const defaultSummary = findings.length ? `${profile.label} found ${findings.length} evidence-backed item${findings.length === 1 ? "" : "s"} in the authorized scope.` : `${profile.label} found no current exception requiring action in the authorized scope.`;
  let result: SpecialistEvaluationResult = { domain: profile.domain, capabilityKey: profile.capabilityKey, summary: defaultSummary, facts, findings: findings.slice(0, 8), recommendations: recommendations.filter((item) => item.evidenceRefs.length).slice(0, 5), evidenceRefs: [...evidence].slice(0, 40), limitations, confidenceBps: findings.length ? 8800 : 9500, provider: "Legacy OS", model: `${profile.domain}-deterministic-v1`, inputTokens: 0, outputTokens: 0, cachedInputTokens: 0, reasoningTokens: 0 };
  try {
    const model = await runStructuredModel<{ summary: string; findings: Finding[]; recommendations: SuggestedAction[]; confidenceBps: number; limitations: string[] }>({
      purpose: `Interpret the verified ${profile.domain} facts without changing state.`,
      workspaceId: task.workspaceId,
      promptVersion: SPECIALIST_INTELLIGENCE_POLICY_VERSION,
      system: `You are Legacy OS ${profile.label}. Outcome: ${profile.success} Constraints: ${profile.stop} Use only supplied facts and evidence references. Never invent records, totals, causation, consent, approval, or completed actions. Recommend only the listed internal tools. Stop when the supported findings and next safe internal actions are clear.`,
      context: { task: { title: task.title, instruction: task.instructionSummary, projectId: task.projectId, clientId: task.clientId }, facts, deterministicFindings: findings, deterministicRecommendations: recommendations, allowedEvidenceRefs: [...evidence], successCriteria: profile.success, stopRule: profile.stop },
      schemaName: `legacy_${profile.domain}_intelligence`, schema: modelSchema(),
    });
    const allowedEvidence = new Set(evidence);
    if (model.usedExternalModel && model.data && Array.isArray(model.data.findings) && Array.isArray(model.data.recommendations)) {
      const validFindings = model.data.findings.filter((item) => item.evidenceRefs.length > 0 && item.evidenceRefs.every((ref) => allowedEvidence.has(ref))).slice(0, 8);
      const validRecommendations = model.data.recommendations.filter((item) => item.evidenceRefs.length > 0 && item.evidenceRefs.every((ref) => allowedEvidence.has(ref))).slice(0, 5);
      result = { ...result, summary: model.data.summary, findings: validFindings.length ? validFindings : result.findings, recommendations: validRecommendations.length ? validRecommendations : result.recommendations, limitations: [...new Set([...limitations, ...model.data.limitations])].slice(0, 8), confidenceBps: Math.min(result.confidenceBps, model.data.confidenceBps), provider: model.provider, model: model.model, inputTokens: model.inputTokens, outputTokens: model.outputTokens, cachedInputTokens: model.cachedInputTokens, reasoningTokens: model.reasoningTokens };
    }
  } catch {
    // The deterministic specialist remains fully operational when a provider is unavailable or invalid.
  }
  return result;
}

export async function listSpecialistIntelligence(workspaceId: string, db: Db = getDb()) {
  const evaluations = await db.select().from(specialistEvaluations).where(eq(specialistEvaluations.workspaceId, workspaceId)).orderBy(desc(specialistEvaluations.createdAt)).limit(100);
  return { profiles: SPECIALIST_PROFILES, evaluations, policyVersion: SPECIALIST_INTELLIGENCE_POLICY_VERSION };
}
