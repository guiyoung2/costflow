export type Project = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  session_count: number;
  last_active_at: string | null;
};
