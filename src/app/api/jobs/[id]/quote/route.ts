import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

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
  if (job.is_archived) return NextResponse.json({ error: "Not found" }, { status: 404 });

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

  // Notify the agent who created the job that a quote has been sent.
  // Falls back to the creator's login email if agent_email is blank.
  try {
    let recipient: string | null = job.agent_email?.trim() || null;
    if (!recipient && job.created_by_user_id) {
      const { data: creator } = await supabaseAdmin
        .from("users")
        .select("email")
        .eq("id", job.created_by_user_id)
        .single();
      recipient = creator?.email ?? null;
    }
    // Legacy public-form jobs may have null agent_email and null created_by_user_id —
    // fall back to customer_email so the requester still receives the quote.
    if (!recipient) recipient = job.customer_email?.trim() || null;

    if (recipient) {
      const portalUrl = `${process.env.NEXTAUTH_URL ?? "https://dgps-portal.netlify.app"}/login?callbackUrl=/jobs/${job.id}`;
      const itemsHtml = items.length > 0
        ? `
          <table style="width:100%;border-collapse:collapse;margin:16px 0 20px;">
            <thead>
              <tr>
                <th style="text-align:left;padding:8px 0;border-bottom:1px solid #e5e7eb;font-size:11px;color:#6b7280;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;">Item</th>
                <th style="text-align:center;padding:8px 0;border-bottom:1px solid #e5e7eb;font-size:11px;color:#6b7280;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;">Qty</th>
                <th style="text-align:right;padding:8px 0;border-bottom:1px solid #e5e7eb;font-size:11px;color:#6b7280;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item) => `
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#374151;">${item.description}</td>
                  <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#6b7280;text-align:center;">${item.quantity}</td>
                  <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#111827;text-align:right;font-weight:600;">$${(item.quantity * item.unitPrice).toFixed(2)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        `
        : "";

      const emailResult = await resend.emails.send({
        from: `DGPS Portal <${process.env.RESEND_FROM ?? "noreply@dgps.com.au"}>`,
        replyTo: process.env.RESEND_REPLY_TO,
        to: recipient,
        subject: `Quote Ready — ${job.job_number} | $${total.toFixed(2)} incl. GST`,
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 16px;background:#f8faff;">
            <div style="background:#fff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden;">

              <div style="background:linear-gradient(135deg,#1e3a8a 0%,#2563eb 60%,#4f46e5 100%);padding:24px 28px;">
                <p style="font-size:11px;font-weight:700;color:rgba(255,255,255,0.6);letter-spacing:0.08em;text-transform:uppercase;margin:0 0 4px;">Quote Ready for Review</p>
                <h1 style="font-size:22px;font-weight:800;color:#fff;margin:0;">${job.job_number}</h1>
              </div>

              <div style="padding:24px 28px;">

                <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 16px;">
                  Hi ${job.agent_name || "there"},
                </p>
                <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 20px;">
                  Our team has prepared a quote for <strong style="color:#111827;">${job.property_address ?? "this job"}</strong>. You can review the breakdown below and approve or decline it in the portal.
                </p>

                ${itemsHtml}

                <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
                  <tr>
                    <td style="padding:6px 0;font-size:13px;color:#6b7280;">Subtotal</td>
                    <td style="padding:6px 0;font-size:13px;color:#374151;text-align:right;">$${subtotal.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;font-size:13px;color:#6b7280;">GST (10%)</td>
                    <td style="padding:6px 0;font-size:13px;color:#374151;text-align:right;">$${gst.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 0 0;font-size:15px;color:#111827;font-weight:700;border-top:1px solid #e5e7eb;">Total incl. GST</td>
                    <td style="padding:10px 0 0;font-size:15px;color:#111827;font-weight:700;border-top:1px solid #e5e7eb;text-align:right;">$${total.toFixed(2)}</td>
                  </tr>
                </table>

                <a href="${portalUrl}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;">
                  Review Quote in Portal →
                </a>

                <p style="font-size:12px;color:#9ca3af;margin:20px 0 0;line-height:1.6;">
                  All prices are inclusive of Goods and Services Tax (GST) at 10%.
                </p>
              </div>

              <div style="padding:16px 28px;border-top:1px solid #f3f4f6;background:#f9fafb;">
                <p style="font-size:11px;color:#9ca3af;margin:0;">This notification was sent automatically by the DGPS Portal when your job received a quote.</p>
              </div>
            </div>
          </div>
        `,
      });
      console.log("[DGPS] Quote-sent notification email result:", JSON.stringify(emailResult));
    }
  } catch (emailErr) {
    console.error("[DGPS] Quote-sent notification email failed:", emailErr);
  }

  return NextResponse.json({ subtotal, gst, total }, { status: 201 });
}
