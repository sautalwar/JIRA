# Demo Walkthrough

## Step-by-Step Demo Script

This document provides a guided walkthrough for demonstrating the JIRA Bug Triage system powered by GitHub Copilot SDK + JIRA MCP Server.

---

## Prerequisites

Before running the demo, ensure:
1. ✅ JIRA instance is seeded with sample data (`npm run seed`)
2. ✅ `.env` file is configured with valid credentials
3. ✅ `mcp-atlassian` is installed (`pip install mcp-atlassian` or `uvx mcp-atlassian`)
4. ✅ GitHub Copilot CLI is installed and authenticated

---

## Demo Flow

### 1. Show the Seeded JIRA Board (2 min)

Open the JIRA board in a browser to show the existing issues:
```
https://talwarsaurabh-1770668373217.atlassian.net/jira/software/projects/DEMO/board
```

**Talking points:**
- 20 bugs across different services (Auth, API, Frontend, Database, etc.)
- Issues in various states (To Do, In Progress, Done)
- Realistic descriptions with stack traces and impact analysis

### 2. Run the Interactive Demo (5 min)

```bash
npm run demo
```

This walks through 4 scenarios:

#### Scenario 1: Matching Alert (Auth NullPointerException)
- **Source:** PagerDuty alert about login failures
- **Expected result:** 🔗 EXISTING ISSUE FOUND - matches the seeded auth bug
- **Key point:** Copilot searches JIRA via MCP and finds the existing bug

#### Scenario 2: Related Alert (Memory Leak)
- **Source:** Datadog alert about high memory on notification-service
- **Expected result:** 🔗 EXISTING ISSUE FOUND - matches the WebSocket memory leak bug
- **Key point:** Even though the alert says "high memory", Copilot understands it relates to the WebSocket leak

#### Scenario 3: Browser-Specific Bug
- **Source:** Sentry error about Safari chart rendering
- **Expected result:** 🔗 EXISTING ISSUE FOUND - matches the Safari dashboard bug
- **Key point:** Cross-references error message patterns

#### Scenario 4: New Issue (Lambda Timeout)
- **Source:** CloudWatch alert about payment Lambda
- **Expected result:** 🆕 NEW BUG CREATED - no matching issue exists
- **Key point:** When no match is found, automatically creates a well-formatted bug

### 3. Analyze from Error Logs (3 min)

```bash
npx tsx src/index.ts analyze --file examples/sample-errors.log
```

**Talking points:**
- Parses standard log format and JSON structured logs
- Extracts error-level entries with stack traces
- Batch analyzes all errors against JIRA
- Shows summary of existing vs. new issues

### 4. Analyze from Monitoring Alerts (3 min)

```bash
npx tsx src/index.ts analyze --file examples/sample-alerts.json
```

**Talking points:**
- Ingests alerts from PagerDuty, Datadog, Sentry, Prometheus, CloudWatch
- Normalizes different alert formats
- Identifies which alerts map to known issues

### 5. Manual Alert Input (2 min)

```bash
npx tsx src/index.ts analyze \
  --title "Redis connection refused on port 6379" \
  --description "The API gateway cannot connect to Redis. All rate limiting is failing." \
  --severity high \
  --source "monitoring"
```

### 6. Webhook Server (Optional, 3 min)

Start the webhook server:
```bash
npm run webhook
```

Send a test alert:
```bash
curl -X POST http://localhost:3000/webhook/alert \
  -H "Content-Type: application/json" \
  -d '{
    "source": "PagerDuty",
    "title": "Database connection pool exhausted",
    "description": "HikariCP pool at 100% utilization on user-service",
    "severity": "high"
  }'
```

View the dashboard:
```bash
curl http://localhost:3000/dashboard | jq .
```

---

## Key Architecture Points

1. **GitHub Copilot SDK** creates an AI session with tool-calling capabilities
2. **mcp-atlassian** MCP server provides JIRA tools (search, create, update)
3. Copilot uses **JQL search** to find similar issues by keywords, components, labels
4. The AI **compares** alert details against existing issue descriptions
5. Confidence scoring determines whether to link or create
6. All JIRA operations happen through the **MCP protocol** — no direct API calls from the app

---

## Troubleshooting Demo Issues

| Issue | Solution |
|-------|----------|
| "Connection refused" on JIRA | Check JIRA_URL in .env |
| "401 Unauthorized" | Verify JIRA_USERNAME and JIRA_API_TOKEN |
| Copilot SDK timeout | Ensure `copilot` CLI is installed and authenticated |
| MCP server not found | Install: `pip install mcp-atlassian` |
| No issues found | Run `npm run seed` first |
