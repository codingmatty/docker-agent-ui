// Docker Agent API types (see https://docker.github.io/docker-agent/features/api-server/)

export interface Agent {
  name: string;
  multi: boolean;
  description?: string;
}

export interface Session {
  id: string;
  title: string;
  created_at: string;
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface SessionDetail extends Session {
  messages?: Message[];
  permissions?: unknown;
}

// SSE event types from agent execution
export type StreamEventType =
  | 'stream_started'
  | 'stream_stopped'
  | 'agent_choice'
  | 'tool_call'
  | 'tool_call_confirmation'
  | 'tool_call_response'
  | 'error';

export interface StreamEventBase {
  type: StreamEventType;
  session_id?: string;
  agent?: string;
}

export interface AgentChoiceEvent extends StreamEventBase {
  type: 'agent_choice';
  content: string;
}

export interface ToolCallEvent extends StreamEventBase {
  type: 'tool_call';
  [key: string]: unknown;
}

export interface ToolCallConfirmationEvent extends StreamEventBase {
  type: 'tool_call_confirmation';
  [key: string]: unknown;
}

export interface ToolCallResponseEvent extends StreamEventBase {
  type: 'tool_call_response';
  [key: string]: unknown;
}

export interface ErrorEvent extends StreamEventBase {
  type: 'error';
  message?: string;
}

export type StreamEvent =
  | AgentChoiceEvent
  | ToolCallEvent
  | ToolCallConfirmationEvent
  | ToolCallResponseEvent
  | ErrorEvent
  | (StreamEventBase & { type: 'stream_started' | 'stream_stopped' });
