import { NextRequest, NextResponse } from "next/server";
import { findRow } from "@/lib/sheets";

// Simple in-memory rate limiter — 10 checks/min per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  if (entry.count >= 10) return true;
  entry.count++;
  return false;
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email")?.toLowerCase().trim();
  const slug = searchParams.get("slug");

  if (!email || !slug) {
    return NextResponse.json({ error: "email and slug are required" }, { status: 400 });
  }

  const tenant = await findRow("Tenants", (r) => r.slug === slug);
  if (!tenant) {
    return NextResponse.json({ exists: false });
  }

  const user = await findRow(
    "Users",
    (r) => r.email.toLowerCase() === email && r.tenantId === tenant.id
  );

  // Only return exists — never expose user data
  return NextResponse.json({ exists: !!user });
}
