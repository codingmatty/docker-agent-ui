import { useState } from 'react';
import type { StreamEvent } from './types';

interface ToolConfirmModalProps {
  event: StreamEvent;
  onConfirm: (approved: boolean, denial?: string) => void;
}

export function ToolConfirmModal({ event, onConfirm }: ToolConfirmModalProps) {
  const [denial, setDenial] = useState('');

  return (
    <dialog open className="modal modal-open">
      <div className="modal-box bg-base-200 border border-base-300 shadow-2xl rounded-sm max-w-2xl p-0 overflow-hidden">

        {/* ── Header ───────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-base-300">
          <div className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse shrink-0" />
          <h3 className="font-mono text-[10px] uppercase tracking-[0.22em] text-base-content/50">
            Tool call approval required
          </h3>
        </div>

        {/* ── Body ─────────────────────────────────────────── */}
        <div className="px-5 py-4 space-y-3">
          <p className="font-mono text-[10px] text-base-content/35 uppercase tracking-widest">
            Review the tool call below — approve or deny execution.
          </p>

          <pre className="bg-base-100 border border-base-300 px-4 py-3 rounded-sm text-[11px] font-mono text-base-content/60 leading-relaxed overflow-x-auto max-h-64 overflow-y-auto">
            {JSON.stringify(event, null, 2)}
          </pre>
        </div>

        {/* ── Actions ──────────────────────────────────────── */}
        <div className="flex items-center gap-2 px-5 py-4 border-t border-base-300 bg-base-300/20">
          <input
            type="text"
            placeholder="Reason for denial (optional)"
            className="flex-1 min-w-0 bg-base-300/40 border border-base-300 rounded-sm px-3 py-2 text-xs font-mono outline-none focus:border-error/40 text-base-content/65 placeholder:text-base-content/20 transition-colors"
            value={denial}
            onChange={(e) => setDenial(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !denial) onConfirm(true);
            }}
          />
          <button
            type="button"
            className="shrink-0 px-4 py-2 font-mono text-[9px] uppercase tracking-[0.22em] border border-error/35 text-error/65 hover:border-error/70 hover:text-error hover:bg-error/5 transition-all rounded-sm"
            onClick={() => onConfirm(false, denial || undefined)}
          >
            deny
          </button>
          <button
            type="button"
            className="shrink-0 px-4 py-2 font-mono text-[9px] uppercase tracking-[0.22em] border border-primary/35 text-primary/65 hover:border-primary/70 hover:text-primary hover:bg-primary/5 transition-all rounded-sm"
            onClick={() => onConfirm(true)}
          >
            approve
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop bg-black/70">
        <button type="button">close</button>
      </form>
    </dialog>
  );
}
