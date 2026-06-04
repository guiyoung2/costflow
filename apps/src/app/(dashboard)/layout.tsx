import { redirect } from "next/navigation";
import NavBar from "@/components/NavBar";
import { createClient } from "@/lib/supabase/server";

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
    <>
      <NavBar email={user.email ?? ""} />
      {children}
    </>
  );
}
