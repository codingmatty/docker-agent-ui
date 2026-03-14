import type { Agent, Message, Session, SessionDetail, SessionItem, StreamEvent } from './types';

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

/** Raw session response from API: messages are SessionItem[] (message | sub_session | summary | cost). */
export interface GetSessionResponse extends Omit<SessionDetail, 'messages'> {
  messages?: SessionItem[];
  Messages?: SessionItem[]; // some API versions may return capital M
}

export async function getSession(sessionId: string): Promise<GetSessionResponse> {
  return request<GetSessionResponse>(`/sessions/${sessionId}`);
}

function getStr(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string') return v;
  }
  return typeof obj[keys[0]] === 'undefined' ? '' : String(obj[keys[0]]);
}

/**
 * Normalize Docker Agent API session response to flat Message[] for the UI.
 * Tries: detail.messages / detail.Messages, then each item as Item (message.message) or flat { role, content }.
 */
export function sessionResponseToMessages(detail: GetSessionResponse | null | undefined): Message[] {
  if (!detail) return [];
  const raw = detail.messages ?? detail.Messages;
  const items = Array.isArray(raw) ? raw : [];
  if (items.length === 0) return [];

  const out: Message[] = [];
  for (const item of items) {
    const it = item as Record<string, unknown>;
    // Already flat { role, content } (e.g. from another API shape)
    const flatRole = getStr(it, 'role', 'Role');
    const hasFlatRole = typeof it.role === 'string' || typeof it.Role === 'string';
    if (hasFlatRole && flatRole) {
      const role = flatRole.toLowerCase();
      if (role === 'system' || role === 'tool') continue;
      const flatContent = getStr(it, 'content', 'Content');
      out.push({
        role: role === 'assistant' ? 'assistant' : role === 'user' ? 'user' : 'assistant',
        content: flatContent ?? '',
      });
      continue;
    }
    // Nested: item.message.message (session.Message wrapping chat.Message)
    const wrapper = (it.message ?? it.Message) as Record<string, unknown> | undefined;
    if (!wrapper) continue;
    let inner = (wrapper.message ?? wrapper.Message) as Record<string, unknown> | undefined;
    // Single nest: item.message is the chat message itself (role/content on wrapper)
    if (!inner && (wrapper.role !== undefined || wrapper.Role !== undefined)) {
      inner = wrapper;
    }
    if (!inner) continue;
    if (wrapper.implicit === true) continue;
    const role = getStr(inner, 'role', 'Role').toLowerCase();
    if (role === 'system' || role === 'tool') continue;
    let content = '';
    const thoughts: string[] = [];
    const rawThinking = inner.thinking ?? inner.Thinking ?? inner.thought ?? inner.Thought;
    if (typeof rawThinking === 'string' && rawThinking.trim()) thoughts.push(rawThinking.trim());
    else if (Array.isArray(rawThinking)) {
      (rawThinking as unknown[]).forEach((t) => {
        if (typeof t === 'string' && t.trim()) thoughts.push(t.trim());
      });
    }
    const rawContent = inner.content ?? inner.Content;
    if (typeof rawContent === 'string') {
      content = rawContent;
    } else if (Array.isArray(rawContent)) {
      const parts = rawContent as Array<{ type?: string; text?: string; thinking?: string }>;
      for (const p of parts) {
        if (!p || typeof p !== 'object') continue;
        const type = String((p as Record<string, unknown>).type ?? '').toLowerCase();
        const textVal = (p as Record<string, unknown>).text;
        const thinkingVal = (p as Record<string, unknown>).thinking;
        if (type === 'thinking') {
          const t = typeof thinkingVal === 'string' ? thinkingVal : typeof textVal === 'string' ? textVal : '';
          if (t.trim()) thoughts.push(t.trim());
        } else {
          const t = typeof textVal === 'string' ? textVal : '';
          if (t.trim()) content += (content ? '\n\n' : '') + t.trim();
        }
      }
    }
    if (!content) {
      const multi = inner.multi_content ?? inner.MultiContent;
      if (Array.isArray(multi)) {
        const parts = multi as Array<{ type?: string; text?: string; thinking?: string }>;
        for (const p of parts) {
          if (!p || typeof p !== 'object') continue;
          const type = String((p as Record<string, unknown>).type ?? '').toLowerCase();
          const textVal = (p as Record<string, unknown>).text;
          const thinkingVal = (p as Record<string, unknown>).thinking;
          if (type === 'thinking') {
            const t = typeof thinkingVal === 'string' ? thinkingVal : typeof textVal === 'string' ? textVal : '';
            if (t.trim()) thoughts.push(t.trim());
          } else {
            const t = typeof textVal === 'string' ? textVal : '';
            if (t.trim()) content += (content ? '\n\n' : '') + t.trim();
          }
        }
      }
    }
    out.push({
      role: role === 'assistant' ? 'assistant' : role === 'user' ? 'user' : 'assistant',
      content: content ?? '',
      ...(thoughts.length > 0 ? { thoughts } : {}),
    });
  }
  return out;
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

export type ResumeConfirmation = 'approve' | 'approve-session' | 'approve-tool' | 'reject';

export async function resumeSession(
  sessionId: string,
  body: { confirmation: ResumeConfirmation; reason?: string; tool_name?: string }
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
