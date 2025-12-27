import { createOpenRouter } from "@openrouter/ai-sdk-provider";

export const DEFAULT_MODEL = "anthropic/claude-3.5-sonnet";

let openrouterClient: ReturnType<typeof createOpenRouter> | null = null;

export const getOpenRouterClient = () => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is required to create the agent.");
  }
  if (!openrouterClient) {
    openrouterClient = createOpenRouter({ apiKey });
  }
  return openrouterClient;
};

export const resolveModelId = (override?: string) =>
  override ?? process.env.OPENROUTER_MODEL_ID ?? DEFAULT_MODEL;
