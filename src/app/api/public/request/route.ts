import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import bcrypt from "bcryptjs";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const NOTIFY_EMAIL = "domainservices33@gmail.com";

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  if (entry.count >= 5) return true;
  entry.count++;
  return false;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests. Please wait a minute." }, { status: 429 });
  }

  const body = await req.json();

  if (body._honeypot) return NextResponse.json({ ok: true });

  const { tenantSlug, name, email, phone, propertyAddress, description, category, inspectionRequired, password } = body;

  if (!tenantSlug || !name || !email || !phone || !propertyAddress || !description) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  const { data: tenant } = await supabaseAdmin
    .from("tenants")
    .select("*")
    .eq("slug", tenantSlug)
    .single();

  if (!tenant) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  const normalizedEmail = email.toLowerCase();

  const { data: existingClient } = await supabaseAdmin
    .from("users")
    .select("id, name, password_hash")
    .eq("tenant_id", tenant.id)
    .eq("email", normalizedEmail)
    .single();

  if (!existingClient) {
    if (!password || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }
  } else if (password) {
    // Account already exists — if they typed a password, it must match the one on file.
    // Prevents the silent-password confusion when a user retries after a dropped request.
    const matches = existingClient.password_hash
      ? await bcrypt.compare(password, existingClient.password_hash)
      : false;
    if (!matches) {
      return NextResponse.json(
        { error: "An account with this email already exists. Please log in or reset your password." },
        { status: 409 }
      );
    }
  }

  // Create the client account FIRST (if new) so the job can reference the user.
  // This fixes quote-email recipient lookup for self-signup submissions.
  let clientUserId: string | null = existingClient?.id ?? null;
  const isNewClient = !existingClient;

  if (isNewClient) {
    const passwordHash = await bcrypt.hash(password, 10);
    const { data: newUser, error: userError } = await supabaseAdmin
      .from("users")
      .insert({
        tenant_id: tenant.id,
        name,
        email: normalizedEmail,
        password_hash: passwordHash,
        role: "client",
        phone,
        is_active: true,
      })
      .select("id")
      .single();

    if (userError || !newUser) {
      return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
    }
    clientUserId = newUser.id;
  }

  // Generate job number
  const { data: existingJobs } = await supabaseAdmin
    .from("jobs")
    .select("job_number")
    .eq("tenant_id", tenant.id);

  const maxNum = (existingJobs ?? []).reduce((m, j) => {
    const n = parseInt(j.job_number?.split("-")[1] ?? "0", 10);
    return Math.max(m, n);
  }, 0);
  const jobNumber = `JOB-${String(maxNum + 1).padStart(3, "0")}`;

  const { data: job, error: jobError } = await supabaseAdmin
    .from("jobs")
    .insert({
      tenant_id: tenant.id,
      job_number: jobNumber,
      date_received: new Date().toISOString(),
      company_name: name,
      agent_name: name,
      agent_contact: phone,
      agent_email: normalizedEmail,
      customer_contact: phone,
      customer_email: normalizedEmail,
      property_address: propertyAddress,
      description,
      category: category ?? "General Maintenance",
      priority: "medium",
      source: "public_form",
      job_status: "new",
      quote_status: "pending",
      payment_status: "unpaid",
      inspection_required: inspectionRequired === true || inspectionRequired === "true" ? "required" : "not_required",
      created_by_user_id: clientUserId,
      created_by_name: name,
      created_by_role: "client",
    })
    .select()
    .single();

  if (jobError || !job) {
    // Roll back the just-created account so we never leave an orphan user with no job.
    // (Skips rollback if the client already existed before this request.)
    if (isNewClient && clientUserId) {
      await supabaseAdmin.from("users").delete().eq("id", clientUserId);
    }
    return NextResponse.json({ error: "Failed to create job. Please try again." }, { status: 500 });
  }

  // Create chat thread
  const { data: thread } = await supabaseAdmin
    .from("chat_threads")
    .insert({
      tenant_id: tenant.id,
      job_id: job.id,
      pending_on: "team",
      last_message: `New request submitted by ${name}`,
      last_message_at: new Date().toISOString(),
      last_message_by: "client",
    })
    .select()
    .single();

  if (thread) {
    await supabaseAdmin.from("messages").insert({
      tenant_id: tenant.id,
      thread_id: thread.id,
      sender_id: null,
      sender_name: "System",
      sender_role: "system",
      type: "system",
      content: `Job request submitted by ${name} (${email} · ${phone})`,
    });
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? "https://dgps-portal.netlify.app";

  // Ops team notification — same pattern as authenticated client submissions
  try {
    const portalUrl = `${baseUrl}/login?callbackUrl=/jobs/${job.id}`;
    const opsEmail = await resend.emails.send({
      from: `DGPS Portal <${process.env.RESEND_FROM ?? "noreply@dgps.com.au"}>`,
      replyTo: process.env.RESEND_REPLY_TO,
      to: NOTIFY_EMAIL,
      subject: `New Client Request — ${jobNumber} | ${propertyAddress}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 16px;background:#f8faff;">
          <div style="background:#fff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden;">
            <div style="background:linear-gradient(135deg,#1e3a8a 0%,#2563eb 60%,#4f46e5 100%);padding:24px 28px;">
              <p style="font-size:11px;font-weight:700;color:rgba(255,255,255,0.6);letter-spacing:0.08em;text-transform:uppercase;margin:0 0 4px;">New Client Request${isNewClient ? " · New Signup" : ""}</p>
              <h1 style="font-size:22px;font-weight:800;color:#fff;margin:0;">${jobNumber}</h1>
            </div>

            <div style="padding:24px 28px;">
              <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:12px;color:#9ca3af;width:38%;vertical-align:top;">Property</td>
                  <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:14px;font-weight:600;color:#111827;">${propertyAddress}</td>
                </tr>
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:12px;color:#9ca3af;vertical-align:top;">Category</td>
                  <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#374151;">${category ?? "General Maintenance"}</td>
                </tr>
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:12px;color:#9ca3af;vertical-align:top;">Submitted by</td>
                  <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#374151;">${name} · ${phone}<br/><span style="color:#6b7280;font-size:13px;">${email}</span></td>
                </tr>
                ${description ? `
                <tr>
                  <td style="padding:10px 0;font-size:12px;color:#9ca3af;vertical-align:top;">Description</td>
                  <td style="padding:10px 0;font-size:14px;color:#374151;line-height:1.6;">${description.replace(/\n/g, "<br/>")}</td>
                </tr>` : ""}
              </table>

              <a href="${portalUrl}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;">
                View Job in Portal →
              </a>
            </div>

            <div style="padding:16px 28px;border-top:1px solid #f3f4f6;background:#f9fafb;">
              <p style="font-size:11px;color:#9ca3af;margin:0;">This notification was sent automatically by the DGPS Portal when a client submitted a new service request via the public form.</p>
            </div>
          </div>
        </div>
      `,
    });
    console.log("[DGPS] Public-request ops email result:", JSON.stringify(opsEmail));
  } catch (emailErr) {
    console.error("[DGPS] Public-request ops email failed:", emailErr);
  }

  // Welcome email — only for brand-new clients
  if (isNewClient) {
    try {
      const welcomeEmail = await resend.emails.send({
        from: `Domain Group Property Services <${process.env.RESEND_FROM ?? "noreply@dgps.com.au"}>`,
        replyTo: process.env.RESEND_REPLY_TO,
        to: normalizedEmail,
        subject: `Your DGPS Portal account is ready — Job ${jobNumber} received`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#f9fafb;">
            <div style="background:#fff;border-radius:16px;padding:32px;border:1px solid #e5e7eb;">
              <div style="margin-bottom:24px;">
                <h1 style="font-size:18px;font-weight:800;color:#1e3a5f;margin:0;">Domain Group</h1>
                <p style="font-size:12px;color:#6b7280;margin:2px 0 0;">Property Services Portal</p>
              </div>

              <h2 style="font-size:20px;font-weight:700;color:#111827;margin-bottom:8px;">Welcome, ${name}</h2>
              <p style="color:#374151;font-size:14px;margin-bottom:20px;line-height:1.6;">
                We've received your service request for <strong style="color:#111827;">${propertyAddress}</strong> and your account is ready to use. Our operations team will review the details and be in touch with a quote shortly.
              </p>

              <div style="background:#eff6ff;border-radius:12px;padding:18px;margin-bottom:24px;border:1px solid #dbeafe;">
                <p style="font-size:12px;font-weight:700;color:#1d4ed8;margin:0 0 6px;letter-spacing:0.04em;text-transform:uppercase;">Job Reference</p>
                <p style="font-size:18px;font-weight:800;color:#111827;margin:0;">${jobNumber}</p>
              </div>

              <p style="color:#374151;font-size:14px;margin:0 0 16px;line-height:1.6;">
                You can log in any time to track progress, approve quotes, and chat with our team.
              </p>

              <a href="${baseUrl}/login" style="display:inline-block;background:#2563eb;color:#fff;font-weight:600;font-size:14px;padding:12px 28px;border-radius:10px;text-decoration:none;">
                Log in to Portal →
              </a>

              <p style="color:#6b7280;font-size:13px;margin-top:24px;margin-bottom:0;">
                Your login email: <strong style="color:#111827;">${email}</strong><br/>
                Use the password you chose during signup.
              </p>

              <p style="color:#9ca3af;font-size:12px;margin-top:24px;padding-top:16px;border-top:1px solid #f3f4f6;">
                Need help? Contact us at <a href="mailto:DomainServices33@gmail.com" style="color:#2563eb;">DomainServices33@gmail.com</a>
              </p>
            </div>
          </div>
        `,
      });
      console.log("[DGPS] Public-request welcome email result:", JSON.stringify(welcomeEmail));
    } catch (emailErr) {
      console.error("[DGPS] Public-request welcome email failed:", emailErr);
    }
  }

  return NextResponse.json(
    { jobId: job.id, jobNumber, tenantSlug, clientEmail: email },
    { status: 201 }
  );
}
