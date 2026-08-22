import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { getDb } from "../db";
import {
  aiEvents,
  aiRuns,
  auditEvents,
  automationJobs,
  knowledgeEdges,
  knowledgeItems,
  learningCycles,
  observations,
  outcomes,
  patterns,
  projects,
  recommendations,
  usageEvents,
} from "../db/schema";
import {
  APPROVAL_POLICY_VERSION,
  confidenceExplanation,
  decideAutonomy,
  INTELLIGENCE_POLICY_VERSION,
  isMeaningfulPattern,
  patternSignificance,
  scoreConfidence,
} from "./intelligence-policy";
import { runModel } from "./model-adapter";

type Db = ReturnType<typeof getDb>;

type ObservationInput = {
  workspaceId: string;
  projectId?: string | null;
  clientId?: string | null;
  sourceType: string;
  sourceId?: string | null;
  category: string;
  signalKey: string;
  value: Record<string, unknown>;
  qualityBps?: number;
  consentGrantId?: string | null;
  occurredAt?: string;
};

const makeId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

async function hash(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function parseObject(value: string) {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}

const TAXONOMY_ALIASES: Record<string, string> = {
  "black and grey": "black & grey",
  "black grey": "black & grey",
  "black and gray": "black & grey",
  "black gray": "black & grey",
  "black & gray": "black & grey",
  "black & grey realism": "black & grey realism",
  "black and grey realism": "black & grey realism",
  "black and gray realism": "black & grey realism",
  fineline: "fine line",
  florals: "floral",
  realism: "realism",
  realistic: "realism",
  religion: "religious",
  spirituality: "spiritual",
};

function normalizedTerm(value: string) {
  return value.trim().toLowerCase().replace(/[-–—_]/g, " ").replace(/\s+/g, " ");
}

export function canonicalizeTaxonomyTerm(value: string) {
  const alias = normalizedTerm(value);
  const label = TAXONOMY_ALIASES[alias] || alias;
  return {
    label,
    key: label.replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    alias,
  };
}

function canonicalSignalKey(signalKey: string) {
  if (!signalKey.startsWith("project.style:")) return signalKey;
  const term = canonicalizeTaxonomyTerm(signalKey.slice("project.style:".length));
  return `project.style:${term.key}`;
}

function creatorPatternLanguage(patternKey: string, sample: Record<string, unknown>) {
  if (patternKey.startsWith("project.style:")) {
    const term = canonicalizeTaxonomyTerm(String(sample.label || patternKey.split(":").at(-1) || "style"));
    return {
      label: `${term.label.replace(/\b\w/g, (letter) => letter.toUpperCase())} project pattern`,
      why: String(sample.why || `Repeated ${term.label} work can reveal reusable preparation, design, session, and aftercare practices without replacing creative judgment.`),
    };
  }
  const language: Record<string, { label: string; why: string }> = {
    "client.inquiry_created": {
      label: "Inquiry qualification evidence",
      why: "Tracking which inquiry details are present can show which information reduces follow-up and moves serious clients toward consultation faster.",
    },
    "session.completed": {
      label: "Tattoo session outcome pattern",
      why: "Session duration and setup evidence can improve future preparation and estimates when enough comparable completed projects exist.",
    },
  };
  return language[patternKey] || {
    label: patternKey.split(/[.:_]/).filter(Boolean).map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" "),
    why: String(sample.why || "Repeated evidence across completed projects may support a reusable internal workflow after the required confidence threshold is met."),
  };
}

export async function captureObservation(
  input: ObservationInput,
  db: Db = getDb(),
) {
  const now = new Date().toISOString();
  const id = makeId("obs");
  await db
    .insert(observations)
    .values({
      id,
      workspaceId: input.workspaceId,
      projectId: input.projectId ?? null,
      clientId: input.clientId ?? null,
      sourceType: input.sourceType,
      sourceId: input.sourceId ?? null,
      category: input.category,
      signalKey: canonicalSignalKey(input.signalKey),
      valueJson: JSON.stringify(input.value),
      qualityBps: input.qualityBps ?? 8000,
      consentGrantId: input.consentGrantId ?? null,
      occurredAt: input.occurredAt ?? now,
      capturedAt: now,
    })
    .onConflictDoNothing();
  return id;
}

export async function enqueueLearningCycle(
  workspaceId: string,
  triggerType: string,
  projectId?: string | null,
  db: Db = getDb(),
) {
  const now = new Date().toISOString();
  const id = makeId("job");
  await db.insert(automationJobs).values({
    id,
    workspaceId,
    jobType: "learning_cycle",
    entityType: projectId ? "project" : "workspace",
    entityId: projectId ?? workspaceId,
    payloadJson: JSON.stringify({ triggerType, projectId: projectId ?? null }),
    status: "queued",
    priority: triggerType === "project_completed" ? 90 : 50,
    runAfter: now,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

export async function captureCompletedProject(
  workspaceId: string,
  projectId: string,
  db: Db = getDb(),
) {
  const project = await db
    .select()
    .from(projects)
    .where(
      and(eq(projects.workspaceId, workspaceId), eq(projects.id, projectId)),
    )
    .get();
  if (!project) throw new Error("Completed project was not found");
  if (project.isTest || project.archivedAt) return null;

  const tags = (() => {
    try {
      return JSON.parse(project.styleTagsJson) as string[];
    } catch {
      return [];
    }
  })();
  const now = new Date().toISOString();
  const inputs: ObservationInput[] = [
    {
      workspaceId,
      projectId,
      clientId: project.clientId,
      sourceType: "project",
      sourceId: projectId,
      category: "completion",
      signalKey: "project.completed",
      value: { title: project.title, placement: project.placement },
      occurredAt: now,
    },
    ...tags.map((tag) => {
      const taxonomy = canonicalizeTaxonomyTerm(tag);
      return {
      workspaceId,
      projectId,
      clientId: project.clientId,
      sourceType: "project" as const,
      sourceId: projectId,
      category: "creative",
      signalKey: `project.style:${taxonomy.key}`,
      value: {
        label: taxonomy.label,
        aliases: taxonomy.alias === taxonomy.label ? [] : [taxonomy.alias],
        recommendation:
          "Create or refine a reusable project checklist and reference cluster for this recurring style.",
        why:
          "Repeated completed work can reveal where a reusable workflow saves preparation time while preserving creative judgment.",
      },
      occurredAt: now,
      };
    }),
  ];

  for (const input of inputs) await captureObservation(input, db);
}

export async function runLearningCycle(
  workspaceId: string,
  triggerType = "manual",
  projectId?: string | null,
) {
  const db = getDb();
  const started = new Date();
  const cycleId = makeId("learn");
  const runId = makeId("run");
  const correlationId = crypto.randomUUID();

  try {
    const [allObservations, completedProjects, existingPatterns] =
      await Promise.all([
        db
          .select()
          .from(observations)
          .where(eq(observations.workspaceId, workspaceId)),
        db
          .select()
          .from(projects)
          .where(
            and(
              eq(projects.workspaceId, workspaceId),
              eq(projects.lifecyclePhase, "complete"),
              eq(projects.isTest, false),
              isNull(projects.archivedAt),
            ),
          ),
        db
          .select()
          .from(patterns)
          .where(eq(patterns.workspaceId, workspaceId)),
      ]);

    const completedIds = new Set(completedProjects.map((item) => item.id));
    const eligible = allObservations.filter(
      (item) =>
        item.signalKey !== "project.completed" &&
        (!item.projectId || completedIds.has(item.projectId)),
    );
    const evidenceFingerprint = await hash(JSON.stringify(
      eligible
        .map((item) => ({ id: item.id, signalKey: canonicalSignalKey(item.signalKey), valueJson: item.valueJson }))
        .sort((a, b) => a.id.localeCompare(b.id)),
    ));
    const [sameEvidenceCycle, priorCycle] = await Promise.all([
      db.select().from(learningCycles).where(and(eq(learningCycles.workspaceId, workspaceId), eq(learningCycles.evidenceFingerprint, evidenceFingerprint))).get(),
      db.select().from(learningCycles).where(and(eq(learningCycles.workspaceId, workspaceId), eq(learningCycles.status, "succeeded"))).orderBy(desc(learningCycles.completedAt)).limit(1).get(),
    ]);
    if (sameEvidenceCycle) {
      const completedAt = new Date().toISOString();
      const summary = "No new eligible evidence was found. Existing knowledge and confidence scores were left unchanged.";
      await db.batch([
        db.insert(aiRuns).values({ id: runId, workspaceId, projectId: projectId ?? null, correlationId, agentName: "Knowledge & Learning", purpose: "New-evidence check", provider: "Legacy OS", model: "evidence-fingerprint-v1", promptVersion: "none", contextPolicyVersion: INTELLIGENCE_POLICY_VERSION, approvalPolicyVersion: APPROVAL_POLICY_VERSION, riskLevel: "low", contentCapture: "metadata_only", reasoningSummary: summary, recommendation: null, evidenceJson: JSON.stringify({ evidenceFingerprint, priorCycleId: sameEvidenceCycle.id, eligibleObservations: eligible.length }), confidenceBps: 10000, status: "succeeded", startedAt: started.toISOString(), completedAt, latencyMs: new Date(completedAt).getTime() - started.getTime(), createdAt: started.toISOString() }),
        db.insert(aiEvents).values({ id: makeId("evt"), workspaceId, runId, sequence: 1, eventType: "learning.no_change", status: "succeeded", summary, metadataJson: JSON.stringify({ priorCycleId: sameEvidenceCycle.id }), occurredAt: completedAt }),
        db.insert(usageEvents).values({ id: makeId("usage"), workspaceId, runId, provider: "Legacy OS", model: "evidence-fingerprint-v1", inputTokens: 0, outputTokens: 0, estimatedCostMicros: 0, pricingVersion: "local-rules", occurredAt: completedAt }),
        db.insert(auditEvents).values({ id: makeId("audit"), workspaceId, actorType: "agent", actorId: "knowledge-learning", action: "learning_cycle.no_change", targetType: "workspace", targetId: workspaceId, riskLevel: "low", outcome: "no_change", correlationId, metadataJson: JSON.stringify({ evidenceFingerprint, priorCycleId: sameEvidenceCycle.id }), occurredAt: completedAt }),
      ]);
      return { cycleId: sameEvidenceCycle.id, runId, summary, status: "no_change", knowledgeChanged: false, newEvidenceCount: 0, observationsProcessed: 0, patternsEvaluated: 0, patternsPromoted: 0, recommendationsCreated: 0 };
    }
    const priorChangeSet = priorCycle ? parseObject(priorCycle.changeSetJson) : {};
    const priorEvidenceIds = new Set(
      Array.isArray(priorChangeSet.eligibleObservationIds)
        ? priorChangeSet.eligibleObservationIds.filter(
            (item): item is string => typeof item === "string",
          )
        : [],
    );
    const newEvidenceRows = eligible.filter((item) => !priorEvidenceIds.has(item.id));
    const newEvidenceCount = newEvidenceRows.length;
    await db.insert(learningCycles).values({
      id: cycleId,
      workspaceId,
      projectId: projectId ?? null,
      triggerType,
      status: "running",
      eligibleObservations: eligible.length,
      newEvidenceCount,
      evidenceFingerprint,
      priorCycleId: priorCycle?.id ?? null,
      startedAt: started.toISOString(),
      createdAt: started.toISOString(),
    });
    const grouped = new Map<string, typeof eligible>();
    for (const observation of eligible) {
      const key = canonicalSignalKey(observation.signalKey);
      const list = grouped.get(key) ?? [];
      list.push(observation);
      grouped.set(key, list);
    }

    let promoted = 0;
    let createdRecommendations = 0;
    let changedPatterns = 0;
    const now = new Date().toISOString();
    for (const [patternKey, evidenceRows] of grouped) {
      const distinctProjects = new Set(
        evidenceRows.map((row) => row.projectId).filter(Boolean),
      );
      const distinctClients = new Set(
        evidenceRows.map((row) => row.clientId).filter(Boolean),
      );
      const effectBps = completedProjects.length
        ? Math.round((distinctProjects.size / completedProjects.length) * 10000)
        : 0;
      const averageQuality = Math.round(
        evidenceRows.reduce((sum, row) => sum + row.qualityBps, 0) /
          evidenceRows.length,
      );
      const newest = evidenceRows
        .map((row) => new Date(row.occurredAt).getTime())
        .sort((a, b) => b - a)[0];
      const ageDays = Math.max(0, (Date.now() - newest) / 86_400_000);
      const recencyBps = Math.max(3000, 10000 - ageDays * 55);
      const confidenceBps = scoreConfidence({
        evidenceQualityBps: averageQuality,
        sampleStrengthBps: Math.min(10000, evidenceRows.length * 2000),
        replicationBps: Math.min(
          10000,
          distinctProjects.size * 1500 + distinctClients.size * 1250,
        ),
        effectStrengthBps: Math.min(10000, effectBps),
        recencyBps,
      });
      const significanceBps = patternSignificance({
        supportCount: evidenceRows.length,
        distinctProjects: distinctProjects.size,
        distinctClients: distinctClients.size,
        effectBps,
      });
      const meaningful = isMeaningfulPattern({
        supportCount: evidenceRows.length,
        distinctProjects: distinctProjects.size,
        distinctClients: distinctClients.size,
        effectBps,
        confidenceBps,
      });
      const sample = parseObject(evidenceRows[0].valueJson);
      const language = creatorPatternLanguage(patternKey, sample);
      const label = language.label;
      const existing = existingPatterns.find(
        (item) => item.patternKey === patternKey,
      );
      const legacyAliases = existingPatterns.filter(
        (item) => item.patternKey !== patternKey && canonicalSignalKey(item.patternKey) === patternKey,
      );
      const patternId = existing?.id ?? makeId("pat");
      const patternEvidence = evidenceRows
        .slice()
        .sort((a, b) => a.id.localeCompare(b.id))
        .slice(-20)
        .map((row) => ({
          observationId: row.id,
          projectId: row.projectId,
          clientId: row.clientId,
          occurredAt: row.occurredAt,
        }));
      const evidenceHash = await hash(JSON.stringify(patternEvidence));
      const patternChanged = !existing || existing.evidenceHash !== evidenceHash;
      const nextVersion = existing ? existing.version + (patternChanged ? 1 : 0) : 1;
      const description = `${label} is supported by ${evidenceRows.length} observation${evidenceRows.length === 1 ? "" : "s"} from ${distinctProjects.size} completed project${distinctProjects.size === 1 ? "" : "s"} across ${distinctClients.size} client${distinctClients.size === 1 ? "" : "s"}.`;
      const whyItMatters = language.why;
      if (patternChanged) changedPatterns += 1;

      await db
        .insert(patterns)
        .values({
          id: patternId,
          workspaceId,
          patternKey,
          name: label,
          description,
          whyItMatters,
          status: meaningful ? "active" : "candidate",
          supportCount: evidenceRows.length,
          distinctProjects: distinctProjects.size,
          distinctClients: distinctClients.size,
          effectBps,
          confidenceBps,
          significanceBps,
          evidenceJson: JSON.stringify(patternEvidence),
          evidenceHash,
          firstSeenAt: existing?.firstSeenAt ?? evidenceRows[0].occurredAt,
          lastSeenAt: new Date(newest).toISOString(),
          lastEvaluatedAt: now,
          version: nextVersion,
          supersedesPatternId: existing?.supersedesPatternId ?? null,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [patterns.workspaceId, patterns.patternKey],
          set: {
            description,
            whyItMatters,
            status: meaningful ? "active" : "candidate",
            supportCount: evidenceRows.length,
            distinctProjects: distinctProjects.size,
            distinctClients: distinctClients.size,
            effectBps,
            confidenceBps,
            significanceBps,
            evidenceJson: JSON.stringify(patternEvidence),
            evidenceHash,
            lastSeenAt: new Date(newest).toISOString(),
            lastEvaluatedAt: now,
            version: nextVersion,
            updatedAt: now,
          },
        });
      for (const aliasPattern of legacyAliases) {
        await db.update(patterns).set({ status: "superseded", supersedesPatternId: patternId, lastEvaluatedAt: now, updatedAt: now }).where(eq(patterns.id, aliasPattern.id));
      }

      if (!meaningful) continue;
      if (existing?.status !== "active") promoted += 1;

      if (patternChanged) {
        const knowledgeId = makeId("know");
        const content = `${description} ${whyItMatters} Confidence: ${confidenceExplanation(confidenceBps)}.`;
        const contentHash = await hash(
          `${workspaceId}:${patternKey}:${nextVersion}:${content}`,
        );
        await db.insert(knowledgeItems).values({
          id: knowledgeId,
          workspaceId,
          itemType: "learned_pattern",
          title: `Pattern · ${label} · v${nextVersion}`,
          content,
          contentHash,
          summary: description,
          tagsJson: JSON.stringify(["pattern", label]),
          confidenceBps,
          verificationStatus: "system_evidence",
          visibility: "workspace",
          validFrom: now,
          createdBy: "chief-of-staff",
          createdAt: now,
          updatedAt: now,
        });

        const priorKnowledge = await db
          .select()
          .from(knowledgeItems)
          .where(eq(knowledgeItems.workspaceId, workspaceId))
          .orderBy(desc(knowledgeItems.createdAt));
        const previous = priorKnowledge.find(
          (item) =>
            item.id !== knowledgeId &&
            item.itemType === "learned_pattern" &&
            item.title.startsWith(`Pattern · ${label} ·`),
        );
        if (previous) {
          await db.insert(knowledgeEdges).values({
            id: makeId("edge"),
            workspaceId,
            fromItemId: knowledgeId,
            toItemId: previous.id,
            relationship: "supersedes",
            weightBps: confidenceBps,
            evidenceJson: JSON.stringify({ patternId, version: nextVersion }),
            createdBy: "chief-of-staff",
            createdAt: now,
          });
        }
      }

      const activeRecommendation = await db
        .select()
        .from(recommendations)
        .where(
          and(
            eq(recommendations.patternId, patternId),
            inArray(recommendations.status, ["proposed", "approved", "acting"]),
          ),
        )
        .get();
      if (!activeRecommendation) {
        const autonomy = decideAutonomy({
          actionType: "internal_workflow_template",
          riskLevel: "low",
          reversibility: "reversible",
          externalSideEffect: false,
          confidenceBps,
        });
        const recommendationId = makeId("rec");
        await db.insert(recommendations).values({
          id: recommendationId,
          workspaceId,
          patternId,
          actionType: "internal_workflow_template",
          title: String(
            sample.recommendation ||
              `Create a reusable workflow for ${label}`,
          ),
          rationale: `${whyItMatters} Supported by ${distinctProjects.size} completed projects and ${distinctClients.size} clients.`,
          evidenceJson: JSON.stringify({
            patternId,
            observationIds: evidenceRows.map((row) => row.id),
            policyVersion: INTELLIGENCE_POLICY_VERSION,
            autonomyReason: autonomy.reason,
          }),
          confidenceBps,
          riskLevel: "low",
          reversibility: "reversible",
          autonomyLevel: autonomy.level,
          approvalRequired: autonomy.approvalRequired,
          status: autonomy.approvalRequired ? "proposed" : "acted",
          actedAt: autonomy.approvalRequired ? null : now,
          createdAt: now,
          updatedAt: now,
        });
        await db.insert(outcomes).values({
          id: makeId("out"),
          workspaceId,
          recommendationId,
          metricName: "workflow_reuse_rate",
          baselineValue: effectBps,
          targetValue: Math.min(10000, effectBps + 1000),
          unit: "basis_points",
          direction: "increase",
          status: "pending",
          observationWindowDays: 30,
          evidenceJson: JSON.stringify({ patternId }),
          createdAt: now,
          updatedAt: now,
        });
        createdRecommendations += 1;
      }
    }

    const model = await runModel({
      purpose: "Explain the completed evidence evaluation",
      system:
        "Summarize only supplied evidence. Do not invent clients, projects, outcomes, or causal claims.",
      context: {
        eligibleObservations: eligible.length,
        newEvidenceCount,
        patternsEvaluated: grouped.size,
        patternsChanged: changedPatterns,
        patternsPromoted: promoted,
        recommendationsCreated: createdRecommendations,
      },
    });
    const completed = new Date();
    const knowledgeChanged = changedPatterns > 0 || promoted > 0 || createdRecommendations > 0;
    const summary = knowledgeChanged
      ? `${newEvidenceCount} new eligible observation${newEvidenceCount === 1 ? "" : "s"} changed ${changedPatterns} pattern candidate${changedPatterns === 1 ? "" : "s"}; ${promoted} crossed the meaningful-evidence threshold and ${createdRecommendations} recommendation${createdRecommendations === 1 ? " was" : "s were"} created.`
      : `${newEvidenceCount} new eligible observation${newEvidenceCount === 1 ? " was" : "s were"} evaluated, but no pattern or recommendation changed.`;
    await db.batch([
      db
        .update(learningCycles)
        .set({
          status: "succeeded",
          observationsProcessed: eligible.length,
          patternsEvaluated: grouped.size,
          patternsPromoted: promoted,
          recommendationsCreated: createdRecommendations,
          outcomesMeasured: 0,
          eligibleObservations: eligible.length,
          newEvidenceCount,
          knowledgeChanged,
          changeSetJson: JSON.stringify({
            changedPatterns,
            promoted,
            createdRecommendations,
            newObservationIds: newEvidenceRows.map((item) => item.id),
            eligibleObservationIds: eligible.map((item) => item.id),
          }),
          summary,
          completedAt: completed.toISOString(),
        })
        .where(eq(learningCycles.id, cycleId)),
      db.insert(aiRuns).values({
        id: runId,
        workspaceId,
        projectId: projectId ?? null,
        correlationId,
        agentName: "Knowledge & Learning",
        purpose: "Cross-project pattern evaluation",
        provider: model.provider,
        model: model.model,
        promptVersion: "pattern-explanation-v1",
        contextPolicyVersion: INTELLIGENCE_POLICY_VERSION,
        approvalPolicyVersion: APPROVAL_POLICY_VERSION,
        riskLevel: "low",
        contentCapture: "metadata_only",
        reasoningSummary: summary,
        recommendation: model.summary,
        evidenceJson: JSON.stringify({
          cycleId,
          eligibleObservations: eligible.length,
          newEvidenceCount,
          changedPatterns,
          patternsEvaluated: grouped.size,
          patternsPromoted: promoted,
        }),
        confidenceBps: grouped.size ? 7500 : 10000,
        status: "succeeded",
        startedAt: started.toISOString(),
        completedAt: completed.toISOString(),
        latencyMs: completed.getTime() - started.getTime(),
        createdAt: started.toISOString(),
      }),
      db.insert(aiEvents).values({
        id: makeId("evt"),
        workspaceId,
        runId,
        sequence: 1,
        eventType: "learning.completed",
        status: "succeeded",
        summary,
        metadataJson: JSON.stringify({ cycleId }),
        occurredAt: completed.toISOString(),
      }),
      db.insert(usageEvents).values({
        id: makeId("usage"),
        workspaceId,
        runId,
        provider: model.provider,
        model: model.model,
        occurredAt: completed.toISOString(),
      }),
      db.insert(auditEvents).values({
        id: makeId("audit"),
        workspaceId,
        actorType: "agent",
        actorId: "knowledge-learning",
        action: "learning_cycle.completed",
        targetType: projectId ? "project" : "workspace",
        targetId: projectId ?? workspaceId,
        riskLevel: "low",
        outcome: "succeeded",
        correlationId,
        metadataJson: JSON.stringify({
          cycleId,
          contentCaptured: false,
          policyVersion: INTELLIGENCE_POLICY_VERSION,
        }),
        occurredAt: completed.toISOString(),
      }),
    ]);

    return {
      cycleId,
      runId,
      summary,
      observationsProcessed: eligible.length,
      patternsEvaluated: grouped.size,
      patternsPromoted: promoted,
      recommendationsCreated: createdRecommendations,
      status: "succeeded",
      knowledgeChanged,
      newEvidenceCount,
      changedPatterns,
    };
  } catch (error) {
    const failedAt = new Date().toISOString();
    await db
      .update(learningCycles)
      .set({
        status: "failed",
        summary: error instanceof Error ? error.message : "Learning failed",
        completedAt: failedAt,
      })
      .where(eq(learningCycles.id, cycleId));
    throw error;
  }
}
