import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");
  const tenantSlug = req.nextUrl.searchParams.get("tenantSlug");

  if (!email || !tenantSlug) {
    return NextResponse.json({ error: "email and tenantSlug required" }, { status: 400 });
  }

  const { data: tenant } = await supabaseAdmin
    .from("tenants")
    .select("id")
    .eq("slug", tenantSlug)
    .single();

  if (!tenant) return NextResponse.json({ exists: false });

  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("tenant_id", tenant.id)
    .eq("email", email.toLowerCase())
    .single();

  return NextResponse.json({ exists: !!user });
}
