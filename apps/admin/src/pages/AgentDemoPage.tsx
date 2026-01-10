import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Bot } from "lucide-react";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import { ModelSelector } from "@/components/ai-elements/model-selector";
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { Card } from "@/components/ui/card";

export default function AgentDemoPage() {
  const agentApiUrl = import.meta.env.VITE_AGENT_API_URL;
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: `${agentApiUrl ?? "http://localhost:3000"}/chat`,
    }),
  });

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agent Demo</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Test the tee-time booking agent in real-time
          </p>
        </div>
        <ModelSelector />
      </div>

      {/* Chat Container */}
      <div className="flex-1 overflow-hidden px-6 py-4">
        <Card className="h-full flex flex-col overflow-hidden">
          <Conversation className="flex-1">
            {messages.length === 0 && (
              <ConversationEmptyState
                title="Start a conversation"
                description="Try asking to book a tee time or any questions about the golf club"
                icon={<Bot className="w-12 h-12" />}
              />
            )}

            <ConversationContent>
              {messages.map((message) => (
                  <Message key={message.id} from={message.role}>
                    <MessageContent>
                      {message.parts.map((part, index) => {
                        if (part.type === "text") {
                          return (
                            <MessageResponse key={index}>
                              {part.text}
                            </MessageResponse>
                          );
                        }
                        if (part.type === "tool-invocation") {
                          const toolInvocation = (part as any).toolInvocation;
                          return (
                            <Tool key={index}>
                              <ToolHeader
                                title={toolInvocation.toolName}
                                type="tool-invocation"
                                state={
                                  toolInvocation.state === "result"
                                    ? "output-available"
                                    : "input-available"
                                }
                              />
                              <ToolContent>
                                <ToolInput input={toolInvocation.args} />
                                <ToolOutput
                                  output={toolInvocation.result}
                                  errorText={undefined}
                                />
                              </ToolContent>
                            </Tool>
                          );
                        }
                        return null;
                      })}
                    </MessageContent>
                  </Message>
                ))}
            </ConversationContent>

            <ConversationScrollButton />
          </Conversation>

          {/* Input Area */}
          <div className="border-t p-4">
            <PromptInput
              onSubmit={(message) => {
                if (message.text.trim()) {
                  sendMessage({ text: message.text });
                }
              }}
            >
              <PromptInputTextarea
                placeholder="Type your message..."
                disabled={status !== "ready"}
              />
              <PromptInputSubmit status={status} />
            </PromptInput>
          </div>
        </Card>
      </div>
    </div>
  );
}
