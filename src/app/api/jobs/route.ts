import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getRows, appendRow, findRows } from "@/lib/sheets";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role, tenantId, id: userId } = session.user;
  const { searchParams } = new URL(req.url);

  const filterTenantId = role === "super_admin"
    ? searchParams.get("tenantId") || null
    : tenantId;

  const status = searchParams.get("status");
  const quoteStatus = searchParams.get("quoteStatus");
  const priority = searchParams.get("priority");
  const paymentStatus = searchParams.get("paymentStatus");
  const inspectionRequired = searchParams.get("inspectionRequired");

  const jobs = await findRows("Jobs", (row) => {
    if (filterTenantId && row.tenantId !== filterTenantId) return false;
    // Technicians can only see jobs assigned to them
    if (role === "technician" && row.assignedToId !== userId) return false;
    if (status && row.jobStatus !== status) return false;
    if (quoteStatus && row.quoteStatus !== quoteStatus) return false;
    if (priority && row.priority !== priority) return false;
    if (paymentStatus && row.paymentStatus !== paymentStatus) return false;
    if (inspectionRequired && row.inspectionRequired !== inspectionRequired) return false;
    return true;
  });

  // Sort: high priority first, then newest
  jobs.sort((a, b) => {
    const pOrder = { high: 0, medium: 1, low: 2 };
    const pDiff = (pOrder[a.priority as keyof typeof pOrder] ?? 1) - (pOrder[b.priority as keyof typeof pOrder] ?? 1);
    if (pDiff !== 0) return pDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Attach chat thread pendingOn for each job
  const threads = await getRows("ChatThreads");
  const threadMap = new Map(threads.map((t) => [t.jobId, t]));

  const jobsWithThread = jobs.map((job) => ({
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

  // Generate job number
  const existingJobs = await findRows("Jobs", (r) => r.tenantId === useTenantId);
  const jobNumber = `JOB-${String(existingJobs.length + 1).padStart(3, "0")}`;

  const job = await appendRow("Jobs", {
    tenantId: useTenantId,
    jobNumber,
    dateReceived: new Date().toISOString(),
    companyName: body.companyName ?? "",
    agentName: body.agentName ?? "",
    agentContact: body.agentContact ?? "",
    agentEmail: body.agentEmail ?? "",
    propertyAddress: body.propertyAddress ?? "",
    description: body.description ?? "",
    category: body.category ?? "Plumbing",
    priority: body.priority ?? "medium",
    source: body.source ?? "manual",
    jobStatus: "new",
    quoteStatus: "pending",
    paymentStatus: "unpaid",
    slaDeadline: body.slaDeadline ?? "",
    assignedToId: body.assignedToId ?? "",
    assignedToName: body.assignedToName ?? "",
    teamGroup: body.teamGroup ?? "",
    quoteAmount: "",
    quoteGst: "",
    quoteTotalWithGst: "",
    inspectionRequired: body.inspectionRequired ?? "false",
    notes: "",
    createdByUserId: userId,
    createdByName: userName,
    createdByRole: role,
  });

  // Auto-create chat thread
  const thread = await appendRow("ChatThreads", {
    tenantId: useTenantId,
    jobId: job.id,
    pendingOn: "none",
    lastMessage: "",
    lastMessageAt: "",
    lastMessageBy: "",
  });

  // System message
  await appendRow("Messages", {
    tenantId: useTenantId,
    threadId: thread.id,
    senderId: "",
    senderName: "System",
    type: "system",
    content: `Job ${jobNumber} created`,
    metadata: "",
  });

  return NextResponse.json(job, { status: 201 });
}
