import { useState, useCallback, useEffect } from 'react';
import type { Agent, Session, Message, StreamEvent } from './types';
import {
  getAgents,
  getSessions,
  createSession,
  getSession,
  deleteSession,
  patchSessionTitle,
  resumeSession,
  toggleYolo,
  runAgent,
} from './api';
import { SessionSidebar } from './SessionSidebar';
import { ChatView } from './ChatView';
import { ToolConfirmModal } from './ToolConfirmModal';

export default function App() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [sessionDetail, setSessionDetail] = useState<{ messages: Message[] } | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingToolConfirm, setPendingToolConfirm] = useState<StreamEvent | null>(null);
  const [yolo, setYolo] = useState(false);
  const [theme, setTheme] = useState(() => {
    if (typeof document !== 'undefined' && document.documentElement) {
      return document.documentElement.getAttribute('data-theme') || 'dark';
    }
    return 'dark';
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAgents = useCallback(async () => {
    try {
      const list = await getAgents();
      setAgents(list);
      if (list.length && !selectedAgent) setSelectedAgent(list[0].name);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load agents');
    }
  }, [selectedAgent]);

  const loadSessions = useCallback(async () => {
    try {
      const list = await getSessions();
      setSessions(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load sessions');
    }
  }, []);

  const loadSessionDetail = useCallback(async (sessionId: string) => {
    try {
      const detail = await getSession(sessionId);
      setSessionDetail({ messages: detail.messages ?? [] });
    } catch (e) {
      setSessionDetail(null);
      setError(e instanceof Error ? e.message : 'Failed to load session');
    }
  }, []);

  useEffect(() => {
    loadAgents();
    loadSessions();
  }, [loadAgents, loadSessions]);

  useEffect(() => {
    if (currentSession?.id) loadSessionDetail(currentSession.id);
    else setSessionDetail(null);
  }, [currentSession?.id, loadSessionDetail]);

  const handleNewSession = useCallback(async () => {
    try {
      const session = await createSession();
      setSessions((prev) => [session, ...prev]);
      setCurrentSession(session);
      setSessionDetail({ messages: [] });
      setStreamingContent('');
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create session');
    }
  }, []);

  const handleSelectSession = useCallback((session: Session) => {
    setCurrentSession(session);
    setPendingToolConfirm(null);
    setStreamingContent('');
  }, []);

  const handleDeleteSession = useCallback(
    async (sessionId: string) => {
      try {
        await deleteSession(sessionId);
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        if (currentSession?.id === sessionId) {
          setCurrentSession(null);
          setSessionDetail(null);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to delete session');
      }
    },
    [currentSession?.id]
  );

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!currentSession?.id || !selectedAgent) return;
      const messages: Message[] = [
        ...(sessionDetail?.messages ?? []),
        { role: 'user', content },
      ];
      setStreamingContent('');
      setIsStreaming(true);
      setError(null);
      try {
        await runAgent(currentSession.id, selectedAgent, messages, (event: StreamEvent) => {
          switch (event.type) {
            case 'agent_choice':
              setStreamingContent((prev) => prev + (event.content ?? ''));
              break;
            case 'stream_stopped':
              setIsStreaming(false);
              loadSessionDetail(currentSession.id);
              loadSessions();
              break;
            case 'tool_call_confirmation':
              setPendingToolConfirm(event);
              break;
            case 'error':
              setIsStreaming(false);
              setError((event as { message?: string }).message ?? 'Agent error');
              break;
            default:
              break;
          }
        });
      } catch (e) {
        setIsStreaming(false);
        setError(e instanceof Error ? e.message : 'Request failed');
      }
    },
    [
      currentSession?.id,
      selectedAgent,
      sessionDetail?.messages,
      loadSessionDetail,
      loadSessions,
    ]
  );

  const handleToolConfirm = useCallback(
    async (approved: boolean, denial?: string) => {
      if (!currentSession?.id || !pendingToolConfirm) return;
      try {
        await resumeSession(currentSession.id, { approved, denial });
        setPendingToolConfirm(null);
        loadSessionDetail(currentSession.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Resume failed');
      }
    },
    [currentSession?.id, pendingToolConfirm, loadSessionDetail]
  );

  const handleToggleYolo = useCallback(async () => {
    if (!currentSession?.id) return;
    try {
      await toggleYolo(currentSession.id);
      setYolo((prev) => !prev);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Toggle failed');
    }
  }, [currentSession?.id]);

  const handleUpdateTitle = useCallback(
    async (sessionId: string, title: string) => {
      try {
        await patchSessionTitle(sessionId, title);
        setSessions((prev) =>
          prev.map((s) => (s.id === sessionId ? { ...s, title } : s))
        );
        if (currentSession?.id === sessionId) setCurrentSession((s) => (s ? { ...s, title } : null));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Update title failed');
      }
    },
    [currentSession?.id]
  );

  const themes = ['dark', 'light', 'nord', 'dracula', 'business', 'cupcake'];

  return (
    <div className="drawer lg:drawer-open">
      <input
        id="sidebar-drawer"
        type="checkbox"
        className="drawer-toggle"
        checked={sidebarOpen}
        onChange={(e) => setSidebarOpen(e.target.checked)}
      />
      <div className="drawer-content flex flex-col min-h-screen">
        <header className="navbar bg-base-200/80 sticky top-0 z-10 border-b border-base-300">
          <div className="navbar-start">
            <label htmlFor="sidebar-drawer" className="btn btn-ghost btn-square drawer-button lg:hidden">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </label>
            <span className="font-semibold text-lg px-2">Docker Agent</span>
          </div>
          <div className="navbar-center hidden md:flex gap-2">
            <select
              className="select select-bordered select-sm max-w-xs"
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
            >
              {agents.map((a) => (
                <option key={a.name} value={a.name}>
                  {a.name}
                  {a.description ? ` — ${a.description}` : ''}
                </option>
              ))}
            </select>
            <div className="dropdown dropdown-end">
              <label tabIndex={0} className="btn btn-ghost btn-sm">
                Theme
              </label>
              <ul tabIndex={0} className="dropdown-content menu bg-base-200 rounded-box z-20 p-2 shadow-lg w-40">
                {themes.map((t) => (
                  <li key={t}>
                    <button
                      type="button"
                      onClick={() => {
                        document.documentElement.setAttribute('data-theme', t);
                        setTheme(t);
                      }}
                    >
                      {t}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            {currentSession && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={handleToggleYolo}>
                {yolo ? 'YOLO on' : 'YOLO off'}
              </button>
            )}
          </div>
          <div className="navbar-end" />
        </header>

        {error && (
          <div className="alert alert-error rounded-none flex justify-between">
            <span>{error}</span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setError(null)}>
              Dismiss
            </button>
          </div>
        )}

        <main className="flex-1 flex flex-col min-h-0">
          <ChatView
            session={currentSession}
            messages={sessionDetail?.messages ?? []}
            streamingContent={streamingContent}
            isStreaming={isStreaming}
            onSendMessage={handleSendMessage}
            onNewSession={handleNewSession}
          />
        </main>
      </div>

      <SessionSidebar
        sessions={sessions}
        currentSession={currentSession}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
        onUpdateTitle={handleUpdateTitle}
        onClose={() => setSidebarOpen(false)}
      />

      {pendingToolConfirm && (
        <ToolConfirmModal
          event={pendingToolConfirm}
          onConfirm={(approved, denial) => handleToolConfirm(approved, denial)}
        />
      )}
    </div>
  );
}
