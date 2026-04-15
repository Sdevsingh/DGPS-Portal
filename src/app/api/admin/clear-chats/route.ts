import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  void req;
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await supabaseAdmin.from("messages").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabaseAdmin.from("chat_threads").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  return NextResponse.json({ status: "ok", note: "All chat messages and threads deleted." });
}
