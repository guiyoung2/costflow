"use client";

import { useEffect, useState } from "react";

import EmptyState from "@/components/EmptyState";
import TableSkeleton from "@/components/TableSkeleton";
import type { Project } from "@/types/project";
import type { Session } from "@/types/session";

type AgentFilter = "claude" | "codex" | null;

const AGENT_OPTIONS: { label: string; value: AgentFilter }[] = [
  { label: "전체", value: null },
  { label: "Claude Code", value: "claude" },
  { label: "Codex", value: "codex" },
];

export default function SessionsPage() {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedProjectName, setSelectedProjectName] = useState<string>("");

  const [projects, setProjects] = useState<Project[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agentFilter, setAgentFilter] = useState<AgentFilter>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function init() {
      setProjectsLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/projects");
        const body = (await res.json()) as { projects?: Project[]; error?: string };
        if (!res.ok) throw new Error(body.error ?? "프로젝트 목록을 불러오지 못했습니다.");
        setProjects(body.projects ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
      } finally {
        setProjectsLoading(false);
      }
    }
    void init();
  }, []);

  async function loadSessions(projectId: string | null, agent: AgentFilter) {
    setSessionsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (projectId) params.set("project_id", projectId);
      if (agent) params.set("agent", agent);
      const qs = params.toString();
      const res = await fetch(qs ? `/api/sessions?${qs}` : "/api/sessions");
      const body = (await res.json()) as { sessions?: Session[]; error?: string };
      if (!res.ok) throw new Error(body.error ?? "세션 목록을 불러오지 못했습니다.");
      setSessions(body.sessions ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setSessionsLoading(false);
    }
  }

  function handleProjectClick(project: Project) {
    setSelectedProjectId(project.id);
    setSelectedProjectName(project.name);
    setAgentFilter(null);
    setView("list");
    void loadSessions(project.id, null);
  }

  function handleAllClick() {
    setSelectedProjectId(null);
    setSelectedProjectName("전체 세션");
    setAgentFilter(null);
    setView("list");
    void loadSessions(null, null);
  }

  function handleBack() {
    setView("grid");
    setSelectedProjectId(null);
    setSelectedProjectName("");
    setSessions([]);
    setAgentFilter(null);
  }

  function handleAgentChange(nextAgent: AgentFilter) {
    setAgentFilter(nextAgent);
    void loadSessions(selectedProjectId, nextAgent);
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm(
      "이 세션과 모든 이벤트·토큰 데이터가 삭제됩니다. 계속할까요?",
    );
    if (!confirmed) return;

    setDeletingIds((prev) => new Set(prev).add(id));
    setError(null);

    try {
      const res = await fetch(`/api/sessions/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
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

  // ── Grid view ──────────────────────────────────────────────
  if (view === "grid") {
    return (
      <main className="max-w-[960px] mx-auto py-10 px-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">Sessions</h1>
            <p className="text-zinc-500 text-sm mt-1">프로젝트를 선택해 세션 내역을 확인하세요.</p>
          </div>
        </div>

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        {projectsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="card rounded-xl h-28 bg-surface-raised animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* 전체 카드 */}
            <button
              type="button"
              onClick={handleAllClick}
              className="card rounded-xl p-5 text-left hover:bg-surface-raised hover:border-zinc-700 transition-colors duration-150 group"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="section-label mb-1">전체</p>
                  <h3 className="text-zinc-100 font-semibold">모든 프로젝트</h3>
                </div>
                <span className="text-zinc-700 group-hover:text-zinc-400 transition-colors text-base">↗</span>
              </div>
              <p className="text-zinc-600 text-xs">{projects.length}개 프로젝트 통합 보기</p>
            </button>

            {/* 프로젝트 카드 */}
            {projects.map((project) => (
              <button
                key={project.id}
                type="button"
                onClick={() => handleProjectClick(project)}
                className="card rounded-xl p-5 text-left hover:bg-surface-raised hover:border-zinc-700 transition-colors duration-150 group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="section-label mb-1">프로젝트</p>
                    <h3 className="text-zinc-100 font-semibold truncate">{project.name}</h3>
                  </div>
                  <span className="text-zinc-700 group-hover:text-zinc-400 transition-colors text-base shrink-0">↗</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-600">
                  <span>{project.session_count}개 세션</span>
                  {project.last_active_at && (
                    <>
                      <span>·</span>
                      <span>{new Date(project.last_active_at).toLocaleDateString()}</span>
                    </>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    );
  }

  // ── List view ──────────────────────────────────────────────
  return (
    <main className="max-w-[1200px] mx-auto py-10 px-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="text-zinc-500 hover:text-zinc-200 text-sm transition-colors duration-150"
          >
            ← 목록
          </button>
          <span className="text-zinc-700 text-sm">/</span>
          <h2 className="text-zinc-100 font-semibold">{selectedProjectName}</h2>
        </div>

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
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {sessionsLoading ? (
        <div className="mt-5">
          <TableSkeleton rows={5} cols={7} />
        </div>
      ) : sessions.length === 0 ? (
        <EmptyState message="세션이 없습니다." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-surface-border mt-5">
          <table className="table-auto w-full text-sm">
            <thead>
              <tr className="bg-surface-card">
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wide">Agent</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wide">모델</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wide">시작 시각</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wide">Turn</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wide">Input 토큰</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wide">Tool 호출</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wide">삭제</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id} className="table-row-hover border-t border-surface-border">
                  <td className="px-4 py-3">
                    <span className="text-xs px-1.5 py-0.5 rounded bg-surface-raised text-zinc-400 border border-surface-border">
                      {s.agent === "codex" ? "Codex" : "Claude"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-300 text-xs">{s.model ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs tabular-nums">
                    {s.started_at ? new Date(s.started_at).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-right text-slate-400">{s.turn_count}</td>
                  <td className="px-4 py-3 tabular-nums text-right text-slate-400">
                    {s.total_input_tokens.toLocaleString()}
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
