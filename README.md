# 🐛 JIRA Bug Triage with GitHub Copilot SDK + MCP

**Intelligent bug triage powered by AI** — Automatically analyze incoming alerts and errors, search JIRA for existing issues, and create new bugs only when needed.

![Architecture](docs/architecture.md)

## ✨ What It Does

This demo shows an end-to-end workflow where:

1. **Third-party sources** (PagerDuty, Datadog, Sentry, error logs) produce alerts
2. **GitHub Copilot SDK** creates an AI session with tool-calling capabilities
3. **JIRA MCP Server** (`mcp-atlassian`) provides JIRA search, read, and write tools
4. The AI **searches existing JIRA issues**, compares them to the incoming alert, and decides:
   - 🔗 **Existing issue found** — links to it with confidence score
   - 🆕 **No match** — creates a new, well-formatted JIRA bug

```
Alert from PagerDuty ──┐
Error from logs ───────┼──▶ Copilot SDK ──▶ JIRA MCP ──▶ Search JIRA
Webhook from Datadog ──┘         │                           │
                                 │    ┌──────────────────────┘
                                 ▼    ▼
                           Match found?
                          /            \
                        Yes             No
                         │               │
                    🔗 Link to          🆕 Create
                    existing            new bug
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+
- **Python** 3.10+ (for mcp-atlassian)
- **GitHub Copilot CLI** with active subscription
- **JIRA Cloud** instance with API access

### 1. Install Dependencies

```bash
git clone https://github.com/sautalwar/JIRA.git
cd JIRA
npm install
pip install mcp-atlassian  # or: pip install uv && uvx mcp-atlassian
```

### 2. Configure

```bash
cp .env.example .env
# Edit .env with your JIRA and GitHub credentials
```

Required environment variables:
| Variable | Description |
|----------|-------------|
| `JIRA_URL` | Your JIRA instance URL |
| `JIRA_USERNAME` | Your Atlassian email |
| `JIRA_API_TOKEN` | [Create API token](https://id.atlassian.com/manage-profile/security/api-tokens) |
| `JIRA_PROJECT_KEY` | Project key (default: `DEMO`) |
| `GITHUB_TOKEN` | GitHub token with Copilot access |

### 3. Seed JIRA with Sample Data

```bash
npm run seed
```

This creates **20 realistic bugs**, 2 tasks, and 2 stories across different services (Auth, API, Frontend, Database, etc.) with varying priorities and states.

### 4. Run the Demo

```bash
npm run demo
```

## 📖 Usage

### Interactive Demo
```bash
npm run demo
```
Walks through 4 scenarios with different alert sources and expected outcomes.

### Analyze from Files
```bash
# Monitoring alerts (JSON format)
npx tsx src/index.ts analyze --file examples/sample-alerts.json

# Application error logs
npx tsx src/index.ts analyze --file examples/sample-errors.log
```

### Manual Alert Input
```bash
npx tsx src/index.ts analyze \
  --title "Redis connection timeout in API gateway" \
  --description "Rate limiter failing due to Redis being unreachable" \
  --severity high \
  --source monitoring
```

### Webhook Server
```bash
npm run webhook
```

Then send alerts:
```bash
curl -X POST http://localhost:3000/webhook/alert \
  -H "Content-Type: application/json" \
  -d '{
    "source": "PagerDuty",
    "title": "Database connection pool exhausted",
    "description": "HikariCP pool at 100% utilization",
    "severity": "high"
  }'
```

## 🏗 Architecture

### Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **AI Engine** | [GitHub Copilot SDK](https://github.com/github/copilot-sdk) (`@github/copilot-sdk`) | Creates AI sessions with tool-calling |
| **JIRA Integration** | [mcp-atlassian](https://github.com/sooperset/mcp-atlassian) | MCP server with 72 JIRA/Confluence tools |
| **Protocol** | [Model Context Protocol](https://modelcontextprotocol.io/) | Standardized AI↔Tool communication |
| **Runtime** | Node.js + TypeScript | Application runtime |
| **CLI** | Commander.js + Inquirer | Interactive command-line interface |

### How It Works

1. **Copilot SDK** creates a session with `mcp-atlassian` as an MCP server
2. A **triage prompt** instructs the model to search JIRA and make decisions
3. The model **autonomously calls** JIRA tools via MCP:
   - `jira_search` — Search with JQL queries
   - `jira_get_issue` — Get full issue details
   - `jira_create_issue` — Create new bugs
   - `jira_add_comment` — Add comments to existing issues
4. Results are parsed into a structured format with **confidence scores**

See [docs/architecture.md](docs/architecture.md) for detailed diagrams.

## 📁 Project Structure

```
JIRA/
├── README.md                        # This file
├── package.json                     # Node.js project config
├── tsconfig.json                    # TypeScript config
├── .env.example                     # Environment template
├── .gitignore
│
├── seed/
│   ├── seed-jira.ts                 # Seeds JIRA with sample data
│   └── sample-data.json             # 20+ realistic bugs & issues
│
├── src/
│   ├── index.ts                     # CLI entry point
│   ├── analyzer.ts                  # Copilot SDK + MCP integration
│   ├── config.ts                    # Configuration management
│   └── sources/
│       ├── log-parser.ts            # Parse error log files
│       ├── alert-ingester.ts        # Parse monitoring alerts
│       └── webhook-server.ts        # HTTP webhook endpoint
│
├── examples/
│   ├── sample-alerts.json           # Sample monitoring alerts
│   ├── sample-errors.log            # Sample application logs
│   └── demo-walkthrough.md          # Step-by-step demo script
│
└── docs/
    ├── architecture.md              # System architecture
    └── setup-guide.md               # Detailed setup instructions
```

## 🔧 Configuration Options

### Using Official Atlassian MCP Server (Alternative)

Instead of `mcp-atlassian`, you can use the [official Atlassian MCP server](https://github.com/atlassian/atlassian-mcp-server):

```typescript
// In src/analyzer.ts
mcpServers: {
  atlassian: {
    type: "http",
    url: "https://mcp.atlassian.com/v1/mcp",
    headers: { Authorization: "Bearer ${ATLASSIAN_OAUTH_TOKEN}" },
    tools: ["*"],
  },
},
```

### BYOK (Bring Your Own Key)

Use your own LLM API keys instead of GitHub Copilot:

```env
# In .env - uncomment one:
OPENAI_API_KEY=sk-...
# AZURE_OPENAI_API_KEY=...
# AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
```

## 📊 Seeded JIRA Data

The seed script creates realistic issues across these categories:

| Category | Count | Examples |
|----------|-------|---------|
| 🔐 Authentication | 3 | NPE in auth, password reset tokens, SSO login loop |
| 🌐 API / Backend | 4 | Rate limiter 500s, CORS issues, webhook retry logic |
| 💻 Frontend / UI | 2 | Safari chart rendering, dark mode persistence |
| 🗄 Database | 2 | Connection pool exhaustion, GraphQL N+1 queries |
| 🔒 Security | 2 | SQL injection, password reset token reuse |
| 📱 Mobile | 1 | Android 14 camera crash |
| ⚡ Performance | 2 | Memory leak, Elasticsearch corruption |
| 💰 Payments | 1 | Race condition causing duplicate charges |
| 📧 Notifications | 1 | Wrong timezone in emails |
| 🏗 Infrastructure | 2 | K8s CrashLoopBackOff, audit log gaps |

## 📚 Additional Documentation

- [Setup Guide](docs/setup-guide.md) — Detailed installation and configuration
- [Architecture](docs/architecture.md) — System design and data flow
- [Demo Walkthrough](examples/demo-walkthrough.md) — Step-by-step demo script

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.
