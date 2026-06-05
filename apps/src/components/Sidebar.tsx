"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/", label: "Home", icon: "⬡" },
  { href: "/usage", label: "Usage", icon: "◈" },
  { href: "/sessions", label: "Sessions", icon: "◇" },
  { href: "/prompts", label: "Prompts", icon: "◉" },
  { href: "/projects", label: "Projects", icon: "◎" },
];

const bottomItems = [{ href: "/settings", label: "Settings", icon: "⚙" }];

const BASE_ITEM =
  "flex items-center gap-2.5 px-3 py-2 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-surface-raised transition-colors duration-150 text-sm font-medium";
const ACTIVE_ITEM =
  "text-zinc-100 bg-surface-raised border-l-2 border-l-brand-500 pl-[10px]";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside className="w-56 flex-shrink-0 h-screen bg-surface-card border-r border-surface-border flex flex-col">
      <div className="px-4 py-5 border-b border-surface-border">
        <span className="text-sm font-semibold text-zinc-100 tracking-tight">Costflow</span>
      </div>

      <nav className="flex-1 px-2 py-4 flex flex-col gap-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`${BASE_ITEM} ${isActive(pathname, item.href) ? ACTIVE_ITEM : ""}`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="px-2 py-4 border-t border-surface-border flex flex-col gap-1">
        {bottomItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`${BASE_ITEM} ${isActive(pathname, item.href) ? ACTIVE_ITEM : ""}`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
        <div className="border-t border-surface-border mt-2 pt-2">
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 text-sm font-medium"
          >
            <span>⏻</span>
            <span>로그아웃</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
