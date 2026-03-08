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
      <div className="bg-base-200 min-h-full w-72 flex flex-col border-r border-base-300">
        <div className="p-4 border-b border-base-300 flex items-center justify-between">
          <span className="font-semibold">Sessions</span>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => {
              onNewSession();
              onClose();
            }}
          >
            New
          </button>
        </div>
        <ul className="menu flex-1 overflow-y-auto p-2">
          {sessions.map((s) => (
            <li key={s.id}>
              {editingId === s.id ? (
                <div className="flex gap-1 items-center w-full">
                  <input
                    type="text"
                    className="input input-sm input-bordered flex-1"
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
                    className="btn btn-ghost btn-xs"
                    onClick={() => saveTitle(s.id)}
                  >
                    Save
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1 w-full group">
                  <button
                    type="button"
                    className={`flex-1 text-left ${currentSession?.id === s.id ? 'active' : ''}`}
                    onClick={() => {
                      onSelectSession(s);
                      onClose();
                    }}
                  >
                    {s.title || `Session ${s.id.slice(0, 8)}`}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs opacity-0 group-hover:opacity-100"
                    onClick={() => startEdit(s)}
                    aria-label="Edit title"
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs opacity-0 group-hover:opacity-100 text-error"
                    onClick={() => onDeleteSession(s.id)}
                    aria-label="Delete"
                  >
                    ×
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
