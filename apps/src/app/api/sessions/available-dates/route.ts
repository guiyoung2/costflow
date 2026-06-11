import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("project_id");
  const agent = searchParams.get("agent");

  let query = supabase
    .from("sessions")
    .select("started_at")
    .not("started_at", "is", null);

  if (projectId) {
    query = query.eq("project_id", projectId);
  }
  if (agent) {
    query = query.eq("agent", agent);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const dateSet = new Set(
    (data ?? []).map((s) => (s.started_at as string).slice(0, 10))
  );

  const dates = [...dateSet].sort((a, b) => b.localeCompare(a));

  return NextResponse.json({ dates });
}
