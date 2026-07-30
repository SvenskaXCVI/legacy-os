"use client";

import { FormEvent, useMemo, useState } from "react";

type View =
  | "briefing"
  | "projects"
  | "clients"
  | "calendar"
  | "inbox"
  | "knowledge"
  | "design"
  | "content"
  | "finances"
  | "analytics"
  | "operations"
  | "library"
  | "settings";

type ApprovalState = "pending" | "approved" | "revision";

type Approval = {
  id: string;
  type: string;
  title: string;
  project: string;
  summary: string;
  evidence: string;
  risk: "Low" | "Medium" | "High";
  state: ApprovalState;
};

const navItems: Array<{ id: View; label: string; glyph: string }> = [
  { id: "briefing", label: "Dashboard", glyph: "⌂" },
  { id: "projects", label: "Projects", glyph: "P" },
  { id: "clients", label: "Clients", glyph: "C" },
  { id: "calendar", label: "Calendar", glyph: "□" },
  { id: "inbox", label: "Inbox", glyph: "✉" },
  { id: "knowledge", label: "Knowledge", glyph: "K" },
  { id: "design", label: "Design Studio", glyph: "D" },
  { id: "content", label: "Content", glyph: "▶" },
  { id: "finances", label: "Finances", glyph: "$" },
  { id: "analytics", label: "Analytics", glyph: "↗" },
  { id: "operations", label: "AI Operations", glyph: "◎" },
  { id: "library", label: "Screen Library", glyph: "▦" },
  { id: "settings", label: "Settings", glyph: "⚙" },
];

const initialApprovals: Approval[] = [
  {
    id: "ap-1042",
    type: "Design direction",
    title: "Renaissance sleeve — composition v4",
    project: "Marcus Rivera",
    summary:
      "Move the angel 8% higher and reduce the architectural background before final stencil prep.",
    evidence: "3 design versions · 2 client notes · anatomy reference",
    risk: "Medium",
    state: "pending",
  },
  {
    id: "ap-1043",
    type: "Client message",
    title: "Healing check-in draft",
    project: "Elena Martinez",
    summary:
      "Send the day-10 aftercare check-in with a request for one daylight healing photo.",
    evidence: "Session notes · aftercare protocol · last message",
    risk: "Low",
    state: "pending",
  },
];

const activity = [
  {
    agent: "Chief of Staff",
    action: "Prepared the daily briefing",
    detail: "Ranked 12 open items by urgency, reversibility, and client impact.",
    time: "8:42 AM",
    status: "Complete",
    confidence: 94,
  },
  {
    agent: "Knowledge Agent",
    action: "Built evidence set for Marcus",
    detail: "Connected 4 past sleeves, 2 mentorship notes, and the current brief.",
    time: "8:39 AM",
    status: "Complete",
    confidence: 91,
  },
  {
    agent: "Client Agent",
    action: "Drafted healing follow-up",
    detail: "Held the message for approval because client communication is gated.",
    time: "8:31 AM",
    status: "Awaiting approval",
    confidence: 96,
  },
  {
    agent: "Operations Agent",
    action: "Checked workflow health",
    detail: "No stalled automations. One calendar connection expires in 12 days.",
    time: "8:18 AM",
    status: "Complete",
    confidence: 99,
  },
];

const projects = [
  {
    client: "Marcus Rivera",
    title: "Renaissance angel sleeve",
    phase: "Design",
    next: "Review composition v4",
    date: "Today",
    progress: 46,
    tone: "ember",
  },
  {
    client: "Elena Martinez",
    title: "Floral black & grey",
    phase: "Healing",
    next: "Day-10 check-in",
    date: "Today",
    progress: 82,
    tone: "sage",
  },
  {
    client: "Darius Cole",
    title: "Saint Michael back piece",
    phase: "Session",
    next: "Session 2 · shading",
    date: "Fri 11:00",
    progress: 61,
    tone: "violet",
  },
];

const knowledgeCards = [
  {
    label: "Technique",
    title: "Soft transitions in large-scale realism",
    source: "Mentorship notes · Vol. 4",
    links: "Connected to 7 projects",
  },
  {
    label: "Pattern",
    title: "Healed contrast improves when foreground values separate early",
    source: "Evidence from 18 healed projects",
    links: "91% confidence",
  },
  {
    label: "Client language",
    title: "“Less background” often means a clearer focal hierarchy",
    source: "11 approved design revisions",
    links: "Connected to Design Agent",
  },
  {
    label: "Prompt",
    title: "Stone drapery study — controlled depth and negative space",
    source: "Prompt library · version 6",
    links: "Used successfully 4 times",
  },
];

const contentQueue = [
  {
    title: "Floral black & grey — healed carousel",
    stage: "Select",
    detail: "8 photos · 3 recommended",
  },
  {
    title: "Saint Michael session process",
    stage: "Draft",
    detail: "42 sec reel · hook prepared",
  },
  {
    title: "Angel sleeve composition study",
    stage: "Approval",
    detail: "Caption v2 · evidence attached",
  },
  {
    title: "Week 31 studio recap",
    stage: "Schedule",
    detail: "Friday · 6:15 PM",
  },
];

const agentRuns = [
  {
    id: "run_7PX2",
    agent: "Chief of Staff",
    purpose: "Daily prioritization",
    model: "Reasoning tier",
    duration: "4.8s",
    tokens: "6.2k",
    cost: "$0.18",
    confidence: "94%",
    status: "Succeeded",
  },
  {
    id: "run_7PWQ",
    agent: "Knowledge Agent",
    purpose: "Project evidence retrieval",
    model: "Retrieval tier",
    duration: "2.1s",
    tokens: "2.8k",
    cost: "$0.05",
    confidence: "91%",
    status: "Succeeded",
  },
  {
    id: "run_7PVM",
    agent: "Client Agent",
    purpose: "Healing follow-up draft",
    model: "Writing tier",
    duration: "3.3s",
    tokens: "1.9k",
    cost: "$0.04",
    confidence: "96%",
    status: "Approval held",
  },
  {
    id: "run_7PSE",
    agent: "Research Agent",
    purpose: "Source refresh",
    model: "Research tier",
    duration: "12.7s",
    tokens: "8.6k",
    cost: "$0.31",
    confidence: "87%",
    status: "Succeeded",
  },
];

function postTelemetry(payload: Record<string, unknown>) {
  void fetch("/api/telemetry", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => undefined);
}

function Sidebar({
  view,
  onChange,
  paused,
  setPaused,
}: {
  view: View;
  onChange: (view: View) => void;
  paused: boolean;
  setPaused: (paused: boolean) => void;
}) {
  return (
    <aside className="sidebar">
      <button className="brand" onClick={() => onChange("briefing")}>
        <span className="brand-mark">LL</span>
        <span>
          <strong>LEGACY</strong>
          <small>OPERATING SYSTEM</small>
        </span>
      </button>

      <nav aria-label="Legacy OS">
        <p className="nav-label">Workspace</p>
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${view === item.id ? "active" : ""}`}
            onClick={() => {
              onChange(item.id);
              postTelemetry({
                kind: "ui_action",
                action: "navigation.changed",
                target: item.id,
              });
            }}
          >
            <span className="nav-glyph">{item.glyph}</span>
            {item.label}
            {item.id === "operations" && <span className="live-dot" />}
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="system-mini">
          <span className={`pulse ${paused ? "paused" : ""}`} />
          <div>
            <strong>{paused ? "Automations paused" : "System attentive"}</strong>
            <small>{paused ? "No queued actions will run" : "8 core agents · healthy"}</small>
          </div>
        </div>
        <button
          className="quiet-button"
          onClick={() => {
            setPaused(!paused);
            postTelemetry({
              kind: "audit",
              action: paused ? "automations.resumed" : "automations.paused",
              risk: "medium",
            });
          }}
        >
          {paused ? "Resume automations" : "Pause automations"}
        </button>
        <div className="profile">
          <span>JD</span>
          <div>
            <strong>Joshua DeMiguel</strong>
            <small>Owner · Legacy Lines</small>
          </div>
          <button aria-label="Open settings">•••</button>
        </div>
      </div>
    </aside>
  );
}

function AssistantRail({
  firstName,
  onOpenOperations,
}: {
  firstName: string;
  onOpenOperations: () => void;
}) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(
    "I’m watching today’s commitments. Two decisions need you; everything else is contained.",
  );

  function submit(event: FormEvent) {
    event.preventDefault();
    const cleaned = question.trim();
    if (!cleaned) return;
    setAnswer(
      `I’ve captured “${cleaned}”. In the connected release, I’ll answer from project evidence and show every source before recommending an action.`,
    );
    setQuestion("");
    postTelemetry({
      kind: "ui_action",
      action: "chief_of_staff.question_submitted",
      target: "assistant",
      contentCaptured: false,
    });
  }

  return (
    <aside className="assistant-rail">
      <div className="assistant-heading">
        <div className="agent-orb">
          <span />
        </div>
        <div>
          <p>AI CHIEF OF STAFF</p>
          <strong>Present & observing</strong>
        </div>
        <span className="status-pill">LIVE</span>
      </div>

      <div className="assistant-message">
        <p className="eyebrow">Morning read</p>
        <h3>Your attention is protected.</h3>
        <p>{answer}</p>
      </div>

      <div className="suggestion-stack">
        <button onClick={() => setAnswer("Marcus is the highest-leverage project today. Approving the composition unlocks stencil prep and protects Friday’s session.")}>
          <span>01</span>
          What deserves my focus?
        </button>
        <button onClick={() => setAnswer("No critical risks. The calendar connection needs renewal within 12 days; I’ve kept it below today’s client work.")}>
          <span>02</span>
          Are there hidden risks?
        </button>
        <button onClick={onOpenOperations}>
          <span>03</span>
          Show what the AI did
        </button>
      </div>

      <form className="assistant-input" onSubmit={submit}>
        <label htmlFor="chief-question">Ask Legacy</label>
        <div>
          <input
            id="chief-question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder={`Ask about ${firstName}'s day…`}
          />
          <button type="submit" aria-label="Send question">
            ↑
          </button>
        </div>
        <small>Answers include evidence, confidence, and approval boundaries.</small>
      </form>
    </aside>
  );
}

function BriefingView({
  firstName,
  approvals,
  decide,
  onOpenOperations,
}: {
  firstName: string;
  approvals: Approval[];
  decide: (id: string, state: ApprovalState) => void;
  onOpenOperations: () => void;
}) {
  const pending = approvals.filter((approval) => approval.state === "pending");

  return (
    <>
      <header className="view-header">
        <div>
          <p className="eyebrow">WEDNESDAY · JULY 29</p>
          <h1>
            Good morning, {firstName}. <em>The day is contained.</em>
          </h1>
        </div>
        <div className="header-actions">
          <button className="search-button">
            <span>⌕</span> Search everything <kbd>⌘ K</kbd>
          </button>
          <button className="primary-button">＋ Capture</button>
        </div>
      </header>

      <section className="brief-hero">
        <div className="brief-copy">
          <p className="eyebrow accent">CHIEF OF STAFF BRIEFING · 8:42 AM</p>
          <h2>Two decisions unlock the day.</h2>
          <p>
            Your client work is on track. Approve Marcus’s composition, then
            release Elena’s healing check-in. I moved three lower-value tasks
            to tomorrow and found no schedule collisions.
          </p>
          <div className="brief-evidence">
            <span>12 open items analyzed</span>
            <span>4 sources connected</span>
            <span>94% confidence</span>
          </div>
        </div>
        <div className="brief-priority">
          <span className="priority-number">01</span>
          <div>
            <p>FIRST MOVE</p>
            <strong>Review Marcus’s design</strong>
            <small>Unblocks stencil preparation · 12 min</small>
          </div>
          <button aria-label="Open highest priority">↗</button>
        </div>
      </section>

      <section className="metric-strip" aria-label="Daily summary">
        <div>
          <span className="metric-icon rust">A</span>
          <p><strong>{pending.length}</strong> decisions</p>
          <small>Need your judgment</small>
        </div>
        <div>
          <span className="metric-icon sage">3</span>
          <p><strong>3</strong> sessions</p>
          <small>Next seven days</small>
        </div>
        <div>
          <span className="metric-icon violet">7</span>
          <p><strong>7</strong> active projects</p>
          <small>None stalled</small>
        </div>
        <div>
          <span className="metric-icon gold">◎</span>
          <p><strong>98.7%</strong> AI success</p>
          <small>Last 24 hours</small>
        </div>
      </section>

      <div className="dashboard-grid">
        <section className="panel approvals-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">JUDGMENT REQUIRED</p>
              <h2>Approval queue</h2>
            </div>
            <span>{pending.length} pending</span>
          </div>

          <div className="approval-list">
            {approvals.map((approval) => (
              <article
                className={`approval-card ${approval.state !== "pending" ? "decided" : ""}`}
                key={approval.id}
              >
                <div className="approval-meta">
                  <span>{approval.type}</span>
                  <span className={`risk ${approval.risk.toLowerCase()}`}>
                    {approval.risk} risk
                  </span>
                </div>
                <h3>{approval.title}</h3>
                <p className="project-name">{approval.project}</p>
                <p>{approval.summary}</p>
                <div className="evidence-row">
                  <span>Evidence</span>
                  <small>{approval.evidence}</small>
                </div>
                {approval.state === "pending" ? (
                  <div className="approval-actions">
                    <button
                      className="approve"
                      onClick={() => decide(approval.id, "approved")}
                    >
                      Approve
                    </button>
                    <button onClick={() => decide(approval.id, "revision")}>
                      Needs revision
                    </button>
                    <button aria-label="Open approval details">↗</button>
                  </div>
                ) : (
                  <div className={`decision-stamp ${approval.state}`}>
                    {approval.state === "approved"
                      ? "Approved — audit record created"
                      : "Revision requested — agent notified"}
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>

        <section className="panel agenda-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">TIME & COMMITMENTS</p>
              <h2>Today</h2>
            </div>
            <button>Full calendar ↗</button>
          </div>
          <div className="timeline">
            <div className="timeline-item active">
              <time>10:00</time>
              <span />
              <div>
                <p>Design review · Marcus</p>
                <small>Studio · 45 min</small>
              </div>
            </div>
            <div className="timeline-item">
              <time>11:30</time>
              <span />
              <div>
                <p>Stencil refinement</p>
                <small>Deep work · 90 min protected</small>
              </div>
            </div>
            <div className="timeline-item">
              <time>2:00</time>
              <span />
              <div>
                <p>Consultation · Amara</p>
                <small>New inquiry · intake complete</small>
              </div>
            </div>
            <div className="timeline-item muted">
              <time>4:30</time>
              <span />
              <div>
                <p>Content selects</p>
                <small>Prepared by Content Agent</small>
              </div>
            </div>
          </div>
          <div className="protected-time">
            <span>FOCUS WINDOW</span>
            <strong>11:30 AM – 1:00 PM</strong>
            <small>No messages or low-priority alerts</small>
          </div>
        </section>

        <section className="panel projects-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">WORK IN MOTION</p>
              <h2>Active projects</h2>
            </div>
            <button>View all 7 ↗</button>
          </div>
          <div className="project-list">
            {projects.map((project) => (
              <button className="project-row" key={project.client}>
                <span className={`project-swatch ${project.tone}`} />
                <div>
                  <p>{project.title}</p>
                  <small>{project.client}</small>
                </div>
                <span className="phase">{project.phase}</span>
                <div className="progress-wrap">
                  <span style={{ width: `${project.progress}%` }} />
                </div>
                <div className="project-next">
                  <strong>{project.next}</strong>
                  <small>{project.date}</small>
                </div>
                <span>↗</span>
              </button>
            ))}
          </div>
        </section>

        <section className="panel activity-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">GLASS BOX</p>
              <h2>What the AI did</h2>
            </div>
            <button onClick={onOpenOperations}>Open ledger ↗</button>
          </div>
          <div className="activity-list">
            {activity.slice(0, 3).map((item) => (
              <article key={item.action}>
                <span className="activity-node" />
                <div>
                  <div>
                    <p>{item.agent}</p>
                    <time>{item.time}</time>
                  </div>
                  <strong>{item.action}</strong>
                  <small>{item.detail}</small>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

function ProjectsView() {
  const lanes = [
    { label: "Discovery", count: 2, projects: ["Amara · botanical ribs", "Nico · portrait consult"] },
    { label: "Design", count: 3, projects: ["Marcus · angel sleeve", "Imani · sacred heart", "Theo · sculpture study"] },
    { label: "Session", count: 1, projects: ["Darius · Saint Michael"] },
    { label: "Healing", count: 1, projects: ["Elena · floral black & grey"] },
  ];

  return (
    <section>
      <header className="view-header compact">
        <div>
          <p className="eyebrow">PROJECT INTELLIGENCE</p>
          <h1>Every tattoo, <em>one continuous record.</em></h1>
        </div>
        <button className="primary-button">＋ New project</button>
      </header>
      <div className="project-overview">
        <div className="insight-card">
          <p className="eyebrow accent">PATTERN DISCOVERED</p>
          <h2>Clear focal hierarchy is shortening approval cycles.</h2>
          <p>
            Projects with a single dominant subject reached design approval
            1.7 revisions sooner across the last 12 projects.
          </p>
          <small>12 projects · 89% confidence · reviewed today</small>
        </div>
        <div className="project-stats">
          <div><strong>7</strong><span>active</span></div>
          <div><strong>2</strong><span>at risk</span></div>
          <div><strong>14d</strong><span>median cycle</span></div>
        </div>
      </div>
      <div className="kanban">
        {lanes.map((lane) => (
          <div className="lane" key={lane.label}>
            <div className="lane-heading">
              <span>{lane.label}</span><small>{lane.count}</small>
            </div>
            {lane.projects.map((project, index) => (
              <button className="kanban-card" key={project}>
                <span className="card-index">0{index + 1}</span>
                <strong>{project.split(" · ")[1]}</strong>
                <small>{project.split(" · ")[0]}</small>
                <div className="micro-progress"><span style={{ width: `${32 + index * 23}%` }} /></div>
                <p>{index === 0 ? "Next action prepared" : "Context complete"}</p>
              </button>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

function KnowledgeView() {
  const [query, setQuery] = useState("");
  return (
    <section>
      <header className="view-header compact">
        <div>
          <p className="eyebrow">KNOWLEDGE ENGINE</p>
          <h1>Nothing learned <em>stays isolated.</em></h1>
        </div>
        <button className="primary-button">＋ Add knowledge</button>
      </header>
      <div className="knowledge-search">
        <span>⌕</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ask across projects, mentorships, notes, prompts, and outcomes…"
        />
        <kbd>Return</kbd>
      </div>
      <div className="knowledge-layout">
        <div className="knowledge-results">
          <div className="section-heading">
            <div>
              <p className="eyebrow">CONNECTED KNOWLEDGE</p>
              <h2>{query ? `Results for “${query}”` : "Recently strengthened"}</h2>
            </div>
            <span>Evidence required</span>
          </div>
          {knowledgeCards.map((card) => (
            <button className="knowledge-card" key={card.title}>
              <span>{card.label}</span>
              <div>
                <h3>{card.title}</h3>
                <p>{card.source}</p>
              </div>
              <small>{card.links}</small>
              <b>↗</b>
            </button>
          ))}
        </div>
        <aside className="graph-panel">
          <p className="eyebrow">RELATIONSHIP LENS</p>
          <h2>Marcus · angel sleeve</h2>
          <div className="relationship-map">
            <div className="relation core">Project</div>
            <div className="relation">4 references</div>
            <div className="relation">2 lessons</div>
            <div className="relation">3 designs</div>
            <div className="relation">1 approval</div>
            <div className="relation">Client language</div>
          </div>
          <p>
            The system connected composition notes to healed outcomes from four
            earlier realism projects.
          </p>
          <button className="outline-button">Explore graph ↗</button>
        </aside>
      </div>
    </section>
  );
}

function DesignView() {
  return (
    <section>
      <header className="view-header compact">
        <div>
          <p className="eyebrow">DESIGN WORKFLOW</p>
          <h1>From references to <em>approved direction.</em></h1>
        </div>
        <button className="primary-button">＋ New study</button>
      </header>
      <div className="studio-context">
        <div>
          <span className="project-swatch ember" />
          <p>Marcus Rivera</p>
          <strong>Renaissance angel sleeve</strong>
        </div>
        <div className="stage-track">
          <span className="done">Brief</span>
          <span className="done">References</span>
          <span className="active">Compose</span>
          <span>Refine</span>
          <span>Approve</span>
          <span>Stencil</span>
        </div>
      </div>
      <div className="design-layout">
        <aside className="reference-column">
          <div className="section-heading">
            <div><p className="eyebrow">SOURCE BOARD</p><h2>References</h2></div>
            <button>＋</button>
          </div>
          <div className="reference-grid">
            {["Sculpture", "Drapery", "Anatomy", "Architecture"].map((label, index) => (
              <button className={`reference-tile tile-${index + 1}`} key={label}>
                <span>0{index + 1}</span>
                <strong>{label}</strong>
              </button>
            ))}
          </div>
          <div className="source-note">
            <span>Knowledge note</span>
            <p>Prioritize silhouette before texture; background remains subordinate.</p>
          </div>
        </aside>
        <div className="canvas-column">
          <div className="design-canvas">
            <div className="canvas-mark"><span>L</span></div>
            <p>COMPOSITION V4</p>
            <h3>Angel / ascending gesture</h3>
            <small>Working study · generated structure, artist-led finish</small>
          </div>
          <div className="version-row">
            {["v1", "v2", "v3", "v4"].map((version) => (
              <button className={version === "v4" ? "selected" : ""} key={version}>{version}</button>
            ))}
            <button>＋ Compare</button>
          </div>
        </div>
        <aside className="design-brief">
          <p className="eyebrow">EVIDENCE-LED BRIEF</p>
          <h2>Current direction</h2>
          <dl>
            <div><dt>Focal point</dt><dd>Face and upward gesture</dd></div>
            <div><dt>Flow</dt><dd>Shoulder to outer forearm</dd></div>
            <div><dt>Contrast</dt><dd>Strongest at eyes and hands</dd></div>
            <div><dt>Background</dt><dd>Reduce by approximately 20%</dd></div>
          </dl>
          <div className="confidence-box">
            <span>Recommendation confidence</span>
            <strong>91%</strong>
            <div><i style={{ width: "91%" }} /></div>
          </div>
          <button className="primary-button wide">Send to approval</button>
          <button className="outline-button wide">Request another direction</button>
        </aside>
      </div>
    </section>
  );
}

function ContentView() {
  return (
    <section>
      <header className="view-header compact">
        <div>
          <p className="eyebrow">CONTENT WORKFLOW</p>
          <h1>Finished work becomes <em>future intelligence.</em></h1>
        </div>
        <button className="primary-button">＋ Create from project</button>
      </header>
      <div className="content-summary">
        <div>
          <p className="eyebrow accent">OPPORTUNITY</p>
          <h2>Healed-work documentation is your highest-value content gap.</h2>
          <p>
            Healed carousels earn 32% more saves than session-day posts, but
            only 3 of the last 11 projects have a complete healed set.
          </p>
        </div>
        <div className="opportunity-score">
          <strong>8.7</strong>
          <span>Opportunity score</span>
          <small>Evidence: 6 months · 48 posts</small>
        </div>
      </div>
      <div className="content-board">
        {["Select", "Draft", "Approval", "Schedule"].map((stage) => (
          <div className="content-lane" key={stage}>
            <div className="lane-heading">
              <span>{stage}</span>
              <small>{contentQueue.filter((item) => item.stage === stage).length}</small>
            </div>
            {contentQueue
              .filter((item) => item.stage === stage)
              .map((item, index) => (
                <article className="content-card" key={item.title}>
                  <div className={`media-placeholder media-${index + stage.length}`}>
                    <span>LEGACY / {stage.toUpperCase()}</span>
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.detail}</p>
                  <div><span>Project linked</span><button>Open ↗</button></div>
                </article>
              ))}
          </div>
        ))}
      </div>
    </section>
  );
}

function ClientsView() {
  const clientRows = [
    ["Marcus Rivera", "Renaissance angel sleeve", "Design", "76%", "Today"],
    ["Elena Martinez", "Floral black & grey", "Healing", "82%", "Day 10"],
    ["Darius Cole", "Saint Michael back piece", "Session", "61%", "Friday"],
    ["Amara Lewis", "Botanical rib piece", "Consult", "24%", "2:00 PM"],
    ["Theo Bennett", "Sculpture forearm", "Discovery", "18%", "Awaiting refs"],
  ];
  return (
    <section>
      <header className="view-header compact">
        <div>
          <p className="eyebrow">CLIENT WORKSPACE</p>
          <h1>Know the person, <em>not just the project.</em></h1>
        </div>
        <button className="primary-button">＋ New client</button>
      </header>
      <div className="client-summary">
        <div><span>Active clients</span><strong>18</strong><small>+3 this month</small></div>
        <div><span>Response health</span><strong>96%</strong><small>Under 4 hours</small></div>
        <div><span>Deposits pending</span><strong>3</strong><small>$1,250 total</small></div>
        <div><span>Healing follow-ups</span><strong>4</strong><small>2 due today</small></div>
      </div>
      <div className="client-layout">
        <section className="panel client-directory">
          <div className="section-heading">
            <div><p className="eyebrow">DIRECTORY</p><h2>Active clients</h2></div>
            <button>Filter ↗</button>
          </div>
          {clientRows.map(([name, project, phase, progress, next], index) => (
            <button className="client-row" key={name}>
              <span className="client-avatar">{name.split(" ").map((part) => part[0]).join("")}</span>
              <div><strong>{name}</strong><small>{project}</small></div>
              <span className="phase">{phase}</span>
              <div className="client-progress"><i style={{ width: progress }} /><small>{progress}</small></div>
              <div><strong>{next}</strong><small>Next touch</small></div>
              <span>↗</span>
            </button>
          ))}
        </section>
        <aside className="panel selected-client">
          <p className="eyebrow">PROJECT HEALTH</p>
          <div className="health-ring"><strong>76%</strong><small>On track</small></div>
          <h2>Marcus Rivera</h2>
          <p>Renaissance angel sleeve · left arm</p>
          <dl>
            <div><dt>Deposit</dt><dd>$250 paid</dd></div>
            <div><dt>Approvals</dt><dd>1 pending</dd></div>
            <div><dt>Next session</dt><dd>Fri · 11:00</dd></div>
            <div><dt>Context</dt><dd>Complete</dd></div>
          </dl>
          <button className="primary-button wide">Open workspace</button>
          <button className="outline-button wide">Message client</button>
        </aside>
      </div>
    </section>
  );
}

function AnalyticsView() {
  const bars = [28, 35, 42, 38, 51, 48, 61, 58, 72, 69, 78, 88];
  return (
    <section>
      <header className="view-header compact">
        <div>
          <p className="eyebrow">COMPARATIVE INTELLIGENCE</p>
          <h1>Measure what matters. <em>Learn why.</em></h1>
        </div>
        <button className="primary-button">Export report</button>
      </header>
      <div className="analytics-metrics">
        <div><span>Total revenue</span><strong>$18,450</strong><small>↑ 21% this month</small></div>
        <div><span>Hourly revenue</span><strong>$192</strong><small>↑ 18% this month</small></div>
        <div><span>Tattoo hours</span><strong>96.3</strong><small>24 sessions</small></div>
        <div><span>Healing score</span><strong>4.7</strong><small>84 submissions</small></div>
        <div><span>Content reach</span><strong>51.2k</strong><small>↑ 32% on angels</small></div>
      </div>
      <div className="analytics-grid">
        <section className="panel revenue-chart">
          <div className="section-heading">
            <div><p className="eyebrow">REVENUE OVER TIME</p><h2>June performance</h2></div>
            <span>$18,450</span>
          </div>
          <div className="bar-chart">
            {bars.map((height, index) => (
              <div key={index}><i style={{ height: `${height}%` }} /><span>{index + 1}</span></div>
            ))}
          </div>
        </section>
        <section className="panel intelligence-panel">
          <div className="section-heading">
            <div><p className="eyebrow">AI INSIGHTS</p><h2>Why performance moved</h2></div>
            <span>4 new</span>
          </div>
          {[
            "Angel tattoos generate the highest revenue and the strongest healing scores.",
            "Reels using dramatic contrast and upper-arm placement earn 32% more engagement.",
            "3RL + 9CM is the most reliable needle combination across healed work.",
            "Clients booking within 7 days of consult retain 24% more often.",
          ].map((insight, index) => (
            <article key={insight}><span>0{index + 1}</span><p>{insight}</p><button>↗</button></article>
          ))}
        </section>
        <section className="panel performance-matrix">
          <div className="section-heading">
            <div><p className="eyebrow">CRAFT INTELLIGENCE</p><h2>Needle configuration success</h2></div>
          </div>
          {[
            ["3RL + 11CM", 92],
            ["3RL + 9CM", 88],
            ["3RL + 13CM", 86],
            ["9RL + 11CM", 78],
            ["3RL + 7CM", 72],
          ].map(([label, score]) => (
            <div className="matrix-row" key={label}>
              <span>{label}</span><div><i style={{ width: `${score}%` }} /></div><strong>{score}%</strong>
            </div>
          ))}
        </section>
        <section className="panel opportunity-panel">
          <div className="section-heading">
            <div><p className="eyebrow">OPPORTUNITY DISCOVERY</p><h2>Next best moves</h2></div>
          </div>
          {[
            ["Book two more upper-arm projects", "High demand · high satisfaction"],
            ["Increase healed-result posting", "Evidence gap · strong save rate"],
            ["Protect Wednesday deep work", "Highest design throughput"],
          ].map(([title, detail]) => (
            <article key={title}><span>✓</span><div><strong>{title}</strong><small>{detail}</small></div></article>
          ))}
        </section>
      </div>
    </section>
  );
}

function ScreenLibraryView({ onNavigate }: { onNavigate: (view: View) => void }) {
  const groups = [
    {
      title: "Core experience",
      tone: "core",
      screens: [
        ["Login", "Secure access and account entry."],
        ["Dashboard", "Daily command center and overview."],
        ["Client Workspace", "History, communication, and health."],
        ["Project Workspace", "Complete tattoo project context."],
        ["Knowledge Search", "Find anything with evidence."],
        ["AI Chief of Staff", "Priorities, decisions, and briefing."],
        ["Design Studio", "References, iterations, and approval."],
        ["Knowledge Graph", "Visualize meaningful relationships."],
        ["Analytics", "Performance, patterns, and opportunities."],
        ["Settings", "Models, permissions, and integrations."],
      ],
    },
    {
      title: "Workflow & operations",
      tone: "workflow",
      screens: [
        ["Inbox", "All client conversations."],
        ["Calendar", "Sessions, consults, and focus windows."],
        ["Content Studio", "Create, approve, and schedule."],
        ["Media Library", "Organize source and final media."],
        ["Session Assistant", "In-session notes and support."],
        ["Healing Tracker", "Check-ins, photos, and outcomes."],
        ["Approval Queue", "Human judgment for gated actions."],
        ["Notifications", "Priority-filtered alerts."],
        ["Inquiry Pipeline", "Qualify leads and create projects."],
        ["Finance Center", "Deposits, invoices, and revenue."],
        ["Asset Library", "Reusable creative assets."],
        ["Prompt Library", "Versioned creative instructions."],
      ],
    },
    {
      title: "Admin & system",
      tone: "admin",
      screens: [
        ["Automation Builder", "Create event-driven workflows."],
        ["Workflow Editor", "Version and improve processes."],
        ["Team Dashboard", "Roles, workload, and performance."],
        ["AI Agent Manager", "Configure agent boundaries."],
        ["API & Integrations", "Connected service health."],
        ["Security & Permissions", "Roles and policy controls."],
        ["AI Operations", "Runs, tools, cost, and audit."],
      ],
    },
    {
      title: "Client portal",
      tone: "portal",
      screens: [
        ["Client Portal Home", "Client-facing project status."],
        ["Intake Forms", "Structured requirements and consent."],
        ["Project Viewer", "Approved designs and progress."],
        ["Payments & Invoices", "Secure deposit and billing."],
        ["Messaging Center", "Project-linked communication."],
      ],
    },
  ];
  const targets: Record<string, View> = {
    Dashboard: "briefing",
    "Client Workspace": "clients",
    "Knowledge Search": "knowledge",
    "Design Studio": "design",
    Analytics: "analytics",
    Settings: "settings",
    "AI Operations": "operations",
    Calendar: "calendar",
    Inbox: "inbox",
    "Content Studio": "content",
    "Finance Center": "finances",
    "Project Workspace": "projects",
  };
  let screenIndex = 0;
  return (
    <section>
      <header className="view-header compact">
        <div>
          <p className="eyebrow">DEVELOPER MAP</p>
          <h1>Screen library. <em>Every surface has a purpose.</em></h1>
        </div>
        <button className="primary-button">＋ Suggest screen</button>
      </header>
      <div className="library-summary">
        <span><strong>34</strong> planned screens</span>
        <span><strong>12</strong> workflow surfaces</span>
        <span><strong>7</strong> system controls</span>
        <span><strong>100%</strong> project-connected</span>
      </div>
      <div className="screen-groups">
        {groups.map((group) => (
          <section className="screen-group" key={group.title}>
            <div className="lane-heading"><span>{group.title}</span><small>{group.screens.length}</small></div>
            <div className="screen-grid">
              {group.screens.map(([title, description]) => {
                screenIndex += 1;
                const target = targets[title];
                return (
                  <button
                    className={`screen-card ${group.tone} ${target ? "available" : ""}`}
                    key={title}
                    onClick={() => target && onNavigate(target)}
                  >
                    <span>{String(screenIndex).padStart(2, "0")}</span>
                    <strong>{title}</strong>
                    <p>{description}</p>
                    <small>{target ? "Foundation available ↗" : "Planned"}</small>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}

function WorkspaceModuleView({
  module,
}: {
  module: "calendar" | "inbox" | "finances" | "settings";
}) {
  const config = {
    calendar: {
      eyebrow: "APPOINTMENT WORKFLOW",
      title: "Calendar",
      emphasis: "time with context.",
      action: "＋ New appointment",
      metrics: [["Today", "4 commitments"], ["Focus", "90 min protected"], ["This week", "3 sessions"], ["Conflicts", "0 detected"]],
      rows: [["10:00 AM", "Design review · Marcus", "Studio · 45 min"], ["11:30 AM", "Stencil refinement", "Protected focus · 90 min"], ["2:00 PM", "Consultation · Amara", "Intake complete"], ["4:30 PM", "Content selects", "Prepared by Content Agent"]],
    },
    inbox: {
      eyebrow: "CLIENT COMMUNICATION",
      title: "Inbox",
      emphasis: "every message connected.",
      action: "＋ New message",
      metrics: [["Unread", "3 conversations"], ["Response", "1h 42m median"], ["Drafts", "2 approval-held"], ["Coverage", "100% project-linked"]],
      rows: [["8:31 AM", "Elena · Healing photo", "AI draft held for approval"], ["Yesterday", "Marcus · Design feedback", "Project context attached"], ["Yesterday", "Amara · New inquiry", "Intake is 86% complete"], ["Monday", "Darius · Session confirmation", "Confirmed"]],
    },
    finances: {
      eyebrow: "DEPOSIT & PAYMENT WORKFLOW",
      title: "Finance center",
      emphasis: "money tied to the work.",
      action: "＋ Record payment",
      metrics: [["Revenue", "$18,450 this month"], ["Deposits", "$1,250 pending"], ["Invoices", "2 outstanding"], ["Forecast", "$26,800 next 30d"]],
      rows: [["Today", "Elena Martinez · Deposit", "$250 · Paid"], ["Jul 28", "Darius Cole · Session 1", "$900 · Paid"], ["Jul 27", "Marcus Rivera · Deposit", "$250 · Paid"], ["Jul 25", "Studio supplies", "$184 · Expense"]],
    },
    settings: {
      eyebrow: "SYSTEM CONTROL",
      title: "Settings",
      emphasis: "policy before automation.",
      action: "Save changes",
      metrics: [["AI providers", "Model-agnostic"], ["Content capture", "Metadata only"], ["Retention", "90 days"], ["Workspace", "Owner-only"]],
      rows: [["AI & models", "Routing policy", "Reasoning, retrieval, writing"], ["Security", "Approval policy", "High-impact actions always gated"], ["Notifications", "Attention policy", "Priority-filtered"], ["Integrations", "Connection health", "Ready for provider setup"]],
    },
  }[module];
  return (
    <section>
      <header className="view-header compact">
        <div><p className="eyebrow">{config.eyebrow}</p><h1>{config.title}. <em>{config.emphasis}</em></h1></div>
        <button className="primary-button">{config.action}</button>
      </header>
      <div className="module-metrics">
        {config.metrics.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
      </div>
      <section className="panel module-list">
        <div className="section-heading"><div><p className="eyebrow">CURRENT STATE</p><h2>{config.title} overview</h2></div><button>Filter ↗</button></div>
        {config.rows.map(([time, title, detail]) => (
          <button className="module-row" key={title}>
            <time>{time}</time><div><strong>{title}</strong><small>{detail}</small></div><span>↗</span>
          </button>
        ))}
      </section>
    </section>
  );
}

function OperationsView() {
  const [capture, setCapture] = useState("Metadata only");
  return (
    <section>
      <header className="view-header compact operations-header">
        <div>
          <p className="eyebrow">AI OPERATIONS · GLASS BOX</p>
          <h1>Every action is <em>observable.</em></h1>
          <p className="header-description">
            Inspect reasoning summaries, evidence, tool use, approvals, cost,
            latency, and outcomes without storing sensitive prompt content.
          </p>
        </div>
        <div className="healthy-badge"><span /> All systems healthy</div>
      </header>
      <div className="ops-metrics">
        <div><p>AI runs · 24h</p><strong>146</strong><small>↑ 18% from baseline</small></div>
        <div><p>Successful</p><strong>98.7%</strong><small>2 recovered failures</small></div>
        <div><p>Median latency</p><strong>4.2s</strong><small>Target under 6s</small></div>
        <div><p>Estimated cost</p><strong>$3.84</strong><small>$0.026 per run</small></div>
        <div><p>Approval held</p><strong>9</strong><small>0 unauthorized actions</small></div>
      </div>
      <div className="ops-grid">
        <section className="panel run-ledger">
          <div className="section-heading">
            <div><p className="eyebrow">TRACE LEDGER</p><h2>Recent agent runs</h2></div>
            <div className="filter-pills"><button className="active">All</button><button>Held</button><button>Failed</button></div>
          </div>
          <div className="run-table">
            <div className="run-table-head">
              <span>Run / agent</span><span>Purpose</span><span>Duration</span><span>Usage</span><span>Confidence</span><span>Status</span>
            </div>
            {agentRuns.map((run) => (
              <button className="run-row" key={run.id}>
                <span><b>{run.agent}</b><small>{run.id}</small></span>
                <span><b>{run.purpose}</b><small>{run.model}</small></span>
                <span>{run.duration}</span>
                <span><b>{run.tokens}</b><small>{run.cost}</small></span>
                <span>{run.confidence}</span>
                <span className={run.status.includes("Approval") ? "held" : "success"}>{run.status}</span>
              </button>
            ))}
          </div>
        </section>
        <aside className="panel cost-panel">
          <div className="section-heading">
            <div><p className="eyebrow">USAGE</p><h2>By agent</h2></div>
            <span>Today</span>
          </div>
          {[
            ["Chief of Staff", 82, "$1.42"],
            ["Knowledge", 64, "$0.91"],
            ["Research", 51, "$0.68"],
            ["Design", 39, "$0.47"],
            ["Client", 31, "$0.22"],
            ["Other", 18, "$0.14"],
          ].map(([label, width, cost]) => (
            <div className="cost-row" key={label}>
              <div><span>{label}</span><small>{cost}</small></div>
              <div><i style={{ width: `${width}%` }} /></div>
            </div>
          ))}
        </aside>
        <section className="panel audit-feed">
          <div className="section-heading">
            <div><p className="eyebrow">APPEND-ONLY AUDIT</p><h2>Live event stream</h2></div>
            <span className="live-label"><i /> LIVE</span>
          </div>
          {activity.map((item) => (
            <article key={item.action}>
              <span className="audit-icon">◎</span>
              <div><p><b>{item.agent}</b> · {item.action}</p><small>{item.detail}</small></div>
              <div><time>{item.time}</time><span>{item.confidence}%</span></div>
            </article>
          ))}
        </section>
        <aside className="panel privacy-panel">
          <div className="section-heading">
            <div><p className="eyebrow">PRIVACY CONTROL</p><h2>Content capture</h2></div>
          </div>
          <p>
            Operational metadata is always recorded. Sensitive prompt and client
            content remains off unless explicitly enabled.
          </p>
          <div className="capture-options">
            {["Metadata only", "Redacted summaries", "Full content"].map((option) => (
              <button className={capture === option ? "active" : ""} onClick={() => setCapture(option)} key={option}>
                <span>{capture === option ? "●" : "○"}</span>
                <div><strong>{option}</strong><small>{option === "Metadata only" ? "Recommended · safest default" : option === "Redacted summaries" ? "Useful for quality review" : "Requires explicit workspace policy"}</small></div>
              </button>
            ))}
          </div>
          <div className="retention"><span>Retention</span><strong>90 days</strong></div>
          <button className="outline-button wide">Open audit policy ↗</button>
        </aside>
      </div>
    </section>
  );
}

export function LegacyApp({ firstName }: { firstName: string }) {
  const [view, setView] = useState<View>("briefing");
  const [paused, setPaused] = useState(false);
  const [approvals, setApprovals] = useState(initialApprovals);
  const [toast, setToast] = useState("");

  const viewLabel = useMemo(
    () => navItems.find((item) => item.id === view)?.label ?? "Legacy OS",
    [view],
  );

  function decide(id: string, state: ApprovalState) {
    const approval = approvals.find((item) => item.id === id);
    if (!approval) return;
    setApprovals((items) =>
      items.map((item) => (item.id === id ? { ...item, state } : item)),
    );
    setToast(
      state === "approved"
        ? "Approved. The decision and evidence were written to the audit trail."
        : "Revision requested. The agent received your direction.",
    );
    window.setTimeout(() => setToast(""), 4200);
    void fetch("/api/approvals", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        approvalId: id,
        decision: state,
        category: approval.type,
        subject: approval.title,
      }),
    }).catch(() => undefined);
  }

  return (
    <div className="os-shell">
      <Sidebar
        view={view}
        onChange={setView}
        paused={paused}
        setPaused={setPaused}
      />
      <main className="main-workspace" aria-label={viewLabel}>
        {view === "briefing" && (
          <BriefingView
            firstName={firstName}
            approvals={approvals}
            decide={decide}
            onOpenOperations={() => setView("operations")}
          />
        )}
        {view === "projects" && <ProjectsView />}
        {view === "clients" && <ClientsView />}
        {view === "calendar" && <WorkspaceModuleView module="calendar" />}
        {view === "inbox" && <WorkspaceModuleView module="inbox" />}
        {view === "knowledge" && <KnowledgeView />}
        {view === "design" && <DesignView />}
        {view === "content" && <ContentView />}
        {view === "finances" && <WorkspaceModuleView module="finances" />}
        {view === "analytics" && <AnalyticsView />}
        {view === "operations" && <OperationsView />}
        {view === "library" && <ScreenLibraryView onNavigate={setView} />}
        {view === "settings" && <WorkspaceModuleView module="settings" />}
        <footer className="workspace-footer">
          <span>LEGACY OS · FOUNDATION PREVIEW</span>
          <span>Evidence over guesses · Human judgment remains final</span>
        </footer>
      </main>
      {view === "briefing" && (
        <AssistantRail
          firstName={firstName}
          onOpenOperations={() => setView("operations")}
        />
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
