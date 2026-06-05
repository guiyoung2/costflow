"use client";

import { useEffect, useState } from "react";

import type { Project } from "@/types/project";
import type { ToolCallStat } from "@/types/tool-call";
import type { DailyUsage } from "@/types/usage";

const DAYS_OPTIONS = [7, 30, 90] as const;
type DaysOption = (typeof DAYS_OPTIONS)[number];

export default function UsagePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [usage, setUsage] = useState<DailyUsage[]>([]);
  const [toolStats, setToolStats] = useState<ToolCallStat[]>([]);
  const [days, setDays] = useState<DaysOption>(30);
  const [projectId, setProjectId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      setLoading(true);
      setError(null);
      try {
        const [projectsRes, usageRes, toolRes] = await Promise.all([
          fetch("/api/projects"),
          fetch("/api/usage?days=30"),
          fetch("/api/tool-calls?days=30").catch(() => null),
        ]);
        const projectsBody = (await projectsRes.json()) as {
          projects?: Project[];
          error?: string;
        };
        const usageBody = (await usageRes.json()) as {
          usage?: DailyUsage[];
          error?: string;
        };
        if (!projectsRes.ok) throw new Error(projectsBody.error ?? "프로젝트 목록을 불러오지 못했습니다.");
        if (!usageRes.ok) throw new Error(usageBody.error ?? "사용량 데이터를 불러오지 못했습니다.");
        setProjects(projectsBody.projects ?? []);
        setUsage(usageBody.usage ?? []);
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
  }, []);

  async function fetchUsage(nextDays: DaysOption, nextProjectId: string) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ days: String(nextDays) });
      if (nextProjectId) params.set("project_id", nextProjectId);
      const [res, toolRes] = await Promise.all([
        fetch(`/api/usage?${params.toString()}`),
        fetch(`/api/tool-calls?${params.toString()}`).catch(() => null),
      ]);
      const body = (await res.json()) as { usage?: DailyUsage[]; error?: string };
      if (!res.ok) throw new Error(body.error ?? "사용량 데이터를 불러오지 못했습니다.");
      setUsage(body.usage ?? []);
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

  function handleDaysChange(nextDays: DaysOption) {
    setDays(nextDays);
    void fetchUsage(nextDays, projectId);
  }

  function handleProjectChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nextProjectId = e.target.value;
    setProjectId(nextProjectId);
    void fetchUsage(days, nextProjectId);
  }

  const sortedUsage = [...usage].sort((a, b) => b.date.localeCompare(a.date));

  const totals = usage.reduce(
    (acc, row) => ({
      input_tokens: acc.input_tokens + row.input_tokens,
      output_tokens: acc.output_tokens + row.output_tokens,
      cache_creation_tokens: acc.cache_creation_tokens + row.cache_creation_tokens,
      cache_read_tokens: acc.cache_read_tokens + row.cache_read_tokens,
    }),
    { input_tokens: 0, output_tokens: 0, cache_creation_tokens: 0, cache_read_tokens: 0 },
  );

  return (
    <main className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">Usage</h1>

      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex gap-1 bg-surface-card rounded-lg p-1 border border-surface-border">
          {DAYS_OPTIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => handleDaysChange(d)}
              className={
                days === d
                  ? "bg-brand-600 text-white rounded-md px-4 py-1.5 text-sm font-medium transition-all"
                  : "text-slate-400 hover:text-white px-4 py-1.5 text-sm rounded-md transition-colors"
              }
            >
              {d}일
            </button>
          ))}
        </div>

        <select
          value={projectId}
          onChange={handleProjectChange}
          className="bg-surface-card border border-surface-border rounded-lg px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">전체 프로젝트</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {error ? <p className="text-red-400 text-sm">{error}</p> : null}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card border-l-2 border-l-brand-500">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Input Tokens</p>
          <p className="text-2xl font-bold text-brand-400 tabular-nums mt-2">
            {totals.input_tokens.toLocaleString()}
          </p>
        </div>
        <div className="stat-card border-l-2 border-l-emerald-500">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Output Tokens</p>
          <p className="text-2xl font-bold text-emerald-400 tabular-nums mt-2">
            {totals.output_tokens.toLocaleString()}
          </p>
        </div>
        <div className="stat-card border-l-2 border-l-orange-500">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Cache Creation</p>
          <p className="text-2xl font-bold text-orange-400 tabular-nums mt-2">
            {totals.cache_creation_tokens.toLocaleString()}
          </p>
        </div>
        <div className="stat-card border-l-2 border-l-amber-500">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Cache Read</p>
          <p className="text-2xl font-bold text-amber-400 tabular-nums mt-2">
            {totals.cache_read_tokens.toLocaleString()}
          </p>
        </div>
      </div>

      <div>
        {loading ? (
          <p className="text-slate-400 text-sm">불러오는 중...</p>
        ) : sortedUsage.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <p>아직 수집된 데이터가 없습니다.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-surface-border">
            <table className="table-auto w-full text-sm">
              <thead>
                <tr className="bg-surface-card">
                  <th className="text-slate-400 text-xs uppercase tracking-wide px-4 py-3 text-left">
                    날짜
                  </th>
                  <th className="text-slate-400 text-xs uppercase tracking-wide px-4 py-3 text-right">
                    Input
                  </th>
                  <th className="text-slate-400 text-xs uppercase tracking-wide px-4 py-3 text-right">
                    Output
                  </th>
                  <th className="text-slate-400 text-xs uppercase tracking-wide px-4 py-3 text-right">
                    Cache Creation
                  </th>
                  <th className="text-slate-400 text-xs uppercase tracking-wide px-4 py-3 text-right">
                    Cache Read
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedUsage.map((row) => (
                  <tr key={row.date} className="table-row-hover border-t border-surface-border text-slate-300">
                    <td className="px-4 py-3">{row.date}</td>
                    <td className="px-4 py-3 tabular-nums text-right">
                      {row.input_tokens.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-right">
                      {row.output_tokens.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-right">
                      {row.cache_creation_tokens.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-right">
                      {row.cache_read_tokens.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
                  <th className="text-slate-400 text-xs uppercase tracking-wide px-4 py-3 text-left">
                    Tool 이름
                  </th>
                  <th className="text-slate-400 text-xs uppercase tracking-wide px-4 py-3 text-right">
                    횟수
                  </th>
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
