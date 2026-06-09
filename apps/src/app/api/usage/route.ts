import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import type { DailyUsage } from "@/types/usage";

interface ProjectBreakdown {
  project_id: string;
  project_name: string;
  input_tokens: number;
  output_tokens: number;
}

interface ModelStat {
  model: string;
  session_count: number;
}

interface RecentSession {
  id: string;
  model: string | null;
  started_at: string;
  agent: string;
  project_name: string;
}

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
  const yearParam = searchParams.get("year");
  const monthParam = searchParams.get("month");

  const now = new Date();
  const y = yearParam ? parseInt(yearParam, 10) : now.getFullYear();
  const m = monthParam ? parseInt(monthParam, 10) : now.getMonth() + 1;
  const from = new Date(y, m - 1, 1).toISOString();
  const to = new Date(y, m, 1).toISOString();

  let filteredSessionIds: string[] | null = null;
  if (projectId || agent) {
    let sq = supabase.from("sessions").select("id");
    if (projectId) sq = sq.eq("project_id", projectId);
    if (agent) sq = sq.eq("agent", agent);
    const { data: ses, error: seErr } = await sq;
    if (seErr) return NextResponse.json({ error: seErr.message }, { status: 500 });
    filteredSessionIds = (ses ?? []).map((s) => s.id);
    if (filteredSessionIds.length === 0) {
      return NextResponse.json({ usage: [], projectBreakdown: [], modelStats: [], recentSessions: [] });
    }
  }

  let usageQuery = supabase
    .from("token_usage")
    .select(
      "session_id, created_at, input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens, sessions(project_id, model, projects(name))",
    )
    .gte("created_at", from)
    .lt("created_at", to);
  if (filteredSessionIds) usageQuery = usageQuery.in("session_id", filteredSessionIds);

  let sessionQuery = supabase
    .from("sessions")
    .select("id, model, started_at, agent, projects(name)")
    .gte("started_at", from)
    .lt("started_at", to)
    .not("model", "is", null)
    .order("started_at", { ascending: false });
  if (projectId) sessionQuery = sessionQuery.eq("project_id", projectId);
  if (agent) sessionQuery = sessionQuery.eq("agent", agent);

  const [{ data: usageRows, error: usageError }, { data: sessionRows, error: sessionError }] =
    await Promise.all([usageQuery, sessionQuery]);

  if (usageError) return NextResponse.json({ error: usageError.message }, { status: 500 });
  if (sessionError) return NextResponse.json({ error: sessionError.message }, { status: 500 });

  // Daily aggregation
  const dailyMap = new Map<string, { input: number; output: number; cache_creation: number; cache_read: number }>();
  // Project aggregation
  const projectMap = new Map<string, { name: string; input: number; output: number }>();

  for (const row of usageRows ?? []) {
    const date = row.created_at.slice(0, 10);
    const d = dailyMap.get(date) ?? { input: 0, output: 0, cache_creation: 0, cache_read: 0 };
    d.input += row.input_tokens;
    d.output += row.output_tokens;
    d.cache_creation += row.cache_creation_tokens;
    d.cache_read += row.cache_read_tokens;
    dailyMap.set(date, d);

    const sessionField = row.sessions as unknown as {
      project_id: string;
      model: string | null;
      projects: { name: string } | null;
    } | null;
    if (sessionField) {
      const pid = sessionField.project_id;
      const pname = sessionField.projects?.name ?? "";
      const p = projectMap.get(pid) ?? { name: pname, input: 0, output: 0 };
      p.input += row.input_tokens;
      p.output += row.output_tokens;
      projectMap.set(pid, p);
    }
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

  const projectBreakdown: ProjectBreakdown[] = Array.from(projectMap.entries())
    .map(([project_id, agg]) => ({
      project_id,
      project_name: agg.name,
      input_tokens: agg.input,
      output_tokens: agg.output,
    }))
    .sort((a, b) => (b.input_tokens + b.output_tokens) - (a.input_tokens + a.output_tokens));

  // Model stats (by session count)
  const modelMap = new Map<string, number>();
  for (const s of sessionRows ?? []) {
    if (s.model) modelMap.set(s.model, (modelMap.get(s.model) ?? 0) + 1);
  }
  const modelStats: ModelStat[] = Array.from(modelMap.entries())
    .map(([model, session_count]) => ({ model, session_count }))
    .sort((a, b) => b.session_count - a.session_count);

  // Recent sessions (top 5)
  const recentSessions: RecentSession[] = (sessionRows ?? []).slice(0, 5).map((s) => ({
    id: s.id,
    model: s.model as string | null,
    started_at: s.started_at as string,
    agent: (s.agent as string) ?? "claude",
    project_name: (s.projects as unknown as { name: string } | null)?.name ?? "",
  }));

  return NextResponse.json({ usage, projectBreakdown, modelStats, recentSessions });
}
