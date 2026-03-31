/**
 * Run once: npm run sheets:seed
 * Creates all tabs with headers and seeds demo data.
 */

// env loaded via tsx --env-file flag
import { ensureTab, appendRow } from "./sheets";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("📋 Setting up Google Sheets tabs...");

  const tabs = [
    "Tenants", "Users", "Jobs", "QuoteItems",
    "ChatThreads", "Messages", "Attachments", "Inspections",
  ] as const;

  for (const tab of tabs) {
    await ensureTab(tab);
    console.log(`  ✓ ${tab}`);
  }

  console.log("\n🌱 Seeding demo data...");

  const hashedPassword = await bcrypt.hash("password123", 10);

  // ─── Tenants ───────────────────────────────────────────────────────────────

  const tenant1 = await appendRow("Tenants", {
    id: "tenant-dgps",
    name: "Domain Group Plumbing & Services",
    slug: "dgps",
    email: "info@dgps.com.au",
    phone: "02 9999 1111",
    address: "Sydney NSW 2000",
  });

  const tenant2 = await appendRow("Tenants", {
    id: "tenant-metro",
    name: "Metro Maintenance",
    slug: "metro-maintenance",
    email: "info@metromaint.com.au",
    phone: "03 8888 2222",
    address: "Melbourne VIC 3000",
  });

  console.log("  ✓ Tenants");

  // ─── Users ─────────────────────────────────────────────────────────────────

  // Super Admin
  await appendRow("Users", {
    id: "user-superadmin",
    tenantId: tenant1.id,
    name: "Super Admin",
    email: "admin@dgps.com.au",
    passwordHash: hashedPassword,
    role: "super_admin",
    phone: "",
    isActive: "true",
  });

  // Ops Manager — DGPS
  const opsManager = await appendRow("Users", {
    id: "user-ops-dgps",
    tenantId: tenant1.id,
    name: "Sarah Mitchell",
    email: "ops@dgps.com.au",
    passwordHash: hashedPassword,
    role: "operations_manager",
    phone: "0412 111 222",
    isActive: "true",
  });

  // Technician — DGPS
  const technician = await appendRow("Users", {
    id: "user-tech-dgps",
    tenantId: tenant1.id,
    name: "Jake Thompson",
    email: "tech@dgps.com.au",
    passwordHash: hashedPassword,
    role: "technician",
    phone: "0412 333 444",
    isActive: "true",
  });

  // Client — DGPS
  await appendRow("Users", {
    id: "user-client-dgps",
    tenantId: tenant1.id,
    name: "Emma Johnson",
    email: "client@dgps.com.au",
    passwordHash: hashedPassword,
    role: "client",
    phone: "0412 555 666",
    isActive: "true",
  });

  // Ops Manager — Metro
  await appendRow("Users", {
    id: "user-ops-metro",
    tenantId: tenant2.id,
    name: "David Chen",
    email: "ops@metro.com.au",
    passwordHash: hashedPassword,
    role: "operations_manager",
    phone: "0413 111 222",
    isActive: "true",
  });

  console.log("  ✓ Users");

  // ─── Jobs ──────────────────────────────────────────────────────────────────

  const job1 = await appendRow("Jobs", {
    id: "job-001",
    tenantId: tenant1.id,
    jobNumber: "JOB-001",
    dateReceived: new Date().toISOString(),
    companyName: "Domain Group Plumbing & Services",
    agentName: "Emma Johnson",
    agentContact: "0412 555 666",
    agentEmail: "client@dgps.com.au",
    propertyAddress: "78 George St, Sydney NSW 2000",
    description: "Burst pipe under kitchen sink — urgent repair needed",
    category: "Plumbing",
    priority: "high",
    source: "public_form",
    jobStatus: "in_progress",
    quoteStatus: "approved",
    paymentStatus: "unpaid",
    assignedToId: technician.id,
    assignedToName: technician.name,
    quoteAmount: "650",
    quoteGst: "65",
    quoteTotalWithGst: "715",
    inspectionRequired: "false",
    notes: "",
  });

  const job2 = await appendRow("Jobs", {
    id: "job-002",
    tenantId: tenant1.id,
    jobNumber: "JOB-002",
    dateReceived: new Date().toISOString(),
    companyName: "Domain Group Plumbing & Services",
    agentName: "Emma Johnson",
    agentContact: "0412 555 666",
    agentEmail: "client@dgps.com.au",
    propertyAddress: "22 Pitt St, Sydney NSW 2000",
    description: "Hot water system not working — tenant complaint",
    category: "Plumbing",
    priority: "medium",
    source: "public_form",
    jobStatus: "new",
    quoteStatus: "sent",
    paymentStatus: "unpaid",
    quoteAmount: "480",
    quoteGst: "48",
    quoteTotalWithGst: "528",
    inspectionRequired: "true",
    notes: "",
  });

  const job3 = await appendRow("Jobs", {
    id: "job-003",
    tenantId: tenant1.id,
    jobNumber: "JOB-003",
    dateReceived: new Date(Date.now() - 7 * 86400000).toISOString(),
    companyName: "Domain Group Plumbing & Services",
    agentName: "Emma Johnson",
    agentContact: "0412 555 666",
    agentEmail: "client@dgps.com.au",
    propertyAddress: "5 Market St, Sydney NSW 2000",
    description: "Blocked drain in bathroom",
    category: "Plumbing",
    priority: "low",
    source: "manual",
    jobStatus: "completed",
    quoteStatus: "approved",
    paymentStatus: "paid",
    quoteAmount: "280",
    quoteGst: "28",
    quoteTotalWithGst: "308",
    inspectionRequired: "false",
    notes: "Job completed without issues.",
  });

  console.log("  ✓ Jobs");

  // ─── Quote Items ───────────────────────────────────────────────────────────

  await appendRow("QuoteItems", { id: crypto.randomUUID(), jobId: job1.id, description: "Labour (2hrs)", quantity: "2", unitPrice: "150", total: "300" });
  await appendRow("QuoteItems", { id: crypto.randomUUID(), jobId: job1.id, description: "Pipe replacement material", quantity: "1", unitPrice: "250", total: "250" });
  await appendRow("QuoteItems", { id: crypto.randomUUID(), jobId: job1.id, description: "Call-out fee", quantity: "1", unitPrice: "100", total: "100" });

  await appendRow("QuoteItems", { id: crypto.randomUUID(), jobId: job2.id, description: "Hot water unit replacement", quantity: "1", unitPrice: "380", total: "380" });
  await appendRow("QuoteItems", { id: crypto.randomUUID(), jobId: job2.id, description: "Labour (1hr)", quantity: "1", unitPrice: "100", total: "100" });

  await appendRow("QuoteItems", { id: crypto.randomUUID(), jobId: job3.id, description: "Drain clearing", quantity: "1", unitPrice: "200", total: "200" });
  await appendRow("QuoteItems", { id: crypto.randomUUID(), jobId: job3.id, description: "Call-out fee", quantity: "1", unitPrice: "80", total: "80" });

  console.log("  ✓ QuoteItems");

  // ─── Chat Threads ──────────────────────────────────────────────────────────

  const thread1 = await appendRow("ChatThreads", {
    id: "thread-001",
    tenantId: tenant1.id,
    jobId: job1.id,
    pendingOn: "team",
    lastMessage: "When can you start on this?",
    lastMessageAt: new Date().toISOString(),
    lastMessageBy: "client",
  });

  const thread2 = await appendRow("ChatThreads", {
    id: "thread-002",
    tenantId: tenant1.id,
    jobId: job2.id,
    pendingOn: "client",
    lastMessage: "Please review the quote and approve to proceed.",
    lastMessageAt: new Date().toISOString(),
    lastMessageBy: "team",
    responseDueTime: new Date(Date.now() + 4 * 3600000).toISOString(),
  });

  const thread3 = await appendRow("ChatThreads", {
    id: "thread-003",
    tenantId: tenant1.id,
    jobId: job3.id,
    pendingOn: "none",
    lastMessage: "Job completed successfully. All clear.",
    lastMessageAt: new Date(Date.now() - 86400000).toISOString(),
    lastMessageBy: "team",
  });

  console.log("  ✓ ChatThreads");

  // ─── Messages ──────────────────────────────────────────────────────────────

  // Thread 1 messages
  const t1msgs = [
    { type: "system", content: "Job JOB-001 created", senderName: "System" },
    { type: "text", content: "Hi, we have an urgent burst pipe at 78 George St. Need someone ASAP.", senderName: "Emma Johnson", senderId: "user-client-dgps" },
    { type: "text", content: "Got it — Jake is available this afternoon. Sending quote now.", senderName: "Sarah Mitchell", senderId: opsManager.id },
    { type: "system", content: "Quote Sent — $715.00 incl. GST", senderName: "System" },
    { type: "system", content: "Quote Approved ✅", senderName: "System" },
    { type: "system", content: "Job Started", senderName: "System" },
    { type: "text", content: "When can you start on this?", senderName: "Emma Johnson", senderId: "user-client-dgps" },
  ];

  for (const msg of t1msgs) {
    await appendRow("Messages", {
      id: crypto.randomUUID(),
      tenantId: tenant1.id,
      threadId: thread1.id,
      senderId: msg.senderId ?? "",
      senderName: msg.senderName,
      type: msg.type,
      content: msg.content,
      metadata: "",
    });
  }

  // Thread 2 messages
  const t2msgs = [
    { type: "system", content: "Job JOB-002 created", senderName: "System" },
    { type: "text", content: "Hot water is completely out at 22 Pitt St. Tenants very unhappy.", senderName: "Emma Johnson", senderId: "user-client-dgps" },
    { type: "text", content: "We will inspect tomorrow morning and send you a quote by noon.", senderName: "Sarah Mitchell", senderId: opsManager.id },
    {
      type: "system",
      content: "Quote Sent",
      senderName: "System",
      metadata: JSON.stringify({
        quoteItems: [
          { description: "Hot water unit replacement", total: 380 },
          { description: "Labour (1hr)", total: 100 },
        ],
        subtotal: 480,
        gst: 48,
        total: 528,
      }),
    },
    { type: "text", content: "Please review the quote and approve to proceed.", senderName: "Sarah Mitchell", senderId: opsManager.id },
  ];

  for (const msg of t2msgs) {
    await appendRow("Messages", {
      id: crypto.randomUUID(),
      tenantId: tenant1.id,
      threadId: thread2.id,
      senderId: msg.senderId ?? "",
      senderName: msg.senderName,
      type: msg.type,
      content: msg.content,
      metadata: (msg as any).metadata ?? "",
    });
  }

  // Thread 3 messages
  const t3msgs = [
    { type: "system", content: "Job JOB-003 created", senderName: "System" },
    { type: "text", content: "Blocked drain in bathroom at 5 Market St.", senderName: "Emma Johnson", senderId: "user-client-dgps" },
    { type: "system", content: "Quote Sent — $308.00 incl. GST", senderName: "System" },
    { type: "system", content: "Quote Approved ✅", senderName: "System" },
    { type: "system", content: "Job Started", senderName: "System" },
    { type: "system", content: "Job Completed ✅", senderName: "System" },
    { type: "text", content: "Job completed successfully. All clear.", senderName: "Jake Thompson", senderId: technician.id },
  ];

  for (const msg of t3msgs) {
    await appendRow("Messages", {
      id: crypto.randomUUID(),
      tenantId: tenant1.id,
      threadId: thread3.id,
      senderId: msg.senderId ?? "",
      senderName: msg.senderName,
      type: msg.type,
      content: msg.content,
      metadata: "",
    });
  }

  console.log("  ✓ Messages");

  // ─── Metro tenant demo job ─────────────────────────────────────────────────

  const metroJob = await appendRow("Jobs", {
    id: "job-metro-001",
    tenantId: tenant2.id,
    jobNumber: "JOB-001",
    dateReceived: new Date().toISOString(),
    companyName: "Metro Maintenance",
    agentName: "David Chen",
    agentContact: "0413 111 222",
    agentEmail: "ops@metro.com.au",
    propertyAddress: "100 Collins St, Melbourne VIC 3000",
    description: "Leaking roof — water ingress in ceiling",
    category: "Roofing",
    priority: "high",
    source: "public_form",
    jobStatus: "new",
    quoteStatus: "pending",
    paymentStatus: "unpaid",
    inspectionRequired: "true",
    notes: "",
  });

  const metroThread = await appendRow("ChatThreads", {
    id: crypto.randomUUID(),
    tenantId: tenant2.id,
    jobId: metroJob.id,
    pendingOn: "team",
    lastMessage: "Leaking roof reported — urgent",
    lastMessageAt: new Date().toISOString(),
    lastMessageBy: "client",
  });

  await appendRow("Messages", {
    id: crypto.randomUUID(),
    tenantId: tenant2.id,
    threadId: metroThread.id,
    senderId: "user-ops-metro",
    senderName: "David Chen",
    type: "system",
    content: "Job JOB-001 created",
    metadata: "",
  });

  console.log("  ✓ Metro demo job");

  console.log("\n✅ Seed complete!");
  console.log("\nDemo accounts (password: password123):");
  console.log("  Super Admin:     admin@dgps.com.au");
  console.log("  Ops Manager:     ops@dgps.com.au");
  console.log("  Technician:      tech@dgps.com.au");
  console.log("  Client:          client@dgps.com.au");
  console.log("\nPublic request form: http://localhost:3000/request/dgps");
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
