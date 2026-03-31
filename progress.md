# Progress Log — Tradie Ops

---

## Session 1 — 2026-03-30

**Started:**
- Received full product brief
- Decided tech stack: Next.js 15, Tailwind, Google Sheets (not Prisma/PostgreSQL), NextAuth
- Created task_plan.md, findings.md, progress.md

**Completed:**
- Phase 1: Project scaffold + Google Sheets CRUD layer (`src/lib/sheets.ts`)
- Phase 1: NextAuth with 4 roles (super_admin, operations_manager, technician, client)
- Phase 2: Full job management — create, list, filter, detail page
- Phase 2: Quote panel with GST calculation and line items
- Phase 3: Real-time chat with SSE + optimistic UI (Socket.io not used)
  - `src/lib/sse.ts` — in-process SSE registry
  - `GET /api/chat/[threadId]/stream` — SSE endpoint with 25s keepalive
  - `useOptimistic` in ChatPanel for instant message display
  - Reconnect-and-backfill on SSE disconnect
- Phase 4: pendingOn tracking, responseDueTime (+4h)
- Phase 5: Multi-tenant dashboard with stat cards
- Phase 6: Client portal (/client, /client/jobs/[id])
- Phase 6: Public request form (/request/[slug]) with password creation
- Phase 7: Technician mobile view (/technician, /technician/jobs/[id])
- Phase 8: Company management + user management
- Phase 8: Reports page (Excel export)

**Bug fixed:**
- Duplicate `const router` in jobs/new — build error on Next.js 15

---

## Session 2 — 2026-03-30 (continued)

**Completed:**
- SSE fully replaced Socket.io — removed server/socket.ts + socket.io from package.json
- Public request form upgraded to 2-step wizard (job details → password creation)
  - `GET /api/public/check-email` — returning client detection (no password needed for existing users)
  - Password strength bar + show/hide toggle
- Quote approve/decline → confirmation dialog (prevent accidental clicks)
- Assign Technician component on job detail page (ops/admin only)
- 404 page + error boundary pages
- Sidebar: role-filtered nav (technicians → "Field Jobs" only)
- Skeleton loading states — `loading.tsx` for jobs, dashboard, client pages
- Login page: demo account quick-fill + "New client?" link to request form

---

## Session 3 — 2026-03-31

**Bug identified + fixed — messages disappear on page reload:**
- **Root cause**: Messages Google Sheet tab was created with 9 columns (senderRole missing). Chat POST was writing 10 values (including senderRole) to a 9-column sheet. Google Sheets auto-extended columns but the header row still had 9 labels. On read-back, `getRows("Messages")` mapped column indices against the ACTUAL header row — so `content` column received the literal string "text" and actual message text landed in `metadata`.
- **Fix**: `migrateTab(tab)` — rewrites header row to match current HEADERS definition. `clearTabData(tab)` — deletes all data rows after header (corrupted rows cannot be repaired).
- `POST /api/admin/migrate-sheets` — one-click schema fix for all tabs (super_admin only)
- `/settings/migrate` — admin UI page with "Run Migration" button + results table

**Other improvements:**
- Chat POST handler: try/catch around appendRow (500 + console.error on failure); 400 on empty content
- Cache TTL reduced from 5 min → 30s in `src/lib/sheets.ts`
- Design system components: `Button`, `Badge`, `StatusBadge`, `Skeleton` in `src/components/ui/`
- "Data Migration" link added to Sidebar (super_admin only, under settings)

**Documentation:**
- task_plan.md: updated tech stack, all phases marked done, schema table updated, errors log added
- findings.md: updated real-time architecture (SSE), removed Prisma references, added known limitations

**Partner setup checklist (after git pull):**
1. `npm install`
2. Copy `.env` with Google credentials (get from team)
3. `npx tsx src/lib/sheets-seed.ts` — creates all tabs + demo data with correct schema
4. Login as admin@dgps.com.au → Settings → Data Migration → Run Migration
5. `npm run dev` → http://localhost:3000
