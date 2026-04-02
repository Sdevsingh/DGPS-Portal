import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { formatUser } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role, tenantId, assignedTenantIds } = session.user;

  if (role !== "super_admin" && role !== "operations_manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const requestedTenantId = req.nextUrl.searchParams.get("tenantId");

  let q = supabaseAdmin.from("users").select("*");

  if (role === "super_admin") {
    if (requestedTenantId) q = q.eq("tenant_id", requestedTenantId);
  } else {
    // Ops manager sees their tenant + assigned tenants
    const accessible = new Set([tenantId, ...(assignedTenantIds ?? [])]);
    q = q.in("tenant_id", Array.from(accessible));
  }

  const { data: users, error } = await q.order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json((users ?? []).map(formatUser));
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role, tenantId, assignedTenantIds } = session.user;

  // Super admin can create any user; ops manager can create technicians in their tenants
  if (role !== "super_admin" && role !== "operations_manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { name, email, phone, userRole, password } = body;

  if (!name || !email || !userRole || !password) {
    return NextResponse.json({ error: "name, email, role, and password are required" }, { status: 400 });
  }

  // Ops manager can only create technicians
  if (role === "operations_manager" && userRole !== "technician") {
    return NextResponse.json({ error: "Operations managers can only create technician accounts" }, { status: 403 });
  }

  const useTenantId = body.tenantId || tenantId;

  // Ops manager can only create in accessible tenants
  if (role === "operations_manager") {
    const accessible = new Set([tenantId, ...(assignedTenantIds ?? [])]);
    if (!accessible.has(useTenantId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Check email uniqueness within tenant
  const { data: existing } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("tenant_id", useTenantId)
    .eq("email", email.toLowerCase())
    .single();

  if (existing) {
    return NextResponse.json({ error: "Email already in use for this company" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const { data: user, error } = await supabaseAdmin
    .from("users")
    .insert({
      tenant_id: useTenantId,
      name,
      email: email.toLowerCase(),
      password_hash: passwordHash,
      role: userRole,
      phone: phone ?? null,
      is_active: true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(formatUser(user), { status: 201 });
}
