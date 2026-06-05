"use client";

import { useEffect, useState } from "react";

import type { Project } from "@/types/project";
import type { ToolCallStat } from "@/types/tool-call";
import type { DailyUsage } from "@/types/usage";

const DAYS_OPTIONS = [7, 30, 90] as const;
type DaysOption = (typeof DAYS_OPTIONS)[number];

export default function UsagePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [usage, setUsage] = useState<DailyUsage[]>([]);
  const [toolStats, setToolStats] = useState<ToolCallStat[]>([]);
  const [days, setDays] = useState<DaysOption>(30);
  const [projectId, setProjectId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      setLoading(true);
      setError(null);
      try {
        const [projectsRes, usageRes, toolRes] = await Promise.all([
          fetch("/api/projects"),
          fetch("/api/usage?days=30"),
          fetch("/api/tool-calls?days=30").catch(() => null),
        ]);
        const projectsBody = (await projectsRes.json()) as {
          projects?: Project[];
          error?: string;
        };
        const usageBody = (await usageRes.json()) as {
          usage?: DailyUsage[];
          error?: string;
        };
        if (!projectsRes.ok) throw new Error(projectsBody.error ?? "프로젝트 목록을 불러오지 못했습니다.");
        if (!usageRes.ok) throw new Error(usageBody.error ?? "사용량 데이터를 불러오지 못했습니다.");
        setProjects(projectsBody.projects ?? []);
        setUsage(usageBody.usage ?? []);
        if (toolRes?.ok) {
          const toolBody = (await toolRes.json()) as { tool_calls?: ToolCallStat[] };
          setToolStats(toolBody.tool_calls ?? []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    }
    void init();
  }, []);

  async function fetchUsage(nextDays: DaysOption, nextProjectId: string) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ days: String(nextDays) });
      if (nextProjectId) params.set("project_id", nextProjectId);
      const [res, toolRes] = await Promise.all([
        fetch(`/api/usage?${params.toString()}`),
        fetch(`/api/tool-calls?${params.toString()}`).catch(() => null),
      ]);
      const body = (await res.json()) as { usage?: DailyUsage[]; error?: string };
      if (!res.ok) throw new Error(body.error ?? "사용량 데이터를 불러오지 못했습니다.");
      setUsage(body.usage ?? []);
      if (toolRes?.ok) {
        const toolBody = (await toolRes.json()) as { tool_calls?: ToolCallStat[] };
        setToolStats(toolBody.tool_calls ?? []);
      } else {
        setToolStats([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  function handleDaysChange(nextDays: DaysOption) {
    setDays(nextDays);
    void fetchUsage(nextDays, projectId);
  }

  function handleProjectChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nextProjectId = e.target.value;
    setProjectId(nextProjectId);
    void fetchUsage(days, nextProjectId);
  }

  const sortedUsage = [...usage].sort((a, b) => b.date.localeCompare(a.date));

  const totals = usage.reduce(
    (acc, row) => ({
      input_tokens: acc.input_tokens + row.input_tokens,
      output_tokens: acc.output_tokens + row.output_tokens,
      cache_creation_tokens: acc.cache_creation_tokens + row.cache_creation_tokens,
      cache_read_tokens: acc.cache_read_tokens + row.cache_read_tokens,
    }),
    { input_tokens: 0, output_tokens: 0, cache_creation_tokens: 0, cache_read_tokens: 0 },
  );

  return (
    <main style={{ maxWidth: "960px", margin: "40px auto", padding: "0 24px" }}>
      <h1>Usage</h1>

      <div style={{ display: "flex", gap: "16px", alignItems: "center", marginTop: "24px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: "8px" }}>
          {DAYS_OPTIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => handleDaysChange(d)}
              style={{
                padding: "6px 14px",
                fontWeight: days === d ? "bold" : "normal",
                background: days === d ? "#0070f3" : undefined,
                color: days === d ? "#fff" : undefined,
                border: "1px solid #ccc",
                cursor: "pointer",
              }}
            >
              {d}일
            </button>
          ))}
        </div>

        <select
          value={projectId}
          onChange={handleProjectChange}
          style={{ padding: "6px 10px", border: "1px solid #ccc" }}
        >
          <option value="">전체 프로젝트</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {error ? <p style={{ color: "#b00020", marginTop: "16px" }}>{error}</p> : null}

      <div style={{ display: "flex", gap: "16px", marginTop: "24px", flexWrap: "wrap" }}>
        <SummaryCard label="Input Tokens" value={totals.input_tokens} />
        <SummaryCard label="Output Tokens" value={totals.output_tokens} />
        <SummaryCard label="Cache Creation Tokens" value={totals.cache_creation_tokens} />
        <SummaryCard label="Cache Read Tokens" value={totals.cache_read_tokens} />
      </div>

      <div style={{ marginTop: "32px" }}>
        {loading ? (
          <p>불러오는 중...</p>
        ) : sortedUsage.length === 0 ? (
          <p>아직 수집된 데이터가 없습니다.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>날짜</th>
                <th style={thStyle}>Input</th>
                <th style={thStyle}>Output</th>
                <th style={thStyle}>Cache Creation</th>
                <th style={thStyle}>Cache Read</th>
              </tr>
            </thead>
            <tbody>
              {sortedUsage.map((row) => (
                <tr key={row.date}>
                  <td style={tdStyle}>{row.date}</td>
                  <td style={tdStyle}>{row.input_tokens.toLocaleString()}</td>
                  <td style={tdStyle}>{row.output_tokens.toLocaleString()}</td>
                  <td style={tdStyle}>{row.cache_creation_tokens.toLocaleString()}</td>
                  <td style={tdStyle}>{row.cache_read_tokens.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ marginTop: "40px" }}>
        <h2>Tool 사용량</h2>
        {toolStats.length === 0 ? (
          <p>수집된 tool 데이터가 없습니다.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "12px" }}>
            <thead>
              <tr>
                <th style={thStyle}>Tool 이름</th>
                <th style={thStyle}>횟수</th>
              </tr>
            </thead>
            <tbody>
              {toolStats.map((t) => (
                <tr key={t.tool_name}>
                  <td style={tdStyle}>{t.tool_name}</td>
                  <td style={tdStyle}>{t.count.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        border: "1px solid #ddd",
        padding: "16px 20px",
        minWidth: "160px",
      }}
    >
      <div style={{ fontSize: "13px", color: "#666" }}>{label}</div>
      <div style={{ fontSize: "22px", fontWeight: "bold", marginTop: "4px" }}>
        {value.toLocaleString()}
      </div>
    </div>
  );
}

const thStyle = {
  borderBottom: "2px solid #ddd",
  padding: "10px",
  textAlign: "left",
  whiteSpace: "nowrap",
} satisfies React.CSSProperties;

const tdStyle = {
  borderBottom: "1px solid #ddd",
  padding: "10px",
  textAlign: "left",
} satisfies React.CSSProperties;
