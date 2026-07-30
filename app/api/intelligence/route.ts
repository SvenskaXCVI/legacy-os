import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import {
  automationJobs,
  consentGrants,
  learningCycles,
  outcomes,
  patterns,
  recommendations,
  socialConnections,
} from "../../../db/schema";
import {
  jsonError,
  requireOwner,
  WORKSPACE_ID,
} from "../_lib";
import { runLearningCycle } from "../../../lib/intelligence-engine";
import {
  APPROVAL_POLICY_VERSION,
  INTELLIGENCE_POLICY_VERSION,
} from "../../../lib/intelligence-policy";

export async function GET(request: Request) {
  try {
    await requireOwner(request);
    const db = getDb();
    const [
      patternRows,
      recommendationRows,
      outcomeRows,
      cycleRows,
      jobRows,
      consentRows,
      socialRows,
    ] = await Promise.all([
      db
        .select()
        .from(patterns)
        .where(eq(patterns.workspaceId, WORKSPACE_ID))
        .orderBy(desc(patterns.confidenceBps)),
      db
        .select()
        .from(recommendations)
        .where(eq(recommendations.workspaceId, WORKSPACE_ID))
        .orderBy(desc(recommendations.createdAt)),
      db
        .select()
        .from(outcomes)
        .where(eq(outcomes.workspaceId, WORKSPACE_ID))
        .orderBy(desc(outcomes.createdAt)),
      db
        .select()
        .from(learningCycles)
        .where(eq(learningCycles.workspaceId, WORKSPACE_ID))
        .orderBy(desc(learningCycles.createdAt)),
      db
        .select()
        .from(automationJobs)
        .where(eq(automationJobs.workspaceId, WORKSPACE_ID))
        .orderBy(desc(automationJobs.createdAt)),
      db
        .select()
        .from(consentGrants)
        .where(eq(consentGrants.workspaceId, WORKSPACE_ID))
        .orderBy(desc(consentGrants.createdAt)),
      db
        .select()
        .from(socialConnections)
        .where(eq(socialConnections.workspaceId, WORKSPACE_ID))
        .orderBy(desc(socialConnections.createdAt)),
    ]);
    return Response.json({
      policy: {
        intelligence: INTELLIGENCE_POLICY_VERSION,
        approval: APPROVAL_POLICY_VERSION,
        meaningfulPattern: {
          minimumSupport: 3,
          minimumProjects: 3,
          minimumClients: 2,
          minimumEffectBps: 1000,
          minimumConfidenceBps: 6500,
        },
        autoAction: {
          minimumConfidenceBps: 7800,
          scope: "low-risk, internal, reversible actions only",
        },
      },
      patterns: patternRows,
      recommendations: recommendationRows,
      outcomes: outcomeRows,
      learningCycles: cycleRows,
      jobs: jobRows,
      consents: consentRows,
      socialConnections: socialRows.map((row) => ({
        ...row,
        encryptedTokenJson: row.encryptedTokenJson ? "[protected]" : null,
      })),
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return jsonError(
      error instanceof Error ? error.message : "Unable to load intelligence",
      500,
    );
  }
}

export async function POST(request: Request) {
  try {
    await requireOwner(request);
    const payload = (await request.json().catch(() => ({}))) as {
      triggerType?: string;
      projectId?: string;
    };
    const result = await runLearningCycle(
      WORKSPACE_ID,
      payload.triggerType || "manual",
      payload.projectId || null,
    );
    return Response.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    return jsonError(
      error instanceof Error ? error.message : "Unable to run learning cycle",
      500,
    );
  }
}

