import dotenv from "dotenv";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ─── Configuration ───────────────────────────────────────────────
const JIRA_URL = process.env.JIRA_URL!;
const JIRA_USERNAME = process.env.JIRA_USERNAME!;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN!;
const PROJECT_KEY = process.env.JIRA_PROJECT_KEY || "DEMO";

const AUTH_HEADER =
  "Basic " + Buffer.from(`${JIRA_USERNAME}:${JIRA_API_TOKEN}`).toString("base64");

interface JiraResponse {
  id?: string;
  key?: string;
  errors?: Record<string, string>;
  errorMessages?: string[];
}

// ─── JIRA REST API Helper ────────────────────────────────────────
async function jiraRequest(
  path: string,
  method: string = "GET",
  body?: unknown
): Promise<JiraResponse> {
  const url = `${JIRA_URL}/rest/api/3${path}`;
  const headers: Record<string, string> = {
    Authorization: AUTH_HEADER,
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  if (!res.ok) {
    console.error(`❌ ${method} ${path} → ${res.status}: ${text}`);
    throw new Error(`JIRA API error: ${res.status}`);
  }

  return text ? JSON.parse(text) : {};
}

// ─── Get or Create Project ───────────────────────────────────────
async function ensureProject(): Promise<string> {
  try {
    const project = await jiraRequest(`/project/${PROJECT_KEY}`);
    console.log(`✅ Project ${PROJECT_KEY} already exists (id: ${project.id})`);
    return project.id!;
  } catch {
    console.log(`📦 Creating project ${PROJECT_KEY}...`);

    // Get current user's account ID for lead
    const myself = (await jiraRequest("/myself")) as any;
    const accountId = myself.accountId;

    const project = await jiraRequest("/project", "POST", {
      key: PROJECT_KEY,
      name: "Demo Application",
      description: "Demo project for bug triage with GitHub Copilot SDK",
      projectTypeKey: "software",
      projectTemplateKey:
        "com.pyxis.greenhopper.jira:gh-simplified-agility-kanban",
      leadAccountId: accountId,
    });

    console.log(`✅ Project created: ${PROJECT_KEY} (id: ${project.id})`);
    return project.id!;
  }
}

// ─── Get Issue Types ─────────────────────────────────────────────
async function getProjectIssueTypes(projectKey: string): Promise<Record<string, string>> {
  // Use the createmeta endpoint to get issue types available for this project
  const meta = (await jiraRequest(
    `/issue/createmeta/${projectKey}/issuetypes`
  )) as any;

  const typeMap: Record<string, string> = {};

  if (meta.issueTypes) {
    for (const it of meta.issueTypes) {
      typeMap[it.name.toLowerCase()] = it.id;
      console.log(`   Found issue type: ${it.name} (${it.id})`);
    }
  }

  // If no Bug type, we'll use Task and add "bug" label
  if (!typeMap["bug"] && typeMap["task"]) {
    console.log(`   ⚠ No "Bug" issue type — will use "Task" with [Bug] label`);
    typeMap["bug"] = typeMap["task"];
  }
  if (!typeMap["story"] && typeMap["task"]) {
    typeMap["story"] = typeMap["task"];
  }

  return typeMap;
}

// ─── Create Issue ────────────────────────────────────────────────
async function createIssue(
  projectKey: string,
  issueTypeId: string,
  summary: string,
  description: string,
  priority: string,
  labels: string[]
): Promise<string> {
  // Map priority names to JIRA-accepted values
  const priorityMap: Record<string, string> = {
    Critical: "Highest",
    High: "High",
    Medium: "Medium",
    Low: "Low",
    Lowest: "Lowest",
  };
  const mappedPriority = priorityMap[priority] || "Medium";

  const issue = await jiraRequest("/issue", "POST", {
    fields: {
      project: { key: projectKey },
      issuetype: { id: issueTypeId },
      summary,
      description: {
        type: "doc",
        version: 1,
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: description }],
          },
        ],
      },
      labels,
    },
  });

  return issue.key!;
}

// ─── Transition Issues to Various States ─────────────────────────
async function transitionIssue(issueKey: string, targetStatus: string): Promise<void> {
  try {
    const transitions = (await jiraRequest(
      `/issue/${issueKey}/transitions`
    )) as any;

    const transition = transitions.transitions?.find(
      (t: any) => t.name.toLowerCase() === targetStatus.toLowerCase()
    );

    if (transition) {
      await jiraRequest(`/issue/${issueKey}/transitions`, "POST", {
        transition: { id: transition.id },
      });
      console.log(`   ↪ Transitioned ${issueKey} → ${targetStatus}`);
    }
  } catch (err) {
    // Transitions may not be available for all issue states
    console.log(`   ⚠ Could not transition ${issueKey} to ${targetStatus}`);
  }
}

// ─── Add Comment ─────────────────────────────────────────────────
async function addComment(issueKey: string, comment: string): Promise<void> {
  await jiraRequest(`/issue/${issueKey}/comment`, "POST", {
    body: {
      type: "doc",
      version: 1,
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: comment }],
        },
      ],
    },
  });
}

// ─── Main Seeding Function ───────────────────────────────────────
async function main() {
  console.log("🚀 JIRA Bug Triage Demo - Seeding Script");
  console.log("=========================================\n");
  console.log(`📍 JIRA URL: ${JIRA_URL}`);
  console.log(`📋 Project Key: ${PROJECT_KEY}\n`);

  // Validate configuration
  if (!JIRA_URL || !JIRA_USERNAME || !JIRA_API_TOKEN) {
    console.error("❌ Missing JIRA configuration. Please set environment variables:");
    console.error("   JIRA_URL, JIRA_USERNAME, JIRA_API_TOKEN");
    console.error("   See .env.example for details.");
    process.exit(1);
  }

  // Load sample data
  const dataPath = join(__dirname, "sample-data.json");
  const sampleData = JSON.parse(readFileSync(dataPath, "utf-8"));

  // Ensure project exists
  const projectId = await ensureProject();

  // Get available issue types for this project
  const typeMap = await getProjectIssueTypes(PROJECT_KEY);
  const bugTypeId = typeMap["bug"] || typeMap["task"] || "10041";
  const taskTypeId = typeMap["task"] || "10041";
  const storyTypeId = typeMap["story"] || typeMap["task"] || "10041";

  console.log(`\n📝 Using Issue Types: Bug=${bugTypeId}, Task=${taskTypeId}, Story=${storyTypeId}\n`);

  // Create bugs (add "bug" label for identification)
  console.log("🐛 Creating bugs...\n");
  const createdBugs: string[] = [];

  for (const bug of sampleData.bugs) {
    try {
      const bugLabels = [...bug.labels, "bug"];
      const key = await createIssue(
        PROJECT_KEY,
        bugTypeId,
        bug.summary,
        bug.description,
        bug.priority,
        bugLabels
      );
      createdBugs.push(key);
      console.log(`   ✅ ${key}: ${bug.summary.substring(0, 60)}...`);
    } catch (err) {
      console.error(`   ❌ Failed to create bug: ${bug.summary.substring(0, 60)}...`);
    }
  }

  // Create tasks
  console.log("\n📋 Creating tasks...\n");
  for (const task of sampleData.tasks) {
    try {
      const key = await createIssue(
        PROJECT_KEY,
        taskTypeId,
        task.summary,
        task.description,
        task.priority,
        task.labels
      );
      console.log(`   ✅ ${key}: ${task.summary}`);
    } catch (err) {
      console.error(`   ❌ Failed to create task: ${task.summary}`);
    }
  }

  // Create stories
  console.log("\n📖 Creating stories...\n");
  for (const story of sampleData.stories) {
    try {
      const key = await createIssue(
        PROJECT_KEY,
        storyTypeId,
        story.summary,
        story.description,
        story.priority,
        story.labels
      );
      console.log(`   ✅ ${key}: ${story.summary.substring(0, 60)}...`);
    } catch (err) {
      console.error(`   ❌ Failed to create story: ${story.summary}`);
    }
  }

  // Transition some bugs to different states for realistic board
  console.log("\n🔄 Transitioning issues for realistic board state...\n");

  if (createdBugs.length >= 5) {
    // Move some to "In Progress"
    await transitionIssue(createdBugs[0], "In Progress");
    await transitionIssue(createdBugs[4], "In Progress");

    // Move some to "Done"
    await transitionIssue(createdBugs[2], "In Progress");
    await transitionIssue(createdBugs[2], "Done");

    // Add comments to some bugs
    await addComment(
      createdBugs[0],
      "Investigating - found the root cause in session cache invalidation logic."
    );
    await addComment(
      createdBugs[1],
      "Reproduced in staging environment. Memory profiling confirms the leak is in ConnectionPool."
    );
    await addComment(
      createdBugs[4],
      "URGENT: Security team has confirmed this is exploitable. Deploying hotfix."
    );
    await addComment(
      createdBugs[6],
      "Added distributed lock using Redis. Testing in staging before production deploy."
    );
  }

  // Summary
  console.log("\n=========================================");
  console.log("✅ Seeding complete!");
  console.log(`   📊 Bugs created: ${createdBugs.length}`);
  console.log(`   📋 Tasks created: ${sampleData.tasks.length}`);
  console.log(`   📖 Stories created: ${sampleData.stories.length}`);
  console.log(`\n🔗 View your board: ${JIRA_URL}/jira/software/projects/${PROJECT_KEY}/board`);
  console.log("=========================================\n");
}

main().catch((err) => {
  console.error("💥 Seeding failed:", err);
  process.exit(1);
});
