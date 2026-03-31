import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { appendRow, updateRow, findRow } from "@/lib/sheets";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "client") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { jobId, tenantId, checklist, notes } = await req.json();

  const inspection = await appendRow("Inspections", {
    tenantId,
    jobId,
    inspectedBy: session.user.id,
    inspectedAt: new Date().toISOString(),
    checklist: JSON.stringify(checklist),
    notes: notes ?? "",
    status: Object.values(checklist as Record<string, string>).includes("fail") ? "failed" : "passed",
  });

  // Update job to mark inspection done
  await updateRow("Jobs", jobId, { inspectionRequired: "done" });

  return NextResponse.json(inspection, { status: 201 });
}
