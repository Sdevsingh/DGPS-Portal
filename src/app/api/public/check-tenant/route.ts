import { NextRequest, NextResponse } from "next/server";
import { findRow } from "@/lib/sheets";

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

  const tenant = await findRow("Tenants", (r) => r.slug === slug);
  if (!tenant) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json({ name: tenant.name });
}
