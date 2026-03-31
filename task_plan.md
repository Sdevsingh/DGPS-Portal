# Task Plan — Tradie Ops (Property Maintenance SaaS)

## Goal
Build a multi-tenant, real-time operations management web app for a plumbing/property maintenance business (Australia-based).
Core concept: "WhatsApp + Job Tracker for Tradies"

## Tech Stack
- **Frontend**: Next.js 15 (App Router) + Tailwind CSS + React 19
- **Backend**: Next.js API Routes
- **Database**: Google Sheets API v4 (multi-tenant via tenantId on all rows) — `src/lib/sheets.ts`
- **Real-time**: SSE (Server-Sent Events) via in-process registry — `src/lib/sse.ts`
- **Auth**: NextAuth.js v4 (JWT, role-based) — `src/lib/auth.ts`
- **File uploads**: Local `/public/uploads` (dev)
- **Excel export**: xlsx library
- **PDF export**: jsPDF (chat transcript)

## Environment Variables
```
GOOGLE_SHEETS_ID=<spreadsheet_id>
GOOGLE_SERVICE_ACCOUNT_EMAIL=<email>
GOOGLE_SERVICE_ACCOUNT_KEY=<private_key_with_escaped_newlines>
NEXTAUTH_SECRET=<secret>
NEXTAUTH_URL=http://localhost:3000
```

## Google Sheets Schema (10 columns for Messages — senderRole added)

| Tab | Key Columns |
|-----|-------------|
| `Tenants` | id, name, slug, email, phone, address, createdAt |
| `Users` | id, tenantId, name, email, passwordHash, role, phone, isActive, createdAt |
| `Jobs` | id, tenantId, jobNumber, dateReceived, companyName, agentName, agentContact, agentEmail, propertyAddress, description, category, priority, source, jobStatus, quoteStatus, paymentStatus, slaDeadline, assignedToId, assignedToName, teamGroup, quoteAmount, quoteGst, quoteTotalWithGst, inspectionRequired, notes, createdAt, updatedAt |
| `QuoteItems` | id, jobId, description, quantity, unitPrice, total |
| `ChatThreads` | id, tenantId, jobId, pendingOn, lastMessage, lastMessageAt, lastMessageBy, lastResponseTime, responseDueTime, createdAt, updatedAt |
| `Messages` | id, tenantId, threadId, senderId, senderName, **senderRole**, type, content, metadata, createdAt |
| `Attachments` | id, jobId, messageId, fileName, fileType, fileUrl, fileSize, createdAt |
| `Inspections` | id, tenantId, jobId, inspectedBy, inspectedAt, checklist, notes, status, createdAt |

## Phases

### Phase 0 — Schema Migration [x] done (Session 3)
- Added `migrateTab` + `clearTabData` to `src/lib/sheets.ts`
- Created `POST /api/admin/migrate-sheets` (super_admin only)
- Created `/settings/migrate` UI page — one-click schema fix
- Root cause: Messages tab created without `senderRole` column; values written to wrong cells
- Fix: rewrite header row, clear corrupted data rows

### Phase 1 — Project Scaffold & Auth [x] done
- Next.js 15 app with Tailwind CSS + React 19
- Google Sheets as database (8 tabs — see schema above)
- NextAuth with roles: super_admin, client, operations_manager, technician
- tenantId isolation enforced in all API routes
- `src/lib/sheets.ts`: getRows, findRow, findRows, appendRow, updateRow, ensureTab, migrateTab, clearTabData
- Cache TTL: 30s (reduced from 5min in Session 3)

### Phase 2 — Job Management Module [x] done
- Job CRUD via Google Sheets API
- All job fields (status, priority, quote status, payment, SLA, inspection)
- Job list with filter tabs + search params
- Job detail page (left: details + quote + assign tech; right: SSE chat)
- `/jobs/new` — create job form (ops/admin only)

### Phase 3 — Real-Time Chat System [x] done
- SSE (Server-Sent Events) replacing Socket.io — same port, no separate process
- Per-job chat threads via `src/lib/sse.ts` (in-memory Map per threadId)
- Message types: text, attachment, system
- Keepalive ping every 25s (prevents proxy/browser idle disconnect)
- Reconnect + backfill: on reconnect, fetch `GET /api/chat/[threadId]?since=` to fill gap
- Optimistic UI: `useOptimistic` shows message instantly; replaced with real on API response
- Error logging added to chat POST handler

### Phase 4 — Unanswered Chat + SLA System [x] done
- `pendingOn` field tracks who owes a reply: `team` | `client` | `none`
- `responseDueTime` = +4h from last message
- Dashboard shows "Needs Response" counter

### Phase 5 — Multi-Tenant Dashboard [x] done
- Super admin: global view across all tenants
- Ops manager: their tenant only
- Stat cards: total jobs, new, in-progress, pending quote, needs response, overdue

### Phase 6 — Client Portal [x] done
- `/client` — client's job list (minimal UI)
- `/client/jobs/[id]` — job detail + quote approve/decline + chat
- Public request form `/request/[slug]` — 2-step wizard (job details → password creation)
- Returning client detection via `GET /api/public/check-email`
- Confirmation dialog on quote approve/decline

### Phase 7 — Technician Mobile View [x] done
- `/technician` — assigned jobs list (mobile-optimised)
- `/technician/jobs/[id]` — field view with status update + photo upload + chat

### Phase 8 — Company Management [x] done
- `/companies` — tenant CRUD (super admin only)
- User management at `/settings/users`
- Assign technician to job — `AssignTechnician` component on job detail

### Phase 9 — Reports & Polish [x] done
- `/reports` — Excel export (super admin)
- Chat PDF export per thread
- 404 + error boundary pages
- Skeleton loading states (`loading.tsx` for jobs, dashboard, client)
- Login page: demo account quick-fill + "New client?" link
- Design system: Button, Badge, StatusBadge, Skeleton components

### Phase 10 — Invoice PDF [ ] deferred
- Formatted PDF with letterhead, line items, subtotal, GST, total
- Send by email to client

## Known Limitations (prototype)
- SSE registry is in-process — resets on deploy / server restart (browser auto-reconnects + backfills)
- Google Sheets API quota: 60 req/min — no retry logic
- File uploads: local only (not persisted on cloud deploy)
- No horizontal scaling (SSE Map is module-level, not shared across processes)

## Errors Log

| Date | Error | Fix |
|------|-------|-----|
| 2026-03-31 | Messages tab schema mismatch — senderRole column missing, values shifted to wrong columns | `migrateTab("Messages")` + `clearTabData("Messages")` via `/settings/migrate` |
| 2026-03-30 | Duplicate `const router` in jobs/new — build error | Rewrote file with single declaration |
