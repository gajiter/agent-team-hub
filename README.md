# Agent Team Hub

**[English](README.md) | [한국어](README.ko.md)**

**A local project management tool for humans and AI agents to work together**

![Feature Specs](public/screenshots/features-plan.png)
![Issue Tracking](public/screenshots/issues.png)

## Why This Exists

When building products with Claude Code, you hit one fundamental limitation: the **Context Window**. Trying to handle planning, design, and development in a single session dilutes context and degrades output quality.

Just as human organizations split roles between PMs, designers, and developers, AI agents need specialized division of labor too. But agents can't talk to each other. So **files** become the shared language. Planning documents, feature specs, issues — they all exist as JSON and Markdown files in the project directory, readable and writable by any agent.

Agent Team Hub is the tool that lets **humans visually inspect and review** these files.

## Core Ideas

### Solving Agent-to-Agent Collaboration with Files

The biggest bottleneck in today's AI agent ecosystem is **inter-agent communication**. Protocols like MCP and A2A are emerging, but they're not yet mature, and more importantly, they **cost tokens**. When an agent needs to pass context to another agent, it has to make API calls, consuming input/output tokens each time.

Agent Team Hub solves this with the most primitive yet effective approach: the **local file system**. Write a PRD to `data/prd.json`, and the feature spec agent simply reads it. Create an issue at `issues/ISS-001.json`, and the developer agent opens it to receive instructions. No API calls, no token consumption, no network dependency.

This isn't just implementation convenience. It's an **architectural decision**:

- **Zero token cost** — No API calls needed for information exchange between agents
- **Security** — Planning docs, issues, and agent definitions never leave the local file system
- **Git compatible** — Every change is tracked as a diff. When an agent modifies the PRD, humans can see exactly what changed via `git diff`
- **AI optimized** — JSON is the structured format that AI can most accurately parse and generate

### Humans Design and Review, AI Builds

In the age of AI-written code, the developer's role is shifting — from "the person who builds" to **"the person who designs and reviews."** Agent Team Hub is built on this premise.

**What humans do:**
- Set project direction and priorities
- Review PRDs, feature specs, and code produced by agents
- Create issues and assign them to the right agents
- Verify that agent outputs match intent

**What AI agents do:**
- Check assigned issues and execute tasks
- Generate structured documents like PRDs, feature specs, and user flows
- Report progress via issue comments
- Update issue status when done

Agent Team Hub is the **visualization layer** of this cycle — providing an intuitive interface for humans to review the work agents leave behind as files.

### Complements Claude Code, Doesn't Replace It

Agent Team Hub doesn't invoke agents directly or generate code. It's not trying to replace what Claude Code does. Rather, it's a **companion tool** for using Claude Code more effectively.

When you initialize a project, skills, workflow rules, and CLI tools that Claude Code understands are automatically installed. Agents use these tools to manage issues, and the Hub visualizes the results.

## System Architecture

### Data Layer: Files Are the Database

Agent Team Hub has no separate database. All data is stored as files in the project directory.

```
your-project/
├── .hub/
│   └── config.json              # Project initialization state
├── issues/
│   ├── _index.json              # Issue ID counter
│   ├── ISS-001.json             # Individual issue data
│   ├── ISS-002.json
│   └── archive/                 # Archived issues
│       └── ISS-003.json
├── data/
│   ├── prd.json                 # PRD (Product Requirements Document)
│   ├── features.json            # Feature specs and requirements
│   └── userflow.json            # User flow diagram data
├── docs/
│   └── *.md                     # Project documents (auto-indexed)
└── .claude/
    ├── agents/                  # Agent definition files
    │   ├── planner.md
    │   └── developer.md
    ├── rules/
    │   └── hub-workflow.md      # Agent workflow rules
    └── skills/hub/
        ├── SKILL.md             # Claude Code skill definition
        ├── scripts/
        │   └── issue-cli.js     # Issue management CLI tool
        └── references/
            └── schemas.md       # JSON schema reference
```

#### Concurrency Control: File-Based Lock System

To prevent multiple agents from modifying the same issue simultaneously, a **file-based lock mechanism** is used.

- A `.json.lock` file is created when editing an issue (10-second TTL)
- Up to 5 retries with exponential backoff on lock acquisition failure
- Stale locks with expired TTLs are automatically removed
- Current lock status is visible in real-time on the Hub UI

#### Real-Time Sync: Fingerprint-Based Polling

When agents modify files, changes need to be reflected in the Hub immediately. Without WebSockets, this is achieved through **fingerprint-based polling**.

1. Every 3 seconds, lightweight summaries of all issues (`id`, `updatedAt`, `status`, `commentsCount`) are fetched
2. These summaries are hashed to generate a fingerprint
3. Full issue data is reloaded only when the fingerprint differs from the previous one

This minimizes unnecessary I/O while detecting agent changes in near real-time.

### Storage Abstraction: Browser and Server Support

Agent Team Hub can operate in two modes:

| | Browser Mode | Server Mode |
|---|---|---|
| **Storage** | File System Access API | Node.js `fs/promises` |
| **Config** | IndexedDB | `~/.agent-team-hub/config.json` |
| **Network** | Not required | localhost |
| **Best for** | Fully offline use | Typical development environments |

Both modes implement the same `StorageProvider` interface, providing an identical user experience regardless of mode.

## Key Features

### Dashboard

See the entire project status at a glance.

- **Data file status** — Existence and state of PRD, Features, Userflow files
- **Deliverables panel** — Completeness of planning documents and recent doc list
- **Active issues** — Top 5 most recently updated issues
- **Agent team** — Each agent's info and current assigned issue count
- **One-click init** — Set up with a single button if the project isn't initialized yet

### Issue Tracking

Manage work units between agents and humans.

- **Status management** — `open` → `in-progress` → `resolved` → `closed` workflow
- **5 issue types** — task, bug, feature, question, decision
- **4 priority levels** — critical, high, medium, low
- **Multiple assignees** — Assign multiple agents/humans to a single issue
- **Comments** — Agents report progress, humans leave feedback
- **Related files** — Record source file paths associated with the issue
- **Cross-references** — Link to other issues or feature specs
- **Bulk operations** — Archive/delete multiple issues at once in multi-select mode
- **Archive** — Store completed issues separately, restore when needed
- **Real-time sync** — Changes made via CLI are reflected in the UI within 3 seconds

### Planning

Visually explore structured JSON-based planning deliverables.

#### PRD (Product Requirements Document)

Visualizes the product requirements document stored in `data/prd.json`. A view for humans to review PRDs written by agents.

- **Vision** — One-liner summary, goals, background
- **Core values** — Product values and principles
- **Target users** — User types, personas, scenarios
- **User stories** — Story list with BDD-style acceptance criteria, filterable by role
- **Non-functional requirements** — Performance, security, deployment, data management
- **MVP scope** — Included/excluded items
- **Roadmap** — Phased release plan
- **KPIs** — Operational, usability, business metrics
- **Constraints & open issues** — Technical/business constraints and undecided items

#### Feature Specs

Explore feature specs and requirements stored in `data/features.json`.

- **Tree view** — Hierarchical feature structure reflecting parent-child relationships
- **Directory view** — Flat listing in file-browser style
- **Requirements** — Organized by tenant, admin, platform groups
- **Feature details** — User stories, acceptance criteria, dependencies, related screens
- **Phased planning** — Phase-based incremental release planning
- **Relationship visualization** — Dependency/extension relationships between features

#### User Flow

Visualizes user journeys stored in `data/userflow.json` as interactive diagrams.

- **Node types** — start, section, page, action
- **Zoom/pan** — Freely explore complex flows
- **Section separation** — Independent diagrams per user journey
- **Color-coded legend** — Visual distinction by node type

### Document Browser

Automatically indexes and browses Markdown documents under the `docs/` directory.

- **Auto-discovery** — Recursively scans all `.md` files under `docs/`
- **Metadata extraction** — Extracts title, description, author, emoji from YAML frontmatter
- **Category grouping** — Auto-groups by subdirectory structure
- **TOC generation** — Automatically generates Table of Contents from Markdown headings
- **Token estimation** — Displays estimated token count per document (useful for agent context management)

### Agent Team Management

Define AI agents and assign roles.

Each agent is stored as a Markdown file with YAML frontmatter in the `.claude/agents/` directory:

```markdown
---
name: Planner
description: Planning agent that writes PRDs and feature specs
model: claude-opus-4
color: blue
emoji: 📋
role: Planner
responsibilities:
  - Create and update PRDs
  - Structure feature specs
  - Validate user stories
---

# Planner Agent

Detailed instructions and guidelines for this agent...
```

- **Agent cards** — See emoji, name, role, description at a glance
- **Create/edit** — Add new agents or modify settings directly in the Hub UI
- **Issue integration** — View current assigned issue count per agent on the dashboard
- **Model configuration** — Specify which Claude model each agent should use

## Claude Code Integration

When you initialize a project, the following files are automatically generated so Claude Code can seamlessly collaborate with Agent Team Hub:

### Skill Definition (`.claude/skills/hub/SKILL.md`)

A skill file that teaches Claude Code the Hub's data schemas and usage. Includes JSON schema definitions for PRD, Features, Userflow and CLI command references.

### Issue CLI (`.claude/skills/hub/scripts/issue-cli.js`)

A Node.js CLI tool for agents to manage issues from the terminal:

```bash
# Create an issue
node .claude/skills/hub/scripts/issue-cli.js create --title "Implement login" --type task --assignee developer

# Update status
node .claude/skills/hub/scripts/issue-cli.js update ISS-001 --status in-progress

# Add a comment
node .claude/skills/hub/scripts/issue-cli.js comment ISS-001 --author planner --content "PRD complete, review needed"

# Mark as resolved
node .claude/skills/hub/scripts/issue-cli.js update ISS-001 --status resolved
```

### Workflow Rules (`.claude/rules/hub-workflow.md`)

A rules file that governs agent behavior:
- Must check assigned issues before starting work
- Issue state transition rules (`open` → `in-progress` → `resolved`)
- Sub-agent coordination patterns
- Comment writing conventions

## Typical Workflow

### 1. Project Setup

```bash
# Run the Hub
git clone https://github.com/calvinsnax/agent-team-hub.git
cd agent-team-hub
npm install
npm run dev
```

Visit http://localhost:3100 → Settings → Add project folder → Check "Initialize Project"

### 2. Build Your Agent Team

Define agents in the Hub UI. For example:
- **Planner** — Writes PRDs, feature specs, user flows
- **Developer** — Implements code, fixes bugs
- **Reviewer** — Code review, quality verification

### 3. Planning → Implementation Cycle

```
Human: Create issue ("Write login system PRD")
  → Assign to Planner agent

Planner: Check issue → Write data/prd.json → Comment on issue → Set status to resolved

Human: Review PRD on Hub → Create feedback issue or approve

Human: Create issue ("Implement login feature")
  → Assign to Developer agent

Developer: Check issue → Reference features.json → Write code → Set status to resolved

Human: Code review → Done or request changes
```

### 4. Daily Usage

- **Morning** — Check project status on dashboard, review open issues
- **During work** — Assign issues to agents, monitor progress
- **Review** — Inspect agent outputs (PRDs, code, docs) and provide feedback

## Tech Stack

- **Framework** — Next.js 16, React 19, TypeScript 5
- **UI** — shadcn/ui (Radix UI), Tailwind CSS
- **Markdown** — react-markdown, remark-gfm, remark-cjk-friendly
- **Diagrams** — Mermaid, react-zoom-pan-pinch
- **Storage** — File System Access API (browser) / `fs/promises` (server)
- **i18n** — Korean, English

## License

[MIT](LICENSE)
