"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type NavBarProps = { email: string };

export default function NavBar({ email }: NavBarProps) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      alert("로그아웃에 실패했습니다. 다시 시도해주세요.");
      return;
    }
    router.push("/login");
  }

  return (
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        gap: "16px",
        padding: "16px 24px",
        borderBottom: "1px solid #ddd",
      }}
    >
      <strong style={{ marginRight: "16px" }}>Costflow</strong>
      <Link href="/">Home</Link>
      <Link href="/projects">Projects</Link>
      <Link href="/usage">Usage</Link>
      <Link href="/sessions">Sessions</Link>
      <Link href="/prompts">Prompts</Link>
      <Link href="/settings">Settings</Link>
      <span style={{ marginLeft: "auto", color: "#555" }}>{email}</span>
      <button type="button" onClick={() => void handleSignOut()}>
        로그아웃
      </button>
    </nav>
  );
}
