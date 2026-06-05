export type Prompt = {
  id: string;
  session_id: string;
  project_name: string;
  timestamp: string;
  prompt: string | null;
  turn_index: number | null;
};
