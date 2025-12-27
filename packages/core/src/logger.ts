export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogContext = Record<string, unknown>;

const levelOrder: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

const parseLevel = (value?: string | null): LogLevel => {
  const normalized = (value ?? "").toLowerCase();
  if (normalized === "debug") return "debug";
  if (normalized === "info") return "info";
  if (normalized === "warn") return "warn";
  if (normalized === "error") return "error";
  return "info";
};

const redactEnabled = (process.env.LOG_REDACT ?? "true").toLowerCase() !== "false";
const minLevel = parseLevel(process.env.LOG_LEVEL);

const redactString = (value: string) => {
  let result = value;
  // Emails
  result = result.replace(
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
    "[redacted-email]"
  );
  // Phone numbers (very loose)
  result = result.replace(/(\+?\d[\d\s().-]{7,}\d)/g, "[redacted-phone]");
  // Lat/lng coordinates
  result = result.replace(
    /\b-?\d{1,3}\.\d{3,}\s*,\s*-?\d{1,3}\.\d{3,}\b/g,
    "[redacted-coordinates]"
  );
  return result;
};

const redactValue = (value: unknown): unknown => {
  if (!redactEnabled) return value;
  if (typeof value === "string") return redactString(value);
  if (Array.isArray(value)) return value.map(redactValue);
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    return Object.fromEntries(entries.map(([key, val]) => [key, redactValue(val)]));
  }
  return value;
};

const emit = (level: LogLevel, message: string, context?: LogContext) => {
  if (levelOrder[level] < levelOrder[minLevel]) return;
  const payload = {
    level,
    message: redactEnabled ? redactString(message) : message,
    ...(context ? { context: redactValue(context) } : {}),
    timestamp: new Date().toISOString()
  };
  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
};

export const logger = {
  debug: (message: string, context?: LogContext) => emit("debug", message, context),
  info: (message: string, context?: LogContext) => emit("info", message, context),
  warn: (message: string, context?: LogContext) => emit("warn", message, context),
  error: (message: string, context?: LogContext) => emit("error", message, context)
};
