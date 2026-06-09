"use client";

import Link from "next/link";
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
        <div className="card rounded-lg overflow-x-auto mt-5">
          <table className="table-auto w-full text-sm">
            <thead>
              <tr className="bg-surface-raised">
                <th className="px-4 py-3 text-left section-label">이름</th>
                <th className="px-4 py-3 text-left section-label">세션 수</th>
                <th className="px-4 py-3 text-left section-label">마지막 활동</th>
                <th className="px-4 py-3 text-left section-label">생성일</th>
                <th className="px-4 py-3 text-left section-label">삭제</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id} className="table-row-hover border-t border-surface-border">
                  <td className="px-4 py-3 font-medium">
                    <Link
                      href={`/usage?project_id=${project.id}`}
                      className="text-zinc-100 hover:text-brand-400 transition-colors duration-150"
                    >
                      {project.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-400 tabular-nums">{project.session_count}</td>
                  <td className="px-4 py-3 text-zinc-400">
                    {project.last_active_at
                      ? new Date(project.last_active_at).toLocaleString()
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {new Date(project.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => void handleDelete(project.id)}
                      disabled={deletingIds.has(project.id)}
                      className="text-zinc-600 hover:text-red-400 text-xs px-2 py-1 rounded hover:bg-surface-raised transition-colors"
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
