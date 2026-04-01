import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resetAndSeed } from "@/lib/sheets-seed";

export async function POST(req: NextRequest) {
  void req;
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await resetAndSeed();
    return NextResponse.json({
      status: "ok",
      note: "All tabs cleared and reseeded with demo data.",
    });
  } catch (err) {
    console.error("[reseed] failed:", err);
    return NextResponse.json({ error: "Reseed failed" }, { status: 500 });
  }
}
