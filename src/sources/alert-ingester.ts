/**
 * Alert Ingester - Parses monitoring alerts from various sources
 *
 * Supports alert formats from:
 * - PagerDuty
 * - Datadog
 * - Generic monitoring (Prometheus/Grafana style)
 * - Custom JSON alerts
 */

import { AnalysisInput } from "../analyzer.js";
import { readFileSync } from "fs";

export interface MonitoringAlert {
  id?: string;
  source: string;
  title: string;
  description: string;
  severity: string;
  service?: string;
  environment?: string;
  tags?: Record<string, string>;
  timestamp?: string;
  url?: string;
  metrics?: Record<string, number>;
}

/**
 * Load alerts from a JSON file
 */
export function loadAlertsFromFile(filePath: string): AnalysisInput[] {
  const content = readFileSync(filePath, "utf-8");
  const data = JSON.parse(content);

  // Handle array of alerts or single alert
  const alerts: MonitoringAlert[] = Array.isArray(data)
    ? data
    : data.alerts || [data];

  return alerts.map(normalizeAlert);
}

/**
 * Parse a PagerDuty webhook payload
 */
export function parsePagerDutyAlert(payload: any): AnalysisInput {
  const incident = payload.event?.data || payload.incident || payload;

  return normalizeAlert({
    id: incident.id,
    source: "PagerDuty",
    title: incident.title || incident.summary || "PagerDuty Alert",
    description: incident.description || incident.summary || "",
    severity: mapPagerDutySeverity(incident.urgency || incident.severity),
    service: incident.service?.name || incident.service?.summary,
    tags: {
      pagerduty_id: incident.id,
      escalation_policy: incident.escalation_policy?.summary || "",
    },
    timestamp: incident.created_at || incident.created_on,
    url: incident.html_url || incident.self,
  });
}

/**
 * Parse a Datadog webhook payload
 */
export function parseDatadogAlert(payload: any): AnalysisInput {
  return normalizeAlert({
    id: payload.id || payload.alert_id,
    source: "Datadog",
    title: payload.title || payload.msg_title || "Datadog Alert",
    description: payload.body || payload.msg || payload.text || "",
    severity: mapDatadogSeverity(payload.alert_type || payload.priority),
    service: payload.tags?.find((t: string) => t.startsWith("service:"))?.split(":")[1],
    environment: payload.tags?.find((t: string) => t.startsWith("env:"))?.split(":")[1],
    tags: Object.fromEntries(
      (payload.tags || []).map((t: string) => {
        const [k, ...v] = t.split(":");
        return [k, v.join(":")];
      })
    ),
    timestamp: payload.date || payload.last_updated,
    url: payload.link || payload.event_url,
    metrics: payload.snapshot ? { value: payload.snapshot.metric_value } : undefined,
  });
}

/**
 * Normalize any alert format into AnalysisInput
 */
function normalizeAlert(alert: MonitoringAlert): AnalysisInput {
  let description = alert.description;

  // Enrich description with metadata
  if (alert.service) description += `\n\n**Service:** ${alert.service}`;
  if (alert.environment) description += `\n**Environment:** ${alert.environment}`;
  if (alert.url) description += `\n**Alert URL:** ${alert.url}`;
  if (alert.metrics) {
    description += `\n**Metrics:**\n${Object.entries(alert.metrics)
      .map(([k, v]) => `- ${k}: ${v}`)
      .join("\n")}`;
  }
  if (alert.tags && Object.keys(alert.tags).length > 0) {
    description += `\n**Tags:** ${Object.entries(alert.tags)
      .map(([k, v]) => `${k}=${v}`)
      .join(", ")}`;
  }

  return {
    source: alert.source,
    title: alert.title,
    description,
    severity: mapGenericSeverity(alert.severity),
    metadata: {
      ...(alert.id && { alertId: alert.id }),
      ...(alert.service && { service: alert.service }),
      ...(alert.environment && { environment: alert.environment }),
      ...(alert.timestamp && { timestamp: alert.timestamp }),
      ...(alert.url && { alertUrl: alert.url }),
    },
  };
}

function mapPagerDutySeverity(urgency: string): string {
  switch (urgency?.toLowerCase()) {
    case "high": return "critical";
    case "low": return "medium";
    default: return urgency || "medium";
  }
}

function mapDatadogSeverity(alertType: string): string {
  switch (alertType?.toLowerCase()) {
    case "error": return "critical";
    case "warning": return "high";
    case "info": return "medium";
    case "success": return "low";
    default: return alertType || "medium";
  }
}

function mapGenericSeverity(severity: string): AnalysisInput["severity"] {
  switch (severity?.toLowerCase()) {
    case "critical":
    case "p1":
    case "emergency":
      return "critical";
    case "high":
    case "p2":
    case "error":
      return "high";
    case "medium":
    case "p3":
    case "warning":
      return "medium";
    case "low":
    case "p4":
    case "info":
      return "low";
    default:
      return "medium";
  }
}
