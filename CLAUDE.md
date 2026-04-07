@AGENTS.md

# DGPS_V2 — Domain Group Property Services Portal

Multi-tenant SaaS platform for managing property maintenance jobs across client companies (DGPS, PropServ, ACE, Reliance, etc.). Built with Next.js 16 + Supabase + NextAuth.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2.1 (App Router, React 19) |
| Database | Supabase (PostgreSQL) |
| Auth | NextAuth v4 (JWT strategy) |
| Styling | Tailwind CSS v4 |
| Email | Resend |
| Charts | Recharts |
| PDF | jsPDF |
| Excel | xlsx |
| Animations | Framer Motion |

---

## Project Structure

```
src/
├── app/
│   ├── (app)/                    # Protected routes — all require auth
│   │   ├── dashboard/page.tsx    # KPI dashboard (ops + technician views differ)
│   │   ├── jobs/
│   │   │   ├── page.tsx          # Jobs list (ops/admin only)
│   │   │   ├── new/page.tsx      # Create job — role-aware form (ops vs client)
│   │   │   └── [id]/
│   │   │       ├── page.tsx      # Job detail: metadata, quote builder, chat
│   │   │       ├── chat/page.tsx # Chat-only view (mobile)
│   │   │       └── inspection/page.tsx
│   │   ├── technician/
│   │   │   ├── page.tsx          # Field jobs list (assigned jobs only)
│   │   │   └── jobs/[id]/page.tsx # Tech job detail (status, chat, quote revision)
│   │   ├── client/
│   │   │   ├── page.tsx          # Client portal home
│   │   │   └── jobs/[id]/page.tsx # Client job detail (quote approve/reject)
│   │   ├── analytics/page.tsx    # Revenue, KPIs, quote funnel
│   │   ├── companies/page.tsx    # Tenant management (super_admin only)
│   │   ├── reports/page.tsx      # Excel export
│   │   ├── settings/
│   │   │   ├── users/page.tsx    # User CRUD (super_admin)
│   │   │   ├── team/page.tsx     # Team assignments
│   │   │   └── migrate/page.tsx  # Data migration
│   │   └── layout.tsx            # Sidebar for ops/tech; ClientTopNav for client
│   ├── (auth)/login/page.tsx     # Credentials + Google OAuth
│   ├── api/
│   │   ├── jobs/route.ts         # GET (role-filtered list), POST (create job)
│   │   ├── jobs/[id]/route.ts    # GET detail, PATCH update
│   │   ├── jobs/[id]/quote/route.ts        # POST quote (delete+insert items)
│   │   ├── jobs/[id]/quote/revision/route.ts # POST revision request (technician only)
│   │   ├── chat/[threadId]/route.ts        # GET messages, POST message
│   │   ├── chat/[threadId]/stream/route.ts # SSE for real-time
│   │   ├── chat/[threadId]/pdf/route.ts    # Export chat as PDF
│   │   ├── users/route.ts                  # GET users, POST new user
│   │   ├── users/[id]/route.ts             # GET, PATCH user
│   │   ├── users/[id]/assignments/route.ts # Ops manager tenant assignments
│   │   ├── tenants/route.ts                # GET all tenants
│   │   ├── analytics/overview/route.ts     # KPIs
│   │   ├── analytics/revenue/route.ts
│   │   ├── analytics/quotations/route.ts
│   │   ├── analytics/insights/route.ts
│   │   ├── inspections/route.ts            # POST inspection record
│   │   ├── upload/route.ts                 # POST file upload
│   │   ├── notifications/route.ts          # GET unread count
│   │   ├── reports/excel/route.ts          # POST Excel export
│   │   └── public/
│   │       ├── request/route.ts            # Unauthenticated job submission
│   │       ├── check-email/route.ts
│   │       └── check-tenant/route.ts
│   ├── request/[tenantSlug]/page.tsx  # Public job request form (no auth)
│   └── page.tsx                       # Root redirect (role-aware)
├── components/
│   ├── jobs/
│   │   ├── QuotePanel.tsx         # Quote builder — pre-populates existing items on edit
│   │   ├── QuoteApproveActions.tsx # Client approve/reject
│   │   ├── QuoteRevisionModal.tsx  # Tech quota revision request
│   │   ├── JobActions.tsx          # Role-aware status buttons
│   │   ├── AssignTechnician.tsx    # Dropdown to assign tech
│   │   ├── TechJobActions.tsx      # Tech status actions
│   │   └── InspectionForm.tsx
│   ├── chat/ChatPanel.tsx          # Realtime chat (Supabase Realtime + optimistic)
│   └── layout/
│       ├── Sidebar.tsx             # Role-based nav (Dashboard hidden for client)
│       ├── ClientTopNav.tsx        # Client portal top bar
│       ├── MobileNav.tsx
│       └── NotificationBell.tsx
├── lib/
│   ├── auth.ts            # NextAuth config — JWT callbacks, role extraction
│   ├── db.ts              # All DB formatters and query helpers
│   ├── chat.ts            # ensureChatThreadForJob()
│   ├── supabase-server.ts # supabaseAdmin (service role key, bypasses RLS)
│   └── supabase-client.ts # Client-side Supabase (anon key, Realtime)
└── types/next-auth.d.ts   # Session/JWT type augmentations
```

---

## Database Tables

### tenants
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| name | text | e.g. "Domain Group Property Services" |
| slug | text UNIQUE | e.g. "dgps" |
| email, phone, address | text | |
| logo_url | text | nullable |

### users
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| tenant_id | uuid FK → tenants | |
| name, email | text | |
| password_hash | text | bcrypt |
| role | text | super_admin \| operations_manager \| technician \| client |
| is_active | boolean | |
| google_id, avatar_url | text | nullable, for OAuth |

### ops_manager_tenants
Junction table — allows one ops_manager to manage multiple tenants.
`user_id` → users, `tenant_id` → tenants

### jobs
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| tenant_id | uuid FK | |
| job_number | text | e.g. "JOB-001", auto-generated |
| company_name | text | **End customer name** (NOT the client company) |
| agent_name | text | Staff member from client company who raised the job |
| agent_contact | text | Agent's direct phone |
| agent_email | text | Agent's personal email (NOT the shared login email) |
| customer_contact | text | End customer's phone number |
| customer_email | text | End customer's email |
| property_address | text | |
| description | text | |
| category | text | Plumbing, Electrical, Roofing, HVAC, General Maintenance, Other |
| priority | text | high \| medium \| low |
| source | text | manual \| email \| phone \| public_form |
| job_status | text | new \| ready \| in_progress \| completed \| invoiced \| paid |
| quote_status | text | pending \| sent \| approved \| rejected \| tech_revision_pending |
| payment_status | text | unpaid \| invoiced \| paid |
| quote_amount | numeric | Subtotal (ex GST) |
| quote_gst | numeric | Always 10% of subtotal |
| quote_total_with_gst | numeric | Total incl. GST |
| assigned_to_id | uuid FK → users | Technician assigned |
| assigned_to_name | text | Denormalized |
| inspection_required | text | not_required \| required \| done |
| sla_deadline | timestamp | nullable |
| created_by_user_id | uuid FK → users | |
| created_by_name | text | Denormalized |
| created_by_role | text | Denormalized |

**IMPORTANT field semantics:**
- `company_name` = end customer's name (the person who called DGPS/PropServ)
- `agent_name` + `agent_contact` + `agent_email` = the staff member at the client company
- `customer_contact` + `customer_email` = the end customer's contact info
- For client portal submissions, `source = "public_form"` (until `portal` enum value is added)

### quote_items
`id, job_id, description, quantity, unit_price, total`

### quote_history
Versioned history when quotes are revised. Includes `reason` and `changed_by_name`.

### chat_threads
One thread per job. Key fields:
- `pending_on`: "none" | "team" | "client" — who needs to respond
- `last_message`, `last_message_at`, `last_message_by` — denormalized for list display
- `response_due_time` — SLA deadline for response

### messages
| Column | Notes |
|--------|-------|
| type | "text" \| "attachment" \| "system" |
| sender_role | super_admin \| operations_manager \| technician \| client \| system |
| content | Message body or attachment info |
| metadata | jsonb — used for quote data on system messages |

System messages are auto-inserted when: job created, quote sent, job status changed, etc.

### inspections
Checklist records per job. `status: "passed" | "failed"`, `checklist: jsonb`

---

## Auth & Session

**Strategy:** JWT (no DB sessions)

**Session fields available in every server component:**
```typescript
const session = await getServerSession(authOptions);
const { id, email, name, role, tenantId, tenantName, tenantSlug, assignedTenantIds } = session.user;
```

**Supabase client:** Always use `supabaseAdmin` from `@/lib/supabase-server` for all DB operations. It uses the service role key and bypasses RLS entirely. Never use the anon client for server-side operations.

---

## Roles & Access

| Role | Dashboard | Jobs List | Create Job | Quote | Technician Pages | Client Portal |
|------|:---------:|:---------:|:----------:|:-----:|:----------------:|:-------------:|
| super_admin | ✓ all | ✓ all | ✓ | Send/edit | Can view | ✗ |
| operations_manager | ✓ own+assigned | ✓ own+assigned | ✓ | Send/edit | Can view | ✗ |
| technician | ✓ (assigned jobs only) | ✗ | ✗ | View + request revision | ✓ | ✗ |
| client | ✗ → /client | ✗ | ✓ (portal) | Approve/reject | ✗ | ✓ |

**Root redirect logic** (`/app/page.tsx`):
- `client` → `/client`
- `technician` → `/technician`
- everyone else → `/dashboard`

**Dashboard per role:**
- `super_admin`: all companies, all jobs
- `operations_manager`: own tenant + assigned tenants
- `technician`: only `assigned_to_id = userId` jobs; hides "Requires attention", "Quote awaiting" sections; links go to `/technician/...`
- `client`: redirected to `/client`

---

## Key Business Rules

1. **Job numbers** are sequential per tenant (`nextJobNumber()` in db.ts) — e.g. JOB-001, JOB-002
2. **GST is always 10%** — calculated server-side in the quote API, never client-side
3. **Quote editing** replaces ALL items (DELETE + INSERT) — QuotePanel pre-populates existing items when opening the edit form
4. **Chat thread** is auto-created for every job. For client submissions: `pending_on = "team"`. For ops submissions: `pending_on = "none"`
5. **pending_on** drives the "Requires attention" dashboard alerts — team reply vs awaiting client
6. **Technician access to jobs** — can only see jobs where `assigned_to_id = userId`
7. **Client access to jobs** — can only see jobs where `agent_email = session.email` OR `created_by_user_id = userId`
8. **Quote revision** — technician requests via `QuoteRevisionModal`, sets `quote_status = "tech_revision_pending"`, posts to chat
9. **inspectionRequired** in DB is an enum: `"not_required" | "required" | "done"` — but in formatJob it's mapped to `"false" | "true" | "done"` for UI
10. **Upload flow** — POST to `/api/upload` with `FormData` containing `file` and `jobId`

---

## New Job Form — Role-Aware

`/jobs/new/page.tsx` is a single client component serving both roles. It uses `useSession` to detect role.

**Client form sections:**
- **Your Details**: agent name (required), agent phone with country code (required), agent personal email
- **Customer Details**: customer name (required, stored as `company_name`), customer phone (`customer_contact`), customer email
- **Job Details**: property address, category, description, photo upload, inspection toggle

**Ops manager form sections:**
- **Agent Details**: agent name, agent contact, agent email
- **Customer Details**: customer name (stored as `company_name`), customer contact, customer email
- **Job Meta**: priority, source
- **Job Details**: property address, category, description, inspection toggle

**Payload mapping for both:**
```typescript
// companyName = customer name in both cases
companyName: customerName,
customerContact: "...",
customerEmail: "...",
agentName: "...",
agentContact: "+61 04xx xxx xxx",  // includes country code prefix
agentEmail: "...",
```

---

## Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=         # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=    # Anon key (public, Realtime)
SUPABASE_SERVICE_ROLE_KEY=        # Service role (server-side only, bypasses RLS)
NEXTAUTH_URL=                     # e.g. http://localhost:3000
NEXTAUTH_SECRET=                  # Any strong random string
GOOGLE_CLIENT_ID=                 # Google OAuth credentials
GOOGLE_CLIENT_SECRET=
RESEND_API_KEY=                   # Email service
RESEND_FROM=                      # Sender address
```

---

## DB Migrations Applied

- `portal` added to `job_source` enum ✓ — client portal submissions now use `source: "portal"` instead of `"public_form"`
- New job categories (Carpentry, Cleaning, Painting & Plastering, Garden & Landscaping) added to internal job form ✓

> If `job_category` is also a strict enum in Supabase (not just text), run:
> ```sql
> ALTER TYPE job_category ADD VALUE IF NOT EXISTS 'Carpentry';
> ALTER TYPE job_category ADD VALUE IF NOT EXISTS 'Cleaning';
> ALTER TYPE job_category ADD VALUE IF NOT EXISTS 'Painting & Plastering';
> ALTER TYPE job_category ADD VALUE IF NOT EXISTS 'Garden & Landscaping';
> ```

---

## Common Patterns

### Fetching data (server components)
```typescript
import { supabaseAdmin } from "@/lib/supabase-server";
import { formatJob } from "@/lib/db";

const { data } = await supabaseAdmin.from("jobs").select("*").eq("id", id).single();
const job = formatJob(data);
```

### Role-based access check
```typescript
const session = await getServerSession(authOptions);
if (!session) redirect("/login");
const { role, tenantId, id: userId, assignedTenantIds } = session.user;

// Tenant isolation
const accessible = new Set([tenantId, ...(assignedTenantIds ?? [])]);
if (role !== "super_admin" && !accessible.has(jobData.tenant_id)) notFound();
```

### Multi-tenant scoping
```typescript
// Operations manager can manage own tenant + assigned tenants
const accessible = Array.from(new Set([tenantId, ...(assignedTenantIds ?? [])]));
q = q.in("tenant_id", accessible);
```

### Calling API from client components
```typescript
const res = await fetch(`/api/jobs/${jobId}/quote`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ items }),
});
if (!res.ok) { const data = await res.json(); /* handle error */ }
router.refresh(); // re-render server components
```

---

## Development Notes

- **Next.js 16 App Router** — use `async/await` in server components; no `getServerSideProps`
- **params is a Promise** — always `const { id } = await params` in page/route handlers
- **No RLS** — all access control is implemented in application code, not Supabase RLS
- **Realtime** — ChatPanel uses `supabase-client.ts` (anon key) to subscribe to message inserts
- **router.refresh()** — used after mutations to re-fetch server component data without full reload
- **Hydration errors** — client components with `useSession` must show a loading state while `status === "loading"` to avoid SSR/client mismatch
- **formatJob** maps all snake_case DB fields to camelCase. Always use these formatters, never access raw DB row fields in UI code
- **company_name confusion** — this column stores END CUSTOMER name in all flows now. The client company name comes from the tenant record, not this field.
