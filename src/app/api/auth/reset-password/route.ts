import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const { token, password } = await req.json();
  if (!token || !password) {
    return NextResponse.json({ error: "token and password required" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const { data: reset } = await supabaseAdmin
    .from("password_resets")
    .select("*")
    .eq("token", token)
    .eq("used", false)
    .single();

  if (!reset) {
    return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });
  }
  if (new Date(reset.expires_at) < new Date()) {
    return NextResponse.json({ error: "Reset link has expired. Please request a new one." }, { status: 400 });
  }

  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("email", reset.email)
    .eq("is_active", true)
    .single();

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await supabaseAdmin.from("users").update({ password_hash: passwordHash }).eq("id", user.id);
  await supabaseAdmin.from("password_resets").update({ used: true }).eq("id", reset.id);

  return NextResponse.json({ ok: true });
}
