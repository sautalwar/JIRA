# Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     JIRA Bug Triage System                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐           │
│  │  Error Logs  │  │ Monitoring  │  │   Webhook    │           │
│  │   Parser     │  │   Alerts    │  │   Server     │           │
│  │  (.log/.txt) │  │  (JSON)     │  │  (HTTP POST) │           │
│  └──────┬───── ┘  └──────┬──────┘  └──────┬───────┘           │
│         │                │                 │                    │
│         └────────────────┼─────────────────┘                    │
│                          │                                      │
│                          ▼                                      │
│              ┌───────────────────────┐                          │
│              │   AnalysisInput       │                          │
│              │  (Normalized Alert)   │                          │
│              └───────────┬───────────┘                          │
│                          │                                      │
│                          ▼                                      │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                 GitHub Copilot SDK                         │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  CopilotClient → Session (with MCP Servers)         │  │  │
│  │  │                                                     │  │  │
│  │  │  Prompt: "Analyze this alert, search JIRA for       │  │  │
│  │  │          matches, decide: existing or create new"   │  │  │
│  │  │                                                     │  │  │
│  │  │  Model: GPT-4o (via Copilot)                       │  │  │
│  │  └──────────────────────┬──────────────────────────────┘  │  │
│  └──────────────────────── │ ─────────────────────────────────┘  │
│                            │                                     │
│                            │ MCP Protocol (JSON-RPC)             │
│                            ▼                                     │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │              mcp-atlassian MCP Server                      │  │
│  │                                                            │  │
│  │  Tools:                                                    │  │
│  │  • jira_search      - Search issues with JQL              │  │
│  │  • jira_get_issue   - Get issue details                   │  │
│  │  • jira_create_issue - Create new issues                  │  │
│  │  • jira_update_issue - Update existing issues             │  │
│  │  • jira_add_comment  - Add comments                       │  │
│  │  • jira_list_projects - List projects                     │  │
│  └────────────────────────┬──────────────────────────────────┘   │
│                           │                                      │
└───────────────────────────│──────────────────────────────────────┘
                            │ REST API (HTTPS)
                            ▼
                ┌───────────────────────┐
                │   Atlassian JIRA      │
                │   Cloud Instance      │
                │                       │
                │  Projects / Boards    │
                │  Issues / Bugs        │
                │  Comments / Labels    │
                └───────────────────────┘
```

## Data Flow

### 1. Alert Ingestion
Third-party sources produce alerts in various formats. The system normalizes
them into a common `AnalysisInput` structure:

```typescript
interface AnalysisInput {
  source: string;       // "PagerDuty", "Datadog", "error-log"
  title: string;        // Alert title / error message
  description: string;  // Full alert details
  severity: "critical" | "high" | "medium" | "low";
  metadata?: Record<string, string>;  // Source-specific data
}
```

### 2. Copilot SDK Analysis
The analyzer creates a Copilot SDK session with the JIRA MCP server attached.
It sends a carefully crafted prompt that instructs the model to:

1. **Search** JIRA using multiple JQL queries (by keywords, components, labels)
2. **Compare** each potential match against the incoming alert
3. **Score** confidence (0-100%) based on similarity
4. **Decide** whether to link to an existing issue or create a new one

### 3. MCP Tool Calling
During analysis, Copilot autonomously calls MCP tools:

```
Session.sendAndWait(prompt)
  → Model reasons about the alert
  → Model calls jira_search("project = DEMO AND text ~ 'NullPointerException'")
  → MCP server executes JIRA REST API call
  → Results returned to model
  → Model compares results, calls jira_get_issue("DEMO-1")
  → Model makes decision
  → Returns structured result
```

### 4. Result Processing
The structured result indicates the action taken:

```typescript
interface AnalysisResult {
  action: "existing" | "created" | "error";
  issueKey?: string;      // e.g., "DEMO-1"
  confidence?: number;    // 0-100
  reasoning?: string;     // Human-readable explanation
}
```

## Component Details

### Source Parsers

| Parser | Input Format | Supported Sources |
|--------|-------------|-------------------|
| `log-parser.ts` | `.log`, `.txt` files | Any application logs (JSON or standard format) |
| `alert-ingester.ts` | JSON payloads | PagerDuty, Datadog, Prometheus, CloudWatch, custom |
| `webhook-server.ts` | HTTP POST | Any system that can send webhooks |

### Copilot SDK Configuration

The SDK session is configured with:
- **Model:** GPT-4o (via GitHub Copilot)
- **MCP Server:** mcp-atlassian (local/stdio transport)
- **Tool Filter:** Only JIRA-related tools enabled
- **Timeout:** 30 seconds per MCP operation

### Security

- JIRA API tokens stored in `.env` (not committed)
- MCP server runs locally (stdio transport, no network exposure)
- Webhook server supports optional secret validation
- All JIRA operations respect user's Atlassian permissions
