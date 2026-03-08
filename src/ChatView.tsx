import { useRef, useEffect, useState } from 'react';
import type { Session, Message } from './types';

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
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isStreaming) return;
    // TUI-like slash commands
    if (text === '/new') {
      onNewSession();
      setInput('');
      return;
    }
    onSendMessage(text);
    setInput('');
  };

  if (!session) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
        <p className="text-base-content/70">No session selected.</p>
        <button type="button" className="btn btn-primary" onClick={onNewSession}>
          Start a new conversation
        </button>
      </div>
    );
  }

  const displayMessages = [...messages];
  if (streamingContent) {
    displayMessages.push({ role: 'assistant', content: streamingContent });
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {displayMessages.length === 0 && (
            <div className="text-center text-base-content/60 py-8">
              Send a message to start. Use the agent selector and theme in the header.
            </div>
          )}
          {displayMessages.map((msg, i) => (
            <div
              key={i}
              className={`chat ${msg.role === 'user' ? 'chat-end' : 'chat-start'}`}
            >
              <div className="chat-header opacity-70 text-sm mb-1">
                {msg.role === 'user' ? 'You' : 'Agent'}
              </div>
              <div
                className={`chat-bubble chat-message ${
                  msg.role === 'user'
                    ? 'chat-bubble-primary'
                    : 'chat-bubble-secondary'
                } ${i === displayMessages.length - 1 && isStreaming ? 'animate-pulse' : ''}`}
              >
                {msg.role === 'assistant' ? (
                  <div className="whitespace-pre-wrap break-words prose prose-sm max-w-none dark:prose-invert">
                    {msg.content}
                  </div>
                ) : (
                  <span className="whitespace-pre-wrap break-words">{msg.content}</span>
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="p-4 border-t border-base-300 bg-base-200/50">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto flex gap-2">
          <input
            type="text"
            className="input input-bordered flex-1"
            placeholder="Message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isStreaming}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isStreaming || !input.trim()}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
