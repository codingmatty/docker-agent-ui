import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const THOUGHT_RE = /<(?:think|reasoning|thought|thinking)>([\s\S]*?)<\/(?:think|reasoning|thought|thinking)>/gi;

function splitThoughts(content: string): { thoughts: string[]; main: string } {
  const thoughts: string[] = [];
  let match: RegExpExecArray | null;
  const mainParts: string[] = [];
  let lastEnd = 0;
  while ((match = THOUGHT_RE.exec(content)) !== null) {
    mainParts.push(content.slice(lastEnd, match.index));
    thoughts.push(match[1].trim());
    lastEnd = match.index + match[0].length;
  }
  mainParts.push(content.slice(lastEnd));
  const main = mainParts.join('').trim();
  return { thoughts, main };
}

interface MessageBodyProps {
  content: string;
  thoughts?: string[];
  isAssistant?: boolean;
  isStreaming?: boolean;
}

export function MessageBody({
  content,
  thoughts: thoughtsFromApi,
  isAssistant = false,
  isStreaming = false,
}: MessageBodyProps) {
  const [thoughtsExpanded, setThoughtsExpanded] = useState(false);
  const { thoughts: thoughtsFromContent, main } = splitThoughts(content ?? '');
  const thoughts = thoughtsFromApi?.length ? thoughtsFromApi : thoughtsFromContent;

  const hasThoughts = thoughts.length > 0;
  const showMain = main.length > 0 || (isStreaming && !hasThoughts);

  return (
    <div className="whitespace-pre-wrap break-words">
      {hasThoughts && (
        <div className="mb-2.5">
          <button
            type="button"
            className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-base-content/55 hover:text-base-content/80 transition-colors"
            onClick={() => setThoughtsExpanded((e) => !e)}
            aria-expanded={thoughtsExpanded}
          >
            <span className={`transition-transform duration-150 ${thoughtsExpanded ? 'rotate-90' : ''}`}>▶</span>
            <span>thoughts{thoughts.length > 1 ? ` (${thoughts.length})` : ''}</span>
          </button>
          {thoughtsExpanded && (
            <div className="mt-2 pl-3 border-l border-base-300 space-y-2">
              {thoughts.map((t, i) => (
                <div key={i} className="prose prose-sm max-w-none dark:prose-invert opacity-50 text-sm">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{t}</ReactMarkdown>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {showMain && (
        <div className="prose prose-sm max-w-none dark:prose-invert">
          {isAssistant ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{main || '\u200b'}</ReactMarkdown>
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{main}</ReactMarkdown>
          )}
        </div>
      )}
    </div>
  );
}
