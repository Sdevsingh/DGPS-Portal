import { NextRequest, NextResponse } from "next/server";
import { findRow, updateRow } from "@/lib/sheets";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const { token, password } = await req.json();
  if (!token || !password) {
    return NextResponse.json({ error: "token and password required" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const reset = await findRow("PasswordResets", (r) => r.token === token && r.used !== "true");
  if (!reset) {
    return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });
  }
  if (new Date(reset.expiresAt) < new Date()) {
    return NextResponse.json({ error: "Reset link has expired. Please request a new one." }, { status: 400 });
  }

  const user = await findRow("Users", (r) => r.email === reset.email && r.isActive === "true");
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await updateRow("Users", user.id, { passwordHash });
  await updateRow("PasswordResets", reset.id, { used: "true" });

  return NextResponse.json({ ok: true });
}
