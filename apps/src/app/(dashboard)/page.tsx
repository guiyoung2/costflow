import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main style={{ maxWidth: "960px", margin: "40px auto", padding: "0 24px" }}>
      <h1>Costflow</h1>
      <p>로그인 계정: {user.email}</p>
      <p>API key는 Settings 페이지에서 발급하세요.</p>
      <section style={{ marginTop: "32px" }}>
        <h2>연결된 프로젝트</h2>
        <p>0개</p>
      </section>
    </main>
  );
}
