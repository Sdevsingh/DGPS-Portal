import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role, tenantId, id: userId, name: userName, assignedTenantIds } = session.user;

  // Only technicians can request revision
  if (role !== "technician") {
    return NextResponse.json({ error: "Only technicians can request quote revisions" }, { status: 403 });
  }

  const { id } = await params;
  const { data: job } = await supabaseAdmin.from("jobs").select("*").eq("id", id).single();
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (job.assigned_to_id !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { reason } = body;

  // Save to quote_history
  await supabaseAdmin.from("quote_history").insert({
    job_id: id,
    tenant_id: job.tenant_id,
    quote_status: job.quote_status,
    quote_amount: job.quote_amount,
    quote_gst: job.quote_gst,
    quote_total_with_gst: job.quote_total_with_gst,
    changed_by: userId,
    changed_by_name: userName,
    changed_by_role: role,
    reason: reason ?? "Technician requested revision",
  });

  // Update job quote status
  await supabaseAdmin.from("jobs").update({
    quote_status: "tech_revision_pending",
    updated_at: new Date().toISOString(),
  }).eq("id", id);

  // Post to chat
  const { data: thread } = await supabaseAdmin
    .from("chat_threads")
    .select("id, tenant_id")
    .eq("job_id", id)
    .single();

  if (thread) {
    await supabaseAdmin.from("messages").insert({
      tenant_id: job.tenant_id,
      thread_id: thread.id,
      sender_id: userId,
      sender_name: userName,
      sender_role: role,
      type: "system",
      content: `Quote revision requested by ${userName}${reason ? `: ${reason}` : ""}`,
    });

    await supabaseAdmin.from("chat_threads").update({
      pending_on: "team",
      last_message: `Quote revision requested`,
      last_message_at: new Date().toISOString(),
      last_message_by: "team",
      updated_at: new Date().toISOString(),
    }).eq("id", thread.id);
  }

  return NextResponse.json({ ok: true, quoteStatus: "tech_revision_pending" });
}
