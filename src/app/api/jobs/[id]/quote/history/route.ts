import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  void req;

  const { id } = await params;
  const { role, tenantId, assignedTenantIds } = session.user;

  const { data: job } = await supabaseAdmin.from("jobs").select("tenant_id").eq("id", id).single();
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (role !== "super_admin") {
    const accessible = new Set([tenantId, ...(assignedTenantIds ?? [])]);
    if (!accessible.has(job.tenant_id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: history } = await supabaseAdmin
    .from("quote_history")
    .select("*")
    .eq("job_id", id)
    .order("created_at", { ascending: false });

  return NextResponse.json(history ?? []);
}
