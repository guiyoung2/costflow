"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
  }

  return (
    <div className="glass rounded-2xl p-8 w-full max-w-md shadow-card animate-slide-up">
      {success ? (
        <div className="text-center py-4">
          <h2 className="text-xl font-semibold text-white mb-2">인증 메일을 발송했습니다</h2>
          <p className="text-slate-400 text-sm">받은편지함을 확인해주세요.</p>
          <p className="text-slate-500 text-xs mt-2">{email}</p>
        </div>
      ) : (
        <>
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-white mb-2">Costflow</h1>
            <p className="text-slate-400 text-sm">새 계정을 만들어주세요.</p>
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
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">비밀번호 확인</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
              {loading ? "처리 중..." : "회원가입"}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-400">
            이미 계정이 있으신가요?{" "}
            <Link href="/login" className="text-brand-400 hover:text-brand-300 font-medium">
              로그인
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
