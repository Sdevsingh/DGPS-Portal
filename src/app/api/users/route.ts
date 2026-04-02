import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getRows, appendRow } from "@/lib/sheets";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role, tenantId } = session.user;

  // Super admins can see all users (optionally filtered by tenantId query param)
  // Ops managers can only see users within their own tenant
  if (role !== "super_admin" && role !== "operations_manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const requestedTenantId = req.nextUrl.searchParams.get("tenantId");
  const users = await getRows("Users");

  const filtered = users.filter((u) => {
    if (role === "super_admin") {
      return requestedTenantId ? u.tenantId === requestedTenantId : true;
    }
    // Ops managers can only see their own tenant
    return u.tenantId === tenantId;
  });

  // Never return password hashes to the client
  return NextResponse.json(filtered.map(({ passwordHash: _, ...u }) => u));
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role, tenantId } = session.user;
  if (role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { name, email, phone, userRole, password } = body;

  if (!name || !email || !userRole || !password) {
    return NextResponse.json({ error: "name, email, role, and password are required" }, { status: 400 });
  }

  const useTenantId = body.tenantId || tenantId;

  // Check email uniqueness inside the target tenant only.
  const all = await getRows("Users");
  if (all.some((u) => u.tenantId === useTenantId && u.email.toLowerCase() === email.toLowerCase())) {
    return NextResponse.json({ error: "Email already in use for this company" }, { status: 409 });
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
