"use client";

import { useEffect, useState } from "react";

import EmptyState from "@/components/EmptyState";
import TableSkeleton from "@/components/TableSkeleton";
import type { Project } from "@/types/project";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  async function loadProjects() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/projects");
      const body = (await response.json()) as { projects?: Project[]; error?: string };

      if (!response.ok) {
        throw new Error(body.error ?? "프로젝트 목록을 불러오지 못했습니다.");
      }

      setProjects(body.projects ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProjects();
  }, []);

  async function handleDelete(id: string) {
    const confirmed = window.confirm(
      "이 프로젝트와 모든 세션·이벤트 데이터가 삭제됩니다. 계속할까요?",
    );
    if (!confirmed) return;

    setDeletingIds((prev) => new Set(prev).add(id));
    setError(null);

    try {
      const response = await fetch(`/api/projects/${id}`, { method: "DELETE" });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? "프로젝트를 삭제하지 못했습니다.");
      }

      setProjects((current) => current.filter((p) => p.id !== id));
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
    <main className="max-w-[960px] mx-auto py-10 px-6">
      <h1 className="text-2xl font-bold text-slate-100">Projects</h1>

      {error ? <p className="text-red-400 mt-3 text-sm">{error}</p> : null}

      {loading ? (
        <div className="mt-5">
          <TableSkeleton rows={4} cols={5} />
        </div>
      ) : projects.length === 0 ? (
        <EmptyState message="연결된 프로젝트가 없습니다." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10 mt-5">
          <table className="table-auto w-full text-sm">
            <thead>
              <tr className="bg-surface-card">
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wide">
                  이름
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wide">
                  세션 수
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wide">
                  마지막 활동
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wide">
                  생성일
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wide">
                  삭제
                </th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id} className="table-row-hover border-t border-white/5">
                  <td className="px-4 py-3 text-white font-semibold">{project.name}</td>
                  <td className="px-4 py-3 text-slate-400 text-sm tabular-nums">
                    {project.session_count}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-sm">
                    {project.last_active_at
                      ? new Date(project.last_active_at).toLocaleString()
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-sm">
                    {new Date(project.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => void handleDelete(project.id)}
                      disabled={deletingIds.has(project.id)}
                      className="text-slate-600 hover:text-red-400 text-xs px-2 py-1 rounded hover:bg-red-500/10 transition-all"
                    >
                      {deletingIds.has(project.id) ? "삭제 중..." : "삭제"}
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
