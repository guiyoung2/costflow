"use client";

import { useEffect, useState } from "react";
import { DayPicker } from "react-day-picker";

import EmptyState from "@/components/EmptyState";
import TableSkeleton from "@/components/TableSkeleton";
import { getDateLabel, getSessionTitle, groupByDate } from "@/lib/session-utils";
import type { Project } from "@/types/project";
import type { Session } from "@/types/session";

type AgentFilter = "claude" | "codex" | null;

const AGENT_OPTIONS: { label: string; value: AgentFilter }[] = [
  { label: "전체", value: null },
  { label: "Claude Code", value: "claude" },
  { label: "Codex", value: "codex" },
];

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const DAY_PICKER_CLASSES = {
  root: "bg-surface-card border border-surface-border rounded-xl p-3 select-none",
  months: "relative",
  month: "",
  month_caption: "flex items-center px-1 h-9 mb-1",
  caption_label: "text-sm font-medium text-zinc-200",
  nav: "absolute top-0 right-1 flex gap-0.5 items-center h-9",
  button_previous:
    "w-7 h-7 flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-surface-raised rounded-md transition-colors",
  button_next:
    "w-7 h-7 flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-surface-raised rounded-md transition-colors",
  chevron: "fill-current w-4 h-4",
  month_grid: "w-full",
  weekdays: "",
  weekday: "w-9 h-7 text-center text-xs text-zinc-600 font-normal",
  weeks: "",
  week: "flex",
  day: "w-9 h-9 text-center text-xs text-zinc-300",
  day_button:
    "w-full h-full flex items-center justify-center rounded-md hover:bg-surface-raised transition-colors focus:outline-none",
  today: "!text-brand-400 font-semibold",
  selected: "bg-brand-600 !text-white rounded-md",
  outside: "!text-zinc-700",
  disabled: "!text-zinc-700 !opacity-40",
  hidden: "invisible",
};

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

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [availableDates, setAvailableDates] = useState<Date[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());

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

  async function loadAvailableDates(projectId: string | null, agent: AgentFilter) {
    const params = new URLSearchParams();
    if (projectId) params.set("project_id", projectId);
    if (agent) params.set("agent", agent);
    const qs = params.toString();
    try {
      const res = await fetch(qs ? `/api/sessions/available-dates?${qs}` : "/api/sessions/available-dates");
      const body = (await res.json()) as { dates?: string[]; error?: string };
      if (res.ok && body.dates) {
        setAvailableDates(body.dates.map((d) => new Date(d + "T00:00:00")));
      }
    } catch {
      // 날짜 로드 실패해도 달력은 표시 (모든 날짜 활성)
    }
  }

  async function loadSessions(projectId: string | null, agent: AgentFilter, date?: string | null) {
    setSessionsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (projectId) params.set("project_id", projectId);
      if (agent) params.set("agent", agent);
      if (date) params.set("date", date);
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
    setSelectedDate(null);
    setAvailableDates([]);
    setView("list");
    void loadSessions(project.id, null);
    void loadAvailableDates(project.id, null);
  }

  function handleAllClick() {
    setSelectedProjectId(null);
    setSelectedProjectName("전체 세션");
    setAgentFilter(null);
    setSelectedDate(null);
    setAvailableDates([]);
    setView("list");
    void loadSessions(null, null);
    void loadAvailableDates(null, null);
  }

  function handleBack() {
    setView("grid");
    setSelectedProjectId(null);
    setSelectedProjectName("");
    setSessions([]);
    setAgentFilter(null);
    setSelectedDate(null);
    setAvailableDates([]);
  }

  function handleAgentChange(nextAgent: AgentFilter) {
    setAgentFilter(nextAgent);
    setSelectedDate(null);
    void loadSessions(selectedProjectId, nextAgent);
    void loadAvailableDates(selectedProjectId, nextAgent);
  }

  function handleDateSelect(date: Date | undefined) {
    const next = date ?? null;
    setSelectedDate(next);
    if (next) {
      const yyyy = next.getFullYear();
      const mm = String(next.getMonth() + 1).padStart(2, "0");
      const dd = String(next.getDate()).padStart(2, "0");
      void loadSessions(selectedProjectId, agentFilter, `${yyyy}-${mm}-${dd}`);
    } else {
      void loadSessions(selectedProjectId, agentFilter);
    }
  }

  function handleClearDate() {
    setSelectedDate(null);
    void loadSessions(selectedProjectId, agentFilter);
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

  function handleTitleClick(s: Session) {
    setEditingId(s.id);
    setEditingValue(s.custom_title ?? "");
  }

  async function handleTitleSave(id: string) {
    if (savingIds.has(id)) return;

    setSavingIds((prev) => new Set(prev).add(id));
    try {
      const value = editingValue.trim() || null;
      const res = await fetch(`/api/sessions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ custom_title: value }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "제목을 저장하지 못했습니다.");
      }
      setSessions((current) =>
        current.map((s) => (s.id === id ? { ...s, custom_title: value } : s)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setEditingId(null);
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
  const grouped = groupByDate(sessions, (s) => s.started_at?.slice(0, 10) ?? "");
  const dateKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

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

      <div className="flex flex-col gap-5">
        {/* 달력 */}
        <div className="flex items-end gap-3">
          <DayPicker
            mode="single"
            selected={selectedDate ?? undefined}
            onSelect={handleDateSelect}
            disabled={(date) =>
              availableDates.length > 0 && !availableDates.some((d) => isSameDay(d, date))
            }
            classNames={DAY_PICKER_CLASSES}
          />
          {selectedDate && (
            <button
              type="button"
              onClick={handleClearDate}
              className="text-xs text-zinc-500 hover:text-zinc-300 py-1.5 px-3 rounded-md hover:bg-surface-raised transition-colors border border-surface-border"
            >
              전체 보기
            </button>
          )}
        </div>

        <div className="border-t border-surface-border" />

        {/* 세션 목록 */}
        {sessionsLoading ? (
          <div className="mt-2">
            <TableSkeleton rows={5} cols={7} />
          </div>
        ) : sessions.length === 0 ? (
          <EmptyState message="세션이 없습니다." />
        ) : (
          <div className="flex flex-col gap-6">
            {dateKeys.map((dateKey) => (
              <div key={dateKey}>
                <p className="text-zinc-500 text-xs font-medium py-2">{getDateLabel(dateKey)}</p>
                <div className="overflow-x-auto rounded-xl border border-surface-border">
                  <table className="table-auto w-full text-sm">
                    <thead>
                      <tr className="bg-surface-card">
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wide">제목</th>
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
                      {grouped[dateKey].map((s) => (
                        <tr key={s.id} className="table-row-hover border-t border-surface-border">
                          <td className="px-4 py-3 max-w-[260px]">
                            {editingId === s.id ? (
                              <input
                                type="text"
                                value={editingValue}
                                disabled={savingIds.has(s.id)}
                                autoFocus
                                onChange={(e) => setEditingValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") void handleTitleSave(s.id);
                                  if (e.key === "Escape") setEditingId(null);
                                }}
                                onBlur={() => void handleTitleSave(s.id)}
                                className="w-full bg-surface-raised border border-surface-border rounded px-2 py-0.5 text-xs text-zinc-200 focus:outline-none focus:border-brand-600 disabled:opacity-50"
                              />
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleTitleClick(s)}
                                className="text-left text-xs text-zinc-300 hover:text-zinc-100 truncate w-full transition-colors"
                                title="클릭해서 제목 편집"
                              >
                                {getSessionTitle(s.custom_title, s.first_prompt)}
                              </button>
                            )}
                          </td>
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
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
