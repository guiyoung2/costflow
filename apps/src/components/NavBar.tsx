"use client";

import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type NavBarProps = { email: string };

export default function NavBar({ email }: NavBarProps) {
  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
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
      <Link href="/settings">Settings</Link>
      <span style={{ marginLeft: "auto", color: "#555" }}>{email}</span>
      <button type="button" onClick={handleSignOut}>
        로그아웃
      </button>
    </nav>
  );
}
