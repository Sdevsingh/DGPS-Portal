import { NextRequest, NextResponse } from "next/server";
import { findRow, findRows, appendRow } from "@/lib/sheets";
import bcrypt from "bcryptjs";

// Simple in-memory rate limiter (resets on server restart)
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

  // Honeypot check (bots fill hidden field)
  if (body._honeypot) {
    return NextResponse.json({ ok: true }); // silently ignore bots
  }

  const { tenantSlug, name, email, phone, propertyAddress, description, category, inspectionRequired, photoUrl } = body;

  if (!tenantSlug || !name || !email || !phone || !propertyAddress || !description) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Validate email
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  // Look up tenant by slug
  const tenant = await findRow("Tenants", (r) => r.slug === tenantSlug);
  if (!tenant) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  // Generate job number
  const existingJobs = await findRows("Jobs", (r) => r.tenantId === tenant.id);
  const jobNumber = `JOB-${String(existingJobs.length + 1).padStart(3, "0")}`;

  const job = await appendRow("Jobs", {
    tenantId: tenant.id,
    jobNumber,
    dateReceived: new Date().toISOString(),
    companyName: tenant.name,
    agentName: name,
    agentContact: phone,
    agentEmail: email,
    propertyAddress,
    description,
    category: category ?? "General Maintenance",
    priority: "medium",
    source: "public_form",
    jobStatus: "new",
    quoteStatus: "pending",
    paymentStatus: "unpaid",
    inspectionRequired: inspectionRequired === true || inspectionRequired === "true" ? "true" : "false",
    notes: "",
  });

  // Create chat thread
  const thread = await appendRow("ChatThreads", {
    tenantId: tenant.id,
    jobId: job.id,
    pendingOn: "team",
    lastMessage: `New request submitted by ${name}`,
    lastMessageAt: new Date().toISOString(),
    lastMessageBy: "client",
  });

  // System message
  await appendRow("Messages", {
    tenantId: tenant.id,
    threadId: thread.id,
    senderId: "",
    senderName: "System",
    type: "system",
    content: `Job request submitted by ${name} (${email} · ${phone})`,
    metadata: "",
  });

  // Client's first message
  await appendRow("Messages", {
    tenantId: tenant.id,
    threadId: thread.id,
    senderId: "",
    senderName: name,
    type: "text",
    content: description,
    metadata: "",
  });

  // If photo attached
  if (photoUrl) {
    await appendRow("Attachments", {
      jobId: job.id,
      messageId: "",
      fileName: "request-photo",
      fileType: "image",
      fileUrl: photoUrl,
      fileSize: "0",
    });
  }

  // Auto-create client account if none exists
  let clientPassword = "";
  const existingClient = await findRow("Users", (r) => r.email === email && r.tenantId === tenant.id);
  if (!existingClient) {
    // Generate readable temp password
    const chars = "abcdefghjkmnpqrstuvwxyz23456789";
    clientPassword = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    const passwordHash = await bcrypt.hash(clientPassword, 10);
    await appendRow("Users", {
      tenantId: tenant.id,
      name,
      email,
      passwordHash,
      role: "client",
      phone,
      isActive: "true",
    });
  }

  return NextResponse.json(
    { jobId: job.id, jobNumber, tenantSlug, clientEmail: email, clientPassword },
    { status: 201 }
  );
}
