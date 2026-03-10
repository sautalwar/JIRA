# Setup Guide

Complete guide to setting up the JIRA Bug Triage Demo from scratch.

## Prerequisites

| Tool | Version | Installation |
|------|---------|-------------|
| **Node.js** | 18+ | [nodejs.org](https://nodejs.org/) |
| **Python** | 3.10+ | [python.org](https://www.python.org/) (for mcp-atlassian) |
| **GitHub Copilot CLI** | Latest | [docs.github.com](https://docs.github.com/en/copilot/how-tos/set-up/install-copilot-cli) |
| **Git** | 2.x+ | [git-scm.com](https://git-scm.com/) |

## Step 1: Clone the Repository

```bash
git clone https://github.com/sautalwar/JIRA.git
cd JIRA
```

## Step 2: Install Node.js Dependencies

```bash
npm install
```

## Step 3: Install mcp-atlassian MCP Server

The MCP server connects Copilot SDK to your JIRA instance.

```bash
# Option A: Install with pip
pip install mcp-atlassian

# Option B: Use uvx (recommended, runs without explicit install)
# uvx is included with the `uv` Python package manager
pip install uv
```

Verify installation:
```bash
# If installed with pip:
python -m mcp_atlassian --help

# If using uvx:
uvx mcp-atlassian --help
```

## Step 4: Configure JIRA API Access

### 4a. Create a JIRA API Token

1. Go to [Atlassian API Tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Click **"Create API token"**
3. Give it a name (e.g., "Copilot Bug Triage Demo")
4. Copy the generated token

### 4b. Create Environment File

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
JIRA_URL=https://talwarsaurabh-1770668373217.atlassian.net
JIRA_USERNAME=your-email@example.com
JIRA_API_TOKEN=your-api-token-here
JIRA_PROJECT_KEY=DEMO
```

### 4c. Verify JIRA Connection

```bash
# Quick test - should return your JIRA user info
curl -s -u "your-email:your-api-token" \
  "https://talwarsaurabh-1770668373217.atlassian.net/rest/api/3/myself" | head
```

## Step 5: Install and Authenticate GitHub Copilot CLI

### 5a. Install Copilot CLI

Follow the [official installation guide](https://docs.github.com/en/copilot/how-tos/set-up/install-copilot-cli).

### 5b. Authenticate

```bash
copilot auth login
```

This opens a browser for GitHub OAuth authentication. You need an active GitHub Copilot subscription.

### 5c. Verify Copilot Works

```bash
copilot --version
```

## Step 6: Seed JIRA with Sample Data

This creates 20+ bugs, tasks, and stories in your JIRA project:

```bash
npm run seed
```

Expected output:
```
🚀 JIRA Bug Triage Demo - Seeding Script
=========================================

📍 JIRA URL: https://talwarsaurabh-1770668373217.atlassian.net
📋 Project Key: DEMO

✅ Project DEMO already exists (id: 10001)

🐛 Creating bugs...

   ✅ DEMO-1: NullPointerException in UserAuthenticationService.authenticate...
   ✅ DEMO-2: Memory leak in WebSocket connection handler...
   ...

=========================================
✅ Seeding complete!
   📊 Bugs created: 20
   📋 Tasks created: 2
   📖 Stories created: 2
```

After seeding, verify in JIRA:
- Open your [JIRA board](https://talwarsaurabh-1770668373217.atlassian.net/jira/software/projects/DEMO/board)
- You should see issues in To Do, In Progress, and Done columns

## Step 7: Run the Demo

### Interactive Demo Mode
```bash
npm run demo
```

### Analyze from Files
```bash
# From monitoring alerts (JSON)
npx tsx src/index.ts analyze --file examples/sample-alerts.json

# From error logs
npx tsx src/index.ts analyze --file examples/sample-errors.log
```

### Manual Alert Input
```bash
npx tsx src/index.ts analyze \
  --title "Service returning 500 errors" \
  --description "The API is returning 500 errors for 10% of requests" \
  --severity high
```

### Webhook Server
```bash
npm run webhook
```

## Troubleshooting

### "Cannot find module '@github/copilot-sdk'"
```bash
npm install @github/copilot-sdk
```

### "mcp-atlassian: command not found"
```bash
pip install mcp-atlassian
# Or ensure Python is in your PATH
```

### "401 Unauthorized" from JIRA
- Verify your email and API token in `.env`
- Ensure the API token hasn't expired
- Check you're using your Atlassian account email (not username)

### "Copilot session creation failed"
- Run `copilot auth login` to re-authenticate
- Ensure you have an active GitHub Copilot subscription
- Check your `GITHUB_TOKEN` environment variable

### "JIRA project not found"
- Run `npm run seed` to create the DEMO project
- Or change `JIRA_PROJECT_KEY` in `.env` to an existing project

### MCP Server Timeout
- Increase timeout in `src/analyzer.ts` (default: 30000ms)
- Check network connectivity to JIRA
- Verify mcp-atlassian can connect: `JIRA_URL=... JIRA_USERNAME=... JIRA_API_TOKEN=... uvx mcp-atlassian`

## Alternative: Using Official Atlassian MCP Server

Instead of `mcp-atlassian`, you can use the official Atlassian MCP server:

```typescript
// In src/analyzer.ts, change mcpServers config:
mcpServers: {
  atlassian: {
    type: "http",
    url: "https://mcp.atlassian.com/v1/mcp",
    headers: {
      Authorization: "Bearer ${ATLASSIAN_OAUTH_TOKEN}",
    },
    tools: ["*"],
  },
},
```

This requires OAuth 2.1 authentication instead of API tokens.
See: [github.com/atlassian/atlassian-mcp-server](https://github.com/atlassian/atlassian-mcp-server)
