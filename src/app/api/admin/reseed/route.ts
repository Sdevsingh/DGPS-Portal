import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  void req;
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // With Supabase, reseed is done via the seed script separately.
  return NextResponse.json({
    status: "ok",
    note: "To reseed data, run: npx tsx --env-file=.env.local scripts/seed-supabase.ts",
  });
}
