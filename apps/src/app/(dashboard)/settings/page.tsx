"use client";

import { useEffect, useState } from "react";

import EmptyState from "@/components/EmptyState";
import TableSkeleton from "@/components/TableSkeleton";
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
    <main className="max-w-[960px] mx-auto py-10 px-6">
      <h1 className="text-2xl font-bold text-slate-100">Settings</h1>

      <section className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-slate-200 font-semibold text-sm uppercase tracking-wide">
            API Keys
          </h2>
          <button
            type="button"
            onClick={() => setShowCreateForm((v) => !v)}
            disabled={creating}
            className="btn-primary text-sm py-1.5"
          >
            {showCreateForm ? "취소" : "새 API Key 발급"}
          </button>
        </div>

        {showCreateForm ? (
          <form onSubmit={(e) => void handleCreateKey(e)} className="flex gap-2 mt-4 mb-4">
            <input
              type="text"
              placeholder="API Key 이름"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              maxLength={200}
              required
              autoFocus
              className="input-field max-w-xs"
            />
            <button type="submit" disabled={creating || !newKeyName.trim()} className="btn-primary">
              {creating ? "발급 중..." : "발급"}
            </button>
          </form>
        ) : null}

        {error ? <p className="text-red-400 text-sm mb-3">{error}</p> : null}

        {loadingKeys ? (
          <TableSkeleton rows={3} cols={4} />
        ) : keys.length === 0 ? (
          <EmptyState message="발급된 API key가 없습니다." />
        ) : (
          <div className="divide-y divide-white/10 rounded-xl border border-white/10 overflow-hidden">
            {keys.map((key) => (
              <div
                key={key.id}
                className="bg-surface-card px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-4 min-w-0 flex-wrap">
                  <span className="text-slate-200 font-medium text-sm">{key.name}</span>
                  <span className="font-mono text-xs bg-black/30 border border-white/10 px-2 py-1 rounded text-slate-400">
                    {key.key_prefix}...
                  </span>
                  <span className="text-slate-500 text-xs">
                    {new Date(key.created_at).toLocaleString()}
                  </span>
                  <span className={`text-xs ${key.is_active ? "text-emerald-400" : "text-slate-500"}`}>
                    {key.is_active ? "활성" : "비활성"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => void handleDeleteKey(key.id)}
                  disabled={deletingIds.has(key.id)}
                  className="text-slate-600 hover:text-red-400 text-xs px-2 py-1 rounded hover:bg-red-500/10 transition-all shrink-0"
                >
                  {deletingIds.has(key.id) ? "삭제 중..." : "삭제"}
                </button>
              </div>
            ))}
          </div>
        )}

        {newKeyPlain ? (
          <div className="mt-6 bg-surface-card border border-brand-500/30 rounded-xl p-5">
            <p className="text-amber-400 text-sm font-medium mb-3">
              이 키는 지금만 볼 수 있습니다. 안전한 곳에 저장하세요.
            </p>
            <code className="font-mono text-xs bg-black/30 border border-white/10 px-3 py-2 rounded block text-slate-300 break-all">
              {newKeyPlain}
            </code>
            <div className="flex gap-2 items-center mt-3">
              <button
                type="button"
                onClick={() => void handleCopyKey()}
                className="text-brand-400 hover:text-brand-300 text-xs px-2 py-1 rounded hover:bg-brand-500/10 transition-all"
              >
                복사
              </button>
              {copyStatus === "copied" ? (
                <span className="text-emerald-400 text-xs">복사됨</span>
              ) : copyStatus === "failed" ? (
                <span className="text-red-400 text-xs">복사 실패 — 수동으로 복사하세요</span>
              ) : null}
              <button
                type="button"
                onClick={() => setNewKeyPlain(null)}
                className="btn-ghost text-xs py-1 px-3"
              >
                확인했습니다
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
