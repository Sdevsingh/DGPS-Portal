import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { Resend } from "resend";
import crypto from "crypto";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id, email")
    .eq("email", email.toLowerCase())
    .eq("is_active", true)
    .single();

  // Always return success to prevent email enumeration
  if (!user) return NextResponse.json({ ok: true });

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  // Invalidate existing unused tokens
  await supabaseAdmin
    .from("password_resets")
    .update({ used: true })
    .eq("email", user.email)
    .eq("used", false);

  await supabaseAdmin.from("password_resets").insert({
    email: user.email,
    token,
    expires_at: expiresAt,
    used: false,
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;
  const toEmail = process.env.RESEND_TEST_EMAIL ?? user.email;

  const { error } = await resend.emails.send({
    from: `DGPS Operations <${process.env.RESEND_FROM ?? "onboarding@resend.dev"}>`,
    to: toEmail,
    subject: "Reset your password",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
        <h2 style="font-size:20px;font-weight:700;color:#111827;margin-bottom:8px;">Reset your password</h2>
        <p style="color:#6b7280;font-size:14px;margin-bottom:24px;">
          Click the button below to reset your password. This link expires in <strong>1 hour</strong>.
        </p>
        <a href="${resetUrl}" style="display:inline-block;background:#2563eb;color:#fff;font-weight:600;font-size:14px;padding:12px 24px;border-radius:10px;text-decoration:none;">
          Reset Password
        </a>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px;">
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `,
  });

  if (error) {
    console.error("[forgot-password] Resend error:", error);
    return NextResponse.json({ error: "Failed to send email. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
