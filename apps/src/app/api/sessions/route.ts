import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import type { Session } from "@/types/session";

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
  const agent = searchParams.get("agent");
  const date = searchParams.get("date");

  let query = supabase
    .from("sessions")
    .select("*, projects(name)")
    .not("model", "is", null)
    .order("started_at", { ascending: false })
    .limit(100);

  if (projectId) {
    query = query.eq("project_id", projectId);
  }
  if (agent) {
    query = query.eq("agent", agent);
  }
  if (date) {
    query = query.gte("started_at", `${date}T00:00:00.000Z`).lte("started_at", `${date}T23:59:59.999Z`);
  }

  const { data: sessions, error: sessionsError } = await query;

  if (sessionsError) {
    return NextResponse.json({ error: sessionsError.message }, { status: 500 });
  }

  const sessionIds = (sessions ?? []).map((s) => s.id);

  if (sessionIds.length === 0) {
    return NextResponse.json({ sessions: [] });
  }

  const { data: usages, error: usageError } = await supabase
    .from("token_usage")
    .select("session_id, turn_index, input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens")
    .in("session_id", sessionIds);

  if (usageError) {
    return NextResponse.json({ error: usageError.message }, { status: 500 });
  }

  const usageMap = new Map<string, {
    turn_count: number;
    input: number;
    output: number;
    cache_creation: number;
    cache_read: number;
  }>();

  for (const u of usages ?? []) {
    const existing = usageMap.get(u.session_id) ?? {
      turn_count: 0,
      input: 0,
      output: 0,
      cache_creation: 0,
      cache_read: 0,
    };
    existing.turn_count += 1;
    existing.input += u.input_tokens;
    existing.output += u.output_tokens;
    existing.cache_creation += u.cache_creation_tokens;
    existing.cache_read += u.cache_read_tokens;
    usageMap.set(u.session_id, existing);
  }

  const toolCountMap = new Map<string, number>();
  try {
    const { data: toolCallRows } = await supabase
      .from("tool_calls")
      .select("session_id, id")
      .in("session_id", sessionIds);

    for (const row of toolCallRows ?? []) {
      toolCountMap.set(row.session_id, (toolCountMap.get(row.session_id) ?? 0) + 1);
    }
  } catch {
    // tool_call_count는 부가 정보 — 실패 시 0으로 fallback
  }

  // 각 세션의 첫 번째 UserPromptSubmit 이벤트 조회 (min turn_index)
  const firstPromptMap = new Map<string, string>();
  try {
    const { data: promptEvents } = await supabase
      .from("events")
      .select("session_id, turn_index, payload")
      .in("session_id", sessionIds)
      .eq("type", "UserPromptSubmit")
      .order("turn_index", { ascending: true });

    // 세션별 min turn_index 기준 첫 번째 이벤트만 보관
    for (const ev of promptEvents ?? []) {
      if (!firstPromptMap.has(ev.session_id)) {
        const payload = ev.payload as { prompt?: string } | null;
        const prompt = payload?.prompt ?? null;
        if (prompt !== null) {
          firstPromptMap.set(ev.session_id, prompt);
        }
      }
    }
  } catch {
    // first_prompt는 부가 정보 — 실패 시 null로 fallback
  }

  const result: Session[] = (sessions ?? []).map((s) => {
    const agg = usageMap.get(s.id) ?? {
      turn_count: 0,
      input: 0,
      output: 0,
      cache_creation: 0,
      cache_read: 0,
    };
    const projectsField = s.projects as { name: string } | null;
    return {
      id: s.id,
      session_id_ext: s.session_id_ext,
      project_id: s.project_id,
      project_name: projectsField?.name ?? "",
      model: s.model,
      started_at: s.started_at,
      ended_at: s.ended_at,
      turn_count: agg.turn_count,
      total_input_tokens: agg.input,
      total_output_tokens: agg.output,
      total_cache_creation_tokens: agg.cache_creation,
      total_cache_read_tokens: agg.cache_read,
      tool_call_count: toolCountMap.get(s.id) ?? 0,
      agent: (s.agent as string) ?? "claude",
      custom_title: (s.custom_title as string | null) ?? null,
      first_prompt: firstPromptMap.get(s.id) ?? null,
    };
  });

  return NextResponse.json({ sessions: result });
}
