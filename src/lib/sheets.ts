import { google } from "googleapis";

// ─── Auth ─────────────────────────────────────────────────────────────────────

// Singleton — auth and client are stateless, safe to reuse across requests
let _sheetsClient: ReturnType<typeof google.sheets> | null = null;

function getSheetsClient() {
  if (_sheetsClient) return _sheetsClient;
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.replace(/\\n/g, "\n");
  if (!email || !key) throw new Error("Missing Google service account credentials");
  const auth = new google.auth.GoogleAuth({
    credentials: { client_email: email, private_key: key },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  _sheetsClient = google.sheets({ version: "v4", auth });
  return _sheetsClient;
}

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID!;

// ─── Tab Names ────────────────────────────────────────────────────────────────

export type TabName =
  | "Tenants"
  | "Users"
  | "Jobs"
  | "QuoteItems"
  | "ChatThreads"
  | "Messages"
  | "Attachments"
  | "Inspections"
  | "PasswordResets";

// ─── Column Headers (order matters — must match sheet columns) ────────────────

const HEADERS: Record<TabName, string[]> = {
  Tenants: ["id", "name", "slug", "email", "phone", "address", "createdAt"],
  Users: ["id", "tenantId", "name", "email", "passwordHash", "role", "phone", "isActive", "createdAt"],
  Jobs: [
    "id", "tenantId", "jobNumber", "dateReceived", "companyName",
    "agentName", "agentContact", "agentEmail", "propertyAddress", "description",
    "category", "priority", "source", "jobStatus", "quoteStatus", "paymentStatus",
    "slaDeadline", "assignedToId", "assignedToName", "teamGroup",
    "quoteAmount", "quoteGst", "quoteTotalWithGst",
    "inspectionRequired", "notes", "createdAt", "updatedAt",
  ],
  QuoteItems: ["id", "jobId", "description", "quantity", "unitPrice", "total"],
  ChatThreads: [
    "id", "tenantId", "jobId", "pendingOn",
    "lastMessage", "lastMessageAt", "lastMessageBy",
    "lastResponseTime", "responseDueTime", "createdAt", "updatedAt",
  ],
  Messages: [
    "id", "tenantId", "threadId", "senderId", "senderName", "senderRole",
    "type", "content", "metadata", "createdAt",
  ],
  Attachments: ["id", "jobId", "messageId", "fileName", "fileType", "fileUrl", "fileSize", "createdAt"],
  PasswordResets: ["id", "email", "token", "expiresAt", "used"],
  Inspections: [
    "id", "tenantId", "jobId", "inspectedBy", "inspectedAt",
    "checklist", "notes", "status", "createdAt",
  ],
};

// ─── In-memory cache (30s TTL per tab) ───────────────────────────────────────

type CacheEntry = { rows: Record<string, string>[]; ts: number };
const cache = new Map<TabName, CacheEntry>();
const CACHE_TTL = 30_000; // 30 seconds

function bustCache(tab: TabName) {
  cache.delete(tab);
}

// ─── Spreadsheet metadata cache (sheet ids don't change) ─────────────────────

let _metaCache: { sheetIds: Record<string, number>; ts: number } | null = null;
const META_TTL = 300_000; // 5 minutes — sheet ids are stable

async function getSheetId(tab: TabName): Promise<number> {
  if (_metaCache && Date.now() - _metaCache.ts < META_TTL) {
    return _metaCache.sheetIds[tab] ?? 0;
  }
  const sheets = getSheetsClient();
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheetIds: Record<string, number> = {};
  for (const s of meta.data.sheets ?? []) {
    const title = s.properties?.title;
    const id = s.properties?.sheetId;
    if (title && typeof id === 'number') sheetIds[title] = id;
  }
  _metaCache = { sheetIds, ts: Date.now() };
  return sheetIds[tab] ?? 0;
}

// ─── Core: fetch all rows from a tab ─────────────────────────────────────────

export async function getRows(tab: TabName): Promise<Record<string, string>[]> {
  const cached = cache.get(tab);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.rows;

  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${tab}!A:ZZ`,
  });

  const values = res.data.values ?? [];
  if (values.length < 2) {
    cache.set(tab, { rows: [], ts: Date.now() });
    return [];
  }

  const headers = values[0] as string[];
  const rawRows = values.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = (row[i] as string) ?? ""; });
    return obj;
  });

  // Deduplicate by id (first occurrence wins) — guards against multiple seed runs
  const seenIds = new Set<string>();
  const rows = rawRows.filter((r) => {
    if (!r.id) return true; // rows without id pass through unchanged
    if (seenIds.has(r.id)) return false;
    seenIds.add(r.id);
    return true;
  });

  cache.set(tab, { rows, ts: Date.now() });
  return rows;
}

// ─── Find helpers ─────────────────────────────────────────────────────────────

export async function findRows(
  tab: TabName,
  filter: (row: Record<string, string>) => boolean
): Promise<Record<string, string>[]> {
  const rows = await getRows(tab);
  return rows.filter(filter);
}

export async function findRow(
  tab: TabName,
  filter: (row: Record<string, string>) => boolean
): Promise<Record<string, string> | null> {
  const rows = await findRows(tab, filter);
  return rows[0] ?? null;
}

// ─── Append a new row ─────────────────────────────────────────────────────────

export async function appendRow(
  tab: TabName,
  data: Record<string, string>
): Promise<Record<string, string>> {
  const id = data.id || crypto.randomUUID();
  const now = new Date().toISOString();
  const row: Record<string, string> = { id, createdAt: now, updatedAt: now, ...data };
  const headers = HEADERS[tab];
  const values = [headers.map((h) => row[h] ?? "")];

  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${tab}!A:A`,
    valueInputOption: "RAW",
    requestBody: { values },
  });

  bustCache(tab);
  return row;
}

// ─── Update an existing row by id ─────────────────────────────────────────────

// ─── Update an existing row by id (OPTIMIZED) ─────────────────────────────────

export async function updateRow(
  tab: TabName,
  id: string,
  patch: Record<string, string>
): Promise<Record<string, string> | null> {
  const sheets = getSheetsClient();

  // 1. ELIMINATE THE GET REQUEST: Use our lightning-fast RAM cache to find the row
  // instead of asking Google Sheets to send us the whole file again.
  const rows = await getRows(tab);
  const rowIndex = rows.findIndex((r) => r.id === id);
  if (rowIndex === -1) return null;

  // Calculate exact Google Sheet row.
  // Row 1 = Headers. 'rows' array starts at index 0. So index 0 = Sheet Row 2.
  const sheetRowNumber = rowIndex + 2;

  // Merge the existing data with the new toggle status
  const existingObj = rows[rowIndex];
  const updated: Record<string, string> = {
    ...existingObj,
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  const headers = HEADERS[tab];
  const updatedValues = [headers.map((h) => updated[h] ?? "")];

  // 2. THE ONLY NETWORK REQUEST: Send the targeted update to Google
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${tab}!A${sheetRowNumber}:ZZ${sheetRowNumber}`,
    valueInputOption: "RAW",
    requestBody: { values: updatedValues },
  });

  // 3. CACHE MUTATION: Do NOT use bustCache(tab) here.
  // Wiping the cache forces router.refresh() to wait for a 2nd massive Google GET request.
  // Instead, we instantly update the data in our RAM cache so the page reload is 0ms.
  const cached = cache.get(tab);
  if (cached) {
    cached.rows[rowIndex] = updated;
  }

  return updated;
}

// ─── Ensure a tab (sheet) exists with correct headers ─────────────────────────

export async function ensureTab(tab: TabName): Promise<void> {
  const sheets = getSheetsClient();

  // Get existing sheets (bypass meta cache since we may be creating new sheets)
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const existing = meta.data.sheets?.map((s) => s.properties?.title) ?? [];

  if (!existing.includes(tab)) {
    // Create the sheet
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{ addSheet: { properties: { title: tab } } }],
      },
    });
    _metaCache = null; // invalidate so getSheetId picks up the new sheet
  }

  // Write headers to row 1
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${tab}!A1`,
    valueInputOption: "RAW",
    requestBody: { values: [HEADERS[tab]] },
  });
}

// ─── Delete rows matching a filter ───────────────────────────────────────────

export async function deleteRows(
  tab: TabName,
  filter: (row: Record<string, string>) => boolean
): Promise<void> {
  const sheets = getSheetsClient();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${tab}!A:ZZ`,
  });

  const values = res.data.values ?? [];
  if (values.length < 2) return;

  const headers = values[0] as string[];

  // Find 1-indexed sheet rows to delete (skip header row 1)
  const rowsToDelete: number[] = [];
  values.forEach((row, i) => {
    if (i === 0) return;
    const obj: Record<string, string> = {};
    headers.forEach((h, j) => { obj[h] = (row[j] as string) ?? ""; });
    if (filter(obj)) rowsToDelete.push(i + 1); // 1-indexed
  });

  if (rowsToDelete.length === 0) return;

  const sheetId = await getSheetId(tab);

  // Delete in reverse order so row indices stay valid
  const requests = [...rowsToDelete].reverse().map((rowIndex) => ({
    deleteDimension: {
      range: {
        sheetId,
        dimension: "ROWS",
        startIndex: rowIndex - 1,
        endIndex: rowIndex,
      },
    },
  }));

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: { requests },
  });

  bustCache(tab);
}

// ─── Migrate a tab: rewrite header row to match HEADERS[tab] ─────────────────
// Use this to fix schema mismatches without touching data rows.
// After calling this, run clearTabData if existing rows are corrupted.

export async function migrateTab(
  tab: TabName
): Promise<{ updated: boolean; addedColumns: string[]; previousHeaders: string[] }> {
  const sheets = getSheetsClient();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${tab}!1:1`,
  });

  const currentHeaders: string[] = (res.data.values?.[0] as string[]) ?? [];
  const expectedHeaders = HEADERS[tab];

  if (JSON.stringify(currentHeaders) === JSON.stringify(expectedHeaders)) {
    return { updated: false, addedColumns: [], previousHeaders: currentHeaders };
  }

  // Rewrite row 1 with the correct header order
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${tab}!A1`,
    valueInputOption: "RAW",
    requestBody: { values: [expectedHeaders] },
  });

  bustCache(tab);

  const addedColumns = expectedHeaders.filter((h) => !currentHeaders.includes(h));
  return { updated: true, addedColumns, previousHeaders: currentHeaders };
}

// ─── Clear all data rows from a tab (keep header row 1) ──────────────────────
// Deletes every row after row 1 in one batchUpdate call.

export async function clearTabData(tab: TabName): Promise<number> {
  const sheets = getSheetsClient();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${tab}!A:A`,
  });

  const totalRows = (res.data.values ?? []).length;
  if (totalRows <= 1) return 0; // header only or empty

  const sheetId = await getSheetId(tab);

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex: 1,      // 0-indexed: row 2 onwards
              endIndex: totalRows, // exclusive end
            },
          },
        },
      ],
    },
  });

  bustCache(tab);
  return totalRows - 1; // number of data rows deleted
}

// ─── Export headers for seed use ─────────────────────────────────────────────

export { HEADERS };
