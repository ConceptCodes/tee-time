export type ParsedTimeWindow = {
  start: string;
  end?: string | null;
};

const pad = (value: number) => String(value).padStart(2, "0");

// Use UTC methods because parseDateParts creates dates using Date.UTC()
// This prevents timezone conversion issues (e.g., UTC midnight Dec 29 becoming Dec 28 in CST)
const toIsoDate = (date: Date) =>
  `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;

const parseDateParts = (year: number, month: number, day: number) => {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
};

const parseWeekday = (value: string) => {
  const days = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday"
  ];
  const index = days.indexOf(value);
  return index === -1 ? null : index;
};

const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const parsePreferredDate = (value?: string, now = new Date()) => {
  const input = value?.trim().toLowerCase();
  if (!input) {
    return null;
  }

  if (input === "today") {
    return toIsoDate(now);
  }
  if (input === "tomorrow") {
    return toIsoDate(addDays(now, 1));
  }
  if (input.startsWith("next ")) {
    const day = parseWeekday(input.replace("next ", "").trim());
    if (day !== null) {
      const current = now.getDay();
      const delta = (day - current + 7) % 7 || 7;
      return toIsoDate(addDays(now, delta));
    }
  }
  const weekday = parseWeekday(input);
  if (weekday !== null) {
    const current = now.getDay();
    const delta = (weekday - current + 7) % 7 || 7;
    return toIsoDate(addDays(now, delta));
  }

  const isoMatch = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const date = parseDateParts(
      Number(isoMatch[1]),
      Number(isoMatch[2]),
      Number(isoMatch[3])
    );
    return date ? toIsoDate(date) : null;
  }

  const usMatch = input.match(/^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{4}))?$/);
  if (usMatch) {
    const month = Number(usMatch[1]);
    const day = Number(usMatch[2]);
    let year = usMatch[3] ? Number(usMatch[3]) : now.getFullYear();
    let date = parseDateParts(year, month, day);
    if (!date) {
      return null;
    }
    if (!usMatch[3]) {
      const todayIso = toIsoDate(now);
      if (toIsoDate(date) < todayIso) {
        year += 1;
        date = parseDateParts(year, month, day);
      }
    }
    return date ? toIsoDate(date) : null;
  }

  const parsed = new Date(input);
  if (!Number.isNaN(parsed.getTime())) {
    const hasTime =
      /t/i.test(input) || /:\d{2}/.test(input) || /z$/i.test(input);
    return hasTime ? parsed.toISOString().slice(0, 10) : toIsoDate(parsed);
  }

  return null;
};

const parseTimeToken = (
  value: string,
  defaultMeridiem?: "am" | "pm"
) => {
  const cleaned = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
  if (!cleaned) {
    return null;
  }

  if (cleaned === "noon") {
    return { time: "12:00", meridiem: "pm" as const };
  }
  if (cleaned === "midnight") {
    return { time: "00:00", meridiem: "am" as const };
  }

  const match = cleaned.match(/^(\d{1,2})(?::(\d{2}))?(am|pm)?$/);
  if (!match) {
    return null;
  }
  let hour = Number(match[1]);
  const minute = match[2] ? Number(match[2]) : 0;
  let meridiem = match[3] as "am" | "pm" | undefined;

  if (!Number.isFinite(hour) || !Number.isFinite(minute) || minute > 59) {
    return null;
  }

  if (meridiem) {
    if (hour < 1 || hour > 12) {
      return null;
    }
    if (meridiem === "pm" && hour !== 12) {
      hour += 12;
    }
    if (meridiem === "am" && hour === 12) {
      hour = 0;
    }
  } else if (defaultMeridiem) {
    if (hour < 1 || hour > 12) {
      return null;
    }
    meridiem = defaultMeridiem;
    if (meridiem === "pm" && hour !== 12) {
      hour += 12;
    }
    if (meridiem === "am" && hour === 12) {
      hour = 0;
    }
  } else {
    if (hour < 0 || hour > 23) {
      return null;
    }
  }

  return { time: `${pad(hour)}:${pad(minute)}`, meridiem };
};

export const parsePreferredTimeWindow = (value?: string): ParsedTimeWindow | null => {
  const raw = value?.trim().toLowerCase();
  if (!raw) {
    return null;
  }

  let input = raw;
  const betweenMatch = input.match(/^between\s+(.+)\s+and\s+(.+)$/);
  if (betweenMatch) {
    input = `${betweenMatch[1]} - ${betweenMatch[2]}`;
  }

  const parts = input.split(/\s*(?:-|\u2013|to|until)\s*/);
  if (parts.length > 1) {
    const startRaw = parts[0];
    const endRaw = parts[1];
    const endParsed = parseTimeToken(endRaw);
    const startParsed = parseTimeToken(
      startRaw,
      endParsed?.meridiem
    );
    if (!startParsed || !endParsed) {
      return null;
    }
    return { start: startParsed.time, end: endParsed.time };
  }

  const parsed = parseTimeToken(input);
  if (!parsed) {
    return null;
  }
  return { start: parsed.time, end: null };
};

/**
 * Get the configurable max players limit from environment or default to 4.
 */
export const getMaxPlayers = (): number => {
  const envValue = process.env.BOOKING_MAX_PLAYERS;
  if (envValue) {
    const parsed = Number.parseInt(envValue, 10);
    if (Number.isFinite(parsed) && parsed >= 1) {
      return parsed;
    }
  }
  return 4;
};

export const normalizePlayers = (value?: number | string, maxPlayers?: number) => {
  if (value === undefined || value === null) {
    return null;
  }
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  const rounded = Math.floor(parsed);
  const max = maxPlayers ?? getMaxPlayers();
  if (rounded < 1 || rounded > max) {
    return null;
  }
  return rounded;
};
