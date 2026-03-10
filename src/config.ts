import dotenv from "dotenv";
dotenv.config();

export interface AppConfig {
  jira: {
    url: string;
    username: string;
    apiToken: string;
    projectKey: string;
  };
  github: {
    token: string;
  };
  webhook: {
    port: number;
    secret: string;
  };
}

export function loadConfig(): AppConfig {
  return {
    jira: {
      url: process.env.JIRA_URL || "",
      username: process.env.JIRA_USERNAME || "",
      apiToken: process.env.JIRA_API_TOKEN || "",
      projectKey: process.env.JIRA_PROJECT_KEY || "DEMO",
    },
    github: {
      token: process.env.GITHUB_TOKEN || "",
    },
    webhook: {
      port: parseInt(process.env.WEBHOOK_PORT || "3000", 10),
      secret: process.env.WEBHOOK_SECRET || "",
    },
  };
}

export function validateConfig(config: AppConfig): string[] {
  const errors: string[] = [];

  if (!config.jira.url) errors.push("JIRA_URL is required");
  if (!config.jira.username) errors.push("JIRA_USERNAME is required");
  if (!config.jira.apiToken) errors.push("JIRA_API_TOKEN is required");

  return errors;
}
