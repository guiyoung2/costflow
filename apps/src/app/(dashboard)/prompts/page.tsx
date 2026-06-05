"use client";

import { useEffect, useState } from "react";

import type { Project } from "@/types/project";
import type { Prompt } from "@/types/prompt";

export default function PromptsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectFilter, setProjectFilter] = useState<string>("");

  async function loadPrompts(pid?: string) {
    setLoading(true);
    setError(null);
    try {
      const url = pid ? `/api/prompts?project_id=${pid}` : "/api/prompts";
      const response = await fetch(url);
      const body = (await response.json()) as { prompts?: Prompt[]; error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? "프롬프트 목록을 불러오지 못했습니다.");
      }
      setPrompts(body.prompts ?? []);
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
        const [projRes, promptRes] = await Promise.all([
          fetch("/api/projects"),
          fetch("/api/prompts"),
        ]);
        const projBody = (await projRes.json()) as { projects?: Project[]; error?: string };
        const promptBody = (await promptRes.json()) as { prompts?: Prompt[]; error?: string };
        if (!projRes.ok) throw new Error(projBody.error ?? "프로젝트 목록을 불러오지 못했습니다.");
        if (!promptRes.ok)
          throw new Error(promptBody.error ?? "프롬프트 목록을 불러오지 못했습니다.");
        setProjects(projBody.projects ?? []);
        setPrompts(promptBody.prompts ?? []);
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
    void loadPrompts(pid || undefined);
  }

  function renderPromptContent(prompt: string | null) {
    if (prompt === null) {
      return <span style={{ color: "#888" }}>[metadata only]</span>;
    }
    if (prompt === "[redacted]") {
      return <em>[redacted]</em>;
    }
    const text = prompt.length > 200 ? prompt.slice(0, 200) + "..." : prompt;
    return <span>{text}</span>;
  }

  return (
    <main style={{ maxWidth: "960px", margin: "40px auto", padding: "0 24px" }}>
      <h1>Prompts</h1>

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
            <th style={cellStyle}>시간</th>
            <th style={cellStyle}>프로젝트</th>
            <th style={cellStyle}>프롬프트 내용</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td style={cellStyle} colSpan={3}>
                불러오는 중...
              </td>
            </tr>
          ) : prompts.length === 0 ? (
            <tr>
              <td style={cellStyle} colSpan={3}>
                프롬프트 기록이 없습니다.
              </td>
            </tr>
          ) : (
            prompts.map((p) => (
              <tr key={p.id}>
                <td style={{ ...cellStyle, whiteSpace: "nowrap" }}>
                  {new Date(p.timestamp).toLocaleString()}
                </td>
                <td style={cellStyle}>{p.project_name}</td>
                <td style={cellStyle}>{renderPromptContent(p.prompt)}</td>
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
