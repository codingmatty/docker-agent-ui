import { useState, useCallback, useEffect } from "react";
import type { Agent, Session, Message, StreamEvent } from "./types";
import type { ResumeConfirmation } from "./api";
import {
  getAgents,
  getSessions,
  createSession,
  getSession,
  sessionResponseToMessages,
  deleteSession,
  patchSessionTitle,
  resumeSession,
  toggleYolo,
  runAgent,
} from "./api";
import { SessionSidebar } from "./SessionSidebar";
import { ChatView } from "./ChatView";
import { ToolConfirmModal } from "./ToolConfirmModal";

const themes = [
  "void",
  "dark",
  "light",
  "nord",
  "dracula",
  "business",
  "cupcake",
];

export default function App() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [sessionDetail, setSessionDetail] = useState<{
    messages: Message[];
  } | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingToolConfirm, setPendingToolConfirm] =
    useState<StreamEvent | null>(null);
  const [yolo, setYolo] = useState(false);
  const [theme, setTheme] = useState(() => {
    if (typeof document !== "undefined" && document.documentElement) {
      return document.documentElement.getAttribute("data-theme") || "void";
    }
    return "void";
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAgents = useCallback(async () => {
    try {
      const list = await getAgents();
      setAgents(list);
      if (list.length && !selectedAgent) setSelectedAgent(list[0].name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load agents");
    }
  }, [selectedAgent]);

  const loadSessions = useCallback(async () => {
    try {
      const list = await getSessions();
      setSessions(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load sessions");
    }
  }, []);

  const loadSessionDetail = useCallback(async (sessionId: string) => {
    try {
      const detail = await getSession(sessionId);
      const messages = sessionResponseToMessages(detail);
      setSessionDetail({ messages });
    } catch (e) {
      setSessionDetail(null);
      setError(e instanceof Error ? e.message : "Failed to load session");
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
      setStreamingContent("");
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create session");
    }
  }, []);

  const handleSelectSession = useCallback((session: Session) => {
    setCurrentSession(session);
    setPendingToolConfirm(null);
    setStreamingContent("");
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
        setError(e instanceof Error ? e.message : "Failed to delete session");
      }
    },
    [currentSession?.id],
  );

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!currentSession?.id || !selectedAgent) return;
      const messages: Message[] = [
        ...(sessionDetail?.messages ?? []),
        { role: "user", content },
      ];
      setStreamingContent("");
      setIsStreaming(true);
      setError(null);
      setSessionDetail((prev) => ({
        messages: [...(prev?.messages ?? []), { role: "user", content }],
      }));
      try {
        await runAgent(
          currentSession.id,
          selectedAgent,
          messages,
          (event: StreamEvent) => {
            switch (event.type) {
              case "agent_choice":
                setStreamingContent((prev) => prev + (event.content ?? ""));
                break;
              case "stream_stopped":
                setIsStreaming(false);
                setStreamingContent("");
                loadSessionDetail(currentSession.id);
                loadSessions();
                break;
              case "tool_call_confirmation":
                setPendingToolConfirm(event);
                break;
              case "error":
                setIsStreaming(false);
                setError(
                  (event as { message?: string }).message ?? "Agent error",
                );
                break;
              default:
                break;
            }
          },
        );
      } catch (e) {
        setIsStreaming(false);
        setError(e instanceof Error ? e.message : "Request failed");
      }
    },
    [
      currentSession?.id,
      selectedAgent,
      sessionDetail?.messages,
      loadSessionDetail,
      loadSessions,
    ],
  );

  const handleToolConfirm = useCallback(
    async (confirmation: ResumeConfirmation, reason?: string, toolName?: string) => {
      if (!currentSession?.id || !pendingToolConfirm) return;
      setPendingToolConfirm(null);
      try {
        await resumeSession(currentSession.id, {
          confirmation,
          ...(reason ? { reason } : {}),
          ...(toolName ? { tool_name: toolName } : {}),
        });
      } catch (e) {
        setIsStreaming(false);
        setError(e instanceof Error ? e.message : "Resume failed");
      }
    },
    [currentSession?.id, pendingToolConfirm],
  );

  const handleToggleYolo = useCallback(async () => {
    if (!currentSession?.id) return;
    try {
      await toggleYolo(currentSession.id);
      setYolo((prev) => !prev);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Toggle failed");
    }
  }, [currentSession?.id]);

  const handleUpdateTitle = useCallback(
    async (sessionId: string, title: string) => {
      try {
        await patchSessionTitle(sessionId, title);
        setSessions((prev) =>
          prev.map((s) => (s.id === sessionId ? { ...s, title } : s)),
        );
        if (currentSession?.id === sessionId)
          setCurrentSession((s) => (s ? { ...s, title } : null));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Update title failed");
      }
    },
    [currentSession?.id],
  );

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
        {/* ── Header ──────────────────────────────────────────── */}
        <header className="h-12 flex items-center px-4 gap-3 bg-base-200 border-b border-base-300 sticky top-0 z-10 shrink-0">
          {/* Mobile hamburger */}
          <label
            htmlFor="sidebar-drawer"
            className="drawer-button lg:hidden cursor-pointer p-1 text-base-content/65 hover:text-base-content/90 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </label>

          {/* Brand */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-7 h-7 rounded border border-primary/30 bg-primary/10 flex items-center justify-center">
              <svg
                className="w-3.5 h-3.5 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9"
                />
              </svg>
            </div>
            <span className="font-syne font-bold text-[13px] tracking-[0.18em] text-base-content uppercase">
              Docker Agent
            </span>
          </div>

          {/* Separator */}
          <div className="hidden md:block h-5 w-px bg-base-300 shrink-0 mx-0.5" />

          {/* Agent selector */}
          <div className="hidden md:flex items-center gap-2 flex-1 min-w-0">
            <span className="font-mono text-[9px] text-base-content/75 uppercase tracking-[0.22em] shrink-0">
              agent
            </span>
            <select
              className="bg-transparent border-none outline-none text-sm text-base-content/80 hover:text-base-content transition-colors cursor-pointer font-mono min-w-0 max-w-xs"
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
            >
              {agents.map((a) => (
                <option key={a.name} value={a.name}>
                  {a.name}
                  {a.description ? ` — ${a.description}` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Right controls */}
          <div className="ml-auto flex items-center gap-2 shrink-0">
            {/* YOLO toggle */}
            {currentSession && (
              <button
                type="button"
                onClick={handleToggleYolo}
                className={`font-mono text-[9px] uppercase tracking-[0.22em] px-2.5 py-1 rounded border transition-all ${
                  yolo
                    ? "border-warning/50 text-warning bg-warning/10"
                    : "border-base-300 text-base-content/60 hover:border-base-content/40 hover:text-base-content/85"
                }`}
              >
                yolo {yolo ? "on" : "off"}
              </button>
            )}

            {/* Theme picker */}
            <div className="dropdown dropdown-end">
              <label
                tabIndex={0}
                className="cursor-pointer p-1.5 rounded text-base-content/60 hover:text-base-content/90 transition-colors"
                title="Change theme"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 3v1m0 16v1M3 12h1m16 0h1m-2.636-7.364-.707.707M6.343 17.657l-.707.707m0-12.728.707.707m11.314 11.314.707.707M12 7a5 5 0 100 10 5 5 0 000-10z"
                  />
                </svg>
              </label>
              <ul
                tabIndex={0}
                className="dropdown-content bg-base-200 border border-base-300 rounded shadow-2xl z-20 p-1 w-32 mt-1"
              >
                {themes.map((t) => (
                  <li key={t}>
                    <button
                      type="button"
                      onClick={() => {
                        document.documentElement.setAttribute("data-theme", t);
                        setTheme(t);
                      }}
                      className={`w-full text-left px-3 py-1.5 rounded text-[11px] font-mono transition-colors ${
                        theme === t
                          ? "bg-primary/15 text-primary"
                          : "text-base-content/70 hover:text-base-content hover:bg-base-300"
                      }`}
                    >
                      {t}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </header>

        {/* ── Error banner ─────────────────────────────────────── */}
        {error && (
          <div className="flex items-center justify-between px-4 py-2 bg-error/8 border-b border-error/20 shrink-0">
            <span className="font-mono text-xs text-error/80">{error}</span>
            <button
              type="button"
              className="font-mono text-[10px] uppercase tracking-wider text-error/75 hover:text-error transition-colors ml-4"
              onClick={() => setError(null)}
            >
              dismiss
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
          onConfirm={(confirmation, reason, toolName) => handleToolConfirm(confirmation, reason, toolName)}
        />
      )}
    </div>
  );
}
