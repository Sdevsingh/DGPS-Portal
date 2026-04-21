import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-server";
import { formatUser } from "@/lib/db";
import bcrypt from "bcryptjs";
import { Resend } from "resend";
import crypto from "crypto";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role, tenantId, assignedTenantIds } = session.user;

  if (role !== "super_admin" && role !== "operations_manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const requestedTenantId = req.nextUrl.searchParams.get("tenantId");

  let q = supabaseAdmin.from("users").select("*");

  if (role === "super_admin") {
    if (requestedTenantId) q = q.eq("tenant_id", requestedTenantId);
  } else {
    // Ops manager sees their tenant + assigned tenants
    const accessible = new Set([tenantId, ...(assignedTenantIds ?? [])]);
    q = q.in("tenant_id", Array.from(accessible));
  }

  const { data: users, error } = await q.order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json((users ?? []).map(formatUser));
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role, tenantId, assignedTenantIds } = session.user;

  // Super admin can create any user; ops manager can create technicians in their tenants
  if (role !== "super_admin" && role !== "operations_manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { name, email, phone, userRole, password } = body;

  if (!name || !email || !userRole) {
    return NextResponse.json({ error: "name, email, and role are required" }, { status: 400 });
  }

  // Ops manager can only create technicians
  if (role === "operations_manager" && userRole !== "technician") {
    return NextResponse.json({ error: "Operations managers can only create technician accounts" }, { status: 403 });
  }

  const useTenantId = body.tenantId || tenantId;

  // Ops manager can only create in accessible tenants
  if (role === "operations_manager") {
    const accessible = new Set([tenantId, ...(assignedTenantIds ?? [])]);
    if (!accessible.has(useTenantId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Check email uniqueness within tenant
  const { data: existing } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("tenant_id", useTenantId)
    .eq("email", email.toLowerCase())
    .single();

  if (existing) {
    return NextResponse.json({ error: "Email already in use for this company" }, { status: 409 });
  }

  const passwordHash = password ? await bcrypt.hash(password, 10) : null;

  const { data: user, error } = await supabaseAdmin
    .from("users")
    .insert({
      tenant_id: useTenantId,
      name,
      email: email.toLowerCase(),
      password_hash: passwordHash,
      role: userRole,
      phone: phone ?? null,
      is_active: true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Send welcome email with password setup link
  try {
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h

    await supabaseAdmin.from("password_resets").insert({
      email: email.toLowerCase(),
      token,
      expires_at: expiresAt,
      used: false,
    });

    const baseUrl = process.env.NEXTAUTH_URL ?? "https://dgps-portal.netlify.app";
    const setPasswordUrl = `${baseUrl}/reset-password?token=${token}`;
    const loginUrl = baseUrl;
    const toEmail = process.env.RESEND_TEST_EMAIL ?? email.toLowerCase();

    await resend.emails.send({
      from: `Domain Group Property Services <${process.env.RESEND_FROM ?? "noreply@dgps.com.au"}>`,
      replyTo: process.env.RESEND_REPLY_TO,
      to: toEmail,
      subject: "Welcome to DGPS Portal — Your access is ready",
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#f9fafb;">
          <div style="background:#fff;border-radius:16px;padding:32px;border:1px solid #e5e7eb;">
            <div style="margin-bottom:24px;">
              <h1 style="font-size:18px;font-weight:800;color:#1e3a5f;margin:0;">Domain Group</h1>
              <p style="font-size:12px;color:#6b7280;margin:2px 0 0;">Property Services Portal</p>
            </div>
            <h2 style="font-size:20px;font-weight:700;color:#111827;margin-bottom:8px;">Welcome, ${name}</h2>
            <p style="color:#6b7280;font-size:14px;margin-bottom:24px;line-height:1.6;">
              Your DGPS portal account has been created. Click below to set your password and get started.
            </p>

            <div style="background:#eff6ff;border-radius:12px;padding:20px;margin-bottom:24px;border:1px solid #dbeafe;">
              <p style="font-size:13px;font-weight:600;color:#1d4ed8;margin:0 0 6px;">Set Your Password</p>
              <p style="font-size:13px;color:#374151;margin:0 0 16px;line-height:1.6;">
                Use the button below to create your password. This link expires in <strong>24 hours</strong>.
              </p>
              <a href="${setPasswordUrl}" style="display:inline-block;background:#2563eb;color:#fff;font-weight:600;font-size:13px;padding:12px 24px;border-radius:8px;text-decoration:none;">
                Set My Password →
              </a>
            </div>

            <p style="color:#6b7280;font-size:13px;margin-bottom:4px;">
              Your login email: <strong style="color:#111827;">${email}</strong>
            </p>
            <p style="color:#6b7280;font-size:13px;margin-bottom:0;">
              Portal: <a href="${loginUrl}" style="color:#2563eb;">${loginUrl}</a>
            </p>

            <p style="color:#9ca3af;font-size:12px;margin-top:24px;padding-top:16px;border-top:1px solid #f3f4f6;">
              If you weren't expecting this email, please ignore it or contact us at <a href="mailto:DomainServices33@gmail.com" style="color:#2563eb;">DomainServices33@gmail.com</a>
            </p>
          </div>
        </div>
      `,
    });
  } catch (emailErr) {
    // Non-fatal — user is created, email failure shouldn't block the response
    console.error("[users/create] Welcome email failed:", emailErr);
  }

  return NextResponse.json(formatUser(user), { status: 201 });
}
