import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role, tenantId, assignedTenantIds } = session.user;
  if (role === "client" || role === "technician") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { data: job } = await supabaseAdmin.from("jobs").select("*").eq("id", id).single();
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (role !== "super_admin") {
    const accessible = new Set([tenantId, ...(assignedTenantIds ?? [])]);
    if (!accessible.has(job.tenant_id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const items: { description: string; quantity: number; unitPrice: number }[] = body.items ?? [];

  // GST is always exactly 10%
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const gst = Math.round(subtotal * 0.1 * 100) / 100;
  const total = Math.round((subtotal + gst) * 100) / 100;

  // Delete existing quote items
  await supabaseAdmin.from("quote_items").delete().eq("job_id", id);

  // Insert new quote items
  if (items.length > 0) {
    await supabaseAdmin.from("quote_items").insert(
      items.map((item) => ({
        job_id: id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total: Math.round(item.quantity * item.unitPrice * 100) / 100,
      }))
    );
  }

  // Update job
  await supabaseAdmin.from("jobs").update({
    quote_amount: subtotal,
    quote_gst: gst,
    quote_total_with_gst: total,
    quote_status: "sent",
    updated_at: new Date().toISOString(),
  }).eq("id", id);

  // Post quote message to chat
  const { data: thread } = await supabaseAdmin
    .from("chat_threads")
    .select("*")
    .eq("job_id", id)
    .single();

  if (thread) {
    await supabaseAdmin.from("messages").insert({
      tenant_id: job.tenant_id,
      thread_id: thread.id,
      sender_id: null,
      sender_name: "System",
      sender_role: "system",
      type: "system",
      content: `Quote Sent — $${total.toFixed(2)} incl. GST`,
      metadata: {
        quoteItems: items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: Math.round(item.quantity * item.unitPrice * 100) / 100,
        })),
        subtotal,
        gst,
        total,
      },
    });

    await supabaseAdmin.from("chat_threads").update({
      pending_on: "client",
      last_message: `Quote Sent — $${total.toFixed(2)} incl. GST`,
      last_message_at: new Date().toISOString(),
      last_message_by: "team",
      response_due_time: new Date(Date.now() + 48 * 3600000).toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", thread.id);
  }

  return NextResponse.json({ subtotal, gst, total }, { status: 201 });
}
