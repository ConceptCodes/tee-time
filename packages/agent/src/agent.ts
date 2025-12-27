import { ToolLoopAgent } from "ai";
import { getOpenRouterClient, resolveModelId } from "./provider";

export const DEFAULT_AGENT_INSTRUCTIONS =
  "You are the Syndicate Tee Booker agent. Be concise, accurate, and ask clarifying questions when needed.";

export type AgentOptions = {
  model?: string;
  instructions?: string;
};

export const createSyndicateAgent = (options: AgentOptions = {}) => {
  const openrouter = getOpenRouterClient();
  const modelId = resolveModelId(options.model);
  return new ToolLoopAgent({
    model: openrouter.chat(modelId),
    instructions: options.instructions ?? DEFAULT_AGENT_INSTRUCTIONS,
  });
};
