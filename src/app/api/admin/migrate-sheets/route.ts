import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { migrateTab, clearTabData } from "@/lib/sheets";

// POST /api/admin/migrate-sheets
// Fixes Google Sheets schema mismatches across all tabs.
// For the Messages tab: also clears all existing rows (they may be corrupted
// if senderRole column was missing — values written to wrong columns).
// Only accessible to super_admin.

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden — super_admin only" }, { status: 403 });
  }

  const tabs = [
    "Tenants",
    "Users",
    "Jobs",
    "QuoteItems",
    "ChatThreads",
    "Messages",
    "Attachments",
    "Inspections",
  ] as const;

  const results: Record<string, { updated: boolean; addedColumns: string[]; clearedRows?: number }> = {};

  for (const tab of tabs) {
    try {
      const migration = await migrateTab(tab);
      results[tab] = { updated: migration.updated, addedColumns: migration.addedColumns };

      // Messages rows written before the senderRole column existed are corrupted
      // (values shifted into wrong columns). Safe to wipe — demo data only.
      if (tab === "Messages" && migration.updated) {
        const cleared = await clearTabData("Messages");
        results[tab].clearedRows = cleared;
        console.log(`[migrate] Messages: cleared ${cleared} corrupted rows, added columns: [${migration.addedColumns.join(", ")}]`);
      } else if (tab === "Messages") {
        console.log("[migrate] Messages: schema already correct, no rows cleared");
      }
    } catch (err) {
      console.error(`[migrate] Error on tab ${tab}:`, err);
      results[tab] = { updated: false, addedColumns: [], clearedRows: 0 };
    }
  }

  return NextResponse.json({
    status: "ok",
    results,
    note: "Run npm run sheets:seed to repopulate demo messages after migration.",
  });
}
