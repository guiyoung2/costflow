export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_tokens: number;
  cache_read_tokens: number;
  token_source: 'actual' | 'unknown';
}

export interface HookEvent {
  hook_type: string;
  session_id: string;
  project_name: string;
  timestamp: string;
  turn_index?: number;
  prompt?: string;
  token_usage?: TokenUsage;
  model?: string;
  tool_use_names?: string[];
  agent?: 'claude' | 'codex';
}
