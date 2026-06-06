import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import type { DailyUsage } from "@/types/usage";

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
  const daysParam = searchParams.get("days");
  const days = daysParam ? parseInt(daysParam, 10) : 30;

  const cutoff = new Date(Date.now() - days * 86400_000).toISOString();

  let usageRows: Array<{
    session_id: string;
    created_at: string;
    input_tokens: number;
    output_tokens: number;
    cache_creation_tokens: number;
    cache_read_tokens: number;
  }> = [];

  if (projectId || agent) {
    let sessionQuery = supabase.from("sessions").select("id");
    if (projectId) sessionQuery = sessionQuery.eq("project_id", projectId);
    if (agent) sessionQuery = sessionQuery.eq("agent", agent);

    const { data: sessions, error: sessionsError } = await sessionQuery;

    if (sessionsError) {
      return NextResponse.json({ error: sessionsError.message }, { status: 500 });
    }

    const sessionIds = (sessions ?? []).map((s) => s.id);

    if (sessionIds.length === 0) {
      return NextResponse.json({ usage: [] });
    }

    const { data, error } = await supabase
      .from("token_usage")
      .select("session_id, created_at, input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens")
      .in("session_id", sessionIds)
      .gte("created_at", cutoff);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    usageRows = data ?? [];
  } else {
    const { data, error } = await supabase
      .from("token_usage")
      .select("session_id, created_at, input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens")
      .gte("created_at", cutoff);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    usageRows = data ?? [];
  }

  const dailyMap = new Map<string, {
    input: number;
    output: number;
    cache_creation: number;
    cache_read: number;
  }>();

  for (const row of usageRows) {
    const date = row.created_at.slice(0, 10);
    const existing = dailyMap.get(date) ?? { input: 0, output: 0, cache_creation: 0, cache_read: 0 };
    existing.input += row.input_tokens;
    existing.output += row.output_tokens;
    existing.cache_creation += row.cache_creation_tokens;
    existing.cache_read += row.cache_read_tokens;
    dailyMap.set(date, existing);
  }

  const usage: DailyUsage[] = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, agg]) => ({
      date,
      input_tokens: agg.input,
      output_tokens: agg.output,
      cache_creation_tokens: agg.cache_creation,
      cache_read_tokens: agg.cache_read,
    }));

  return NextResponse.json({ usage });
}
