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
  role: "user" | "assistant" | "system";
  content: string;
  /** When set, shown as collapsible "Thoughts" (from API content parts with type "thinking"). */
  thoughts?: string[];
  /** The agent that produced this message (e.g. "developer", "root"). */
  agentName?: string;
}

export interface SessionDetail extends Session {
  messages?: Message[];
  permissions?: unknown;
}

// Raw API response: session messages are an array of Item (message | sub_session | summary | cost).
// Inner message may use Role/Content (Go default) or role/content (snake_case).
export interface SessionItemMessage {
  agentName?: string;
  message: {
    role?: string;
    Role?: string;
    content?: string;
    Content?: string;
    multi_content?: Array<{
      type?: string;
      text?: string;
      [key: string]: unknown;
    }>;
    MultiContent?: Array<{
      type?: string;
      text?: string;
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  };
  implicit?: boolean;
}

export interface SessionItem {
  message?: SessionItemMessage;
  sub_session?: unknown;
  summary?: string;
  cost?: number;
}

// SSE event types from agent execution
export type StreamEventType =
  | "stream_started"
  | "stream_stopped"
  | "agent_choice"
  | "tool_call"
  | "tool_call_confirmation"
  | "tool_call_response"
  | "error"
  | "message_added";

export interface StreamEventBase {
  type: StreamEventType;
  session_id?: string;
  agent?: string;
}

export interface AgentChoiceEvent extends StreamEventBase {
  type: "agent_choice";
  content: string;
}

export interface ToolCallEvent extends StreamEventBase {
  type: "tool_call";
  [key: string]: unknown;
}

export interface ToolCallConfirmationEvent extends StreamEventBase {
  type: "tool_call_confirmation";
  [key: string]: unknown;
}

export interface ToolCallResponseEvent extends StreamEventBase {
  type: "tool_call_response";
  [key: string]: unknown;
}

export interface ErrorEvent extends StreamEventBase {
  type: "error";
  message?: string;
}

export type StreamEvent =
  | AgentChoiceEvent
  | ToolCallEvent
  | ToolCallConfirmationEvent
  | ToolCallResponseEvent
  | ErrorEvent
  | StreamEventBase;
