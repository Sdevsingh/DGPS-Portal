import { NextRequest, NextResponse } from "next/server";
import { findRow, appendRow } from "@/lib/sheets";
import { Resend } from "resend";
import crypto from "crypto";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  // Always return success to avoid email enumeration
  const user = await findRow("Users", (r) => r.email === email && r.isActive === "true");
  if (!user) return NextResponse.json({ ok: true });

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

  await appendRow("PasswordResets", { email, token, expiresAt, used: "false" });

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;

  const { error } = await resend.emails.send({
    from: "DGPS Operations <onboarding@resend.dev>",
    to: email,
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
