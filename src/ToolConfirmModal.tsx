import { useState, useMemo } from "react";
import type { StreamEvent } from "./types";
import type { ResumeConfirmation } from "./api";

interface ToolConfirmModalProps {
  event: StreamEvent;
  latestMessage?: string;
  onConfirm: (
    confirmation: ResumeConfirmation,
    reason?: string,
    toolName?: string,
  ) => void;
}

function extractShellCommand(event: StreamEvent): string | null {
  const ev = event as Record<string, unknown>;
  const toolCall = ev.tool_call as Record<string, unknown> | undefined;
  const fn = toolCall?.function as Record<string, unknown> | undefined;
  if (fn?.name !== "shell") return null;
  try {
    const args = JSON.parse(fn.arguments as string);
    return typeof args.cmd === "string" ? args.cmd : null;
  } catch {
    return null;
  }
}

export function ToolConfirmModal({
  event,
  latestMessage,
  onConfirm,
}: ToolConfirmModalProps) {
  const [reason, setReason] = useState("");
  const cmd = useMemo(() => extractShellCommand(event), [event]);

  return (
    <dialog open className="modal modal-open">
      <div className="modal-box bg-base-200 border border-base-300 shadow-2xl rounded-sm max-w-2xl p-0 overflow-hidden">
        {/* ── Header ───────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-base-300">
          <div className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse shrink-0" />
          <h3 className="font-mono text-[10px] uppercase tracking-[0.22em] text-base-content/75">
            Tool call approval required
          </h3>
        </div>

        {/* ── Body ─────────────────────────────────────────── */}
        <div className="px-5 py-4 space-y-3">
          {latestMessage && (
            <p className="text-sm text-base-content/75 leading-relaxed border-l-2 border-base-300 pl-3">
              {latestMessage}
            </p>
          )}
          <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-base-content/45">
            command
          </p>
          <pre className="bg-base-100 border border-base-300 px-4 py-3 rounded-sm text-[11px] font-mono text-base-content/80 leading-relaxed overflow-x-auto whitespace-pre-wrap break-all max-h-64 overflow-y-auto">
            {cmd ?? JSON.stringify(event, null, 2)}
          </pre>

          <input
            type="text"
            placeholder="Rejection reason (optional)"
            className="w-full bg-base-300/40 border border-base-300 rounded-sm px-3 py-2 text-xs font-mono outline-none focus:border-error/40 text-base-content/80 placeholder:text-base-content/40 transition-colors"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        {/* ── Actions ──────────────────────────────────────── */}
        <div className="flex items-center gap-2 px-5 py-4 border-t border-base-300 bg-base-300/20 flex-wrap">
          <button
            type="button"
            className="px-4 py-2 font-mono text-[9px] uppercase tracking-[0.22em] border border-error/55 text-error/85 hover:border-error hover:text-error hover:bg-error/5 transition-all rounded-sm"
            onClick={() => onConfirm("reject", reason || undefined)}
          >
            reject
          </button>
          <div className="flex-1" />
          <button
            type="button"
            className="px-4 py-2 font-mono text-[9px] uppercase tracking-[0.22em] border border-base-300 text-base-content/65 hover:border-base-content/50 hover:text-base-content/90 hover:bg-base-300/40 transition-all rounded-sm"
            onClick={() => onConfirm("approve")}
          >
            approve once
          </button>
          {/* <button
            type="button"
            className="px-4 py-2 font-mono text-[9px] uppercase tracking-[0.22em] border border-base-300 text-base-content/40 hover:border-base-content/30 hover:text-base-content/70 hover:bg-base-300/40 transition-all rounded-sm"
            onClick={() => onConfirm('approve-tool', undefined, toolName)}
            title={toolName ? `Always allow: ${toolName}` : 'Always allow this tool'}
          >
            approve tool
          </button> */}
          <button
            type="button"
            className="px-4 py-2 font-mono text-[9px] uppercase tracking-[0.22em] border border-primary/55 text-primary/85 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all rounded-sm"
            onClick={() => onConfirm("approve-session")}
          >
            approve session
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop bg-black/70">
        <button type="button">close</button>
      </form>
    </dialog>
  );
}
