"use client";

import { useEffect, useState } from "react";

import type { ApiKey } from "@/types/api-key";

type CreateKeyResponse = {
  id: string;
  name: string;
  key_prefix: string;
  plain_key: string;
  created_at: string;
};

export default function SettingsPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [newKeyPlain, setNewKeyPlain] = useState<string | null>(null);
  const [loadingKeys, setLoadingKeys] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");

  async function loadKeys() {
    setLoadingKeys(true);
    setError(null);

    try {
      const response = await fetch("/api/api-keys");
      const body = (await response.json()) as { keys?: ApiKey[]; error?: string };

      if (!response.ok) {
        throw new Error(body.error ?? "API key 목록을 불러오지 못했습니다.");
      }

      setKeys(body.keys ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setLoadingKeys(false);
    }
  }

  useEffect(() => {
    void loadKeys();
  }, []);

  async function handleCreateKey(e: React.FormEvent) {
    e.preventDefault();
    const name = newKeyName.trim();
    if (!name) return;

    setCreating(true);
    setError(null);

    try {
      const response = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const body = (await response.json()) as CreateKeyResponse & { error?: string };

      if (!response.ok) {
        throw new Error(body.error ?? "API key를 발급하지 못했습니다.");
      }

      setNewKeyPlain(body.plain_key);
      setShowCreateForm(false);
      setNewKeyName("");
      await loadKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setCreating(false);
    }
  }

  async function handleCopyKey() {
    if (!newKeyPlain) return;

    try {
      await navigator.clipboard.writeText(newKeyPlain);
      setCopyStatus("copied");
      setTimeout(() => setCopyStatus("idle"), 2000);
    } catch {
      setCopyStatus("failed");
    }
  }

  async function handleDeleteKey(id: string) {
    setDeletingIds((prev) => new Set(prev).add(id));
    setError(null);

    try {
      const response = await fetch(`/api/api-keys/${id}`, { method: "DELETE" });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? "API key를 삭제하지 못했습니다.");
      }

      setKeys((current) => current.filter((key) => key.id !== id));
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
      <h1>Settings</h1>

      <section style={{ marginTop: "32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <h2 style={{ margin: 0 }}>API Keys</h2>
          <button
            type="button"
            onClick={() => setShowCreateForm((v) => !v)}
            disabled={creating}
          >
            {showCreateForm ? "취소" : "새 API Key 발급"}
          </button>
        </div>

        {showCreateForm ? (
          <form
            onSubmit={(e) => void handleCreateKey(e)}
            style={{ marginTop: "16px", display: "flex", gap: "8px", alignItems: "center" }}
          >
            <input
              type="text"
              placeholder="API Key 이름"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              maxLength={200}
              required
              autoFocus
              style={{ padding: "6px 10px", flex: "1", maxWidth: "320px" }}
            />
            <button type="submit" disabled={creating || !newKeyName.trim()}>
              {creating ? "발급 중..." : "발급"}
            </button>
          </form>
        ) : null}

        {error ? <p style={{ color: "#b00020" }}>{error}</p> : null}

        <table
          style={{
            width: "100%",
            marginTop: "20px",
            borderCollapse: "collapse",
          }}
        >
          <thead>
            <tr>
              <th style={cellStyle}>이름</th>
              <th style={cellStyle}>Prefix</th>
              <th style={cellStyle}>발급일</th>
              <th style={cellStyle}>상태</th>
              <th style={cellStyle}>삭제</th>
            </tr>
          </thead>
          <tbody>
            {loadingKeys ? (
              <tr>
                <td style={cellStyle} colSpan={5}>
                  불러오는 중...
                </td>
              </tr>
            ) : keys.length === 0 ? (
              <tr>
                <td style={cellStyle} colSpan={5}>
                  발급된 API key가 없습니다.
                </td>
              </tr>
            ) : (
              keys.map((key) => (
                <tr key={key.id}>
                  <td style={cellStyle}>{key.name}</td>
                  <td style={cellStyle}>{key.key_prefix}</td>
                  <td style={cellStyle}>{new Date(key.created_at).toLocaleString()}</td>
                  <td style={cellStyle}>{key.is_active ? "활성" : "비활성"}</td>
                  <td style={cellStyle}>
                    <button
                      type="button"
                      onClick={() => void handleDeleteKey(key.id)}
                      disabled={deletingIds.has(key.id)}
                    >
                      {deletingIds.has(key.id) ? "삭제 중..." : "삭제"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {newKeyPlain ? (
          <section
            style={{
              marginTop: "24px",
              padding: "16px",
              border: "1px solid #ddd",
            }}
          >
            <p>이 키는 지금만 볼 수 있습니다. 안전한 곳에 저장하세요.</p>
            <pre style={{ overflowX: "auto" }}>{newKeyPlain}</pre>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <button type="button" onClick={() => void handleCopyKey()}>
                복사
              </button>
              {copyStatus === "copied" ? (
                <span style={{ color: "#007700" }}>복사됨</span>
              ) : copyStatus === "failed" ? (
                <span style={{ color: "#b00020" }}>복사 실패 — 수동으로 복사하세요</span>
              ) : null}
              <button type="button" onClick={() => setNewKeyPlain(null)}>
                확인했습니다
              </button>
            </div>
          </section>
        ) : null}
      </section>
    </main>
  );
}

const cellStyle = {
  borderBottom: "1px solid #ddd",
  padding: "10px",
  textAlign: "left",
} satisfies React.CSSProperties;
