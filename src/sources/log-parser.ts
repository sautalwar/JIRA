/**
 * Log Parser - Parses application error logs into structured alerts
 *
 * Supports common log formats:
 * - JSON structured logs
 * - Standard log format: [TIMESTAMP] [LEVEL] [SERVICE] message
 * - Stack traces (Java, Node.js, Python)
 */

import { AnalysisInput } from "../analyzer.js";
import { readFileSync } from "fs";

interface ParsedLogEntry {
  timestamp?: string;
  level: string;
  service?: string;
  message: string;
  stackTrace?: string;
}

/**
 * Parse a log file and extract error entries as analysis inputs
 */
export function parseLogFile(filePath: string): AnalysisInput[] {
  const content = readFileSync(filePath, "utf-8");
  return parseLogContent(content);
}

/**
 * Parse log content string and extract error entries
 */
export function parseLogContent(content: string): AnalysisInput[] {
  const lines = content.split("\n");
  const entries: ParsedLogEntry[] = [];
  let currentEntry: ParsedLogEntry | null = null;

  for (const line of lines) {
    // Try JSON structured log
    const jsonEntry = tryParseJsonLog(line);
    if (jsonEntry) {
      if (currentEntry) entries.push(currentEntry);
      currentEntry = jsonEntry;
      continue;
    }

    // Try standard log format: [2024-03-01 12:00:00] [ERROR] [auth-service] message
    const stdMatch = line.match(
      /\[(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}[^\]]*)\]\s*\[(ERROR|FATAL|WARN|CRITICAL)\]\s*\[([^\]]+)\]\s*(.*)/i
    );
    if (stdMatch) {
      if (currentEntry) entries.push(currentEntry);
      currentEntry = {
        timestamp: stdMatch[1],
        level: stdMatch[2].toUpperCase(),
        service: stdMatch[3],
        message: stdMatch[4],
      };
      continue;
    }

    // Stack trace continuation (indented line or "at ..." or "Caused by:")
    if (
      currentEntry &&
      (line.match(/^\s+(at |\.\.\.|\w+\.\w+)/) ||
        line.match(/^Caused by:/) ||
        line.match(/^\s+File "/))
    ) {
      currentEntry.stackTrace = (currentEntry.stackTrace || "") + "\n" + line;
      continue;
    }

    // Non-matching line with current entry - finalize
    if (currentEntry && line.trim() === "") {
      entries.push(currentEntry);
      currentEntry = null;
    }
  }

  if (currentEntry) entries.push(currentEntry);

  // Convert to AnalysisInput, filtering for errors only
  return entries
    .filter((e) => ["ERROR", "FATAL", "CRITICAL"].includes(e.level))
    .map((entry) => ({
      source: "error-log",
      title: truncate(entry.message, 120),
      description: buildLogDescription(entry),
      severity: mapLogLevel(entry.level),
      metadata: {
        ...(entry.timestamp && { timestamp: entry.timestamp }),
        ...(entry.service && { service: entry.service }),
        logLevel: entry.level,
      },
    }));
}

function tryParseJsonLog(line: string): ParsedLogEntry | null {
  try {
    const obj = JSON.parse(line.trim());
    if (obj.level && obj.message) {
      return {
        timestamp: obj.timestamp || obj.time || obj["@timestamp"],
        level: (obj.level || obj.severity || "INFO").toUpperCase(),
        service: obj.service || obj.logger || obj.source,
        message: obj.message || obj.msg,
        stackTrace: obj.stackTrace || obj.stack || obj.exception,
      };
    }
  } catch {
    // Not JSON
  }
  return null;
}

function buildLogDescription(entry: ParsedLogEntry): string {
  let desc = `**Error from application logs**\n\n`;
  desc += `**Message:** ${entry.message}\n`;
  if (entry.service) desc += `**Service:** ${entry.service}\n`;
  if (entry.timestamp) desc += `**Timestamp:** ${entry.timestamp}\n`;
  desc += `**Log Level:** ${entry.level}\n`;
  if (entry.stackTrace) {
    desc += `\n**Stack Trace:**\n\`\`\`\n${entry.stackTrace.trim()}\n\`\`\``;
  }
  return desc;
}

function mapLogLevel(level: string): AnalysisInput["severity"] {
  switch (level) {
    case "FATAL":
    case "CRITICAL":
      return "critical";
    case "ERROR":
      return "high";
    case "WARN":
      return "medium";
    default:
      return "low";
  }
}

function truncate(str: string, maxLen: number): string {
  return str.length > maxLen ? str.substring(0, maxLen - 3) + "..." : str;
}
