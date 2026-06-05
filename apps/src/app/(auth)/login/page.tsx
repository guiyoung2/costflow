"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    window.location.href = "/auth/callback?next=/";
  }

  return (
    <div className="glass rounded-2xl p-8 w-full max-w-md shadow-card animate-slide-up">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-white mb-2">Costflow</h1>
        <p className="text-slate-400 text-sm">다시 만나서 반갑습니다. 로그인해주세요.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">이메일</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
            className="input-field"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">비밀번호</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
            className="input-field"
          />
        </div>
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          className={`btn-primary w-full ${loading ? "opacity-70 cursor-not-allowed" : ""}`}
        >
          {loading ? "로그인 중..." : "로그인"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-400">
        계정이 없으신가요?{" "}
        <Link href="/signup" className="text-brand-400 hover:text-brand-300 font-medium">
          회원가입
        </Link>
      </p>
    </div>
  );
}
