/**
 * Supabase Seed Script
 * Run: npx tsx --env-file=.env.local scripts/seed-supabase.ts
 */

import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

let HASH = "";

async function init() {
  HASH = await bcrypt.hash("password123", 10);
}

async function clean() {
  // Delete in dependency order
  await supabase.from("quote_history").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("inspections").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("attachments").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("messages").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("chat_threads").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("quote_items").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("jobs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("ops_manager_tenants").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("users").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("tenants").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  console.log("✓ Cleaned existing data");
}

async function seed() {
  await init();
  await clean();

  // ── Tenants ───────────────────────────────────────────────────────────────
  const { data: tenants } = await supabase.from("tenants").insert([
    { name: "Domain Group Property Services", slug: "dgps", email: "contact@dgps.com.au", phone: "02 9000 0000", address: "1 Martin Place, Sydney NSW 2000" },
    { name: "PropServ Solutions", slug: "propserv", email: "hello@propserv.com.au", phone: "03 8000 0001", address: "200 Collins St, Melbourne VIC 3000" },
  ]).select();

  if (!tenants) throw new Error("Failed to create tenants");
  const dgps = tenants.find((t) => t.slug === "dgps")!;
  const propserv = tenants.find((t) => t.slug === "propserv")!;
  console.log("✓ Tenants created");

  // ── Users ─────────────────────────────────────────────────────────────────
  const { data: users } = await supabase.from("users").insert([
    // Super admin (no tenant)
    { tenant_id: dgps.id, name: "Super Admin", email: "admin@dgps.com.au", password_hash: HASH, role: "super_admin", phone: "0400 000 000", is_active: true },

    // DGPS users
    { tenant_id: dgps.id, name: "Sarah Chen", email: "ops@dgps.com.au", password_hash: HASH, role: "operations_manager", phone: "0411 111 111", is_active: true },
    { tenant_id: dgps.id, name: "Marcus Williams", email: "tech@dgps.com.au", password_hash: HASH, role: "technician", phone: "0422 222 222", is_active: true },
    { tenant_id: dgps.id, name: "Jake Nguyen", email: "tech2@dgps.com.au", password_hash: HASH, role: "technician", phone: "0433 333 333", is_active: true },
    { tenant_id: dgps.id, name: "Emily Brown", email: "client@dgps.com.au", password_hash: HASH, role: "client", phone: "0444 444 444", is_active: true },
    { tenant_id: dgps.id, name: "David Park", email: "client2@dgps.com.au", password_hash: HASH, role: "client", phone: "0455 555 555", is_active: true },
    { tenant_id: dgps.id, name: "Lisa Chen", email: "client3@dgps.com.au", password_hash: HASH, role: "client", phone: "0466 666 666", is_active: true },

    // PropServ users
    { tenant_id: propserv.id, name: "Michael Scott", email: "ops@propserv.com.au", password_hash: HASH, role: "operations_manager", phone: "0477 777 777", is_active: true },
    { tenant_id: propserv.id, name: "Tom Reynolds", email: "tech@propserv.com.au", password_hash: HASH, role: "technician", phone: "0488 888 888", is_active: true },
    { tenant_id: propserv.id, name: "Anna Smith", email: "tech2@propserv.com.au", password_hash: HASH, role: "technician", phone: "0499 999 999", is_active: true },
    { tenant_id: propserv.id, name: "Robert Davis", email: "client@propserv.com.au", password_hash: HASH, role: "client", phone: "0411 100 100", is_active: true },
    { tenant_id: propserv.id, name: "Jennifer Lee", email: "client2@propserv.com.au", password_hash: HASH, role: "client", phone: "0411 200 200", is_active: true },
    { tenant_id: propserv.id, name: "Chris Taylor", email: "client3@propserv.com.au", password_hash: HASH, role: "client", phone: "0411 300 300", is_active: true },
  ]).select();

  if (!users) throw new Error("Failed to create users");

  const getUser = (email: string) => users.find((u) => u.email === email)!;
  const superAdmin = getUser("admin@dgps.com.au");
  const opsD = getUser("ops@dgps.com.au");
  const techD1 = getUser("tech@dgps.com.au");
  const techD2 = getUser("tech2@dgps.com.au");
  const clientD1 = getUser("client@dgps.com.au");
  const opsP = getUser("ops@propserv.com.au");
  const techP1 = getUser("tech@propserv.com.au");
  const clientP1 = getUser("client@propserv.com.au");
  console.log("✓ Users created");

  // ── Ops manager assignments ───────────────────────────────────────────────
  await supabase.from("ops_manager_tenants").insert([
    { user_id: opsD.id, tenant_id: dgps.id },
  ]);
  console.log("✓ Ops assignments created");

  // ── Jobs helper ───────────────────────────────────────────────────────────
  async function createJob(tenantId: string, num: string, data: Record<string, unknown>) {
    const { data: job } = await supabase.from("jobs").insert({
      tenant_id: tenantId,
      job_number: num,
      date_received: new Date(Date.now() - Math.random() * 30 * 86400000).toISOString(),
      ...data,
    }).select().single();
    return job!;
  }

  // ── DGPS Jobs ─────────────────────────────────────────────────────────────
  const j1 = await createJob(dgps.id, "JOB-001", {
    company_name: "Domain Group Property Services",
    agent_name: "Emily Brown", agent_contact: "0444 444 444", agent_email: clientD1.email,
    property_address: "42 Harbour View Drive, Pyrmont NSW 2009",
    description: "Burst pipe under kitchen sink — urgent repair needed. Water damage to cabinet.",
    category: "Plumbing", priority: "high", source: "public_form",
    job_status: "in_progress", quote_status: "approved", payment_status: "unpaid",
    inspection_required: "not_required",
    assigned_to_id: techD1.id, assigned_to_name: techD1.name,
    quote_amount: 450, quote_gst: 45, quote_total_with_gst: 495,
    created_by_user_id: clientD1.id, created_by_name: clientD1.name, created_by_role: "client",
  });

  const j2 = await createJob(dgps.id, "JOB-002", {
    company_name: "Domain Group Property Services",
    agent_name: "Emily Brown", agent_contact: "0444 444 444", agent_email: clientD1.email,
    property_address: "15 Pacific Highway, Chatswood NSW 2067",
    description: "RCD tripping circuit breaker in main panel. Need electrical inspection.",
    category: "Electrical", priority: "medium", source: "email",
    job_status: "new", quote_status: "pending", payment_status: "unpaid",
    inspection_required: "required",
    created_by_user_id: opsD.id, created_by_name: opsD.name, created_by_role: "operations_manager",
  });

  const j3 = await createJob(dgps.id, "JOB-003", {
    company_name: "Domain Group Property Services",
    agent_name: "David Park", agent_contact: "0455 555 555", agent_email: getUser("client2@dgps.com.au").email,
    property_address: "8 Crown Street, Surry Hills NSW 2010",
    description: "Air conditioning unit not cooling. Compressor making loud noise.",
    category: "HVAC", priority: "medium", source: "phone",
    job_status: "ready", quote_status: "sent", payment_status: "unpaid",
    inspection_required: "not_required",
    assigned_to_id: techD2.id, assigned_to_name: techD2.name,
    quote_amount: 820, quote_gst: 82, quote_total_with_gst: 902,
    created_by_user_id: opsD.id, created_by_name: opsD.name, created_by_role: "operations_manager",
  });

  const j4 = await createJob(dgps.id, "JOB-004", {
    company_name: "Domain Group Property Services",
    agent_name: "Lisa Chen", agent_contact: "0466 666 666", agent_email: getUser("client3@dgps.com.au").email,
    property_address: "3 York Street, Sydney CBD NSW 2000",
    description: "Roof leak during recent storms. Water ingress affecting top floor ceiling.",
    category: "Roofing", priority: "high", source: "manual",
    job_status: "completed", quote_status: "approved", payment_status: "paid",
    inspection_required: "done",
    assigned_to_id: techD1.id, assigned_to_name: techD1.name,
    quote_amount: 1200, quote_gst: 120, quote_total_with_gst: 1320,
    created_by_user_id: opsD.id, created_by_name: opsD.name, created_by_role: "operations_manager",
  });

  const j5 = await createJob(dgps.id, "JOB-005", {
    company_name: "Domain Group Property Services",
    agent_name: "Emily Brown", agent_contact: "0444 444 444", agent_email: clientD1.email,
    property_address: "101 Elizabeth Street, Sydney NSW 2000",
    description: "General maintenance: fix door handles, replace smoke detector batteries, patch wall.",
    category: "General Maintenance", priority: "low", source: "manual",
    job_status: "invoiced", quote_status: "approved", payment_status: "unpaid",
    inspection_required: "not_required",
    assigned_to_id: techD2.id, assigned_to_name: techD2.name,
    quote_amount: 380, quote_gst: 38, quote_total_with_gst: 418,
    created_by_user_id: opsD.id, created_by_name: opsD.name, created_by_role: "operations_manager",
  });

  // ── PropServ Jobs ─────────────────────────────────────────────────────────
  const j6 = await createJob(propserv.id, "JOB-001", {
    company_name: "PropServ Solutions",
    agent_name: "Robert Davis", agent_contact: "0411 100 100", agent_email: clientP1.email,
    property_address: "22 Chapel Street, South Yarra VIC 3141",
    description: "Hot water system failed. No hot water for 2 days.",
    category: "Plumbing", priority: "high", source: "public_form",
    job_status: "in_progress", quote_status: "approved", payment_status: "unpaid",
    inspection_required: "not_required",
    assigned_to_id: techP1.id, assigned_to_name: techP1.name,
    quote_amount: 680, quote_gst: 68, quote_total_with_gst: 748,
    created_by_user_id: clientP1.id, created_by_name: clientP1.name, created_by_role: "client",
  });

  const j7 = await createJob(propserv.id, "JOB-002", {
    company_name: "PropServ Solutions",
    agent_name: "Jennifer Lee", agent_contact: "0411 200 200", agent_email: getUser("client2@propserv.com.au").email,
    property_address: "5 Flinders Lane, Melbourne VIC 3000",
    description: "Flickering lights throughout apartment. Safety concern.",
    category: "Electrical", priority: "medium", source: "email",
    job_status: "new", quote_status: "pending", payment_status: "unpaid",
    inspection_required: "required",
    created_by_user_id: opsP.id, created_by_name: opsP.name, created_by_role: "operations_manager",
  });

  const j8 = await createJob(propserv.id, "JOB-003", {
    company_name: "PropServ Solutions",
    agent_name: "Chris Taylor", agent_contact: "0411 300 300", agent_email: getUser("client3@propserv.com.au").email,
    property_address: "88 Collins Street, Melbourne VIC 3000",
    description: "Commercial HVAC annual service and filter replacement.",
    category: "HVAC", priority: "low", source: "manual",
    job_status: "completed", quote_status: "approved", payment_status: "paid",
    inspection_required: "not_required",
    quote_amount: 350, quote_gst: 35, quote_total_with_gst: 385,
    created_by_user_id: opsP.id, created_by_name: opsP.name, created_by_role: "operations_manager",
  });

  const j9 = await createJob(propserv.id, "JOB-004", {
    company_name: "PropServ Solutions",
    agent_name: "Robert Davis", agent_contact: "0411 100 100", agent_email: clientP1.email,
    property_address: "15 Toorak Road, South Yarra VIC 3141",
    description: "Water damage from neighbor above. Ceiling repair needed.",
    category: "General Maintenance", priority: "medium", source: "phone",
    job_status: "ready", quote_status: "sent", payment_status: "unpaid",
    inspection_required: "not_required",
    quote_amount: 950, quote_gst: 95, quote_total_with_gst: 1045,
    created_by_user_id: opsP.id, created_by_name: opsP.name, created_by_role: "operations_manager",
  });

  const j10 = await createJob(propserv.id, "JOB-005", {
    company_name: "PropServ Solutions",
    agent_name: "Jennifer Lee", agent_contact: "0411 200 200", agent_email: getUser("client2@propserv.com.au").email,
    property_address: "40 St Kilda Road, Melbourne VIC 3004",
    description: "Roof tile replacement after hailstorm damage.",
    category: "Roofing", priority: "high", source: "manual",
    job_status: "new", quote_status: "pending", payment_status: "unpaid",
    inspection_required: "required",
    created_by_user_id: opsP.id, created_by_name: opsP.name, created_by_role: "operations_manager",
  });

  console.log("✓ Jobs created");

  // ── Quote items ───────────────────────────────────────────────────────────
  await supabase.from("quote_items").insert([
    { job_id: j1.id, description: "Emergency pipe repair", quantity: 1, unit_price: 280, total: 280 },
    { job_id: j1.id, description: "Parts and materials", quantity: 1, unit_price: 120, total: 120 },
    { job_id: j1.id, description: "Labour (3 hours)", quantity: 3, unit_price: 50, total: 150 },
  ]);

  await supabase.from("quote_items").insert([
    { job_id: j3.id, description: "AC service and diagnostic", quantity: 1, unit_price: 350, total: 350 },
    { job_id: j3.id, description: "Compressor inspection", quantity: 1, unit_price: 270, total: 270 },
    { job_id: j3.id, description: "Refrigerant top-up", quantity: 1, unit_price: 200, total: 200 },
  ]);

  await supabase.from("quote_items").insert([
    { job_id: j6.id, description: "Hot water system replacement", quantity: 1, unit_price: 550, total: 550 },
    { job_id: j6.id, description: "Installation labour", quantity: 1, unit_price: 130, total: 130 },
  ]);

  console.log("✓ Quote items created");

  // ── Chat threads and messages ─────────────────────────────────────────────
  const allJobs = [j1, j2, j3, j4, j5, j6, j7, j8, j9, j10];

  for (const job of allJobs) {
    const { data: thread } = await supabase.from("chat_threads").insert({
      tenant_id: job.tenant_id,
      job_id: job.id,
      pending_on: job.job_status === "new" ? "team" : "none",
      last_message: `Job ${job.job_number} created`,
      last_message_at: job.date_received,
      last_message_by: "team",
    }).select().single();

    if (!thread) continue;

    const msgs = [
      {
        tenant_id: job.tenant_id, thread_id: thread.id,
        sender_id: null, sender_name: "System", sender_role: "system",
        type: "system", content: `Job ${job.job_number} created`,
        created_at: job.date_received,
      },
    ];

    if (job.quote_status === "approved" || job.quote_status === "sent") {
      const amount = job.quote_total_with_gst;
      msgs.push({
        tenant_id: job.tenant_id, thread_id: thread.id,
        sender_id: null, sender_name: "System", sender_role: "system",
        type: "system", content: `Quote Sent — $${Number(amount).toFixed(2)} incl. GST`,
        created_at: new Date(new Date(job.date_received).getTime() + 86400000).toISOString(),
      });
    }

    if (job.quote_status === "approved") {
      msgs.push({
        tenant_id: job.tenant_id, thread_id: thread.id,
        sender_id: null, sender_name: "System", sender_role: "system",
        type: "system", content: "Quote Approved",
        created_at: new Date(new Date(job.date_received).getTime() + 2 * 86400000).toISOString(),
      });
    }

    if (job.job_status !== "new") {
      msgs.push({
        tenant_id: job.tenant_id, thread_id: thread.id,
        sender_id: null, sender_name: "System", sender_role: "system",
        type: "system", content: "Job Started",
        created_at: new Date(new Date(job.date_received).getTime() + 3 * 86400000).toISOString(),
      });
    }

    await supabase.from("messages").insert(msgs);

    // Update thread with latest message
    const lastMsg = msgs[msgs.length - 1];
    await supabase.from("chat_threads").update({
      last_message: lastMsg.content,
      last_message_at: lastMsg.created_at,
    }).eq("id", thread.id);
  }

  console.log("✓ Chat threads and messages created");

  // ── Inspections ───────────────────────────────────────────────────────────
  await supabase.from("inspections").insert({
    tenant_id: dgps.id,
    job_id: j4.id,
    inspected_by: techD1.id,
    inspected_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    checklist: {
      "Roof condition": "pass",
      "Gutters clear": "pass",
      "No visible leaks": "fail",
      "Flashing secure": "pass",
    },
    notes: "Found 2 cracked tiles on north slope. Leak source identified.",
    status: "failed",
  });

  console.log("✓ Inspections created");
  console.log("\n✅ Seed complete!");
  console.log("\n📋 Login credentials (password: password123):");
  console.log("   Super Admin:     admin@dgps.com.au");
  console.log("   DGPS Ops Mgr:    ops@dgps.com.au");
  console.log("   DGPS Tech:       tech@dgps.com.au");
  console.log("   DGPS Client:     client@dgps.com.au");
  console.log("   PropServ Ops:    ops@propserv.com.au");
  console.log("   PropServ Client: client@propserv.com.au");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});