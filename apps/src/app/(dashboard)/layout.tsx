import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen bg-surface">
      <Sidebar />
      <div className="flex-1 min-w-0 overflow-y-auto bg-surface">
        <div className="p-6 md:p-8 animate-fade-in">{children}</div>
      </div>
    </div>
  );
}
