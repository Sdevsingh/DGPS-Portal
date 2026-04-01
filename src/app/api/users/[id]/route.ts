import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findRow, updateRow } from "@/lib/sheets";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role } = session.user;
  if (role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const user = await findRow("Users", (r) => r.id === id);
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const allowed = ["name", "phone", "isActive", "role"];
  const patch: Record<string, string> = {};
  for (const key of allowed) {
    if (key in body) patch[key] = String(body[key]);
  }

  const updated = await updateRow("Users", id, patch);
  if (!updated) return NextResponse.json({ error: "Update failed" }, { status: 500 });

  const { passwordHash: _, ...safe } = updated;
  return NextResponse.json(safe);
}
