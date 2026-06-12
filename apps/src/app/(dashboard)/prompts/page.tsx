"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DayPicker } from "react-day-picker";

import type { Project } from "@/types/project";
import type { Prompt } from "@/types/prompt";

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

function renderContent(prompt: string | null, expanded: boolean) {
  if (prompt === null) return <span className="text-zinc-500 italic">[metadata only]</span>;
  if (prompt === "[redacted]") return <em className="text-zinc-500">[redacted]</em>;
  const text = !expanded && prompt.length > 200 ? prompt.slice(0, 200) + "…" : prompt;
  return <span className="whitespace-pre-wrap break-words">{text}</span>;
}

export default function PromptsPage() {
  const searchParams = useSearchParams();

  const [view, setView] = useState<"grid" | "list">("grid");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedProjectName, setSelectedProjectName] = useState<string>("");

  const [projects, setProjects] = useState<Project[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [promptsLoading, setPromptsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [availableDates, setAvailableDates] = useState<Date[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const [agentFilter, setAgentFilter] = useState<AgentFilter>(null);
  const [collapsedSessions, setCollapsedSessions] = useState<Set<string>>(new Set());

  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");
  const [savingSessionIds, setSavingSessionIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function init() {
      setProjectsLoading(true);
      try {
        const res = await fetch("/api/projects");
        const body = (await res.json()) as { projects?: Project[]; error?: string };
        if (!res.ok) throw new Error(body.error ?? "프로젝트 목록을 불러오지 못했습니다.");
        const list = body.projects ?? [];
        setProjects(list);

        const pid = searchParams.get("project_id");
        if (pid) {
          const proj = list.find((p) => p.id === pid);
          setSelectedProjectId(pid);
          setSelectedProjectName(proj?.name ?? "프로젝트");
          setView("list");
          void loadPrompts(pid, null, null);
          void loadAvailableDates(pid, null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "알 수 없는 오류");
      } finally {
        setProjectsLoading(false);
      }
    }
    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadAvailableDates(projectId: string | null, agent: AgentFilter) {
    const params = new URLSearchParams();
    if (projectId) params.set("project_id", projectId);
    if (agent) params.set("agent", agent);
    const qs = params.toString();
    try {
      const res = await fetch(qs ? `/api/prompts/available-dates?${qs}` : "/api/prompts/available-dates");
      const body = (await res.json()) as { dates?: string[]; error?: string };
      if (res.ok && body.dates) {
        setAvailableDates(body.dates.map((d) => new Date(d + "T00:00:00")));
      }
    } catch {
      // 날짜 로드 실패해도 달력은 표시 (모든 날짜 활성)
    }
  }

  async function loadPrompts(projectId: string | null, date: string | null, agent: AgentFilter) {
    setPromptsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (projectId) params.set("project_id", projectId);
      if (date) params.set("date", date);
      if (agent) params.set("agent", agent);
      const qs = params.toString();
      const res = await fetch(qs ? `/api/prompts?${qs}` : "/api/prompts");
      const body = (await res.json()) as { prompts?: Prompt[]; error?: string };
      if (!res.ok) throw new Error(body.error ?? "프롬프트를 불러오지 못했습니다.");
      setPrompts(body.prompts ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류");
    } finally {
      setPromptsLoading(false);
    }
  }

  function handleProjectClick(project: Project) {
    setSelectedProjectId(project.id);
    setSelectedProjectName(project.name);
    setAgentFilter(null);
    setSelectedDate(null);
    setAvailableDates([]);
    setExpandedIds(new Set());
    setCollapsedSessions(new Set());
    setView("list");
    void loadPrompts(project.id, null, null);
    void loadAvailableDates(project.id, null);
  }

  function handleAllClick() {
    setSelectedProjectId(null);
    setSelectedProjectName("전체 프롬프트");
    setAgentFilter(null);
    setSelectedDate(null);
    setAvailableDates([]);
    setExpandedIds(new Set());
    setCollapsedSessions(new Set());
    setView("list");
    void loadPrompts(null, null, null);
    void loadAvailableDates(null, null);
  }

  function handleAgentChange(nextAgent: AgentFilter) {
    setAgentFilter(nextAgent);
    setSelectedDate(null);
    setCollapsedSessions(new Set());
    void loadPrompts(selectedProjectId, null, nextAgent);
    void loadAvailableDates(selectedProjectId, nextAgent);
  }

  function handleDateSelect(date: Date | undefined) {
    const next = date ?? null;
    setSelectedDate(next);
    setCollapsedSessions(new Set());
    if (next) {
      const yyyy = next.getFullYear();
      const mm = String(next.getMonth() + 1).padStart(2, "0");
      const dd = String(next.getDate()).padStart(2, "0");
      void loadPrompts(selectedProjectId, `${yyyy}-${mm}-${dd}`, agentFilter);
    } else {
      void loadPrompts(selectedProjectId, null, agentFilter);
    }
  }

  function handleClearDate() {
    setSelectedDate(null);
    void loadPrompts(selectedProjectId, null, agentFilter);
  }

  function handleBack() {
    setView("grid");
    setSelectedProjectId(null);
    setSelectedProjectName("");
    setPrompts([]);
    setAgentFilter(null);
    setSelectedDate(null);
    setAvailableDates([]);
    setExpandedIds(new Set());
    setCollapsedSessions(new Set());
  }

  function toggleSession(sessionId: string) {
    setCollapsedSessions((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) next.delete(sessionId);
      else next.add(sessionId);
      return next;
    });
  }

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function startEditingSession(sessionId: string, currentTitle: string | null) {
    setEditingSessionId(sessionId);
    setEditingValue(currentTitle ?? "");
  }

  async function saveSessionTitle(sessionId: string) {
    if (savingSessionIds.has(sessionId)) return;
    setEditingSessionId(null);

    const trimmed = editingValue.trim() || null;
    setSavingSessionIds((prev) => new Set(prev).add(sessionId));
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ custom_title: trimmed }),
      });
      if (res.ok) {
        setPrompts((prev) =>
          prev.map((p) =>
            p.session_id === sessionId ? { ...p, session_title: trimmed } : p
          )
        );
      }
    } finally {
      setSavingSessionIds((prev) => {
        const next = new Set(prev);
        next.delete(sessionId);
        return next;
      });
    }
  }

  // session_id 첫 등장 순서 기준으로 세션 그룹핑 (이미 created_at desc 정렬)
  function groupBySession(promptList: Prompt[]): {
    sessionId: string;
    sessionTitle: string | null;
    firstTimestamp: string;
    items: Prompt[];
  }[] {
    const order: string[] = [];
    const map: Record<string, { sessionTitle: string | null; firstTimestamp: string; items: Prompt[] }> = {};
    for (const p of promptList) {
      if (!map[p.session_id]) {
        order.push(p.session_id);
        map[p.session_id] = {
          sessionTitle: p.session_title,
          firstTimestamp: p.timestamp,
          items: [],
        };
      }
      map[p.session_id].items.push(p);
    }
    return order.map((sid) => ({ sessionId: sid, ...map[sid] }));
  }

  // ── Grid view ──────────────────────────────────────────────
  if (view === "grid") {
    return (
      <main className="max-w-[960px] mx-auto py-10 px-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">Prompts</h1>
            <p className="text-zinc-500 text-sm mt-1">프로젝트를 선택해 프롬프트 내역을 확인하세요.</p>
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
    <main className="max-w-[960px] mx-auto py-10 px-6">
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

        {/* 프롬프트 목록 */}
        <div className="min-w-0">
          {promptsLoading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="card rounded-xl h-20 bg-surface-raised animate-pulse" />
              ))}
            </div>
          ) : prompts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
              <p>해당 날짜에 프롬프트 기록이 없습니다.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {groupBySession(prompts).map((group) => {
                const isEditing = editingSessionId === group.sessionId;
                const isSaving = savingSessionIds.has(group.sessionId);
                const isCollapsed = collapsedSessions.has(group.sessionId);
                return (
                  <div key={group.sessionId}>
                    {/* 세션 그룹 헤더 */}
                    <div className="flex items-center gap-2 py-3 border-b border-surface-border mb-2">
                      <button
                        type="button"
                        onClick={() => toggleSession(group.sessionId)}
                        className="text-zinc-600 hover:text-zinc-300 transition-colors shrink-0 w-4 text-xs"
                      >
                        {isCollapsed ? "▶" : "▼"}
                      </button>
                      {isEditing ? (
                        <input
                          autoFocus
                          className="flex-1 bg-transparent text-zinc-100 font-semibold text-sm outline-none border-b border-brand-600 pb-0.5"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") void saveSessionTitle(group.sessionId);
                            if (e.key === "Escape") setEditingSessionId(null);
                          }}
                          onBlur={() => void saveSessionTitle(group.sessionId)}
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEditingSession(group.sessionId, group.sessionTitle)}
                          className="flex-1 text-left text-zinc-100 font-semibold text-sm hover:text-zinc-300 transition-colors truncate"
                          disabled={isSaving}
                        >
                          {group.sessionTitle ?? "(제목 없음)"}
                        </button>
                      )}
                      <span className="text-zinc-600 text-xs tabular-nums shrink-0">
                        {new Date(group.firstTimestamp).toLocaleString()}
                      </span>
                      <span className="text-zinc-700 text-xs shrink-0">·</span>
                      <span className="text-zinc-600 text-xs shrink-0">{group.items.length} turns</span>
                    </div>

                    {/* 세션 내 프롬프트 카드 */}
                    {!isCollapsed && <div className="flex flex-col gap-2">
                      {group.items.map((p) => {
                        const isExpanded = expandedIds.has(p.id);
                        const isLong =
                          typeof p.prompt === "string" &&
                          p.prompt !== "[redacted]" &&
                          p.prompt.length > 200;
                        return (
                          <div key={p.id} className="card rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2.5">
                              <span className="text-zinc-600 text-xs tabular-nums shrink-0">
                                {new Date(p.timestamp).toLocaleString()}
                              </span>
                              {!selectedProjectId && (
                                <>
                                  <span className="text-zinc-700 text-xs">·</span>
                                  <span className="text-zinc-500 text-xs truncate">{p.project_name}</span>
                                </>
                              )}
                              {p.turn_index !== null && (
                                <>
                                  <span className="text-zinc-700 text-xs">·</span>
                                  <span className="text-zinc-600 text-xs">turn {p.turn_index}</span>
                                </>
                              )}
                            </div>
                            <div className="font-mono text-sm bg-surface border border-surface-border p-3 rounded-lg text-zinc-300">
                              {renderContent(p.prompt, isExpanded)}
                            </div>
                            {isLong && (
                              <button
                                type="button"
                                onClick={() => toggleExpand(p.id)}
                                className="mt-2 text-xs text-zinc-600 hover:text-zinc-300 transition-colors duration-150"
                              >
                                {isExpanded ? "접기 ↑" : "전체 보기 ↓"}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
