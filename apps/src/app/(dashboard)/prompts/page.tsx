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
      return <span className="text-slate-500 italic">[metadata only]</span>;
    }
    if (prompt === "[redacted]") {
      return <em className="text-slate-500">[redacted]</em>;
    }
    const text = prompt.length > 200 ? prompt.slice(0, 200) + "..." : prompt;
    return <span>{text}</span>;
  }

  return (
    <main className="max-w-[960px] mx-auto py-10 px-6">
      <div className="bg-surface sticky top-0 z-10 py-3">
        <h1 className="text-2xl font-bold text-slate-100 mb-4">Prompts</h1>
        <div className="flex items-center gap-2">
          <label htmlFor="project-filter" className="text-sm text-slate-400">
            프로젝트:
          </label>
          <select
            id="project-filter"
            value={projectFilter}
            onChange={handleFilterChange}
            className="bg-surface-card border border-white/10 text-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
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
      </div>

      {loading ? (
        <p className="text-slate-500 py-12 text-center">불러오는 중...</p>
      ) : prompts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500">
          프롬프트 기록이 없습니다.
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {prompts.map((p) => (
            <div
              key={p.id}
              className="bg-surface-card border border-white/10 rounded-xl p-4 hover:border-brand-500/30 hover:bg-white/5 transition-all duration-200"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-slate-500 text-xs">
                  {new Date(p.timestamp).toLocaleString()}
                </span>
                <span className="text-slate-500 text-xs">·</span>
                <span className="text-slate-500 text-xs">{p.project_name}</span>
              </div>
              <div className="font-mono text-sm bg-black/20 border border-white/10 p-3 rounded-lg text-slate-300 overflow-auto">
                {renderPromptContent(p.prompt)}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
