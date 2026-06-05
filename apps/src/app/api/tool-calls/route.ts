import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import type { ToolCallStat } from "@/types/tool-call";

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
  const daysParam = searchParams.get("days");
  const days = daysParam ? parseInt(daysParam, 10) : 30;

  const cutoff = new Date(Date.now() - days * 86400_000).toISOString();

  let rows: Array<{ tool_name: string }> = [];

  if (projectId) {
    const { data: sessions, error: sessionsError } = await supabase
      .from("sessions")
      .select("id")
      .eq("project_id", projectId);

    if (sessionsError) {
      return NextResponse.json({ error: sessionsError.message }, { status: 500 });
    }

    const sessionIds = (sessions ?? []).map((s) => s.id);

    if (sessionIds.length === 0) {
      return NextResponse.json({ tool_calls: [] });
    }

    const { data, error } = await supabase
      .from("tool_calls")
      .select("tool_name")
      .in("session_id", sessionIds)
      .gte("created_at", cutoff);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    rows = data ?? [];
  } else {
    const { data, error } = await supabase
      .from("tool_calls")
      .select("tool_name")
      .gte("created_at", cutoff);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    rows = data ?? [];
  }

  const countMap = new Map<string, number>();
  for (const row of rows) {
    countMap.set(row.tool_name, (countMap.get(row.tool_name) ?? 0) + 1);
  }

  const tool_calls: ToolCallStat[] = Array.from(countMap.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([tool_name, count]) => ({ tool_name, count }));

  return NextResponse.json({ tool_calls });
}
