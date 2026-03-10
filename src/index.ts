/**
 * JIRA Bug Triage Demo - CLI Interface
 *
 * Interactive command-line tool for demonstrating intelligent bug triage
 * using GitHub Copilot SDK + JIRA MCP Server.
 */

import { Command } from "commander";
import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import { loadConfig, validateConfig } from "./config.js";
import { analyzeAndTriage, batchAnalyze, disconnectSession, type AnalysisInput } from "./analyzer.js";
import { parseLogFile } from "./sources/log-parser.js";
import { loadAlertsFromFile } from "./sources/alert-ingester.js";
import { app } from "./sources/webhook-server.js";

const program = new Command();

program
  .name("jira-triage")
  .description("Intelligent JIRA bug triage using GitHub Copilot SDK + MCP")
  .version("1.0.0");

// ─── Analyze Command ─────────────────────────────────────────────
program
  .command("analyze")
  .description("Analyze an alert or error and triage against JIRA")
  .option("-f, --file <path>", "Path to alerts JSON or error log file")
  .option("-t, --title <title>", "Alert title (for manual input)")
  .option("-d, --description <desc>", "Alert description (for manual input)")
  .option("-s, --severity <level>", "Severity: critical, high, medium, low", "medium")
  .option("--source <source>", "Alert source name", "manual")
  .action(async (options) => {
    const config = loadConfig();
    const errors = validateConfig(config);
    if (errors.length > 0) {
      console.error(chalk.red("\n❌ Configuration errors:"));
      errors.forEach((e) => console.error(chalk.red(`   • ${e}`)));
      console.error(chalk.yellow("\n   Run: cp .env.example .env && edit .env\n"));
      process.exit(1);
    }

    // From file
    if (options.file) {
      const spinner = ora("Loading alerts from file...").start();
      let inputs: AnalysisInput[];

      if (options.file.endsWith(".log") || options.file.endsWith(".txt")) {
        inputs = parseLogFile(options.file);
        spinner.succeed(`Parsed ${inputs.length} error(s) from log file`);
      } else {
        inputs = loadAlertsFromFile(options.file);
        spinner.succeed(`Loaded ${inputs.length} alert(s) from JSON file`);
      }

      if (inputs.length === 0) {
        console.log(chalk.yellow("No errors/alerts found in file."));
        return;
      }

      console.log(chalk.cyan(`\n🔍 Analyzing ${inputs.length} alert(s) against JIRA...\n`));
      const results = await batchAnalyze(inputs);

      printSummary(results);
      return;
    }

    // Manual input
    if (options.title) {
      const input: AnalysisInput = {
        source: options.source,
        title: options.title,
        description: options.description || options.title,
        severity: options.severity,
      };

      console.log(chalk.cyan(`\n🔍 Analyzing: ${input.title}\n`));
      const spinner = ora("Searching JIRA for matching issues...").start();
      const result = await analyzeAndTriage(input);
      spinner.stop();

      printResult(result);
      return;
    }

    // Interactive mode
    console.log(chalk.bold.cyan("\n🐛 JIRA Bug Triage - Interactive Mode\n"));
    await interactiveMode();
  });

// ─── Demo Command ────────────────────────────────────────────────
program
  .command("demo")
  .description("Run an interactive demo walkthrough")
  .action(async () => {
    console.log(chalk.bold.cyan("\n" + "=".repeat(60)));
    console.log(chalk.bold.cyan("  🎯 JIRA Bug Triage Demo with GitHub Copilot SDK"));
    console.log(chalk.bold.cyan("=".repeat(60) + "\n"));

    console.log(chalk.white("This demo shows how GitHub Copilot SDK + JIRA MCP Server"));
    console.log(chalk.white("can intelligently triage incoming alerts against existing"));
    console.log(chalk.white("JIRA issues.\n"));

    const config = loadConfig();
    const errors = validateConfig(config);
    if (errors.length > 0) {
      console.error(chalk.red("❌ Please configure your .env file first."));
      console.error(chalk.yellow("   See README.md for setup instructions.\n"));
      process.exit(1);
    }

    console.log(chalk.green("✅ Configuration validated\n"));
    console.log(chalk.dim(`   JIRA: ${config.jira.url}`));
    console.log(chalk.dim(`   Project: ${config.jira.projectKey}\n`));

    // Demo scenarios
    const scenarios: AnalysisInput[] = [
      {
        source: "PagerDuty",
        title: "NullPointerException in authentication service during login",
        description:
          "Alert triggered: Users reporting login failures. Stack trace shows NullPointerException in UserAuthenticationService.authenticate() when session cache returns null. ~150 users affected in the last hour.",
        severity: "critical",
        metadata: {
          service: "auth-service",
          environment: "production",
          alertId: "PD-2024-1234",
        },
      },
      {
        source: "Datadog",
        title: "High memory usage on notification-service pods",
        description:
          "Memory usage on notification-service pods has exceeded 85% threshold and is climbing steadily. Current usage: 3.2GB. Rate of increase: ~100MB/hour. No recent deployments.",
        severity: "high",
        metadata: {
          service: "notification-service",
          environment: "production",
          metric: "container.memory.usage",
        },
      },
      {
        source: "Sentry",
        title: "TypeError in dashboard chart rendering on Safari",
        description:
          "New error cluster detected: TypeError: Cannot read properties of undefined (reading 'transform') in chart-renderer.js:245. Affecting Safari 17.x users. Error count: 342 in last 24h.",
        severity: "medium",
        metadata: {
          service: "frontend",
          browser: "Safari 17.2",
          errorCount: "342",
        },
      },
      {
        source: "CloudWatch",
        title: "Lambda function timeout in payment processing",
        description:
          "Payment processing Lambda function timing out after 30s. CloudWatch shows increased cold start times. Concurrent executions spiked to 500. Some customers reporting failed payments.",
        severity: "critical",
        metadata: {
          service: "payment-lambda",
          environment: "production",
          region: "us-east-1",
        },
      },
    ];

    for (let i = 0; i < scenarios.length; i++) {
      const scenario = scenarios[i];
      console.log(chalk.bold.yellow(`\n━━━ Scenario ${i + 1}/${scenarios.length} ━━━\n`));
      console.log(chalk.white(`  📡 Source:   ${scenario.source}`));
      console.log(chalk.white(`  📋 Title:    ${scenario.title}`));
      console.log(chalk.white(`  ⚡ Severity: ${scenario.severity}\n`));

      const { proceed } = await inquirer.prompt([
        {
          type: "confirm",
          name: "proceed",
          message: "Analyze this alert against JIRA?",
          default: true,
        },
      ]);

      if (!proceed) continue;

      console.log("  ⏳ Copilot SDK analyzing via JIRA MCP... (takes ~60s)");
      const result = await analyzeAndTriage(scenario);

      printResult(result);

      if (i < scenarios.length - 1) {
        const { next } = await inquirer.prompt([
          {
            type: "confirm",
            name: "next",
            message: "Continue to next scenario?",
            default: true,
          },
        ]);
        if (!next) break;
      }
    }

    console.log(chalk.bold.green("\n✅ Demo complete!\n"));
    await disconnectSession();
  });

// ─── Webhook Command ─────────────────────────────────────────────
program
  .command("webhook")
  .description("Start the webhook server for real-time alert processing")
  .option("-p, --port <port>", "Port to listen on", "3000")
  .action(async (options) => {
    const port = parseInt(options.port, 10);
    app.listen(port, () => {
      console.log(chalk.bold.cyan("\n🚀 Webhook Server Started\n"));
      console.log(chalk.white(`   Listening on: http://localhost:${port}\n`));
      console.log(chalk.white("   Endpoints:"));
      console.log(chalk.dim("   POST /webhook/alert      Generic alert"));
      console.log(chalk.dim("   POST /webhook/pagerduty  PagerDuty webhook"));
      console.log(chalk.dim("   POST /webhook/datadog    Datadog webhook"));
      console.log(chalk.dim("   GET  /dashboard          Recent analyses"));
      console.log(chalk.dim("   GET  /health             Health check\n"));
      console.log(chalk.yellow("   Ctrl+C to stop\n"));
    });
  });

// ─── Interactive Mode ────────────────────────────────────────────
async function interactiveMode() {
  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "title",
      message: "Alert title:",
      validate: (input: string) => input.length > 0 || "Title is required",
    },
    {
      type: "editor",
      name: "description",
      message: "Alert description (opens editor):",
    },
    {
      type: "list",
      name: "severity",
      message: "Severity:",
      choices: ["critical", "high", "medium", "low"],
      default: "medium",
    },
    {
      type: "input",
      name: "source",
      message: "Source system:",
      default: "manual",
    },
  ]);

  const input: AnalysisInput = {
    source: answers.source,
    title: answers.title,
    description: answers.description || answers.title,
    severity: answers.severity,
  };

  const spinner = ora("Analyzing with Copilot SDK + JIRA MCP...").start();
  const result = await analyzeAndTriage(input);
  spinner.stop();

  printResult(result);
}

// ─── Output Formatting ──────────────────────────────────────────
function printResult(result: any) {
  console.log("");

  if (result.action === "existing") {
    console.log(chalk.green("  🔗 EXISTING ISSUE FOUND"));
    console.log(chalk.green(`     Issue: ${result.issueKey}`));
    console.log(chalk.green(`     Confidence: ${result.confidence}%`));
    console.log(chalk.dim(`     ${result.reasoning}`));
  } else if (result.action === "created") {
    console.log(chalk.blue("  🆕 NEW BUG CREATED"));
    console.log(chalk.blue(`     Issue: ${result.issueKey}`));
    console.log(chalk.dim(`     ${result.reasoning}`));
  } else {
    console.log(chalk.red("  ❌ ANALYSIS ERROR"));
    console.log(chalk.red(`     ${result.reasoning}`));
  }

  if (result.rawResponse) {
    console.log(chalk.dim("\n  ─── Full Analysis ───"));
    console.log(chalk.dim("  " + result.rawResponse.substring(0, 500)));
  }

  console.log("");
}

function printSummary(results: any[]) {
  const existing = results.filter((r) => r.action === "existing").length;
  const created = results.filter((r) => r.action === "created").length;
  const errors = results.filter((r) => r.action === "error").length;

  console.log(chalk.bold.cyan("\n━━━ Summary ━━━\n"));
  console.log(chalk.white(`  Total analyzed: ${results.length}`));
  console.log(chalk.green(`  🔗 Existing issues found: ${existing}`));
  console.log(chalk.blue(`  🆕 New bugs created: ${created}`));
  if (errors > 0) console.log(chalk.red(`  ❌ Errors: ${errors}`));
  console.log("");
}

// ─── Run CLI ─────────────────────────────────────────────────────
program.parse();
