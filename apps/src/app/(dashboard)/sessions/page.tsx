"use client";

import { useEffect, useState } from "react";

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
    <main style={{ maxWidth: "1200px", margin: "40px auto", padding: "0 24px" }}>
      <h1>Sessions</h1>

      <div style={{ marginTop: "16px" }}>
        <label htmlFor="project-filter" style={{ marginRight: "8px" }}>
          프로젝트:
        </label>
        <select id="project-filter" value={projectFilter} onChange={handleFilterChange}>
          <option value="">전체</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {error ? <p style={{ color: "#b00020", marginTop: "12px" }}>{error}</p> : null}

      <table style={{ width: "100%", marginTop: "20px", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={cellStyle}>프로젝트</th>
            <th style={cellStyle}>Session ID</th>
            <th style={cellStyle}>시작 시간</th>
            <th style={cellStyle}>종료 시간</th>
            <th style={cellStyle}>모델</th>
            <th style={cellStyle}>Input</th>
            <th style={cellStyle}>Output</th>
            <th style={cellStyle}>Cache Creation</th>
            <th style={cellStyle}>Cache Read</th>
            <th style={cellStyle}>Tool</th>
            <th style={cellStyle}>삭제</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td style={cellStyle} colSpan={11}>
                불러오는 중...
              </td>
            </tr>
          ) : sessions.length === 0 ? (
            <tr>
              <td style={cellStyle} colSpan={11}>
                세션이 없습니다.
              </td>
            </tr>
          ) : (
            sessions.map((s) => (
              <tr key={s.id}>
                <td style={cellStyle}>{s.project_name}</td>
                <td style={cellStyle}>{s.session_id_ext.slice(0, 8)}</td>
                <td style={cellStyle}>
                  {s.started_at ? new Date(s.started_at).toLocaleString() : "-"}
                </td>
                <td style={cellStyle}>
                  {s.ended_at ? new Date(s.ended_at).toLocaleString() : "-"}
                </td>
                <td style={cellStyle}>{s.model ?? "-"}</td>
                <td style={cellStyle}>{s.total_input_tokens.toLocaleString()}</td>
                <td style={cellStyle}>{s.total_output_tokens.toLocaleString()}</td>
                <td style={cellStyle}>{s.total_cache_creation_tokens.toLocaleString()}</td>
                <td style={cellStyle}>{s.total_cache_read_tokens.toLocaleString()}</td>
                <td style={cellStyle}>{s.tool_call_count.toLocaleString()}</td>
                <td style={cellStyle}>
                  <button
                    type="button"
                    onClick={() => void handleDelete(s.id)}
                    disabled={deletingIds.has(s.id)}
                  >
                    {deletingIds.has(s.id) ? "삭제 중..." : "삭제"}
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
