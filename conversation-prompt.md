# JIRA Bug Triage Demo - Conversation Prompt Log

## Prompt 1: Initial Request

**User:**
I want to create a demo which takes information from any other source and creates a bug in JIRA and then from those sources it can find out whether a bug is needed to be created or there is an existing bug in JIRA so I want to seed the JIRA instance with existing bugs and issues and have some data in boards and I want GitHub Copilot to use the GitHub Copilot SDK to basically do this analysis of looking at a particular problem which is coming from a third-party source and seeing whether there is an issue already created in JIRA. If there is any way to use the JIRA MCP server please use that but I want to create an end to end demo for this. Create a README file and documentation on how to accomplish this and push all of this to GitHub repo https://github.com/sautalwar. Here is the JIRA instance https://talwarsaurabh-1770668373217.atlassian.net/

**Response:**
- Researched available JIRA MCP servers: official atlassian/atlassian-mcp-server and community sooperset/mcp-atlassian (4.5k+ stars, 72 tools)
- Researched GitHub Copilot SDK (@github/copilot-sdk) APIs: CopilotClient, createSession, sendAndWait, MCP integration patterns
- Created comprehensive project plan with 9 todos
- Built full Node.js/TypeScript project with:
  - `package.json`, `tsconfig.json`, `.gitignore`, `.env.example`
  - `seed/sample-data.json`: 20 bugs + 2 tasks + 2 stories with realistic descriptions
  - `seed/seed-jira.ts`: JIRA seeding script using REST API
  - `src/config.ts`: Configuration management
  - `src/analyzer.ts`: Core Copilot SDK + MCP integration logic
  - `src/index.ts`: CLI with demo/analyze/webhook commands
  - `src/sources/log-parser.ts`: Parse .log files into AnalysisInput
  - `src/sources/alert-ingester.ts`: Parse PagerDuty/Datadog/generic alerts
  - `src/sources/webhook-server.ts`: Express HTTP webhook endpoint
  - `examples/sample-alerts.json`, `sample-errors.log`, `demo-walkthrough.md`
  - `docs/architecture.md`, `docs/setup-guide.md`
  - `README.md`, `LICENSE`
- Created GitHub repo `sautalwar/JIRA` and pushed all code

---

## Prompt 2: JIRA Seeding

**User:**
(Provided JIRA credentials: email talwar.saurabh@gmail.com and API token)

**Response:**
- Created `.env` file with credentials
- Ran seed script; encountered issues:
  - DEMO project is team-managed — only has Task/Epic/Subtask issue types (no Bug or Story)
  - Fixed seed script to use project-specific issue type discovery via `/issue/createmeta/{projectKey}/issuetypes`
  - Removed priority field from issue creation (was causing errors)
- Successfully seeded 20 bugs (as Tasks with "bug" label), 2 tasks, 2 stories (DEMO-3 through DEMO-26)
- Transitioned DEMO-3, DEMO-7 to In Progress; DEMO-5 to Done
- Added comments to DEMO-3, DEMO-4, DEMO-7, DEMO-9

---

## Prompt 3: Presentation Materials

**User:**
I want to create a detailed demo guide on how I would present this to the customer since I have a meeting in 5 minutes. PowerPoint with notes and a detailed PDF guide.

**Response:**
- Created `generate_pptx.py`: PowerPoint generator producing 11 slides with dark theme and speaker notes on every slide
- Created `generate_pdf.py`: PDF guide generator producing a 12-page presenter guide with demo script, commands, Q&A, and troubleshooting
- Fixed bullet character encoding issue (chr(8226) → '-' for latin-1 compatibility with fpdf2)
- Generated `JIRA_Bug_Triage_Demo.pptx` and `JIRA_Bug_Triage_Demo_Guide.pdf`
- Opened both files for the user

---

## Prompt 4: Live Demo

**User:**
Can you bring up the demo for me right now?

**Response:**
- First attempt crashed with `Error: An onPermissionRequest handler is required when creating a session`
- Explored Copilot SDK API: discovered `approveAll` export and required `onPermissionRequest` parameter
- Fixed `src/analyzer.ts` to import and use `approveAll` from `@github/copilot-sdk`
- Installed mcp-atlassian via pip
- Second attempt: ora spinner was consuming terminal buffer, making output appear stuck
- Created `test-sdk.ts` to isolate timing: session creation ~2.4s, sendAndWait ~50s per call
- Optimized analyzer:
  - Simplified prompt to request single JQL search instead of multiple
  - Added session caching to reuse across scenarios
  - Removed spinner in favor of static "takes ~60s" message

**Final successful demo run — all 4 scenarios completed:**

| # | Scenario | Source | Result | Match |
|---|----------|--------|--------|-------|
| 1 | PagerDuty NullPointerException alert | PagerDuty | 🔗 EXISTING DEMO-3 | 97% confidence |
| 2 | Datadog high memory usage alert | Datadog | 🆕 CREATED DEMO-27 | No match found |
| 3 | Sentry Safari TypeError | Sentry | 🔗 EXISTING DEMO-6 | 98% confidence |
| 4 | CloudWatch Lambda timeout | AWS CloudWatch | 🆕 CREATED DEMO-28 | Correctly no match |

---

## Prompt 5: Push Latest Changes

**User:**
(Implicit — demo was working, needed to commit fixes)

**Response:**
- Committed and pushed all fixes to GitHub:
  - `approveAll` integration
  - Session caching
  - Prompt simplification
  - JIRA issue type detection fix
  - Priority field removal
  - Spinner removal
  - PowerPoint and PDF generators + outputs

---

## Technical Details

### Key Architecture
```
Third-Party Alert → Source Parser → Copilot SDK → MCP (mcp-atlassian) → JIRA Cloud
                                        ↓
                              AI Analysis + JQL Search
                                        ↓
                            Match Found? → Link existing issue
                            No Match?   → Create new bug
```

### Critical SDK Details
- Package: `@github/copilot-sdk` v0.1.32 (ESM only)
- MUST pass `onPermissionRequest: approveAll` to `createSession()`
- `sendAndWait()` takes ~50-60s per call with MCP tools
- Sessions can be reused across multiple `sendAndWait` calls

### JIRA Instance
- URL: `https://talwarsaurabh-1770668373217.atlassian.net`
- Project: DEMO (team-managed, Task/Epic/Subtask types only)
- Bugs created as Tasks with "bug" label
- Auth: Basic auth with email + API token

### MCP Server
- `mcp-atlassian` installed via pip, runs via `uvx mcp-atlassian`
- Provides 72 tools for Atlassian product integration

### Commands
```bash
# Seed JIRA with sample data
npm run seed

# Run the 4-scenario demo
npm run demo

# Analyze a specific alert file
npm run start -- analyze --file examples/sample-alerts.json

# Start webhook server for real-time alerts
npm run start -- webhook --port 3000
```

### Files in Repository
```
├── src/
│   ├── analyzer.ts          # Core Copilot SDK + MCP logic
│   ├── config.ts            # Configuration management
│   ├── index.ts             # CLI entry point
│   └── sources/
│       ├── alert-ingester.ts   # PagerDuty/Datadog/generic parsers
│       ├── log-parser.ts       # Log file parser
│       └── webhook-server.ts   # Express webhook endpoint
├── seed/
│   ├── sample-data.json     # 20 bugs + 2 tasks + 2 stories
│   └── seed-jira.ts         # JIRA REST API seeder
├── examples/
│   ├── sample-alerts.json   # Example alert payloads
│   ├── sample-errors.log    # Example error logs
│   └── demo-walkthrough.md  # Step-by-step demo guide
├── docs/
│   ├── architecture.md      # Architecture documentation
│   └── setup-guide.md       # Setup instructions
├── generate_pptx.py         # PowerPoint generator
├── generate_pdf.py          # PDF guide generator
├── JIRA_Bug_Triage_Demo.pptx
├── JIRA_Bug_Triage_Demo_Guide.pdf
├── README.md
├── package.json
└── tsconfig.json
```
