import { useState } from 'react';
import type { Session } from './types';

interface SessionSidebarProps {
  sessions: Session[];
  currentSession: Session | null;
  onSelectSession: (session: Session) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
  onUpdateTitle: (id: string, title: string) => void;
  onClose: () => void;
}

export function SessionSidebar({
  sessions,
  currentSession,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onUpdateTitle,
  onClose,
}: SessionSidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const startEdit = (s: Session) => {
    setEditingId(s.id);
    setEditTitle(s.title || '');
  };

  const saveTitle = (id: string) => {
    if (editTitle.trim()) onUpdateTitle(id, editTitle.trim());
    setEditingId(null);
  };

  return (
    <aside className="drawer-side z-30">
      <label htmlFor="sidebar-drawer" className="drawer-overlay" aria-label="Close sidebar" />
      <div className="bg-base-200 border-r border-base-300 min-h-full w-64 flex flex-col">

        {/* ── Sidebar header ───────────────────────────────── */}
        <div className="h-12 flex items-center justify-between px-4 border-b border-base-300 shrink-0">
          <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-base-content/25">
            sessions
          </span>
          <button
            type="button"
            className="w-6 h-6 rounded border border-base-300 flex items-center justify-center font-mono text-base-content/35 hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all text-base leading-none"
            onClick={() => {
              onNewSession();
              onClose();
            }}
            title="New session"
          >
            +
          </button>
        </div>

        {/* ── Session list ─────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto py-2">
          {sessions.length === 0 && (
            <p className="px-4 py-10 text-center font-mono text-[9px] uppercase tracking-[0.22em] text-base-content/20">
              No sessions yet
            </p>
          )}

          {sessions.map((s) => (
            <div key={s.id} className="px-2">
              {editingId === s.id ? (
                <div className="flex gap-1 items-center py-1.5 px-1">
                  <input
                    type="text"
                    className="flex-1 bg-base-300/60 border border-primary/40 rounded-sm px-2 py-1 text-xs font-mono outline-none text-base-content/85 placeholder:text-base-content/25"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveTitle(s.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="shrink-0 px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-primary/60 hover:text-primary transition-colors"
                    onClick={() => saveTitle(s.id)}
                  >
                    ok
                  </button>
                </div>
              ) : (
                <div
                  className={`group flex items-center gap-2 rounded-sm py-2 pl-3 pr-1 cursor-pointer transition-all border-l-2 ${
                    currentSession?.id === s.id
                      ? 'border-primary/60 bg-primary/8'
                      : 'border-transparent hover:bg-base-300/50'
                  }`}
                >
                  <button
                    type="button"
                    className="flex-1 text-left min-w-0"
                    onClick={() => {
                      onSelectSession(s);
                      onClose();
                    }}
                  >
                    <div className={`text-xs truncate transition-colors ${
                      currentSession?.id === s.id
                        ? 'text-base-content/90'
                        : 'text-base-content/50 group-hover:text-base-content/75'
                    }`}>
                      {s.title || `session_${s.id.slice(0, 8)}`}
                    </div>
                    <div className="font-mono text-[9px] text-base-content/18 mt-0.5 tracking-wider">
                      {s.id.slice(0, 12)}…
                    </div>
                  </button>

                  {/* Hover actions */}
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity shrink-0">
                    <button
                      type="button"
                      className="w-5 h-5 flex items-center justify-center rounded text-base-content/25 hover:text-base-content/60 transition-colors text-xs"
                      onClick={() => startEdit(s)}
                      aria-label="Edit title"
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      className="w-5 h-5 flex items-center justify-center rounded text-base-content/25 hover:text-error transition-colors text-base leading-none"
                      onClick={() => onDeleteSession(s.id)}
                      aria-label="Delete"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
