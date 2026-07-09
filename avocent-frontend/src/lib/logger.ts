import fs from "node:fs/promises";
import path from "node:path";

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  ts: string;
  level: LogLevel;
  message: string;
  data?: unknown;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function dateParts(d: Date) {
  return {
    year: String(d.getFullYear()),
    month: pad(d.getMonth() + 1),
    day: pad(d.getDate()),
  };
}

const logRoot = process.env.LOG_DIR ?? path.join(process.cwd(), "logs");

async function writeLog(level: LogLevel, message: string, data?: unknown): Promise<void> {
  const now = new Date();
  const { year, month, day } = dateParts(now);

  const dir = path.join(logRoot, year, month, day);
  const file = path.join(dir, `${year}_${month}_${day}.logger`);

  const entry: LogEntry = {
    ts: now.toISOString(),
    level,
    message,
    ...(data !== undefined && { data: sanitize(data) }),
  };

  try {
    await fs.mkdir(dir, { recursive: true });
    await fs.appendFile(file, JSON.stringify(entry) + "\n", "utf-8");
  } catch (err) {
    // Never let log failures crash the request path
    console.error("[logger] Failed to write log entry:", err);
  }
}

function sanitize(data: unknown): unknown {
  if (data === null || typeof data !== "object") return data;
  const obj = data as Record<string, unknown>;
  const safe: Record<string, unknown> = {};
  const blocked = new Set(["password", "token", "access", "refresh", "secret", "authorization"]);
  for (const [k, v] of Object.entries(obj)) {
    safe[k] = blocked.has(k.toLowerCase()) ? "[REDACTED]" : v;
  }
  return safe;
}

export const logger = {
  debug: (message: string, data?: unknown) => writeLog("debug", message, data),
  info: (message: string, data?: unknown) => writeLog("info", message, data),
  warn: (message: string, data?: unknown) => writeLog("warn", message, data),
  error: (message: string, data?: unknown) => writeLog("error", message, data),
};
