"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

import type { Project } from "@/types/project";
import type { DailyUsage } from "@/types/usage";

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [usage, setUsage] = useState<DailyUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    async function init() {
      setLoading(true);
      setError(null);
      try {
        const supabase = createClient();
        const [authResult, projectsRes, usageRes] = await Promise.all([
          supabase.auth.getUser(),
          fetch("/api/projects"),
          fetch("/api/usage?days=30"),
        ]);
        setEmail(authResult.data.user?.email ?? "");
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
      } catch (err) {
        setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    }
    void init();
  }, []);

  const totals = usage.reduce(
    (acc, row) => ({
      input_tokens: acc.input_tokens + row.input_tokens,
      output_tokens: acc.output_tokens + row.output_tokens,
      cache_creation_tokens: acc.cache_creation_tokens + row.cache_creation_tokens,
      cache_read_tokens: acc.cache_read_tokens + row.cache_read_tokens,
    }),
    { input_tokens: 0, output_tokens: 0, cache_creation_tokens: 0, cache_read_tokens: 0 },
  );

  const recentProjects = projects.slice(0, 5);
  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return (
    <main className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">
          안녕하세요, <span className="text-brand-400">{email || "..."}</span>님
        </h1>
        <p className="text-slate-400 text-sm mt-1">{today}</p>
      </div>

      {error ? <p className="text-red-400 text-sm">{error}</p> : null}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card hover:-translate-y-1">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Input Tokens (30일)</p>
          <p className="text-2xl font-bold text-brand-400 tabular-nums mt-2">
            {totals.input_tokens.toLocaleString()}
          </p>
        </div>
        <div className="stat-card hover:-translate-y-1">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Output Tokens (30일)</p>
          <p className="text-2xl font-bold text-emerald-400 tabular-nums mt-2">
            {totals.output_tokens.toLocaleString()}
          </p>
        </div>
        <div className="stat-card hover:-translate-y-1">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Cache Creation (30일)</p>
          <p className="text-2xl font-bold text-purple-400 tabular-nums mt-2">
            {totals.cache_creation_tokens.toLocaleString()}
          </p>
        </div>
        <div className="stat-card hover:-translate-y-1">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Cache Read (30일)</p>
          <p className="text-2xl font-bold text-amber-400 tabular-nums mt-2">
            {totals.cache_read_tokens.toLocaleString()}
          </p>
        </div>
      </div>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-slate-200 font-semibold text-sm uppercase tracking-wide">연결된 프로젝트</h2>
          {projects.length > 0 ? (
            <Link href="/projects" className="text-brand-400 hover:text-brand-300 text-sm transition-colors">
              전체 보기 →
            </Link>
          ) : null}
        </div>

        {loading ? (
          <p className="text-slate-400 text-sm">불러오는 중...</p>
        ) : projects.length === 0 ? (
          <div className="stat-card">
            <p className="text-slate-300 text-sm">연결된 프로젝트가 없습니다.</p>
            <p className="text-slate-500 text-sm mt-2">
              Settings 페이지에서 API key를 발급한 뒤, CLI로 연결하세요:
            </p>
            <pre className="mt-3 bg-surface rounded-lg p-3 text-xs text-slate-300 font-mono border border-surface-border">
              {`npm install -g costflow\ncostflow init`}
            </pre>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-surface-border">
            <table className="table-auto w-full text-sm">
              <thead>
                <tr className="bg-surface-card">
                  <th className="text-slate-400 text-xs uppercase tracking-wide px-4 py-3 text-left">
                    프로젝트
                  </th>
                  <th className="text-slate-400 text-xs uppercase tracking-wide px-4 py-3 text-left">
                    세션 수
                  </th>
                  <th className="text-slate-400 text-xs uppercase tracking-wide px-4 py-3 text-left">
                    마지막 활동
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentProjects.map((p) => (
                  <tr key={p.id} className="table-row-hover border-t border-surface-border">
                    <td className="px-4 py-3 text-slate-300">
                      <Link href="/projects" className="text-brand-400 hover:text-brand-300 transition-colors">
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-300 tabular-nums">{p.session_count}</td>
                    <td className="px-4 py-3 text-slate-400">
                      {p.last_active_at
                        ? new Date(p.last_active_at).toLocaleDateString("ko-KR")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
