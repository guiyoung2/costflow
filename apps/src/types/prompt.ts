export type Prompt = {
  id: string;
  session_id: string;
  session_id_ext: string;
  session_title: string | null;
  project_name: string;
  timestamp: string;
  prompt: string | null;
  turn_index: number | null;
};
