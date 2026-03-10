/**
 * Webhook Server - HTTP endpoint for receiving real-time alerts
 *
 * Listens for incoming webhook payloads from monitoring services
 * (PagerDuty, Datadog, custom) and automatically triggers JIRA
 * bug triage analysis.
 */

import express from "express";
import { loadConfig } from "../config.js";
import { analyzeAndTriage, type AnalysisInput } from "../analyzer.js";
import { parsePagerDutyAlert, parseDatadogAlert } from "./alert-ingester.js";

const app = express();
app.use(express.json());

const config = loadConfig();
const PORT = config.webhook.port || 3000;

// Store recent analyses for the dashboard
const recentAnalyses: Array<{
  timestamp: string;
  input: AnalysisInput;
  result: any;
}> = [];

// ─── Health Check ────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// ─── Dashboard - View Recent Analyses ────────────────────────────
app.get("/dashboard", (_req, res) => {
  res.json({
    totalAnalyzed: recentAnalyses.length,
    recent: recentAnalyses.slice(-20).reverse(),
  });
});

// ─── Generic Alert Webhook ───────────────────────────────────────
app.post("/webhook/alert", async (req, res) => {
  console.log("📨 Received alert webhook");

  try {
    const input: AnalysisInput = {
      source: req.body.source || "webhook",
      title: req.body.title || req.body.summary || "Unknown Alert",
      description: req.body.description || req.body.body || "",
      severity: req.body.severity || req.body.priority || "medium",
      metadata: req.body.metadata || {},
    };

    console.log(`🔍 Analyzing: ${input.title}`);
    const result = await analyzeAndTriage(input);

    recentAnalyses.push({
      timestamp: new Date().toISOString(),
      input,
      result,
    });

    console.log(
      `✅ Result: ${result.action} ${result.issueKey || ""} (confidence: ${result.confidence}%)`
    );

    res.json({
      status: "processed",
      action: result.action,
      issueKey: result.issueKey,
      confidence: result.confidence,
      reasoning: result.reasoning,
    });
  } catch (error) {
    console.error("❌ Webhook processing failed:", error);
    res.status(500).json({
      status: "error",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// ─── PagerDuty Webhook ───────────────────────────────────────────
app.post("/webhook/pagerduty", async (req, res) => {
  console.log("📨 Received PagerDuty webhook");

  try {
    const input = parsePagerDutyAlert(req.body);

    console.log(`🔍 Analyzing PagerDuty alert: ${input.title}`);
    const result = await analyzeAndTriage(input);

    recentAnalyses.push({
      timestamp: new Date().toISOString(),
      input,
      result,
    });

    res.json({
      status: "processed",
      action: result.action,
      issueKey: result.issueKey,
    });
  } catch (error) {
    console.error("❌ PagerDuty webhook failed:", error);
    res.status(500).json({ status: "error" });
  }
});

// ─── Datadog Webhook ─────────────────────────────────────────────
app.post("/webhook/datadog", async (req, res) => {
  console.log("📨 Received Datadog webhook");

  try {
    const input = parseDatadogAlert(req.body);

    console.log(`🔍 Analyzing Datadog alert: ${input.title}`);
    const result = await analyzeAndTriage(input);

    recentAnalyses.push({
      timestamp: new Date().toISOString(),
      input,
      result,
    });

    res.json({
      status: "processed",
      action: result.action,
      issueKey: result.issueKey,
    });
  } catch (error) {
    console.error("❌ Datadog webhook failed:", error);
    res.status(500).json({ status: "error" });
  }
});

// ─── Start Server ────────────────────────────────────────────────
if (process.argv[1]?.includes("webhook-server")) {
  app.listen(PORT, () => {
    console.log(`\n🚀 Webhook server running on http://localhost:${PORT}`);
    console.log(`\n📡 Endpoints:`);
    console.log(`   POST /webhook/alert      - Generic alert webhook`);
    console.log(`   POST /webhook/pagerduty  - PagerDuty webhook`);
    console.log(`   POST /webhook/datadog    - Datadog webhook`);
    console.log(`   GET  /dashboard          - View recent analyses`);
    console.log(`   GET  /health             - Health check\n`);
  });
}

export { app };
