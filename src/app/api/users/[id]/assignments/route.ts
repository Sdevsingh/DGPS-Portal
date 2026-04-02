import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  void req;

  const { id } = await params;

  const { data: assignments } = await supabaseAdmin
    .from("ops_manager_tenants")
    .select("tenant_id, tenants(id, name, slug)")
    .eq("user_id", id);

  const tenantIds = (assignments ?? []).map((a: { tenant_id: string }) => a.tenant_id);
  return NextResponse.json({ tenantIds });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const { tenantIds }: { tenantIds: string[] } = await req.json();

  // Verify user exists and is an ops manager
  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id, role")
    .eq("id", id)
    .single();

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (user.role !== "operations_manager") {
    return NextResponse.json({ error: "User is not an operations manager" }, { status: 400 });
  }

  // Replace assignments
  await supabaseAdmin.from("ops_manager_tenants").delete().eq("user_id", id);

  if (tenantIds.length > 0) {
    await supabaseAdmin.from("ops_manager_tenants").insert(
      tenantIds.map((tid) => ({ user_id: id, tenant_id: tid }))
    );
  }

  return NextResponse.json({ ok: true, tenantIds });
}
