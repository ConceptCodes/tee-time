export type StatusFollowupInput = {
  status: "Confirmed" | "Not Available" | "Follow-up required";
  memberName?: string;
  preferredDate?: string;
  preferredTime?: string;
  alternateTimes?: string[];
};

export type StatusFollowupDecision = {
  type: "message";
  message: string;
};

const formatDateTime = (input: StatusFollowupInput) => {
  if (!input.preferredDate && !input.preferredTime) {
    return "your requested time";
  }
  if (input.preferredDate && input.preferredTime) {
    return `${input.preferredDate} at ${input.preferredTime}`;
  }
  return input.preferredDate ?? input.preferredTime ?? "your requested time";
};

export const runStatusFollowup = (
  input: StatusFollowupInput
): StatusFollowupDecision => {
  const name = input.memberName ? ` ${input.memberName}` : "";
  const when = formatDateTime(input);

  if (input.status === "Confirmed") {
    return {
      type: "message",
      message: `Great news${name}! Your booking for ${when} is confirmed.`,
    };
  }

  if (input.status === "Not Available") {
    if (input.alternateTimes?.length) {
      return {
        type: "message",
        message:
          `Sorry${name}, we couldn't secure ${when}. ` +
          `Would any of these times work instead: ${input.alternateTimes.join(
            ", "
          )}?`,
      };
    }
    return {
      type: "message",
      message:
        `Sorry${name}, we couldn't secure ${when}. ` +
        "Can you share another time window that works?",
    };
  }

  return {
    type: "message",
    message:
      `Thanks${name}! We need a little more info to confirm ${when}. ` +
      "Reply with any changes or extra details you want us to include.",
  };
};
