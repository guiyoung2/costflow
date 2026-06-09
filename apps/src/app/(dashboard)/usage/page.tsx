"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { Project } from "@/types/project";
import type { ToolCallStat } from "@/types/tool-call";
import type { DailyUsage } from "@/types/usage";

type AgentFilter = "claude" | "codex" | null;

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

const AGENT_OPTIONS: { label: string; value: AgentFilter }[] = [
  { label: "전체", value: null },
  { label: "Claude Code", value: "claude" },
  { label: "Codex", value: "codex" },
];

const AXIS_STYLE = { fill: "#71717a", fontSize: 11 } as const;
const TOOLTIP_STYLE = {
  background: "#0d1117",
  border: "1px solid #21262d",
  borderRadius: "8px",
  fontSize: "12px",
  color: "#f0f0f2",
  boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
} as const;

function fmtY(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}K`;
  return String(v);
}

function toParams(y: number, m: number) {
  return `year=${y}&month=${m}`;
}

export default function UsagePage() {
  const now = new Date();
  const searchParams = useSearchParams();

  const [projects, setProjects] = useState<Project[]>([]);
  const [usage, setUsage] = useState<DailyUsage[]>([]);
  const [toolStats, setToolStats] = useState<ToolCallStat[]>([]);
  const [projectBreakdown, setProjectBreakdown] = useState<ProjectBreakdown[]>([]);
  const [modelStats, setModelStats] = useState<ModelStat[]>([]);
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [projectId, setProjectId] = useState<string>("");
  const [agentFilter, setAgentFilter] = useState<AgentFilter>(null);
  const [chartType, setChartType] = useState<"bar" | "line">("bar");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      setLoading(true);
      setError(null);
      const initYear = now.getFullYear();
      const initMonth = now.getMonth() + 1;
      const pid = searchParams.get("project_id") ?? "";
      if (pid) setProjectId(pid);
      try {
        const baseParams = toParams(initYear, initMonth) + (pid ? `&project_id=${pid}` : "");
        const [projectsRes, usageRes, toolRes] = await Promise.all([
          fetch("/api/projects"),
          fetch(`/api/usage?${baseParams}`),
          fetch(`/api/tool-calls?${baseParams}`).catch(() => null),
        ]);
        const projectsBody = (await projectsRes.json()) as { projects?: Project[]; error?: string };
        const usageBody = (await usageRes.json()) as {
          usage?: DailyUsage[];
          projectBreakdown?: ProjectBreakdown[];
          modelStats?: ModelStat[];
          recentSessions?: RecentSession[];
          error?: string;
        };
        if (!projectsRes.ok) throw new Error(projectsBody.error ?? "프로젝트 목록을 불러오지 못했습니다.");
        if (!usageRes.ok) throw new Error(usageBody.error ?? "사용량 데이터를 불러오지 못했습니다.");
        setProjects(projectsBody.projects ?? []);
        setUsage(usageBody.usage ?? []);
        setProjectBreakdown(usageBody.projectBreakdown ?? []);
        setModelStats(usageBody.modelStats ?? []);
        setRecentSessions(usageBody.recentSessions ?? []);
        if (toolRes?.ok) {
          const toolBody = (await toolRes.json()) as { tool_calls?: ToolCallStat[] };
          setToolStats(toolBody.tool_calls ?? []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    }
    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchUsage(nextYear: number, nextMonth: number, nextProjectId: string, nextAgent: AgentFilter) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams(toParams(nextYear, nextMonth));
      if (nextProjectId) params.set("project_id", nextProjectId);
      if (nextAgent) params.set("agent", nextAgent);
      const qs = params.toString();
      const [res, toolRes] = await Promise.all([
        fetch(`/api/usage?${qs}`),
        fetch(`/api/tool-calls?${qs}`).catch(() => null),
      ]);
      const body = (await res.json()) as {
        usage?: DailyUsage[];
        projectBreakdown?: ProjectBreakdown[];
        modelStats?: ModelStat[];
        recentSessions?: RecentSession[];
        error?: string;
      };
      if (!res.ok) throw new Error(body.error ?? "사용량 데이터를 불러오지 못했습니다.");
      setUsage(body.usage ?? []);
      setProjectBreakdown(body.projectBreakdown ?? []);
      setModelStats(body.modelStats ?? []);
      setRecentSessions(body.recentSessions ?? []);
      if (toolRes?.ok) {
        const toolBody = (await toolRes.json()) as { tool_calls?: ToolCallStat[] };
        setToolStats(toolBody.tool_calls ?? []);
      } else {
        setToolStats([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  function handlePrevMonth() {
    const [ny, nm] = month === 1 ? [year - 1, 12] : [year, month - 1];
    setYear(ny);
    setMonth(nm);
    void fetchUsage(ny, nm, projectId, agentFilter);
  }

  function handleNextMonth() {
    if (isCurrentMonth) return;
    const [ny, nm] = month === 12 ? [year + 1, 1] : [year, month + 1];
    setYear(ny);
    setMonth(nm);
    void fetchUsage(ny, nm, projectId, agentFilter);
  }

  function handleProjectChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    setProjectId(next);
    void fetchUsage(year, month, next, agentFilter);
  }

  function handleAgentChange(nextAgent: AgentFilter) {
    setAgentFilter(nextAgent);
    void fetchUsage(year, month, projectId, nextAgent);
  }

  const sortedUsage = [...usage].sort((a, b) => b.date.localeCompare(a.date));
  const chartData = [...usage]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((row) => ({
      date: row.date.slice(5).replace("-", "/"),
      Input: row.input_tokens,
      Output: row.output_tokens,
    }));
  const totals = usage.reduce(
    (acc, row) => ({
      input_tokens: acc.input_tokens + row.input_tokens,
      output_tokens: acc.output_tokens + row.output_tokens,
      cache_creation_tokens: acc.cache_creation_tokens + row.cache_creation_tokens,
      cache_read_tokens: acc.cache_read_tokens + row.cache_read_tokens,
    }),
    { input_tokens: 0, output_tokens: 0, cache_creation_tokens: 0, cache_read_tokens: 0 },
  );

  const maxProjectTotal = Math.max(1, ...projectBreakdown.map((p) => p.input_tokens + p.output_tokens));
  const totalModelSessions = Math.max(1, modelStats.reduce((acc, m) => acc + m.session_count, 0));

  return (
    <main className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">Usage</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        {/* Month navigation */}
        <div className="flex items-center gap-1 bg-surface-card rounded-lg p-1 border border-surface-border">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="text-slate-400 hover:text-white px-3 py-1.5 text-sm rounded-md transition-colors"
          >
            ‹
          </button>
          <span className="text-slate-200 text-sm font-medium px-2 tabular-nums min-w-[84px] text-center">
            {year}년 {month}월
          </span>
          <button
            type="button"
            onClick={handleNextMonth}
            disabled={isCurrentMonth}
            className="text-slate-400 hover:text-white disabled:text-zinc-700 disabled:cursor-not-allowed px-3 py-1.5 text-sm rounded-md transition-colors"
          >
            ›
          </button>
        </div>

        {/* Agent filter */}
        <div className="flex gap-1 bg-surface-card rounded-lg p-1 border border-surface-border">
          {AGENT_OPTIONS.map((opt) => (
            <button
              key={opt.value ?? "all"}
              type="button"
              onClick={() => handleAgentChange(opt.value)}
              className={
                agentFilter === opt.value
                  ? "bg-brand-600 text-white rounded-md px-4 py-1.5 text-sm font-medium transition-all"
                  : "text-slate-400 hover:text-white px-4 py-1.5 text-sm rounded-md transition-colors"
              }
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Project select */}
        <select
          value={projectId}
          onChange={handleProjectChange}
          className="bg-surface-card border border-surface-border rounded-lg px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">전체 프로젝트</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {error ? <p className="text-red-400 text-sm">{error}</p> : null}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card border-l-2 border-l-brand-500">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Input Tokens</p>
          <p className="text-2xl font-bold text-brand-400 tabular-nums mt-2">{totals.input_tokens.toLocaleString()}</p>
        </div>
        <div className="stat-card border-l-2 border-l-emerald-500">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Output Tokens</p>
          <p className="text-2xl font-bold text-emerald-400 tabular-nums mt-2">{totals.output_tokens.toLocaleString()}</p>
        </div>
        <div className="stat-card border-l-2 border-l-orange-500">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Cache Creation</p>
          <p className="text-2xl font-bold text-orange-400 tabular-nums mt-2">{totals.cache_creation_tokens.toLocaleString()}</p>
        </div>
        <div className="stat-card border-l-2 border-l-amber-500">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Cache Read</p>
          <p className="text-2xl font-bold text-amber-400 tabular-nums mt-2">{totals.cache_read_tokens.toLocaleString()}</p>
        </div>
      </div>

      {/* Chart with Bar / Line toggle */}
      {!loading && chartData.length > 0 && (
        <div className="card rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="section-label">일별 토큰 사용 추이</p>
            <div className="flex gap-0.5 bg-surface-raised rounded-md p-0.5 border border-surface-border">
              {(["bar", "line"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setChartType(t)}
                  className={
                    chartType === t
                      ? "bg-zinc-700 text-zinc-100 rounded px-3 py-1 text-xs font-medium transition-all"
                      : "text-zinc-500 hover:text-zinc-300 px-3 py-1 text-xs rounded transition-colors"
                  }
                >
                  {t === "bar" ? "Bar" : "Line"}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            {chartType === "bar" ? (
              <BarChart data={chartData} barCategoryGap="35%" barGap={2}>
                <CartesianGrid vertical={false} stroke="#21262d" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtY} tick={AXIS_STYLE} axisLine={false} tickLine={false} width={44} />
                <Tooltip
                  cursor={{ fill: "#161b22" }}
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v) => [typeof v === "number" ? v.toLocaleString() : v, undefined]}
                />
                <Legend wrapperStyle={{ fontSize: "11px", color: "#71717a", paddingTop: "10px" }} iconType="square" iconSize={8} />
                <Bar dataKey="Input" fill="#22d3ee" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Output" fill="#34d399" radius={[2, 2, 0, 0]} />
              </BarChart>
            ) : (
              <LineChart data={chartData}>
                <CartesianGrid vertical={false} stroke="#21262d" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtY} tick={AXIS_STYLE} axisLine={false} tickLine={false} width={44} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v) => [typeof v === "number" ? v.toLocaleString() : v, undefined]}
                />
                <Legend wrapperStyle={{ fontSize: "11px", color: "#71717a", paddingTop: "10px" }} iconType="square" iconSize={8} />
                <Line type="monotone" dataKey="Input" stroke="#22d3ee" strokeWidth={2} dot={{ fill: "#22d3ee", r: 3 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="Output" stroke="#34d399" strokeWidth={2} dot={{ fill: "#34d399", r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      )}

      {/* Project Breakdown + Model Stats */}
      {!loading && (projectBreakdown.length > 0 || modelStats.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {projectBreakdown.length > 0 && (
            <div className="card rounded-xl p-5">
              <p className="section-label mb-4">프로젝트별 토큰 사용</p>
              <div className="flex flex-col gap-3.5">
                {projectBreakdown.map((p) => {
                  const total = p.input_tokens + p.output_tokens;
                  const pct = Math.round((total / maxProjectTotal) * 100);
                  return (
                    <div key={p.project_id}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-zinc-300 text-xs font-mono truncate">{p.project_name}</span>
                        <span className="text-zinc-500 text-xs tabular-nums shrink-0 ml-2">{total.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-surface-raised rounded-full h-1">
                        <div className="bg-brand-500 h-1 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {modelStats.length > 0 && (
            <div className="card rounded-xl p-5">
              <p className="section-label mb-4">모델별 세션 수</p>
              <div className="flex flex-col gap-3.5">
                {modelStats.map((m) => {
                  const pct = Math.round((m.session_count / totalModelSessions) * 100);
                  return (
                    <div key={m.model}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-zinc-300 text-xs font-mono">{m.model}</span>
                        <span className="text-zinc-500 text-xs tabular-nums">
                          {m.session_count}
                          <span className="text-zinc-700 ml-1">({pct}%)</span>
                        </span>
                      </div>
                      <div className="w-full bg-surface-raised rounded-full h-1">
                        <div className="bg-emerald-500 h-1 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent Sessions */}
      {!loading && recentSessions.length > 0 && (
        <div>
          <p className="section-label mb-3">최근 세션</p>
          <div className="overflow-x-auto rounded-xl border border-surface-border">
            <table className="table-auto w-full text-sm">
              <thead>
                <tr className="bg-surface-card">
                  <th className="text-slate-400 text-xs uppercase tracking-wide px-4 py-3 text-left">프로젝트</th>
                  <th className="text-slate-400 text-xs uppercase tracking-wide px-4 py-3 text-left">모델</th>
                  <th className="text-slate-400 text-xs uppercase tracking-wide px-4 py-3 text-right">시작</th>
                </tr>
              </thead>
              <tbody>
                {recentSessions.map((s) => (
                  <tr key={s.id} className="table-row-hover border-t border-surface-border text-slate-300">
                    <td className="px-4 py-3 font-mono text-xs">{s.project_name}</td>
                    <td className="px-4 py-3 text-zinc-400 text-xs">{s.model ?? "—"}</td>
                    <td className="px-4 py-3 tabular-nums text-right text-zinc-500 text-xs">
                      {new Date(s.started_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Daily Table */}
      <div>
        {loading ? (
          <p className="text-slate-400 text-sm">불러오는 중...</p>
        ) : sortedUsage.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <p>이 달에 수집된 데이터가 없습니다.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-surface-border">
            <table className="table-auto w-full text-sm">
              <thead>
                <tr className="bg-surface-card">
                  <th className="text-slate-400 text-xs uppercase tracking-wide px-4 py-3 text-left">날짜</th>
                  <th className="text-slate-400 text-xs uppercase tracking-wide px-4 py-3 text-right">Input</th>
                  <th className="text-slate-400 text-xs uppercase tracking-wide px-4 py-3 text-right">Output</th>
                  <th className="text-slate-400 text-xs uppercase tracking-wide px-4 py-3 text-right">Cache Creation</th>
                  <th className="text-slate-400 text-xs uppercase tracking-wide px-4 py-3 text-right">Cache Read</th>
                </tr>
              </thead>
              <tbody>
                {sortedUsage.map((row) => (
                  <tr key={row.date} className="table-row-hover border-t border-surface-border text-slate-300">
                    <td className="px-4 py-3">{row.date}</td>
                    <td className="px-4 py-3 tabular-nums text-right">{row.input_tokens.toLocaleString()}</td>
                    <td className="px-4 py-3 tabular-nums text-right">{row.output_tokens.toLocaleString()}</td>
                    <td className="px-4 py-3 tabular-nums text-right">{row.cache_creation_tokens.toLocaleString()}</td>
                    <td className="px-4 py-3 tabular-nums text-right">{row.cache_read_tokens.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Tool Stats */}
      <div>
        <h2 className="text-slate-200 font-semibold text-sm uppercase tracking-wide mt-8 mb-3">
          Tool 사용량
        </h2>
        {toolStats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <p>수집된 tool 데이터가 없습니다.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-surface-border">
            <table className="table-auto w-full text-sm">
              <thead>
                <tr className="bg-surface-card">
                  <th className="text-slate-400 text-xs uppercase tracking-wide px-4 py-3 text-left">Tool 이름</th>
                  <th className="text-slate-400 text-xs uppercase tracking-wide px-4 py-3 text-right">횟수</th>
                </tr>
              </thead>
              <tbody>
                {toolStats.map((t) => (
                  <tr key={t.tool_name} className="table-row-hover border-t border-surface-border text-slate-300">
                    <td className="px-4 py-3">{t.tool_name}</td>
                    <td className="px-4 py-3 tabular-nums text-right">{t.count.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
