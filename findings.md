# Findings — Tradie Ops

## Product Requirements Summary
- Multi-tenant SaaS (property maintenance, Australia)
- Roles: super_admin, client, operations_manager, technician
- Core: Job tracking + real-time chat (WhatsApp-style)
- No invoicing — quotes only (amount + line items)
- Mobile-first, simple UI, non-tech users

## Database Entities
1. Tenant (company)
2. User (belongs to tenant, has role)
3. Job (core entity, all workflow fields)
4. ChatThread (one per job)
5. Message (text/attachment/system, belongs to thread)
6. Quote (linked to job, line items)
7. Inspection (linked to job)
8. Attachment (images/docs, linked to job or message)

## Multi-Tenancy Strategy
- Every table has tenant_id
- Prisma middleware adds tenant filter to ALL queries
- JWT contains tenant_id + role
- Super admin can set tenant context via header/cookie

## Real-Time Architecture
- Socket.io with job-based rooms: `job:{jobId}`
- Events: message:new, job:updated, chat:pending_changed
- Server: Next.js custom server with Socket.io attached

## Key UI Patterns
- Sidebar nav: Dashboard / Jobs / Companies / Reports
- Job detail: split view (details left, chat right)
- Chat: sticky input, bubble messages, timestamps
- Status badges: color-coded (🔴🟡🟢)
- Mobile: stacked layout, large touch targets
