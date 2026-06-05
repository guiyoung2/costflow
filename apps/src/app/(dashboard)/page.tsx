"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { Project } from "@/types/project";
import type { DailyUsage } from "@/types/usage";

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [usage, setUsage] = useState<DailyUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      setLoading(true);
      setError(null);
      try {
        const [projectsRes, usageRes] = await Promise.all([
          fetch("/api/projects"),
          fetch("/api/usage?days=30"),
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
      } catch (err) {
        setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    }
    void init();
  }, []);

  const totals = usage.reduce(
    (acc, row) => ({
      input_tokens: acc.input_tokens + row.input_tokens,
      output_tokens: acc.output_tokens + row.output_tokens,
      cache_tokens: acc.cache_tokens + row.cache_creation_tokens + row.cache_read_tokens,
    }),
    { input_tokens: 0, output_tokens: 0, cache_tokens: 0 },
  );

  const recentProjects = projects.slice(0, 5);

  return (
    <main style={{ maxWidth: "960px", margin: "40px auto", padding: "0 24px" }}>
      <h1>Costflow</h1>

      {error ? <p style={{ color: "#b00020", marginTop: "16px" }}>{error}</p> : null}

      <div style={{ display: "flex", gap: "16px", marginTop: "24px", flexWrap: "wrap" }}>
        <SummaryCard label="연결된 프로젝트" value={projects.length} unit="개" />
        <SummaryCard label="Input Tokens (30일)" value={totals.input_tokens} />
        <SummaryCard label="Output Tokens (30일)" value={totals.output_tokens} />
        <SummaryCard
          label="Cache Tokens (30일)"
          value={totals.cache_tokens}
          note="상세 분리는 /usage 페이지 참조"
        />
      </div>

      <section style={{ marginTop: "40px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0 }}>연결된 프로젝트</h2>
          {projects.length > 0 ? (
            <Link href="/projects" style={{ fontSize: "14px", color: "#0070f3" }}>
              전체 보기 →
            </Link>
          ) : null}
        </div>

        {loading ? (
          <p style={{ marginTop: "16px" }}>불러오는 중...</p>
        ) : projects.length === 0 ? (
          <div style={{ marginTop: "16px", padding: "24px", border: "1px solid #ddd" }}>
            <p style={{ margin: 0 }}>연결된 프로젝트가 없습니다.</p>
            <p style={{ marginTop: "8px", fontSize: "14px", color: "#666" }}>
              Settings 페이지에서 API key를 발급한 뒤, CLI로 연결하세요:
            </p>
            <pre style={{ marginTop: "8px", padding: "12px", background: "#f5f5f5", fontSize: "13px" }}>
              {`npm install -g costflow\ncostflow init`}
            </pre>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "16px" }}>
            <thead>
              <tr>
                <th style={thStyle}>프로젝트</th>
                <th style={thStyle}>세션 수</th>
                <th style={thStyle}>마지막 활동</th>
              </tr>
            </thead>
            <tbody>
              {recentProjects.map((p) => (
                <tr key={p.id}>
                  <td style={tdStyle}>
                    <Link href="/projects" style={{ color: "#0070f3" }}>
                      {p.name}
                    </Link>
                  </td>
                  <td style={tdStyle}>{p.session_count}</td>
                  <td style={tdStyle}>
                    {p.last_active_at ? new Date(p.last_active_at).toLocaleDateString("ko-KR") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  unit,
  note,
}: {
  label: string;
  value: number;
  unit?: string;
  note?: string;
}) {
  return (
    <div style={{ border: "1px solid #ddd", padding: "16px 20px", minWidth: "160px" }}>
      <div style={{ fontSize: "13px", color: "#666" }}>{label}</div>
      <div style={{ fontSize: "22px", fontWeight: "bold", marginTop: "4px" }}>
        {value.toLocaleString()}
        {unit ? <span style={{ fontSize: "14px", fontWeight: "normal" }}> {unit}</span> : null}
      </div>
      {note ? <div style={{ fontSize: "11px", color: "#999", marginTop: "4px" }}>{note}</div> : null}
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
