import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-server";
import { formatJob, formatThread, toDbJobPatch, nextJobNumber, getJobs, getThreads } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role, tenantId, id: userId, assignedTenantIds } = session.user;
  const { searchParams } = new URL(req.url);

  const status = searchParams.get("status");
  const quoteStatus = searchParams.get("quoteStatus");
  const priority = searchParams.get("priority");
  const paymentStatus = searchParams.get("paymentStatus");
  const inspectionRequired = searchParams.get("inspectionRequired");
  const companyFilter = searchParams.get("tenantId") || searchParams.get("company");
  const pendingOnFilter = searchParams.get("pendingOn");

  // Build base query
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = supabaseAdmin.from("jobs").select("*");

  if (role === "super_admin") {
    if (companyFilter) q = q.eq("tenant_id", companyFilter);
  } else if (role === "operations_manager") {
    const accessible = new Set([tenantId, ...(assignedTenantIds ?? [])]);
    if (companyFilter && accessible.has(companyFilter)) {
      q = q.eq("tenant_id", companyFilter);
    } else {
      q = q.in("tenant_id", Array.from(accessible));
    }
  } else if (role === "technician") {
    q = q.eq("tenant_id", tenantId).eq("assigned_to_id", userId);
  } else if (role === "client") {
    q = q.eq("tenant_id", tenantId);
  } else {
    q = q.eq("tenant_id", tenantId);
  }

  if (status) q = q.eq("job_status", status);
  if (quoteStatus) q = q.eq("quote_status", quoteStatus);
  if (priority) q = q.eq("priority", priority);
  if (paymentStatus) q = q.eq("payment_status", paymentStatus);

  const { data: jobs, error } = await q.order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Get threads for pendingOn filter and attaching to jobs
  const jobIds = (jobs ?? []).map((j: { id: string }) => j.id);
  let threads: Record<string, string>[] = [];
  if (jobIds.length > 0) {
    const { data: threadData } = await supabaseAdmin
      .from("chat_threads")
      .select("*")
      .in("job_id", jobIds);
    threads = (threadData ?? []).map(formatThread);
  }
  const threadMap = new Map(threads.map((t) => [t.jobId, t]));

  let formattedJobs = (jobs ?? []).map(formatJob);

  // Apply inspectionRequired filter after formatting
  if (inspectionRequired) {
    formattedJobs = formattedJobs.filter((j: Record<string, string>) => j.inspectionRequired === inspectionRequired);
  }

  // Apply pendingOn filter
  if (pendingOnFilter === "overdue") {
    const now = new Date();
    formattedJobs = formattedJobs.filter((j: Record<string, string>) => {
      const t = threadMap.get(j.id);
      return t && t.pendingOn !== "none" && t.responseDueTime && new Date(t.responseDueTime) < now;
    });
  } else if (pendingOnFilter) {
    formattedJobs = formattedJobs.filter((j: Record<string, string>) => {
      const t = threadMap.get(j.id);
      return t && t.pendingOn === pendingOnFilter;
    });
  }

  // Sort: high priority first, then newest
  const pOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  formattedJobs.sort((a: Record<string, string>, b: Record<string, string>) => {
    const pDiff = (pOrder[a.priority] ?? 1) - (pOrder[b.priority] ?? 1);
    if (pDiff !== 0) return pDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const jobsWithThread = formattedJobs.map((job: Record<string, string>) => ({
    ...job,
    chatThread: threadMap.get(job.id) ?? null,
  }));

  return NextResponse.json(jobsWithThread);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role, tenantId, id: userId, name: userName } = session.user;
  if (role === "client") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const useTenantId = role === "super_admin" ? (body.tenantId || tenantId) : tenantId;

  const jobNumber = await nextJobNumber(useTenantId);

  const { data: job, error: jobError } = await supabaseAdmin
    .from("jobs")
    .insert({
      tenant_id: useTenantId,
      job_number: jobNumber,
      date_received: new Date().toISOString(),
      company_name: body.companyName ?? "",
      agent_name: body.agentName ?? "",
      agent_contact: body.agentContact ?? "",
      agent_email: body.agentEmail ?? "",
      property_address: body.propertyAddress ?? "",
      description: body.description ?? "",
      category: body.category ?? "Plumbing",
      priority: body.priority ?? "medium",
      source: body.source ?? "manual",
      job_status: "new",
      quote_status: "pending",
      payment_status: "unpaid",
      sla_deadline: body.slaDeadline ?? null,
      assigned_to_id: body.assignedToId ?? null,
      assigned_to_name: body.assignedToName ?? null,
      team_group: body.teamGroup ?? null,
      inspection_required: body.inspectionRequired === "true" || body.inspectionRequired === true ? "required" : "not_required",
      notes: null,
      created_by_user_id: userId,
      created_by_name: userName,
      created_by_role: role,
    })
    .select()
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: jobError?.message ?? "Failed to create job" }, { status: 500 });
  }

  // Auto-create chat thread
  const { data: thread } = await supabaseAdmin
    .from("chat_threads")
    .insert({
      tenant_id: useTenantId,
      job_id: job.id,
      pending_on: "none",
    })
    .select()
    .single();

  // System message
  if (thread) {
    await supabaseAdmin.from("messages").insert({
      tenant_id: useTenantId,
      thread_id: thread.id,
      sender_id: null,
      sender_name: "System",
      sender_role: "system",
      type: "system",
      content: `Job ${jobNumber} created`,
    });
  }

  return NextResponse.json(formatJob(job), { status: 201 });
}
