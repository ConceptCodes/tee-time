import { logger } from "../logger";

type SlackUser = {
  id: string;
  name: string;
  profile?: {
    display_name?: string;
    display_name_normalized?: string;
  };
};

type SlackApiResponse<T> = {
  ok: boolean;
  error?: string;
  [key: string]: unknown;
} & T;

const getSlackToken = () => {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) {
    throw new Error("SLACK_BOT_TOKEN is required to send Slack notifications.");
  }
  return token;
};

const slackFetch = async <T>(
  method: string,
  body?: Record<string, unknown>
): Promise<SlackApiResponse<T>> => {
  const token = getSlackToken();
  const response = await fetch(`https://slack.com/api/${method}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await response.json()) as SlackApiResponse<T>;
  if (!json.ok) {
    throw new Error(json.error ?? "slack_api_error");
  }
  return json;
};

const normalize = (value: string) => value.trim().toLowerCase();

let cachedUsers: SlackUser[] | null = null;

const loadSlackUsers = async (): Promise<SlackUser[]> => {
  if (cachedUsers) {
    return cachedUsers;
  }
  const result = await slackFetch<{ members: SlackUser[] }>("users.list", {
    limit: 200,
  });
  cachedUsers = result.members ?? [];
  return cachedUsers;
};

export const resolveSlackUserIds = async (usernames: string[]) => {
  const users = await loadSlackUsers();
  return usernames
    .map((username) => {
      const normalized = normalize(username);
      return users.find((user) => {
        if (normalize(user.name) === normalized) {
          return true;
        }
        const display = user.profile?.display_name ?? "";
        const displayNormalized =
          user.profile?.display_name_normalized ?? display;
        return normalize(displayNormalized) === normalized;
      });
    })
    .filter(Boolean)
    .map((user) => (user as SlackUser).id);
};

export const postSlackMessage = async (params: {
  channel: string;
  text: string;
}) => {
  const result = await slackFetch("chat.postMessage", {
    channel: params.channel,
    text: params.text,
  });
  logger.info("core.slack.messageSent", {
    channel: params.channel,
  });
  return result;
};

export const postSlackDm = async (params: {
  userId: string;
  text: string;
}) => {
  const convo = await slackFetch<{ channel: { id: string } }>(
    "conversations.open",
    {
      users: params.userId,
    }
  );
  const channelId = convo.channel?.id;
  if (!channelId) {
    throw new Error("slack_dm_channel_missing");
  }
  return postSlackMessage({ channel: channelId, text: params.text });
};

const notifySlackTargets = async (payload: {
  text: string;
  channel?: string;
  usernames?: string[];
}) => {
  const updatesChannel = payload.channel;
  if (updatesChannel) {
    await postSlackMessage({
      channel: updatesChannel,
      text: payload.text,
    });
  }

  if (payload.usernames?.length) {
    const userIds = await resolveSlackUserIds(payload.usernames);
    await Promise.all(
      userIds.map((userId) => postSlackDm({ userId, text: payload.text }))
    );
  }
};

export const notifySupport = async (payload: {
  text: string;
  channel?: string;
  usernames?: string[];
}) => notifySlackTargets(payload);

const parseUsernames = (value?: string) =>
  value
    ? value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

export const notifyBooking = async (payload: { text: string }) => {
  const updatesChannel = process.env.BOOKING_SLACK_UPDATES_CHANNEL;
  const usernames = parseUsernames(process.env.BOOKING_SLACK_USERNAMES);
  if (!updatesChannel && usernames.length === 0) {
    return;
  }
  await notifySlackTargets({
    text: payload.text,
    channel: updatesChannel,
    usernames,
  });
};
