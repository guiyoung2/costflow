import { createHash, randomBytes } from "node:crypto";

import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import type { ApiKey } from "@/types/api-key";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("api_keys")
    .select("id, name, key_prefix, is_active, last_used_at, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ keys: (data ?? []) as ApiKey[] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body: unknown = await request.json().catch(() => null);
  const name =
    body && typeof body === "object" && "name" in body
      ? String(body.name).trim()
      : "";

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  if (name.length > 200) {
    return NextResponse.json({ error: "name is too long (max 200 chars)" }, { status: 400 });
  }

  const plainKey = randomBytes(32).toString("hex");
  const keyHash = createHash("sha256").update(plainKey).digest("hex");
  const keyPrefix = plainKey.slice(0, 8);

  const { data, error } = await supabase
    .from("api_keys")
    .insert({
      user_id: user.id,
      name,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      is_active: true,
    })
    .select("id, name, key_prefix, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    id: data.id,
    name: data.name,
    key_prefix: data.key_prefix,
    plain_key: plainKey,
    created_at: data.created_at,
  });
}
