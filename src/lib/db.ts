/**
 * db.ts — Supabase data access layer
 * All queries use supabaseAdmin (service role).
 * All responses are formatted to camelCase for backward compatibility.
 */

import { supabaseAdmin } from "./supabase-server";

// ─── Inspection Required mapping ─────────────────────────────────────────────

export function fromDbInspectionRequired(val: string | null | undefined): string {
  if (val === "required") return "true";
  if (val === "done") return "done";
  return "false";
}

export function toDbInspectionRequired(
  val: string | boolean | undefined | null
): "not_required" | "required" | "done" {
  if (val === "done") return "done";
  if (val === true || val === "true") return "required";
  return "not_required";
}

// ─── Formatters ───────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function formatJob(job: any): Record<string, string> {
  if (!job) return {};
  return {
    id: job.id,
    tenantId: job.tenant_id,
    jobNumber: job.job_number ?? "",
    dateReceived: job.date_received ?? "",
    companyName: job.company_name ?? "",
    agentName: job.agent_name ?? "",
    agentContact: job.agent_contact ?? "",
    agentEmail: job.agent_email ?? "",
    customerContact: job.customer_contact ?? "",
    customerEmail: job.customer_email ?? "",
    propertyAddress: job.property_address ?? "",
    description: job.description ?? "",
    category: job.category ?? "",
    priority: job.priority ?? "medium",
    source: job.source ?? "manual",
    jobStatus: job.job_status ?? "new",
    quoteStatus: job.quote_status ?? "pending",
    paymentStatus: job.payment_status ?? "unpaid",
    slaDeadline: job.sla_deadline ?? "",
    assignedToId: job.assigned_to_id ?? "",
    assignedToName: job.assigned_to_name ?? "",
    teamGroup: job.team_group ?? "",
    quoteAmount: job.quote_amount != null ? String(job.quote_amount) : "",
    quoteGst: job.quote_gst != null ? String(job.quote_gst) : "",
    quoteTotalWithGst: job.quote_total_with_gst != null ? String(job.quote_total_with_gst) : "",
    inspectionRequired: fromDbInspectionRequired(job.inspection_required),
    notes: job.notes ?? "",
    createdAt: job.created_at ?? "",
    updatedAt: job.updated_at ?? "",
    createdByUserId: job.created_by_user_id ?? "",
    createdByName: job.created_by_name ?? "",
    createdByRole: job.created_by_role ?? "",
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function formatUser(user: any): Record<string, string> {
  if (!user) return {};
  return {
    id: user.id,
    tenantId: user.tenant_id ?? "",
    name: user.name ?? "",
    email: user.email ?? "",
    role: user.role ?? "",
    phone: user.phone ?? "",
    isActive: user.is_active ? "true" : "false",
    googleId: user.google_id ?? "",
    avatarUrl: user.avatar_url ?? "",
    clientCompanyName: user.client_company_name ?? "",
    createdAt: user.created_at ?? "",
    updatedAt: user.updated_at ?? "",
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function formatThread(t: any): Record<string, string> {
  if (!t) return {};
  return {
    id: t.id,
    tenantId: t.tenant_id ?? "",
    jobId: t.job_id ?? "",
    pendingOn: t.pending_on ?? "none",
    lastMessage: t.last_message ?? "",
    lastMessageAt: t.last_message_at ?? "",
    lastMessageBy: t.last_message_by ?? "",
    lastResponseTime: t.last_response_time ?? "",
    responseDueTime: t.response_due_time ?? "",
    createdAt: t.created_at ?? "",
    updatedAt: t.updated_at ?? "",
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function formatMessage(m: any): Record<string, string> {
  if (!m) return {};
  return {
    id: m.id,
    tenantId: m.tenant_id ?? "",
    threadId: m.thread_id ?? "",
    senderId: m.sender_id ?? "",
    senderName: m.sender_name ?? "",
    senderRole: m.sender_role ?? "",
    type: m.type ?? "text",
    content: m.content ?? "",
    metadata: m.metadata ? (typeof m.metadata === "string" ? m.metadata : JSON.stringify(m.metadata)) : "",
    createdAt: m.created_at ?? "",
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function formatQuoteItem(item: any): Record<string, string> {
  if (!item) return {};
  return {
    id: item.id,
    jobId: item.job_id ?? "",
    description: item.description ?? "",
    quantity: item.quantity != null ? String(item.quantity) : "",
    unitPrice: item.unit_price != null ? String(item.unit_price) : "",
    total: item.total != null ? String(item.total) : "",
    createdAt: item.created_at ?? "",
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function formatTenant(t: any): Record<string, string> {
  if (!t) return {};
  return {
    id: t.id,
    name: t.name ?? "",
    slug: t.slug ?? "",
    email: t.email ?? "",
    phone: t.phone ?? "",
    address: t.address ?? "",
    logoUrl: t.logo_url ?? "",
    createdAt: t.created_at ?? "",
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function formatInspection(i: any): Record<string, string> {
  if (!i) return {};
  return {
    id: i.id,
    tenantId: i.tenant_id ?? "",
    jobId: i.job_id ?? "",
    inspectedBy: i.inspected_by ?? "",
    inspectedAt: i.inspected_at ?? "",
    checklist: i.checklist ? (typeof i.checklist === "string" ? i.checklist : JSON.stringify(i.checklist)) : "{}",
    notes: i.notes ?? "",
    status: i.status ?? "passed",
    createdAt: i.created_at ?? "",
  };
}

// ─── Camel→Snake patch converter for jobs ────────────────────────────────────

const JOB_FIELD_MAP: Record<string, string> = {
  tenantId: "tenant_id",
  jobNumber: "job_number",
  dateReceived: "date_received",
  companyName: "company_name",
  agentName: "agent_name",
  agentContact: "agent_contact",
  agentEmail: "agent_email",
  customerContact: "customer_contact",
  customerEmail: "customer_email",
  propertyAddress: "property_address",
  description: "description",
  category: "category",
  priority: "priority",
  source: "source",
  jobStatus: "job_status",
  quoteStatus: "quote_status",
  paymentStatus: "payment_status",
  slaDeadline: "sla_deadline",
  assignedToId: "assigned_to_id",
  assignedToName: "assigned_to_name",
  teamGroup: "team_group",
  quoteAmount: "quote_amount",
  quoteGst: "quote_gst",
  quoteTotalWithGst: "quote_total_with_gst",
  notes: "notes",
  createdByUserId: "created_by_user_id",
  createdByName: "created_by_name",
  createdByRole: "created_by_role",
  isArchived: "is_archived",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toDbJobPatch(patch: Record<string, any>): Record<string, any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db: Record<string, any> = {};
  for (const [key, val] of Object.entries(patch)) {
    if (key === "inspectionRequired") {
      db["inspection_required"] = toDbInspectionRequired(val);
    } else if (JOB_FIELD_MAP[key]) {
      db[JOB_FIELD_MAP[key]] = val;
    }
  }
  return db;
}

// ─── Query helpers ────────────────────────────────────────────────────────────

export async function getJobs(opts: {
  tenantId?: string | null;
  assignedToId?: string;
  status?: string;
  quoteStatus?: string;
  priority?: string;
  paymentStatus?: string;
  inspectionRequired?: string;
  limit?: number;
} = {}): Promise<ReturnType<typeof formatJob>[]> {
  let q = supabaseAdmin.from("jobs").select("*");
  if (opts.tenantId) q = q.eq("tenant_id", opts.tenantId);
  if (opts.assignedToId) q = q.eq("assigned_to_id", opts.assignedToId);
  if (opts.status) q = q.eq("job_status", opts.status);
  if (opts.quoteStatus) q = q.eq("quote_status", opts.quoteStatus);
  if (opts.priority) q = q.eq("priority", opts.priority);
  if (opts.paymentStatus) q = q.eq("payment_status", opts.paymentStatus);
  if (opts.inspectionRequired !== undefined) {
    q = q.eq("inspection_required", toDbInspectionRequired(opts.inspectionRequired));
  }
  if (opts.limit) q = q.limit(opts.limit);
  q = q.order("created_at", { ascending: false });
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(formatJob);
}

export async function getJobById(id: string): Promise<ReturnType<typeof formatJob> | null> {
  const { data, error } = await supabaseAdmin.from("jobs").select("*").eq("id", id).single();
  if (error || !data) return null;
  return formatJob(data);
}

export async function getThreads(opts: {
  tenantId?: string | null;
  jobId?: string;
} = {}): Promise<ReturnType<typeof formatThread>[]> {
  let q = supabaseAdmin.from("chat_threads").select("*");
  if (opts.tenantId) q = q.eq("tenant_id", opts.tenantId);
  if (opts.jobId) q = q.eq("job_id", opts.jobId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(formatThread);
}

export async function getThreadByJobId(jobId: string): Promise<ReturnType<typeof formatThread> | null> {
  const { data } = await supabaseAdmin
    .from("chat_threads")
    .select("*")
    .eq("job_id", jobId)
    .single();
  return data ? formatThread(data) : null;
}

export async function getThreadById(threadId: string): Promise<ReturnType<typeof formatThread> | null> {
  const { data } = await supabaseAdmin
    .from("chat_threads")
    .select("*")
    .eq("id", threadId)
    .single();
  return data ? formatThread(data) : null;
}

export async function getMessages(threadId: string, sinceTs?: string): Promise<ReturnType<typeof formatMessage>[]> {
  let q = supabaseAdmin
    .from("messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });
  if (sinceTs) q = q.gt("created_at", sinceTs);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(formatMessage);
}

export async function getQuoteItems(jobId: string): Promise<ReturnType<typeof formatQuoteItem>[]> {
  const { data, error } = await supabaseAdmin
    .from("quote_items")
    .select("*")
    .eq("job_id", jobId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(formatQuoteItem);
}

export async function getUsers(opts: {
  tenantId?: string | null;
  role?: string;
} = {}): Promise<ReturnType<typeof formatUser>[]> {
  let q = supabaseAdmin.from("users").select("*");
  if (opts.tenantId) q = q.eq("tenant_id", opts.tenantId);
  if (opts.role) q = q.eq("role", opts.role);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(formatUser);
}

export async function getUserById(id: string): Promise<ReturnType<typeof formatUser> | null> {
  const { data } = await supabaseAdmin.from("users").select("*").eq("id", id).single();
  return data ? formatUser(data) : null;
}

export async function getTenants(): Promise<ReturnType<typeof formatTenant>[]> {
  const { data, error } = await supabaseAdmin.from("tenants").select("*").order("name");
  if (error) throw error;
  return (data ?? []).map(formatTenant);
}

export async function getTenantBySlug(slug: string): Promise<ReturnType<typeof formatTenant> | null> {
  const { data } = await supabaseAdmin
    .from("tenants")
    .select("*")
    .eq("slug", slug)
    .single();
  return data ? formatTenant(data) : null;
}

export async function getTenantById(id: string): Promise<ReturnType<typeof formatTenant> | null> {
  const { data } = await supabaseAdmin.from("tenants").select("*").eq("id", id).single();
  return data ? formatTenant(data) : null;
}

export async function getInspections(jobId: string): Promise<ReturnType<typeof formatInspection>[]> {
  const { data, error } = await supabaseAdmin
    .from("inspections")
    .select("*")
    .eq("job_id", jobId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(formatInspection);
}

// Get assigned tenant IDs for an ops manager
export async function getOpsManagerTenantIds(userId: string): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from("ops_manager_tenants")
    .select("tenant_id")
    .eq("user_id", userId);
  return (data ?? []).map((r: { tenant_id: string }) => r.tenant_id);
}

// Next job number for a tenant (safe sequential generation)
export async function nextJobNumber(tenantId: string): Promise<string> {
  const { data } = await supabaseAdmin
    .from("jobs")
    .select("job_number")
    .eq("tenant_id", tenantId);
  const max = (data ?? []).reduce((m, j) => {
    const n = parseInt((j.job_number as string)?.split("-")[1] ?? "0", 10);
    return Math.max(m, n);
  }, 0);
  return `JOB-${String(max + 1).padStart(3, "0")}`;
}
