import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type Mode = "raw" | "redacted" | "metadata_only";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("prompt_storage_settings")
    .select("mode")
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json({ mode: (data?.mode as Mode) ?? "raw" });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { mode?: string };
  try {
    body = (await request.json()) as { mode?: string };
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const { mode } = body;
  if (mode !== "raw" && mode !== "redacted" && mode !== "metadata_only") {
    return NextResponse.json({ error: "invalid mode" }, { status: 400 });
  }

  const { error } = await supabase
    .from("prompt_storage_settings")
    .upsert({ user_id: user.id, mode }, { onConflict: "user_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ mode });
}
