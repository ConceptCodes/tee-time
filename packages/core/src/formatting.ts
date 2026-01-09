/**
 * Formatting utilities for booking workflows
 */

export const formatTimeLabel = (value?: string): string | null => {
  if (!value) return null;
  const [hourPart, minutePart] = value.split(":");
  const hour = Number(hourPart);
  const minute = Number(minutePart ?? "0");
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return value;
  }
  const meridiem = hour >= 12 ? "pm" : "am";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  const minuteLabel = minute === 0 ? "" : `:${minutePart?.padStart(2, "0")}`;
  return `${displayHour}${minuteLabel}${meridiem}`;
};

export const formatTimeRangeLabel = <T extends { preferredTime?: string; preferredTimeEnd?: string }>(
  state: T
): string | null => {
  const start = formatTimeLabel(state.preferredTime);
  const end = formatTimeLabel(state.preferredTimeEnd ?? undefined);
  if (start && end) return `${start}-${end}`;
  return start;
};

export const formatDateLabel = (value?: string): string | null => {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    const parsed = new Date(year, month - 1, day);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      });
    }
  }
  return value;
};

export const formatBookingSummary = <T extends {
  club?: string;
  clubLocation?: string;
  bayLabel?: string;
  preferredDate?: string;
  preferredTime?: string;
  preferredTimeEnd?: string;
  players?: number;
  guestNames?: string;
  notes?: string;
}>(state: T): string => {
  const dateLabel = formatDateLabel(state.preferredDate) ?? "-";
  const timeLabel = formatTimeRangeLabel(state) ?? (state.preferredTime ?? "-");
  const lines = [
    `⛳ Club: ${state.club ?? "-"} ${state.clubLocation ? `(${state.clubLocation})` : ""}`,
    state.bayLabel ? `🎯 Bay: ${state.bayLabel}` : null,
    `📅 Date: ${dateLabel}`,
    `🕒 Time: ${timeLabel ?? "-"}`,
    `👥 Players: ${state.players ?? "-"}`,
  ];

  if (state.players && state.players > 1 && state.guestNames && state.guestNames !== "None") {
    lines.push(`👤 Guests: ${state.guestNames}`);
  }

  if (state.notes && state.notes !== "None") {
    lines.push(`📝 Notes: ${state.notes}`);
  }

  const validLines = lines.filter((l): l is string => Boolean(l));
  return `Please confirm these booking details:\n\n${validLines.join("\n")}`;
};

export const formatCancelSummary = <T extends {
  bookingId?: string;
  bookingReference?: string;
  club?: string;
  clubLocation?: string;
  preferredDate?: string;
  preferredTime?: string;
}>(state: T): string => {
  const parts = [
    state.bookingId ? `🆔 Booking ID: ${state.bookingId}` : null,
    state.bookingReference ? `🎫 Reference: ${state.bookingReference}` : null,
    state.club ? `⛳ Club: ${state.club}` : null,
    state.clubLocation ? `📍 Location: ${state.clubLocation}` : null,
    state.preferredDate ? `📅 Date: ${state.preferredDate}` : null,
    state.preferredTime ? `🕒 Time: ${state.preferredTime}` : null,
  ].filter(Boolean);

  return parts.length
    ? `Cancel the booking with:\n${parts.join("\n")}`
    : "Cancel this booking?";
};

export const formatModifySummary = <T extends {
  bookingId?: string;
  bookingReference?: string;
  club?: string;
  clubLocation?: string;
  preferredDate?: string;
  preferredTime?: string;
  players?: number;
  guestNames?: string;
  notes?: string;
}>(state: T): string => {
  const parts = [
    state.bookingId ? `🆔 Booking ID: ${state.bookingId}` : null,
    state.bookingReference ? `🎫 Reference: ${state.bookingReference}` : null,
    state.club ? `⛳ Club: ${state.club}` : null,
    state.clubLocation ? `📍 Location: ${state.clubLocation}` : null,
    state.preferredDate ? `📅 Date: ${state.preferredDate}` : null,
    state.preferredTime ? `🕒 Time: ${state.preferredTime}` : null,
    state.players ? `👥 Players: ${state.players}` : null,
    state.guestNames ? `👤 Guests: ${state.guestNames}` : null,
    state.notes ? `📝 Notes: ${state.notes}` : null,
  ].filter(Boolean);

  return parts.length
    ? `Update the booking with:\n${parts.join("\n")}`
    : "Update this booking with the changes you provided?";
};
