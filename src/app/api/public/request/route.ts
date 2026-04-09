import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import bcrypt from "bcryptjs";

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

  const { data: existingClient } = await supabaseAdmin
    .from("users")
    .select("id, name")
    .eq("tenant_id", tenant.id)
    .eq("email", email.toLowerCase())
    .single();

  if (!existingClient) {
    if (!password || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }
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
      agent_name: null,
      agent_contact: null,
      agent_email: null,
      customer_contact: phone,
      customer_email: email.toLowerCase(),
      property_address: propertyAddress,
      description,
      category: category ?? "General Maintenance",
      priority: "medium",
      source: "public_form",
      job_status: "new",
      quote_status: "pending",
      payment_status: "unpaid",
      inspection_required: inspectionRequired === true || inspectionRequired === "true" ? "required" : "not_required",
      created_by_user_id: existingClient?.id ?? null,
      created_by_name: name,
      created_by_role: "client",
    })
    .select()
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
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
    await supabaseAdmin.from("messages").insert([
      {
        tenant_id: tenant.id,
        thread_id: thread.id,
        sender_id: null,
        sender_name: "System",
        sender_role: "system",
        type: "system",
        content: `Job request submitted by ${name} (${email} · ${phone})`,
      },
      {
        tenant_id: tenant.id,
        thread_id: thread.id,
        sender_id: existingClient?.id ?? null,
        sender_name: name,
        sender_role: "client",
        type: "text",
        content: description,
      },
    ]);
  }

  // Create client account if new
  if (!existingClient) {
    const passwordHash = await bcrypt.hash(password, 10);
    await supabaseAdmin.from("users").insert({
      tenant_id: tenant.id,
      name,
      email: email.toLowerCase(),
      password_hash: passwordHash,
      role: "client",
      phone,
      is_active: true,
    });
  }

  return NextResponse.json(
    { jobId: job.id, jobNumber, tenantSlug, clientEmail: email },
    { status: 201 }
  );
}
