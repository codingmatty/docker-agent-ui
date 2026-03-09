import { useRef, useEffect, useState } from "react";
import type { Session, Message } from "./types";
import { MessageBody } from "./MessageBody";

interface ChatViewProps {
  session: Session | null;
  messages: Message[];
  streamingContent: string;
  isStreaming: boolean;
  onSendMessage: (content: string) => void;
  onNewSession: () => void;
}

export function ChatView({
  session,
  messages,
  streamingContent,
  isStreaming,
  onSendMessage,
  onNewSession,
}: ChatViewProps) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isStreaming) return;
    if (text === "/new") {
      onNewSession();
      setInput("");
      return;
    }
    onSendMessage(text);
    setInput("");
  };

  // No session selected
  if (!session) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-5 p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded border border-primary/20 bg-primary/5 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-primary/40"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9"
              />
            </svg>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-base-content/25">
            No session selected
          </p>
        </div>
        <button
          type="button"
          className="font-mono text-[10px] uppercase tracking-[0.22em] px-5 py-2.5 border border-primary/30 text-primary/60 hover:text-primary hover:border-primary hover:bg-primary/5 transition-all rounded-sm"
          onClick={onNewSession}
        >
          + New session
        </button>
      </div>
    );
  }

  const withContent = messages.filter((m) => (m.content ?? "").trim() !== "");
  const displayMessages =
    streamingContent || isStreaming
      ? [
          ...withContent,
          { role: "assistant" as const, content: streamingContent },
        ]
      : withContent;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* ── Message list ───────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-7">
          {/* Empty state */}
          {displayMessages.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-20 text-center">
              <div className="w-8 h-8 rounded border border-primary/15 bg-primary/5 flex items-center justify-center mb-2">
                <svg
                  className="w-4 h-4 text-primary/35"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-base-content/20">
                Session ready
              </p>
              <p className="font-mono text-[10px] text-base-content/15 mt-1">
                type /new to start a fresh session
              </p>
            </div>
          )}

          {/* Messages */}
          {displayMessages.map((msg, i) => {
            const isEmpty = (msg.content ?? "").trim() === "";
            const isLastStreaming =
              isStreaming && i === displayMessages.length - 1;
            if (isEmpty && !isLastStreaming) return null;

            const isUser = msg.role === "user";

            return (
              <div
                key={i}
                className={`flex gap-3 msg-appear ${isUser ? "flex-row-reverse" : "flex-row"}`}
              >
                {/* Role badge */}
                <div
                  className={`shrink-0 w-6 h-6 rounded border flex items-center justify-center font-mono text-[9px] font-bold mt-0.5 select-none ${
                    isUser
                      ? "border-accent/30 bg-accent/10 text-accent"
                      : "border-primary/20 bg-primary/8 text-primary/65"
                  }`}
                >
                  {isUser ? "Y" : "A"}
                </div>

                {/* Content */}
                <div
                  className={`flex-1 min-w-0 max-w-[85%] flex flex-col ${isUser ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`text-[9px] font-mono uppercase tracking-[0.22em] mb-1.5 ${
                      isUser ? "text-accent/35" : "text-primary/35"
                    }`}
                  >
                    {isUser ? "you" : "agent"}
                  </div>

                  {isUser ? (
                    <div className="bg-base-300/50 border border-base-300 px-4 py-2.5 rounded-sm text-sm text-base-content/90 chat-message max-w-full">
                      <MessageBody
                        content={msg.content ?? ""}
                        thoughts={msg.thoughts}
                        isAssistant={false}
                        isStreaming={false}
                      />
                    </div>
                  ) : (
                    <div
                      className={`border-l-2 pl-3 py-0.5 text-sm text-base-content/80 chat-message w-full transition-colors ${
                        isLastStreaming
                          ? "border-primary/50"
                          : "border-base-300"
                      }`}
                    >
                      <MessageBody
                        content={msg.content ?? ""}
                        thoughts={msg.thoughts}
                        isAssistant={true}
                        isStreaming={isLastStreaming}
                      />
                      {isLastStreaming && <span className="streaming-cursor" />}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Input area ─────────────────────────────────────── */}
      <div className="px-4 py-3 border-t border-base-300 bg-base-200/40 shrink-0">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="agent-input-wrap flex items-center border border-base-300 rounded-sm bg-base-300/30">
            <span className="pl-3 text-primary/40 font-mono text-sm select-none shrink-0 leading-none">
              ›
            </span>
            <input
              ref={inputRef}
              type="text"
              className="flex-1 bg-transparent py-3 px-2.5 text-sm outline-none font-mono text-base-content/85 placeholder:text-base-content/20"
              placeholder="send a message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isStreaming}
            />
            {isStreaming ? (
              <div className="px-4 flex items-center gap-1 shrink-0">
                <span className="w-1 h-1 rounded-full bg-primary/50 animate-bounce [animation-delay:0ms]" />
                <span className="w-1 h-1 rounded-full bg-primary/50 animate-bounce [animation-delay:150ms]" />
                <span className="w-1 h-1 rounded-full bg-primary/50 animate-bounce [animation-delay:300ms]" />
              </div>
            ) : (
              <button
                type="submit"
                className="px-4 py-3 font-mono text-[9px] uppercase tracking-[0.22em] text-base-content/25 hover:text-primary/70 transition-colors shrink-0 disabled:opacity-0 disabled:cursor-not-allowed border-l border-base-300"
                disabled={!input.trim()}
              >
                send
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
