import type { Agent, Message, Session, SessionDetail, StreamEvent } from './types';

const API = '/api';

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  if (res.headers.get('content-type')?.includes('application/json')) {
    return res.json() as Promise<T>;
  }
  return undefined as T;
}

export async function getAgents(): Promise<Agent[]> {
  return request<Agent[]>(`/agents`);
}

export async function getSessions(): Promise<Session[]> {
  return request<Session[]>(`/sessions`);
}

export async function createSession(): Promise<Session> {
  return request<Session>(`/sessions`, { method: 'POST', body: '{}' });
}

export async function getSession(sessionId: string): Promise<SessionDetail> {
  return request<SessionDetail>(`/sessions/${sessionId}`);
}

export async function deleteSession(sessionId: string): Promise<void> {
  return request(`/sessions/${sessionId}`, { method: 'DELETE' });
}

export async function patchSessionTitle(
  sessionId: string,
  title: string
): Promise<void> {
  return request(`/sessions/${sessionId}/title`, {
    method: 'PATCH',
    body: JSON.stringify({ title }),
  });
}

export async function resumeSession(
  sessionId: string,
  body: { approved?: boolean; denial?: string; [key: string]: unknown }
): Promise<void> {
  return request(`/sessions/${sessionId}/resume`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function toggleYolo(sessionId: string): Promise<void> {
  return request(`/sessions/${sessionId}/tools/toggle`, { method: 'POST' });
}

export async function toggleThinking(sessionId: string): Promise<void> {
  return request(`/sessions/${sessionId}/thinking/toggle`, { method: 'POST' });
}

export async function runAgent(
  sessionId: string,
  agentName: string,
  messages: Message[],
  onEvent: (event: StreamEvent) => void
): Promise<void> {
  const res = await fetch(`${API}/sessions/${sessionId}/agent/${agentName}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(messages),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response body');
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6)) as StreamEvent;
          onEvent(data);
        } catch {
          // skip invalid JSON
        }
      }
    }
  }
  if (buffer.trim()) {
    if (buffer.startsWith('data: ')) {
      try {
        const data = JSON.parse(buffer.slice(6)) as StreamEvent;
        onEvent(data);
      } catch {
        // skip
      }
    }
  }
}
