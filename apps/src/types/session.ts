export type Session = {
  id: string;
  session_id_ext: string;
  project_id: string;
  project_name: string;
  model: string | null;
  started_at: string | null;
  ended_at: string | null;
  turn_count: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cache_creation_tokens: number;
  total_cache_read_tokens: number;
  tool_call_count: number;
  agent: string;
};
