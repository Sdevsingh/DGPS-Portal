# Task Plan — Tradie Ops (Property Maintenance SaaS)

## Goal
Build a multi-tenant, real-time operations management web app for a plumbing/property maintenance business (Australia-based).
Core concept: "WhatsApp + Job Tracker for Tradies"

## Tech Stack Decision
- **Frontend**: Next.js 14 (App Router) + Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Google Sheets (multi-tenant via tenantId on all rows)
- **Real-time**: Socket.io (WebSocket-based chat)
- **Auth**: NextAuth.js (JWT, role-based)
- **File uploads**: Local (dev) → S3-ready
- **Excel export**: xlsx library
- **PDF export**: jsPDF

## Phases

### Phase 1 — Project Scaffold & Auth [x] done
- Next.js 14 app with Tailwind
- Google Sheets as database (tabs: Tenants, Users, Jobs, QuoteItems, ChatThreads, Messages, Attachments, Inspections)
- NextAuth with roles: super_admin, client, operations_manager, technician
- tenantId isolation enforced in all API routes
- sheets.ts: getRows, findRow, findRows, appendRow, updateRow, ensureTab

### Phase 2 — Job Management Module [ ] pending
- Job CRUD (create, read, update, delete)
- All job fields (status, priority, quote status, etc.)
- Job list views + filters
- Job detail page layout (left: details, right: chat)

### Phase 3 — Real-Time Chat System [ ] pending
- Socket.io server setup
- Per-job chat threads
- Message types: text, attachment, system messages
- pending_on tracking (Client / Team / None)
- WhatsApp-style UI

### Phase 4 — Unanswered Chat + SLA System [ ] pending
- Dashboard counters (needs response, overdue)
- last_response_time + response_due_time tracking
- SLA breach alerts

### Phase 5 — Multi-Tenant Dashboard [ ] pending
- Super admin: global view, tenant switcher
- Client dashboard: their jobs, chats, quotes
- Visual indicators (🔴🟡🟢)

### Phase 6 — Company Management [ ] pending
- Tenant CRUD (super admin)
- User management per tenant
- Role assignment

### Phase 7 — Inspection Module [ ] pending
- Inspection records linked to jobs
- Pass/Fail, notes, before/after images

### Phase 8 — Reports & Export [ ] pending
- Weekly Excel export (3 sheets)
- Chat PDF export per job

### Phase 9 — Polish & Performance [ ] pending
- Mobile-first responsive check
- Lazy load messages
- Image optimization
- Load time audit

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| — | — | — |

## Key Decisions
- Using App Router (not Pages) for better layouts and server components
- Google Sheets instead of PostgreSQL — no infra to manage, client already uses it
- tenantId on ALL sheet rows — enforced at API route level
- Socket.io over native WebSocket for easier room management per job
- No invoicing module (explicitly excluded per brief)
