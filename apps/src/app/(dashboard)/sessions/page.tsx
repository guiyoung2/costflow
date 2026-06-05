"use client";

import { useEffect, useState } from "react";

import EmptyState from "@/components/EmptyState";
import TableSkeleton from "@/components/TableSkeleton";
import type { Project } from "@/types/project";
import type { Session } from "@/types/session";

export default function SessionsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectFilter, setProjectFilter] = useState<string>("");
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  async function loadSessions(pid?: string) {
    setLoading(true);
    setError(null);
    try {
      const url = pid ? `/api/sessions?project_id=${pid}` : "/api/sessions";
      const response = await fetch(url);
      const body = (await response.json()) as { sessions?: Session[]; error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? "세션 목록을 불러오지 못했습니다.");
      }
      setSessions(body.sessions ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function init() {
      setLoading(true);
      setError(null);
      try {
        const [projRes, sessRes] = await Promise.all([
          fetch("/api/projects"),
          fetch("/api/sessions"),
        ]);
        const projBody = (await projRes.json()) as { projects?: Project[]; error?: string };
        const sessBody = (await sessRes.json()) as { sessions?: Session[]; error?: string };
        if (!projRes.ok) throw new Error(projBody.error ?? "프로젝트 목록을 불러오지 못했습니다.");
        if (!sessRes.ok) throw new Error(sessBody.error ?? "세션 목록을 불러오지 못했습니다.");
        setProjects(projBody.projects ?? []);
        setSessions(sessBody.sessions ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    }
    void init();
  }, []);

  function handleFilterChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const pid = e.target.value;
    setProjectFilter(pid);
    void loadSessions(pid || undefined);
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm(
      "이 세션과 모든 이벤트·토큰 데이터가 삭제됩니다. 계속할까요?",
    );
    if (!confirmed) return;

    setDeletingIds((prev) => new Set(prev).add(id));
    setError(null);

    try {
      const response = await fetch(`/api/sessions/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? "세션을 삭제하지 못했습니다.");
      }
      setSessions((current) => current.filter((s) => s.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  return (
    <main className="max-w-[1200px] mx-auto py-10 px-6">
      <h1 className="text-2xl font-bold text-slate-100">Sessions</h1>

      <div className="mt-4 flex items-center gap-2">
        <label htmlFor="project-filter" className="text-sm text-slate-400">
          프로젝트:
        </label>
        <select
          id="project-filter"
          value={projectFilter}
          onChange={handleFilterChange}
          className="bg-surface-card border border-surface-border text-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">전체</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {error ? <p className="text-red-400 mt-3 text-sm">{error}</p> : null}

      {loading ? (
        <div className="mt-5">
          <TableSkeleton rows={5} cols={11} />
        </div>
      ) : sessions.length === 0 ? (
        <EmptyState message="세션이 없습니다." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-surface-border mt-5">
          <table className="table-auto w-full text-sm">
            <thead>
              <tr className="bg-surface-card">
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wide">프로젝트</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wide">Session ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wide">시작 시간</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wide">종료 시간</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wide">모델</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wide">Input</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wide">Output</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wide">Cache Creation</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wide">Cache Read</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wide">Tool</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wide">삭제</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id} className="table-row-hover border-t border-surface-border">
                  <td className="px-4 py-3 text-brand-400 font-medium">{s.project_name}</td>
                  <td className="px-4 py-3 text-slate-300">{s.session_id_ext.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {s.started_at ? new Date(s.started_at).toLocaleString() : "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {s.ended_at ? new Date(s.ended_at).toLocaleString() : "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-300">{s.model ?? "-"}</td>
                  <td className="px-4 py-3 tabular-nums text-right text-slate-400">
                    {s.total_input_tokens.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-right text-slate-400">
                    {s.total_output_tokens.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-right text-slate-400">
                    {s.total_cache_creation_tokens.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-right text-slate-400">
                    {s.total_cache_read_tokens.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-right text-slate-400">
                    {s.tool_call_count.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => void handleDelete(s.id)}
                      disabled={deletingIds.has(s.id)}
                      className={`text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded p-1 transition-all duration-200${deletingIds.has(s.id) ? " opacity-50 cursor-not-allowed" : ""}`}
                    >
                      {deletingIds.has(s.id) ? "삭제 중..." : "삭제"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
