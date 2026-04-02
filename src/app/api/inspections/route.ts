import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { formatInspection } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "client") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { jobId, tenantId, checklist, notes } = await req.json();

  const hasFailure = Object.values(checklist as Record<string, string>).includes("fail");

  const { data: inspection, error } = await supabaseAdmin
    .from("inspections")
    .insert({
      tenant_id: tenantId,
      job_id: jobId,
      inspected_by: session.user.id,
      inspected_at: new Date().toISOString(),
      checklist,
      notes: notes ?? null,
      status: hasFailure ? "failed" : "passed",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update job inspection_required to "done"
  await supabaseAdmin.from("jobs").update({
    inspection_required: "done",
    updated_at: new Date().toISOString(),
  }).eq("id", jobId);

  return NextResponse.json(formatInspection(inspection), { status: 201 });
}
