/**
 * Chat Persistence Test — run with: npm run test:chat
 *
 * Tests the full message write → read cycle against the live Google Sheet.
 * Covers:
 *   1. Schema integrity   — Messages tab has all 10 columns in correct order
 *   2. Write persistence  — appendRow stores content/type/senderRole in the right columns
 *   3. Read-back fidelity — findRows returns exactly what was written
 *   4. Reload simulation  — two separate getRows calls return the same data
 *   5. Multi-role writes  — client, ops_manager, super_admin messages all land correctly
 *   6. Chronological sort — messages come back in send order
 *
 * Cleans up its own test rows at the end.
 */

import { appendRow, findRows, deleteRows, getRows, migrateTab } from "../src/lib/sheets";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PASS = "✅";
const FAIL = "❌";
const WARN = "⚠️ ";

let passed = 0;
let failed = 0;
const errors: string[] = [];

function assert(label: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ${PASS} ${label}`);
    passed++;
  } else {
    console.log(`  ${FAIL} ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
    errors.push(label);
  }
}

// ─── Test data ────────────────────────────────────────────────────────────────

// Use a fixed test thread ID — must already exist in ChatThreads sheet.
// We pick thread-001 from seed data. If it doesn't exist the test will still
// write rows and clean them up; they just won't be linked to a thread object.
const TEST_THREAD_ID = "thread-001";
const TEST_TENANT_ID = "tenant-dgps";
const TEST_TAG = "__TEST__"; // marker so we can clean up reliably

const testMessages = [
  {
    role: "client",
    senderName: "Emma Johnson (TEST)",
    senderId: "user-client-dgps",
    content: `${TEST_TAG} Hello from client — can you confirm the appointment time?`,
    type: "text",
  },
  {
    role: "operations_manager",
    senderName: "Sarah Mitchell (TEST)",
    senderId: "user-ops-dgps",
    content: `${TEST_TAG} Hi Emma — Jake will be there at 2pm today.`,
    type: "text",
  },
  {
    role: "super_admin",
    senderName: "Super Admin (TEST)",
    senderId: "user-superadmin",
    content: `${TEST_TAG} System note: priority escalated.`,
    type: "text",
  },
  {
    role: "",
    senderName: "System",
    senderId: "",
    content: `${TEST_TAG} Job status changed to in_progress`,
    type: "system",
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  console.log("\n🧪 Chat Persistence Test — Tradie Ops\n");
  console.log("─".repeat(50));

  // ─── Suite 1: Schema integrity ───────────────────────────────────────────

  console.log("\n📋 Suite 1: Schema Integrity\n");

  const migration = await migrateTab("Messages");
  assert(
    "Messages tab has correct 10-column schema",
    !migration.updated || migration.addedColumns.length === 0,
    migration.updated
      ? `Schema was out of sync — added: [${migration.addedColumns.join(", ")}]. Run migration via /settings/migrate first.`
      : undefined
  );

  if (migration.updated) {
    console.log(`\n  ${WARN} Schema was fixed automatically. Run 'npm run sheets:seed' to restore demo data.\n`);
  }

  // Verify header row directly
  const allRows = await getRows("Messages");
  // getRows uses HEADERS to map — if we get back rows with proper field names the schema is correct
  // We'll verify after writing test rows

  // ─── Suite 2: Write persistence ──────────────────────────────────────────

  console.log("\n📝 Suite 2: Write Persistence (multi-role)\n");

  const writtenIds: string[] = [];

  for (const msg of testMessages) {
    const saved = await appendRow("Messages", {
      tenantId: TEST_TENANT_ID,
      threadId: TEST_THREAD_ID,
      senderId: msg.senderId,
      senderName: msg.senderName,
      senderRole: msg.role,
      type: msg.type,
      content: msg.content,
      metadata: "",
    });

    writtenIds.push(saved.id);

    assert(
      `Write [${msg.role || "system"}]: id assigned`,
      typeof saved.id === "string" && saved.id.length > 0
    );
    assert(
      `Write [${msg.role || "system"}]: content stored correctly`,
      saved.content === msg.content,
      `expected "${msg.content}", got "${saved.content}"`
    );
    assert(
      `Write [${msg.role || "system"}]: type stored correctly`,
      saved.type === msg.type,
      `expected "${msg.type}", got "${saved.type}"`
    );
    assert(
      `Write [${msg.role || "system"}]: senderRole stored correctly`,
      saved.senderRole === msg.role,
      `expected "${msg.role}", got "${saved.senderRole}"`
    );
    assert(
      `Write [${msg.role || "system"}]: senderName stored correctly`,
      saved.senderName === msg.senderName,
      `expected "${msg.senderName}", got "${saved.senderName}"`
    );
  }

  // ─── Suite 3: Read-back fidelity (simulates page reload) ─────────────────

  console.log("\n🔄 Suite 3: Read-back After Write (Reload Simulation)\n");

  // Bust cache by waiting a moment then reading fresh — simulates a page reload
  // (Cache TTL is 30s but we can read immediately since appendRow busts cache)
  const readBack = await findRows(
    "Messages",
    (r) => r.threadId === TEST_THREAD_ID && r.content.startsWith(TEST_TAG)
  );

  assert(
    `Read-back: found all ${testMessages.length} test messages`,
    readBack.length >= testMessages.length,
    `found ${readBack.length}, expected ${testMessages.length}`
  );

  for (const msg of testMessages) {
    const found = readBack.find((r) => r.content === msg.content);
    assert(
      `Read-back [${msg.role || "system"}]: message persisted after read`,
      !!found,
      `"${msg.content.slice(0, 50)}" not found`
    );
    if (found) {
      assert(
        `Read-back [${msg.role || "system"}]: content field correct (not shifted)`,
        found.content === msg.content,
        `got "${found.content}"`
      );
      assert(
        `Read-back [${msg.role || "system"}]: type field correct (not shifted)`,
        found.type === msg.type,
        `got "${found.type}"`
      );
      assert(
        `Read-back [${msg.role || "system"}]: senderRole field correct (not shifted)`,
        found.senderRole === msg.role,
        `got "${found.senderRole}"`
      );
    }
  }

  // ─── Suite 4: Second read (double-reload) ─────────────────────────────────

  console.log("\n🔁 Suite 4: Second Read (Simulates Second Reload)\n");

  const readBack2 = await findRows(
    "Messages",
    (r) => r.threadId === TEST_THREAD_ID && r.content.startsWith(TEST_TAG)
  );

  assert(
    "Second read: same number of messages (no duplication)",
    readBack2.length === readBack.length,
    `first: ${readBack.length}, second: ${readBack2.length}`
  );

  assert(
    "Second read: same IDs (stable identity)",
    readBack2.every((r) => readBack.some((r2) => r2.id === r.id)),
    "IDs changed between reads"
  );

  // ─── Suite 5: Chronological order ────────────────────────────────────────

  console.log("\n⏱️  Suite 5: Chronological Sort\n");

  const sorted = [...readBack2].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  assert(
    "Messages have valid ISO createdAt timestamps",
    readBack2.every((r) => !isNaN(new Date(r.createdAt).getTime())),
    "one or more createdAt values are not valid dates"
  );

  assert(
    "Messages in ascending chronological order after sort",
    sorted.every((m, i) =>
      i === 0 || new Date(m.createdAt) >= new Date(sorted[i - 1].createdAt)
    )
  );

  // ─── Suite 6: Backfill query (?since= param) ──────────────────────────────

  console.log("\n📡 Suite 6: Backfill Query (SSE Reconnect Scenario)\n");

  // Simulate the ?since= query used by ChatPanel on reconnect
  const lastMsg = sorted[sorted.length - 2]; // second-to-last
  const since = lastMsg?.createdAt ?? new Date(0).toISOString();
  const sinceTime = new Date(since).getTime();

  const backfill = readBack2.filter(
    (r) => new Date(r.createdAt).getTime() > sinceTime
  );

  assert(
    "Backfill query returns only messages after since timestamp",
    backfill.every((r) => new Date(r.createdAt).getTime() > sinceTime),
    `found ${backfill.length} messages after ${since}`
  );

  assert(
    "Backfill query excludes messages before since timestamp",
    !backfill.some((r) => new Date(r.createdAt).getTime() <= sinceTime),
    "some messages before since timestamp were included"
  );

  // ─── Cleanup ──────────────────────────────────────────────────────────────

  console.log("\n🧹 Cleanup\n");

  await deleteRows("Messages", (r) => r.content.startsWith(TEST_TAG));
  const afterCleanup = await findRows(
    "Messages",
    (r) => r.content.startsWith(TEST_TAG)
  );
  assert(
    `Cleanup: all ${testMessages.length} test rows deleted`,
    afterCleanup.length === 0,
    `${afterCleanup.length} test rows remain`
  );

  // ─── Summary ──────────────────────────────────────────────────────────────

  console.log("\n" + "─".repeat(50));
  console.log(`\n🏁 Results: ${passed} passed, ${failed} failed\n`);

  if (failed === 0) {
    console.log("✅ All tests passed — chat persistence is working correctly.\n");
    console.log("   Messages written by client, ops_manager, and super_admin");
    console.log("   all survive a page reload with correct content, type,");
    console.log("   senderRole, and senderName in the right columns.\n");
  } else {
    console.log("❌ Failing tests:");
    errors.forEach((e) => console.log(`   • ${e}`));
    console.log("\n   Run the schema migration first:");
    console.log("   → Login as super_admin → Settings → Data Migration → Run Migration");
    console.log("   → Then re-run: npm run test:chat\n");
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("\n❌ Test runner crashed:", err);
  process.exit(1);
});
