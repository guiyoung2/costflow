import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("project_id");
  const agentParam = searchParams.get("agent");

  let sessionIds: string[] | null = null;

  if (projectId || agentParam) {
    let sessionsQuery = supabase.from("sessions").select("id");
    if (projectId) sessionsQuery = sessionsQuery.eq("project_id", projectId);
    if (agentParam) sessionsQuery = sessionsQuery.eq("agent", agentParam);

    const { data: sessions, error: sessErr } = await sessionsQuery;

    if (sessErr) {
      return NextResponse.json({ error: sessErr.message }, { status: 500 });
    }

    sessionIds = (sessions ?? []).map((s) => s.id);

    if (sessionIds.length === 0) {
      return NextResponse.json({ dates: [] });
    }
  }

  let query = supabase.from("events").select("created_at").eq("type", "UserPromptSubmit");

  if (sessionIds !== null) {
    query = query.in("session_id", sessionIds);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const dateSet = new Set((data ?? []).map((e) => (e.created_at as string).slice(0, 10)));

  return NextResponse.json({ dates: [...dateSet].sort() });
}
