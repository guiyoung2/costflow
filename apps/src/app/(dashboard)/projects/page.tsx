"use client";

import { useEffect, useState } from "react";

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
    <main style={{ maxWidth: "960px", margin: "40px auto", padding: "0 24px" }}>
      <h1>Projects</h1>

      {error ? <p style={{ color: "#b00020" }}>{error}</p> : null}

      <table style={{ width: "100%", marginTop: "20px", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={cellStyle}>이름</th>
            <th style={cellStyle}>세션 수</th>
            <th style={cellStyle}>마지막 활동</th>
            <th style={cellStyle}>생성일</th>
            <th style={cellStyle}>삭제</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td style={cellStyle} colSpan={5}>
                불러오는 중...
              </td>
            </tr>
          ) : projects.length === 0 ? (
            <tr>
              <td style={cellStyle} colSpan={5}>
                연결된 프로젝트가 없습니다.
              </td>
            </tr>
          ) : (
            projects.map((project) => (
              <tr key={project.id}>
                <td style={cellStyle}>{project.name}</td>
                <td style={cellStyle}>{project.session_count}</td>
                <td style={cellStyle}>
                  {project.last_active_at
                    ? new Date(project.last_active_at).toLocaleString()
                    : "—"}
                </td>
                <td style={cellStyle}>{new Date(project.created_at).toLocaleString()}</td>
                <td style={cellStyle}>
                  <button
                    type="button"
                    onClick={() => void handleDelete(project.id)}
                    disabled={deletingIds.has(project.id)}
                  >
                    {deletingIds.has(project.id) ? "삭제 중..." : "삭제"}
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </main>
  );
}

const cellStyle = {
  borderBottom: "1px solid #ddd",
  padding: "10px",
  textAlign: "left",
} satisfies React.CSSProperties;
