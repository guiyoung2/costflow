import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import type { Prompt } from "@/types/prompt";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session_id");
  const projectId = searchParams.get("project_id");
  const limitParam = searchParams.get("limit");
  const limitNum = limitParam ? parseInt(limitParam, 10) : 50;

  let sessionIds: string[] | null = null;

  if (projectId) {
    const { data: sessions, error: sessionsError } = await supabase
      .from("sessions")
      .select("id")
      .eq("project_id", projectId);

    if (sessionsError) {
      return NextResponse.json({ error: sessionsError.message }, { status: 500 });
    }

    sessionIds = (sessions ?? []).map((s) => s.id);

    if (sessionIds.length === 0) {
      return NextResponse.json({ prompts: [] });
    }
  }

  const daysParam = searchParams.get("days");
  const daysNum = daysParam ? parseInt(daysParam, 10) : null;

  let query = supabase
    .from("events")
    .select("id, session_id, turn_index, created_at, payload, sessions(project_id, session_id_ext, projects(name))")
    .eq("type", "UserPromptSubmit")
    .order("created_at", { ascending: false })
    .limit(limitNum);

  const dateParam = searchParams.get("date");
  if (dateParam) {
    const dayStart = new Date(dateParam);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dateParam);
    dayEnd.setHours(23, 59, 59, 999);
    query = query.gte("created_at", dayStart.toISOString()).lte("created_at", dayEnd.toISOString());
  } else if (daysNum && !isNaN(daysNum)) {
    const from = new Date();
    from.setDate(from.getDate() - daysNum);
    query = query.gte("created_at", from.toISOString());
  }

  if (sessionId) {
    query = query.eq("session_id", sessionId);
  } else if (sessionIds !== null) {
    query = query.in("session_id", sessionIds);
  }

  const { data: events, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const prompts: Prompt[] = (events ?? []).map((e) => {
    const payload = e.payload as Record<string, unknown> | null;
    const sessionField = e.sessions as unknown as {
      project_id: string;
      session_id_ext: string;
      projects: { name: string } | null;
    } | null;

    return {
      id: e.id,
      session_id: e.session_id,
      project_name: sessionField?.projects?.name ?? "",
      timestamp: (payload?.timestamp as string | undefined) ?? e.created_at,
      prompt: (payload?.prompt as string | undefined) ?? null,
      turn_index: e.turn_index,
    };
  });

  return NextResponse.json({ prompts });
}
