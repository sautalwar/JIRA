/**
 * Copilot SDK + JIRA MCP Analyzer
 *
 * Uses GitHub Copilot SDK to create an intelligent session that connects to
 * JIRA via the mcp-atlassian MCP server. The analyzer can:
 * 1. Search existing JIRA issues for potential duplicates
 * 2. Analyze incoming alerts/errors against known issues
 * 3. Create new bugs when no match is found
 */

import { CopilotClient, approveAll } from "@github/copilot-sdk";
import { loadConfig } from "./config.js";

export interface AnalysisInput {
  source: string; // e.g., "PagerDuty", "Datadog", "error-log", "manual"
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  metadata?: Record<string, string>;
}

export interface AnalysisResult {
  action: "existing" | "created" | "error";
  issueKey?: string;
  summary?: string;
  confidence?: number;
  reasoning?: string;
  rawResponse?: string;
}

/**
 * Creates a Copilot SDK session with JIRA MCP server integration
 */
let _cachedSession: { client: any; session: any } | null = null;

export async function createAnalyzerSession() {
  if (_cachedSession) return _cachedSession;

  const config = loadConfig();
  const client = new CopilotClient();

  const session = await client.createSession({
    onPermissionRequest: approveAll,
    mcpServers: {
      atlassian: {
        type: "local",
        command: "uvx",
        args: ["mcp-atlassian"],
        env: {
          JIRA_URL: config.jira.url,
          JIRA_USERNAME: config.jira.username,
          JIRA_API_TOKEN: config.jira.apiToken,
        },
        tools: [
          "jira_search",
          "jira_get_issue",
          "jira_create_issue",
        ],
        timeout: 60000,
      },
    },
  });

  _cachedSession = { client, session };
  return _cachedSession;
}

export async function disconnectSession() {
  if (_cachedSession) {
    await _cachedSession.session.disconnect();
    _cachedSession = null;
  }
}

/**
 * Analyzes an incoming alert/error and determines whether it matches an
 * existing JIRA issue or needs a new bug to be created.
 */
export async function analyzeAndTriage(input: AnalysisInput): Promise<AnalysisResult> {
  const config = loadConfig();
  const { session } = await createAnalyzerSession();

  const prompt = buildTriagePrompt(input, config.jira.projectKey);

  try {
    const result = await session.sendAndWait({ prompt });
    const content = result?.data?.content || "";

    const analysisResult = parseAnalysisResponse(content, input);
    return analysisResult;
  } catch (error) {
    return {
      action: "error",
      reasoning: `Analysis failed: ${error instanceof Error ? error.message : String(error)}`,
      rawResponse: String(error),
    };
  }
}

/**
 * Builds the triage prompt that instructs the Copilot model to search JIRA
 * and make a decision about whether to create a new bug.
 */
function buildTriagePrompt(input: AnalysisInput, projectKey: string): string {
  return `You are a bug triage assistant. Search JIRA for an existing issue matching this alert, or create a new one.

## Alert
- **Source:** ${input.source}
- **Title:** ${input.title}
- **Severity:** ${input.severity}
- **Description:** ${input.description}

## Steps
1. Use jira_search with JQL: \`project = ${projectKey} AND text ~ "KEYWORDS"\` where KEYWORDS are 2-3 key terms from the title. Do ONE search only.
2. If a result looks like the same root cause, report it as existing.
3. If no match, create a new issue with jira_create_issue in project ${projectKey} with issue type Task.
4. End your response with exactly this block:

\`\`\`result
ACTION: [existing|created]
ISSUE_KEY: [${projectKey}-XX]
CONFIDENCE: [0-100]
REASONING: [One sentence]
\`\`\`

Be concise. Do not search more than once.`;
}

/**
 * Parses the model's response to extract structured analysis results
 */
function parseAnalysisResponse(content: string, input: AnalysisInput): AnalysisResult {
  const resultMatch = content.match(
    /```result\s*\n([\s\S]*?)```/
  );

  if (resultMatch) {
    const block = resultMatch[1];
    const action = block.match(/ACTION:\s*(existing|created)/i)?.[1]?.toLowerCase() as
      | "existing"
      | "created"
      | undefined;
    const issueKey = block.match(/ISSUE_KEY:\s*(\S+)/i)?.[1];
    const confidence = parseInt(block.match(/CONFIDENCE:\s*(\d+)/i)?.[1] || "0", 10);
    const reasoning = block.match(/REASONING:\s*(.+)/i)?.[1]?.trim();

    return {
      action: action || "error",
      issueKey,
      summary: input.title,
      confidence,
      reasoning,
      rawResponse: content,
    };
  }

  // Fallback: try to extract info from unstructured response
  const hasExisting = content.toLowerCase().includes("existing issue");
  const hasCreated = content.toLowerCase().includes("created");
  const keyMatch = content.match(/([A-Z]+-\d+)/);

  return {
    action: hasCreated ? "created" : hasExisting ? "existing" : "error",
    issueKey: keyMatch?.[1],
    summary: input.title,
    reasoning: "Parsed from unstructured response",
    rawResponse: content,
  };
}

/**
 * Batch analyze multiple alerts against JIRA
 */
export async function batchAnalyze(
  inputs: AnalysisInput[]
): Promise<AnalysisResult[]> {
  const results: AnalysisResult[] = [];

  for (const input of inputs) {
    console.log(`\n🔍 Analyzing: ${input.title}`);
    const result = await analyzeAndTriage(input);
    results.push(result);

    console.log(
      `   ${result.action === "existing" ? "🔗" : result.action === "created" ? "🆕" : "❌"} ` +
        `${result.action.toUpperCase()} ${result.issueKey || ""} ` +
        `(confidence: ${result.confidence || "N/A"}%)`
    );

    // Small delay between analyses to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return results;
}
