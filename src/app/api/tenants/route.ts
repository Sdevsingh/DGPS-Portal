import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getRows, appendRow } from "@/lib/sheets";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const tenants = await getRows("Tenants");
  return NextResponse.json(tenants);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const tenant = await appendRow("Tenants", {
    name: body.name,
    slug: body.slug ?? body.name.toLowerCase().replace(/\s+/g, "-"),
    email: body.email ?? "",
    phone: body.phone ?? "",
    address: body.address ?? "",
  });

  return NextResponse.json(tenant, { status: 201 });
}
