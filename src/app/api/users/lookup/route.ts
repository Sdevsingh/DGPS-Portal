import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-server";
import { formatUser } from "@/lib/db";

/**
 * GET /api/users/lookup?email=someone@example.com
 * Super admin only — find a user account by email address.
 * Returns 404 with a clear message if the email does not exist.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "super_admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const email = req.nextUrl.searchParams.get("email")?.toLowerCase().trim();
  if (!email) {
    return NextResponse.json({ error: "email query parameter is required" }, { status: 400 });
  }

  const { data: users, error } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("email", email)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!users || users.length === 0) {
    return NextResponse.json(
      { error: `No account found with email "${email}". The user does not exist in the system.` },
      { status: 404 }
    );
  }

  return NextResponse.json(users.map(formatUser));
}
