import { env } from "@tee-time/config";

export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogContext = Record<string, unknown>;

const levelOrder: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const redactEnabled = env.LOG_REDACT;
const minLevel = env.LOG_LEVEL as LogLevel;

const SENSITIVE_KEYS = new Set([
  "password",
  "secret",
  "token",
  "apikey",
  "api_key",
  "authorization",
  "cookie",
  "credential",
  "connectionstring",
  "database_url",
]);

const SENSITIVE_PATTERNS = [
  /Bearer\s+[a-zA-Z0-9._\-\/]+/gi,
  /sk-[a-zA-Z0-9]{20,}/g, // Generic secret key pattern
  /\b(?:\d[ -]*?){13,16}\b/g, // Credit card-like numbers
];

const redactString = (value: string) => {
  // Don't redact valid UUIDs or ISO dates (avoids false positives with phone regex)
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    ) ||
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)
  ) {
    return value;
  }

  let result = value;
  // Emails
  result = result.replace(
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
    "[redacted-email]",
  );
  // Phone numbers (very loose) - skip if it looks like a date YYYY-MM-DD
  result = result.replace(/(\+?\d[\d\s().-]{7,}\d)/g, (match) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(match)) return match;
    return "[redacted-phone]";
  });
  // Names (capitalized words, 2-3 parts) - common pattern for full names
  // We use a slightly more restrictive pattern to avoid redacting everything Title Case
  result = result.replace(
    /\b([A-Z][a-z]+\s[A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\b/g,
    (match) => {
      // Don't redact common non-name words
      const nonNames = [
        "Demo User",
        "Unknown",
        "Pending",
        "Confirmed",
        "Cancelled",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
        "Royal Oak",
        "Club House",
        "Tee Time",
        "Bay",
        "Course",
      ];
      if (nonNames.includes(match)) return match;
      return "[redacted-name]";
    },
  );

  // Lat/lng coordinates
  result = result.replace(
    /\b-?\d{1,3}\.\d{3,}\s*,\s*-?\d{1,3}\.\d{3,}\b/g,
    "[redacted-coordinates]",
  );

  // Sensitive patterns (Bearer tokens, generic keys)
  for (const pattern of SENSITIVE_PATTERNS) {
    result = result.replace(pattern, "[redacted-sensitive]");
  }

  return result;
};

const redactValue = (value: unknown, key?: string): unknown => {
  if (!redactEnabled) return value;

  // 1. Key-based redaction
  if (key && SENSITIVE_KEYS.has(key.toLowerCase())) {
    return "[redacted-key]";
  }

  // 2. Value-based redaction
  if (typeof value === "string") return redactString(value);
  if (Array.isArray(value)) return value.map((v) => redactValue(v));
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    return Object.fromEntries(entries.map(([k, v]) => [k, redactValue(v, k)]));
  }
  return value;
};

const emit = (level: LogLevel, message: string, context?: LogContext) => {
  if (levelOrder[level] < levelOrder[minLevel]) return;
  const payload = {
    level,
    message: redactEnabled ? redactString(message) : message,
    ...(context ? { context: redactValue(context) } : {}),
    timestamp: new Date().toISOString(),
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
  debug: (message: string, context?: LogContext) =>
    emit("debug", message, context),
  info: (message: string, context?: LogContext) =>
    emit("info", message, context),
  warn: (message: string, context?: LogContext) =>
    emit("warn", message, context),
  error: (message: string, context?: LogContext) =>
    emit("error", message, context),
};
