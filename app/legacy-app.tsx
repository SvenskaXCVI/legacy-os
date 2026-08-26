"use client";

import {
  Activity,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  BrainCircuit,
  Brush,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Copy,
  CreditCard,
  Download,
  FileText,
  FolderKanban,
  Gauge,
  HeartHandshake,
  Image as ImageIcon,
  Inbox,
  LayoutDashboard,
  Library,
  Link2,
  LogOut,
  LockKeyhole,
  Maximize2,
  Menu,
  MessageSquareText,
  Moon,
  Palette,
  Plus,
  Save,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  Upload,
  UserRound,
  UserCog,
  UsersRound,
  WandSparkles,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  FormEvent,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import NextImage from "next/image";
import { InstallAppButton } from "./install-app-button";
import { LEGACY_OS_RELEASE, LEGACY_OS_VERSION } from "../lib/version";

type OwnerView =
  | "dashboard"
  | "projects"
  | "clients"
  | "calendar"
  | "inbox"
  | "knowledge"
  | "design"
  | "content"
  | "finances"
  | "analytics"
  | "chief"
  | "operations"
  | "settings";

type NavigationTarget = { view: OwnerView; id?: string; clientId?: string };

type ThemeMode = "dark" | "light";
type AccentName = "gold" | "amber" | "coral" | "rose" | "violet" | "blue" | "teal" | "emerald";
type PersonalizationPreferences = { theme: ThemeMode; accent: AccentName };

const DEFAULT_PERSONALIZATION: PersonalizationPreferences = {
  theme: "dark",
  accent: "gold",
};

const ACCENT_OPTIONS: Array<{ id: AccentName; label: string; color: string }> = [
  { id: "gold", label: "Legacy Gold", color: "#c7873c" },
  { id: "amber", label: "Amber", color: "#d99a2b" },
  { id: "coral", label: "Coral", color: "#d97757" },
  { id: "rose", label: "Rose", color: "#c9617d" },
  { id: "violet", label: "Violet", color: "#8b6bd6" },
  { id: "blue", label: "Blue", color: "#4f86d9" },
  { id: "teal", label: "Teal", color: "#3c9b95" },
  { id: "emerald", label: "Emerald", color: "#4d9b68" },
];

function applyPersonalization(preferences: PersonalizationPreferences) {
  document.documentElement.dataset.theme = preferences.theme;
  document.documentElement.dataset.accent = preferences.accent;
  document.documentElement.style.colorScheme = preferences.theme;
}

function readPersonalization(): PersonalizationPreferences {
  if (typeof window === "undefined") return DEFAULT_PERSONALIZATION;
  const saved = window.localStorage.getItem("legacy_personalization");
  if (!saved) return DEFAULT_PERSONALIZATION;
  try {
    const candidate = JSON.parse(saved) as Partial<PersonalizationPreferences>;
    return {
      theme: candidate.theme === "light" ? "light" : "dark",
      accent: ACCENT_OPTIONS.some((option) => option.id === candidate.accent)
        ? (candidate.accent as AccentName)
        : "gold",
    };
  } catch {
    window.localStorage.removeItem("legacy_personalization");
    return DEFAULT_PERSONALIZATION;
  }
}

type ClientRecord = {
  id: string;
  firstName: string;
  lastName: string;
  displayName?: string | null;
  preferredName?: string | null;
  email: string | null;
  phone: string | null;
  instagramHandle?: string | null;
  tiktokHandle?: string | null;
  preferredChannel: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
};

type ProjectCandidateRecord = {
  id: string;
  clientId?: string;
  requestedTitle: string;
  placement: string | null;
  sizeDescription: string | null;
  styleTagsJson: string;
  concept: string;
  referencesSummary?: string | null;
  constraints?: string | null;
  budgetMinCents: number | null;
  budgetMaxCents: number | null;
  targetDate: string | null;
  status: string;
  confidenceBps: number;
  extractionMethod?: string;
  proposedProjectId: string | null;
  clientResponse: string | null;
  submittedAt: string;
  updatedAt: string;
};

type ProjectRecord = {
  id: string;
  clientId: string | null;
  clientFirstName?: string | null;
  clientLastName?: string | null;
  title: string;
  lifecyclePhase: string;
  status: string;
  priority: string;
  placement: string | null;
  sizeDescription: string | null;
  styleTagsJson: string;
  budgetMinCents: number | null;
  budgetMaxCents: number | null;
  targetDate: string | null;
  nextAction: string | null;
  nextActionAt: string | null;
  summary: string | null;
  clientSummary?: string | null;
  isTest?: boolean;
  archivedAt?: string | null;
  updatedAt: string;
};

type PaymentRecord = {
  id: string;
  projectId: string;
  clientId: string;
  kind: string;
  title: string;
  description: string | null;
  amountCents: number;
  amountPaidCents: number;
  amountRefundedCents: number;
  currency: string;
  status: string;
  dueAt: string | null;
  approvedAt: string | null;
  paidAt: string | null;
  refundedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type AppointmentRecord = {
  id: string;
  clientId: string | null;
  projectId: string | null;
  appointmentType: string;
  startsAt: string;
  endsAt: string | null;
  status: string;
  location: string | null;
  notes: string | null;
};

type TattooSessionRecord = {
  id: string;
  projectId: string;
  clientId: string;
  appointmentId: string | null;
  sessionNumber: number;
  status: string;
  startedAt: string | null;
  endedAt: string | null;
  designAssetId: string | null;
  stencilAssetId: string | null;
  placementSnapshot: string | null;
  needleSetup: string | null;
  inkSetup: string | null;
  techniqueNotes: string | null;
  clientVisibleSummary: string | null;
  durationMinutes: number | null;
  createdAt: string;
};

type HealingCheckinRecord = {
  id: string;
  projectId: string;
  clientId?: string;
  sessionId: string;
  checkpointDay: number;
  scheduledFor: string;
  status: string;
  clientNotes: string | null;
  studioNotes?: string | null;
  progressRating: number | null;
  concernFlag: boolean;
  ownerResponse: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
};

type SessionCraftRecord = {
  id: string;
  sessionId: string;
  projectId: string;
  clientId: string;
  machineName: string | null;
  machineType: string | null;
  needleGroupingsJson: string;
  inkWashJson: string;
  voltageMinMv: number | null;
  voltageMaxMv: number | null;
  techniquesJson: string;
  bodyArea: string | null;
  skinResponse: string | null;
  clientResponse: string | null;
  freshOutcomeRating: number | null;
  ownerAssessment: string | null;
  freshAssetIdsJson: string;
  completenessBps: number;
  updatedAt: string;
};

type HealingAssessmentRecord = {
  id: string;
  checkinId: string;
  sessionId: string;
  projectId: string;
  clientId: string;
  healingPhase: string;
  retentionRating: number | null;
  saturationRating: number | null;
  lineQualityRating: number | null;
  smoothnessRating: number | null;
  healedOutcomeRating: number;
  touchupRequired: boolean;
  ownerAssessment: string;
  clientFeedbackSummary: string | null;
  assessedAt: string;
};

type CraftPatternRecord = {
  id: string;
  patternKey: string;
  name: string;
  description: string;
  whyItMatters: string;
  status: string;
  supportCount: number;
  distinctProjects: number;
  distinctClients: number;
  effectBps: number;
  confidenceBps: number;
  evidenceJson: string;
  lastEvaluatedAt: string;
};

type CraftIntelligenceData = {
  records: SessionCraftRecord[];
  assessments: HealingAssessmentRecord[];
  runs: Array<{ id: string; eligibleSessions: number; combinationsEvaluated: number; candidatePatterns: number; promotedPatterns: number; summary: string; policyVersion: string; completedAt: string }>;
  patterns: CraftPatternRecord[];
  recommendations: Array<{ id: string; patternId: string | null; title: string; rationale: string; confidenceBps: number; status: string; approvalRequired: boolean }>;
  thresholds: { completedProjects: number; distinctClients: number; effectBps: number; confidenceBps: number; recordCompletenessBps: number };
  policyVersion: string;
};

type SchedulingIntelligenceData = {
  profile: {
    id: string; defaultPrepMinutes: number; defaultTravelMinutes: number; defaultBufferBeforeMinutes: number;
    defaultBufferAfterMinutes: number; maximumTattooMinutesPerDay: number; maximumHighEnergySessionsPerDay: number;
    minimumBookableMinutes: number; weeklyRevenueTargetCents: number; policyVersion: string;
  } | null;
  requirements: Array<{
    id: string; projectId: string; estimatedSessionMinutes: number; prepMinutes: number | null; travelMinutes: number | null;
    bufferBeforeMinutes: number | null; bufferAfterMinutes: number | null; energyDemand: string; minimumRevenueCents: number;
    earliestStart: string | null; latestEnd: string | null; location: string | null; notes: string | null; status: string;
  }>;
  windows: Array<{
    id: string; title: string; startsAt: string; endsAt: string; windowType: string; status: string;
    energyCapacity: string; location: string | null; notes: string | null; source: string;
  }>;
  runs: Array<{
    id: string; windowsEvaluated: number; projectsEvaluated: number; readyProjects: number; opportunitiesCreated: number;
    conflictsDetected: number; projectedRevenueCents: number; summary: string; policyVersion: string; completedAt: string;
  }>;
  opportunities: Array<{
    id: string; windowId: string; projectId: string; clientId: string; suggestedStartsAt: string; suggestedEndsAt: string;
    reservedFrom: string; reservedUntil: string; readinessBps: number; fitBps: number; projectedRevenueCents: number;
    energyDemand: string; rationale: string; status: string; approvalRequired: boolean; taskId: string | null;
  }>;
  policyVersion: string;
};

type ContentCandidateRecord = {
  id: string;
  projectId: string;
  clientId: string;
  sessionId: string | null;
  sourceAssetId: string;
  title: string;
  format: string;
  status: string;
  captionDraft: string | null;
  rightsStatus: string;
  consentStatus: string;
  createdAt: string;
};

type MediaConsentRecord = {
  id: string;
  clientId: string;
  status: string;
  scopesJson: string;
  grantedAt: string;
  revokedAt: string | null;
};

type OutcomeRecord = {
  id: string;
  projectId: string | null;
  metricName: string;
  status: string;
};

type ProjectJourneyRecord = {
  projectId: string;
  progressPercent: number;
  nextAction: string;
  nextPhase: string | null;
  canAdvance: boolean;
  advanceBlockers: string[];
  milestones: Array<{
    id: string;
    label: string;
    status: "complete" | "current" | "blocked";
    detail: string;
    evidenceIds: string[];
  }>;
};

type ApprovalRecord = {
  id: string;
  projectId: string | null;
  assetId?: string | null;
  assetVersion?: number | null;
  category: string;
  actionType: string;
  subject: string;
  summary: string;
  riskLevel: string;
  status: string;
  decisionReason: string | null;
  createdAt: string;
};

type MessageRecord = {
  id: string;
  clientId: string;
  projectId: string | null;
  senderType: string;
  body: string;
  status: string;
  readAt: string | null;
  createdAt: string;
};

type AssetRecord = {
  id: string;
  clientId: string | null;
  projectId: string | null;
  originalName: string;
  mediaType: string;
  mimeType: string;
  byteSize: number;
  sourceType: string;
  assetRole?: string;
  visibility?: string;
  version?: number;
  versionGroupId?: string | null;
  parentAssetId?: string | null;
  rightsStatus?: string;
  consentStatus?: string;
  contentEligible?: boolean;
  createdAt: string;
};

type KnowledgeRecord = {
  id: string;
  projectId: string | null;
  itemType: string;
  title: string;
  content: string;
  summary: string | null;
  tagsJson: string;
  confidenceBps: number | null;
  verificationStatus: string;
  createdAt: string;
};

type RunRecord = {
  id: string;
  agentName: string;
  purpose: string;
  provider: string;
  model: string;
  status: string;
  confidenceBps: number | null;
  latencyMs: number | null;
  reasoningSummary: string | null;
  recommendation: string | null;
  createdAt: string;
};

type AuditRecord = {
  id: string;
  actorType: string;
  actorId: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  riskLevel: string;
  outcome: string;
  occurredAt: string;
};

type CaptureEventRecord = {
  id: string;
  projectId: string | null;
  clientId: string | null;
  actorType: string;
  channel: string;
  eventType: string;
  sourceType: string;
  sourceId: string | null;
  title: string;
  summary: string | null;
  contentPolicy: string;
  status: string;
  occurredAt: string;
};

type MemoryRecord = {
  id: string;
  projectId: string | null;
  clientId: string | null;
  scopeType: string;
  scopeKey: string;
  memoryKey: string;
  memoryType: string;
  title: string;
  content: string;
  sourceCaptureIdsJson: string;
  confidenceBps: number;
  sensitivity: string;
  verificationStatus: string;
  status: string;
  version: number;
  lastReinforcedAt: string;
  updatedAt: string;
};

type AgentDefinitionRecord = {
  id: string;
  agentKey: string;
  displayName: string;
  role: string;
  purpose: string;
  capabilitiesJson: string;
  autonomyPolicy: string;
  status: string;
  policyVersion: string;
};

type AgentTaskRecord = {
  id: string;
  agentKey: string;
  parentTaskId: string | null;
  projectId: string | null;
  clientId: string | null;
  taskType: string;
  toolKey: string;
  title: string;
  instructionSummary: string;
  actionPayloadJson: string;
  contextMemoryIdsJson: string;
  riskLevel: string;
  autonomyLevel: string;
  approvalRequired: boolean;
  approvalId: string | null;
  status: string;
  priority: number;
  attempts: number;
  maxAttempts: number;
  resultSummary: string | null;
  errorSummary: string | null;
  createdAt: string;
  completedAt: string | null;
};

type AgentHandoffRecord = {
  id: string;
  taskId: string;
  fromAgentKey: string;
  toAgentKey: string;
  reason: string;
  contractVersion: string;
  status: string;
  occurredAt: string;
};

type SpecialistEvaluationRecord = {
  id: string;
  taskId: string;
  aiRunId: string;
  agentKey: string;
  domain: string;
  capabilityKey: string;
  projectId: string | null;
  clientId: string | null;
  status: string;
  provider: string;
  model: string;
  summary: string;
  factsJson: string;
  findingsJson: string;
  recommendationsJson: string;
  evidenceJson: string;
  limitationsJson: string;
  confidenceBps: number;
  createdAt: string;
};

type ConnectorDefinitionRecord = {
  id: string;
  connectorKey: string;
  displayName: string;
  category: string;
  description: string;
  capabilitiesJson: string;
  credentialState: string;
  status: string;
  healthStatus: string;
  lastCheckedAt: string | null;
  lastSuccessAt: string | null;
  lastErrorSummary: string | null;
  policyVersion: string;
};

type ConnectorAccountRecord = {
  id: string;
  connectorKey: string;
  provider: string;
  accountEmail: string | null;
  displayName: string | null;
  grantedScopesJson: string;
  tokenExpiresAt: string | null;
  status: string;
  lastValidatedAt: string | null;
  lastErrorSummary: string | null;
  connectedAt: string;
  revokedAt: string | null;
};

type ConnectorExecutionRecord = {
  id: string;
  connectorKey: string;
  taskId: string | null;
  actionType: string;
  externalReference: string | null;
  resultSummary: string | null;
  status: string;
  attempts: number;
  errorSummary: string | null;
  createdAt: string;
  completedAt: string | null;
};

type ToolDefinitionRecord = {
  id: string;
  toolKey: string;
  displayName: string;
  description: string;
  inputSchemaJson: string;
  outputSchemaJson: string;
  sideEffectClass: string;
  approvalClass: "AUTO" | "AUTO_WITH_LOG" | "ASK" | "OWNER_ONLY" | "DENIED";
  retryPolicyJson: string;
  auditBehaviorJson: string;
  allowedAgentsJson: string;
  connectorKey: string | null;
  enabled: boolean;
  status: string;
  policyVersion: string;
};

type AuthorityDecisionRecord = {
  id: string;
  toolKey: string;
  taskId: string | null;
  approvalId: string | null;
  actorType: string;
  actorId: string | null;
  authorityClass: string;
  decision: string;
  reason: string;
  correlationId: string;
  policyVersion: string;
  evaluatedAt: string;
  resolvedAt: string | null;
};

type ChiefManagerRunRecord = {
  id: string;
  aiRunId: string;
  projectId: string | null;
  clientId: string | null;
  objective: string;
  mode: string;
  status: string;
  provider: string;
  model: string;
  summary: string | null;
  nextAction: string | null;
  confidenceBps: number | null;
  correlationId: string;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
};

type ChiefManagerStepRecord = {
  id: string;
  managerRunId: string;
  sequence: number;
  agentKey: string;
  title: string;
  purpose: string;
  toolKey: string;
  taskId: string | null;
  approvalId: string | null;
  status: string;
  resultSummary: string | null;
  errorSummary: string | null;
  createdAt: string;
};

type AutomationPlaybookRecord = {
  id: string;
  playbookKey: string;
  displayName: string;
  description: string;
  triggerEventsJson: string;
  stepsJson: string;
  autonomyMode: string;
  enabled: boolean;
  status: string;
  version: number;
  policyVersion: string;
  lastTriggeredAt: string | null;
};

type AutomationPlaybookRunRecord = {
  id: string;
  playbookKey: string;
  sourceEventType: string;
  projectId: string | null;
  clientId: string | null;
  status: string;
  totalSteps: number;
  completedSteps: number;
  heldSteps: number;
  failedSteps: number;
  summary: string | null;
  startedAt: string;
  completedAt: string | null;
};

type AutomationPlaybookStepRecord = {
  id: string;
  runId: string;
  sequence: number;
  stepKey: string;
  title: string;
  agentKey: string;
  taskId: string | null;
  status: string;
  resultSummary: string | null;
  errorSummary: string | null;
  scheduledFor: string;
};

type NotificationRecord = {
  id: string;
  projectId: string | null;
  severity: string;
  category: string;
  title: string;
  body: string;
  actionUrl: string | null;
  status: string;
  createdAt: string;
};

type AutomationSnapshot = {
  status: string;
  mode: string;
  lastAutomationAt: string | null;
  jobs: Array<{
    id: string;
    jobType: string;
    entityType: string | null;
    status: string;
    attempts: number;
    runAfter: string;
    lastError: string | null;
    createdAt: string;
  }>;
  notifications: NotificationRecord[];
  schedules: Array<{
    id: string;
    scheduleKey: string;
    displayName: string;
    enabled: boolean;
    nextRunAt: string;
    lastRunAt: string | null;
    lastOutcome: string | null;
    lastError: string | null;
  }>;
  workerRuns: Array<{
    id: string;
    status: string;
    triggerType: string;
    schedulesProcessed: number;
    jobsProcessed: number;
    jobsSucceeded: number;
    jobsFailed: number;
    leasesRecovered: number;
    playbookStepsProcessed: number;
    startedAt: string;
    completedAt: string | null;
  }>;
  deadLetters: Array<{
    id: string;
    jobId: string;
    jobType: string;
    errorSummary: string;
    attempts: number;
    status: string;
    replayJobId: string | null;
    createdAt: string;
  }>;
};

type WorkspaceData = {
  workspace: {
    id: string;
    name: string;
    timezone: string;
    aiContentCapture: string;
    automationStatus: string;
    automationMode: string;
    lastAutomationAt: string | null;
  } | null;
  owner: {
    id: string;
    email: string;
    displayName: string;
    role: string;
    authProvider: string;
    emailVerifiedAt: string | null;
    mfaRequired: boolean;
    lastLoginAt: string | null;
    status: string;
  } | null;
  clients: ClientRecord[];
  projects: ProjectRecord[];
  projectCandidates: ProjectCandidateRecord[];
  appointments: AppointmentRecord[];
  approvals: ApprovalRecord[];
  messages: MessageRecord[];
  assets: AssetRecord[];
  knowledgeItems: KnowledgeRecord[];
  aiRuns: RunRecord[];
  auditEvents: AuditRecord[];
  notifications: NotificationRecord[];
  paymentRequests: PaymentRecord[];
  tattooSessions: TattooSessionRecord[];
  healingCheckins: HealingCheckinRecord[];
  contentCandidates: ContentCandidateRecord[];
  mediaConsent: MediaConsentRecord[];
  outcomes: OutcomeRecord[];
  projectJourneys: ProjectJourneyRecord[];
  captureEvents: CaptureEventRecord[];
  memoryRecords: MemoryRecord[];
  agentDefinitions: AgentDefinitionRecord[];
  agentTasks: AgentTaskRecord[];
  agentHandoffs: AgentHandoffRecord[];
  connectorDefinitions: ConnectorDefinitionRecord[];
  connectorAccounts: ConnectorAccountRecord[];
  connectorExecutions: ConnectorExecutionRecord[];
  toolDefinitions: ToolDefinitionRecord[];
  authorityDecisions: AuthorityDecisionRecord[];
  chiefManagerRuns: ChiefManagerRunRecord[];
  chiefManagerSteps: ChiefManagerStepRecord[];
  specialistEvaluations: SpecialistEvaluationRecord[];
  craftIntelligence: CraftIntelligenceData;
  schedulingIntelligence: SchedulingIntelligenceData;
  automationPlaybooks: AutomationPlaybookRecord[];
  automationPlaybookRuns: AutomationPlaybookRunRecord[];
  automationPlaybookSteps: AutomationPlaybookStepRecord[];
};

type PortalLifecycleData = {
  sessions: Array<Pick<TattooSessionRecord, "id" | "projectId" | "sessionNumber" | "status" | "startedAt" | "endedAt" | "clientVisibleSummary" | "durationMinutes">>;
  healingCheckins: HealingCheckinRecord[];
  mediaConsent: MediaConsentRecord | null;
};

type PortalData = {
  workspace: { name: string; timezone: string } | null;
  client: ClientRecord;
  projects: ProjectRecord[];
  appointments: AppointmentRecord[];
  approvals: ApprovalRecord[];
  messages: MessageRecord[];
  assets: AssetRecord[];
  candidates: ProjectCandidateRecord[];
  paymentRequests: PaymentRecord[];
  updates: Array<{
    id: string;
    projectId: string;
    title: string;
    body: string;
    createdAt: string;
  }>;
  access: {
    expiresAt: string | null;
    hint: string;
    method?: "invitation" | "account";
  };
};

type Briefing = {
  runId: string;
  summary: string;
  priorities: Array<{
    type: string;
    id: string;
    title: string;
    detail: string;
    reason?: string;
    evidence?: string;
  }>;
  confidence: number;
  generatedAt: string;
  memoryContext?: {
    policyVersion: string;
    included: number;
    available: number;
    omitted: number;
    highlights: Array<{
      id: string;
      title: string;
      scopeType: string;
      confidenceBps: number;
      verificationStatus: string;
    }>;
  };
};

type IntelligenceData = {
  policy: {
    meaningfulPattern: {
      minimumSupport: number;
      minimumProjects: number;
      minimumClients: number;
      minimumEffectBps: number;
      minimumConfidenceBps: number;
    };
    autoAction: { minimumConfidenceBps: number; scope: string };
  };
  patterns: Array<{
    id: string;
    name: string;
    description: string;
    whyItMatters: string;
    status: string;
    supportCount: number;
    distinctProjects: number;
    distinctClients: number;
    effectBps: number;
    confidenceBps: number;
    version: number;
  }>;
  recommendations: Array<{
    id: string;
    title: string;
    rationale: string;
    confidenceBps: number;
    autonomyLevel: string;
    approvalRequired: boolean;
    status: string;
  }>;
  outcomes: Array<{
    id: string;
    metricName: string;
    baselineValue: number | null;
    targetValue: number | null;
    resultValue: number | null;
    status: string;
  }>;
  learningCycles: Array<{
    id: string;
    status: string;
    summary: string | null;
    eligibleObservations: number;
    newEvidenceCount: number;
    knowledgeChanged: boolean;
    changeSetJson: string;
    completedAt?: string | null;
    createdAt: string;
  }>;
  consents: Array<{ id: string; status: string }>;
  socialConnections: Array<{ id: string; status: string; platform: string }>;
};

type SocialAccessData = {
  grants: Array<{
    id: string;
    consentType: string;
    scopesJson: string;
    purpose: string;
    status: string;
    grantedAt: string;
    revokedAt: string | null;
  }>;
  connections: Array<{
    id: string;
    platform: string;
    handle: string | null;
    accountType: string | null;
    status: string;
    lastSyncedAt: string | null;
  }>;
};

const navGroups: Array<{
  label: string;
  items: Array<{ id: OwnerView; label: string; icon: LucideIcon }>;
}> = [
  {
    label: "WORKSPACE",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "clients", label: "Clients", icon: UsersRound },
      { id: "projects", label: "Projects", icon: FolderKanban },
      { id: "calendar", label: "Calendar", icon: CalendarDays },
      { id: "inbox", label: "Inbox", icon: Inbox },
    ],
  },
  {
    label: "CREATE",
    items: [
      { id: "design", label: "Design Studio", icon: Brush },
      { id: "knowledge", label: "Knowledge", icon: BookOpen },
      { id: "content", label: "Content", icon: ImageIcon },
    ],
  },
  {
    label: "BUSINESS & AI",
    items: [
      { id: "finances", label: "Finances", icon: CircleDollarSign },
      { id: "analytics", label: "Analytics", icon: BarChart3 },
      { id: "chief", label: "AI Chief of Staff", icon: BrainCircuit },
      { id: "operations", label: "AI Operations", icon: Activity },
    ],
  },
  {
    label: "SETTINGS",
    items: [{ id: "settings", label: "Settings", icon: Settings }],
  },
];

const viewDetails: Record<
  OwnerView,
  { title: string; subtitle: string; eyebrow?: string }
> = {
  dashboard: {
    title: "Command Center",
    subtitle: "Your studio, clients, and creative work in one view.",
  },
  projects: {
    title: "Projects",
    subtitle: "Move every tattoo from inquiry to healed result.",
  },
  clients: {
    title: "Clients",
    subtitle: "Relationships, consent, communication, and portal access.",
  },
  calendar: {
    title: "Calendar",
    subtitle: "Consultations, sessions, approvals, and protected time.",
  },
  inbox: {
    title: "Inbox",
    subtitle: "One conversation history shared with the client portal.",
  },
  knowledge: {
    title: "Knowledge Library",
    subtitle: "A durable record of techniques, lessons, and creative decisions.",
  },
  design: {
    title: "Design Studio",
    subtitle: "References, versions, client review, and stencil readiness.",
  },
  content: {
    title: "Content Studio",
    subtitle: "Turn completed work into a searchable publishing workflow.",
  },
  finances: {
    title: "Finance Center",
    subtitle: "Deposits, invoices, and project financial visibility.",
  },
  analytics: {
    title: "Analytics",
    subtitle: "Creative intelligence built only from your real studio data.",
  },
  chief: {
    title: "AI Chief of Staff",
    subtitle: "Plans, prioritizes, and exposes the evidence behind every recommendation.",
  },
  operations: {
    title: "AI Operations",
    subtitle: "See exactly what ran, why it ran, and what it changed.",
  },
  settings: {
    title: "Settings",
    subtitle: "Workspace identity, privacy, portal, and automation controls.",
  },
};

const phases = ["consult", "design", "approval", "session", "healing", "complete"];

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function fullName(client?: ClientRecord | null) {
  if (!client) return "Unassigned client";
  return (
    client.preferredName ||
    client.displayName ||
    `${client.firstName} ${client.lastName}`.trim() ||
    "Client"
  );
}

function projectClient(project: ProjectRecord) {
  const name = [project.clientFirstName, project.clientLastName]
    .filter(Boolean)
    .join(" ");
  return name || "Unassigned client";
}

function formatDate(value?: string | null, includeTime = false) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    hour: includeTime ? "numeric" : undefined,
    minute: includeTime ? "2-digit" : undefined,
  }).format(date);
}

function formatMoney(cents?: number | null) {
  if (cents == null) return "Not set";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function projectTags(project: ProjectRecord) {
  try {
    const value = JSON.parse(project.styleTagsJson || "[]") as unknown;
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function canonicalKnowledgeTag(value: string) {
  const normalized = value.trim().toLowerCase().replace(/[\s_-]+/g, " ");
  const aliases: Record<string, string> = {
    "black and gray": "Black & Grey",
    "black & gray": "Black & Grey",
    "black and grey": "Black & Grey",
    "black grey": "Black & Grey",
    "black gray": "Black & Grey",
    "black and grey realism": "Black & Grey Realism",
    "black gray realism": "Black & Grey Realism",
    "black and gray realism": "Black & Grey Realism",
    fineline: "Fine Line",
    "fine line": "Fine Line",
    florals: "Floral",
    realistic: "Realism",
    religion: "Religious",
    spirituality: "Spiritual",
  };
  return aliases[normalized] || value.trim();
}

let activeApiAccessToken: string | null = null;

export function setLegacyApiAccessToken(token: string | null) {
  activeApiAccessToken = token;
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (activeApiAccessToken && !headers.has("authorization")) {
    headers.set("authorization", `Bearer ${activeApiAccessToken}`);
  }
  const response = await fetch(path, { ...init, headers });
  const data = (await response.json()) as T & {
    error?: string;
    message?: string;
  };
  if (!response.ok) {
    throw new Error(
      data.error || data.message || `Request failed (${response.status})`,
    );
  }
  return data;
}

type RealtimeConnectionStatus = "connecting" | "live" | "reconnecting" | "offline";

function useRealtimeFeed(
  scope: "owner" | "client",
  token: string | null,
  onChange: () => void,
  enabled = true,
) {
  const [status, setStatus] = useState<RealtimeConnectionStatus>(enabled ? "connecting" : "offline");
  useEffect(() => {
    if (!enabled) {
      return;
    }
    let active = true;
    let cursor = 0;
    let controller: AbortController | null = null;
    let refreshTimer = 0;
    const scheduleRefresh = () => {
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(onChange, 220);
    };
    async function connect() {
      while (active) {
        controller = new AbortController();
        try {
          const headers = new Headers();
          if (activeApiAccessToken) headers.set("authorization", `Bearer ${activeApiAccessToken}`);
          const tokenQuery = scope === "client" && token && token !== "__authenticated__" ? `&token=${encodeURIComponent(token)}` : "";
          const response = await fetch(`/api/realtime?scope=${scope}&after=${cursor}${tokenQuery}`, { headers, signal: controller.signal, cache: "no-store" });
          if (!response.ok || !response.body) throw new Error("Realtime channel unavailable");
          setStatus("live");
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          while (active) {
            const chunk = await reader.read();
            if (chunk.done) break;
            buffer += decoder.decode(chunk.value, { stream: true });
            const frames = buffer.split("\n\n");
            buffer = frames.pop() || "";
            for (const frame of frames) {
              const id = frame.match(/^id:\s*(\d+)/m)?.[1];
              if (id) cursor = Math.max(cursor, Number(id));
              if (frame.includes("event: change")) scheduleRefresh();
            }
          }
        } catch {
          if (active) setStatus(navigator.onLine ? "reconnecting" : "offline");
        }
        if (active) await new Promise((resolve) => window.setTimeout(resolve, 1_200));
      }
    }
    void connect();
    return () => {
      active = false;
      controller?.abort();
      window.clearTimeout(refreshTimer);
    };
  }, [enabled, onChange, scope, token]);
  return status;
}

async function fetchAssetBlob(asset: AssetRecord, portalToken?: string) {
  const headers = new Headers();
  if (activeApiAccessToken) {
    headers.set("authorization", `Bearer ${activeApiAccessToken}`);
  }
  const token =
    portalToken && portalToken !== "__authenticated__"
      ? `&token=${encodeURIComponent(portalToken)}`
      : "";
  const response = await fetch(
    `/api/files?id=${encodeURIComponent(asset.id)}${token}`,
    { headers },
  );
  if (!response.ok) {
    const result = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(result?.error || "Unable to open this file");
  }
  return response.blob();
}

async function downloadAsset(asset: AssetRecord, portalToken?: string) {
  const objectUrl = URL.createObjectURL(await fetchAssetBlob(asset, portalToken));
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = asset.originalName;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
}

function AssetPreview({ asset, portalToken, className }: { asset: AssetRecord; portalToken?: string; className?: string }) {
  const [src, setSrc] = useState("");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    let objectUrl = "";
    if (asset.mediaType !== "image" || !asset.mimeType.startsWith("image/")) return;
    void fetchAssetBlob(asset, portalToken)
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [asset, portalToken]);
  if (failed || asset.mediaType !== "image") return <div className={cn("asset-preview-fallback", className)}><FileText size={28} /><span>{asset.originalName}</span></div>;
  if (!src) return <div className={cn("asset-preview-loading", className)}><Spinner label="Loading image preview" /></div>;
  return <NextImage unoptimized width={1600} height={1600} className={cn("asset-preview-image", className)} src={src} alt={`${asset.originalName}, ${asset.assetRole?.replaceAll("_", " ") || "project image"}`} />;
}

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const field = document.createElement("textarea");
  field.value = value;
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.appendChild(field);
  field.select();
  document.execCommand("copy");
  field.remove();
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn("legacy-brand", compact && "compact")}>
      <span className="legacy-monogram" aria-hidden="true">
        <i>L</i>
        <b>L</b>
      </span>
      <span className="legacy-wordmark">
        <strong>LEGACY OS</strong>
        <small>THE AI OPERATING SYSTEM</small>
        {!compact && <em>FOR CREATIVE PROFESSIONALS</em>}
      </span>
    </div>
  );
}

function Spinner({ label = "Loading workspace" }: { label?: string }) {
  return (
    <div className="loading-state" role="status">
      <span className="loading-ring" />
      <p>{label}</p>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  body,
  action,
  onAction,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Icon size={25} strokeWidth={1.4} />
      </div>
      <h3>{title}</h3>
      <p>{body}</p>
      {action && onAction && (
        <button className="gold-button small" onClick={onAction}>
          <Plus size={15} /> {action}
        </button>
      )}
    </div>
  );
}

function Modal({
  title,
  eyebrow,
  onClose,
  children,
}: {
  title: string;
  eyebrow: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose]);

  return (
    <div className="modal-scrim" role="presentation" onMouseDown={onClose}>
      <section
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h2 id="modal-title">{title}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <X size={19} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  placeholder,
  children,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  children?: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children ?? (
        <input
          name={name}
          type={type}
          required={required}
          placeholder={placeholder}
        />
      )}
    </label>
  );
}

function OwnerSidebar({
  view,
  onView,
  owner,
  workspace,
  open,
  onClose,
  onPortal,
  onSignOut,
}: {
  view: OwnerView;
  onView: (view: OwnerView) => void;
  owner: WorkspaceData["owner"];
  workspace: WorkspaceData["workspace"];
  open: boolean;
  onClose: () => void;
  onPortal: () => void;
  onSignOut: () => void;
}) {
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <>
      <button
        className={cn("sidebar-backdrop", open && "show")}
        aria-label="Close menu"
        onClick={onClose}
      />
      <aside className={cn("owner-sidebar", open && "open")}>
        <button
          className="brand-button"
          onClick={() => {
            onView("dashboard");
            onClose();
          }}
        >
          <Brand />
        </button>
        <nav>
          {navGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <p>{group.label}</p>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    className={cn("nav-link", view === item.id && "active")}
                    onClick={() => {
                      onView(item.id);
                      onClose();
                    }}
                  >
                    <Icon size={17} strokeWidth={1.55} />
                    <span>{item.label}</span>
                    {item.id === "chief" && <i />}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="portal-launch" onClick={onPortal}>
            <UserRound size={17} />
            <span>
              <strong>Client portal</strong>
              <small>Open a secure client view</small>
            </span>
            <ArrowRight size={15} />
          </button>
          <button
            className="owner-profile"
            onClick={() => setProfileOpen((value) => !value)}
            aria-expanded={profileOpen}
          >
            <span>{(owner?.displayName || "O").slice(0, 1).toUpperCase()}</span>
            <div>
              <strong>{owner?.displayName || "Studio owner"}</strong>
              <small>{workspace?.name || "Legacy Studio"}</small>
            </div>
            <ChevronDown size={15} />
          </button>
          {profileOpen && (
            <div className="profile-menu">
              <button
                onClick={() => {
                  onView("settings");
                  setProfileOpen(false);
                  onClose();
                }}
              >
                <UserCog size={15} /> Account settings
              </button>
              <button onClick={onSignOut}>
                <LogOut size={15} /> Log out
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

function OwnerHeader({
  view,
  onMenu,
  onNew,
  onNavigate,
  data,
  refresh,
  realtimeStatus,
}: {
  view: OwnerView;
  onMenu: () => void;
  onNew: () => void;
  onNavigate: (target: NavigationTarget) => void;
  data: WorkspaceData;
  refresh: () => void;
  realtimeStatus: RealtimeConnectionStatus;
}) {
  const detail = viewDetails[view];
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [renderedAt] = useState(() => Date.now());
  const normalized = query.trim().toLowerCase();
  const clientLabel = (clientId?: string | null) =>
    fullName(data.clients.find((client) => client.id === clientId));
  const projectLabel = (projectId?: string | null) =>
    data.projects.find((project) => project.id === projectId)?.title || "Unlinked project";
  const searchCandidates: Array<{
    id: string;
    targetId?: string;
    label: string;
    detail: string;
    view: OwnerView;
    type: string;
    searchText: string;
  }> = [
    ...data.clients.map((client) => ({
      id: client.id,
      targetId: client.id,
      label: fullName(client),
      detail: `${client.email || "No email"} · ${client.status}${client.archivedAt ? " · archived" : ""}`,
      view: "clients" as OwnerView,
      type: "Client",
      searchText: `${client.phone || ""} ${client.instagramHandle || ""} ${client.tiktokHandle || ""} ${client.notes || ""} ${client.preferredChannel || ""}`,
    })),
    ...data.projects.map((project) => ({
      id: project.id,
      targetId: project.id,
      label: project.title,
      detail: `${projectClient(project)} · ${project.lifecyclePhase}${project.archivedAt ? " · archived" : project.isTest ? " · test" : ""}`,
      view: "projects" as OwnerView,
      type: "Project",
      searchText: `${project.summary || ""} ${project.clientSummary || ""} ${project.nextAction || ""} ${project.placement || ""} ${project.sizeDescription || ""} ${project.styleTagsJson}`,
    })),
    ...data.assets.map((asset) => ({
      id: asset.id,
      targetId: asset.projectId || undefined,
      label: asset.originalName,
      detail: `${projectLabel(asset.projectId)} · ${asset.sourceType.replaceAll("_", " ")} · ${formatBytes(asset.byteSize)}`,
      view: "design" as OwnerView,
      type: "File",
      searchText: `${asset.mediaType} ${asset.mimeType} ${asset.assetRole || ""} ${asset.rightsStatus || ""}`,
    })),
    ...data.appointments.map((appointment) => ({
      id: appointment.id,
      targetId: appointment.id,
      label: appointment.appointmentType,
      detail: `${clientLabel(appointment.clientId)} · ${projectLabel(appointment.projectId)} · ${formatDate(appointment.startsAt, true)}`,
      view: "calendar" as OwnerView,
      type: "Appointment",
      searchText: `${appointment.status} ${appointment.location || ""} ${appointment.notes || ""}`,
    })),
    ...data.messages.map((message) => ({
      id: message.id,
      targetId: message.clientId,
      label: `${clientLabel(message.clientId)} message`,
      detail: `${message.senderType} · ${message.body.slice(0, 110)}`,
      view: "inbox" as OwnerView,
      type: "Message",
      searchText: `${message.body} ${projectLabel(message.projectId)} ${message.status}`,
    })),
    ...data.approvals.map((approval) => ({
      id: approval.id,
      targetId: approval.projectId || undefined,
      label: approval.subject,
      detail: `${projectLabel(approval.projectId)} · ${approval.status} · ${approval.riskLevel} risk`,
      view: "design" as OwnerView,
      type: "Approval",
      searchText: `${approval.summary} ${approval.category} ${approval.decisionReason || ""}`,
    })),
    ...data.paymentRequests.map((payment) => ({
      id: payment.id,
      label: payment.title,
      detail: `${clientLabel(payment.clientId)} · ${projectLabel(payment.projectId)} · ${formatMoney(payment.amountCents)} · ${payment.status}`,
      view: "finances" as OwnerView,
      type: "Payment",
      searchText: `${payment.description || ""} ${payment.kind} ${payment.currency}`,
    })),
    ...data.tattooSessions.map((session) => ({
      id: session.id,
      label: `${projectLabel(session.projectId)} · Session ${session.sessionNumber}`,
      detail: `${clientLabel(session.clientId)} · ${session.status}`,
      view: "operations" as OwnerView,
      type: "Session",
      searchText: `${session.clientVisibleSummary || ""} ${session.techniqueNotes || ""} ${session.needleSetup || ""} ${session.inkSetup || ""}`,
    })),
    ...data.healingCheckins.map((checkin) => ({
      id: checkin.id,
      label: `${projectLabel(checkin.projectId)} · Day ${checkin.checkpointDay} healing`,
      detail: `${clientLabel(checkin.clientId)} · ${checkin.status}${checkin.concernFlag ? " · concern flagged" : ""}`,
      view: "operations" as OwnerView,
      type: "Healing",
      searchText: `${checkin.clientNotes || ""} ${checkin.studioNotes || ""} ${checkin.ownerResponse || ""}`,
    })),
    ...data.contentCandidates.map((candidate) => ({
      id: candidate.id,
      label: candidate.title,
      detail: `${projectLabel(candidate.projectId)} · ${candidate.format} · ${candidate.status.replaceAll("_", " ")}`,
      view: "content" as OwnerView,
      type: "Content",
      searchText: `${candidate.captionDraft || ""} ${candidate.rightsStatus} ${candidate.consentStatus}`,
    })),
    ...data.projectCandidates.map((candidate) => ({
      id: candidate.id,
      targetId: candidate.proposedProjectId || undefined,
      label: candidate.requestedTitle,
      detail: `${clientLabel(candidate.clientId)} · intake · ${candidate.status.replaceAll("_", " ")}`,
      view: "projects" as OwnerView,
      type: "Intake",
      searchText: `${candidate.concept} ${candidate.placement || ""} ${candidate.sizeDescription || ""} ${candidate.referencesSummary || ""} ${candidate.constraints || ""} ${candidate.styleTagsJson}`,
    })),
    ...data.knowledgeItems.map((item) => ({
      id: item.id,
      label: item.title,
      detail: `${item.itemType.replaceAll("_", " ")} · ${item.verificationStatus}${item.confidenceBps == null ? "" : ` · ${Math.round(item.confidenceBps / 100)}% confidence`}`,
      view: "knowledge" as OwnerView,
      type: "Knowledge",
      searchText: `${item.summary || ""} ${item.content} ${item.tagsJson} ${projectLabel(item.projectId)}`,
    })),
    ...data.memoryRecords.filter((memory) => memory.status === "active").map((memory) => ({
      id: memory.id,
      targetId: memory.projectId || memory.clientId || undefined,
      label: memory.title,
      detail: `${memory.scopeType} memory · ${memory.verificationStatus.replaceAll("_", " ")} · ${Math.round(memory.confidenceBps / 100)}% confidence`,
      view: "knowledge" as OwnerView,
      type: "Memory",
      searchText: `${memory.content} ${memory.memoryType} ${projectLabel(memory.projectId)}`,
    })),
  ];
  const results = normalized.length < 2
    ? []
    : searchCandidates
      .map((item) => {
        const label = item.label.toLowerCase();
        const type = item.type.toLowerCase();
        const haystack = `${item.label} ${item.detail} ${item.type} ${item.searchText}`.toLowerCase();
        const score = label === normalized ? 100 : label.startsWith(normalized) ? 80 : type === normalized ? 70 : label.includes(normalized) ? 60 : haystack.includes(normalized) ? 30 : 0;
        return { ...item, score };
      })
      .filter((item) => item.score > 0)
      .sort((left, right) => right.score - left.score || left.label.localeCompare(right.label));
  const persistedNotifications = data.notifications.map((item) => {
    const [destination, targetId] = item.actionUrl?.split(":") || [];
    const destinationMap: Record<string, OwnerView> = {
      approvals: "design",
      calendar: "calendar",
      clients: "clients",
      projects: "projects",
      inbox: "inbox",
    };
    return {
      id: item.id,
      title: item.title,
      detail: item.body,
      view: destinationMap[destination || ""] || ("chief" as OwnerView),
      targetId: targetId || item.projectId || item.id,
      persistent: true,
    };
  });
  const notificationCandidates = [
    ...persistedNotifications,
    ...data.approvals
      .filter((item) => item.status === "pending")
      .map((item) => ({
        id: item.id,
        title: item.subject,
        detail: "Approval is waiting",
        view: "design" as OwnerView,
        targetId: item.projectId || undefined,
        persistent: false,
      })),
    ...data.messages
      .filter(
        (item) => item.senderType === "client" && !item.readAt,
      )
      .map((item) => ({
        id: item.id,
        title: "New client message",
        detail: item.body,
        view: "inbox" as OwnerView,
        targetId: item.clientId,
        persistent: false,
      })),
    ...data.appointments
      .filter(
        (item) =>
          !["completed", "cancelled"].includes(item.status) &&
          new Date(item.startsAt).getTime() >= renderedAt,
      )
      .slice(0, 4)
      .map((item) => ({
        id: item.id,
        title: item.appointmentType,
        detail: formatDate(item.startsAt, true),
        view: "calendar" as OwnerView,
        targetId: item.id,
        persistent: false,
      })),
  ];
  const notifications = notificationCandidates.filter(
    (item, index, all) =>
      index ===
      all.findIndex(
        (candidate) =>
          candidate.view === item.view &&
          candidate.targetId === item.targetId &&
          (candidate.persistent || !item.persistent),
      ),
  );

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === "Escape") {
        setSearchOpen(false);
        setNotificationsOpen(false);
      }
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);
  return (
    <>
      <header className="owner-header">
      <button className="mobile-menu" onClick={onMenu} aria-label="Open menu">
        <Menu size={20} />
      </button>
      <div>
        <h1>{detail.title}</h1>
        <p>{detail.subtitle}</p>
      </div>
      <div className="header-tools">
        <span className={cn("realtime-status", realtimeStatus)} title="Secure backend event channel"><i />{realtimeStatus}</span>
        <button
          className="search-control"
          onClick={() => setSearchOpen(true)}
        >
          <Search size={16} />
          <span>Search anything...</span>
          <kbd>⌘ K</kbd>
        </button>
        <div className="notification-anchor">
          <button
            className="icon-button"
            aria-label="Notifications"
            aria-expanded={notificationsOpen}
            onClick={() => setNotificationsOpen((value) => !value)}
          >
            <Bell size={18} />
            {notifications.length > 0 && (
              <i className="notification-count">
                {Math.min(notifications.length, 9)}
              </i>
            )}
          </button>
          {notificationsOpen && (
            <section className="notification-menu">
              <header>
                <div>
                  <p>NOTIFICATIONS</p>
                  <strong>{notifications.length} items need attention</strong>
                </div>
                <button
                  className="icon-button"
                  aria-label="Close notifications"
                  onClick={() => setNotificationsOpen(false)}
                >
                  <X size={15} />
                </button>
              </header>
              {notifications.length ? (
                notifications.slice(0, 8).map((item) => (
                  <button
                    key={`${item.view}-${item.id}`}
                    onClick={() => {
                      if (item.persistent) {
                        void api("/api/automations", {
                          method: "POST",
                          headers: { "content-type": "application/json" },
                          body: JSON.stringify({
                            action: "mark_notification",
                            notificationId: item.id,
                            notificationStatus: "read",
                          }),
                        }).then(refresh);
                      }
                      onNavigate({ view: item.view, id: item.targetId });
                      setNotificationsOpen(false);
                    }}
                  >
                    <span />
                    <div>
                      <strong>{item.title}</strong>
                      <small>{item.detail}</small>
                    </div>
                    <ArrowRight size={14} />
                  </button>
                ))
              ) : (
                <div className="notification-empty">
                  <CheckCircle2 size={22} />
                  <strong>You are caught up.</strong>
                  <small>
                    New approvals, messages, and appointments appear here.
                  </small>
                </div>
              )}
            </section>
          )}
        </div>
        <button className="gold-button" onClick={onNew}>
          <Plus size={17} /> New
        </button>
      </div>
      </header>
      {searchOpen && (
        <Modal
          eyebrow="GLOBAL SEARCH"
          title="Find anything in Legacy OS"
          onClose={() => {
            setSearchOpen(false);
            setQuery("");
          }}
        >
          <div className="global-search">
            <label>
              <Search size={17} />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search clients, projects, messages, appointments, knowledge..."
              />
            </label>
            <div className="search-results">
              {normalized.length < 2 ? (
                <EmptyState
                  icon={Search}
                  title="Search the complete workspace"
                  body="Enter at least two characters to search clients, projects, messages, appointments, files, payments, sessions, healing, content, intake, and knowledge."
                />
              ) : results.length ? (
                results.slice(0, 20).map((item) => (
                  <button
                    key={`${item.type}-${item.id}`}
                    onClick={() => {
                      onNavigate({ view: item.view, id: "targetId" in item ? item.targetId : undefined });
                      setSearchOpen(false);
                      setQuery("");
                    }}
                  >
                    <span>{item.type}</span>
                    <div>
                      <strong>{item.label}</strong>
                      <small>{item.detail}</small>
                    </div>
                    <ArrowRight size={14} />
                  </button>
                ))
              ) : (
                <EmptyState
                  icon={Search}
                  title="No matching records"
                  body="Try a name, title, message phrase, appointment type, payment, or knowledge term."
                />
              )}
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

function SetupPanel({
  onClient,
  onProject,
}: {
  onClient: () => void;
  onProject: () => void;
}) {
  return (
    <section className="setup-panel">
      <div className="setup-orbit">
        <span />
        <Brand compact />
      </div>
      <div className="setup-copy">
        <p className="eyebrow gold">YOUR WORKSPACE IS CLEAN</p>
        <h2>Build your studio system from real work.</h2>
        <p>
          Example records have been removed. Add a client, create their first
          project, then share a secure portal. Every action becomes part of the
          live audit trail.
        </p>
      </div>
      <div className="setup-actions">
        <button className="gold-button" onClick={onClient}>
          <UsersRound size={16} /> Add first client
        </button>
        <button className="outline-button" onClick={onProject}>
          <FolderKanban size={16} /> Create project
        </button>
      </div>
    </section>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <article className="stat-card">
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
      <span>
        <Icon size={19} strokeWidth={1.5} />
      </span>
    </article>
  );
}

function Dashboard({
  data,
  firstName,
  briefing,
  generating,
  onGenerate,
  onClient,
  onProject,
  onAppointment,
  onView,
}: {
  data: WorkspaceData;
  firstName: string;
  briefing: Briefing | null;
  generating: boolean;
  onGenerate: () => void;
  onClient: () => void;
  onProject: () => void;
  onAppointment: () => void;
  onView: (view: OwnerView) => void;
}) {
  const upcoming = data.appointments
    .filter((item) => !["completed", "cancelled"].includes(item.status) && (!item.projectId || data.projects.some((project) => project.id === item.projectId && !project.isTest && !project.archivedAt)))
    .slice(0, 5);
  const activeProjects = data.projects.filter(
    (item) => item.status === "active" && !item.isTest && !item.archivedAt,
  );
  const pending = data.approvals.filter((item) => item.status === "pending" && (!item.projectId || activeProjects.some((project) => project.id === item.projectId)));
  const unread = data.messages.filter(
    (item) => item.senderType === "client" && !item.readAt && data.clients.some((client) => client.id === item.clientId && !client.archivedAt),
  );

  return (
    <div className="dashboard-view">
      <section className="welcome-line">
        <div>
          <span className="sun-mark">
            <Sparkles size={23} />
          </span>
          <div>
            <h2>Good {new Date().getHours() < 12 ? "morning" : "evening"}, {firstName}.</h2>
            <p>Your operating picture is live and based only on saved records.</p>
          </div>
        </div>
        <span className="system-online">
          <i /> CORE SYSTEMS OPERATIONAL
        </span>
      </section>

      {data.clients.length === 0 && data.projects.length === 0 && (
        <SetupPanel onClient={onClient} onProject={onProject} />
      )}

      <section className="stats-grid">
        <StatCard
          icon={FolderKanban}
          label="ACTIVE PROJECTS"
          value={activeProjects.length}
          detail="Across the tattoo lifecycle"
        />
        <StatCard
          icon={CalendarDays}
          label="UPCOMING APPOINTMENTS"
          value={upcoming.length}
          detail="From the current schedule"
        />
        <StatCard
          icon={ShieldCheck}
          label="APPROVALS WAITING"
          value={pending.length}
          detail="Human judgment remains final"
        />
        <StatCard
          icon={MessageSquareText}
          label="CLIENT MESSAGES"
          value={unread.length}
          detail="Awaiting an owner response"
        />
      </section>

      <div className="command-grid">
        <section className="os-panel priority-panel">
          <PanelTitle
            eyebrow="TODAY'S PRIORITIES"
            title="What needs attention"
            action="Open Chief of Staff"
            onAction={() => onView("chief")}
          />
          {briefing?.priorities.length ? (
            <div className="priority-list">
              {briefing.priorities.map((item, index) => (
                <article key={`${item.type}-${item.id}`}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <p>{item.title}</p>
                    <small>{item.detail}</small>
                  </div>
                  <ArrowRight size={15} />
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={CheckCircle2}
              title="Nothing is competing for attention"
              body={
                briefing?.summary ||
                "Run the briefing to prioritize your live appointments, approvals, and projects."
              }
              action={generating ? "Preparing..." : "Prepare briefing"}
              onAction={onGenerate}
            />
          )}
        </section>

        <section className="os-panel schedule-panel">
          <PanelTitle
            eyebrow="TODAY'S SCHEDULE"
            title="Upcoming commitments"
            action="Schedule"
            onAction={onAppointment}
          />
          {upcoming.length ? (
            <div className="schedule-list">
              {upcoming.map((appointment) => {
                const client = data.clients.find(
                  (item) => item.id === appointment.clientId,
                );
                return (
                  <article key={appointment.id}>
                    <time>{formatDate(appointment.startsAt, true)}</time>
                    <span />
                    <div>
                      <p>{appointment.appointmentType}</p>
                      <small>
                        {fullName(client)}
                        {appointment.location ? ` · ${appointment.location}` : ""}
                      </small>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={CalendarDays}
              title="The calendar is open"
              body="Schedule a consultation, tattoo session, or follow-up."
              action="Add appointment"
              onAction={onAppointment}
            />
          )}
        </section>

        <section className="os-panel live-projects-panel">
          <PanelTitle
            eyebrow="ACTIVE PROJECTS"
            title="Work in motion"
            action="View all"
            onAction={() => onView("projects")}
          />
          {activeProjects.length ? (
            <div className="project-rows">
              {activeProjects.slice(0, 5).map((project) => {
                const phaseIndex = Math.max(0, phases.indexOf(project.lifecyclePhase));
                return (
                  <article key={project.id}>
                    <div className="project-avatar">
                      {project.title.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="project-main">
                      <p>{project.title}</p>
                      <small>{projectClient(project)}</small>
                    </div>
                    <span className="phase-pill">{project.lifecyclePhase}</span>
                    <div className="project-progress">
                      <span style={{ width: `${((phaseIndex + 1) / phases.length) * 100}%` }} />
                    </div>
                    <strong>{project.nextAction || "Choose next action"}</strong>
                    <ArrowRight size={15} />
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={FolderKanban}
              title="No active projects yet"
              body="Create a project after adding your first client."
              action="Create project"
              onAction={onProject}
            />
          )}
        </section>

        <aside className="chief-rail-card">
          <header>
            <div className="brain-orb">
              <BrainCircuit size={29} />
            </div>
            <div>
              <p>AI CHIEF OF STAFF</p>
              <small><i /> Online</small>
            </div>
          </header>
          <div className="chief-copy">
            <p>{briefing?.summary || "I am ready to organize your real workspace."}</p>
            <small>
              {briefing
                ? `${briefing.confidence}% confidence · ${formatDate(briefing.generatedAt, true)}`
                : "No briefing has been generated yet."}
            </small>
          </div>
          <ul>
            <li><Check size={14} /> Uses current workspace records</li>
            <li><Check size={14} /> Writes every run to the ledger</li>
            <li><Check size={14} /> Never acts past approval boundaries</li>
          </ul>
          <button className="gold-button daily-brief-button" onClick={onGenerate} disabled={generating}>
            <WandSparkles size={16} />
            {generating ? "Preparing briefing..." : "Prepare daily brief"}
          </button>
          <button className="text-button" onClick={() => onView("operations")}>
            Show what the system did <ArrowRight size={14} />
          </button>
        </aside>
      </div>
    </div>
  );
}

function PanelTitle({
  eyebrow,
  title,
  action,
  onAction,
}: {
  eyebrow: string;
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <header className="panel-title">
      <div>
        <p>{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      {action && onAction && (
        <button onClick={onAction}>
          {action} <ArrowRight size={13} />
        </button>
      )}
    </header>
  );
}

function ProjectsView({
  data,
  onCreate,
  refresh,
  notify,
  targetId,
  onNavigate,
}: {
  data: WorkspaceData;
  onCreate: () => void;
  refresh: () => Promise<void>;
  notify: (message: string, error?: boolean) => void;
  targetId?: string;
  onNavigate: (target: NavigationTarget) => void;
}) {
  const [filter, setFilter] = useState<"all" | "active" | "complete" | "test" | "archived">(targetId ? "all" : "active");
  const [selected, setSelected] = useState<string | null>(
    targetId ?? data.projects[0]?.id ?? null,
  );
  const [candidateResponses, setCandidateResponses] = useState<Record<string, string>>({});
  const [reviewingCandidate, setReviewingCandidate] = useState<string | null>(null);
  const [clarifyingCandidate, setClarifyingCandidate] = useState<string | null>(null);
  const [advancing, setAdvancing] = useState(false);
  const [savingCleanup, setSavingCleanup] = useState(false);
  const reviewCandidates = data.projectCandidates.filter((candidate) =>
    ["pending_review", "needs_details"].includes(candidate.status),
  );
  const filteredProjects = data.projects.filter((item) => {
    if (filter === "active") return item.status === "active" && !item.isTest && !item.archivedAt;
    if (filter === "complete") return item.lifecyclePhase === "complete" && !item.isTest && !item.archivedAt;
    if (filter === "test") return Boolean(item.isTest) && !item.archivedAt;
    if (filter === "archived") return Boolean(item.archivedAt);
    return !item.archivedAt;
  });
  const project =
    filteredProjects.find((item) => item.id === selected) ??
    filteredProjects[0];
  const journey = data.projectJourneys.find((item) => item.projectId === project?.id);

  async function advanceProject() {
    if (!project) return;
    const index = phases.indexOf(project.lifecyclePhase);
    const nextPhase = phases[Math.min(phases.length - 1, index + 1)];
    setAdvancing(true);
    try {
      await api("/api/projects", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: project.id,
          lifecyclePhase: nextPhase,
          nextAction:
            nextPhase === "complete"
              ? null
              : `Complete ${nextPhase} phase`,
        }),
      });
      notify(
        nextPhase === "complete"
          ? "Project completed. Legacy OS captured the outcome and ran a learning cycle."
          : `Project advanced to ${nextPhase}.`,
      );
      await refresh();
    } catch (advanceError) {
      notify(
        advanceError instanceof Error
          ? advanceError.message
          : "Unable to advance project",
        true,
      );
    } finally {
      setAdvancing(false);
    }
  }

  async function cleanupProject(action: "archive" | "restore" | "mark_test" | "mark_real") {
    if (!project) return;
    if (action === "archive" && !window.confirm(`Archive ${project.title}? Nothing will be deleted.`)) return;
    setSavingCleanup(true);
    try {
      await api("/api/projects", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: project.id, action, reason: "Owner cleanup from project workspace" }) });
      notify(action === "archive" ? "Project archived and removed from operational intelligence." : action === "mark_test" ? "Project marked as test data and removed from operational intelligence." : "Project restored to operational records.");
      refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to update project", true);
    } finally { setSavingCleanup(false); }
  }

  async function reviewCandidate(
    candidate: ProjectCandidateRecord,
    action: "approve" | "needs_details" | "reject",
  ) {
    const response = candidateResponses[candidate.id]?.trim();
    if (action === "needs_details" && !response) {
      setClarifyingCandidate(candidate.id);
      window.setTimeout(() => document.getElementById(`candidate-question-${candidate.id}`)?.focus(), 0);
      return;
    }
    setReviewingCandidate(candidate.id);
    try {
      await api("/api/project-candidates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: candidate.id, action, response }),
      });
      notify(
        action === "approve"
          ? "Project request approved and converted without re-entering the intake."
          : action === "needs_details"
            ? "The question was sent through the client conversation."
            : "Project request declined and the client was notified.",
      );
      refresh();
    } catch (reviewError) {
      notify(
        reviewError instanceof Error
          ? reviewError.message
          : "Unable to review project request",
        true,
      );
    } finally {
      setReviewingCandidate(null);
    }
  }
  return (
    <section className="page-stack">
      <div className="section-toolbar">
        <div className="filter-tabs">
          <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>All current <span>{data.projects.filter((item) => !item.archivedAt).length}</span></button>
          <button className={filter === "active" ? "active" : ""} onClick={() => setFilter("active")}>Active <span>{data.projects.filter((item) => item.status === "active" && !item.isTest && !item.archivedAt).length}</span></button>
          <button className={filter === "complete" ? "active" : ""} onClick={() => setFilter("complete")}>Complete <span>{data.projects.filter((item) => item.lifecyclePhase === "complete" && !item.isTest && !item.archivedAt).length}</span></button>
          <button className={filter === "test" ? "active" : ""} onClick={() => setFilter("test")}>Test <span>{data.projects.filter((item) => item.isTest && !item.archivedAt).length}</span></button>
          <button className={filter === "archived" ? "active" : ""} onClick={() => setFilter("archived")}>Archived <span>{data.projects.filter((item) => item.archivedAt).length}</span></button>
        </div>
        <button className="gold-button" onClick={onCreate}>
          <Plus size={16} /> New project
        </button>
      </div>
      {reviewCandidates.length > 0 && (
        <section className="os-panel candidate-queue">
          <PanelTitle
            eyebrow="AI-STRUCTURED INTAKE"
            title={`${reviewCandidates.length} project request${reviewCandidates.length === 1 ? "" : "s"} waiting`}
          />
          <div className="client-grid">
            {reviewCandidates.map((candidate) => {
              const client = data.clients.find((item) => item.id === candidate.clientId);
              return (
                <article className="client-card" key={candidate.id}>
                  <div className="candidate-heading">
                    <div>
                      <span className="status-badge">{candidate.status.replaceAll("_", " ")}</span>
                      <h3>{candidate.requestedTitle}</h3>
                      <small>{fullName(client)} · {Math.round(candidate.confidenceBps / 100)}% intake confidence</small>
                    </div>
                  </div>
                  <p>{candidate.concept}</p>
                  <div className="tag-row">
                    {candidate.placement && <span>{candidate.placement}</span>}
                    {candidate.sizeDescription && <span>{candidate.sizeDescription}</span>}
                    {JSON.parse(candidate.styleTagsJson || "[]").map((tag: string) => <span key={tag}>{tag}</span>)}
                  </div>
                  {(clarifyingCandidate === candidate.id || candidateResponses[candidate.id]) && <div className="candidate-clarification"><label htmlFor={`candidate-question-${candidate.id}`}>Question for {fullName(client)}</label><textarea
                    id={`candidate-question-${candidate.id}`}
                    value={candidateResponses[candidate.id] || ""}
                    onChange={(event) => setCandidateResponses((current) => ({ ...current, [candidate.id]: event.target.value }))}
                    placeholder="Ask for the exact missing placement, size, budget, reference, or timing detail…"
                  /><small>This will be sent through the client&apos;s secure conversation.</small></div>}
                  {candidate.confidenceBps < 6500 && <p className="candidate-confidence-note"><AlertCircle size={14} /> Low-confidence intake: ask for clarification before approval.</p>}
                  <div className="candidate-actions">
                    <button className="gold-button" disabled={reviewingCandidate === candidate.id} onClick={() => void reviewCandidate(candidate, "approve")}><Check size={15} /> Approve project</button>
                    <button className="outline-button" disabled={reviewingCandidate === candidate.id} onClick={() => void reviewCandidate(candidate, "needs_details")}><MessageSquareText size={15} /> {clarifyingCandidate === candidate.id ? "Send request" : "Request details"}</button>
                    <button className="text-button" disabled={reviewingCandidate === candidate.id} onClick={() => void reviewCandidate(candidate, "reject")}>Decline</button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}
      {data.projects.length === 0 ? (
        <section className="os-panel tall-empty">
          <EmptyState
            icon={FolderKanban}
            title="Your project workspace is ready"
            body="Projects connect client details, design versions, appointments, approvals, files, and healing outcomes."
            action="Create the first project"
            onAction={onCreate}
          />
        </section>
      ) : filteredProjects.length === 0 ? (
        <section className="os-panel tall-empty">
          <EmptyState
            icon={Search}
            title={`No ${filter} projects`}
            body="This filter has no matching projects. Choose another filter or create a new project."
            action="Show all projects"
            onAction={() => setFilter("all")}
          />
        </section>
      ) : (
        <div className="split-workspace">
          <div className="record-list">
            {filteredProjects.map((item) => (
              <button
                className={cn("record-card", selected === item.id && "active")}
                key={item.id}
                onClick={() => setSelected(item.id)}
              >
                <span className="record-icon"><FolderKanban size={19} /></span>
                <div>
                  <strong>{item.title}</strong>
                  <small>{projectClient(item)}</small>
                </div>
                <span className="phase-pill">{item.lifecyclePhase}</span>
              </button>
            ))}
          </div>
          {project && (
            <section className="record-detail os-panel">
              <div className="record-hero">
                <div>
                  <p className="eyebrow gold">PROJECT WORKSPACE</p>
                  <h2>{project.title}</h2>
                  <p>{projectClient(project)} · {project.placement || "Placement not set"}</p>
                </div>
                <span className="status-badge">{project.status}</span>
              </div>
              <Lifecycle phase={project.lifecyclePhase} />
              <div className="detail-grid">
                <DetailBox label="Next action" value={project.nextAction || "Not set"} />
                <DetailBox label="Target date" value={formatDate(project.targetDate)} />
                <DetailBox
                  label="Budget"
                  value={`${formatMoney(project.budgetMinCents)} – ${formatMoney(project.budgetMaxCents)}`}
                />
                <DetailBox label="Updated" value={formatDate(project.updatedAt, true)} />
              </div>
              <article className="project-brief">
                <p className="eyebrow">PROJECT BRIEF</p>
                <p>{project.summary || "No project brief has been added yet."}</p>
              </article>
              {journey && (
                <section className="project-journey" aria-label="Complete tattoo project journey">
                  <header>
                    <div>
                      <p className="eyebrow gold">END-TO-END JOURNEY</p>
                      <h3>{journey.progressPercent}% operationally complete</h3>
                    </div>
                    <strong>{journey.nextAction}</strong>
                  </header>
                  <div className="journey-progress" aria-hidden="true">
                    <span style={{ width: `${journey.progressPercent}%` }} />
                  </div>
                  <div className="journey-milestones">
                    {journey.milestones.map((milestone) => (
                      <article className={milestone.status} key={milestone.id}>
                        <span>{milestone.status === "complete" ? <Check size={13} /> : milestone.status === "current" ? <ArrowRight size={13} /> : <Clock3 size={13} />}</span>
                        <div>
                          <strong>{milestone.label}</strong>
                          <small>{milestone.detail}</small>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              )}
              <div className="project-detail-actions">
                <div className="project-action-guidance"><span>
                  {project.lifecyclePhase === "complete"
                    ? "Learning captured from this completed project."
                    : journey?.canAdvance
                      ? "Every prerequisite is connected. Advancing records a workflow observation automatically."
                      : journey?.advanceBlockers[0] || "Complete the highlighted journey requirement before advancing."}
                </span>{journey && !journey.canAdvance && journey.advanceBlockers.some((blocker) => /upload|reference|design|stencil/i.test(blocker)) && <button className="text-button" onClick={() => onNavigate({ view: "design", id: project.id, clientId: project.clientId || undefined })}>Resolve in Design Studio <ArrowRight size={13} /></button>}</div>
                {project.lifecyclePhase !== "complete" && (
                  <button className="gold-button" onClick={advanceProject} disabled={advancing || (journey ? !journey.canAdvance : false)}>
                    {advancing ? "Advancing…" : <>Advance to{" "}
                    {phases[
                      Math.min(
                        phases.length - 1,
                        phases.indexOf(project.lifecyclePhase) + 1,
                      )
                    ]}<ArrowRight size={15} /></>}
                  </button>
                )}
              </div>
              <div className="record-cleanup-bar"><span><ShieldCheck size={15} /> Test and archived records never contribute to analytics, briefings, or learning.</span><div>{project.archivedAt ? <button className="outline-button" disabled={savingCleanup} onClick={() => void cleanupProject("restore")}>Restore project</button> : <button className="text-button danger-text" disabled={savingCleanup} onClick={() => void cleanupProject("archive")}>Archive project</button>}<button className="text-button" disabled={savingCleanup || Boolean(project.archivedAt)} onClick={() => void cleanupProject(project.isTest ? "mark_real" : "mark_test")}>{project.isTest ? "Mark as real work" : "Mark as test data"}</button></div></div>
            </section>
          )}
        </div>
      )}
    </section>
  );
}

function Lifecycle({ phase }: { phase: string }) {
  const active = Math.max(0, phases.indexOf(phase));
  return (
    <div className="lifecycle">
      {phases.map((item, index) => (
        <div className={cn(index < active && "done", index === active && "active")} key={item}>
          <span>{index < active ? <Check size={13} /> : index + 1}</span>
          <small>{item}</small>
        </div>
      ))}
    </div>
  );
}

function DetailBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-box">
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}

function ClientsView({
  data,
  onCreate,
  onInvite,
  refresh,
  notify,
  onNavigate,
  targetId,
}: {
  data: WorkspaceData;
  onCreate: () => void;
  onInvite: (client: ClientRecord) => void;
  refresh: () => Promise<void>;
  notify: (message: string, error?: boolean) => void;
  onNavigate: (target: NavigationTarget) => void;
  targetId?: string;
}) {
  const [filter, setFilter] = useState<"all" | "active" | "archived">(targetId ? "all" : "active");
  const [selectedId, setSelectedId] = useState<string | null>(
    targetId ?? data.clients[0]?.id ?? null,
  );
  const [workspaceTab, setWorkspaceTab] = useState<"overview" | "projects" | "timeline" | "financials" | "privacy">("overview");
  const [saving, setSaving] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<AssetRecord | null>(null);
  const [viewOpenedAt] = useState(() => Date.now());
  const visibleClients = data.clients.filter((client) => {
    if (filter === "all") return true;
    if (filter === "archived") return client.status === "archived";
    return client.status !== "archived";
  });
  const selectedClient = data.clients.find((client) => client.id === selectedId);

  const clientProjects = data.projects.filter((project) => project.clientId === selectedClient?.id);
  const projectIds = new Set(clientProjects.map((project) => project.id));
  const clientMessages = data.messages.filter((message) => message.clientId === selectedClient?.id);
  const clientAppointments = data.appointments.filter((appointment) => appointment.clientId === selectedClient?.id);
  const clientAssets = data.assets.filter(
    (asset) =>
      asset.clientId === selectedClient?.id ||
      Boolean(asset.projectId && projectIds.has(asset.projectId)),
  );
  const clientImageAssets = clientAssets
    .filter((asset) => asset.mediaType === "image" && asset.mimeType.startsWith("image/"))
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  const clientApprovals = data.approvals.filter((approval) => approval.projectId && projectIds.has(approval.projectId));
  const clientPayments = data.paymentRequests.filter((payment) => payment.clientId === selectedClient?.id);
  const clientSessions = data.tattooSessions.filter((session) => session.clientId === selectedClient?.id);
  const clientHealing = data.healingCheckins.filter((checkin) => checkin.clientId === selectedClient?.id);
  const clientConsent = data.mediaConsent.find((consent) => consent.clientId === selectedClient?.id && consent.status === "granted");
  const totalPaid = clientPayments.reduce((sum, payment) => sum + payment.amountPaidCents - payment.amountRefundedCents, 0);
  const totalOutstanding = clientPayments.filter((payment) => ["approved", "open"].includes(payment.status)).reduce((sum, payment) => sum + Math.max(0, payment.amountCents - payment.amountPaidCents), 0);
  const timeline = [
    ...clientMessages.map((item) => ({ id: item.id, at: item.createdAt, type: "Message", title: item.senderType === "client" ? "Client sent a message" : "Studio sent a message", detail: item.body })),
    ...clientAppointments.map((item) => ({ id: item.id, at: item.startsAt, type: "Appointment", title: item.appointmentType, detail: item.location || item.status })),
    ...clientAssets.map((item) => ({ id: item.id, at: item.createdAt, type: "File", title: item.originalName, detail: item.assetRole?.replaceAll("_", " ") || item.mediaType })),
    ...clientApprovals.map((item) => ({ id: item.id, at: item.createdAt, type: "Approval", title: item.subject, detail: item.status })),
    ...clientSessions.map((item) => ({ id: item.id, at: item.createdAt, type: "Session", title: `Tattoo session ${item.sessionNumber}`, detail: item.status })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  function openClientWorkspace(clientId: string) {
    setSelectedId(clientId);
    setWorkspaceTab("overview");
    window.setTimeout(() => {
      document.getElementById("selected-client-workspace")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  }

  async function clientAction(action: "archive" | "restore") {
    if (!selectedClient) return;
    if (action === "archive" && !window.confirm(`Archive ${fullName(selectedClient)}? Their history remains available and nothing is deleted.`)) return;
    setSaving(true);
    try {
      await api("/api/clients", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: selectedClient.id, action, reason: "Owner cleanup from client workspace" }) });
      notify(action === "archive" ? "Client archived without deleting history." : "Client restored to active records.");
      await refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to update client", true);
    } finally { setSaving(false); }
  }

  async function projectCleanup(project: ProjectRecord, action: "archive" | "restore" | "mark_test" | "mark_real", duplicateOfProjectId?: string) {
    if (action === "archive" && !window.confirm(`Archive ${project.title}? Related history remains preserved.`)) return;
    setSaving(true);
    try {
      await api("/api/projects", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: project.id, action, duplicateOfProjectId, reason: duplicateOfProjectId ? "Duplicate project cleanup" : "Owner cleanup from client workspace" }) });
      notify(action === "archive" ? "Project archived and excluded from operational intelligence." : action === "mark_test" ? "Project marked as test data and excluded from learning." : "Project record updated.");
      await refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to update project", true);
    } finally { setSaving(false); }
  }

  return (
    <section className="page-stack">
      <div className="section-toolbar">
        <div className="filter-tabs">
          <button
            className={filter === "all" ? "active" : ""}
            onClick={() => setFilter("all")}
          >
            All <span>{data.clients.length}</span>
          </button>
          <button
            className={filter === "active" ? "active" : ""}
            onClick={() => setFilter("active")}
          >
            Active{" "}
            <span>
              {data.clients.filter((client) => client.status !== "archived").length}
            </span>
          </button>
          <button
            className={filter === "archived" ? "active" : ""}
            onClick={() => setFilter("archived")}
          >
            Archived{" "}
            <span>
              {data.clients.filter((client) => client.status === "archived").length}
            </span>
          </button>
        </div>
        <button className="gold-button" onClick={onCreate}>
          <Plus size={16} /> New client
        </button>
      </div>
      {data.clients.length === 0 ? (
        <section className="os-panel tall-empty">
          <EmptyState
            icon={UsersRound}
            title="No client records yet"
            body="Add a client once. Their projects, messages, appointments, files, and approvals stay connected."
            action="Add first client"
            onAction={onCreate}
          />
        </section>
      ) : visibleClients.length === 0 ? (
        <section className="os-panel tall-empty">
          <EmptyState
            icon={UsersRound}
            title={`No ${filter} clients`}
            body="Choose another client filter or create a new client record."
            action="Show all clients"
            onAction={() => setFilter("all")}
          />
        </section>
      ) : (
        <>
        <section className="os-panel table-panel">
          <div className="data-table clients-table">
            <div className="table-row table-head">
              <span>Client</span><span>Contact</span><span>Projects</span><span>Status</span><span>Portal</span>
            </div>
            {visibleClients.map((client) => {
              const count = data.projects.filter(
                (project) => project.clientId === client.id,
              ).length;
              return (
                <div className={cn("table-row", selectedId === client.id && "selected-row")} key={client.id}>
                  <span className="client-cell">
                    <i>{fullName(client).slice(0, 2).toUpperCase()}</i>
                    <span><strong>{fullName(client)}</strong><small>Added {formatDate(client.createdAt)}</small></span>
                  </span>
                  <span><strong>{client.email || "No email"}</strong><small>{client.phone || "No phone"}</small></span>
                  <span>{count}</span>
                  <span><b className="status-dot" /> {client.status}</span>
                  <span>
                    <button className="text-button" onClick={() => openClientWorkspace(client.id)}>
                      Open workspace
                    </button>
                    <button className="outline-button small" onClick={() => onInvite(client)}>
                      <Link2 size={14} /> Create access
                    </button>
                  </span>
                </div>
              );
            })}
          </div>
        </section>
        {selectedClient && (
          <section id="selected-client-workspace" className="os-panel client-workspace-panel">
            <div className="client-workspace-hero">
              <div className="client-workspace-identity"><span>{fullName(selectedClient).slice(0, 2).toUpperCase()}</span><div><p className="eyebrow gold">OWNER CLIENT WORKSPACE</p><h2>{fullName(selectedClient)}</h2><small>{selectedClient.status} · {selectedClient.preferredChannel || "channel not set"}</small></div></div>
              <div className="client-workspace-actions"><button className="outline-button" onClick={() => onInvite(selectedClient)}><Link2 size={14} /> Client access</button>{selectedClient.status === "archived" ? <button className="gold-button" disabled={saving} onClick={() => void clientAction("restore")}>Restore client</button> : <button className="text-button danger-text" disabled={saving} onClick={() => void clientAction("archive")}>Archive client</button>}</div>
            </div>
            <div className="client-workspace-stats">
              <DetailBox label="Projects" value={String(clientProjects.filter((project) => !project.archivedAt).length)} />
              <DetailBox label="Lifetime paid" value={formatMoney(totalPaid)} />
              <DetailBox label="Outstanding" value={formatMoney(totalOutstanding)} />
              <DetailBox label="Next appointment" value={formatDate(clientAppointments.filter((item) => new Date(item.startsAt).getTime() >= viewOpenedAt).sort((a,b) => a.startsAt.localeCompare(b.startsAt))[0]?.startsAt, true)} />
            </div>
            <div className="filter-tabs client-workspace-tabs">
              {(["overview", "projects", "timeline", "financials", "privacy"] as const).map((tab) => <button key={tab} className={workspaceTab === tab ? "active" : ""} onClick={() => setWorkspaceTab(tab)}>{tab}</button>)}
            </div>
            {workspaceTab === "overview" && <>
              <section className="client-media-showcase">
                <header>
                  <div><p className="eyebrow gold">CLIENT MEDIA</p><h3>Recent uploads</h3><small>{clientImageAssets.length ? `${clientImageAssets.length} image${clientImageAssets.length === 1 ? "" : "s"} connected to this client` : "Images uploaded to this client will appear here automatically."}</small></div>
                  <button className="text-button" onClick={() => onNavigate({ view: "design", clientId: selectedClient.id })}>Open Design Studio <ArrowRight size={13} /></button>
                </header>
                {clientImageAssets.length ? <div className="client-media-layout">
                  <button className="client-media-feature" onClick={() => setPreviewAsset(clientImageAssets[0])} aria-label={`Preview newest upload, ${clientImageAssets[0].originalName}`}>
                    <AssetPreview asset={clientImageAssets[0]} />
                    <span className="newest-upload-badge">Newest upload</span>
                    <span className="client-media-caption"><strong>{clientImageAssets[0].originalName}</strong><small>{data.projects.find((project) => project.id === clientImageAssets[0].projectId)?.title || "Client upload"} · {formatDate(clientImageAssets[0].createdAt, true)}</small></span>
                    <Maximize2 size={17} />
                  </button>
                  {clientImageAssets.length > 1 && <div className="client-media-strip" aria-label="Earlier client uploads">
                    {clientImageAssets.slice(1).map((asset) => <button key={asset.id} onClick={() => setPreviewAsset(asset)} aria-label={`Preview ${asset.originalName}`}><AssetPreview asset={asset} /><span><strong>{asset.originalName}</strong><small>{formatDate(asset.createdAt)}</small></span><Maximize2 size={14} /></button>)}
                  </div>}
                </div> : <div className="client-media-empty"><ImageIcon size={24} /><div><strong>No client images uploaded yet</strong><small>Upload references, body photos, designs, session photos, or healed results in Design Studio.</small></div></div>}
              </section>
              <div className="client-grid">
                <article className="client-card"><h3>Contact and identity</h3><p>{selectedClient.email || "No email saved"}</p><p>{selectedClient.phone || "No phone saved"}</p><small>Preferred channel: {selectedClient.preferredChannel || "not set"}</small><div className="tag-row">{selectedClient.instagramHandle && <span>@{selectedClient.instagramHandle} · Instagram</span>}{selectedClient.tiktokHandle && <span>@{selectedClient.tiktokHandle} · TikTok</span>}</div></article>
                <article className="client-card owner-private-card"><h3><LockKeyhole size={16} /> Private studio notes</h3><p>{selectedClient.notes || "No private notes saved."}</p><small>Never returned by the client portal API.</small></article>
                <article className="client-card"><h3>Relationship activity</h3><p>{clientMessages.length} messages</p><p>{clientAppointments.length} appointments</p><p>{clientAssets.length} files</p><p>{clientSessions.length} tattoo sessions</p></article>
                <article className="client-card"><h3>Open attention</h3><p>{clientApprovals.filter((item) => item.status === "pending").length} approvals waiting</p><p>{clientHealing.filter((item) => ["submitted", "needs_attention"].includes(item.status)).length} healing reviews</p><p>{data.projectCandidates.filter((candidate) => candidate.clientId === selectedClient.id && ["pending_review", "needs_details"].includes(candidate.status)).length} intake requests</p></article>
              </div>
            </>}
            {workspaceTab === "projects" && <div className="relationship-project-list">
              {clientProjects.length ? clientProjects.map((project) => <article className={cn(project.archivedAt && "archived-record", project.isTest && "test-record")} key={project.id}><div><span className="phase-pill">{project.lifecyclePhase}</span><h3>{project.title}</h3><p>{project.placement || "Placement not set"} · {project.status}</p><small>{project.isTest ? "Test data · excluded from intelligence" : project.archivedAt ? "Archived · excluded from operations" : project.nextAction || "No next action"}</small></div><div className="relationship-project-actions">{project.archivedAt ? <button className="outline-button" disabled={saving} onClick={() => void projectCleanup(project, "restore")}>Restore</button> : <button className="text-button danger-text" disabled={saving} onClick={() => void projectCleanup(project, "archive")}>Archive</button>}<button className="text-button" disabled={saving} onClick={() => void projectCleanup(project, project.isTest ? "mark_real" : "mark_test")}>{project.isTest ? "Mark real" : "Mark test"}</button>{!project.archivedAt && clientProjects.filter((item) => item.id !== project.id && !item.archivedAt).length > 0 && <select aria-label={`Mark ${project.title} as duplicate of`} defaultValue="" onChange={(event) => { const canonical = event.target.value; if (canonical && window.confirm(`Archive ${project.title} as a duplicate of the selected project?`)) void projectCleanup(project, "archive", canonical); event.target.value = ""; }}><option value="">Archive as duplicate…</option>{clientProjects.filter((item) => item.id !== project.id && !item.archivedAt).map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}</select>}</div></article>) : <EmptyState icon={FolderKanban} title="No projects connected" body="Approved project requests will become part of this relationship workspace." />}
            </div>}
            {workspaceTab === "timeline" && <div className="relationship-timeline">{timeline.length ? timeline.map((item) => <article key={`${item.type}-${item.id}`}><span /><div><small>{item.type} · {formatDate(item.at, true)}</small><strong>{item.title}</strong><p>{item.detail}</p></div></article>) : <EmptyState icon={Activity} title="No relationship history yet" body="Messages, appointments, files, approvals, and sessions will appear in one timeline." />}</div>}
            {workspaceTab === "financials" && <div className="client-grid"><article className="client-card"><h3>Financial relationship</h3><p><strong>{formatMoney(totalPaid)}</strong> collected after refunds</p><p><strong>{formatMoney(totalOutstanding)}</strong> currently outstanding</p><small>Budget ranges are not counted as revenue.</small></article><article className="client-card"><h3>Payment history</h3>{clientPayments.length ? clientPayments.map((payment) => <p key={payment.id}><strong>{payment.title}</strong> · {formatMoney(payment.amountCents)} · {payment.status}</p>) : <p>No payment requests.</p>}<button className="text-button" onClick={() => onNavigate({ view: "finances" })}>Open Finance Center <ArrowRight size={13} /></button></article></div>}
            {workspaceTab === "privacy" && <div className="client-grid"><article className="client-card"><h3>Portal and identity boundary</h3><p>Client access is scoped to this client ID and deliberately shared project fields.</p><button className="outline-button" onClick={() => onInvite(selectedClient)}><Link2 size={14} /> Manage client access</button></article><article className="client-card"><h3>Tattoo media permission</h3><p>{clientConsent ? `Granted ${formatDate(clientConsent.grantedAt)}` : "Not granted"}</p><small>The client controls this permission from their healing workspace.</small></article><article className="client-card"><h3>Internal data boundary</h3><p>Private studio notes, AI reasoning, technique notes, and internal pricing context are owner-only.</p><small>Archiving preserves audit history and revokes operational use.</small></article></div>}
            <div className="client-workspace-shortcuts"><button onClick={() => onNavigate({ view: "inbox", id: selectedClient.id })}><MessageSquareText size={16} /> Open messages</button><button onClick={() => onNavigate({ view: "projects", id: clientProjects[0]?.id })}><FolderKanban size={16} /> Open projects</button><button onClick={() => onNavigate({ view: "calendar" })}><CalendarDays size={16} /> Open calendar</button><button onClick={() => onNavigate({ view: "operations" })}><Activity size={16} /> Open lifecycle</button></div>
          </section>
        )}
        {previewAsset && (
          <Modal title={previewAsset.originalName} eyebrow="CLIENT MEDIA" onClose={() => setPreviewAsset(null)}>
            <div className="asset-lightbox">
              <AssetPreview asset={previewAsset} className="asset-lightbox-image" />
              <div className="modal-actions">
                <button className="text-button" type="button" onClick={() => setPreviewAsset(null)}>Close</button>
                <button className="gold-button" type="button" onClick={() => void downloadAsset(previewAsset)}><Download size={15} /> Download original</button>
              </div>
            </div>
          </Modal>
        )}
        </>
      )}
    </section>
  );
}

function CalendarView({
  data,
  onCreate,
  refresh,
  notify,
  targetId,
}: {
  data: WorkspaceData;
  onCreate: () => void;
  refresh: () => Promise<void>;
  notify: (message: string, error?: boolean) => void;
  targetId?: string;
}) {
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!targetId) return;
    document.getElementById(`appointment-${targetId}`)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [targetId]);

  async function schedulingAction(payload: Record<string, unknown>, success?: string) {
    setSaving(true);
    try {
      const result = await api<{ evaluation?: { summary: string }; summary?: string }>("/api/scheduling", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      notify(success || result.evaluation?.summary || result.summary || "Scheduling intelligence updated.");
      await refresh();
      return result;
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to update scheduling intelligence", true);
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function createCapacityWindow(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    const startsAt = new Date(String(values.startsAt || ""));
    const endsAt = new Date(String(values.endsAt || ""));
    const result = await schedulingAction({ ...values, action: "create_window", startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() });
    if (result) form.reset();
  }

  async function saveProjectRequirement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    const earliestStart = values.earliestStart ? new Date(String(values.earliestStart)).toISOString() : "";
    const latestEnd = values.latestEnd ? new Date(String(values.latestEnd)).toISOString() : "";
    const result = await schedulingAction({ ...values, action: "save_requirement", earliestStart, latestEnd, minimumRevenueCents: Math.round(Number(values.minimumRevenueDollars || 0) * 100) });
    if (result) form.reset();
  }

  async function saveSchedulingPolicy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    await schedulingAction({ ...values, action: "update_profile", weeklyRevenueTargetCents: Math.round(Number(values.weeklyRevenueTargetDollars || 0) * 100) }, "Scheduling capacity policy saved and the workspace was re-evaluated.");
  }

  const scheduling = data.schedulingIntelligence;
  const latestRun = scheduling.runs[0];
  const realProjects = data.projects.filter((project) => !project.isTest && !project.archivedAt && project.status === "active");

  return (
    <section className="page-stack">
      <div className="section-toolbar">
        <div className="date-heading">
          <p className="eyebrow">SCHEDULE</p>
          <h2>Upcoming appointments</h2>
        </div>
        <button className="gold-button" onClick={onCreate}>
          <Plus size={16} /> Schedule
        </button>
      </div>
      <section className="os-panel scheduling-intelligence-panel">
        <div className="scheduling-intelligence-heading">
          <div><p className="eyebrow gold">CAPACITY INTELLIGENCE</p><h2>Book work that is actually ready</h2><p>Empty time is not automatically usable time. Legacy checks exact approval, paid deposit, project phase, duration, preparation, travel, buffers, protected time, daily tattoo limits, energy, and conflicts before suggesting anything.</p></div>
          <button className="gold-button" disabled={saving} onClick={() => void schedulingAction({ action: "evaluate" })}><BrainCircuit size={15} /> {saving ? "Evaluating…" : "Evaluate capacity"}</button>
        </div>
        <div className="scheduling-stat-grid">
          <span><strong>{scheduling.windows.filter((item) => item.status === "open").length}</strong><small>open windows</small></span>
          <span><strong>{latestRun?.readyProjects || 0}</strong><small>ready projects</small></span>
          <span><strong>{scheduling.opportunities.filter((item) => item.status === "proposed").length}</strong><small>suggested fits</small></span>
          <span><strong>{latestRun?.conflictsDetected || 0}</strong><small>conflicts avoided</small></span>
          <span><strong>{formatMoney(latestRun?.projectedRevenueCents || 0)}</strong><small>potential value</small></span>
        </div>
        <div className="schedule-opportunity-list">
          <div className="capture-stream-heading"><strong>Best available fits</strong><small>Every booking requires exact owner approval</small></div>
          {scheduling.opportunities.length ? scheduling.opportunities.map((opportunity) => {
            const project = data.projects.find((item) => item.id === opportunity.projectId);
            const client = data.clients.find((item) => item.id === opportunity.clientId);
            return <article key={opportunity.id}>
              <div className="schedule-opportunity-time"><strong>{formatDate(opportunity.suggestedStartsAt, true)}</strong><small>to {formatDate(opportunity.suggestedEndsAt, true)}</small></div>
              <div><span className={cn("agent-task-status", opportunity.status === "proposed" ? "queued" : "held_for_approval")}>{opportunity.status.replaceAll("_", " ")}</span><h3>{project?.title || "Project"}</h3><p>{fullName(client)} · {opportunity.energyDemand} energy · {formatMoney(opportunity.projectedRevenueCents)} potential</p><small>{opportunity.rationale}</small></div>
              {opportunity.status === "proposed" ? <button className="outline-button" disabled={saving} onClick={() => void schedulingAction({ action: "request_booking", opportunityId: opportunity.id }, "The exact appointment is now held for owner approval. Nothing was booked automatically.")}><ShieldCheck size={14} /> Request approval</button> : <button className="outline-button" disabled>Approval pending</button>}
            </article>;
          }) : <EmptyState icon={CalendarDays} title="No safe scheduling fit yet" body={latestRun?.summary || "Add an explicit capacity window and scheduling requirements for a session-ready project."} />}
        </div>
      </section>
      <div className="scheduling-control-grid">
        <section className="os-panel scheduling-control-card">
          <PanelTitle eyebrow="CAPACITY WINDOWS" title="Available and protected time" />
          <form className="modal-form" onSubmit={createCapacityWindow}>
            <label><span>TITLE</span><input name="title" required placeholder="Saturday tattoo capacity" /></label>
            <div className="field-row"><label><span>START</span><input name="startsAt" type="datetime-local" required /></label><label><span>END</span><input name="endsAt" type="datetime-local" required /></label></div>
            <div className="field-row"><label><span>USE</span><select name="windowType" defaultValue="tattoo"><option value="tattoo">Tattoo capacity</option><option value="design">Deep-focus design</option><option value="admin">Administration</option><option value="personal">Personal/family</option></select></label><label><span>STATE</span><select name="status" defaultValue="open"><option value="open">Open capacity</option><option value="protected">Protected / unavailable</option></select></label></div>
            <div className="field-row"><label><span>ENERGY CAPACITY</span><select name="energyCapacity" defaultValue="high"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label><label><span>LOCATION</span><input name="location" placeholder="Legacy Lines" /></label></div>
            <button className="outline-button wide" disabled={saving}><Plus size={14} /> Add capacity window</button>
          </form>
          <div className="capacity-window-list">{scheduling.windows.filter((item) => item.status !== "closed").map((window) => <article key={window.id}><span className={cn("status-dot", window.status === "protected" && "warning")} /><div><strong>{window.title}</strong><small>{formatDate(window.startsAt, true)} – {formatDate(window.endsAt, true)} · {window.status}</small></div><button className="text-button" disabled={saving} onClick={() => void schedulingAction({ action: "close_window", windowId: window.id }, "Capacity window closed and dependent suggestions expired.")}><X size={13} /> Close</button></article>)}</div>
        </section>
        <section className="os-panel scheduling-control-card">
          <PanelTitle eyebrow="PROJECT CAPACITY" title="What each session requires" />
          <form className="modal-form" onSubmit={saveProjectRequirement}>
            <label><span>PROJECT</span><select name="projectId" required defaultValue=""><option value="" disabled>Select active project</option>{realProjects.map((project) => <option key={project.id} value={project.id}>{project.title} · {project.lifecyclePhase}</option>)}</select></label>
            <div className="field-row"><label><span>SESSION MINUTES</span><input name="estimatedSessionMinutes" type="number" min="30" max="960" required defaultValue="240" /></label><label><span>ENERGY DEMAND</span><select name="energyDemand" defaultValue="high"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label></div>
            <div className="field-row"><label><span>PREP MINUTES</span><input name="prepMinutes" type="number" min="0" max="480" placeholder="Use studio default" /></label><label><span>TRAVEL MINUTES</span><input name="travelMinutes" type="number" min="0" max="480" placeholder="Use studio default" /></label></div>
            <div className="field-row"><label><span>BUFFER BEFORE</span><input name="bufferBeforeMinutes" type="number" min="0" max="240" placeholder="Use default" /></label><label><span>BUFFER AFTER</span><input name="bufferAfterMinutes" type="number" min="0" max="240" placeholder="Use default" /></label></div>
            <div className="field-row"><label><span>EARLIEST</span><input name="earliestStart" type="datetime-local" /></label><label><span>LATEST</span><input name="latestEnd" type="datetime-local" /></label></div>
            <div className="field-row"><label><span>MINIMUM SESSION VALUE</span><input name="minimumRevenueDollars" type="number" min="0" step="1" placeholder="0" /></label><label><span>LOCATION</span><input name="location" placeholder="Legacy Lines" /></label></div>
            <button className="outline-button wide" disabled={saving || !realProjects.length}><Save size={14} /> Save project requirements</button>
          </form>
        </section>
      </div>
      {scheduling.profile && <section className="os-panel scheduling-policy-card">
        <PanelTitle eyebrow="STUDIO LIMITS" title="Preparation, recovery, and financial guardrails" />
        <form className="scheduling-policy-form" onSubmit={saveSchedulingPolicy}>
          <label><span>DEFAULT PREP</span><input name="defaultPrepMinutes" type="number" min="0" max="480" defaultValue={scheduling.profile.defaultPrepMinutes} /></label>
          <label><span>DEFAULT TRAVEL</span><input name="defaultTravelMinutes" type="number" min="0" max="480" defaultValue={scheduling.profile.defaultTravelMinutes} /></label>
          <label><span>BUFFER BEFORE</span><input name="defaultBufferBeforeMinutes" type="number" min="0" max="240" defaultValue={scheduling.profile.defaultBufferBeforeMinutes} /></label>
          <label><span>BUFFER AFTER</span><input name="defaultBufferAfterMinutes" type="number" min="0" max="240" defaultValue={scheduling.profile.defaultBufferAfterMinutes} /></label>
          <label><span>MAX TATTOO MIN/DAY</span><input name="maximumTattooMinutesPerDay" type="number" min="60" max="960" defaultValue={scheduling.profile.maximumTattooMinutesPerDay} /></label>
          <label><span>MAX HIGH-ENERGY/DAY</span><input name="maximumHighEnergySessionsPerDay" type="number" min="1" max="4" defaultValue={scheduling.profile.maximumHighEnergySessionsPerDay} /></label>
          <label><span>MIN BOOKABLE TIME</span><input name="minimumBookableMinutes" type="number" min="30" max="720" defaultValue={scheduling.profile.minimumBookableMinutes} /></label>
          <label><span>WEEKLY REVENUE TARGET</span><input name="weeklyRevenueTargetDollars" type="number" min="0" step="1" defaultValue={Math.round(scheduling.profile.weeklyRevenueTargetCents / 100)} /></label>
          <button className="gold-button" disabled={saving}><Check size={14} /> Save limits</button>
        </form>
      </section>}
      <section className="os-panel calendar-surface">
        {data.appointments.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="Nothing is scheduled"
            body="Add consultations, tattoo sessions, design reviews, and healing checks."
            action="Schedule appointment"
            onAction={onCreate}
          />
        ) : (
          <div className="calendar-list">
            {data.appointments.map((appointment) => {
              const client = data.clients.find(
                (item) => item.id === appointment.clientId,
              );
              const project = data.projects.find(
                (item) => item.id === appointment.projectId,
              );
              return (
                <article id={`appointment-${appointment.id}`} className={cn(targetId === appointment.id && "focused-record")} key={appointment.id}>
                  <div className="calendar-date">
                    <strong>{new Date(appointment.startsAt).getDate()}</strong>
                    <span>{new Date(appointment.startsAt).toLocaleString("en-US", { month: "short" })}</span>
                  </div>
                  <span className="calendar-line" />
                  <div>
                    <p>{appointment.appointmentType}</p>
                    <strong>{fullName(client)}</strong>
                    <small>{project?.title || "No linked project"} · {formatDate(appointment.startsAt, true)}</small>
                  </div>
                  <span className="status-badge">{appointment.status}</span>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </section>
  );
}

function InboxView({
  data,
  onSent,
  notify,
  targetId,
}: {
  data: WorkspaceData;
  onSent: () => void;
  notify: (message: string, error?: boolean) => void;
  targetId?: string;
}) {
  const [clientId, setClientId] = useState(targetId || data.clients[0]?.id || "");
  const messages = data.messages.filter(
    (message) => !clientId || message.clientId === clientId,
  );

  useEffect(() => {
    if (
      !clientId ||
      !data.messages.some(
        (message) =>
          message.clientId === clientId &&
          message.senderType === "client" &&
          !message.readAt,
      )
    ) {
      return;
    }
    void api("/api/messages", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ clientId }),
    })
      .then(onSent)
      .catch((readError) =>
        notify(
          readError instanceof Error
            ? readError.message
            : "Unable to update message state",
          true,
        ),
      );
  }, [clientId, data.messages, notify, onSent]);
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await api("/api/messages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          clientId,
          body: form.get("body"),
        }),
      });
      formElement.reset();
      notify("Message saved to the shared client conversation.");
      onSent();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to send", true);
    }
  }
  return (
    <section className="inbox-layout">
      <aside className="conversation-list">
        <header><p>CONVERSATIONS</p><span>{data.clients.length}</span></header>
        {data.clients.length === 0 ? (
          <EmptyState icon={UsersRound} title="No clients" body="Add a client to start a secure conversation." />
        ) : (
          data.clients.map((client) => {
            const unreadCount = data.messages.filter(
              (message) =>
                message.clientId === client.id &&
                message.senderType === "client" &&
                !message.readAt,
            ).length;
            return (
              <button className={cn(clientId === client.id && "active")} key={client.id} onClick={() => setClientId(client.id)}>
                <span>{client.firstName.slice(0, 1)}{client.lastName.slice(0, 1)}</span>
                <div><strong>{fullName(client)}</strong><small>{client.email || "Client portal"}</small></div>
                {unreadCount > 0 && <i className="conversation-unread">{unreadCount}</i>}
              </button>
            );
          })
        )}
      </aside>
      <section className="conversation-panel os-panel">
        {clientId ? (
          <>
            <header>
              <div><p>{fullName(data.clients.find((item) => item.id === clientId))}</p><small>Shared owner and client portal thread</small></div>
              <ShieldCheck size={19} />
            </header>
            <div className="message-thread">
              {messages.length === 0 ? (
                <EmptyState icon={MessageSquareText} title="Start the conversation" body="Messages sent here appear in the client's secure portal." />
              ) : (
                [...messages].reverse().map((message) => (
                  <article className={cn("message-bubble", message.senderType === "owner" && "owner")} key={message.id}>
                    <small>{message.senderType === "owner" ? "Studio" : "Client"} · {formatDate(message.createdAt, true)}{message.senderType === "owner" && message.readAt ? " · Read by client" : ""}</small>
                    <p>{message.body}</p>
                  </article>
                ))
              )}
            </div>
            <form className="message-composer" onSubmit={send}>
              <textarea name="body" required placeholder="Write a message..." />
              <button className="gold-button" type="submit"><Send size={16} /> Send</button>
            </form>
          </>
        ) : (
          <EmptyState icon={MessageSquareText} title="Choose a client" body="Select a conversation from the left." />
        )}
      </section>
    </section>
  );
}

function DesignStudio({
  data,
  refresh,
  notify,
  targetId,
  clientId,
  onCreateProject,
}: {
  data: WorkspaceData;
  refresh: () => Promise<void>;
  notify: (message: string, error?: boolean) => void;
  targetId?: string;
  clientId?: string;
  onCreateProject: (clientId?: string) => void;
}) {
  const scopedProjects = clientId
    ? data.projects.filter((item) => item.clientId === clientId && !item.archivedAt)
    : data.projects.filter((item) => !item.archivedAt);
  const [projectId, setProjectId] = useState(
    targetId || scopedProjects[0]?.id || "",
  );
  const [tool, setTool] = useState<"select" | "analyze">("select");
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<{ summary: string; provider: string; model: string; confidenceBps: number; createdAt: string } | null>(null);
  const project = data.projects.find((item) => item.id === projectId);
  const projectAssets = data.assets.filter((item) => item.projectId === projectId);
  const projectApprovals = data.approvals.filter((item) => item.projectId === projectId);
  const selectedAsset = projectAssets.find(
    (item) => item.id === selectedAssetId,
  );

  useEffect(() => {
    if (!selectedAssetId) return;
    let active = true;
    void api<{ analyses: Array<{ summary: string; provider: string; model: string; confidenceBps: number; createdAt: string }> }>(`/api/design-analysis?assetId=${encodeURIComponent(selectedAssetId)}`)
      .then((result) => { if (active) setAnalysis(result.analyses[0] || null); })
      .catch(() => { if (active) setAnalysis(null); });
    return () => { active = false; };
  }, [selectedAssetId]);

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    form.set("projectId", projectId);
    try {
      const result = await api<{ id: string }>("/api/files", { method: "POST", body: form });
      formElement.reset();
      setSelectedAssetId(result.id);
      notify("Classified design file stored with version lineage and an audit record.");
      await refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Upload failed", true);
    }
  }

  async function requestApproval() {
    if (!project) return;
    if (!selectedAsset) {
      notify("Select the exact design version the client should review.", true);
      return;
    }
    try {
      await api("/api/approvals", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          assetId: selectedAsset.id,
          category: "design",
          subject: `${project.title} design review`,
          summary: `Review ${selectedAsset.originalName} (version ${selectedAsset.version ?? 1}) and approve it or request a revision.`,
          riskLevel: "medium",
        }),
      });
      notify("Client approval request created.");
      refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to request approval", true);
    }
  }

  async function analyzeDesign() {
    if (!project || !selectedAsset) {
      notify("Select a classified design image before running visual analysis.", true);
      return;
    }
    setTool("analyze");
    setAnalyzing(true);
    try {
      const result = await api<{ analysis: { summary: string; provider: string; model: string; confidenceBps: number; createdAt: string } }>("/api/design-analysis", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ assetId: selectedAsset.id }),
      });
      setAnalysis(result.analysis);
      notify("Version-bound visual analysis recorded in Design Studio and AI Operations.");
      refresh();
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Unable to analyze design",
        true,
      );
    } finally {
      setAnalyzing(false);
    }
  }

  function openAsset(asset: AssetRecord) {
    setSelectedAssetId(asset.id);
    setAnalysis(null);
  }

  async function saveClassification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedAsset) return;
    const form = new FormData(event.currentTarget);
    try {
      await api("/api/files", {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: selectedAsset.id, assetRole: form.get("assetRole"), visibility: form.get("visibility"), rightsStatus: form.get("rightsStatus"), consentStatus: form.get("consentStatus"), contentEligible: form.get("contentEligible") === "on" }),
      });
      notify("Asset classification and permissions updated.");
      await refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to update asset", true);
    }
  }

  if (!project) {
    return (
      <section className="os-panel tall-empty">
        <EmptyState
          icon={Brush}
          title={clientId ? "This client has no design project yet" : "Design Studio needs a project"}
          body="Create a project before adding references, design versions, or approval gates. Legacy OS will keep the new design scoped to the correct client."
          action="Create a project"
          onAction={() => onCreateProject(clientId)}
        />
      </section>
    );
  }

  return (
    <section className="design-studio">
      <div className="design-toolbar">
        <label>
          <span>PROJECT</span>
          <select
            value={projectId}
            onChange={(event) => {
              setProjectId(event.target.value);
              setSelectedAssetId("");
            }}
          >
            {scopedProjects.map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}
          </select>
          {clientId && <small>Showing only this client&apos;s projects</small>}
        </label>
        <div>
          <button
            className={cn("outline-button", tool === "select" && "active-tool")}
            onClick={() => setTool("select")}
          >
            <Brush size={15} /> Select
          </button>
          <button
            className={cn("outline-button", tool === "analyze" && "active-tool")}
            onClick={analyzeDesign}
            disabled={analyzing}
          >
            <WandSparkles size={15} />{" "}
            {analyzing ? "Analyzing..." : "Analyze"}
          </button>
          <button className="gold-button" onClick={requestApproval}><ShieldCheck size={15} /> Request approval</button>
        </div>
      </div>
      <div className="design-grid">
        <aside className="reference-column os-panel">
          <PanelTitle eyebrow="REFERENCE BOARD" title="Project files" />
          {projectAssets.length ? (
            <div className="asset-list">
              {projectAssets.map((asset) => (
                <button
                  className={selectedAssetId === asset.id ? "active" : ""}
                  onClick={() => openAsset(asset)}
                  key={asset.id}
                >
                  <span>{asset.mediaType === "image" ? <ImageIcon size={17} /> : <FileText size={17} />}</span>
                  <div><strong>{asset.originalName}</strong><small>v{asset.version || 1} · {asset.assetRole?.replaceAll("_", " ") || "unclassified"}</small></div>
                  <ChevronDown size={14} />
                </button>
              ))}
            </div>
          ) : (
            <EmptyState icon={ImageIcon} title="No references yet" body="Upload references, sketches, designs, or stencil files." />
          )}
          <form className="upload-box" onSubmit={upload}>
            <Upload size={21} />
            <strong>Add a project file</strong>
            <small>Images or documents up to 25 MB</small>
            <input type="file" name="file" required />
            <label><span>ASSET TYPE</span><select name="assetRole" defaultValue="design_iteration"><option value="artist_reference">Artist reference</option><option value="body_photo">Body placement photo</option><option value="mockup">Mockup</option><option value="design_iteration">Design iteration</option><option value="final_design">Final design</option><option value="stencil">Stencil</option><option value="session_photo">Session photo</option><option value="fresh_tattoo">Fresh tattoo</option><option value="healed_tattoo">Healed tattoo</option><option value="content_asset">Content asset</option><option value="consent_document">Consent document</option><option value="other">Other</option></select></label>
            <label><span>VERSION OF</span><select name="parentAssetId" defaultValue=""><option value="">New independent asset</option>{projectAssets.filter((asset) => ["mockup", "design_iteration", "final_design", "stencil"].includes(asset.assetRole || "")).map((asset) => <option value={asset.id} key={asset.id}>{asset.originalName} · v{asset.version || 1}</option>)}</select></label>
            <button className="outline-button small" type="submit">Upload</button>
          </form>
        </aside>
        <section className="design-canvas os-panel">
          <header><span>CANVAS</span><small>{project.placement || "Placement not set"}</small></header>
          <div className={cn("canvas-empty", selectedAsset && "has-preview")}>
            {selectedAsset ? <AssetPreview asset={selectedAsset} className="design-main-preview" /> : <><div className="canvas-emblem"><span>L</span></div><p>{project.title}</p><small>Select a project file to review it. The stored original remains unchanged.</small></>}
          </div>
          {selectedAsset && <div className="asset-review-controls">
            <div><strong>{selectedAsset.originalName}</strong><small>Version {selectedAsset.version || 1} · SHA-256 protected original</small></div>
            <button className="outline-button small" onClick={() => void downloadAsset(selectedAsset)}><Download size={14} /> Download original</button>
          </div>}
          {analysis && <article className="design-analysis-result"><span><BrainCircuit size={17} /> AI DESIGN REVIEW</span><p>{analysis.summary}</p><small>{analysis.provider} · {analysis.model} · {Math.round(analysis.confidenceBps / 100)}% bounded confidence · {formatDate(analysis.createdAt, true)}</small></article>}
          <footer>
            <span>PROJECT NOTE</span>
            <p>{project.summary || "Add the creative direction to the project brief."}</p>
          </footer>
        </section>
        <aside className="approval-column os-panel">
          <PanelTitle eyebrow="ASSET CONTROL" title="Classification & approvals" />
          {selectedAsset && <form className="asset-classification-form" key={selectedAsset.id} onSubmit={saveClassification}>
            <label><span>TYPE</span><select name="assetRole" defaultValue={selectedAsset.assetRole || "other"}><option value="client_reference">Client reference</option><option value="artist_reference">Artist reference</option><option value="body_photo">Body photo</option><option value="mockup">Mockup</option><option value="design_iteration">Design iteration</option><option value="final_design">Final design</option><option value="stencil">Stencil</option><option value="session_photo">Session photo</option><option value="fresh_tattoo">Fresh tattoo</option><option value="healed_tattoo">Healed tattoo</option><option value="content_asset">Content asset</option><option value="consent_document">Consent document</option><option value="other">Other</option></select></label>
            <label><span>VISIBILITY</span><select name="visibility" defaultValue={selectedAsset.visibility || "internal"}><option value="internal">Studio only</option><option value="client_shared">Share with client</option><option value="public">Public</option></select></label>
            <label><span>RIGHTS</span><select name="rightsStatus" defaultValue={selectedAsset.rightsStatus || "unknown"}><option value="unknown">Unknown</option><option value="client_provided">Client provided</option><option value="studio_created">Studio created</option><option value="authorized">Authorized</option><option value="restricted">Restricted</option></select></label>
            <label><span>CLIENT CONSENT</span><select name="consentStatus" defaultValue={selectedAsset.consentStatus || "not_required"}><option value="not_required">Not required</option><option value="pending">Pending</option><option value="granted">Granted</option><option value="revoked">Revoked</option></select></label>
            <label className="check-line"><input type="checkbox" name="contentEligible" defaultChecked={selectedAsset.contentEligible} /><span>Eligible for Content Studio</span></label>
            <button className="outline-button small" type="submit">Save classification</button>
          </form>}
          <PanelTitle eyebrow="CLIENT REVIEW" title="Version-bound approvals" />
          {projectApprovals.length ? (
            <div className="approval-stack">
              {projectApprovals.map((approval) => (
                <article key={approval.id}>
                  <span className={cn("approval-status", approval.status)}>{approval.status}</span>
                  <strong>{approval.subject}</strong>
                  <p>{approval.summary}</p>
                  {approval.decisionReason && <p className="approval-decision-reason"><strong>{approval.status === "revision" ? "Requested changes" : "Decision note"}:</strong> {approval.decisionReason}</p>}
                  <small>{formatDate(approval.createdAt, true)}</small>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState icon={ShieldCheck} title="No review requested" body="When a design is ready, send it through the approval gate." action="Request approval" onAction={requestApproval} />
          )}
        </aside>
      </div>
      <Lifecycle phase={project.lifecyclePhase} />
    </section>
  );
}

function ChiefView({
  briefing,
  generating,
  onGenerate,
  data,
}: {
  briefing: Briefing | null;
  generating: boolean;
  onGenerate: () => void;
  data: WorkspaceData;
}) {
  const [intelligence, setIntelligence] = useState<IntelligenceData | null>(
    null,
  );
  const [learning, setLearning] = useState(false);
  const [syncingSocial, setSyncingSocial] = useState(false);
  const [intelligenceError, setIntelligenceError] = useState("");
  const [intelligenceNotice, setIntelligenceNotice] = useState("");
  const [chiefBusy, setChiefBusy] = useState(false);
  const [chiefNotice, setChiefNotice] = useState("");
  const [chiefError, setChiefError] = useState("");
  const [managerOperations, setManagerOperations] = useState<{ runs: ChiefManagerRunRecord[]; steps: ChiefManagerStepRecord[] }>({ runs: data.chiefManagerRuns, steps: data.chiefManagerSteps });

  const loadIntelligence = useCallback(async () => {
    try {
      setIntelligence(await api<IntelligenceData>("/api/intelligence"));
      setIntelligenceError("");
    } catch (loadError) {
      setIntelligenceError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load intelligence",
      );
    }
  }, []);

  const loadChiefOperations = useCallback(async () => {
    try {
      const result = await api<{ runs: ChiefManagerRunRecord[]; steps: ChiefManagerStepRecord[] }>("/api/chief");
      setManagerOperations(result);
    } catch (error) {
      setChiefError(error instanceof Error ? error.message : "Unable to load Chief operations");
    }
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => { void loadIntelligence(); void loadChiefOperations(); }, 0);
    return () => window.clearTimeout(handle);
  }, [loadChiefOperations, loadIntelligence]);

  async function runChiefCommand(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setChiefBusy(true);
    setChiefError("");
    setChiefNotice("");
    const form = new FormData(event.currentTarget);
    const requestedTool = String(form.get("requestedTool") || "analyze_internal");
    try {
      const result = await api<{ run: ChiefManagerRunRecord; steps: ChiefManagerStepRecord[] }>("/api/chief", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "run",
          objective: form.get("objective"),
          mode: requestedTool === "analyze_internal" ? "operating_brief" : "command",
          requestedTool,
          projectId: form.get("projectId") || null,
          clientId: form.get("clientId") || null,
          actionPayload: {
            messageBody: String(form.get("messageBody") || "").trim() || undefined,
            startsAt: form.get("startsAt") || undefined,
            endsAt: form.get("endsAt") || undefined,
            appointmentType: form.get("appointmentType") || undefined,
          },
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      setChiefNotice(result.run.nextAction || result.run.summary || "Chief run recorded.");
      await loadChiefOperations();
    } catch (error) {
      setChiefError(error instanceof Error ? error.message : "Unable to run the Chief of Staff");
    } finally {
      setChiefBusy(false);
    }
  }

  async function resumeChief(runId: string) {
    setChiefBusy(true);
    setChiefError("");
    try {
      const result = await api<{ run: ChiefManagerRunRecord }>("/api/chief", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "resume", runId }) });
      setChiefNotice(result.run.nextAction || "Chief run rechecked.");
      await loadChiefOperations();
    } catch (error) {
      setChiefError(error instanceof Error ? error.message : "Unable to resume the Chief run");
    } finally {
      setChiefBusy(false);
    }
  }

  async function learnNow() {
    setLearning(true);
    setIntelligenceError("");
    setIntelligenceNotice("");
    try {
      const result = await api<{ status: string; summary: string; knowledgeChanged: boolean; newEvidenceCount: number }>("/api/intelligence", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ triggerType: "owner_requested" }),
      });
      await loadIntelligence();
      setIntelligenceNotice(result.summary);
    } catch (learnError) {
      setIntelligenceError(
        learnError instanceof Error
          ? learnError.message
          : "Unable to run learning cycle",
      );
    } finally {
      setLearning(false);
    }
  }

  async function syncSocial() {
    setSyncingSocial(true);
    setIntelligenceError("");
    setIntelligenceNotice("");
    try {
      const result = await api<{
        execution: { resultSummary: string | null };
      }>("/api/social/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      await loadIntelligence();
      setIntelligenceNotice(result.execution.resultSummary || "Social evidence synchronization completed and was recorded.");
    } catch (syncError) {
      setIntelligenceError(
        syncError instanceof Error
          ? syncError.message
          : "Unable to synchronize social evidence",
      );
    } finally {
      setSyncingSocial(false);
    }
  }

  return (
    <section className="chief-workspace">
      <div className="chief-hero-card">
        <div className="large-brain-orb"><BrainCircuit size={41} /></div>
        <div>
          <p className="eyebrow gold">AI CHIEF OF STAFF · ONLINE</p>
          <h2>Your studio’s operating picture.</h2>
          <p>{briefing?.summary || "Generate a briefing from the workspace’s current projects, approvals, and appointments."}</p>
          <button className="gold-button" onClick={onGenerate} disabled={generating}>
            <WandSparkles size={16} /> {generating ? "Analyzing workspace..." : "Generate briefing"}
          </button>
        </div>
        <aside>
          <small>DATA SCOPE</small>
          <strong>{data.projects.length + data.appointments.length + data.approvals.length}</strong>
          <span>operational records</span>
          <small>CAPTURE MODE</small>
          <strong className="capture-label">Metadata only</strong>
          <small>ACTIVE MEMORY</small>
          <strong>{data.memoryRecords.filter((memory) => memory.status === "active").length}</strong>
          <span>scoped records</span>
        </aside>
      </div>
      <section className="os-panel chief-manager-console">
        <div className="agent-operations-heading">
          <PanelTitle eyebrow="MANAGER RUNTIME" title="Command the AI staff through one trusted Chief" />
          <p>The Chief retrieves current context, builds a bounded plan, delegates specialists, invokes only registered tools, pauses at authority gates, and records the complete trace.</p>
        </div>
        <form className="chief-command-form" onSubmit={runChiefCommand}>
          <label className="chief-objective"><span>OBJECTIVE</span><textarea name="objective" required rows={2} maxLength={1200} placeholder="What should Legacy understand, prepare, or coordinate?" defaultValue="Review the studio’s current operating state and handle every safe internal next step." /></label>
          <label><span>ACTION MODE</span><select name="requestedTool" defaultValue="analyze_internal"><option value="analyze_internal">Plan and delegate safe internal work</option><option value="draft_response">Prepare a client response draft</option><option value="send_client_message">Request approval for an exact client message</option><option value="schedule_appointment">Request approval for an exact appointment</option></select></label>
          <label><span>PROJECT SCOPE</span><select name="projectId" defaultValue=""><option value="">Whole workspace</option>{data.projects.filter((project) => !project.archivedAt && !project.isTest).map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label>
          <label><span>CLIENT SCOPE</span><select name="clientId" defaultValue=""><option value="">No single client</option>{data.clients.filter((client) => !client.archivedAt).map((client) => <option key={client.id} value={client.id}>{fullName(client)}</option>)}</select></label>
          <label className="chief-message"><span>EXACT MESSAGE, WHEN REQUESTED</span><textarea name="messageBody" rows={2} maxLength={2000} placeholder="Only used for the approval-gated client message action." /></label>
          <label><span>APPOINTMENT START</span><input name="startsAt" type="datetime-local" /></label>
          <label><span>APPOINTMENT END</span><input name="endsAt" type="datetime-local" /></label>
          <label><span>APPOINTMENT TYPE</span><select name="appointmentType" defaultValue="session"><option value="consult">Consult</option><option value="design_review">Design review</option><option value="session">Tattoo session</option><option value="healing_review">Healing review</option></select></label>
          <button className="gold-button" disabled={chiefBusy}><BrainCircuit size={16} /> {chiefBusy ? "Chief is coordinating…" : "Run Chief of Staff"}</button>
        </form>
        {chiefNotice && <p className="chief-run-notice"><CheckCircle2 size={15} /> {chiefNotice}</p>}
        {chiefError && <p className="form-error">{chiefError}</p>}
        <div className="chief-run-ledger">
          <div className="capture-stream-heading"><strong>Manager traces</strong><small>{managerOperations.runs.length} recorded</small></div>
          {managerOperations.runs.length ? managerOperations.runs.slice(0, 8).map((run) => {
            const steps = managerOperations.steps.filter((step) => step.managerRunId === run.id).sort((a, b) => a.sequence - b.sequence);
            return <article key={run.id}>
              <header><span className={cn("agent-task-status", run.status)}>{run.status.replaceAll("_", " ")}</span><div><strong>{run.objective}</strong><small>{run.provider} · {run.model} · {formatDate(run.startedAt, true)} · {Math.round((run.confidenceBps || 0) / 100)}% confidence</small><p>{run.summary || "Planning is in progress."}</p></div>{["awaiting_approval", "awaiting_execution", "needs_attention"].includes(run.status) && <button type="button" className="outline-button" disabled={chiefBusy} onClick={() => void resumeChief(run.id)}>Recheck run</button>}</header>
              <div className="chief-trace-steps">{steps.map((step) => <div key={step.id}><span>{step.sequence}</span><div><strong>{step.title}</strong><small>{step.agentKey.replaceAll("_", " ")} · {step.toolKey.replaceAll("_", " ")}</small><p>{step.resultSummary || step.errorSummary || step.purpose}</p></div><em className={cn("authority-decision", step.status)}>{step.status.replaceAll("_", " ")}</em></div>)}</div>
              {run.nextAction && <footer><ShieldCheck size={14} /> {run.nextAction}</footer>}
            </article>;
          }) : <EmptyState icon={BrainCircuit} title="No manager runs yet" body="Give the Chief an objective to create the first context, delegation, authority, and outcome trace." />}
        </div>
      </section>
      <div className="chief-columns">
        <section className="os-panel">
          <PanelTitle eyebrow="RECOMMENDATIONS" title="Prioritized work" />
          {briefing?.priorities.length ? (
            <div className="recommendation-list">
              {briefing.priorities.map((priority, index) => (
                <article key={priority.id}>
                  <span>{index + 1}</span>
                  <div><strong>{priority.title}</strong><p>{priority.detail}</p>{priority.reason && <small>{priority.reason}</small>}{priority.evidence && <small className="priority-evidence">Evidence: {priority.evidence}</small>}</div>
                  <ShieldCheck size={18} />
                </article>
              ))}
            </div>
          ) : (
            <EmptyState icon={BrainCircuit} title="No current recommendation" body="The planning engine only recommends actions supported by saved workspace data." />
          )}
        </section>
        <section className="os-panel policy-panel">
          <PanelTitle eyebrow="CONTROL" title="How the Chief of Staff behaves" />
          <div className="policy-list">
            <article><LockKeyhole size={18} /><div><strong>Approval first</strong><p>Client messages, scheduling changes, financial actions, and publishing remain gated.</p></div></article>
            <article><Link2 size={18} /><div><strong>Evidence attached</strong><p>Recommendations point back to projects, appointments, approvals, or messages.</p></div></article>
            <article><Activity size={18} /><div><strong>Every run recorded</strong><p>Purpose, engine, timing, confidence, and outcome are visible in AI Operations.</p></div></article>
            <article><BrainCircuit size={18} /><div><strong>Scoped memory</strong><p>Project and client memories enter context only for the matching relationship; revoked memory is excluded.</p></div></article>
          </div>
        </section>
      </div>
      <section className="os-panel chief-memory-context">
        <PanelTitle eyebrow="CONTEXT ENGINE" title="What the Chief of Staff remembered for this run" />
        {briefing?.memoryContext?.highlights.length ? (
          <div className="chief-memory-grid">
            {briefing.memoryContext.highlights.map((memory) => (
              <article key={memory.id}><span>{memory.scopeType}</span><strong>{memory.title}</strong><small>{Math.round(memory.confidenceBps / 100)}% confidence · {memory.verificationStatus.replaceAll("_", " ")}</small></article>
            ))}
          </div>
        ) : (
          <p className="settings-placeholder">Generate a briefing to assemble a bounded context packet from active workspace, client, and project memory.</p>
        )}
        <footer><span>{briefing?.memoryContext?.included ?? 0} included</span><span>{briefing?.memoryContext?.available ?? data.memoryRecords.filter((memory) => memory.status === "active").length} available</span><span>{briefing?.memoryContext?.omitted ?? 0} omitted by context budget</span></footer>
      </section>
      <section className="os-panel intelligence-system">
        <PanelTitle
          eyebrow="CONTINUOUS INTELLIGENCE"
          title="Patterns, evidence, action, outcomes"
        />
        <div className="intelligence-policy-strip">
          <span><strong>3+</strong> completed projects</span>
          <span><strong>2+</strong> distinct clients</span>
          <span><strong>10%+</strong> observed effect</span>
          <span><strong>65%+</strong> pattern confidence</span>
          <span><strong>78%+</strong> internal auto-action</span>
        </div>
        {intelligenceError && (
          <p className="access-error">{intelligenceError}</p>
        )}
        {intelligenceNotice && (
          <p className="access-notice">{intelligenceNotice}</p>
        )}
        {intelligence?.patterns.length ? (
          <div className="pattern-grid">
            {intelligence.patterns.slice(0, 6).map((pattern) => (
              <article key={pattern.id}>
                <header>
                  <span className={cn("status-badge", pattern.status)}>
                    {pattern.status}
                  </span>
                  <strong>{Math.round(pattern.confidenceBps / 100)}%</strong>
                </header>
                <h3>{pattern.name}</h3>
                <p>{pattern.description}</p>
                <small>{pattern.whyItMatters}</small>
                <footer>
                  {pattern.supportCount} observations · {pattern.distinctProjects} completed projects · {pattern.distinctClients} clients · evidence v{pattern.version}
                </footer>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Link2}
            title="No meaningful cross-project pattern yet"
            body="Legacy OS continuously captures real workflow signals. A pattern is promoted only after it crosses the project, client, effect, and confidence thresholds above."
          />
        )}
        <div className="learning-integrity-panel">
          <div><p className="eyebrow">LATEST EVIDENCE EVALUATION</p><h3>{intelligence?.learningCycles[0]?.knowledgeChanged ? "Knowledge changed" : "No unsupported learning claimed"}</h3><p>{intelligence?.learningCycles[0]?.summary || "The first learning cycle will record exactly which eligible evidence changed."}</p></div>
          <div className="learning-integrity-metrics"><span><strong>{intelligence?.learningCycles[0]?.newEvidenceCount ?? 0}</strong> new evidence</span><span><strong>{intelligence?.learningCycles[0]?.eligibleObservations ?? 0}</strong> eligible observations</span><span><strong>{intelligence?.learningCycles[0]?.knowledgeChanged ? "Yes" : "No"}</strong> knowledge changed</span></div>
        </div>
        <div className="learning-footer">
          <div>
            <strong>{intelligence?.recommendations.length ?? 0}</strong>
            <span>evidence-backed recommendations</span>
          </div>
          <div>
            <strong>{intelligence?.outcomes.length ?? 0}</strong>
            <span>measured outcome windows</span>
          </div>
          <div>
            <strong>{intelligence?.learningCycles.length ?? 0}</strong>
            <span>learning cycles recorded</span>
          </div>
          <div>
            <strong>{intelligence?.socialConnections.filter((item) => item.status === "connected").length ?? 0}</strong>
            <span>consented social connections</span>
          </div>
          <button
            className="outline-button"
            onClick={syncSocial}
            disabled={syncingSocial}
          >
            <Link2 size={15} />
            {syncingSocial ? "Synchronizing…" : "Sync social evidence"}
          </button>
          <button
            className="outline-button"
            onClick={learnNow}
            disabled={learning}
          >
            <BrainCircuit size={15} />
            {learning ? "Evaluating evidence…" : "Run learning cycle"}
          </button>
        </div>
      </section>
    </section>
  );
}

function OperationsView({ data, refresh, notify }: { data: WorkspaceData; refresh: () => Promise<void>; notify: (message: string, error?: boolean) => void }) {
  const [saving, setSaving] = useState(false);
  const [operationsSection, setOperationsSection] = useState<"overview" | "automations" | "intelligence" | "workforce" | "learning" | "activity">("overview");
  const succeeded = data.aiRuns.filter((run) => run.status === "succeeded").length;
  const successRate = data.aiRuns.length
    ? Math.round((succeeded / data.aiRuns.length) * 100)
    : 0;

  async function lifecycleAction(payload: Record<string, unknown>, success: string) {
    setSaving(true);
    try {
      await api("/api/lifecycle", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      notify(success);
      await refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Lifecycle action failed", true);
    } finally {
      setSaving(false);
    }
  }

  async function createSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    await lifecycleAction({ action: "create_session", ...values, sessionNumber: Number(values.sessionNumber || 1), requestKey: crypto.randomUUID() }, "Tattoo session planned and added to the automation timeline.");
    form.reset();
  }

  async function saveSessionCraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    setSaving(true);
    try {
      const result = await api<{ completenessBps: number }>("/api/craft", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "save_session_craft", ...values }),
      });
      notify(`Craft record saved at ${Math.round(result.completenessBps / 100)}% completeness. Only sufficiently complete, healed evidence can influence patterns.`);
      form.reset();
      await refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to save session craft evidence", true);
    } finally {
      setSaving(false);
    }
  }

  async function saveHealingAssessment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    setSaving(true);
    try {
      await api("/api/craft", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "save_healing_assessment", ...values, touchupRequired: values.touchupRequired === "on" }),
      });
      notify("Owner healing assessment saved as outcome evidence. No medical diagnosis was generated.");
      form.reset();
      await refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to save healing outcome", true);
    } finally {
      setSaving(false);
    }
  }

  async function runCraftAnalysis() {
    setSaving(true);
    try {
      const result = await api<{ summary: string }>("/api/craft", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "run_analysis" }),
      });
      notify(result.summary);
      await refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to evaluate craft evidence", true);
    } finally {
      setSaving(false);
    }
  }

  async function createContentCandidate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    const asset = data.assets.find((item) => item.id === values.sourceAssetId);
    if (!asset?.projectId) return notify("Choose an eligible project asset.", true);
    await lifecycleAction({ action: "create_content_candidate", ...values, projectId: asset.projectId, requestKey: crypto.randomUUID() }, "Content draft created and held for owner approval.");
    form.reset();
  }

  async function captureNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    setSaving(true);
    try {
      await api("/api/capture", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...values, requestKey: crypto.randomUUID() }),
      });
      form.reset();
      notify("Note captured, normalized, and queued for evidence processing.");
      await refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to capture note", true);
    } finally {
      setSaving(false);
    }
  }

  async function createAgentTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    setSaving(true);
    try {
      await api("/api/agents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...values,
          projectId: values.projectId || undefined,
          clientId: values.clientId || undefined,
          priority: Number(values.priority || 50),
          idempotencyKey: crypto.randomUUID(),
          actionPayload: {
            clientId: values.clientId || undefined,
            projectId: values.projectId || undefined,
            messageBody: values.messageBody || undefined,
            subject: values.subject || undefined,
            startsAt: values.startsAt || undefined,
            endsAt: values.endsAt || undefined,
            appointmentType: values.appointmentType || undefined,
          },
        }),
      });
      form.reset();
      notify("The Chief of Staff routed the task to the correct specialist with a bounded context packet.");
      await refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to route agent task", true);
    } finally {
      setSaving(false);
    }
  }

  async function runSpecialistIntelligence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    setSaving(true);
    try {
      const result = await api<{ tasks: AgentTaskRecord[] }>("/api/specialists", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ domain: values.domain, projectId: values.projectId || undefined, clientId: values.clientId || undefined, objective: values.objective, idempotencyKey: crypto.randomUUID() }),
      });
      notify(`${result.tasks.length} specialist intelligence evaluation${result.tasks.length === 1 ? " was" : "s were"} completed and recorded.`);
      await refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to run specialist intelligence", true);
    } finally {
      setSaving(false);
    }
  }

  async function updateAgentTask(taskId: string, action: "run" | "retry" | "cancel") {
    setSaving(true);
    try {
      await api("/api/agents", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ taskId, action }),
      });
      notify(action === "cancel" ? "Agent task cancelled." : "Agent task processed and recorded.");
      await refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to update agent task", true);
    } finally {
      setSaving(false);
    }
  }

  async function executeConnectorTask(taskId: string) {
    setSaving(true);
    try {
      const result = await api<{ execution: ConnectorExecutionRecord }>("/api/connectors", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ taskId, idempotencyKey: `agent-task:${taskId}` }),
      });
      if (result.execution.status === "failed") throw new Error(result.execution.errorSummary || "Connector execution failed");
      notify(result.execution.resultSummary || "Approved connector action completed and recorded.");
      await refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to execute connector action", true);
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  async function manageGoogleConnector(connectorKey: "gmail" | "google_calendar", disconnect = false) {
    setSaving(true);
    try {
      if (disconnect) {
        await api("/api/connectors/google", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ connectorKey }) });
        notify(`${connectorKey === "gmail" ? "Gmail" : "Google Calendar"} disconnected and its stored OAuth credential removed.`);
        await refresh();
      } else {
        const result = await api<{ authorizationUrl: string }>("/api/connectors/google", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ connectorKey }) });
        window.location.assign(result.authorizationUrl);
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to update Google connector", true);
      setSaving(false);
    }
  }

  async function managePlaybook(payload: Record<string, unknown>, success: string) {
    setSaving(true);
    try {
      await api("/api/playbooks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...payload, requestKey: crypto.randomUUID() }),
      });
      notify(success);
      await refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to update automation playbook", true);
    } finally {
      setSaving(false);
    }
  }

  const eligibleAssets = data.assets.filter((asset) => asset.contentEligible && asset.projectId);
  const realProjectIds = new Set(data.projects.filter((project) => !project.isTest && !project.archivedAt).map((project) => project.id));
  const completedCraftSessions = data.tattooSessions.filter((session) => session.status === "completed" && realProjectIds.has(session.projectId));
  const assessableHealing = data.healingCheckins.filter((checkin) =>
    realProjectIds.has(checkin.projectId) && Boolean(checkin.submittedAt || ["reviewed", "closed", "needs_attention"].includes(checkin.status)),
  );
  const specialistDomains = [
    ["client", "Client"], ["design", "Design"], ["knowledge", "Knowledge"], ["operations", "Operations"],
    ["scheduling", "Scheduling"], ["finance", "Finance"], ["content", "Content"], ["analytics", "Analytics"],
  ] as const;
  const operationsSections = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "automations", label: "Automations", icon: WandSparkles },
    { id: "intelligence", label: "Intelligence", icon: BrainCircuit },
    { id: "workforce", label: "AI workforce", icon: UsersRound },
    { id: "learning", label: "Learning", icon: BookOpen },
    { id: "activity", label: "Activity", icon: Activity },
  ] as const;
  return (
    <section className="page-stack operations-workspace">
      <div className="operations-banner">
        <div>
          <p className="eyebrow gold">GLASS BOX OBSERVABILITY</p>
          <h2>Nothing the AI does is hidden.</h2>
          <p>Runs and human actions are recorded from the live workspace. Prompt and client content stays off by default.</p>
        </div>
        <div className="capture-chip"><ShieldCheck size={18} /><span><small>CAPTURE POLICY</small><strong>Metadata only</strong></span></div>
      </div>
      <nav className="operations-section-tabs" aria-label="AI Operations sections">
        {operationsSections.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" className={cn(operationsSection === id && "active")} aria-current={operationsSection === id ? "page" : undefined} onClick={() => setOperationsSection(id)}>
            <Icon size={16} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      {operationsSection === "overview" && <>
      <section className="stats-grid operations-stats">
        <StatCard icon={Bot} label="RECORDED RUNS" value={data.aiRuns.length} detail="All time in this workspace" />
        <StatCard icon={Gauge} label="SUCCESS RATE" value={`${successRate}%`} detail={data.aiRuns.length ? "Calculated from completed runs" : "Waiting for first run"} />
        <StatCard icon={Clock3} label="LAST RUN" value={data.aiRuns[0] ? formatDate(data.aiRuns[0].createdAt, true) : "None"} detail="Most recent automation event" />
        <StatCard icon={Activity} label="AUDIT EVENTS" value={data.auditEvents.length} detail="Recent owner, client, and system actions" />
      </section>
      <section className="operations-overview-grid" aria-label="AI Operations workspace map">
        {operationsSections.slice(1).map(({ id, label, icon: Icon }) => {
          const details = ({
            automations: { value: `${data.automationPlaybooks.filter((item) => item.enabled).length} active`, body: "Playbooks, authority boundaries, and controlled execution." },
            intelligence: { value: `${data.specialistEvaluations.length} evaluations`, body: "Evidence-backed analysis across eight specialist domains." },
            workforce: { value: `${data.agentDefinitions.filter((item) => item.status === "active").length} agents online`, body: "Delegated work, connector status, and approval gates." },
            learning: { value: `${data.captureEvents.length} signals`, body: "Capture, session outcomes, craft patterns, and content safety." },
            activity: { value: `${data.aiRuns.length} runs`, body: "Model activity and the human-readable audit trail." },
          } as const)[id as Exclude<typeof id, "overview">];
          if (!details) return null;
          return <button type="button" key={id} onClick={() => setOperationsSection(id)}>
            <span className="operations-overview-icon"><Icon size={19} /></span>
            <span><small>{label}</small><strong>{details.value}</strong><p>{details.body}</p></span>
            <ArrowRight size={16} />
          </button>;
        })}
      </section>
      </>}
      {operationsSection === "automations" && <>
      <section className="os-panel playbook-operations-panel">
        <div className="agent-operations-heading">
          <PanelTitle eyebrow="PRODUCTION AUTOMATIONS" title="Tattoo workflows run as observable playbooks" />
          <p>Each live event can start a bounded sequence of internal specialist tasks. Every run is idempotent, evidence-linked, and unable to message, schedule, publish, or charge without the existing approval and connector gates.</p>
        </div>
        <div className="playbook-grid">
          {data.automationPlaybooks.map((playbook) => {
            const triggers = (() => { try { return JSON.parse(playbook.triggerEventsJson) as string[]; } catch { return []; } })();
            const steps = (() => { try { return JSON.parse(playbook.stepsJson) as Array<{ title: string }>; } catch { return []; } })();
            return <article key={playbook.id} className={cn(!playbook.enabled && "playbook-disabled")}>
              <header><div><strong>{playbook.displayName}</strong><small>{steps.length} specialist step{steps.length === 1 ? "" : "s"}</small></div><span className={cn("agent-task-status", playbook.enabled ? "succeeded" : "cancelled")}>{playbook.enabled ? "active" : "paused"}</span></header>
              <p>{playbook.description}</p>
              <div className="playbook-triggers">{triggers.map((trigger) => <span key={trigger}>{trigger.replaceAll("_", " ")}</span>)}</div>
              <footer><small>{playbook.lastTriggeredAt ? `Last run ${formatDate(playbook.lastTriggeredAt, true)}` : "Waiting for its first matching event"}</small><div><button className="text-button" type="button" disabled={saving} onClick={() => void managePlaybook({ action: "toggle", playbookKey: playbook.playbookKey, enabled: !playbook.enabled }, `${playbook.displayName} ${playbook.enabled ? "paused" : "enabled"}.`)}>{playbook.enabled ? "Pause" : "Enable"}</button><button className="outline-button" type="button" disabled={saving || !playbook.enabled} onClick={() => void managePlaybook({ action: "run", playbookKey: playbook.playbookKey }, `${playbook.displayName} started and recorded.`)}><WandSparkles size={14} /> Run now</button></div></footer>
            </article>;
          })}
        </div>
        <div className="playbook-run-ledger">
          <div className="capture-stream-heading"><strong>Recent playbook runs</strong><small>{data.automationPlaybookRuns.length} recorded</small></div>
          {data.automationPlaybookRuns.length ? data.automationPlaybookRuns.slice(0, 8).map((run) => {
            const playbook = data.automationPlaybooks.find((item) => item.playbookKey === run.playbookKey);
            const steps = data.automationPlaybookSteps.filter((step) => step.runId === run.id).sort((a, b) => a.sequence - b.sequence);
            return <article key={run.id}>
              <div className="playbook-run-summary"><span className={cn("agent-task-status", run.status)}>{run.status.replaceAll("_", " ")}</span><div><strong>{playbook?.displayName || run.playbookKey.replaceAll("_", " ")}</strong><small>{run.sourceEventType.replaceAll("_", " ")} · {formatDate(run.startedAt, true)}</small><p>{run.summary || `${run.completedSteps} of ${run.totalSteps} steps completed.`}</p></div></div>
              <div className="playbook-step-list">{steps.map((step) => <span key={step.id} title={step.errorSummary || step.resultSummary || step.title}><CheckCircle2 size={13} /><b>{step.title}</b><small>{step.status.replaceAll("_", " ")}</small></span>)}</div>
            </article>;
          }) : <EmptyState icon={WandSparkles} title="Playbooks are armed" body="A matching inquiry, payment, appointment, session, healing, completion, or manual daily-brief event will create the first recorded run." />}
        </div>
      </section>
      <section className="os-panel tool-authority-panel">
        <div className="agent-operations-heading">
          <PanelTitle eyebrow="TOOL + AUTHORITY REGISTRY" title="Every capability has a locked operating boundary" />
          <p>Legacy denies unknown tools by default. Registered tools declare their inputs, outputs, side effects, approval class, retry policy, audit behavior, agent access, and connector before any AI run may use them.</p>
        </div>
        <div className="authority-summary" aria-label="Authority class summary">
          {(["AUTO", "AUTO_WITH_LOG", "ASK", "OWNER_ONLY", "DENIED"] as const).map((authorityClass) => <div key={authorityClass}><strong>{data.toolDefinitions.filter((tool) => tool.approvalClass === authorityClass).length}</strong><span>{authorityClass.replaceAll("_", " ")}</span></div>)}
        </div>
        <div className="tool-registry-grid">
          {data.toolDefinitions.map((tool) => {
            const retry = (() => { try { return JSON.parse(tool.retryPolicyJson) as { maxAttempts?: number }; } catch { return {}; } })();
            const agents = (() => { try { return JSON.parse(tool.allowedAgentsJson) as string[]; } catch { return []; } })();
            return <article key={tool.id}>
              <header><div><strong>{tool.displayName}</strong><small>{tool.toolKey}</small></div><span className={cn("authority-class", tool.approvalClass.toLowerCase())}>{tool.approvalClass.replaceAll("_", " ")}</span></header>
              <p>{tool.description}</p>
              <footer><span>{tool.sideEffectClass.replaceAll("_", " ")}</span><span>{agents.length ? `${agents.length} staff role${agents.length === 1 ? "" : "s"}` : "Owner only"}</span><span>{retry.maxAttempts || 0} retries</span>{tool.connectorKey && <span>{tool.connectorKey.replaceAll("_", " ")}</span>}</footer>
            </article>;
          })}
        </div>
        <div className="authority-ledger">
          <div className="capture-stream-heading"><strong>Recent authority decisions</strong><small>{data.authorityDecisions.length} recorded</small></div>
          {data.authorityDecisions.length ? data.authorityDecisions.slice(0, 8).map((decision) => <article key={decision.id}><span className={cn("authority-decision", decision.decision)}>{decision.decision.replaceAll("_", " ")}</span><div><strong>{data.toolDefinitions.find((tool) => tool.toolKey === decision.toolKey)?.displayName || decision.toolKey.replaceAll("_", " ")}</strong><small>{decision.actorId || decision.actorType} · {formatDate(decision.evaluatedAt, true)}</small><p>{decision.reason}</p></div></article>) : <EmptyState icon={ShieldCheck} title="No authority decisions yet" body="The first delegated task or connector action will create an inspectable policy decision here." />}
        </div>
      </section>
      </>}
      {operationsSection === "intelligence" && <>
      <section className="os-panel agent-operations-panel">
        <div className="agent-operations-heading">
          <PanelTitle eyebrow="SPECIALIST INTELLIGENCE" title="Eight domains, one professional state" />
          <p>Each specialist calculates facts from the same authorized Legacy records, then returns findings, evidence, confidence, limitations, and safe internal recommendations. Test and archived projects never enter these evaluations.</p>
        </div>
        <form className="specialist-run-form" onSubmit={runSpecialistIntelligence}>
          <label><span>INTELLIGENCE DOMAIN</span><select name="domain" defaultValue="all"><option value="all">Run all eight specialists</option>{specialistDomains.map(([key, label]) => <option key={key} value={key}>{label} Intelligence</option>)}</select></label>
          <label><span>PROJECT SCOPE</span><select name="projectId" defaultValue=""><option value="">All operational projects</option>{data.projects.filter((project) => !project.archivedAt && !project.isTest).map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label>
          <label><span>CLIENT SCOPE</span><select name="clientId" defaultValue=""><option value="">All active clients</option>{data.clients.filter((client) => !client.archivedAt).map((client) => <option key={client.id} value={client.id}>{fullName(client)}</option>)}</select></label>
          <label className="specialist-objective"><span>OBJECTIVE</span><input name="objective" maxLength={500} defaultValue="Review current readiness, risks, opportunities, and the next safe internal action." /></label>
          <button className="gold-button" disabled={saving}><Sparkles size={15} /> {saving ? "Evaluating…" : "Run intelligence"}</button>
        </form>
        <div className="specialist-domain-grid">
          {specialistDomains.map(([domain, label]) => {
            const evaluation = data.specialistEvaluations.find((item) => item.domain === domain);
            const findings = (() => { try { return JSON.parse(evaluation?.findingsJson || "[]") as Array<{ severity: string; title: string; detail: string; evidenceRefs: string[] }>; } catch { return []; } })();
            const recommendations = (() => { try { return JSON.parse(evaluation?.recommendationsJson || "[]") as Array<{ title: string; rationale: string }>; } catch { return []; } })();
            const facts = (() => { try { return Object.entries(JSON.parse(evaluation?.factsJson || "{}") as Record<string, unknown>); } catch { return []; } })();
            return <article key={domain} className={cn("specialist-domain-card", evaluation && "evaluated")}>
              <header><div><strong>{label} Intelligence</strong><small>{evaluation ? `${evaluation.provider} · ${Math.round(evaluation.confidenceBps / 100)}% confidence` : "Ready for first evaluation"}</small></div><span className={cn("status-dot", !evaluation && "warning")} /></header>
              <p>{evaluation?.summary || "Run this bounded specialist against the current authorized professional state."}</p>
              {facts.length > 0 && <div className="specialist-facts">{facts.slice(0, 6).map(([key, value]) => <span key={key}><strong>{String(value)}</strong><small>{key.replace(/([A-Z])/g, " $1").toLowerCase()}</small></span>)}</div>}
              {findings.length > 0 && <div className="specialist-findings">{findings.slice(0, 3).map((finding, index) => <div key={`${finding.title}-${index}`}><i className={finding.severity} /><span><strong>{finding.title}</strong><small>{finding.detail}</small></span></div>)}</div>}
              <footer><span>{evaluation ? `${findings.length} finding${findings.length === 1 ? "" : "s"} · ${(() => { try { return (JSON.parse(evaluation.evidenceJson) as string[]).length; } catch { return 0; } })()} evidence refs` : "No fabricated output"}</span>{recommendations[0] && <strong>Next: {recommendations[0].title}</strong>}</footer>
            </article>;
          })}
        </div>
      </section>
      </>}
      {operationsSection === "workforce" && <>
      <section className="os-panel agent-operations-panel">
        <div className="agent-operations-heading">
          <PanelTitle eyebrow="AI STAFF OPERATIONS" title="Delegate with evidence, scope, and control" />
          <p>The Chief of Staff routes internal work automatically. Client messages, publishing, scheduling changes, and financial actions stop at an owner approval and connector boundary.</p>
        </div>
        <div className="agent-roster" aria-label="AI staff roster">
          {data.agentDefinitions.map((agent) => (
            <article key={agent.id}>
              <span className={cn("status-dot", agent.status !== "active" && "warning")} />
              <div><strong>{agent.displayName}</strong><small>{agent.role}</small></div>
              <p>{agent.purpose}</p>
              <span className="agent-policy-chip">{agent.autonomyPolicy.replaceAll("_", " ")}</span>
            </article>
          ))}
        </div>
        <form className="agent-task-form" onSubmit={createAgentTask}>
          <label><span>TASK TYPE</span><select name="taskType" defaultValue="workflow_review"><option value="workflow_review">Workflow review</option><option value="client_follow_up_draft">Client follow-up draft</option><option value="design_brief">Design brief</option><option value="schedule_plan">Schedule plan</option><option value="payment_review">Payment review</option><option value="content_brief">Content brief</option><option value="knowledge_review">Knowledge review</option><option value="outcome_analysis">Outcome analysis</option></select></label>
          <label><span>PROJECT SCOPE</span><select name="projectId" defaultValue=""><option value="">Workspace only</option>{data.projects.filter((project) => !project.archivedAt).map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label>
          <label><span>CLIENT SCOPE</span><select name="clientId" defaultValue=""><option value="">No client</option>{data.clients.filter((client) => !client.archivedAt).map((client) => <option key={client.id} value={client.id}>{fullName(client)}</option>)}</select></label>
          <label><span>ACTION BOUNDARY</span><select name="requestedAction" defaultValue="analyze_internal"><option value="analyze_internal">Internal analysis</option><option value="draft_internal">Prepare a draft</option><option value="send_client_message">Send portal message (approval required)</option><option value="send_client_email">Send Gmail email (approval + connection)</option><option value="schedule_appointment">Schedule appointment (approval + Calendar mirror)</option><option value="publish_content">Publish content (approval only; no adapter)</option><option value="charge_payment">Charge payment (disabled; client Checkout only)</option></select></label>
          <label><span>PRIORITY</span><select name="priority" defaultValue="50"><option value="30">Low</option><option value="50">Normal</option><option value="75">High</option><option value="95">Urgent</option></select></label>
          <label className="agent-task-title"><span>TITLE</span><input name="title" required maxLength={180} placeholder="What outcome should the staff produce?" /></label>
          <label className="agent-task-instruction"><span>INSTRUCTION</span><textarea name="instructionSummary" required rows={2} maxLength={1000} placeholder="Give the task its purpose and expected output. The system will attach only relevant scoped memory." /></label>
          <label className="agent-action-message"><span>APPROVED MESSAGE BODY</span><textarea name="messageBody" rows={2} maxLength={2000} placeholder="Required only when the action boundary is Send client message." /></label>
          <label><span>EMAIL SUBJECT</span><input name="subject" maxLength={200} placeholder="Required only for Gmail delivery" /></label>
          <label><span>APPOINTMENT START</span><input name="startsAt" type="datetime-local" /></label>
          <label><span>APPOINTMENT END</span><input name="endsAt" type="datetime-local" /></label>
          <label><span>APPOINTMENT TYPE</span><select name="appointmentType" defaultValue="session"><option value="consult">Consult</option><option value="design_review">Design review</option><option value="session">Tattoo session</option><option value="healing_review">Healing review</option></select></label>
          <button className="gold-button" disabled={saving}><Bot size={15} /> {saving ? "Routing…" : "Delegate task"}</button>
        </form>
        <div className="agent-task-ledger">
          <div className="capture-stream-heading"><strong>Delegation ledger</strong><small>{data.agentTasks.length} task{data.agentTasks.length === 1 ? "" : "s"}</small></div>
          {data.agentTasks.length ? data.agentTasks.slice(0, 12).map((task) => {
            const agent = data.agentDefinitions.find((item) => item.agentKey === task.agentKey);
            const approval = task.approvalId ? data.approvals.find((item) => item.id === task.approvalId) : null;
            const contextCount = (() => { try { return (JSON.parse(task.contextMemoryIdsJson) as string[]).length; } catch { return 0; } })();
            return <article key={task.id}>
              <div className="agent-task-main"><span className={cn("agent-task-status", task.status)}>{task.status.replaceAll("_", " ")}</span><div><strong>{task.title}</strong><small>{agent?.displayName || task.agentKey.replaceAll("_", " ")} · priority {task.priority} · {contextCount} scoped memories · {formatDate(task.createdAt, true)}</small><p>{task.resultSummary || task.instructionSummary}</p>{task.errorSummary && <p className="error-copy">{task.errorSummary}</p>}</div></div>
              <div className="agent-task-controls">
                {task.approvalRequired && <span className="agent-approval-state"><ShieldCheck size={14} /> {approval?.status || "approval missing"}</span>}
                {["held_for_approval", "queued", "failed"].includes(task.status) && <button className="outline-button" type="button" disabled={saving} onClick={() => void updateAgentTask(task.id, task.status === "failed" ? "retry" : "run")}>{task.status === "failed" ? "Retry" : "Run"}</button>}
                {task.status === "ready_for_connector" && (["send_client_message", "send_client_email", "schedule_appointment"].includes(approval?.actionType || "") ? <button className="gold-button" type="button" disabled={saving} onClick={() => void executeConnectorTask(task.id)}>Execute connector</button> : <button className="outline-button" type="button" disabled>Connector unavailable</button>)}
                {!['succeeded', 'cancelled', 'ready_for_connector'].includes(task.status) && <button className="text-button" type="button" disabled={saving} onClick={() => void updateAgentTask(task.id, "cancel")}>Cancel</button>}
              </div>
            </article>;
          }) : <EmptyState icon={Bot} title="The AI staff is ready" body="Delegate a task or create new workspace activity. Every assignment will be routed, scoped, and recorded here." />}
        </div>
        <div className="connector-operations">
          <div className="capture-stream-heading"><strong>Secure connector gateway</strong><small>Least-privilege adapters · no credentials stored here</small></div>
          <div className="connector-grid">
            {data.connectorDefinitions.map((connector) => (
              <article key={connector.id}>
                <div><span className={cn("status-dot", connector.status !== "available" && "warning")} /><strong>{connector.displayName}</strong></div>
                <small>{connector.category} · {connector.healthStatus.replaceAll("_", " ")}</small>
                <p>{connector.description}</p>
                {data.connectorAccounts.find((account) => account.connectorKey === connector.connectorKey && account.status === "connected")?.accountEmail && <span className="connector-account-email">{data.connectorAccounts.find((account) => account.connectorKey === connector.connectorKey && account.status === "connected")?.accountEmail}</span>}
                {(["gmail", "google_calendar"].includes(connector.connectorKey)) && <button className={connector.status === "available" ? "text-button" : "outline-button"} type="button" disabled={saving} onClick={() => void manageGoogleConnector(connector.connectorKey as "gmail" | "google_calendar", connector.status === "available")}>{connector.status === "available" ? "Disconnect" : "Connect Google"}</button>}
                <footer><span>{connector.status.replaceAll("_", " ")}</span><span>{connector.credentialState.replaceAll("_", " ")}</span></footer>
              </article>
            ))}
          </div>
          <div className="connector-execution-list">
            {data.connectorExecutions.slice(0, 8).map((execution) => (
              <article key={execution.id}><span className={cn("agent-task-status", execution.status)}>{execution.status}</span><div><strong>{data.connectorDefinitions.find((connector) => connector.connectorKey === execution.connectorKey)?.displayName || execution.connectorKey} · {execution.actionType.replaceAll("_", " ")}</strong><small>{formatDate(execution.createdAt, true)} · attempt {execution.attempts}</small><p>{execution.resultSummary || execution.errorSummary || "Execution recorded."}</p></div></article>
            ))}
            {!data.connectorExecutions.length && <p className="connector-empty">Connector activity will appear here after an approved action, social synchronization, or client checkout.</p>}
          </div>
        </div>
      </section>
      </>}
      {operationsSection === "learning" && <>
      <section className="os-panel universal-capture-panel">
        <div className="universal-capture-intro">
          <PanelTitle eyebrow="UNIVERSAL CAPTURE" title="One stream for everything the studio learns" />
          <p>Owner notes, client activity, workflow changes, uploads, AI events, and consented external evidence are normalized here and connected to their source records.</p>
        </div>
        <form className="capture-note-form" onSubmit={captureNote}>
          <label><span>TITLE</span><input name="title" required maxLength={240} placeholder="What should Legacy OS remember?" /></label>
          <label><span>CONNECT TO PROJECT</span><select name="projectId" defaultValue=""><option value="">Workspace-wide note</option>{data.projects.filter((project) => !project.archivedAt).map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label>
          <label className="capture-note-body"><span>NOTE</span><textarea name="body" required maxLength={4000} rows={3} placeholder="Capture an observation, preference, technique lesson, decision, or follow-up." /></label>
          <button className="gold-button" disabled={saving}><BrainCircuit size={15} /> {saving ? "Capturing…" : "Capture and connect"}</button>
        </form>
        <div className="capture-stream">
          <div className="capture-stream-heading"><strong>Recent normalized signals</strong><small>{data.captureEvents.length} loaded</small></div>
          {data.captureEvents.length ? data.captureEvents.slice(0, 12).map((item) => {
            const project = data.projects.find((candidate) => candidate.id === item.projectId);
            return <article key={item.id}>
              <span className={cn("capture-channel", item.channel)}>{item.channel}</span>
              <div><strong>{item.title}</strong><small>{project?.title || item.sourceType.replaceAll("_", " ")} · {formatDate(item.occurredAt, true)}</small>{item.summary && <p>{item.summary}</p>}</div>
              <span className="capture-status"><CheckCircle2 size={14} /> {item.status}</span>
            </article>;
          }) : <EmptyState icon={Inbox} title="The capture stream is ready" body="New owner, client, workflow, upload, AI, and consented external events will appear here without copying private raw content." />}
        </div>
      </section>
      <div className="operations-grid lifecycle-operations-grid">
        <section className="os-panel lifecycle-control-panel">
          <PanelTitle eyebrow="TATTOO SESSION CONTROL" title="Plan and complete real sessions" />
          <form className="modal-form" onSubmit={createSession}>
            <div className="field-row">
              <label><span>PROJECT</span><select name="projectId" required defaultValue=""><option value="" disabled>Select project</option>{data.projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label>
              <label><span>SESSION NUMBER</span><input name="sessionNumber" type="number" min="1" defaultValue="1" required /></label>
            </div>
            <div className="field-row">
              <label><span>START TIME</span><input name="startedAt" type="datetime-local" /></label>
              <label><span>CLIENT SUMMARY</span><input name="clientVisibleSummary" placeholder="What the client may see" /></label>
            </div>
            <label><span>PRIVATE TECHNIQUE NOTES</span><textarea name="techniqueNotes" rows={2} placeholder="Owner-only setup and execution notes" /></label>
            <button className="gold-button wide" disabled={saving || !data.projects.length}><CalendarDays size={15} /> Plan tattoo session</button>
          </form>
          <div className="lifecycle-record-list">
            {data.tattooSessions.length ? data.tattooSessions.map((session) => {
              const project = data.projects.find((item) => item.id === session.projectId);
              return <article key={session.id}><div><strong>{project?.title || "Project"} · Session {session.sessionNumber}</strong><small>{session.status} · {formatDate(session.startedAt, true)}</small><p>{session.clientVisibleSummary || "No client-facing summary yet."}</p></div>{session.status !== "completed" && <button className="outline-button" disabled={saving} onClick={() => void lifecycleAction({ action: "complete_session", sessionId: session.id, endedAt: new Date().toISOString() }, "Session completed; day 3, 7, 14, and 30 healing check-ins were scheduled.")}><CheckCircle2 size={14} /> Complete</button>}</article>;
            }) : <EmptyState icon={CalendarDays} title="No tattoo sessions yet" body="Plan the first session after the design and client approval are ready." />}
          </div>
        </section>
        <section className="os-panel lifecycle-control-panel">
          <PanelTitle eyebrow="HEALING REVIEW" title="Client follow-ups requiring attention" />
          <div className="lifecycle-record-list">
            {data.healingCheckins.filter((item) => ["submitted", "needs_attention"].includes(item.status)).map((checkin) => {
              const project = data.projects.find((item) => item.id === checkin.projectId);
              return <article key={checkin.id}><div><strong>{project?.title || "Project"} · Day {checkin.checkpointDay}</strong><small>{checkin.status} · rating {checkin.progressRating || "—"}/5</small><p>{checkin.clientNotes || "No client notes."}</p></div><button className="outline-button" disabled={saving} onClick={() => { const response = window.prompt("Response visible to the client"); if (response?.trim()) void lifecycleAction({ action: "review_healing", healingCheckinId: checkin.id, ownerResponse: response }, "Healing check-in reviewed and outcome evidence captured."); }}><MessageSquareText size={14} /> Review</button></article>;
            })}
            {!data.healingCheckins.some((item) => ["submitted", "needs_attention"].includes(item.status)) && <EmptyState icon={HeartHandshake} title="No healing reviews waiting" body="Submitted client check-ins appear here; flagged concerns are prioritized without making medical diagnoses." />}
          </div>
        </section>
      </div>
      <section className="os-panel craft-intelligence-panel">
        <div className="craft-intelligence-heading">
          <div>
            <PanelTitle eyebrow="PROFESSIONAL CRAFT INTELLIGENCE" title="Connect session conditions to healed results" />
            <p>Legacy learns only from completed, real projects with a sufficiently complete session record and a late-healing or healed owner assessment. Associations never replace Joshua’s professional judgment.</p>
          </div>
          <button className="gold-button" type="button" disabled={saving} onClick={() => void runCraftAnalysis()}><BrainCircuit size={15} /> {saving ? "Evaluating…" : "Evaluate craft evidence"}</button>
        </div>
        <div className="craft-threshold-grid">
          <span><strong>{data.craftIntelligence.thresholds.completedProjects}+</strong><small>completed projects</small></span>
          <span><strong>{data.craftIntelligence.thresholds.distinctClients}+</strong><small>distinct clients</small></span>
          <span><strong>{Math.round(data.craftIntelligence.thresholds.effectBps / 100)}%+</strong><small>observed lift</small></span>
          <span><strong>{Math.round(data.craftIntelligence.thresholds.confidenceBps / 100)}%+</strong><small>minimum confidence</small></span>
          <span><strong>{Math.round(data.craftIntelligence.thresholds.recordCompletenessBps / 100)}%+</strong><small>record completeness</small></span>
        </div>
        <div className="craft-capture-grid">
          <form className="modal-form craft-evidence-form" onSubmit={saveSessionCraft}>
            <header><strong>Session conditions</strong><small>Private operational evidence</small></header>
            <label><span>COMPLETED SESSION</span><select name="sessionId" required defaultValue=""><option value="" disabled>Select completed session</option>{completedCraftSessions.map((session) => <option key={session.id} value={session.id}>{data.projects.find((project) => project.id === session.projectId)?.title || "Project"} · Session {session.sessionNumber}</option>)}</select></label>
            <div className="field-row">
              <label><span>MACHINE</span><input name="machineName" required placeholder="Machine name or model" /></label>
              <label><span>MACHINE TYPE</span><select name="machineType" required defaultValue=""><option value="" disabled>Select type</option><option value="rotary_pen">Rotary pen</option><option value="rotary_direct_drive">Rotary direct drive</option><option value="coil">Coil</option><option value="other">Other</option></select></label>
            </div>
            <div className="field-row">
              <label><span>NEEDLE GROUPINGS</span><input name="needleGroupings" required placeholder="3RL, 9CM" /></label>
              <label><span>INK / WASH</span><input name="inkWash" required placeholder="Black, medium grey wash" /></label>
            </div>
            <div className="field-row">
              <label><span>VOLTAGE MIN</span><input name="voltageMin" required type="number" min="3" max="15" step="0.1" placeholder="7.5" /></label>
              <label><span>VOLTAGE MAX</span><input name="voltageMax" required type="number" min="3" max="15" step="0.1" placeholder="8.5" /></label>
            </div>
            <div className="field-row">
              <label><span>TECHNIQUES</span><input name="techniques" required placeholder="Smooth shading, whip shading" /></label>
              <label><span>BODY AREA</span><input name="bodyArea" required placeholder="Outer forearm" /></label>
            </div>
            <div className="field-row">
              <label><span>SKIN RESPONSE</span><select name="skinResponse" required defaultValue=""><option value="" disabled>Select observed response</option><option value="low_trauma">Low trauma</option><option value="expected">Expected response</option><option value="reactive">Reactive</option><option value="highly_reactive">Highly reactive</option></select></label>
              <label><span>FRESH RESULT</span><select name="freshOutcomeRating" required defaultValue=""><option value="" disabled>Rate 1–5</option>{[1,2,3,4,5].map((rating) => <option key={rating} value={rating}>{rating} / 5</option>)}</select></label>
            </div>
            <label><span>CLIENT RESPONSE</span><input name="clientResponse" placeholder="Observed client response after the session" /></label>
            <label><span>JOSHUA&apos;S ASSESSMENT</span><textarea name="ownerAssessment" rows={2} placeholder="What worked, what did not, and what to watch while healing" /></label>
            <button className="outline-button wide" disabled={saving || !completedCraftSessions.length}><Save size={15} /> Save session evidence</button>
          </form>
          <form className="modal-form craft-evidence-form" onSubmit={saveHealingAssessment}>
            <header><strong>Healing outcome</strong><small>Owner-observed evidence, not medical advice</small></header>
            <label><span>CLIENT CHECK-IN</span><select name="checkinId" required defaultValue=""><option value="" disabled>Select submitted check-in</option>{assessableHealing.map((checkin) => <option key={checkin.id} value={checkin.id}>{data.projects.find((project) => project.id === checkin.projectId)?.title || "Project"} · Day {checkin.checkpointDay}</option>)}</select></label>
            <div className="field-row">
              <label><span>HEALING PHASE</span><select name="healingPhase" required defaultValue=""><option value="" disabled>Select phase</option><option value="early_healing">Early healing</option><option value="late_healing">Late healing</option><option value="healed">Healed</option></select></label>
              <label><span>OVERALL OUTCOME</span><select name="healedOutcomeRating" required defaultValue=""><option value="" disabled>Rate 1–5</option>{[1,2,3,4,5].map((rating) => <option key={rating} value={rating}>{rating} / 5</option>)}</select></label>
            </div>
            <div className="craft-rating-grid">
              {[['retentionRating','Retention'],['saturationRating','Saturation'],['lineQualityRating','Line quality'],['smoothnessRating','Smoothness']].map(([name, label]) => <label key={name}><span>{label.toUpperCase()}</span><select name={name} defaultValue=""><option value="">Not rated</option>{[1,2,3,4,5].map((rating) => <option key={rating} value={rating}>{rating}</option>)}</select></label>)}
            </div>
            <label><span>JOSHUA&apos;S ASSESSMENT</span><textarea name="ownerAssessment" required rows={3} placeholder="Describe retention, settling, consistency, and any limitations in the evidence" /></label>
            <label><span>CLIENT FEEDBACK SUMMARY</span><input name="clientFeedbackSummary" placeholder="Optional summary of the client's saved feedback" /></label>
            <label className="craft-checkbox"><input name="touchupRequired" type="checkbox" /><span>Touch-up appears required</span></label>
            <button className="outline-button wide" disabled={saving || !assessableHealing.length}><HeartHandshake size={15} /> Save healed outcome</button>
          </form>
        </div>
        <div className="craft-pattern-ledger">
          <div className="capture-stream-heading"><strong>Evidence-backed setup patterns</strong><small>{data.craftIntelligence.patterns.length} tracked · {data.craftIntelligence.patterns.filter((pattern) => pattern.status === "active").length} active</small></div>
          {data.craftIntelligence.patterns.length ? <div className="craft-pattern-grid">{data.craftIntelligence.patterns.map((pattern) => <article key={pattern.id}>
            <header><span className={cn("agent-task-status", pattern.status === "active" ? "succeeded" : "queued")}>{pattern.status}</span><strong>{Math.round(pattern.confidenceBps / 100)}%</strong></header>
            <h3>{pattern.name}</h3><p>{pattern.description}</p><small>{pattern.whyItMatters}</small>
            <footer><span>{pattern.supportCount} observations</span><span>{pattern.distinctProjects} projects</span><span>{pattern.distinctClients} clients</span></footer>
          </article>)}</div> : <EmptyState icon={BrainCircuit} title="Craft learning is waiting for healed evidence" body="Complete real sessions, capture their equipment and technique conditions, then add Joshua’s late-healing or healed assessment. Candidate patterns appear before recommendations are allowed." />}
          {data.craftIntelligence.recommendations.some((item) => item.status === "proposed") && <div className="craft-recommendation-list">
            <div className="capture-stream-heading"><strong>Owner review suggestions</strong><small>Internal guidance only</small></div>
            {data.craftIntelligence.recommendations.filter((item) => item.status === "proposed").map((item) => <article key={item.id}><ShieldCheck size={17} /><div><strong>{item.title}</strong><p>{item.rationale}</p><small>{Math.round(item.confidenceBps / 100)}% confidence · Joshua decides whether it applies</small></div></article>)}
          </div>}
          {data.craftIntelligence.runs[0] && <div className="craft-latest-run"><ShieldCheck size={15} /><span><strong>Latest evaluation</strong><small>{data.craftIntelligence.runs[0].summary} · {formatDate(data.craftIntelligence.runs[0].completedAt, true)}</small></span></div>}
        </div>
      </section>
      <section className="os-panel lifecycle-content-panel">
        <PanelTitle eyebrow="CONTENT SAFETY GATE" title="Draft from eligible media, then approve manually" />
        <form className="modal-form lifecycle-content-form" onSubmit={createContentCandidate}>
          <label><span>ELIGIBLE SOURCE</span><select name="sourceAssetId" required defaultValue=""><option value="" disabled>Select rights-cleared media</option>{eligibleAssets.map((asset) => <option key={asset.id} value={asset.id}>{asset.originalName}</option>)}</select></label>
          <label><span>FORMAT</span><select name="format" defaultValue="portfolio"><option value="portfolio">Portfolio</option><option value="post">Post</option><option value="reel">Reel</option><option value="story">Story</option></select></label>
          <label><span>TITLE</span><input name="title" required placeholder="Finished tattoo feature" /></label>
          <label><span>CAPTION DRAFT</span><input name="captionDraft" placeholder="Draft only—publishing is never automatic" /></label>
          <button className="gold-button" disabled={saving || !eligibleAssets.length}><Sparkles size={15} /> Create approval-gated draft</button>
        </form>
        <div className="lifecycle-record-list content-candidate-list">
          {data.contentCandidates.map((candidate) => <article key={candidate.id}><div><strong>{candidate.title}</strong><small>{candidate.format} · {candidate.status.replaceAll("_", " ")}</small><p>{candidate.captionDraft || "No caption drafted."}</p></div>{candidate.status === "approval_required" && <button className="outline-button" disabled={saving} onClick={() => void lifecycleAction({ action: "approve_content_candidate", contentCandidateId: candidate.id }, "Content draft approved. No publishing action was performed.")}><ShieldCheck size={14} /> Approve draft</button>}</article>)}
          {!data.contentCandidates.length && <EmptyState icon={FileText} title="No content candidates" body="Only rights-cleared, client-consented assets can become drafts. Publication remains a separate approval-gated action." />}
        </div>
      </section>
      </>}
      {operationsSection === "activity" && <>
      <div className="operations-grid">
        <section className="os-panel table-panel">
          <PanelTitle eyebrow="AI RUN LEDGER" title="Model activity" />
          {data.aiRuns.length ? (
            <div className="data-table runs-table">
              <div className="table-row table-head"><span>Agent</span><span>Purpose</span><span>Engine</span><span>Latency</span><span>Confidence</span><span>Status</span></div>
              {data.aiRuns.map((run) => (
                <div className="table-row" key={run.id}>
                  <span><strong>{run.agentName}</strong><small>{formatDate(run.createdAt, true)}</small></span>
                  <span>{run.purpose}</span>
                  <span><strong>{run.provider}</strong><small>{run.model}</small></span>
                  <span>{run.latencyMs == null ? "—" : `${run.latencyMs} ms`}</span>
                  <span>{run.confidenceBps == null ? "—" : `${Math.round(run.confidenceBps / 100)}%`}</span>
                  <span><b className={cn("status-dot", run.status !== "succeeded" && "warning")} /> {run.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={Bot} title="No AI runs yet" body="Generate the first Chief of Staff briefing to create a fully observable run." />
          )}
        </section>
        <aside className="os-panel audit-feed">
          <PanelTitle eyebrow="AUDIT TRAIL" title="Recent changes" />
          {data.auditEvents.length ? data.auditEvents.slice(0, 12).map((event) => (
            <article key={event.id}>
              <span className="audit-node" />
              <div><strong>{event.action.replaceAll(".", " ")}</strong><p>{event.actorType} · {event.outcome}</p><small>{formatDate(event.occurredAt, true)}</small></div>
            </article>
          )) : (
            <EmptyState icon={Activity} title="Audit trail is empty" body="Workspace actions will appear here automatically." />
          )}
        </aside>
      </div>
      </>}
    </section>
  );
}

function AnalyticsView({ data, onNavigate }: { data: WorkspaceData; onNavigate: (target: NavigationTarget) => void }) {
  type AnalyticsRecord = {
    id: string;
    title: string;
    detail: string;
    meta: string;
    target: NavigationTarget;
  };
  type AnalyticsMetric = {
    id: string;
    lens: "overview" | "financial" | "workflow";
    label: string;
    value: string | number;
    detail: string;
    icon: LucideIcon;
    records: AnalyticsRecord[];
  };
  const [lens, setLens] = useState<AnalyticsMetric["lens"]>("overview");
  const [selectedMetricId, setSelectedMetricId] = useState("active_projects");
  const operationalProjects = data.projects.filter((project) => !project.isTest && !project.archivedAt);
  const operationalProjectIds = new Set(operationalProjects.map((project) => project.id));
  const operationalClients = data.clients.filter((client) => !client.archivedAt);
  const operationalAppointments = data.appointments.filter((item) => !item.projectId || operationalProjectIds.has(item.projectId));
  const operationalApprovals = data.approvals.filter((item) => !item.projectId || operationalProjectIds.has(item.projectId));
  const operationalPayments = data.paymentRequests.filter((item) => operationalProjectIds.has(item.projectId));
  const operationalSessions = data.tattooSessions.filter((item) => operationalProjectIds.has(item.projectId));
  const operationalHealing = data.healingCheckins.filter((item) => operationalProjectIds.has(item.projectId));
  const operationalContent = data.contentCandidates.filter((item) => operationalProjectIds.has(item.projectId));
  const clientName = (clientId?: string | null) => fullName(data.clients.find((client) => client.id === clientId));
  const projectName = (projectId?: string | null) => data.projects.find((project) => project.id === projectId)?.title || "Unlinked project";
  const projectRecords = (projects: ProjectRecord[]): AnalyticsRecord[] => projects.map((project) => ({
    id: project.id,
    title: project.title,
    detail: `${projectClient(project)} · ${project.lifecyclePhase}`,
    meta: project.nextAction || project.status,
    target: { view: "projects", id: project.id },
  }));
  const metrics: AnalyticsMetric[] = [
    {
      id: "active_projects", lens: "overview", label: "ACTIVE PROJECTS", value: operationalProjects.length,
      detail: "Real, non-archived projects", icon: FolderKanban, records: projectRecords(operationalProjects),
    },
    {
      id: "active_clients", lens: "overview", label: "ACTIVE CLIENTS", value: operationalClients.length,
      detail: "Non-archived relationship records", icon: UsersRound,
      records: operationalClients.map((client) => ({ id: client.id, title: fullName(client), detail: client.email || "No email saved", meta: client.status, target: { view: "clients", id: client.id } })),
    },
    {
      id: "appointments", lens: "overview", label: "APPOINTMENTS", value: operationalAppointments.length,
      detail: "Operational schedule commitments", icon: CalendarDays,
      records: operationalAppointments.map((item) => ({ id: item.id, title: item.appointmentType, detail: `${clientName(item.clientId)} · ${formatDate(item.startsAt, true)}`, meta: `${projectName(item.projectId)} · ${item.status}`, target: { view: "calendar", id: item.id } })),
    },
    {
      id: "pending_approvals", lens: "overview", label: "PENDING APPROVALS", value: operationalApprovals.filter((item) => item.status === "pending").length,
      detail: "Decisions currently waiting", icon: ShieldCheck,
      records: operationalApprovals.filter((item) => item.status === "pending").map((item) => ({ id: item.id, title: item.subject, detail: projectName(item.projectId), meta: `${item.category} · ${item.riskLevel} risk`, target: { view: "design", id: item.projectId || undefined } })),
    },
    {
      id: "collected", lens: "financial", label: "COLLECTED", value: formatMoney(operationalPayments.reduce((sum, item) => sum + item.amountPaidCents - item.amountRefundedCents, 0)),
      detail: "Verified payments after refunds", icon: CircleDollarSign,
      records: operationalPayments.filter((item) => item.amountPaidCents > 0).map((item) => ({ id: item.id, title: item.title, detail: `${clientName(item.clientId)} · ${formatMoney(item.amountPaidCents - item.amountRefundedCents)}`, meta: `${projectName(item.projectId)} · ${item.status}`, target: { view: "finances", id: item.id } })),
    },
    {
      id: "outstanding", lens: "financial", label: "OUTSTANDING", value: formatMoney(operationalPayments.filter((item) => ["approved", "open"].includes(item.status)).reduce((sum, item) => sum + Math.max(0, item.amountCents - item.amountPaidCents), 0)),
      detail: "Approved or open unpaid balances", icon: CreditCard,
      records: operationalPayments.filter((item) => ["approved", "open"].includes(item.status)).map((item) => ({ id: item.id, title: item.title, detail: `${clientName(item.clientId)} · ${formatMoney(Math.max(0, item.amountCents - item.amountPaidCents))} remaining`, meta: `${projectName(item.projectId)} · ${item.status}`, target: { view: "finances", id: item.id } })),
    },
    {
      id: "refunds", lens: "financial", label: "REFUNDED", value: formatMoney(operationalPayments.reduce((sum, item) => sum + item.amountRefundedCents, 0)),
      detail: "Webhook-confirmed refund ledger", icon: ArrowLeft,
      records: operationalPayments.filter((item) => item.amountRefundedCents > 0).map((item) => ({ id: item.id, title: item.title, detail: `${clientName(item.clientId)} · ${formatMoney(item.amountRefundedCents)} refunded`, meta: `${projectName(item.projectId)} · ${item.status}`, target: { view: "finances", id: item.id } })),
    },
    {
      id: "payment_requests", lens: "financial", label: "PAYMENT REQUESTS", value: operationalPayments.length,
      detail: "Draft through settled requests", icon: FileText,
      records: operationalPayments.map((item) => ({ id: item.id, title: item.title, detail: `${clientName(item.clientId)} · ${formatMoney(item.amountCents)}`, meta: `${projectName(item.projectId)} · ${item.status}`, target: { view: "finances", id: item.id } })),
    },
    {
      id: "sessions", lens: "workflow", label: "TATTOO SESSIONS", value: operationalSessions.length,
      detail: "Planned and completed session records", icon: Activity,
      records: operationalSessions.map((item) => ({ id: item.id, title: `${projectName(item.projectId)} · Session ${item.sessionNumber}`, detail: clientName(item.clientId), meta: item.status, target: { view: "operations", id: item.id } })),
    },
    {
      id: "healing", lens: "workflow", label: "HEALING CHECK-INS", value: operationalHealing.length,
      detail: "Scheduled and submitted outcomes", icon: HeartHandshake,
      records: operationalHealing.map((item) => ({ id: item.id, title: `${projectName(item.projectId)} · Day ${item.checkpointDay}`, detail: clientName(item.clientId), meta: `${item.status}${item.concernFlag ? " · concern flagged" : ""}`, target: { view: "operations", id: item.id } })),
    },
    {
      id: "content", lens: "workflow", label: "CONTENT DRAFTS", value: operationalContent.length,
      detail: "Consent- and rights-gated candidates", icon: ImageIcon,
      records: operationalContent.map((item) => ({ id: item.id, title: item.title, detail: `${projectName(item.projectId)} · ${item.format}`, meta: item.status.replaceAll("_", " "), target: { view: "content", id: item.id } })),
    },
    {
      id: "intake", lens: "workflow", label: "INTAKE REQUESTS", value: data.projectCandidates.length,
      detail: "Client-submitted project candidates", icon: Inbox,
      records: data.projectCandidates.map((item) => ({ id: item.id, title: item.requestedTitle, detail: `${clientName(item.clientId)} · ${item.placement || "Placement not set"}`, meta: item.status.replaceAll("_", " "), target: { view: "projects", id: item.proposedProjectId || undefined } })),
    },
  ];
  const lensMetrics = metrics.filter((metric) => metric.lens === lens);
  const selectedMetric = metrics.find((metric) => metric.id === selectedMetricId) || lensMetrics[0];
  const phaseCounts = phases.map((phase) => ({
    phase,
    projects: operationalProjects.filter((project) => project.lifecyclePhase === phase),
  }));
  const max = Math.max(1, ...phaseCounts.map((item) => item.projects.length));
  function chooseLens(nextLens: AnalyticsMetric["lens"]) {
    setLens(nextLens);
    setSelectedMetricId(metrics.find((metric) => metric.lens === nextLens)?.id || "active_projects");
  }
  return (
    <section className="page-stack">
      <div className="analytics-tabs" role="tablist" aria-label="Analytics view">
        {(["overview", "financial", "workflow"] as const).map((item) => <button role="tab" aria-selected={lens === item} className={cn(lens === item && "active")} key={item} onClick={() => chooseLens(item)}>{item}</button>)}
      </div>
      <section className="stats-grid analytics-metrics">
        {lensMetrics.map((metric) => {
          const Icon = metric.icon;
          return <button className={cn("stat-card analytics-metric", selectedMetric?.id === metric.id && "active")} aria-pressed={selectedMetric?.id === metric.id} key={metric.id} onClick={() => setSelectedMetricId(metric.id)}><div><p>{metric.label}</p><strong>{metric.value}</strong><small>{metric.detail}</small></div><span><Icon size={19} strokeWidth={1.5} /></span></button>;
        })}
      </section>
      <div className="analytics-workspace">
        {lens === "overview" && operationalProjects.length > 0 && (
          <section className="os-panel lifecycle-analytics">
            <PanelTitle eyebrow="PROJECT DISTRIBUTION" title="Lifecycle activity" />
            <div className="bar-chart">
              {phaseCounts.map((item) => (
                <button key={item.phase} aria-label={`Show ${item.projects.length} ${item.phase} projects`} onClick={() => setSelectedMetricId(`phase:${item.phase}`)}>
                  <span><i style={{ height: `${Math.max(4, (item.projects.length / max) * 100)}%` }} /></span>
                  <strong>{item.projects.length}</strong>
                  <small>{item.phase}</small>
                </button>
              ))}
            </div>
          </section>
        )}
        <section className="os-panel analytics-detail">
          <PanelTitle eyebrow="SOURCE RECORDS" title={selectedMetricId.startsWith("phase:") ? `${selectedMetricId.split(":")[1]} projects` : selectedMetric?.label || "Analytics evidence"} />
          <p className="analytics-integrity"><ShieldCheck size={14} /> Counts are calculated from current workspace records. Test and archived projects are excluded.</p>
          <div className="analytics-record-list">
            {(selectedMetricId.startsWith("phase:") ? projectRecords(phaseCounts.find((item) => item.phase === selectedMetricId.split(":")[1])?.projects || []) : selectedMetric?.records || []).map((record) => <article key={record.id}><div><strong>{record.title}</strong><p>{record.detail}</p><small>{record.meta}</small></div><button className="text-button" onClick={() => onNavigate(record.target)}>Open <ArrowRight size={13} /></button></article>)}
            {(selectedMetricId.startsWith("phase:") ? phaseCounts.find((item) => item.phase === selectedMetricId.split(":")[1])?.projects.length === 0 : !selectedMetric?.records.length) && <EmptyState icon={BarChart3} title="No source records in this view" body="This metric is zero because the workspace has no matching operational records yet." />}
          </div>
        </section>
      </div>
    </section>
  );
}

function FinanceView({ data, refresh, notify }: { data: WorkspaceData; refresh: () => Promise<void>; notify: (message: string, error?: boolean) => void }) {
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const operationalProjectIds = new Set(data.projects.filter((project) => !project.isTest && !project.archivedAt).map((project) => project.id));
  const operationalPayments = data.paymentRequests.filter((payment) => operationalProjectIds.has(payment.projectId));
  const paid = operationalPayments.reduce((sum, item) => sum + item.amountPaidCents, 0);
  const refunded = operationalPayments.reduce((sum, item) => sum + item.amountRefundedCents, 0);
  const outstanding = operationalPayments.filter((item) => ["approved", "open"].includes(item.status)).reduce((sum, item) => sum + item.amountCents, 0);

  async function perform(action: "approve" | "void" | "refund", payment: PaymentRecord) {
    if (action === "void" && !window.confirm(`Void ${payment.title}? The client will no longer be able to pay it.`)) return;
    let refundAmountCents: number | undefined;
    let reason: string | undefined;
    if (action === "refund") {
      const refundable = payment.amountPaidCents - payment.amountRefundedCents;
      const amount = window.prompt(`Refund amount in dollars (maximum ${(refundable / 100).toFixed(2)}):`, (refundable / 100).toFixed(2));
      if (amount == null) return;
      refundAmountCents = Math.round(Number(amount) * 100);
      reason = window.prompt("Reason for the refund:", "Client-requested refund") || "Owner-approved refund";
      if (!window.confirm(`Refund ${(refundAmountCents / 100).toLocaleString(undefined, { style: "currency", currency: "USD" })}?`)) return;
    }
    try {
      await api("/api/payments", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, id: payment.id, refundAmountCents, reason }) });
      notify(action === "approve" ? "Payment request approved and visible to the client." : action === "void" ? "Payment request voided." : "Refund submitted to Stripe; the verified webhook will finalize the ledger.");
      await refresh();
    } catch (error) { notify(error instanceof Error ? error.message : "Unable to update payment", true); }
  }

  async function createPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    try {
      await api("/api/payments", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
        action: "create", projectId: values.projectId, kind: values.kind, title: values.title,
        description: values.description, amount: Number(values.amount), dueAt: values.dueAt || null, requestKey: crypto.randomUUID(),
      }) });
      form.reset(); setShowCreate(false); notify("Draft payment request created. Approve it when the details are correct."); await refresh();
    } catch (error) { notify(error instanceof Error ? error.message : "Unable to create payment request", true); }
    finally { setSaving(false); }
  }

  return <section className="finance-view">
    <div className="finance-heading"><div><p className="eyebrow gold">STRIPE PAYMENT LEDGER</p><h2>Finance Center</h2><p>Owner-approved requests, secure hosted checkout, and webhook-confirmed outcomes.</p></div><button className="gold-button" onClick={() => setShowCreate((value) => !value)}><Plus size={16} /> {showCreate ? "Close" : "New payment request"}</button></div>
    <div className="finance-metrics"><article><small>COLLECTED</small><strong>{formatMoney(paid)}</strong></article><article><small>OUTSTANDING</small><strong>{formatMoney(outstanding)}</strong></article><article><small>REFUNDED</small><strong>{formatMoney(refunded)}</strong></article><article><small>REQUESTS</small><strong>{operationalPayments.length}</strong></article></div>
    {showCreate && <form className="os-panel modal-form finance-form" onSubmit={createPayment}>
      <PanelTitle eyebrow="OWNER APPROVAL REQUIRED" title="Create a draft payment request" />
      <div className="field-row"><label><span>PROJECT *</span><select name="projectId" required defaultValue=""><option value="" disabled>Select a client project</option>{data.projects.filter((item) => item.clientId && !item.isTest && !item.archivedAt).map((item) => <option value={item.id} key={item.id}>{item.title} · {projectClient(item)}</option>)}</select></label><label><span>TYPE</span><select name="kind" defaultValue="deposit"><option value="deposit">Deposit</option><option value="invoice">Invoice</option><option value="balance">Balance</option><option value="other">Other</option></select></label></div>
      <div className="field-row"><label><span>TITLE *</span><input name="title" required maxLength={120} placeholder="Project deposit" /></label><label><span>AMOUNT *</span><input name="amount" type="number" min="0.50" max="100000" step="0.01" required placeholder="250.00" /></label></div>
      <label><span>DESCRIPTION</span><textarea name="description" maxLength={500} rows={2} placeholder="What this payment covers" /></label><label><span>DUE DATE</span><input name="dueAt" type="date" /></label>
      <button className="gold-button" disabled={saving}>{saving ? "Saving draft..." : "Save draft"}</button>
    </form>}
    <section className="os-panel payment-list">{operationalPayments.length ? operationalPayments.map((payment) => {
      const project = data.projects.find((item) => item.id === payment.projectId);
      return <article key={payment.id}><div><span className={cn("status-badge", payment.status)}>{payment.status.replaceAll("_", " ")}</span><h3>{payment.title}</h3><p>{project?.title || "Project"} · {project ? projectClient(project) : "Client"}</p><small>{payment.kind} · Created {formatDate(payment.createdAt)}{payment.dueAt ? ` · Due ${formatDate(payment.dueAt)}` : ""}</small></div><div className="payment-amount"><strong>{formatMoney(payment.amountCents)}</strong>{payment.amountRefundedCents > 0 && <small>{formatMoney(payment.amountRefundedCents)} refunded</small>}<div>{payment.status === "draft" && <button className="gold-button" onClick={() => void perform("approve", payment)}><Check size={14} /> Approve</button>}{["approved", "open", "expired", "failed"].includes(payment.status) && <button className="outline-button" onClick={() => void perform("void", payment)}>Void</button>}{["paid", "partially_refunded"].includes(payment.status) && <button className="outline-button" onClick={() => void perform("refund", payment)}>Refund</button>}</div></div></article>;
    }) : <EmptyState icon={CreditCard} title="No payment requests yet" body="Create a draft from a real client project. The client will only see it after you approve it." />}</section>
  </section>;
}

function ModuleView({
  type,
  data,
  refresh,
  notify,
}: {
  type: "knowledge" | "content";
  data: WorkspaceData;
  refresh: () => Promise<void>;
  notify: (message: string, error?: boolean) => void;
}) {
  const config = {
    knowledge: {
      icon: Library,
      title: "Your knowledge library starts empty",
      body: "Technique notes, lessons, references, and evidence will be captured from real projects—never prefilled with fictional work.",
      labels: ["Memory", "Techniques", "Lessons", "References", "Project notes"],
    },
    content: {
      icon: ImageIcon,
      title: "No content is queued",
      body: "Completed sessions and healed outcomes can become reels, posts, captions, and portfolio entries after you add project media.",
      labels: ["Select", "Draft", "Approve", "Schedule"],
    },
  }[type];
  const [activeTab, setActiveTab] = useState(config.labels[0]);
  const [memoryBusy, setMemoryBusy] = useState(false);
  const Icon = config.icon;
  const records = useMemo<Array<{ id: string; title: string; detail: string; meta: string; sourceCount?: number; memory?: MemoryRecord }>>(() => {
    const operationalProjects = data.projects.filter((project) => !project.isTest && !project.archivedAt);
    const operationalProjectIds = new Set(operationalProjects.map((project) => project.id));
    if (type === "knowledge") {
      if (activeTab === "Memory") {
        return data.memoryRecords
          .filter((memory) => memory.status === "active")
          .map((memory) => {
            const readableTitle = memory.title
              .replace(/[_.]+/g, " ")
              .replace(/\s+/g, " ")
              .trim()
              .replace(/^./, (letter) => letter.toUpperCase());
            const metadata = (() => {
              const match = memory.content.match(/\{[\s\S]*\}/);
              if (!match) return {} as Record<string, unknown>;
              try { return JSON.parse(match[0]) as Record<string, unknown>; } catch { return {} as Record<string, unknown>; }
            })();
            const sourceCount = (() => {
              try { return (JSON.parse(memory.sourceCaptureIdsJson) as string[]).length; } catch { return 0; }
            })();
            const targetType = typeof metadata.targetType === "string" ? metadata.targetType.replaceAll("_", " ") : memory.scopeType;
            const outcome = typeof metadata.outcome === "string" ? metadata.outcome.replaceAll("_", " ") : null;
            const plainContent = memory.content
              .replace(/(?:Source|Evidence):[\s\S]*$/i, "")
              .replace(/[_.]+/g, " ")
              .replace(/\s+/g, " ")
              .trim()
              .replace(/^./, (letter) => letter.toUpperCase());
            const detail = plainContent.length > readableTitle.length + 12
              ? plainContent
              : `${readableTitle} was recorded as ${targetType} evidence${outcome ? ` with a ${outcome} outcome` : ""}.`;
            return {
              id: memory.id,
              title: readableTitle,
              detail,
              meta: `${memory.scopeType} · ${memory.memoryType.replaceAll("_", " ")} · ${Math.round(memory.confidenceBps / 100)}% confidence · ${memory.verificationStatus.replaceAll("_", " ")}`,
              sourceCount,
              memory,
            };
          });
      }
      if (activeTab === "Techniques") {
        const tags = new Map<string, number>();
        operationalProjects.forEach((project) =>
          projectTags(project).forEach((tag) => {
            const canonicalTag = canonicalKnowledgeTag(tag);
            tags.set(canonicalTag, (tags.get(canonicalTag) || 0) + 1);
          }),
        );
        return [...tags.entries()].map(([tag, count]) => ({
          id: tag,
          title: tag,
          detail: `${count} connected project${count === 1 ? "" : "s"}`,
          meta: "Technique / style evidence",
        }));
      }
      if (activeTab === "Lessons") {
        return operationalProjects
          .filter(
            (project) =>
              project.lifecyclePhase === "complete" && project.summary,
          )
          .map((project) => ({
            id: project.id,
            title: project.title,
            detail: project.summary!,
            meta: "Completed-project learning source",
          }));
      }
      if (activeTab === "References") {
        return data.assets.filter((asset) => !asset.projectId || operationalProjectIds.has(asset.projectId)).map((asset) => ({
          id: asset.id,
          title: asset.originalName,
          detail: `${formatBytes(asset.byteSize)} · ${asset.sourceType.replaceAll("_", " ")}`,
          meta: formatDate(asset.createdAt),
        }));
      }
      return operationalProjects
        .filter((project) => project.summary || project.nextAction)
        .map((project) => ({
          id: project.id,
          title: project.title,
          detail: project.summary || project.nextAction || "",
          meta: `${projectClient(project)} · ${project.lifecyclePhase}`,
        }));
    }
    if (type === "content") {
      const imageAssets = data.assets.filter(
        (asset) =>
          asset.mimeType.startsWith("image/") && asset.contentEligible === true,
      );
      if (activeTab === "Approve") {
        return data.approvals
          .filter((approval) => approval.category === "content")
          .map((approval) => ({
            id: approval.id,
            title: approval.subject,
            detail: approval.summary,
            meta: approval.status,
          }));
      }
      if (activeTab === "Schedule") {
        return operationalProjects
          .filter((project) => project.lifecyclePhase === "complete")
          .map((project) => ({
            id: project.id,
            title: project.title,
            detail: `${imageAssets.filter((asset) => asset.projectId === project.id).length} media source(s) ready for a publishing decision`,
            meta: "Completed project",
          }));
      }
      const draftMode = activeTab === "Draft";
      return imageAssets
        .filter((asset) => {
          if (!draftMode) return true;
          const project = operationalProjects.find(
            (item) => item.id === asset.projectId,
          );
          return project?.lifecyclePhase !== "complete";
        })
        .map((asset) => ({
          id: asset.id,
          title: asset.originalName,
          detail:
            operationalProjects.find((project) => project.id === asset.projectId)
              ?.title || "Unassigned media",
          meta: draftMode ? "Potential draft source" : "Available media source",
        }));
    }
    return [];
  }, [activeTab, data, type]);

  async function consolidateMemory() {
    setMemoryBusy(true);
    try {
      const result = await api<{ created: number; reinforced: number; superseded: number }>("/api/memory", { method: "POST" });
      notify(`Memory updated: ${result.created} created, ${result.reinforced} reinforced, ${result.superseded} superseded.`);
      await refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to consolidate memory", true);
    } finally {
      setMemoryBusy(false);
    }
  }

  async function updateMemory(memory: MemoryRecord, action: "verify" | "revoke") {
    const reason = action === "revoke" ? window.prompt("Why should this memory no longer be used?") : null;
    if (action === "revoke" && !reason?.trim()) return;
    setMemoryBusy(true);
    try {
      await api("/api/memory", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: memory.id, action, reason }),
      });
      notify(action === "verify" ? "Memory verified by owner." : "Memory revoked and removed from future context.");
      await refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to update memory", true);
    } finally {
      setMemoryBusy(false);
    }
  }

  return (
    <section className="module-surface">
      <div className="module-tabs">
        {config.labels.map((label) => (
          <button
            className={activeTab === label ? "active" : ""}
            key={label}
            onClick={() => setActiveTab(label)}
          >
            {label}
          </button>
        ))}
        {type === "knowledge" && activeTab === "Memory" && (
          <button className="memory-refresh-button" disabled={memoryBusy} onClick={() => void consolidateMemory()}>
            <BrainCircuit size={14} /> {memoryBusy ? "Consolidating…" : "Consolidate captures"}
          </button>
        )}
      </div>
      <section className={cn("os-panel", !records.length && "tall-empty")}>
        {records.length ? (
          <div className="module-records">
            {records.map((record) => (
              <article key={record.id}>
                <span><Icon size={17} /></span>
                <div>
                  <strong>{record.title}</strong>
                  <p>{record.detail}</p>
                  <small>{record.meta}</small>
                  {record.memory && (
                    <>
                      <details className="memory-provenance">
                        <summary>Evidence and provenance</summary>
                        <span>{record.sourceCount || 0} connected capture{record.sourceCount === 1 ? "" : "s"} · reinforced {formatDate(record.memory.lastReinforcedAt, true)}</span>
                        <code>{record.memory.memoryKey.replaceAll("_", " ")}</code>
                      </details>
                      <div className="memory-actions">
                        <button className="text-button" disabled={memoryBusy || record.memory.verificationStatus === "owner_verified"} onClick={() => void updateMemory(record.memory!, "verify")}><Check size={13} /> {record.memory.verificationStatus === "owner_verified" ? "Verified" : "Verify"}</button>
                        <button className="text-button danger-text" disabled={memoryBusy} onClick={() => void updateMemory(record.memory!, "revoke")}>Revoke</button>
                      </div>
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Icon}
            title={`${activeTab}: ${config.title}`}
            body={`${config.body} The ${activeTab.toLowerCase()} filter is active.`}
          />
        )}
        <div className="module-integrity"><ShieldCheck size={16} /> Real workspace data only · {data.projects.filter((project) => !project.isTest && !project.archivedAt).length} operational projects available as sources</div>
      </section>
    </section>
  );
}

function SettingsView({
  data,
  notify,
  refresh,
  onView,
  personalization,
  onPersonalization,
}: {
  data: WorkspaceData;
  notify: (message: string, error?: boolean) => void;
  refresh: () => void;
  onView: (view: OwnerView) => void;
  personalization: PersonalizationPreferences;
  onPersonalization: (preferences: PersonalizationPreferences) => void;
}) {
  const [activeTab, setActiveTab] = useState<
    | "workspace"
    | "ai"
    | "automations"
    | "team"
    | "security"
    | "notifications"
    | "personalization"
  >("workspace");
  const [automation, setAutomation] = useState<AutomationSnapshot | null>(null);
  const [automationBusy, setAutomationBusy] = useState(false);
  const [health, setHealth] = useState<{
    status: string;
    checkedAt: string;
    services: Record<string, string>;
  } | null>(null);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [preferences, setPreferences] = useState({
    approvals: true,
    messages: true,
    appointments: true,
    ai: true,
  });

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const saved = window.localStorage.getItem(
        "legacy_notification_preferences",
      );
      if (!saved) return;
      try {
        setPreferences(JSON.parse(saved) as typeof preferences);
      } catch {
        window.localStorage.removeItem("legacy_notification_preferences");
      }
    }, 0);
    return () => window.clearTimeout(handle);
  }, []);

  const loadAutomations = useCallback(async () => {
    try {
      setAutomation(await api<AutomationSnapshot>("/api/automations"));
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Unable to load automations",
        true,
      );
    }
  }, [notify]);

  async function updateAutomations(action: "run" | "pause" | "resume") {
    setAutomationBusy(true);
    try {
      const result = await api<
        AutomationSnapshot | { snapshot: AutomationSnapshot }
      >("/api/automations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      setAutomation("snapshot" in result ? result.snapshot : result);
      notify(
        action === "run"
          ? "Automation sweep completed."
          : `Automations ${action === "pause" ? "paused" : "resumed"}.`,
      );
      refresh();
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Unable to update automations",
        true,
      );
    } finally {
      setAutomationBusy(false);
    }
  }

  async function replayDeadLetter(jobId: string) {
    setAutomationBusy(true);
    try {
      await api("/api/worker", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "replay", jobId }),
      });
      notify("The failed job was copied into a fresh, auditable queue record.");
      await loadAutomations();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to replay failed work", true);
    } finally {
      setAutomationBusy(false);
    }
  }

  async function runHealthCheck() {
    setCheckingHealth(true);
    try {
      const result = await api<{
        status: string;
        checkedAt: string;
        services: Record<string, string>;
      }>("/api/health");
      setHealth(result);
      notify(`System health check completed: ${result.status}.`);
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Health check failed",
        true,
      );
    } finally {
      setCheckingHealth(false);
    }
  }

  function togglePreference(key: keyof typeof preferences) {
    const next = { ...preferences, [key]: !preferences[key] };
    setPreferences(next);
    window.localStorage.setItem(
      "legacy_notification_preferences",
      JSON.stringify(next),
    );
    notify("Notification preference saved on this device.");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api("/api/workspace", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          timezone: form.get("timezone"),
          aiContentCapture: form.get("capture"),
        }),
      });
      notify("Workspace settings saved.");
      refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to save settings", true);
    }
  }
  return (
    <section className="settings-layout">
      <div className="settings-tabs">
        <button
          className={activeTab === "workspace" ? "active" : ""}
          onClick={() => setActiveTab("workspace")}
        >
          <Settings size={15} /> Workspace
        </button>
        <button
          className={activeTab === "ai" ? "active" : ""}
          onClick={() => setActiveTab("ai")}
        >
          <Bot size={15} /> AI & Models
        </button>
        <button
          className={activeTab === "automations" ? "active" : ""}
          onClick={() => {
            setActiveTab("automations");
            void loadAutomations();
          }}
        >
          <WandSparkles size={15} /> Automations
        </button>
        <button
          className={activeTab === "team" ? "active" : ""}
          onClick={() => setActiveTab("team")}
        >
          <UsersRound size={15} /> Team
        </button>
        <button
          className={activeTab === "security" ? "active" : ""}
          onClick={() => setActiveTab("security")}
        >
          <ShieldCheck size={15} /> Security
        </button>
        <button
          className={activeTab === "notifications" ? "active" : ""}
          onClick={() => setActiveTab("notifications")}
        >
          <Bell size={15} /> Notifications
        </button>
        <button
          className={activeTab === "personalization" ? "active" : ""}
          onClick={() => setActiveTab("personalization")}
        >
          <Palette size={15} /> Personalization
        </button>
      </div>
      {activeTab === "workspace" && (
        <form className="settings-grid" onSubmit={save}>
        <section className="os-panel setting-card">
          <PanelTitle eyebrow="IDENTITY" title="Workspace" />
          <Field label="Studio name" name="name" required>
            <input name="name" defaultValue={data.workspace?.name || "Legacy Studio"} required />
          </Field>
          <Field label="Time zone" name="timezone">
            <select name="timezone" defaultValue={data.workspace?.timezone || "America/Los_Angeles"}>
              <option value="America/Los_Angeles">Pacific Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/New_York">Eastern Time</option>
            </select>
          </Field>
        </section>
        <section className="os-panel setting-card">
          <PanelTitle eyebrow="AI PRIVACY" title="Content capture" />
          <label className="radio-card">
            <input type="radio" name="capture" value="metadata_only" defaultChecked={data.workspace?.aiContentCapture === "metadata_only"} />
            <span><strong>Metadata only</strong><small>Purpose, model, timing, confidence, and outcome. Recommended.</small></span>
          </label>
          <label className="radio-card">
            <input type="radio" name="capture" value="redacted_summaries" defaultChecked={data.workspace?.aiContentCapture === "redacted_summaries"} />
            <span><strong>Redacted summaries</strong><small>Adds safe operational summaries for deeper quality review.</small></span>
          </label>
        </section>
        <section className="os-panel setting-card health-card">
          <PanelTitle eyebrow="SYSTEM" title="Environment health" />
          {["Database", "File storage", "Audit trail", "Client portal"].map((item) => (
            <p key={item}><CheckCircle2 size={16} /><span>{item}</span><strong>Operational</strong></p>
          ))}
          <InstallAppButton />
        </section>
        <button className="gold-button save-settings" type="submit"><Check size={16} /> Save changes</button>
        </form>
      )}
      {activeTab === "ai" && (
        <div className="settings-grid">
          <section className="os-panel setting-card settings-copy-card">
            <PanelTitle eyebrow="MODEL-AGNOSTIC CORE" title="Reasoning architecture" />
            <p>
              Legacy OS owns memory, context, workflow policy, confidence,
              approvals, evidence, and audit history. Model providers remain
              replaceable execution engines.
            </p>
            <button className="outline-button" onClick={() => onView("chief")}>
              <BrainCircuit size={15} /> Open intelligence controls
            </button>
          </section>
          <section className="os-panel setting-card settings-copy-card">
            <PanelTitle eyebrow="CURRENT CAPTURE" title="Privacy boundary" />
            <strong>
              {data.workspace?.aiContentCapture === "redacted_summaries"
                ? "Redacted summaries"
                : "Metadata only"}
            </strong>
            <p>
              Every run records purpose, provider, model, confidence, latency,
              evidence pointers, and outcome without retaining raw prompts by
              default.
            </p>
            <button
              className="outline-button"
              onClick={() => onView("operations")}
            >
              <Activity size={15} /> Review AI run ledger
            </button>
          </section>
        </div>
      )}
      {activeTab === "automations" && (
        <div className="settings-grid automation-settings">
          <section className="os-panel setting-card settings-copy-card">
            <PanelTitle
              eyebrow="SAFE AUTONOMY"
              title={automation?.status === "paused" ? "Paused" : "Active"}
            />
            <p>
              Legacy OS continuously organizes internal workflow events,
              captures structured evidence, creates reminders, and runs the
              learning cycle. External actions remain behind approval gates.
            </p>
            <div className="automation-actions">
              <button
                className="gold-button"
                disabled={automationBusy}
                onClick={() => void updateAutomations("run")}
              >
                <WandSparkles size={15} />
                {automationBusy ? "Working..." : "Run now"}
              </button>
              <button
                className="outline-button"
                disabled={automationBusy}
                onClick={() =>
                  void updateAutomations(
                    automation?.status === "paused" ? "resume" : "pause",
                  )
                }
              >
                {automation?.status === "paused" ? "Resume" : "Pause"}
              </button>
            </div>
            <small>
              Last completed: {formatDate(automation?.lastAutomationAt)}
            </small>
          </section>
          <section className="os-panel setting-card settings-copy-card">
            <PanelTitle eyebrow="APPROVAL BOUNDARY" title="Owner stays in control" />
            <div className="security-list">
              <p><Check size={15} /> Internal, reversible organization can run automatically</p>
              <p><ShieldCheck size={15} /> Client messages and scheduling require approval</p>
              <p><ShieldCheck size={15} /> Publishing, payments, and permissions require approval</p>
              <p><ShieldCheck size={15} /> Destructive or health-sensitive actions are never automatic</p>
            </div>
          </section>
          <section className="os-panel setting-card always-on-schedules-card">
            <PanelTitle eyebrow="DURABLE SCHEDULER" title="Always On schedules" />
            <p>Schedules survive restarts and advance only after a worker safely claims them.</p>
            <div className="automation-schedule-list">
              {automation?.schedules.map((schedule) => <div key={schedule.id}><span className={cn("status-dot", !schedule.enabled && "warning")} /><div><strong>{schedule.displayName}</strong><small>Next {formatDate(schedule.nextRunAt, true)} · {schedule.lastOutcome || "waiting"}</small></div></div>)}
            </div>
          </section>
          <section className="os-panel setting-card worker-health-card">
            <PanelTitle eyebrow="WORKER HEARTBEAT" title={automation?.workerRuns[0] ? automation.workerRuns[0].status.replaceAll("_", " ") : "Waiting for first run"} />
            {automation?.workerRuns[0] ? <div className="worker-metrics"><p><strong>{automation.workerRuns[0].jobsProcessed}</strong><span>jobs processed</span></p><p><strong>{automation.workerRuns[0].playbookStepsProcessed}</strong><span>playbook steps</span></p><p><strong>{automation.workerRuns[0].leasesRecovered}</strong><span>leases recovered</span></p><p><strong>{automation.workerRuns[0].jobsFailed}</strong><span>failures</span></p></div> : <p>The first authenticated worker or owner-triggered run will appear here.</p>}
            <small>Last heartbeat: {formatDate(automation?.workerRuns[0]?.completedAt || automation?.workerRuns[0]?.startedAt, true)}</small>
          </section>
          <section className="os-panel setting-card dead-letter-card">
            <PanelTitle eyebrow="FAILURE RECOVERY" title="Dead-letter queue" />
            {automation?.deadLetters.length ? automation.deadLetters.slice(0, 6).map((letter) => <div className="dead-letter-row" key={letter.id}><div><strong>{letter.jobType.replaceAll("_", " ")}</strong><small>{letter.attempts} attempts · {letter.errorSummary}</small></div>{letter.status === "open" ? <button className="outline-button" type="button" disabled={automationBusy} onClick={() => void replayDeadLetter(letter.jobId)}>Replay safely</button> : <span className="agent-task-status succeeded">replayed</span>}</div>) : <p className="settings-placeholder">No work has exhausted its retry policy.</p>}
          </section>
          <section className="os-panel setting-card automation-queue-card">
            <PanelTitle eyebrow="LIVE QUEUE" title="Recent automation jobs" />
            {automation?.jobs.length ? (
              automation.jobs.slice(0, 10).map((job) => (
                <div className="automation-job" key={job.id}>
                  <div>
                    <strong>{job.jobType.replaceAll("_", " ")}</strong>
                    <small>
                      {job.entityType || "workspace"} · {formatDate(job.createdAt, true)}
                    </small>
                  </div>
                  <span className={job.status}>{job.status}</span>
                </div>
              ))
            ) : (
              <p className="settings-placeholder">
                No jobs are waiting. New workspace activity is captured automatically.
              </p>
            )}
          </section>
        </div>
      )}
      {activeTab === "team" && (
        <div className="settings-grid">
          <section className="os-panel setting-card settings-copy-card">
            <PanelTitle eyebrow="OWNER ACCOUNT" title={data.owner?.displayName || "Studio owner"} />
            <p>{data.owner?.email || "Private preview identity"}</p>
            <div className="role-definition">
              <ShieldCheck size={18} />
              <div>
                <strong>Owner / Operations</strong>
                <small>Full workspace access. Client records remain server isolated.</small>
              </div>
            </div>
            <div className="account-security-facts">
              <p><strong>Identity provider</strong><span>{data.owner?.authProvider || "private preview"}</span></p>
              <p><strong>Email verification</strong><span>{data.owner?.emailVerifiedAt ? "Verified" : "Preview only"}</span></p>
              <p><strong>Two-step policy</strong><span>{data.owner?.mfaRequired ? "Required" : "Not active in preview"}</span></p>
              <p><strong>Last sign-in</strong><span>{formatDate(data.owner?.lastLoginAt, true)}</span></p>
            </div>
          </section>
          <section className="os-panel setting-card settings-copy-card">
            <PanelTitle eyebrow="CLIENT ISOLATION" title="Separate access boundary" />
            <p>
              Client accounts are bound to one client record and cannot open
              another client’s project, messages, files, or approvals.
            </p>
            <button className="outline-button" onClick={() => onView("clients")}>
              <UsersRound size={15} /> Manage client access
            </button>
          </section>
        </div>
      )}
      {activeTab === "security" && (
        <div className="settings-grid">
          <section className="os-panel setting-card health-card">
            <PanelTitle eyebrow="LIVE CHECK" title="Environment health" />
            {health ? (
              Object.entries(health.services).map(([service, status]) => (
                <p key={service}>
                  <CheckCircle2 size={16} />
                  <span>{service.replaceAll("_", " ")}</span>
                  <strong>{status}</strong>
                </p>
              ))
            ) : (
              <p className="settings-placeholder">
                Run a check to verify the application, database, and telemetry
                connection now.
              </p>
            )}
            <button
              className="gold-button"
              onClick={runHealthCheck}
              disabled={checkingHealth}
            >
              <Activity size={15} />{" "}
              {checkingHealth ? "Checking..." : "Run health check"}
            </button>
          </section>
          <section className="os-panel setting-card settings-copy-card">
            <PanelTitle eyebrow="ACCESS POLICY" title="Identity protection" />
            <div className="security-list">
              <p><Check size={15} /> {data.owner?.emailVerifiedAt ? "Owner email verified" : "Verified email required when Supabase is enabled"}</p>
              <p><Check size={15} /> {data.owner?.mfaRequired ? "TOTP two-step verification required" : "TOTP activates with account authentication"}</p>
              <p><Check size={15} /> Server-enforced owner and client roles</p>
              <p><Check size={15} /> Revocable, expiring client access links</p>
              <p><Check size={15} /> Password recovery returns through a verified Supabase session</p>
              <p><Check size={15} /> Authentication events are hashed and written to the audit ledger</p>
            </div>
          </section>
        </div>
      )}
      {activeTab === "notifications" && (
        <section className="os-panel notification-settings">
          <PanelTitle eyebrow="ON THIS DEVICE" title="Notification preferences" />
          {(
            [
              ["approvals", "Approvals", "Design and client decisions waiting for review"],
              ["messages", "Client messages", "New messages in the shared portal thread"],
              ["appointments", "Appointments", "Upcoming schedule commitments"],
              ["ai", "AI operations", "Completed briefings, learning cycles, and held actions"],
            ] as const
          ).map(([key, title, body]) => (
            <button key={key} onClick={() => togglePreference(key)}>
              <div>
                <strong>{title}</strong>
                <small>{body}</small>
              </div>
              <span className={preferences[key] ? "enabled" : ""}>
                {preferences[key] ? "On" : "Off"}
              </span>
            </button>
          ))}
        </section>
      )}
      {activeTab === "personalization" && (
        <div className="settings-grid personalization-grid">
          <section className="os-panel setting-card personalization-card">
            <PanelTitle eyebrow="APPEARANCE" title="Light or dark" />
            <p className="personalization-intro">Choose the workspace appearance that is most comfortable for your environment. Your choice is saved on this device.</p>
            <div className="theme-choice-grid">
              <button className={cn(personalization.theme === "dark" && "active")} aria-pressed={personalization.theme === "dark"} onClick={() => onPersonalization({ ...personalization, theme: "dark" })}>
                <span className="theme-preview dark-preview"><Moon size={20} /></span>
                <span><strong>Dark</strong><small>Focused, low-light workspace</small></span>
                {personalization.theme === "dark" && <CheckCircle2 size={18} />}
              </button>
              <button className={cn(personalization.theme === "light" && "active")} aria-pressed={personalization.theme === "light"} onClick={() => onPersonalization({ ...personalization, theme: "light" })}>
                <span className="theme-preview light-preview"><Sun size={20} /></span>
                <span><strong>Light</strong><small>Bright, high-contrast workspace</small></span>
                {personalization.theme === "light" && <CheckCircle2 size={18} />}
              </button>
            </div>
          </section>
          <section className="os-panel setting-card personalization-card">
            <PanelTitle eyebrow="ACCENT" title="Interface color" />
            <p className="personalization-intro">Select one of eight curated accents. Status colors keep their operational meaning.</p>
            <div className="accent-choice-grid">
              {ACCENT_OPTIONS.map((option) => (
                <button key={option.id} className={cn(personalization.accent === option.id && "active")} aria-pressed={personalization.accent === option.id} onClick={() => onPersonalization({ ...personalization, accent: option.id })}>
                  <i style={{ backgroundColor: option.color }} />
                  <span>{option.label}</span>
                  {personalization.accent === option.id && <Check size={14} />}
                </button>
              ))}
            </div>
          </section>
          <section className="os-panel personalization-preview-card">
            <div><p className="eyebrow gold">LIVE PREVIEW</p><h3>Legacy OS, shaped for how you work.</h3><p>The selected appearance and accent apply immediately across owner and client views on this device.</p></div>
            <div className="personalization-preview-actions"><span className="gold-button"><Sparkles size={15} /> Primary action</span><span className="outline-button"><ShieldCheck size={15} /> Secondary action</span></div>
          </section>
        </div>
      )}
    </section>
  );
}

function ClientForm({
  onClose,
  onSaved,
  notify,
}: {
  onClose: () => void;
  onSaved: () => void;
  notify: (message: string, error?: boolean) => void;
}) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api("/api/clients", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form)),
      });
      notify("Client added to the live workspace.");
      onClose();
      onSaved();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to add client", true);
    }
  }
  return (
    <Modal title="Add a client" eyebrow="CLIENT RECORD" onClose={onClose}>
      <form className="modal-form" onSubmit={submit}>
        <div className="field-row">
          <Field label="Display name" name="displayName" required placeholder="How this client should appear" />
          <Field label="Preferred name" name="preferredName" placeholder="What they like to be called" />
        </div>
        <div className="field-row">
          <Field label="First name" name="firstName" />
          <Field label="Last name" name="lastName" />
        </div>
        <Field label="Email" name="email" type="email" placeholder="client@example.com" />
        <Field label="Phone" name="phone" type="tel" />
        <div className="field-row">
          <Field label="Instagram" name="instagramHandle" placeholder="@handle" />
          <Field label="TikTok" name="tiktokHandle" placeholder="@handle" />
        </div>
        <Field label="Preferred channel" name="preferredChannel">
          <select name="preferredChannel"><option value="email">Email</option><option value="sms">SMS</option><option value="portal">Client portal</option><option value="instagram">Instagram</option><option value="tiktok">TikTok</option></select>
        </Field>
        <Field label="Private studio notes" name="notes">
          <textarea name="notes" placeholder="Preferences, context, or intake notes..." />
        </Field>
        <div className="modal-actions"><button className="text-button" type="button" onClick={onClose}>Cancel</button><button className="gold-button" type="submit">Create client</button></div>
      </form>
    </Modal>
  );
}

function ProjectForm({
  clients,
  initialClientId,
  onClose,
  onSaved,
  notify,
}: {
  clients: ClientRecord[];
  initialClientId?: string;
  onClose: () => void;
  onSaved: () => void;
  notify: (message: string, error?: boolean) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [requestKey] = useState(() => crypto.randomUUID());
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await api("/api/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...values,
          requestKey,
          budgetMin: values.budgetMin ? Number(values.budgetMin) : undefined,
          budgetMax: values.budgetMax ? Number(values.budgetMax) : undefined,
        }),
      });
      notify("Project created and connected to the client.");
      onClose();
      onSaved();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to create project", true);
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <Modal title="Create a project" eyebrow="TATTOO LIFECYCLE" onClose={onClose}>
      {clients.length === 0 ? (
        <EmptyState icon={UsersRound} title="Add a client first" body="Every project belongs to a real client record." />
      ) : (
        <form className="modal-form" onSubmit={submit}>
          <Field label="Client" name="clientId">
            <select name="clientId" required defaultValue={initialClientId || clients[0]?.id}>{clients.map((client) => <option value={client.id} key={client.id}>{fullName(client)}</option>)}</select>
          </Field>
          <Field label="Project title" name="title" required placeholder="e.g. Full sleeve — guardian" />
          <div className="field-row">
            <Field label="Placement" name="placement" placeholder="Left upper arm" />
            <Field label="Target date" name="targetDate" type="date" />
          </div>
          <Field label="Style tags" name="style" placeholder="Black & grey, realism, ornamental" />
          <Field label="Internal creative brief" name="summary"><textarea name="summary" placeholder="Private studio context, constraints, and creative direction..." /></Field>
          <Field label="Client-facing project summary" name="clientSummary"><textarea name="clientSummary" placeholder="Only information you intend to share in the client portal..." /></Field>
          <div className="field-row">
            <Field label="Budget minimum" name="budgetMin" type="number" />
            <Field label="Budget maximum" name="budgetMax" type="number" />
          </div>
          <div className="modal-actions"><button className="text-button" type="button" onClick={onClose}>Cancel</button><button className="gold-button" type="submit" disabled={submitting}>{submitting ? "Creating…" : "Create project"}</button></div>
        </form>
      )}
    </Modal>
  );
}

function AppointmentForm({
  data,
  onClose,
  onSaved,
  notify,
}: {
  data: WorkspaceData;
  onClose: () => void;
  onSaved: () => Promise<void>;
  notify: (message: string, error?: boolean) => void;
}) {
  const [clientId, setClientId] = useState(data.clients[0]?.id || "");
  const [submitting, setSubmitting] = useState(false);
  const [requestKey] = useState(() => crypto.randomUUID());
  const projects = data.projects.filter((item) => item.clientId === clientId);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await api("/api/appointments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...values, requestKey }),
      });
      await onSaved();
      notify("Appointment scheduled and visible on the live calendar.");
      onClose();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to schedule", true);
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <Modal title="Schedule an appointment" eyebrow="CALENDAR" onClose={onClose}>
      {data.clients.length === 0 ? (
        <EmptyState icon={UsersRound} title="Add a client first" body="Appointments need a connected client." />
      ) : (
        <form className="modal-form" onSubmit={submit}>
          <Field label="Client" name="clientId"><select name="clientId" value={clientId} onChange={(event) => setClientId(event.target.value)}>{data.clients.map((client) => <option value={client.id} key={client.id}>{fullName(client)}</option>)}</select></Field>
          <Field label="Project" name="projectId"><select name="projectId"><option value="">No project</option>{projects.map((project) => <option value={project.id} key={project.id}>{project.title}</option>)}</select></Field>
          <div className="field-row">
            <Field label="Type" name="appointmentType"><select name="appointmentType"><option value="consultation">Consultation</option><option value="design review">Design review</option><option value="tattoo session">Tattoo session</option><option value="healing check">Healing check</option></select></Field>
            <Field label="Start" name="startsAt" type="datetime-local" required />
          </div>
          <Field label="Location" name="location" placeholder="Studio, video call, or address" />
          <Field label="Notes" name="notes"><textarea name="notes" /></Field>
          <div className="modal-actions"><button className="text-button" type="button" onClick={onClose} disabled={submitting}>Cancel</button><button className="gold-button" type="submit" disabled={submitting}>{submitting ? "Scheduling…" : "Schedule appointment"}</button></div>
        </form>
      )}
    </Modal>
  );
}

function InviteModal({
  client,
  onClose,
  notify,
}: {
  client: ClientRecord;
  onClose: () => void;
  notify: (message: string, error?: boolean) => void;
}) {
  const [invite, setInvite] = useState<{
    token: string;
    portalUrl: string;
    expiresAt: string;
  } | null>(null);
  const [creating, setCreating] = useState(false);
  async function create() {
    setCreating(true);
    try {
      const result = await api<{
        token: string;
        portalUrl: string;
        expiresAt: string;
      }>("/api/portal/invitations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clientId: client.id }),
      });
      setInvite(result);
      notify("Secure client access created. Any previous link was revoked.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to create access", true);
    } finally {
      setCreating(false);
    }
  }
  async function copy() {
    if (!invite) return;
    try {
      await copyText(invite.portalUrl);
      notify("Portal link copied.");
    } catch {
      notify("Copy failed. Select the link and copy it manually.", true);
    }
  }

  async function copyCode() {
    if (!invite) return;
    try {
      await copyText(invite.token);
      notify("Client access code copied.");
    } catch {
      notify("Copy failed. Select the code and copy it manually.", true);
    }
  }
  return (
    <Modal title={`Client portal · ${fullName(client)}`} eyebrow="SECURE ACCESS" onClose={onClose}>
      <div className="invite-content">
        <div className="security-note"><LockKeyhole size={20} /><div><strong>One active link per client</strong><p>Creating a new link revokes the previous one. Access expires after 30 days and can be renewed.</p></div></div>
        {invite ? (
          <>
            <label className="field"><span>Access code</span><div className="copy-field"><input readOnly value={invite.token} /><button type="button" onClick={copyCode} aria-label="Copy access code"><Copy size={16} /></button></div></label>
            <label className="field"><span>Private portal link</span><div className="copy-field"><input readOnly value={invite.portalUrl} /><button type="button" onClick={copy} aria-label="Copy portal link"><Copy size={16} /></button></div></label>
            <p className="expiry-note">Expires {formatDate(invite.expiresAt, true)}</p>
            <div className="modal-actions"><button type="button" className="text-button" onClick={copyCode}>Copy code</button><button type="button" className="outline-button" onClick={() => window.open(invite.portalUrl, "_blank", "noopener,noreferrer")}>Open portal</button><button type="button" className="gold-button" onClick={copy}><Copy size={15} /> Copy link</button></div>
          </>
        ) : (
          <button className="gold-button wide" onClick={create} disabled={creating}>{creating ? "Creating secure access..." : "Create client portal link"}</button>
        )}
      </div>
    </Modal>
  );
}

function PortalAccess({
  initialToken,
  onExit,
  authenticated = false,
}: {
  initialToken: string;
  onExit: () => void;
  authenticated?: boolean;
}) {
  const [token, setToken] = useState(initialToken);
  const [submitted, setSubmitted] = useState(
    authenticated ? "__authenticated__" : initialToken,
  );

  if (submitted) {
    return <ClientPortal token={submitted} onExit={onExit} onInvalid={() => setSubmitted("")} />;
  }
  return (
    <main className="portal-login">
      <div className="portal-login-panel">
        <Brand />
        <div className="secure-chip"><LockKeyhole size={14} /> SECURE CLIENT CONNECTION</div>
        <section>
          <p className="eyebrow gold">CLIENT PORTAL</p>
          <h1>Your project, clearly connected.</h1>
          <p>Use the private access link supplied by your artist. No password or account creation is required.</p>
          <form onSubmit={(event) => { event.preventDefault(); if (token.trim()) setSubmitted(token.trim()); }}>
            <label><span>ACCESS CODE</span><input value={token} onChange={(event) => setToken(event.target.value)} placeholder="Paste the code from your private link" /></label>
            <button className="gold-button wide" type="submit">Open my project <ArrowRight size={16} /></button>
          </form>
          <button className="text-button" onClick={onExit}><ArrowLeft size={14} /> Exit secure portal</button>
        </section>
        <footer><ShieldCheck size={16} /> Your project information is private and auditable.</footer>
      </div>
      <div className="portal-art">
        <div className="portal-halo"><span>LL</span></div>
        <div><p>BUILD YOUR LEGACY.</p><span>THE SYSTEM KEEPS EVERY DETAIL CONNECTED.</span></div>
      </div>
    </main>
  );
}

function ClientPortal({
  token,
  onExit,
  onInvalid,
}: {
  token: string;
  onExit: () => void;
  onInvalid: () => void;
}) {
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<
    "overview" | "intake" | "messages" | "approvals" | "files" | "payments" | "healing" | "privacy"
  >("overview");
  const [projectId, setProjectId] = useState("");
  const [notice, setNotice] = useState("");
  const [social, setSocial] = useState<SocialAccessData | null>(null);
  const [intakeKey, setIntakeKey] = useState(() => crypto.randomUUID());
  const [submittingIntake, setSubmittingIntake] = useState(false);
  const [payingId, setPayingId] = useState("");
  const [lifecycle, setLifecycle] = useState<PortalLifecycleData | null>(null);
  const [revisionApprovalId, setRevisionApprovalId] = useState("");
  const [revisionReason, setRevisionReason] = useState("");
  const [decidingApprovalId, setDecidingApprovalId] = useState("");

  const load = useCallback(async () => {
    try {
      const result = await api<PortalData>(`/api/portal?token=${encodeURIComponent(token)}`);
      setData(result);
      setProjectId((current) => current || result.projects[0]?.id || "");
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to open portal");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    let active = true;
    void api<PortalData>(`/api/portal?token=${encodeURIComponent(token)}`)
      .then((result) => {
        if (!active) return;
        setData(result);
        setProjectId((current) => current || result.projects[0]?.id || "");
        setError("");
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to open portal",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    const paymentResult = new URLSearchParams(window.location.search).get("payment");
    if (!paymentResult) return;
    const handle = window.setTimeout(() => {
      setTab("payments");
      setNotice(paymentResult === "success" ? "Payment submitted. Verified status will appear as soon as Stripe confirms it." : "Checkout was cancelled. No payment was recorded.");
      window.history.replaceState({}, "", window.location.pathname);
    }, 0);
    return () => window.clearTimeout(handle);
  }, []);
  const loadSocial = useCallback(async () => {
    try {
      setSocial(
        await api<SocialAccessData>(
          `/api/social/consent?token=${encodeURIComponent(token)}`,
        ),
      );
    } catch (socialError) {
      setNotice(
        socialError instanceof Error
          ? socialError.message
          : "Unable to load social permissions",
      );
    }
  }, [token]);

  useEffect(() => {
    if (tab !== "privacy") return;
    const handle = window.setTimeout(() => void loadSocial(), 0);
    return () => window.clearTimeout(handle);
  }, [loadSocial, tab]);

  const loadLifecycle = useCallback(async () => {
    try {
      setLifecycle(await api<PortalLifecycleData>(`/api/portal/lifecycle?token=${encodeURIComponent(token)}`));
    } catch (lifecycleError) {
      setNotice(lifecycleError instanceof Error ? lifecycleError.message : "Unable to load healing timeline");
    }
  }, [token]);

  useEffect(() => {
    if (tab !== "healing") return;
    const handle = window.setTimeout(() => void loadLifecycle(), 0);
    return () => window.clearTimeout(handle);
  }, [loadLifecycle, tab]);
  const refreshPortalRealtime = useCallback(() => {
    void load();
    if (tab === "healing") void loadLifecycle();
    if (tab === "privacy") void loadSocial();
  }, [load, loadLifecycle, loadSocial, tab]);
  const realtimeStatus = useRealtimeFeed("client", token, refreshPortalRealtime);
  const project = data?.projects.find((item) => item.id === projectId) || data?.projects[0];
  const messages = useMemo(
    () =>
      data?.messages.filter(
        (item) => !project || !item.projectId || item.projectId === project.id,
      ) || [],
    [data?.messages, project],
  );
  const approvals = data?.approvals.filter((item) => !project || item.projectId === project.id) || [];
  const files = data?.assets.filter((item) => !project || item.projectId === project.id) || [];
  const payments = data?.paymentRequests.filter((item) => !project || item.projectId === project.id) || [];

  useEffect(() => {
    if (
      tab !== "messages" ||
      !data ||
      !messages.some(
        (message) => message.senderType === "owner" && !message.readAt,
      )
    ) {
      return;
    }
    void api("/api/portal", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        token,
        action: "mark_messages_read",
        projectId: project?.id,
      }),
    })
      .then(load)
      .catch((readError) =>
        setNotice(
          readError instanceof Error
            ? readError.message
            : "Unable to update message state",
        ),
      );
  }, [data, load, messages, project?.id, tab, token]);

  async function submitProjectIntake(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingIntake) return;
    setSubmittingIntake(true);
    const formElement = event.currentTarget;
    const values = Object.fromEntries(new FormData(formElement));
    try {
      await api("/api/portal", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token,
          action: "project_intake",
          requestKey: intakeKey,
          ...values,
          budgetMin: values.budgetMin ? Number(values.budgetMin) : undefined,
          budgetMax: values.budgetMax ? Number(values.budgetMax) : undefined,
        }),
      });
      formElement.reset();
      setIntakeKey(crypto.randomUUID());
      setNotice("Your project request was structured and sent to the studio for review.");
      await load();
    } catch (intakeError) {
      setNotice(
        intakeError instanceof Error
          ? intakeError.message
          : "Unable to submit project request",
      );
    } finally {
      setSubmittingIntake(false);
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await api("/api/portal", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, action: "message", projectId: project?.id, body: form.get("body") }),
      });
      formElement.reset();
      setNotice("Message sent to your artist.");
      await load();
    } catch (sendError) {
      setNotice(sendError instanceof Error ? sendError.message : "Unable to send");
    }
  }

  async function decide(
    approvalId: string,
    decision: "approved" | "revision",
    reason?: string,
  ) {
    if (decidingApprovalId) return;
    setDecidingApprovalId(approvalId);
    try {
      await api("/api/portal", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token,
          action: "approval",
          approvalId,
          decision,
          reason,
        }),
      });
      setNotice(decision === "approved" ? "Approval recorded." : "Revision request recorded.");
      setRevisionApprovalId("");
      setRevisionReason("");
      await load();
    } catch (decisionError) {
      setNotice(decisionError instanceof Error ? decisionError.message : "Unable to record decision");
    } finally {
      setDecidingApprovalId("");
    }
  }

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!project) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    form.set("projectId", project.id);
    form.set("token", token);
    try {
      await api("/api/files", { method: "POST", body: form });
      formElement.reset();
      setNotice("File shared with your artist.");
      await load();
    } catch (uploadError) {
      setNotice(uploadError instanceof Error ? uploadError.message : "Upload failed");
    }
  }

  async function openPortalAsset(asset: AssetRecord) {
    try {
      await downloadAsset(asset, token);
      setNotice(`${asset.originalName} downloaded.`);
    } catch (downloadError) {
      setNotice(
        downloadError instanceof Error
          ? downloadError.message
          : "Unable to download file",
      );
    }
  }

  async function openCheckout(payment: PaymentRecord) {
    setPayingId(payment.id);
    try {
      const result = await api<{ url: string }>("/api/payments/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, paymentRequestId: payment.id }),
      });
      window.location.assign(result.url);
    } catch (checkoutError) {
      setNotice(checkoutError instanceof Error ? checkoutError.message : "Unable to open secure checkout");
      setPayingId("");
    }
  }

  async function submitHealingCheckin(event: FormEvent<HTMLFormElement>, healingCheckinId: string) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    try {
      await api("/api/portal/lifecycle", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, action: "submit_healing_checkin", healingCheckinId, clientNotes: values.clientNotes, progressRating: Number(values.progressRating), concernFlag: values.concernFlag === "on" }) });
      form.reset();
      setNotice("Healing check-in sent securely to your artist.");
      await loadLifecycle();
    } catch (healingError) {
      setNotice(healingError instanceof Error ? healingError.message : "Unable to submit healing check-in");
    }
  }

  async function updateMediaConsent(action: "grant_media_consent" | "revoke_media_consent") {
    try {
      await api("/api/portal/lifecycle", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, action }) });
      setNotice(action === "grant_media_consent" ? "Tattoo media permission granted. You can revoke it at any time." : "Tattoo media permission revoked. Future content drafting is blocked.");
      await loadLifecycle();
    } catch (consentError) {
      setNotice(consentError instanceof Error ? consentError.message : "Unable to update media permission");
    }
  }

  async function grantSocialConsent() {
    try {
      await api("/api/social/consent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token,
          action: "grant",
          scopes: [
            "profile",
            "media_metadata",
            "tattoo_post_detection",
            "engagement_metrics",
            "caption_summary",
          ],
        }),
      });
      setNotice("Instagram observation permission granted. You remain in control.");
      await loadSocial();
    } catch (socialError) {
      setNotice(
        socialError instanceof Error
          ? socialError.message
          : "Unable to grant permission",
      );
    }
  }

  async function revokeSocialConsent(grantId: string) {
    try {
      await api("/api/social/consent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, action: "revoke", grantId }),
      });
      setNotice("Social permission revoked. Future synchronization is stopped.");
      await loadSocial();
    } catch (socialError) {
      setNotice(
        socialError instanceof Error
          ? socialError.message
          : "Unable to revoke permission",
      );
    }
  }

  async function connectInstagram() {
    try {
      const result = await api<{
        authorizationUrl?: string;
        message?: string;
      }>("/api/social/instagram", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (result.authorizationUrl) {
        window.location.assign(result.authorizationUrl);
      } else {
        setNotice(result.message || "Instagram connection is not configured.");
      }
    } catch (socialError) {
      setNotice(
        socialError instanceof Error
          ? socialError.message
          : "Unable to connect Instagram",
      );
    }
  }

  if (loading) return <div className="portal-loading"><Brand /><Spinner label="Opening your secure project" /></div>;
  if (error || !data) {
    return (
      <main className="portal-error">
        <Brand />
        <AlertCircle size={35} />
        <h1>We could not open this portal.</h1>
        <p>{error}</p>
        <button className="gold-button" onClick={onInvalid}>Try another access code</button>
        <button className="text-button" onClick={onExit}>Exit secure portal</button>
      </main>
    );
  }

  const emptyPortal = {
    overview: {
      icon: HeartHandshake,
      title: "Your portal is active.",
      body: "Your artist has not connected a project yet. You can return using this same private link.",
    },
    intake: {
      icon: Sparkles,
      title: "Plan your next project",
      body: "Tell the studio what you want to create. Legacy OS will organize the request for artist review.",
    },
    messages: {
      icon: MessageSquareText,
      title: "No project conversation yet",
      body: "Messages become available as soon as the studio connects your first project.",
    },
    approvals: {
      icon: ShieldCheck,
      title: "Nothing needs your approval",
      body: "Versioned designs and other gated decisions will appear here after a project is connected.",
    },
    files: {
      icon: FileText,
      title: "No project files yet",
      body: "References and shared documents need a connected project so they remain correctly scoped.",
    },
    payments: {
      icon: CreditCard,
      title: "No payment requests yet",
      body: "Approved deposits and invoices will appear here when your artist connects them to a project.",
    },
    healing: {
      icon: HeartHandshake,
      title: "Healing support will appear here",
      body: "After a tattoo session, your studio can schedule private check-ins for days 3, 7, 14, and 30.",
    },
    privacy: {
      icon: LockKeyhole,
      title: "Your privacy boundary is active",
      body: "Social observation permissions remain off until a project is connected and you explicitly grant consent.",
    },
  }[tab];
  const EmptyPortalIcon = emptyPortal.icon;

  return (
    <div className="client-shell">
      <header className="client-header">
        <Brand />
        <nav>
          {(["overview", "intake", "messages", "approvals", "files", "payments", "healing", "privacy"] as const).map((item) => (
            <button className={tab === item ? "active" : ""} onClick={() => setTab(item)} key={item}>{item === "intake" ? "new project" : item}</button>
          ))}
        </nav>
        <div className="client-account">
          <span>{data.client.firstName.slice(0, 1)}{data.client.lastName.slice(0, 1)}</span>
          <div><strong>{fullName(data.client)}</strong><small>Client portal · <span className={cn("realtime-status", realtimeStatus)}><i />{realtimeStatus}</span></small></div>
          <button className="icon-button" onClick={onExit} aria-label="Exit portal"><X size={17} /></button>
        </div>
      </header>

      <main className="client-main">
        <div className="client-topline">
          <div>
            <p className="eyebrow gold">WELCOME BACK</p>
            <h1>{(data.client.preferredName || data.client.displayName || data.client.firstName || "Welcome").split(" ")[0]}, your creative workspace is ready.</h1>
            <p>Plan a project, review progress, share files, approve work, and message your artist in one secure place.</p>
          </div>
          {data.projects.length > 1 && (
            <label><span>PROJECT</span><select value={project?.id || ""} onChange={(event) => setProjectId(event.target.value)}>{data.projects.map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}</select></label>
          )}
        </div>
        {notice && <div className="portal-notice"><CheckCircle2 size={16} /> {notice}<button onClick={() => setNotice("")}><X size={14} /></button></div>}
        {tab === "intake" ? (
          <div className="client-intake-layout">
            <form className="client-card modal-form client-intake-form" onSubmit={submitProjectIntake}>
              <PanelTitle eyebrow="NEW PROJECT REQUEST" title="Tell us what you want to create" />
              <p className="form-intro">Share as much as you know today. Legacy OS will structure the request and send it to the artist for review; nothing is booked or charged automatically.</p>
              <label><span>YOUR IDEA *</span><textarea name="concept" required rows={5} placeholder="Describe the subject, story, mood, and important details..." /></label>
              <div className="field-row">
                <label><span>PLACEMENT</span><input name="placement" placeholder="Left forearm, upper back..." /></label>
                <label><span>APPROXIMATE SIZE</span><input name="sizeDescription" placeholder="6 inches, half sleeve..." /></label>
              </div>
              <label><span>STYLE OR VISUAL DIRECTION</span><input name="style" placeholder="Black and grey realism, fine line, illustrative..." /></label>
              <label><span>REFERENCE NOTES</span><textarea name="referencesSummary" rows={3} placeholder="Describe references you have or what inspires the direction." /></label>
              <label><span>CONSTRAINTS OR MUST-HAVES</span><textarea name="constraints" rows={3} placeholder="Existing tattoos, schedule limits, elements to include or avoid..." /></label>
              <div className="field-row">
                <label><span>BUDGET MINIMUM</span><input name="budgetMin" type="number" min="0" step="1" placeholder="$" /></label>
                <label><span>BUDGET MAXIMUM</span><input name="budgetMax" type="number" min="0" step="1" placeholder="$" /></label>
              </div>
              <label><span>IDEAL COMPLETION DATE</span><input name="targetDate" type="date" /></label>
              <button className="gold-button wide" type="submit" disabled={submittingIntake}>{submittingIntake ? <><Spinner label="Structuring request" /> Structuring request</> : <><Sparkles size={16} /> Send project for review</>}</button>
            </form>
            <section className="client-card candidate-status-list">
              <PanelTitle eyebrow="REQUEST HISTORY" title="Your project requests" />
              {data.candidates.length ? data.candidates.map((candidate) => (
                <article key={candidate.id}>
                  <span className={cn("status-badge", candidate.status)}>{candidate.status.replaceAll("_", " ")}</span>
                  <h3>{candidate.requestedTitle}</h3>
                  <p>{candidate.concept}</p>
                  <small>Submitted {formatDate(candidate.submittedAt, true)} · {Math.round(candidate.confidenceBps / 100)}% information confidence</small>
                  {candidate.clientResponse && <div className="candidate-response"><MessageSquareText size={15} /><p><strong>Studio response</strong>{candidate.clientResponse}</p></div>}
                </article>
              )) : <EmptyState icon={Sparkles} title="No project requests yet" body="Your submitted ideas and their review status will appear here." />}
            </section>
          </div>
        ) : !project ? (
          <section className="client-empty">
            <div className="large-brain-orb"><EmptyPortalIcon size={38} /></div>
            <h2>{emptyPortal.title}</h2>
            <p>{emptyPortal.body}</p>
          </section>
        ) : (
          <>
            <section className="client-project-hero">
              <div>
                <span className="status-badge">{project.lifecyclePhase}</span>
                <h2>{project.title}</h2>
                <p>{project.placement || "Placement to be confirmed"}</p>
              </div>
              <div className="client-facts">
                <div><small>NEXT STEP</small><strong>{project.nextAction || "Waiting for studio update"}</strong></div>
                <div><small>TARGET DATE</small><strong>{formatDate(project.targetDate)}</strong></div>
                <div><small>BUDGET RANGE</small><strong>{formatMoney(project.budgetMinCents)} – {formatMoney(project.budgetMaxCents)}</strong></div>
              </div>
              <Lifecycle phase={project.lifecyclePhase} />
            </section>

            {tab === "overview" && (
              <div className="client-grid">
                <section className="client-card project-summary">
                  <PanelTitle eyebrow="PROJECT OVERVIEW" title="Creative direction" />
                  <p>{project.clientSummary || "Your artist has not added a public project summary yet."}</p>
                  <div className="tag-row">
                    {JSON.parse(project.styleTagsJson || "[]").map((tag: string) => <span key={tag}>{tag}</span>)}
                  </div>
                </section>
                <section className="client-card">
                  <PanelTitle eyebrow="UPCOMING" title="Appointments" />
                  {data.appointments.filter((item) => item.projectId === project.id).length ? data.appointments.filter((item) => item.projectId === project.id).map((item) => (
                    <article className="client-appointment" key={item.id}><CalendarDays size={19} /><div><strong>{item.appointmentType}</strong><p>{formatDate(item.startsAt, true)}</p><small>{item.location || "Location to be confirmed"}</small></div></article>
                  )) : <EmptyState icon={CalendarDays} title="No appointment scheduled" body="Your artist will add confirmed dates here." />}
                </section>
                <section className="client-card">
                  <PanelTitle eyebrow="LATEST UPDATES" title="Project timeline" />
                  {data.updates.filter((item) => item.projectId === project.id).length ? data.updates.filter((item) => item.projectId === project.id).map((item) => (
                    <article className="update-item" key={item.id}><span /><div><strong>{item.title}</strong><p>{item.body}</p><small>{formatDate(item.createdAt, true)}</small></div></article>
                  )) : <EmptyState icon={Activity} title="No updates posted" body="Project milestones and studio updates will appear here." />}
                </section>
                <section className="client-card quick-client-actions">
                  <PanelTitle eyebrow="QUICK ACTIONS" title="Keep things moving" />
                  <button onClick={() => setTab("messages")}><MessageSquareText size={20} /><span><strong>Message artist</strong><small>Ask a question or add context</small></span><ArrowRight size={15} /></button>
                  <button onClick={() => setTab("files")}><Upload size={20} /><span><strong>Share reference</strong><small>Upload an image or document</small></span><ArrowRight size={15} /></button>
                  <button onClick={() => setTab("approvals")}><ShieldCheck size={20} /><span><strong>Review approvals</strong><small>{approvals.filter((item) => item.status === "pending").length} waiting</small></span><ArrowRight size={15} /></button>
                  <button onClick={() => setTab("payments")}><CreditCard size={20} /><span><strong>Payments</strong><small>{payments.filter((item) => ["approved", "open"].includes(item.status)).length} ready</small></span><ArrowRight size={15} /></button>
                  <button onClick={() => setTab("healing")}><HeartHandshake size={20} /><span><strong>Healing check-ins</strong><small>{lifecycle?.healingCheckins.filter((item) => item.status === "due").length || 0} scheduled</small></span><ArrowRight size={15} /></button>
                  <button onClick={() => setTab("intake")}><Sparkles size={20} /><span><strong>Plan another project</strong><small>Send a structured request</small></span><ArrowRight size={15} /></button>
                </section>
              </div>
            )}

            {tab === "messages" && (
              <section className="client-card client-messages">
                <PanelTitle eyebrow="SECURE CONVERSATION" title="Messages with your artist" />
                <div className="message-thread">
                  {messages.length ? messages.map((message) => (
                    <article className={cn("message-bubble", message.senderType === "client" && "owner")} key={message.id}><small>{message.senderType === "client" ? "You" : "Studio"} · {formatDate(message.createdAt, true)}{message.senderType === "client" && message.readAt ? " · Read by studio" : ""}</small><p>{message.body}</p></article>
                  )) : <EmptyState icon={MessageSquareText} title="No messages yet" body="Start a direct, project-connected conversation." />}
                </div>
                <form className="message-composer" onSubmit={sendMessage}><textarea name="body" required placeholder="Write a message to your artist..." /><button className="gold-button"><Send size={16} /> Send</button></form>
              </section>
            )}

            {tab === "approvals" && (
              <section className="client-card">
                <PanelTitle eyebrow="YOUR DECISIONS" title="Approvals" />
                {approvals.length ? <div className="portal-approval-list">{approvals.map((approval) => {
                  const approvalAsset = files.find((asset) => asset.id === approval.assetId);
                  return <article key={approval.id}>
                    <span className={cn("approval-status", approval.status)}>{approval.status}</span>
                    <h3>{approval.subject}</h3>
                    <p>{approval.summary}</p>
                    {approvalAsset && <div className="approval-artifact"><AssetPreview asset={approvalAsset} portalToken={token} /><small>{approvalAsset.originalName} · Version {approval.assetVersion || approvalAsset.version || 1}</small></div>}
                    <small>Requested {formatDate(approval.createdAt, true)}</small>
                    {approval.decisionReason && <p className="approval-decision-reason"><strong>{approval.status === "revision" ? "Requested changes" : "Decision note"}:</strong> {approval.decisionReason}</p>}
                    {approval.status === "pending" && revisionApprovalId !== approval.id && <div><button className="gold-button" disabled={Boolean(decidingApprovalId)} onClick={() => void decide(approval.id, "approved")}><Check size={15} /> {decidingApprovalId === approval.id ? "Recording…" : "Approve"}</button><button className="outline-button" disabled={Boolean(decidingApprovalId)} onClick={() => { setRevisionApprovalId(approval.id); setRevisionReason(""); }}><MessageSquareText size={15} /> Request revision</button></div>}
                    {approval.status === "pending" && revisionApprovalId === approval.id && <form className="revision-request-form" onSubmit={(event) => { event.preventDefault(); void decide(approval.id, "revision", revisionReason.trim()); }}><label><span>WHAT SHOULD CHANGE? *</span><textarea required minLength={3} value={revisionReason} onChange={(event) => setRevisionReason(event.target.value)} placeholder="Describe the exact changes you would like the artist to review." /></label><div><button className="text-button" type="button" onClick={() => { setRevisionApprovalId(""); setRevisionReason(""); }}>Cancel</button><button className="gold-button" disabled={Boolean(decidingApprovalId) || revisionReason.trim().length < 3}><MessageSquareText size={15} /> {decidingApprovalId === approval.id ? "Recording…" : "Send revision request"}</button></div></form>}
                  </article>;
                })}</div> : <EmptyState icon={ShieldCheck} title="Nothing needs approval" body="Designs and other gated decisions will appear here." />}
              </section>
            )}

            {tab === "files" && (
              <div className="client-files-layout">
                <section className="client-card">
                  <PanelTitle eyebrow="PROJECT FILES" title="Shared media" />
                  {files.length ? <div className="portal-media-grid">{files.map((asset) => (
                    <button onClick={() => void openPortalAsset(asset)} key={asset.id}>{asset.mediaType === "image" ? <AssetPreview asset={asset} portalToken={token} /> : <span className="portal-file-icon"><FileText size={24} /></span>}<div><strong>{asset.originalName}</strong><small>{asset.assetRole?.replaceAll("_", " ") || "project file"} · v{asset.version || 1}</small><small>{formatBytes(asset.byteSize)} · {formatDate(asset.createdAt)}</small></div><Download size={14} /></button>
                  ))}</div> : <EmptyState icon={FileText} title="No files shared yet" body="References and project documents will stay connected here." />}
                </section>
                <form className="client-card portal-upload" onSubmit={upload}><Upload size={28} /><h3>Share a reference</h3><p>Upload an image or document up to 25 MB.</p><input type="file" name="file" required /><button className="gold-button" type="submit"><Upload size={15} /> Upload file</button></form>
              </div>
            )}

            {tab === "payments" && (
              <section className="client-card client-payments">
                <PanelTitle eyebrow="SECURE CHECKOUT" title="Payments and receipts" />
                <div className="payment-safety"><ShieldCheck size={20} /><p><strong>Card details are entered on Stripe.</strong> Legacy OS records only verified payment status and receipt details.</p></div>
                {payments.length ? <div className="portal-payment-list">{payments.map((payment) => {
                  const balance = Math.max(0, payment.amountPaidCents - payment.amountRefundedCents);
                  return <article key={payment.id}><div><span className={cn("status-badge", payment.status)}>{payment.status.replaceAll("_", " ")}</span><h3>{payment.title}</h3><p>{payment.description || `${payment.kind} for ${project?.title || "your project"}`}</p><small>{payment.dueAt ? `Due ${formatDate(payment.dueAt)}` : `Created ${formatDate(payment.createdAt)}`}</small></div><div className="payment-amount"><strong>{formatMoney(payment.amountCents)}</strong>{payment.status === "paid" && <small>{formatMoney(balance)} paid</small>}{payment.amountRefundedCents > 0 && <small>{formatMoney(payment.amountRefundedCents)} refunded</small>}{["approved", "open"].includes(payment.status) && <button className="gold-button" disabled={payingId === payment.id} onClick={() => void openCheckout(payment)}><LockKeyhole size={14} /> {payingId === payment.id ? "Opening..." : "Pay securely"}</button>}</div></article>;
                })}</div> : <EmptyState icon={CreditCard} title="No payment requests" body="Your artist has not issued a deposit or invoice for this project." />}
              </section>
            )}

            {tab === "healing" && (
              <div className="client-healing-layout">
                <section className="client-card">
                  <PanelTitle eyebrow="PRIVATE FOLLOW-UP" title="Healing check-ins" />
                  <div className="healing-safety"><ShieldCheck size={20} /><p><strong>This is studio follow-up, not medical diagnosis.</strong> If you have urgent or serious health concerns, contact a qualified medical professional.</p></div>
                  {lifecycle?.healingCheckins.filter((item) => item.projectId === project.id).length ? <div className="healing-checkin-list">{lifecycle.healingCheckins.filter((item) => item.projectId === project.id).map((checkin) => <article key={checkin.id}>
                    <div className="healing-checkin-heading"><div><span className={cn("status-badge", checkin.status)}>{checkin.status.replaceAll("_", " ")}</span><h3>Day {checkin.checkpointDay} check-in</h3><small>Scheduled {formatDate(checkin.scheduledFor, true)}</small></div>{checkin.progressRating && <strong>{checkin.progressRating}/5</strong>}</div>
                    {checkin.ownerResponse && <div className="candidate-response"><MessageSquareText size={15} /><p><strong>Studio response</strong>{checkin.ownerResponse}</p></div>}
                    {["due", "submitted", "needs_attention"].includes(checkin.status) && !checkin.reviewedAt && <form className="modal-form" onSubmit={(event) => void submitHealingCheckin(event, checkin.id)}>
                      <label><span>HOW IS IT PROGRESSING?</span><select name="progressRating" required defaultValue=""><option value="" disabled>Select 1–5</option>{[1,2,3,4,5].map((rating) => <option value={rating} key={rating}>{rating} / 5</option>)}</select></label>
                      <label><span>PRIVATE NOTES FOR YOUR ARTIST</span><textarea name="clientNotes" rows={3} required defaultValue={checkin.clientNotes || ""} placeholder="Describe how the tattoo looks and feels today..." /></label>
                      <label className="consent-checkbox"><input name="concernFlag" type="checkbox" defaultChecked={checkin.concernFlag} /><span>Please prioritize this for artist review</span></label>
                      <button className="gold-button"><Send size={15} /> Submit secure check-in</button>
                    </form>}
                  </article>)}</div> : <EmptyState icon={HeartHandshake} title="No check-ins scheduled" body="Your artist will schedule follow-ups after a completed tattoo session." />}
                </section>
                <section className="client-card media-consent-panel">
                  <PanelTitle eyebrow="OPTIONAL MEDIA RELEASE" title="Tattoo photo permission" />
                  <p>Your project media stays private unless you explicitly allow portfolio and studio marketing use. Permission does not authorize automatic publishing; the owner still approves every draft.</p>
                  <ul><li>Portfolio display</li><li>Social content drafts</li><li>Studio marketing</li></ul>
                  {lifecycle?.mediaConsent?.status === "granted" ? <div className="consent-actions"><span><CheckCircle2 size={16} /> Permission granted</span><button className="text-button" onClick={() => void updateMediaConsent("revoke_media_consent")}>Revoke permission</button></div> : <button className="gold-button" onClick={() => void updateMediaConsent("grant_media_consent")}><ShieldCheck size={15} /> Grant optional media permission</button>}
                </section>
              </div>
            )}

            {tab === "privacy" && (
              <section className="client-card social-consent-card">
                <PanelTitle
                  eyebrow="YOUR DATA, YOUR CONTROL"
                  title="Social observation permissions"
                />
                <div className="consent-explainer">
                  <ShieldCheck size={24} />
                  <div>
                    <h3>Legacy OS only observes what you explicitly allow.</h3>
                    <p>
                      With your permission, a connected Instagram professional
                      account can provide post metadata and engagement metrics
                      when a post appears related to this tattoo. Legacy OS uses
                      that evidence to measure project outcomes and improve
                      future recommendations. It does not publish, message, or
                      change your account.
                    </p>
                  </div>
                </div>
                <div className="consent-scope-grid">
                  {[
                    ["Profile", "Account identity needed to bind the correct professional account."],
                    ["Media metadata", "Post type, timestamp, and permitted caption summary."],
                    ["Tattoo matching", "A confidence score linking a post to this project."],
                    ["Engagement metrics", "Permitted aggregate reach and interaction measurements."],
                    ["Caption summary", "A short derived summary; raw captions are not retained by default."],
                  ].map(([title, body]) => (
                    <article key={title}>
                      <CheckCircle2 size={15} />
                      <div><strong>{title}</strong><p>{body}</p></div>
                    </article>
                  ))}
                </div>
                {social?.grants.some((grant) => grant.status === "granted") ? (
                  <div className="consent-actions">
                    <span><CheckCircle2 size={16} /> Permission granted</span>
                    <button className="gold-button" onClick={connectInstagram}>
                      <Link2 size={15} /> Connect Instagram
                    </button>
                    <button
                      className="text-button"
                      onClick={() => {
                        const grant = social.grants.find(
                          (item) => item.status === "granted",
                        );
                        if (grant) void revokeSocialConsent(grant.id);
                      }}
                    >
                      Revoke permission
                    </button>
                  </div>
                ) : (
                  <div className="consent-actions">
                    <button className="gold-button" onClick={grantSocialConsent}>
                      <ShieldCheck size={15} /> Grant these permissions
                    </button>
                    <small>
                      You can revoke access at any time. Revocation stops future
                      synchronization and disconnects the account.
                    </small>
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </main>
      <footer className="client-footer"><Brand compact /><span className="release-version">v{LEGACY_OS_VERSION} · {LEGACY_OS_RELEASE}</span><span><ShieldCheck size={15} /> {data.access.method === "account" ? "Verified account access" : `Private project access · Expires ${formatDate(data.access.expiresAt)}`}</span></footer>
    </div>
  );
}

export function LegacyApp({
  firstName,
  initialMode = "owner",
  authenticatedClient = false,
  onSignOut,
}: {
  firstName: string;
  initialMode?: "owner" | "portal";
  authenticatedClient?: boolean;
  onSignOut: () => void;
}) {
  const [mode, setMode] = useState<"owner" | "portal">(initialMode);
  const [portalToken, setPortalToken] = useState("");
  const [view, setView] = useState<OwnerView>("dashboard");
  const [navigationTarget, setNavigationTarget] = useState<NavigationTarget>({
    view: "dashboard",
  });
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [modal, setModal] = useState<"client" | "project" | "appointment" | null>(null);
  const [newProjectClientId, setNewProjectClientId] = useState<string | undefined>();
  const [inviteClient, setInviteClient] = useState<ClientRecord | null>(null);
  const [toast, setToast] = useState<{ message: string; error: boolean } | null>(null);
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [generating, setGenerating] = useState(false);
  const [personalization, setPersonalization] =
    useState<PersonalizationPreferences>(readPersonalization);

  const notify = useCallback((message: string, isError = false) => {
    setToast({ message, error: isError });
    window.setTimeout(() => setToast(null), 4200);
  }, []);

  const updatePersonalization = useCallback(
    (next: PersonalizationPreferences) => {
      setPersonalization(next);
      applyPersonalization(next);
      window.localStorage.setItem("legacy_personalization", JSON.stringify(next));
      notify("Appearance saved on this device.");
    },
    [notify],
  );

  const load = useCallback(async () => {
    try {
      const result = await api<WorkspaceData>("/api/workspace");
      setData(result);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load Legacy OS");
    } finally {
      setLoading(false);
    }
  }, []);
  const realtimeStatus = useRealtimeFeed("owner", null, load, mode === "owner" && Boolean(data));

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("portal");
      if (token) {
        window.sessionStorage.setItem("legacy_client_invitation", token);
        setPortalToken(token);
        setMode("portal");
          } else if (params.has("payment")) {
        const storedToken = window.sessionStorage.getItem("legacy_client_invitation");
        if (storedToken) {
          setPortalToken(storedToken);
              setMode("portal");
            }
          }
          const connectorResult = params.get("connector");
          if (connectorResult === "connected") notify(`${params.get("provider") === "gmail" ? "Gmail" : "Google Calendar"} connected securely.`);
          else if (connectorResult === "failed") notify("Google connection was not completed. Check the OAuth configuration and try again.", true);
          if (connectorResult) {
            params.delete("connector");
            params.delete("provider");
            const query = params.toString();
            window.history.replaceState({}, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
          }
          void load();
    }, 0);
    return () => window.clearTimeout(handle);
      }, [load, notify]);

  async function generateBriefing() {
    setGenerating(true);
    try {
      const result = await api<Briefing>("/api/briefing", { method: "POST" });
      setBriefing(result);
      notify("Daily briefing generated and recorded in AI Operations.");
      await load();
    } catch (briefError) {
      notify(briefError instanceof Error ? briefError.message : "Unable to prepare briefing", true);
    } finally {
      setGenerating(false);
    }
  }

  const firstClient = data?.clients[0];
  const navigate = useCallback((target: NavigationTarget) => {
    setNavigationTarget(target);
    setView(target.view);
  }, []);

  function openNew() {
    if (view === "clients") setModal("client");
    else if (view === "calendar") setModal("appointment");
    else if (!firstClient) setModal("client");
    else setModal("project");
  }

  function openProjectForClient(clientId?: string) {
    setNewProjectClientId(clientId);
    setModal("project");
  }

  const actualFirstName = useMemo(() => {
    const name = data?.owner?.displayName || firstName || "Owner";
    return name.split(" ")[0];
  }, [data?.owner?.displayName, firstName]);

  if (mode === "portal") {
    return (
      <PortalAccess
        key={
          authenticatedClient
            ? "__authenticated__"
            : portalToken || "manual"
        }
        initialToken={portalToken}
        authenticated={authenticatedClient}
        onExit={() => {
          if (initialMode === "portal") {
            onSignOut();
            return;
          }
          window.history.replaceState({}, "", window.location.pathname);
          setPortalToken("");
          setMode("owner");
        }}
      />
    );
  }

  if (loading) return <div className="full-loading"><Brand /><Spinner /></div>;
  if (error || !data) {
    return (
      <main className="fatal-state">
        <Brand />
        <AlertCircle size={34} />
        <h1>Legacy OS could not load the workspace.</h1>
        <p>{error}</p>
        <button className="gold-button" onClick={() => { setLoading(true); void load(); }}>Try again</button>
      </main>
    );
  }

  return (
    <div className="owner-shell">
      <OwnerSidebar
        view={view}
        onView={(nextView) => navigate({ view: nextView })}
        owner={data.owner}
        workspace={data.workspace}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onPortal={() => setMode("portal")}
        onSignOut={onSignOut}
      />
      <main className="owner-main">
        <OwnerHeader
          view={view}
          data={data}
          onNavigate={navigate}
          onMenu={() => setMenuOpen(true)}
          onNew={openNew}
          refresh={load}
          realtimeStatus={realtimeStatus}
        />
        <div className="owner-content">
          {view === "dashboard" && <Dashboard data={data} firstName={actualFirstName} briefing={briefing} generating={generating} onGenerate={generateBriefing} onClient={() => setModal("client")} onProject={() => setModal("project")} onAppointment={() => setModal("appointment")} onView={(nextView) => navigate({ view: nextView })} />}
          {view === "projects" && <ProjectsView key={navigationTarget.view === "projects" ? navigationTarget.id || "projects" : "projects"} data={data} onCreate={() => setModal("project")} refresh={load} notify={notify} onNavigate={navigate} targetId={navigationTarget.view === "projects" ? navigationTarget.id : undefined} />}
          {view === "clients" && <ClientsView key={navigationTarget.view === "clients" ? navigationTarget.id || "clients" : "clients"} data={data} onCreate={() => setModal("client")} onInvite={setInviteClient} refresh={load} notify={notify} onNavigate={navigate} targetId={navigationTarget.view === "clients" ? navigationTarget.id : undefined} />}
          {view === "calendar" && <CalendarView key={navigationTarget.view === "calendar" ? navigationTarget.id || "calendar" : "calendar"} data={data} onCreate={() => setModal("appointment")} refresh={load} notify={notify} targetId={navigationTarget.view === "calendar" ? navigationTarget.id : undefined} />}
          {view === "inbox" && <InboxView key={navigationTarget.view === "inbox" ? navigationTarget.id || "inbox" : "inbox"} data={data} onSent={load} notify={notify} targetId={navigationTarget.view === "inbox" ? navigationTarget.id : undefined} />}
          {view === "design" && <DesignStudio key={navigationTarget.view === "design" ? `${navigationTarget.id || "design"}:${navigationTarget.clientId || "all"}` : "design"} data={data} refresh={load} notify={notify} targetId={navigationTarget.view === "design" ? navigationTarget.id : undefined} clientId={navigationTarget.view === "design" ? navigationTarget.clientId : undefined} onCreateProject={openProjectForClient} />}
          {view === "chief" && <ChiefView data={data} briefing={briefing} generating={generating} onGenerate={generateBriefing} />}
          {view === "operations" && <OperationsView data={data} refresh={load} notify={notify} />}
          {view === "analytics" && <AnalyticsView data={data} onNavigate={navigate} />}
              {(view === "knowledge" || view === "content") && (
                <ModuleView key={view} type={view} data={data} refresh={load} notify={notify} />
              )}
          {view === "finances" && <FinanceView data={data} refresh={load} notify={notify} />}
          {view === "settings" && <SettingsView data={data} notify={notify} refresh={load} onView={(nextView) => navigate({ view: nextView })} personalization={personalization} onPersonalization={updatePersonalization} />}
        </div>
        <footer className="owner-footer"><span>LEGACY OS</span><p>Built for creators. Designed to last.</p><span className="daylight-credit" role="img" aria-label="Powered by Daylight Forge"><span className="daylight-credit-mark" aria-hidden="true" /></span><span className="release-version">v{LEGACY_OS_VERSION} · {LEGACY_OS_RELEASE}</span><span><i /> CORE SYSTEMS OPERATIONAL</span></footer>
      </main>

      {modal === "client" && <ClientForm onClose={() => setModal(null)} onSaved={load} notify={notify} />}
      {modal === "project" && <ProjectForm clients={data.clients} initialClientId={newProjectClientId} onClose={() => { setModal(null); setNewProjectClientId(undefined); }} onSaved={load} notify={notify} />}
      {modal === "appointment" && <AppointmentForm data={data} onClose={() => setModal(null)} onSaved={load} notify={notify} />}
      {inviteClient && <InviteModal client={inviteClient} onClose={() => setInviteClient(null)} notify={notify} />}
      {toast && <div className={cn("toast", toast.error && "error")} role="status">{toast.error ? <AlertCircle size={17} /> : <CheckCircle2 size={17} />}{toast.message}</div>}
    </div>
  );
}
