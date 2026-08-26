export type JourneyMilestoneStatus = "complete" | "waived" | "current" | "blocked";

export type JourneyMilestone = {
  id: string;
  label: string;
  status: JourneyMilestoneStatus;
  detail: string;
  evidenceIds: string[];
};

type ProjectInput = {
  id: string;
  clientId: string | null;
  lifecyclePhase: string;
  placement: string | null;
  summary: string | null;
  clientSummary?: string | null;
  budgetMinCents: number | null;
  budgetMaxCents: number | null;
  status: string;
  originMode?: string;
};

type JourneyInputs = {
  project: ProjectInput;
  candidates: Array<{ id: string; proposedProjectId: string | null; status: string }>;
  assets: Array<{ id: string; projectId: string | null; assetRole?: string | null }>;
  approvals: Array<{ id: string; projectId: string | null; status: string; assetId?: string | null }>;
  payments: Array<{ id: string; projectId: string; kind: string; status: string; amountPaidCents: number; amountCents: number }>;
  appointments: Array<{ id: string; projectId: string | null; status: string }>;
  sessions: Array<{ id: string; projectId: string; status: string }>;
  healing: Array<{ id: string; projectId: string; status: string }>;
  content: Array<{ id: string; projectId: string; status: string }>;
  consent: Array<{ id: string; clientId: string; status: string }>;
  outcomes: Array<{ id: string; projectId: string | null; status: string }>;
  knowledge: Array<{ id: string; projectId: string | null }>;
};

const referenceRoles = new Set(["client_reference", "artist_reference", "body_photo"]);
const designRoles = new Set(["mockup", "design_iteration", "final_design", "stencil"]);
const settledPaymentStatuses = new Set(["paid", "partially_refunded", "refunded"]);
const activeAppointmentStatuses = new Set(["scheduled", "confirmed", "completed"]);
const reviewedHealingStatuses = new Set(["reviewed", "closed"]);
const acceptedContentStatuses = new Set(["approved", "published", "complete"]);

export function buildTattooJourney(input: JourneyInputs) {
  const { project } = input;
  const candidate = input.candidates.find((item) => item.proposedProjectId === project.id);
  const projectAssets = input.assets.filter((item) => item.projectId === project.id);
  const projectApprovals = input.approvals.filter((item) => item.projectId === project.id);
  const projectPayments = input.payments.filter((item) => item.projectId === project.id);
  const projectAppointments = input.appointments.filter((item) => item.projectId === project.id);
  const projectSessions = input.sessions.filter((item) => item.projectId === project.id);
  const projectHealing = input.healing.filter((item) => item.projectId === project.id);
  const projectContent = input.content.filter((item) => item.projectId === project.id);
  const projectOutcomes = input.outcomes.filter((item) => item.projectId === project.id);
  const projectKnowledge = input.knowledge.filter((item) => item.projectId === project.id);
  const clientConsent = input.consent.find((item) => item.clientId === project.clientId);

  const qualified = Boolean(
    candidate?.status === "approved" ||
      (project.placement && project.summary && (project.budgetMinCents || project.budgetMaxCents)),
  );
  const references = projectAssets.filter((item) => referenceRoles.has(item.assetRole || ""));
  const designs = projectAssets.filter((item) => designRoles.has(item.assetRole || ""));
  const approvedDesigns = projectApprovals.filter((item) => item.status === "approved" && item.assetId);
  const quoteReady = Boolean(project.budgetMinCents || project.budgetMaxCents || projectPayments.length);
  const deposits = projectPayments.filter((item) => item.kind === "deposit");
  const depositPaid = deposits.some((item) => settledPaymentStatuses.has(item.status) && item.amountPaidCents > 0);
  const appointments = projectAppointments.filter((item) => activeAppointmentStatuses.has(item.status));
  const completedSessions = projectSessions.filter((item) => item.status === "completed");
  const paymentSettled = projectPayments.length > 0 && projectPayments.every((item) => settledPaymentStatuses.has(item.status));
  const healingReviewed = projectHealing.some((item) => reviewedHealingStatuses.has(item.status));
  const contentPrepared = projectContent.some((item) => acceptedContentStatuses.has(item.status));
  const contentDecision = contentPrepared || clientConsent?.status === "revoked";
  const outcomeCaptured = projectOutcomes.some((item) => item.status === "measured");
  const knowledgeCaptured = projectKnowledge.length > 0;
  const completed = project.lifecyclePhase === "complete" && project.status === "completed";

  const facts = [
    { id: "inquiry", label: "Inquiry", done: true, detail: candidate ? "Structured client request preserved" : "Owner-created project record", evidence: candidate ? [candidate.id] : [project.id] },
    { id: "qualification", label: "Qualification", done: qualified, detail: qualified ? "Placement, brief, and budget direction captured" : "Confirm placement, brief, and budget direction", evidence: candidate ? [candidate.id] : [] },
    { id: "project", label: "Client + project", done: Boolean(project.clientId), detail: project.clientId ? "Connected to one client record" : "Connect this project to a client", evidence: project.clientId ? [project.id, project.clientId] : [project.id] },
    { id: "references", label: "References", done: references.length > 0, detail: references.length ? `${references.length} reference asset${references.length === 1 ? "" : "s"} connected` : "Upload a client, artist, or placement reference", evidence: references.map((item) => item.id) },
    { id: "design", label: "Design", done: designs.length > 0, detail: designs.length ? `${designs.length} design version${designs.length === 1 ? "" : "s"} preserved` : "Create and classify a design version", evidence: designs.map((item) => item.id) },
    { id: "approval", label: "Exact approval", done: approvedDesigns.length > 0, detail: approvedDesigns.length ? "Client approved an immutable design version" : "Request approval for the intended design version", evidence: approvedDesigns.map((item) => item.id) },
    { id: "quote", label: "Quote", done: quoteReady, detail: quoteReady ? "Budget or payment request is recorded" : "Record pricing before scheduling tattoo work", evidence: projectPayments.map((item) => item.id) },
    { id: "deposit", label: "Deposit", done: depositPaid, detail: depositPaid ? "Deposit payment is settled" : "Create, approve, and collect the project deposit", evidence: deposits.map((item) => item.id) },
    { id: "appointment", label: "Appointment", done: appointments.length > 0, detail: appointments.length ? "A scheduled commitment is connected" : "Schedule the approved project", evidence: appointments.map((item) => item.id) },
    { id: "session", label: "Tattoo session", done: completedSessions.length > 0, detail: completedSessions.length ? `${completedSessions.length} completed session${completedSessions.length === 1 ? "" : "s"}` : "Complete a session with the approved artifact", evidence: completedSessions.map((item) => item.id) },
    { id: "payment", label: "Final payment", done: paymentSettled, detail: paymentSettled ? "All recorded payment requests are settled" : "Resolve the remaining project balance", evidence: projectPayments.map((item) => item.id) },
    { id: "healing", label: "Healing", done: healingReviewed, detail: healingReviewed ? "Healing evidence has been reviewed" : "Receive and review a healing check-in", evidence: projectHealing.map((item) => item.id) },
    { id: "content", label: "Content decision", done: contentDecision, detail: contentPrepared ? "An approved content asset is prepared" : clientConsent?.status === "revoked" ? "Client declined media use; decision preserved" : "Record consent and prepare content, or record the opt-out", evidence: [...projectContent.map((item) => item.id), ...(clientConsent ? [clientConsent.id] : [])] },
    { id: "outcome", label: "Outcome", done: outcomeCaptured, detail: outcomeCaptured ? "Measured project evidence is recorded" : "Capture the session and healing outcome", evidence: projectOutcomes.map((item) => item.id) },
    { id: "knowledge", label: "Knowledge", done: knowledgeCaptured, detail: knowledgeCaptured ? "Reusable project knowledge is available" : completed ? "Learning capture is pending" : "Generated when the completed project is learned from", evidence: projectKnowledge.map((item) => item.id) },
    { id: "complete", label: "Complete", done: completed, detail: completed ? "Lifecycle closed and learning queued" : "Close only after operational outcomes are complete", evidence: completed ? [project.id] : [] },
  ];

  const phaseOrder = ["consult", "design", "approval", "session", "healing", "complete"];
  const currentPhaseIndex = phaseOrder.indexOf(project.lifecyclePhase);
  const requiredBeforePhase: Record<string, string> = {
    inquiry: "consult", qualification: "design", project: "design", references: "design",
    design: "approval", approval: "session", quote: "session", deposit: "session", appointment: "session",
    session: "healing", payment: "complete", healing: "complete", content: "complete", outcome: "complete",
    knowledge: "complete", complete: "complete",
  };
  const isWaived = (item: (typeof facts)[number]) =>
    project.originMode === "imported" &&
    !item.done &&
    currentPhaseIndex >= phaseOrder.indexOf(requiredBeforePhase[item.id] || "complete");
  const firstIncomplete = facts.findIndex((item) => !item.done && !isWaived(item));
  const milestones: JourneyMilestone[] = facts.map((item, index) => ({
    id: item.id,
    label: item.label,
    status: item.done ? "complete" : isWaived(item) ? "waived" : index === firstIncomplete ? "current" : "blocked",
    detail: isWaived(item) ? "Historical evidence unavailable · imported record" : item.detail,
    evidenceIds: item.evidence,
  }));

  const nextPhase = ({ consult: "design", design: "approval", approval: "session", session: "healing", healing: "complete" } as Record<string, string>)[project.lifecyclePhase] || null;
  const requiredByPhase: Record<string, string[]> = {
    design: ["qualification", "project", "references"],
    approval: ["design"],
    session: ["approval", "quote", "deposit", "appointment"],
    healing: ["session"],
    complete: ["payment", "healing", "content", "outcome"],
  };
  const blockers = (requiredByPhase[nextPhase || ""] || [])
    .map((id) => milestones.find((item) => item.id === id))
    .filter((item): item is JourneyMilestone => Boolean(item && !["complete", "waived"].includes(item.status)));

  return {
    projectId: project.id,
    progressPercent: Math.round((milestones.filter((item) => ["complete", "waived"].includes(item.status)).length / facts.length) * 100),
    milestones,
    nextAction: milestones[firstIncomplete]?.detail || "Project journey complete",
    nextPhase,
    canAdvance: Boolean(nextPhase) && blockers.length === 0,
    advanceBlockers: blockers.map((item) => item.detail),
  };
}
