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
  FileText,
  FolderKanban,
  Gauge,
  HeartHandshake,
  Image as ImageIcon,
  Inbox,
  LayoutDashboard,
  Library,
  Link2,
  LockKeyhole,
  Menu,
  MessageSquareText,
  Plus,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Upload,
  UserRound,
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

type ClientRecord = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  preferredChannel: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
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

type ApprovalRecord = {
  id: string;
  projectId: string | null;
  category: string;
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

type WorkspaceData = {
  workspace: {
    id: string;
    name: string;
    timezone: string;
    aiContentCapture: string;
  } | null;
  owner: {
    id: string;
    email: string;
    displayName: string;
    role: string;
  } | null;
  clients: ClientRecord[];
  projects: ProjectRecord[];
  appointments: AppointmentRecord[];
  approvals: ApprovalRecord[];
  messages: MessageRecord[];
  assets: AssetRecord[];
  aiRuns: RunRecord[];
  auditEvents: AuditRecord[];
};

type PortalData = {
  workspace: { name: string; timezone: string } | null;
  client: ClientRecord;
  projects: ProjectRecord[];
  appointments: AppointmentRecord[];
  approvals: ApprovalRecord[];
  messages: MessageRecord[];
  assets: AssetRecord[];
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
  }>;
  confidence: number;
  generatedAt: string;
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
    label: "COMMAND CENTER",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "projects", label: "Projects", icon: FolderKanban },
      { id: "clients", label: "Clients", icon: UsersRound },
      { id: "calendar", label: "Calendar", icon: CalendarDays },
      { id: "inbox", label: "Inbox", icon: Inbox },
      { id: "knowledge", label: "Knowledge", icon: BookOpen },
      { id: "content", label: "Content", icon: ImageIcon },
      { id: "finances", label: "Finances", icon: CircleDollarSign },
      { id: "analytics", label: "Analytics", icon: BarChart3 },
      { id: "chief", label: "AI Chief of Staff", icon: BrainCircuit },
    ],
  },
  {
    label: "RESOURCES",
    items: [
      { id: "design", label: "Design Studio", icon: Brush },
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
  return client ? `${client.firstName} ${client.lastName}` : "Unassigned client";
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

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  const token =
    typeof window === "undefined"
      ? null
      : window.localStorage.getItem("legacy_access_token");
  if (token && !headers.has("authorization")) {
    headers.set("authorization", `Bearer ${token}`);
  }
  const response = await fetch(path, { ...init, headers });
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || "Something went wrong");
  return data;
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
}: {
  view: OwnerView;
  onView: (view: OwnerView) => void;
  owner: WorkspaceData["owner"];
  workspace: WorkspaceData["workspace"];
  open: boolean;
  onClose: () => void;
  onPortal: () => void;
}) {
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
          <div className="owner-profile">
            <span>{(owner?.displayName || "O").slice(0, 1).toUpperCase()}</span>
            <div>
              <strong>{owner?.displayName || "Studio owner"}</strong>
              <small>{workspace?.name || "Legacy Studio"}</small>
            </div>
            <ChevronDown size={15} />
          </div>
        </div>
      </aside>
    </>
  );
}

function OwnerHeader({
  view,
  onMenu,
  onNew,
}: {
  view: OwnerView;
  onMenu: () => void;
  onNew: () => void;
}) {
  const detail = viewDetails[view];
  return (
    <header className="owner-header">
      <button className="mobile-menu" onClick={onMenu} aria-label="Open menu">
        <Menu size={20} />
      </button>
      <div>
        <h1>{detail.title}</h1>
        <p>{detail.subtitle}</p>
      </div>
      <div className="header-tools">
        <button className="search-control">
          <Search size={16} />
          <span>Search anything...</span>
          <kbd>⌘ K</kbd>
        </button>
        <button className="icon-button" aria-label="Notifications">
          <Bell size={18} />
        </button>
        <button className="gold-button" onClick={onNew}>
          <Plus size={17} /> New
        </button>
      </div>
    </header>
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
    .filter((item) => !["completed", "cancelled"].includes(item.status))
    .slice(0, 5);
  const activeProjects = data.projects.filter(
    (item) => item.status === "active",
  );
  const pending = data.approvals.filter((item) => item.status === "pending");
  const unread = data.messages.filter(
    (item) => item.senderType === "client" && !item.status.includes("read"),
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
          <i /> SYSTEM OPERATIONAL
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
}: {
  data: WorkspaceData;
  onCreate: () => void;
  refresh: () => void;
  notify: (message: string, error?: boolean) => void;
}) {
  const [filter, setFilter] = useState<"all" | "active" | "complete">("all");
  const [selected, setSelected] = useState<string | null>(
    data.projects[0]?.id ?? null,
  );
  const filteredProjects = data.projects.filter((item) => {
    if (filter === "active") return item.status === "active";
    if (filter === "complete") return item.lifecyclePhase === "complete";
    return true;
  });
  const project =
    filteredProjects.find((item) => item.id === selected) ??
    filteredProjects[0];

  async function advanceProject() {
    if (!project) return;
    const index = phases.indexOf(project.lifecyclePhase);
    const nextPhase = phases[Math.min(phases.length - 1, index + 1)];
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
      refresh();
    } catch (advanceError) {
      notify(
        advanceError instanceof Error
          ? advanceError.message
          : "Unable to advance project",
        true,
      );
    }
  }
  return (
    <section className="page-stack">
      <div className="section-toolbar">
        <div className="filter-tabs">
          <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>All projects <span>{data.projects.length}</span></button>
          <button className={filter === "active" ? "active" : ""} onClick={() => setFilter("active")}>Active <span>{data.projects.filter((item) => item.status === "active").length}</span></button>
          <button className={filter === "complete" ? "active" : ""} onClick={() => setFilter("complete")}>Complete <span>{data.projects.filter((item) => item.lifecyclePhase === "complete").length}</span></button>
        </div>
        <button className="gold-button" onClick={onCreate}>
          <Plus size={16} /> New project
        </button>
      </div>
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
              <div className="project-detail-actions">
                <span>
                  {project.lifecyclePhase === "complete"
                    ? "Learning captured from this completed project."
                    : "Advancing records a workflow observation automatically."}
                </span>
                {project.lifecyclePhase !== "complete" && (
                  <button className="gold-button" onClick={advanceProject}>
                    Advance to{" "}
                    {phases[
                      Math.min(
                        phases.length - 1,
                        phases.indexOf(project.lifecyclePhase) + 1,
                      )
                    ]}
                    <ArrowRight size={15} />
                  </button>
                )}
              </div>
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
}: {
  data: WorkspaceData;
  onCreate: () => void;
  onInvite: (client: ClientRecord) => void;
}) {
  return (
    <section className="page-stack">
      <div className="section-toolbar">
        <div className="filter-tabs">
          <button className="active">Active clients <span>{data.clients.length}</span></button>
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
      ) : (
        <section className="os-panel table-panel">
          <div className="data-table clients-table">
            <div className="table-row table-head">
              <span>Client</span><span>Contact</span><span>Projects</span><span>Status</span><span>Portal</span>
            </div>
            {data.clients.map((client) => {
              const count = data.projects.filter(
                (project) => project.clientId === client.id,
              ).length;
              return (
                <div className="table-row" key={client.id}>
                  <span className="client-cell">
                    <i>{client.firstName.slice(0, 1)}{client.lastName.slice(0, 1)}</i>
                    <span><strong>{fullName(client)}</strong><small>Added {formatDate(client.createdAt)}</small></span>
                  </span>
                  <span><strong>{client.email || "No email"}</strong><small>{client.phone || "No phone"}</small></span>
                  <span>{count}</span>
                  <span><b className="status-dot" /> {client.status}</span>
                  <span>
                    <button className="outline-button small" onClick={() => onInvite(client)}>
                      <Link2 size={14} /> Create access
                    </button>
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </section>
  );
}

function CalendarView({
  data,
  onCreate,
}: {
  data: WorkspaceData;
  onCreate: () => void;
}) {
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
                <article key={appointment.id}>
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
}: {
  data: WorkspaceData;
  onSent: () => void;
  notify: (message: string, error?: boolean) => void;
}) {
  const [clientId, setClientId] = useState(data.clients[0]?.id || "");
  const messages = data.messages.filter(
    (message) => !clientId || message.clientId === clientId,
  );
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api("/api/messages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          clientId,
          body: form.get("body"),
        }),
      });
      event.currentTarget.reset();
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
          data.clients.map((client) => (
            <button className={cn(clientId === client.id && "active")} key={client.id} onClick={() => setClientId(client.id)}>
              <span>{client.firstName.slice(0, 1)}{client.lastName.slice(0, 1)}</span>
              <div><strong>{fullName(client)}</strong><small>{client.email || "Client portal"}</small></div>
            </button>
          ))
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
                    <small>{message.senderType === "owner" ? "Studio" : "Client"} · {formatDate(message.createdAt, true)}</small>
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
}: {
  data: WorkspaceData;
  refresh: () => void;
  notify: (message: string, error?: boolean) => void;
}) {
  const [projectId, setProjectId] = useState(data.projects[0]?.id || "");
  const project = data.projects.find((item) => item.id === projectId);
  const projectAssets = data.assets.filter((item) => item.projectId === projectId);
  const projectApprovals = data.approvals.filter((item) => item.projectId === projectId);

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    form.set("projectId", projectId);
    try {
      await api("/api/files", { method: "POST", body: form });
      event.currentTarget.reset();
      notify("Design file stored and written to the audit trail.");
      refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Upload failed", true);
    }
  }

  async function requestApproval() {
    if (!project) return;
    try {
      await api("/api/approvals", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          category: "design",
          subject: `${project.title} design review`,
          summary: "Review the latest shared design file and approve it or request a revision.",
          riskLevel: "medium",
        }),
      });
      notify("Client approval request created.");
      refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to request approval", true);
    }
  }

  if (!project) {
    return (
      <section className="os-panel tall-empty">
        <EmptyState icon={Brush} title="Design Studio needs a project" body="Create a client project before adding references, design versions, or approval gates." />
      </section>
    );
  }

  return (
    <section className="design-studio">
      <div className="design-toolbar">
        <label>
          <span>PROJECT</span>
          <select value={projectId} onChange={(event) => setProjectId(event.target.value)}>
            {data.projects.map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}
          </select>
        </label>
        <div>
          <button className="outline-button"><Brush size={15} /> Select</button>
          <button className="outline-button"><WandSparkles size={15} /> AI Enhance</button>
          <button className="gold-button" onClick={requestApproval}><ShieldCheck size={15} /> Request approval</button>
        </div>
      </div>
      <div className="design-grid">
        <aside className="reference-column os-panel">
          <PanelTitle eyebrow="REFERENCE BOARD" title="Project files" />
          {projectAssets.length ? (
            <div className="asset-list">
              {projectAssets.map((asset) => (
                <a href={`/api/files?id=${asset.id}`} target="_blank" key={asset.id}>
                  <span><FileText size={17} /></span>
                  <div><strong>{asset.originalName}</strong><small>{formatBytes(asset.byteSize)} · {asset.sourceType.replace("_", " ")}</small></div>
                </a>
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
            <button className="outline-button small" type="submit">Upload</button>
          </form>
        </aside>
        <section className="design-canvas os-panel">
          <header><span>CANVAS</span><small>{project.placement || "Placement not set"}</small></header>
          <div className="canvas-empty">
            <div className="canvas-emblem"><span>L</span></div>
            <p>{project.title}</p>
            <small>Select a project file to review it here. The stored original remains unchanged.</small>
          </div>
          <footer>
            <span>PROJECT NOTE</span>
            <p>{project.summary || "Add the creative direction to the project brief."}</p>
          </footer>
        </section>
        <aside className="approval-column os-panel">
          <PanelTitle eyebrow="CLIENT REVIEW" title="Approvals" />
          {projectApprovals.length ? (
            <div className="approval-stack">
              {projectApprovals.map((approval) => (
                <article key={approval.id}>
                  <span className={cn("approval-status", approval.status)}>{approval.status}</span>
                  <strong>{approval.subject}</strong>
                  <p>{approval.summary}</p>
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
  const [intelligenceError, setIntelligenceError] = useState("");

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

  useEffect(() => {
    const handle = window.setTimeout(() => void loadIntelligence(), 0);
    return () => window.clearTimeout(handle);
  }, [loadIntelligence]);

  async function learnNow() {
    setLearning(true);
    try {
      await api("/api/intelligence", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ triggerType: "owner_requested" }),
      });
      await loadIntelligence();
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
        </aside>
      </div>
      <div className="chief-columns">
        <section className="os-panel">
          <PanelTitle eyebrow="RECOMMENDATIONS" title="Prioritized work" />
          {briefing?.priorities.length ? (
            <div className="recommendation-list">
              {briefing.priorities.map((priority, index) => (
                <article key={priority.id}>
                  <span>{index + 1}</span>
                  <div><strong>{priority.title}</strong><p>{priority.detail}</p></div>
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
          </div>
        </section>
      </div>
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
                  {pattern.distinctProjects} projects · {pattern.distinctClients} clients · v{pattern.version}
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

function OperationsView({ data }: { data: WorkspaceData }) {
  const succeeded = data.aiRuns.filter((run) => run.status === "succeeded").length;
  const successRate = data.aiRuns.length
    ? Math.round((succeeded / data.aiRuns.length) * 100)
    : 0;
  return (
    <section className="page-stack">
      <div className="operations-banner">
        <div>
          <p className="eyebrow gold">GLASS BOX OBSERVABILITY</p>
          <h2>Nothing the AI does is hidden.</h2>
          <p>Runs and human actions are recorded from the live workspace. Prompt and client content stays off by default.</p>
        </div>
        <div className="capture-chip"><ShieldCheck size={18} /><span><small>CAPTURE POLICY</small><strong>Metadata only</strong></span></div>
      </div>
      <section className="stats-grid operations-stats">
        <StatCard icon={Bot} label="RECORDED RUNS" value={data.aiRuns.length} detail="All time in this workspace" />
        <StatCard icon={Gauge} label="SUCCESS RATE" value={`${successRate}%`} detail={data.aiRuns.length ? "Calculated from completed runs" : "Waiting for first run"} />
        <StatCard icon={Clock3} label="LAST RUN" value={data.aiRuns[0] ? formatDate(data.aiRuns[0].createdAt, true) : "None"} detail="Most recent automation event" />
        <StatCard icon={Activity} label="AUDIT EVENTS" value={data.auditEvents.length} detail="Recent owner, client, and system actions" />
      </section>
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
    </section>
  );
}

function AnalyticsView({ data }: { data: WorkspaceData }) {
  const phaseCounts = phases.map((phase) => ({
    phase,
    count: data.projects.filter((project) => project.lifecyclePhase === phase).length,
  }));
  const max = Math.max(1, ...phaseCounts.map((item) => item.count));
  return (
    <section className="page-stack">
      {data.projects.length === 0 ? (
        <section className="os-panel tall-empty">
          <EmptyState icon={BarChart3} title="Analytics will grow with your studio" body="No fabricated charts are shown. Real trends appear after projects, appointments, approvals, and outcomes are recorded." />
        </section>
      ) : (
        <>
          <section className="stats-grid">
            <StatCard icon={UsersRound} label="CLIENTS" value={data.clients.length} detail="Saved client records" />
            <StatCard icon={FolderKanban} label="PROJECTS" value={data.projects.length} detail="Across every lifecycle phase" />
            <StatCard icon={CalendarDays} label="APPOINTMENTS" value={data.appointments.length} detail="Recorded schedule commitments" />
            <StatCard icon={ShieldCheck} label="APPROVALS" value={data.approvals.length} detail="Client and owner decisions" />
          </section>
          <section className="os-panel lifecycle-analytics">
            <PanelTitle eyebrow="PROJECT DISTRIBUTION" title="Lifecycle activity" />
            <div className="bar-chart">
              {phaseCounts.map((item) => (
                <div key={item.phase}>
                  <span><i style={{ height: `${Math.max(4, (item.count / max) * 100)}%` }} /></span>
                  <strong>{item.count}</strong>
                  <small>{item.phase}</small>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </section>
  );
}

function ModuleView({
  type,
  data,
}: {
  type: "knowledge" | "content" | "finances";
  data: WorkspaceData;
}) {
  const config = {
    knowledge: {
      icon: Library,
      title: "Your knowledge library starts empty",
      body: "Technique notes, lessons, references, and evidence will be captured from real projects—never prefilled with fictional work.",
      labels: ["Techniques", "Lessons", "References", "Project notes"],
    },
    content: {
      icon: ImageIcon,
      title: "No content is queued",
      body: "Completed sessions and healed outcomes can become reels, posts, captions, and portfolio entries after you add project media.",
      labels: ["Select", "Draft", "Approve", "Schedule"],
    },
    finances: {
      icon: CreditCard,
      title: "No financial records yet",
      body: "Deposits, invoices, and revenue will appear only after a real project has a financial event.",
      labels: ["Deposits", "Invoices", "Payments", "Reports"],
    },
  }[type];
  const [activeTab, setActiveTab] = useState(config.labels[0]);
  const Icon = config.icon;
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
      </div>
      <section className="os-panel tall-empty">
        <EmptyState
          icon={Icon}
          title={`${activeTab}: ${config.title}`}
          body={`${config.body} The ${activeTab.toLowerCase()} filter is active.`}
        />
        <div className="module-integrity"><ShieldCheck size={16} /> Empty by design · {data.projects.length} live projects available as future sources</div>
      </section>
    </section>
  );
}

function SettingsView({
  data,
  notify,
  refresh,
}: {
  data: WorkspaceData;
  notify: (message: string, error?: boolean) => void;
  refresh: () => void;
}) {
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
        <button className="active"><Settings size={15} /> Workspace</button>
        <button><Bot size={15} /> AI & Models</button>
        <button><UsersRound size={15} /> Team</button>
        <button><ShieldCheck size={15} /> Security</button>
        <button><Bell size={15} /> Notifications</button>
      </div>
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
        </section>
        <button className="gold-button save-settings" type="submit"><Check size={16} /> Save changes</button>
      </form>
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
          <Field label="First name" name="firstName" required />
          <Field label="Last name" name="lastName" required />
        </div>
        <Field label="Email" name="email" type="email" placeholder="client@example.com" />
        <Field label="Phone" name="phone" type="tel" />
        <Field label="Preferred channel" name="preferredChannel">
          <select name="preferredChannel"><option value="email">Email</option><option value="sms">SMS</option><option value="portal">Client portal</option></select>
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
  onClose,
  onSaved,
  notify,
}: {
  clients: ClientRecord[];
  onClose: () => void;
  onSaved: () => void;
  notify: (message: string, error?: boolean) => void;
}) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await api("/api/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...values,
          budgetMin: values.budgetMin ? Number(values.budgetMin) : undefined,
          budgetMax: values.budgetMax ? Number(values.budgetMax) : undefined,
        }),
      });
      notify("Project created and connected to the client.");
      onClose();
      onSaved();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to create project", true);
    }
  }
  return (
    <Modal title="Create a project" eyebrow="TATTOO LIFECYCLE" onClose={onClose}>
      {clients.length === 0 ? (
        <EmptyState icon={UsersRound} title="Add a client first" body="Every project belongs to a real client record." />
      ) : (
        <form className="modal-form" onSubmit={submit}>
          <Field label="Client" name="clientId">
            <select name="clientId" required>{clients.map((client) => <option value={client.id} key={client.id}>{fullName(client)}</option>)}</select>
          </Field>
          <Field label="Project title" name="title" required placeholder="e.g. Full sleeve — guardian" />
          <div className="field-row">
            <Field label="Placement" name="placement" placeholder="Left upper arm" />
            <Field label="Target date" name="targetDate" type="date" />
          </div>
          <Field label="Style tags" name="style" placeholder="Black & grey, realism, ornamental" />
          <Field label="Creative brief" name="summary"><textarea name="summary" placeholder="Concept, mood, non-negotiables, and creative direction..." /></Field>
          <div className="field-row">
            <Field label="Budget minimum" name="budgetMin" type="number" />
            <Field label="Budget maximum" name="budgetMax" type="number" />
          </div>
          <div className="modal-actions"><button className="text-button" type="button" onClick={onClose}>Cancel</button><button className="gold-button" type="submit">Create project</button></div>
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
  onSaved: () => void;
  notify: (message: string, error?: boolean) => void;
}) {
  const [clientId, setClientId] = useState(data.clients[0]?.id || "");
  const projects = data.projects.filter((item) => item.clientId === clientId);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await api("/api/appointments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      notify("Appointment added to the live schedule.");
      onClose();
      onSaved();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to schedule", true);
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
          <div className="modal-actions"><button className="text-button" type="button" onClick={onClose}>Cancel</button><button className="gold-button" type="submit">Schedule</button></div>
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
  const [invite, setInvite] = useState<{ portalUrl: string; expiresAt: string } | null>(null);
  const [creating, setCreating] = useState(false);
  async function create() {
    setCreating(true);
    try {
      const result = await api<{ portalUrl: string; expiresAt: string }>("/api/portal/invitations", {
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
    await navigator.clipboard.writeText(invite.portalUrl);
    notify("Portal link copied.");
  }
  return (
    <Modal title={`Client portal · ${fullName(client)}`} eyebrow="SECURE ACCESS" onClose={onClose}>
      <div className="invite-content">
        <div className="security-note"><LockKeyhole size={20} /><div><strong>One active link per client</strong><p>Creating a new link revokes the previous one. Access expires after 30 days and can be renewed.</p></div></div>
        {invite ? (
          <>
            <label className="field"><span>Private portal link</span><div className="copy-field"><input readOnly value={invite.portalUrl} /><button onClick={copy}><Copy size={16} /></button></div></label>
            <p className="expiry-note">Expires {formatDate(invite.expiresAt, true)}</p>
            <div className="modal-actions"><button className="outline-button" onClick={() => window.open(invite.portalUrl, "_blank")}>Open portal</button><button className="gold-button" onClick={copy}><Copy size={15} /> Copy link</button></div>
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
          <button className="text-button" onClick={onExit}><ArrowLeft size={14} /> Return to owner workspace</button>
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
    "overview" | "messages" | "approvals" | "files" | "privacy"
  >("overview");
  const [projectId, setProjectId] = useState("");
  const [notice, setNotice] = useState("");
  const [social, setSocial] = useState<SocialAccessData | null>(null);

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
  const project = data?.projects.find((item) => item.id === projectId) || data?.projects[0];
  const messages = data?.messages.filter((item) => !project || !item.projectId || item.projectId === project.id) || [];
  const approvals = data?.approvals.filter((item) => !project || item.projectId === project.id) || [];
  const files = data?.assets.filter((item) => !project || item.projectId === project.id) || [];

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api("/api/portal", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, action: "message", projectId: project?.id, body: form.get("body") }),
      });
      event.currentTarget.reset();
      setNotice("Message sent to your artist.");
      await load();
    } catch (sendError) {
      setNotice(sendError instanceof Error ? sendError.message : "Unable to send");
    }
  }

  async function decide(approvalId: string, decision: "approved" | "revision") {
    try {
      await api("/api/portal", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, action: "approval", approvalId, decision }),
      });
      setNotice(decision === "approved" ? "Approval recorded." : "Revision request recorded.");
      await load();
    } catch (decisionError) {
      setNotice(decisionError instanceof Error ? decisionError.message : "Unable to record decision");
    }
  }

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!project) return;
    const form = new FormData(event.currentTarget);
    form.set("projectId", project.id);
    form.set("token", token);
    try {
      await api("/api/files", { method: "POST", body: form });
      event.currentTarget.reset();
      setNotice("File shared with your artist.");
      await load();
    } catch (uploadError) {
      setNotice(uploadError instanceof Error ? uploadError.message : "Upload failed");
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
        <button className="text-button" onClick={onExit}>Return to owner workspace</button>
      </main>
    );
  }

  return (
    <div className="client-shell">
      <header className="client-header">
        <Brand />
        <nav>
          {(["overview", "messages", "approvals", "files", "privacy"] as const).map((item) => (
            <button className={tab === item ? "active" : ""} onClick={() => setTab(item)} key={item}>{item}</button>
          ))}
        </nav>
        <div className="client-account">
          <span>{data.client.firstName.slice(0, 1)}{data.client.lastName.slice(0, 1)}</span>
          <div><strong>{fullName(data.client)}</strong><small>Client portal</small></div>
          <button className="icon-button" onClick={onExit} aria-label="Exit portal"><X size={17} /></button>
        </div>
      </header>

      <main className="client-main">
        <div className="client-topline">
          <div>
            <p className="eyebrow gold">WELCOME BACK</p>
            <h1>{data.client.firstName}, your project is connected.</h1>
            <p>Review progress, share files, approve work, and message your artist in one secure place.</p>
          </div>
          {data.projects.length > 1 && (
            <label><span>PROJECT</span><select value={project?.id || ""} onChange={(event) => setProjectId(event.target.value)}>{data.projects.map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}</select></label>
          )}
        </div>
        {notice && <div className="portal-notice"><CheckCircle2 size={16} /> {notice}<button onClick={() => setNotice("")}><X size={14} /></button></div>}
        {!project ? (
          <section className="client-empty">
            <div className="large-brain-orb"><HeartHandshake size={38} /></div>
            <h2>Your portal is active.</h2>
            <p>Your artist has not connected a project yet. You can return using this same private link.</p>
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
                  <p>{project.summary || "Your artist has not added a public project summary yet."}</p>
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
                </section>
              </div>
            )}

            {tab === "messages" && (
              <section className="client-card client-messages">
                <PanelTitle eyebrow="SECURE CONVERSATION" title="Messages with your artist" />
                <div className="message-thread">
                  {messages.length ? messages.map((message) => (
                    <article className={cn("message-bubble", message.senderType === "client" && "owner")} key={message.id}><small>{message.senderType === "client" ? "You" : "Studio"} · {formatDate(message.createdAt, true)}</small><p>{message.body}</p></article>
                  )) : <EmptyState icon={MessageSquareText} title="No messages yet" body="Start a direct, project-connected conversation." />}
                </div>
                <form className="message-composer" onSubmit={sendMessage}><textarea name="body" required placeholder="Write a message to your artist..." /><button className="gold-button"><Send size={16} /> Send</button></form>
              </section>
            )}

            {tab === "approvals" && (
              <section className="client-card">
                <PanelTitle eyebrow="YOUR DECISIONS" title="Approvals" />
                {approvals.length ? <div className="portal-approval-list">{approvals.map((approval) => (
                  <article key={approval.id}>
                    <span className={cn("approval-status", approval.status)}>{approval.status}</span>
                    <h3>{approval.subject}</h3>
                    <p>{approval.summary}</p>
                    <small>Requested {formatDate(approval.createdAt, true)}</small>
                    {approval.status === "pending" && <div><button className="gold-button" onClick={() => decide(approval.id, "approved")}><Check size={15} /> Approve</button><button className="outline-button" onClick={() => decide(approval.id, "revision")}><MessageSquareText size={15} /> Request revision</button></div>}
                  </article>
                ))}</div> : <EmptyState icon={ShieldCheck} title="Nothing needs approval" body="Designs and other gated decisions will appear here." />}
              </section>
            )}

            {tab === "files" && (
              <div className="client-files-layout">
                <section className="client-card">
                  <PanelTitle eyebrow="PROJECT FILES" title="Shared media" />
                  {files.length ? <div className="asset-list">{files.map((asset) => (
                    <a href={`/api/files?id=${asset.id}&token=${encodeURIComponent(token)}`} target="_blank" key={asset.id}><span><FileText size={18} /></span><div><strong>{asset.originalName}</strong><small>{formatBytes(asset.byteSize)} · {formatDate(asset.createdAt)}</small></div><ArrowRight size={14} /></a>
                  ))}</div> : <EmptyState icon={FileText} title="No files shared yet" body="References and project documents will stay connected here." />}
                </section>
                <form className="client-card portal-upload" onSubmit={upload}><Upload size={28} /><h3>Share a reference</h3><p>Upload an image or document up to 25 MB.</p><input type="file" name="file" required /><button className="gold-button" type="submit"><Upload size={15} /> Upload file</button></form>
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
      <footer className="client-footer"><Brand compact /><span><ShieldCheck size={15} /> {data.access.method === "account" ? "Verified account access" : `Private project access · Expires ${formatDate(data.access.expiresAt)}`}</span></footer>
    </div>
  );
}

export function LegacyApp({
  firstName,
  initialMode = "owner",
  authenticatedClient = false,
}: {
  firstName: string;
  initialMode?: "owner" | "portal";
  authenticatedClient?: boolean;
}) {
  const [mode, setMode] = useState<"owner" | "portal">(initialMode);
  const [portalToken, setPortalToken] = useState("");
  const [view, setView] = useState<OwnerView>("dashboard");
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [modal, setModal] = useState<"client" | "project" | "appointment" | null>(null);
  const [inviteClient, setInviteClient] = useState<ClientRecord | null>(null);
  const [toast, setToast] = useState<{ message: string; error: boolean } | null>(null);
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [generating, setGenerating] = useState(false);

  const notify = useCallback((message: string, isError = false) => {
    setToast({ message, error: isError });
    window.setTimeout(() => setToast(null), 4200);
  }, []);

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

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const token = new URLSearchParams(window.location.search).get("portal");
      if (token) {
        setPortalToken(token);
        setMode("portal");
      }
      void load();
    }, 0);
    return () => window.clearTimeout(handle);
  }, [load]);

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
  function openNew() {
    if (view === "clients") setModal("client");
    else if (view === "calendar") setModal("appointment");
    else if (!firstClient) setModal("client");
    else setModal("project");
  }

  const actualFirstName = useMemo(() => {
    const name = data?.owner?.displayName || firstName || "Owner";
    return name.split(" ")[0];
  }, [data?.owner?.displayName, firstName]);

  if (mode === "portal") {
    return (
      <PortalAccess
        initialToken={portalToken}
        authenticated={authenticatedClient}
        onExit={() => {
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
        onView={setView}
        owner={data.owner}
        workspace={data.workspace}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onPortal={() => setMode("portal")}
      />
      <main className="owner-main">
        <OwnerHeader view={view} onMenu={() => setMenuOpen(true)} onNew={openNew} />
        <div className="owner-content">
          {view === "dashboard" && <Dashboard data={data} firstName={actualFirstName} briefing={briefing} generating={generating} onGenerate={generateBriefing} onClient={() => setModal("client")} onProject={() => setModal("project")} onAppointment={() => setModal("appointment")} onView={setView} />}
          {view === "projects" && <ProjectsView data={data} onCreate={() => setModal("project")} refresh={load} notify={notify} />}
          {view === "clients" && <ClientsView data={data} onCreate={() => setModal("client")} onInvite={setInviteClient} />}
          {view === "calendar" && <CalendarView data={data} onCreate={() => setModal("appointment")} />}
          {view === "inbox" && <InboxView data={data} onSent={load} notify={notify} />}
          {view === "design" && <DesignStudio data={data} refresh={load} notify={notify} />}
          {view === "chief" && <ChiefView data={data} briefing={briefing} generating={generating} onGenerate={generateBriefing} />}
          {view === "operations" && <OperationsView data={data} />}
          {view === "analytics" && <AnalyticsView data={data} />}
          {(view === "knowledge" || view === "content" || view === "finances") && <ModuleView type={view} data={data} />}
          {view === "settings" && <SettingsView data={data} notify={notify} refresh={load} />}
        </div>
        <footer className="owner-footer"><span>LEGACY OS</span><p>Built for creators. Designed to last.</p><span><i /> ALL SYSTEMS OPERATIONAL</span></footer>
      </main>

      {modal === "client" && <ClientForm onClose={() => setModal(null)} onSaved={load} notify={notify} />}
      {modal === "project" && <ProjectForm clients={data.clients} onClose={() => setModal(null)} onSaved={load} notify={notify} />}
      {modal === "appointment" && <AppointmentForm data={data} onClose={() => setModal(null)} onSaved={load} notify={notify} />}
      {inviteClient && <InviteModal client={inviteClient} onClose={() => setInviteClient(null)} notify={notify} />}
      {toast && <div className={cn("toast", toast.error && "error")} role="status">{toast.error ? <AlertCircle size={17} /> : <CheckCircle2 size={17} />}{toast.message}</div>}
    </div>
  );
}
