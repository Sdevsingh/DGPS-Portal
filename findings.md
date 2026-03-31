# Findings — Tradie Ops

## Product Requirements Summary
- Multi-tenant SaaS (property maintenance, Australia)
- Roles: `super_admin`, `client`, `operations_manager`, `technician`
- Core: Job tracking + real-time chat (WhatsApp-style)
- No invoicing — quotes only (amount + line items with 10% GST)
- Mobile-first, simple UI, non-tech users

## Database Entities
1. Tenant (company)
2. User (belongs to tenant, has role, bcrypt-hashed password)
3. Job (core entity — 27 fields covering full workflow)
4. ChatThread (one per job — tracks pendingOn, lastMessage, SLA times)
5. Message (text / attachment / system, has senderRole)
6. QuoteItem (line items for job quotes)
7. Inspection (linked to job)
8. Attachment (images/docs, linked to job or message)

## Multi-Tenancy Strategy
- Every Google Sheet row has a `tenantId` column
- API routes manually filter by `session.user.tenantId` at the top of each handler
- JWT token contains `tenantId`, `role`, `name`, `id`
- `super_admin` bypasses tenant checks — can access all tenants
- Client users are scoped to their own jobs by `clientEmail` matching

## Real-Time Architecture
**Replaced Socket.io with SSE (Server-Sent Events)**

- Single in-process registry: `src/lib/sse.ts` — `Map<threadId, Set<ReadableStreamDefaultController>>`
- SSE stream endpoint: `GET /api/chat/[threadId]/stream`
  - Returns `text/event-stream`
  - Keepalive: sends `: ping\n\n` every 25 seconds (prevents proxy/browser idle disconnect)
  - Registered in the global `clients` Map on connect; cleaned up on abort
- Broadcast: `broadcastToThread(threadId, data)` called from chat POST handler after Sheets write
- ChatPanel reconnect: on `EventSource` `onerror`, fetches `GET /api/chat/[threadId]?since=` to backfill missed messages
- Optimistic UI: `useOptimistic(committed, reducer)` — message appears instantly with 60% opacity, replaced with real message on POST 201

**Known limitations:**
- SSE registry lives in Node.js module scope — resets on server restart or new deploy
- Browser `EventSource` auto-reconnects; backfill closes the gap for missed messages
- Not suitable for multi-process / horizontal scaling without a Redis pub/sub layer

## Google Sheets as Database
- `src/lib/sheets.ts` — custom CRUD layer (no ORM)
- 30-second in-memory cache per tab, busted on any write (`bustCache(tab)`)
- `appendRow` maps values by `HEADERS[tab]` order — column order in HEADERS must match actual sheet
- `migrateTab(tab)` — rewrites row 1 to match HEADERS (use when columns are added)
- `clearTabData(tab)` — deletes all data rows after header row
- **Critical**: when adding a column to HEADERS, existing sheet rows have values in the wrong positions. Always run `POST /api/admin/migrate-sheets` after any HEADERS change.

## Design System Tokens
| Token | Value | Usage |
|-------|-------|-------|
| Border radius buttons | `rounded-xl` | Buttons, inputs, form panels |
| Border radius cards | `rounded-2xl` | Cards, modals, chat bubbles |
| Border radius pills | `rounded-full` | Badges, status pills, avatars |
| Primary | `blue-600` | CTAs, active nav, links |
| Danger | `red-600` | Delete, decline actions |
| Success | `green-600` | Approve, complete actions |
| Body font | `text-sm` (14px) | General content |
| Label font | `text-xs` (12px) | Badges, metadata, timestamps |

**Shared components** (`src/components/ui/`):
- `Button` — variant: primary / secondary / danger / ghost; size: sm / md / lg
- `Badge` — color-mapped pill; size: xs / sm
- `StatusBadge` — maps jobStatus / quoteStatus / paymentStatus / priority strings to Badge
- `Skeleton` — shimmer loading states; `JobCardSkeleton`, `DashboardStatSkeleton`

## Key UI Patterns
- Sidebar nav (dark): Dashboard / Jobs / Companies / Reports / Users / Data Migration
- Job detail: split view (details + quote + assign tech on left; SSE chat on right)
- Mobile: full-screen chat via FAB → `/jobs/[id]/chat`
- Chat: sticky input, bubble messages (blue=me, white=others), system messages as gray pills
- Status badges: color-coded (blue=new, yellow=in_progress, green=completed, emerald=paid)
- Loading: Next.js `loading.tsx` files with skeleton shimmer for jobs, dashboard, client portal

## Security Notes
- Passwords: bcryptjs (rounds=10) — never returned in API responses
- File uploads: MIME type checked server-side (jpg/png/pdf only, 10MB max)
- Public form: IP rate-limited (5 req/min for submit, 10 req/min for email check) + honeypot field
- Reports: 403 if role ≠ super_admin
- Google Sheet: only accessible via service account — never exposed to browser
