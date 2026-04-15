import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-server";
import { formatUser } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const { data: user } = await supabaseAdmin.from("users").select("*").eq("id", id).single();
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(formatUser(user));
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const { data: user } = await supabaseAdmin.from("users").select("*").eq("id", id).single();
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patch: Record<string, any> = {};
  if ("name" in body) patch.name = body.name;
  if ("phone" in body) patch.phone = body.phone;
  if ("role" in body) patch.role = body.role;
  if ("isActive" in body) patch.is_active = body.isActive === "true" || body.isActive === true;
  if ("password" in body && body.password) {
    patch.password_hash = await bcrypt.hash(body.password, 10);
  }
  if ("clientCompanyName" in body) {
    patch.client_company_name = body.clientCompanyName || null;
  }
  // Clear client_company_name when role changes away from client
  if ("role" in body && body.role !== "client" && !("clientCompanyName" in body)) {
    patch.client_company_name = null;
  }

  patch.updated_at = new Date().toISOString();

  const { data: updated, error } = await supabaseAdmin
    .from("users")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(formatUser(updated));
}
