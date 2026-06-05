import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import type { Project } from "@/types/project";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: projects, error: projectsError } = await supabase
    .from("projects")
    .select("id, name, description, created_at")
    .order("created_at", { ascending: false });

  if (projectsError) {
    return NextResponse.json({ error: projectsError.message }, { status: 500 });
  }

  const { data: sessions, error: sessionsError } = await supabase
    .from("sessions")
    .select("project_id, started_at");

  if (sessionsError) {
    return NextResponse.json({ error: sessionsError.message }, { status: 500 });
  }

  const sessionMap = new Map<string, { count: number; last_active: string | null }>();
  for (const s of sessions ?? []) {
    const existing = sessionMap.get(s.project_id) ?? { count: 0, last_active: null };
    existing.count += 1;
    if (s.started_at && (!existing.last_active || s.started_at > existing.last_active)) {
      existing.last_active = s.started_at;
    }
    sessionMap.set(s.project_id, existing);
  }

  const result: Project[] = (projects ?? []).map((p) => {
    const agg = sessionMap.get(p.id) ?? { count: 0, last_active: null };
    return {
      id: p.id,
      name: p.name,
      description: p.description,
      created_at: p.created_at,
      session_count: agg.count,
      last_active_at: agg.last_active,
    };
  });

  return NextResponse.json({ projects: result });
}
