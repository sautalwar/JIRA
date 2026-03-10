/**
 * Copilot SDK + JIRA MCP Analyzer
 *
 * Uses GitHub Copilot SDK to create an intelligent session that connects to
 * JIRA via the mcp-atlassian MCP server. The analyzer can:
 * 1. Search existing JIRA issues for potential duplicates
 * 2. Analyze incoming alerts/errors against known issues
 * 3. Create new bugs when no match is found
 */

import { CopilotClient } from "@github/copilot-sdk";
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
export async function createAnalyzerSession() {
  const config = loadConfig();
  const client = new CopilotClient();

  const session = await client.createSession({
    model: "gpt-4o",
    streaming: true,
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
          "jira_update_issue",
          "jira_add_comment",
          "jira_list_projects",
        ],
        timeout: 30000,
      },
    },
  });

  return { client, session };
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

    // Parse the structured response from the model
    const analysisResult = parseAnalysisResponse(content, input);

    await session.disconnect();
    return analysisResult;
  } catch (error) {
    await session.disconnect();
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
  return `You are an intelligent bug triage assistant. Your job is to analyze incoming alerts and errors, search for existing JIRA issues that might match, and either link to an existing issue or create a new one.

## Incoming Alert

**Source:** ${input.source}
**Title:** ${input.title}
**Severity:** ${input.severity}
**Description:**
${input.description}
${input.metadata ? `\n**Additional Metadata:**\n${Object.entries(input.metadata).map(([k, v]) => `- ${k}: ${v}`).join("\n")}` : ""}

## Instructions

1. **Search for existing issues:** Use the jira_search tool to search the ${projectKey} project for issues that might be related to this alert. Try multiple search queries:
   - Search by key terms from the title
   - Search by error type or component
   - Search by related labels

2. **Analyze matches:** For each potential match, compare:
   - Error type / root cause similarity
   - Affected component or service
   - Stack trace or error message patterns
   - Current issue status (is it already being worked on?)

3. **Make a decision:**
   - If you find a matching issue with **high confidence (>70%)**: Report it as an existing issue
   - If you find a **partial match (40-70%)**: Report the potential match but recommend creating a new issue
   - If **no match found (<40%)**: Create a new bug in JIRA using jira_create_issue

4. **Response format:** Always end your response with a structured block:

\`\`\`result
ACTION: [existing|created]
ISSUE_KEY: [DEMO-XX]
CONFIDENCE: [0-100]
REASONING: [One sentence explaining your decision]
\`\`\`

## Important
- When creating a new issue, set the project to ${projectKey}
- Map severity to JIRA priority: critical→Highest, high→High, medium→Medium, low→Low
- Add relevant labels based on the alert content
- If creating a new issue, include the source system in the description`;
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
