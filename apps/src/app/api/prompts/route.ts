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
  const agentParam = searchParams.get("agent");
  const limitParam = searchParams.get("limit");
  const limitNum = limitParam ? parseInt(limitParam, 10) : 50;

  let sessionIds: string[] | null = null;

  if (projectId || agentParam) {
    let sessionsQuery = supabase.from("sessions").select("id");
    if (projectId) sessionsQuery = sessionsQuery.eq("project_id", projectId);
    if (agentParam) sessionsQuery = sessionsQuery.eq("agent", agentParam);

    const { data: sessions, error: sessionsError } = await sessionsQuery;

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
    .select("id, session_id, turn_index, created_at, payload, sessions(project_id, session_id_ext, custom_title, projects(name))")
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

  // Collect unique session IDs from the current result set
  const uniqueSessionIds = [...new Set((events ?? []).map((e) => e.session_id))];

  // Fetch the first UserPromptSubmit per session (lowest turn_index) for session_title fallback
  const firstPromptMap = new Map<string, string>();
  if (uniqueSessionIds.length > 0) {
    const { data: firstEvents } = await supabase
      .from("events")
      .select("session_id, turn_index, payload")
      .eq("type", "UserPromptSubmit")
      .in("session_id", uniqueSessionIds)
      .order("turn_index", { ascending: true });

    if (firstEvents) {
      for (const fe of firstEvents) {
        if (!firstPromptMap.has(fe.session_id)) {
          const p = (fe.payload as Record<string, unknown> | null)?.prompt;
          if (typeof p === "string" && p.length > 0) {
            firstPromptMap.set(fe.session_id, p);
          }
        }
      }
    }
  }

  const prompts: Prompt[] = (events ?? []).map((e) => {
    const payload = e.payload as Record<string, unknown> | null;
    const sessionField = e.sessions as unknown as {
      project_id: string;
      session_id_ext: string;
      custom_title: string | null;
      projects: { name: string } | null;
    } | null;

    const customTitle = sessionField?.custom_title ?? null;
    const firstPrompt = firstPromptMap.get(e.session_id) ?? null;
    let session_title: string | null = null;
    if (customTitle) {
      session_title = customTitle;
    } else if (firstPrompt) {
      session_title = firstPrompt.length > 60 ? firstPrompt.slice(0, 60) + "…" : firstPrompt;
    }

    return {
      id: e.id,
      session_id: e.session_id,
      session_id_ext: sessionField?.session_id_ext ?? "",
      session_title,
      project_name: sessionField?.projects?.name ?? "",
      timestamp: (payload?.timestamp as string | undefined) ?? e.created_at,
      prompt: (payload?.prompt as string | undefined) ?? null,
      turn_index: e.turn_index,
    };
  });

  return NextResponse.json({ prompts });
}
