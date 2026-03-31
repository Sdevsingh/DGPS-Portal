import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getRows, appendRow, findRows } from "@/lib/sheets";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role, tenantId } = session.user;
  if (role === "client") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const targetTenantId = role === "super_admin"
    ? (searchParams.get("tenantId") || tenantId)
    : tenantId;

  const users = await findRows("Users", (r) => r.tenantId === targetTenantId);
  // Never return password hashes to the client
  return NextResponse.json(users.map(({ passwordHash: _, ...u }) => u));
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role, tenantId } = session.user;
  if (role !== "super_admin" && role !== "operations_manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { name, email, phone, userRole, password } = body;

  if (!name || !email || !userRole || !password) {
    return NextResponse.json({ error: "name, email, role, and password are required" }, { status: 400 });
  }

  // ops_manager can only create technicians and clients
  if (role === "operations_manager" && !["technician", "client"].includes(userRole)) {
    return NextResponse.json({ error: "Operations managers can only create technician or client accounts" }, { status: 403 });
  }

  const useTenantId = role === "super_admin" ? (body.tenantId || tenantId) : tenantId;

  // Check email uniqueness
  const all = await getRows("Users");
  if (all.some((u) => u.email === email)) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await appendRow("Users", {
    tenantId: useTenantId,
    name,
    email,
    passwordHash,
    role: userRole,
    phone: phone ?? "",
    isActive: "true",
  });

  const { passwordHash: _, ...safeUser } = user;
  return NextResponse.json(safeUser, { status: 201 });
}
