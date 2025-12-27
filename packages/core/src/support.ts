import {
  createSupportRequestRepository,
  type Database,
} from "@tee-time/database";
import { logger } from "./logger";
import { notifySupport } from "./notifications/slack";

export type SupportRequestInput = {
  memberId: string;
  message: string;
};

const parseUsernames = (value?: string) =>
  value
    ? value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

export const createSupportRequest = async (
  db: Database,
  input: SupportRequestInput
) => {
  const repo = createSupportRequestRepository(db);
  const request = await repo.create({
    memberId: input.memberId,
    message: input.message,
    status: "open",
    createdAt: new Date(),
  });

  logger.info("core.supportRequest.created", {
    supportRequestId: request.id,
    memberId: input.memberId,
  });

  const updatesChannel = process.env.SUPPORT_SLACK_UPDATES_CHANNEL;
  const usernames = parseUsernames(process.env.SUPPORT_SLACK_USERNAMES);
  const notificationText = `New support request from member ${input.memberId}:\n${input.message}`;

  if (updatesChannel || usernames.length) {
    await notifySupport({
      text: notificationText,
      channel: updatesChannel,
      usernames,
    });
  }

  return request;
};
