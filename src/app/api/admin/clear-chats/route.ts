import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { clearTabData } from "@/lib/sheets";

export async function POST(req: NextRequest) {
  void req;
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const clearedMessages = await clearTabData("Messages");
  const clearedThreads = await clearTabData("ChatThreads");

  return NextResponse.json({
    status: "ok",
    clearedMessages,
    clearedThreads,
    note: "All chat messages and threads deleted. Run npm run sheets:seed to restore demo data.",
  });
}
