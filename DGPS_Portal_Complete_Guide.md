# DGPS Portal — Complete Functionality & Feature Guide

> **Domain Group Property Services** — Job Management & Service Delivery Platform
>
> Last updated: 2 April 2026 | Based on commit `07088bc` (latest)

---

## Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [Technology Stack](#2-technology-stack)
3. [User Roles & Permissions](#3-user-roles--permissions)
   - 3.1 Super Admin
   - 3.2 Operations Manager
   - 3.3 Technician
   - 3.4 Client
4. [Authentication & Security](#4-authentication--security)
5. [Dashboard](#5-dashboard)
6. [Job Management](#6-job-management)
7. [Quote System](#7-quote-system)
8. [Real-Time Chat System](#8-real-time-chat-system)
9. [Inspection System](#9-inspection-system)
10. [Client Portal](#10-client-portal)
11. [Technician Field App](#11-technician-field-app)
12. [Public Job Request Form](#12-public-job-request-form)
13. [Notification System](#13-notification-system)
14. [Company (Tenant) Management](#14-company-tenant-management)
15. [User Management](#15-user-management)
16. [Reports & Analytics](#16-reports--analytics)
17. [Job Lifecycle & Workflow](#17-job-lifecycle--workflow)
18. [Data Model & Architecture](#18-data-model--architecture)
19. [API Reference](#19-api-reference)
20. [Recent Changes (Latest Commits)](#20-recent-changes-latest-commits)

---

## 1. Platform Overview

DGPS Portal is a comprehensive, multi-tenant job management platform built for property maintenance and service companies. It handles the complete lifecycle of service requests — from client submission through quoting, field execution, inspection, invoicing, and payment tracking.

**Core value proposition:**
- Clients submit service requests via a public form or the client portal
- Operations managers create jobs, prepare quotes, and assign technicians
- Technicians receive assigned jobs, perform inspections, and update status from the field
- Real-time chat connects all parties on each job
- Super admins oversee the entire platform across multiple companies

---

## 2. Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js (App Router) with React 19 |
| Authentication | NextAuth v4 (Credentials provider, JWT strategy) |
| Database | Google Sheets via `googleapis` (service account) |
| Real-time | Server-Sent Events (SSE) for live chat |
| Email | Nodemailer (Gmail SMTP) for password resets |
| Styling | Tailwind CSS v4 with custom animations |
| Deployment | Node.js (compatible with Vercel, etc.) |

---

## 3. User Roles & Permissions

The platform enforces strict role-based access control (RBAC) at every layer — pages, API routes, and data queries.

---

### 3.1 Super Admin (`super_admin`)

**Purpose:** Platform-wide administrator with unrestricted access across all companies/tenants.

**What they can do:**

| Capability | Details |
|-----------|---------|
| View all data | Jobs, users, chats, quotes, inspections across every company |
| Manage companies | Create new tenants, view company stats |
| Manage users | Create, edit, activate/deactivate users in any company |
| Manage jobs | Create, edit, delete jobs for any tenant |
| View reports | Generate Excel reports with cross-company analytics |
| Chat access | Read and post in any job's chat thread |
| Scope filtering | Can optionally filter view to a single company |
| Admin endpoints | Access reseed, migrate-sheets, clear-chats utilities |

**Pages accessible:**
- `/dashboard` — Global overview with all-company breakdown
- `/jobs` — All jobs across all companies (filterable by company)
- `/jobs/new` — Create jobs for any tenant
- `/jobs/[id]` — Any job detail + chat
- `/companies` — Company management (exclusive)
- `/settings/users` — User management (exclusive)
- `/reports` — Excel report generation (exclusive)
- `/technician` — Technician field view (can view all)

**Dashboard shows:**
- Global job metrics (total, new, in-progress, completed)
- Attention-required section (needs team reply, awaiting client, overdue chats)
- Job status pipeline across all companies
- Jobs by Company breakdown chart
- Recent activity feed

---

### 3.2 Operations Manager (`operations_manager`)

**Purpose:** Day-to-day job and team management within their assigned company.

**What they can do:**

| Capability | Details |
|-----------|---------|
| Create jobs | New job form with full details, auto-generates job number |
| Manage jobs | Edit status, priority, assignment, notes for tenant's jobs |
| Create & send quotes | Build itemised quotes with GST calculation |
| Assign technicians | Assign/reassign techs to jobs from tenant's user list |
| Chat | Read and post messages in all tenant job threads |
| View technicians | See technician field view for their tenant |
| View users | See user list for their tenant |
| Inspections | View and complete inspection reports |

**Pages accessible:**
- `/dashboard` — Tenant-specific metrics and activity
- `/jobs` — Jobs for their company only (with filters)
- `/jobs/new` — Create new job
- `/jobs/[id]` — Job detail, quote panel, chat, assign tech
- `/jobs/[id]/inspection` — Inspection form
- `/technician` — Technician field view (tenant-scoped)

**Cannot do:**
- View other companies' data
- Manage users or companies
- Access admin endpoints
- Generate reports

---

### 3.3 Technician (`technician`)

**Purpose:** Field worker who executes jobs assigned to them.

**What they can do:**

| Capability | Details |
|-----------|---------|
| View assigned jobs | Only jobs where `assignedToId` matches their user ID |
| Update job status | Start job (new → in_progress), Mark completed |
| Chat on jobs | Post messages in threads for their assigned jobs |
| Inspections | Complete inspection checklists for assigned jobs |
| Navigate | Direct link to Apple Maps for job addresses |
| View quotes | Read-only view of quotes on their jobs |

**Pages accessible:**
- `/technician` — Field dashboard showing only their assigned jobs
- `/technician/jobs/[id]` — Job detail with chat, actions, inspection link
- `/jobs/[id]/inspection` — Inspection form for assigned jobs

**Cannot do:**
- View unassigned jobs or other technicians' jobs
- Create jobs or quotes
- Manage users
- Access dashboard, settings, reports, or companies pages

---

### 3.4 Client (`client`)

**Purpose:** External customer who submits service requests and approves quotes.

**What they can do:**

| Capability | Details |
|-----------|---------|
| View own jobs | Jobs where `agentEmail` matches or `createdByUserId` matches |
| Approve/reject quotes | Only permitted modification — change `quoteStatus` |
| Chat | Post messages in threads for their jobs |
| Submit requests | Via public form or client portal link |
| View quotes | See itemised breakdown with GST |

**Pages accessible:**
- `/client` — Client dashboard with job summary cards and filters
- `/client/jobs/[id]` — Job detail with quote approval and chat
- `/request/[tenantSlug]` — Public request form

**Cannot do:**
- Create or edit jobs
- Modify any field except `quoteStatus`
- View other clients' jobs
- Access admin, settings, reports, or company pages
- View technician information

**Key restrictions enforced in API:**
```
Clients can ONLY PATCH: { quoteStatus: "approved" | "rejected" }
Any other field modification returns 403 Forbidden.
```

---

## 4. Authentication & Security

### Login Flow

1. User navigates to `/login`
2. Enters email + password (+ optional company slug for multi-tenant disambiguation)
3. System finds all active users matching the email
4. If company slug provided, filters to that tenant
5. Compares bcrypt password hash against each candidate
6. Exactly one match required (error if zero or multiple)
7. JWT token created with: `id, email, name, role, tenantId, tenantName, tenantSlug`
8. User redirected based on role:
   - `super_admin` / `operations_manager` → `/dashboard`
   - `technician` → `/technician`
   - `client` → `/client`

### Password Reset

1. User clicks "Forgot Password" on login page
2. Enters their email → `POST /api/auth/forgot-password`
3. System creates a `PasswordResets` record with a 64-char hex token (1-hour expiry)
4. Email sent via Resend API with reset link
5. User clicks link → `/reset-password?token=...`
6. Enters new password → `POST /api/auth/reset-password`
7. Token validated (not expired, not used), password updated, token marked used

### Security Features

| Feature | Implementation |
|---------|---------------|
| Password hashing | bcryptjs with 10 salt rounds |
| Session strategy | Stateless JWT tokens |
| Multi-tenant isolation | All queries filtered by `tenantId` |
| Cross-tenant protection | 403 Forbidden or `notFound()` for unauthorized access |
| Rate limiting | 5 requests/IP/minute on public form |
| Spam protection | Honeypot field on public request form |
| Password hash protection | Never exposed in API responses |
| Email disambiguation | Company slug allows same email across tenants |

### Demo Accounts (for testing)

| Role | Email | Company |
|------|-------|---------|
| Super Admin | `admin@dgps.com.au` | DGPS |
| Operations Manager | `ops@dgps.com.au` | DGPS |
| Technician | `tech@dgps.com.au` | DGPS |
| Client | `client@dgps.com.au` | DGPS |

---

## 5. Dashboard

**Route:** `/dashboard`
**Access:** Super Admin, Operations Manager (redirects technicians/clients to their portals)

### Layout & Sections

**1. Greeting Header**
- Personalised: "Good morning, [Name]" with company name
- Super admin sees "Global overview" instead of company name

**2. Attention Required (conditional)**
Appears only if there are items needing action:
- **Needs Team Reply** (red) — Chats where `pendingOn = "team"`
- **Awaiting Client** (amber) — Chats where `pendingOn = "client"`
- **Overdue Chats** (orange) — Past `responseDueTime`

**3. Metric Cards (4-column grid)**
| Card | Description | Link |
|------|------------|------|
| Total Jobs | All jobs count | `/jobs` |
| New | Jobs with `jobStatus = "new"` | `/jobs?status=new` |
| In Progress | Jobs with `jobStatus = "in_progress"` | `/jobs?status=in_progress` |
| Completed | Jobs with `jobStatus = "completed"` | `/jobs?status=completed` |

**4. Job Status Pipeline**
Visual progress bars showing distribution of jobs across all statuses (new, ready, in_progress, completed, invoiced, paid).

**5. Pending Quotes Alert**
Highlights jobs that have `quoteStatus = "pending"` — reminding ops managers to prepare quotes.

**6. Jobs by Company (Super Admin only)**
Breakdown showing job counts per company/tenant across the platform.

**7. Recent Activity**
The 6 most recent jobs with status badges and "needs reply" indicators.

---

## 6. Job Management

### Jobs List (`/jobs`)

**Access:** Operations Manager, Super Admin

**Features:**
- **Sorting:** Priority (high → medium → low), then newest first
- **Filters available:**
  - Job status (new, ready, in_progress, completed, invoiced, paid)
  - Quote status (pending, sent, approved, rejected)
  - Priority (high, medium, low)
  - Payment status
  - Inspection required (true/false)
  - Company (super admin only)
  - Chat pending status (team, client, overdue)

**Each job row displays:**
- Priority indicator dot (colour-coded)
- Job number + property address
- Description preview (hidden on mobile)
- Status badge
- Quote status badge
- "Reply needed" indicator (if chat pending on team)
- Inspection badge (if required and not yet completed)
- Assigned technician name

**Action:** "New Job" button → `/jobs/new`

---

### Create New Job (`/jobs/new`)

**Access:** Operations Manager, Super Admin

**Form fields:**

| Field | Required | Description |
|-------|----------|-------------|
| Property Address | Yes | Service location |
| Company Name | Yes | Client's company |
| Agent Name | No | Client contact name |
| Agent Contact | No | Client phone number |
| Client Email | No | Links job to client portal account |
| Category | Yes | Plumbing, Electrical, Roofing, HVAC, General Maintenance, Other |
| Priority | Yes | Low / Medium / High |
| Source | Yes | Manual, Email, Phone |
| Description | Yes | Full job description (multiline) |
| Inspection Required | No | Toggle (default: false) |

**On creation:**
1. Generates sequential job number (`JOB-001`, `JOB-002`, etc.)
2. Auto-creates a chat thread for the job
3. Posts a system message: "Job [number] created"
4. Redirects to the job detail page

---

### Job Detail (`/jobs/[id]`)

**Access:** Role-dependent (ops/admin see all in tenant; technicians if assigned; clients if email matches)

**Two-column layout (desktop):**

**Left Panel (Details):**
- Job header: number + status badges (payment status shown if not unpaid)
- Property address card with location icon
- Details grid:
  - Category, Priority (colour badge), Source
  - Created by (name or "Client Request Form" for public submissions)
  - Agent name + contact
  - Assigned technician (if any)
  - SLA Deadline (if set)
  - Inspection Required badge
- Full description
- **Quote Panel** (see Section 7)
- **Assign Technician** button (ops/admin only)
- **Job Action buttons** (workflow transitions)

**Right Panel (Chat):**
- Chat header with "Export PDF" button
- Real-time ChatPanel component

**Mobile:**
- Single-column stacked layout
- Floating action button (FAB) for chat → `/jobs/[id]/chat`

---

## 7. Quote System

### Overview

The quote system allows operations managers to create itemised quotes for jobs, which are then sent to clients for approval or rejection.

### Quote Statuses

| Status | Meaning | Badge Colour |
|--------|---------|-------------|
| `pending` | No quote prepared yet | Grey |
| `sent` | Quote sent, awaiting client response | Blue |
| `approved` | Client accepted the quote | Green |
| `rejected` | Client declined the quote | Red |

### Creating & Sending a Quote (Ops/Admin)

1. Navigate to job detail → Quote Panel section
2. Add line items:
   - Description (e.g., "Labour — 2 hours")
   - Quantity
   - Unit price
3. System auto-calculates:
   - **Subtotal** = sum of (quantity × unit price) per item
   - **GST (10%)** = subtotal × 0.10
   - **Total incl. GST** = subtotal + GST
4. Click "Send Quote"

**What happens on send:**
- `POST /api/jobs/[id]/quote` with items array
- QuoteItems rows created in database
- Job updated with `quoteAmount`, `quoteGst`, `quoteTotalWithGst`
- `quoteStatus` set to `"sent"`
- System message posted to chat: "Quote Sent — $X.XX incl. GST"
- Chat thread `pendingOn` set to `"client"` with 48-hour response deadline

### Client Quote Approval/Rejection

1. Client sees "Quote Ready — tap to review" alert on their portal
2. Opens job detail → sees full itemised breakdown
3. Clicks **Approve** or **Reject**
4. `PATCH /api/jobs/[id]` with `quoteStatus: "approved"` or `"rejected"`
5. System message posted: "Quote Approved ✅" or "Quote Declined ❌"
6. Chat thread `pendingOn` set to `"team"`

### Re-quoting

If a quote is rejected, ops managers can create and send a new quote (items are cleared and recreated).

---

## 8. Real-Time Chat System

### Overview

Every job has an associated chat thread. All parties (ops managers, technicians, clients, super admins) can communicate in real-time within the context of each job.

### Features

| Feature | Implementation |
|---------|---------------|
| Real-time messaging | Server-Sent Events (SSE) via `/api/chat/[threadId]/stream` |
| Optimistic UI | Messages appear instantly before server confirmation |
| Auto-scroll | Scrolls to latest message automatically |
| SSE reconnection | Auto-reconnects and backfills missed messages |
| Pending tracking | Thread tracks who needs to respond next (`pendingOn`) |
| Response SLA | 4-hour default per message; 48 hours for quotes |
| PDF export | Full chat history exportable as PDF |
| System messages | Automated messages for status/quote changes |

### Message Types

| Type | Description |
|------|-------------|
| `text` | Regular user message |
| `attachment` | File/photo attachment |
| `system` | Automated status update (quote sent, job completed, etc.) |

### Pending Status Tracking

The chat thread maintains `pendingOn` to track whose turn it is to respond:

- **`"team"`** — Waiting for ops manager or technician to reply
- **`"client"`** — Waiting for client to reply
- **`"none"`** — No pending action

This drives the notification system and "needs reply" indicators on the dashboard and job lists.

### Chat Access Rules

| Role | Access |
|------|--------|
| Super Admin | All threads across all tenants |
| Operations Manager | All threads in their tenant |
| Technician | Only threads for jobs assigned to them |
| Client | Only threads for their own jobs |

---

## 9. Inspection System

### Overview

Jobs can be flagged as requiring inspection. Technicians and ops managers complete a structured checklist before the job proceeds.

**Route:** `/jobs/[id]/inspection`
**Access:** Technician, Operations Manager, Super Admin (not clients)

### Inspection Checklist

The inspection form presents a standardised checklist (plumbing-focused by default):

| Item | Options |
|------|---------|
| Water pressure checked | Pass / Fail / N/A |
| Pipe connections secure | Pass / Fail / N/A |
| No visible leaks | Pass / Fail / N/A |
| Drainage functioning | Pass / Fail / N/A |
| Hot water system operational | Pass / Fail / N/A |
| Fixtures tested | Pass / Fail / N/A |
| Shutoff valves operational | Pass / Fail / N/A |
| Safety compliance confirmed | Pass / Fail / N/A |

### Completing an Inspection

1. Check each item as Pass, Fail, or N/A
2. Add inspector notes (optional)
3. Summary bar shows: ✓ X Pass, ✗ Y Fail, Z remaining
4. Save button enabled only when all items are checked
5. On save:
   - `POST /api/inspections` with checklist JSON, notes, jobId
   - Status auto-determined: **"passed"** if no failures, else **"failed"**
   - Job's `inspectionRequired` updated to `"done"`

### Inspection States on Jobs

| `inspectionRequired` Value | Meaning |
|---------------------------|---------|
| `"false"` | No inspection needed |
| `"true"` | Inspection required but not yet done |
| `"done"` | Inspection completed |

---

## 10. Client Portal

### Client Dashboard (`/client`)

**Access:** Client role only

**Layout:**
- **Header banner:** Gradient blue with company name + welcome message
- **"Submit New Request" button** → links to public form `/request/[tenantSlug]`
- **Summary filter cards (clickable):**
  - All Jobs (total count)
  - Active (not completed/paid)
  - Awaiting You (quote status = "sent")
  - Completed (completed/paid)
- **Job list** — filtered by selected summary card

**Each job card shows:**
- Property address (bold)
- Category + job number + priority badge
- Status or quote status badge
- Date submitted
- Quote total (if available)
- "Quote Ready — tap to review and approve" alert (if quote status = sent)
- "Inspection required before quote" message (if applicable)

### Client Job Detail (`/client/jobs/[id]`)

**Sections:**
1. **Sticky header:** Property address, job number, category, priority, status badges
2. **Status summary card**
3. **Key details grid:** Priority, quote status, submitted date
4. **Problem description** with full text and submission date
5. **Quote breakdown** (if quote exists):
   - Quote status badge
   - Itemised line items with quantities and totals
   - Subtotal, GST (10%), Total incl. GST
   - **Approve / Reject buttons** (only if quote status = "sent")
6. **Chat section** — Messages with team

---

## 11. Technician Field App

### Technician Dashboard (`/technician`)

**Access:** Technician (sees own jobs), Ops Manager & Super Admin (sees all active jobs)

**Shows job cards for assigned active jobs (status ≠ completed/paid):**

Each card includes:
- Priority colour bar (red/yellow/green) at top
- Property address + job number + category
- Priority badge
- Status badge
- Description preview (2-line clamp)
- **Three action buttons:**
  - **Chat & Details** → `/technician/jobs/[id]`
  - **Navigate** → Apple Maps link to property address
  - **Photo upload** → links to detail page

### Technician Job Detail (`/technician/jobs/[id]`)

**Layout:**
1. **Priority colour bar** at top
2. **Dark header:** Job address, number, category, status badge
3. **Navigate button** — Direct to Apple Maps
4. **Job details card:**
   - Full description
   - Priority (colour-coded text)
   - SLA Deadline
   - Agent name + clickable phone link
   - Inspection Required section with "Start →" link
5. **Status & Photo Actions** (TechJobActions):
   - **Start Job** button (if status = new/ready)
   - **Mark Completed** button (if status = in_progress)
6. **Quote panel** (read-only)
7. **Chat section** with messages

---

## 12. Public Job Request Form

**Route:** `/request/[tenantSlug]`
**Access:** Public — no authentication required

### Purpose

Allows anyone (existing or new clients) to submit a service request to a specific company without needing an account first.

### Multi-Step Form

**Step 1 — Client Information:**

| Field | Required | Validation |
|-------|----------|------------|
| Name | Yes | — |
| Email | Yes | Email format |
| Country code | Yes | Dropdown (+61, +1, +44, +64, +91, +65, +971, +60, +852, +86) |
| Phone number | Yes | Validated per country code |

**Step 2 — Job Details:**

| Field | Required |
|-------|----------|
| Property Address | Yes |
| Job Description | Yes |
| Category | Yes (dropdown) |
| Inspection Required | No (toggle) |

**Step 3 — Create Account (if new client):**

| Field | Required | Validation |
|-------|----------|------------|
| Password | Yes (if new) | Min 8 characters |
| Confirm Password | Yes (if new) | Must match |

Includes password strength meter (Weak / Fair / Good / Strong).

### On Submission

- `POST /api/public/request`
- If email already exists in tenant → auto-create job (no password needed)
- If new email → create user account + create job
- Job gets `source: "public_form"`, `quoteStatus: "pending"`
- Chat thread auto-created
- Redirects to confirmation page

### Anti-Spam Protections

- **Honeypot field:** Hidden `_honeypot` field; submissions with it filled are silently discarded
- **Rate limiting:** 5 requests per IP per minute

---

## 13. Notification System

### Overview

Real-time notifications are delivered via a bell icon in the navigation bar. The system polls `/api/notifications` every 30 seconds.

### Notifications by Role

**Super Admin / Operations Manager receive:**

| Notification | Trigger | Link |
|-------------|---------|------|
| Chat reply needed | `pendingOn = "team"` | Job detail |
| Overdue chat | `responseDueTime` has passed | Job detail |
| Pending quote | Job with `quoteStatus = "pending"` | Job detail |
| Recently assigned job | New job assigned to tenant | Job detail |

**Client receives:**

| Notification | Trigger | Link |
|-------------|---------|------|
| Quote ready | `quoteStatus = "sent"` | Client job detail |
| Team replied | New message from team | Client job detail |
| Job update | Status change on their job | Client job detail |

### Notification Properties

Each notification contains:
- `id` — Unique identifier
- `type` — Category (chat, quote, assignment, etc.)
- `title` — Short heading
- `body` — Description text
- `href` — Deep link to relevant page
- `at` — Timestamp

---

## 14. Company (Tenant) Management

**Route:** `/companies`
**Access:** Super Admin only

### Features

- **List all companies** on the platform
- **Stats per company:**
  - Total job count
  - Total user count
  - Active jobs count
- **Company cards** with coloured initials avatar
- **Create Company** button — modal to add new tenant with:
  - Name
  - Slug (URL-friendly identifier)
  - Email, phone, address

### Multi-Tenant Architecture

- Every data record is tagged with `tenantId`
- Users belong to exactly one tenant
- Data queries are filtered by tenant (except for super admin)
- Tenant slug is used in URLs (e.g., `/request/dgps`)
- Same email can exist across different tenants (disambiguated by slug at login)

---

## 15. User Management

**Route:** `/settings/users`
**Access:** Super Admin only

### Features

- View all users across all companies
- **Create new user** with:
  - Name, email, password
  - Role selection (super_admin, operations_manager, technician, client)
  - Tenant assignment
  - Phone number
- **Edit existing users:**
  - Change role
  - Toggle active/inactive status
  - Update profile information
- **Password hashes are never exposed** in the UI or API responses
- **User status toggle** — activate/deactivate users without deleting

---

## 16. Reports & Analytics

**Route:** `/reports`
**Access:** Super Admin only

### Excel Report Generation

Click the **"Download Weekly Report"** button to generate an Excel workbook containing:

| Sheet | Contents |
|-------|----------|
| Job Summary | All jobs across all companies with full details |
| Performance | Metrics by company and technician |
| Communication | Chat response times, SLA adherence stats |

Report is generated server-side via `POST /api/reports/excel` and downloaded as `.xlsx`.

---

## 17. Job Lifecycle & Workflow

### Job Status Flow

```
new  →  ready  →  in_progress  →  completed  →  invoiced  →  paid
```

| Status | Meaning | Who transitions |
|--------|---------|-----------------|
| `new` | Just created, awaiting inspection or quote prep | Auto on creation |
| `ready` | Inspection done (or not required), ready for work | Ops Manager |
| `in_progress` | Work has started | Technician ("Start Job") |
| `completed` | Work finished | Technician ("Mark Completed") |
| `invoiced` | Invoice sent to client | Ops Manager |
| `paid` | Payment received | Ops Manager |

### Quote Status Flow

```
pending  →  sent  →  approved
                 →  rejected  →  (can re-quote → sent)
```

| Status | Meaning |
|--------|---------|
| `pending` | No quote prepared yet |
| `sent` | Quote sent, awaiting client response |
| `approved` | Client accepted |
| `rejected` | Client declined (ops can re-quote) |

### Payment Status

| Status | Meaning |
|--------|---------|
| `unpaid` | Default — no payment received |
| `paid` | Payment confirmed |

### Complete Workflow Example

1. **Client** submits request via public form → Job created with `status: new`
2. **Ops Manager** sees job on dashboard → reviews details
3. If inspection required → **Technician** completes inspection checklist
4. **Ops Manager** prepares quote → sends to client → `quoteStatus: sent`
5. **Client** receives notification → reviews quote → approves → `quoteStatus: approved`
6. **Ops Manager** assigns technician → technician starts work → `status: in_progress`
7. **Technician** completes work → marks completed → `status: completed`
8. **Ops Manager** sends invoice → `status: invoiced`
9. Payment received → `status: paid`
10. Throughout: all parties communicate via **real-time chat** on the job

### Automated System Messages

The following actions trigger system messages in the job's chat thread:

| Action | Message |
|--------|---------|
| Job created | "Job [JOB-XXX] created" |
| Status changed | "Job marked as [Status]" |
| Job completed | "Job Completed ✅" |
| Quote sent | "Quote Sent — $X.XX incl. GST" |
| Quote approved | "Quote Approved ✅" |
| Quote rejected | "Quote Declined ❌" |

---

## 18. Data Model & Architecture

### Google Sheets Tabs (Database Tables)

#### Tenants
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | string | Company name |
| slug | string | URL-friendly identifier |
| email | string | Company email |
| phone | string | Company phone |
| address | string | Company address |
| createdAt | ISO timestamp | Creation date |

#### Users
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenantId | FK → Tenants | Company membership |
| name | string | Full name |
| email | string | Login email (unique per tenant) |
| passwordHash | string | bcrypt hash |
| role | enum | super_admin / operations_manager / technician / client |
| phone | string | Phone number |
| isActive | "true"/"false" | Account status |
| createdAt | ISO timestamp | Creation date |

#### Jobs
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenantId | FK → Tenants | Company ownership |
| jobNumber | string | "JOB-001" format, per-tenant |
| dateReceived | ISO timestamp | When request was received |
| companyName | string | Client/tenant company |
| agentName | string | Client contact name |
| agentContact | string | Client phone |
| agentEmail | string | Client email (links to client portal) |
| propertyAddress | string | Service location |
| description | string | Full job description |
| category | enum | Plumbing, Electrical, Roofing, HVAC, General Maintenance, Other |
| priority | enum | high / medium / low |
| source | enum | public_form / manual / email / phone |
| jobStatus | enum | new / ready / in_progress / completed / invoiced / paid |
| quoteStatus | enum | pending / sent / approved / rejected |
| paymentStatus | enum | unpaid / paid |
| slaDeadline | ISO timestamp | SLA target date |
| assignedToId | FK → Users | Assigned technician |
| assignedToName | string | Technician name (denormalised) |
| teamGroup | string | Team grouping |
| quoteAmount | decimal | Subtotal excl. GST |
| quoteGst | decimal | 10% GST |
| quoteTotalWithGst | decimal | Total incl. GST |
| inspectionRequired | enum | true / false / done |
| notes | string | Internal notes |
| createdAt | ISO timestamp | Creation date |
| updatedAt | ISO timestamp | Last update |
| createdByUserId | FK → Users | Creator's user ID |
| createdByName | string | Creator's name |
| createdByRole | enum | Creator's role |

#### QuoteItems
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| jobId | FK → Jobs | Parent job |
| description | string | Line item description |
| quantity | number | Item quantity |
| unitPrice | decimal | Price per unit |
| total | decimal | quantity × unitPrice |

#### ChatThreads
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenantId | FK → Tenants | Company ownership |
| jobId | FK → Jobs | Associated job (1:1) |
| pendingOn | enum | none / client / team |
| lastMessage | string | Cached latest message |
| lastMessageAt | ISO timestamp | When last message was sent |
| lastMessageBy | enum | client / team |
| lastResponseTime | ISO timestamp | When last response was sent |
| responseDueTime | ISO timestamp | SLA deadline for next response |
| createdAt | ISO timestamp | Creation date |
| updatedAt | ISO timestamp | Last update |

#### Messages
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenantId | FK → Tenants | Company ownership |
| threadId | FK → ChatThreads | Parent thread |
| senderId | FK → Users | Sender (empty for system) |
| senderName | string | Display name |
| senderRole | enum | Role of sender |
| type | enum | text / attachment / system |
| content | string | Message body |
| metadata | JSON string | Structured data (e.g., quote details) |
| createdAt | ISO timestamp | When sent |

#### Attachments
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| jobId | FK → Jobs | Associated job |
| messageId | FK → Messages | Associated message (optional) |
| fileName | string | Original filename |
| fileType | string | image / document |
| fileUrl | string | Uploaded file URL |
| fileSize | string | Size in bytes |
| createdAt | ISO timestamp | Upload date |

#### Inspections
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenantId | FK → Tenants | Company ownership |
| jobId | FK → Jobs | Inspected job |
| inspectedBy | FK → Users | Inspector |
| inspectedAt | ISO timestamp | Inspection date |
| checklist | JSON string | Key-value pairs of check results |
| notes | string | Inspector comments |
| status | enum | passed / failed (auto-determined) |
| createdAt | ISO timestamp | Record creation |

#### PasswordResets
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| email | string | User's email |
| token | string | 64-char hex reset token |
| expiresAt | ISO timestamp | Token expiry (1 hour) |
| used | "true"/"false" | Whether token was consumed |

### Entity Relationships

```
Tenants (root)
 ├── Users (many per tenant)
 │    └── PasswordResets (via email)
 ├── Jobs (many per tenant)
 │    ├── ChatThreads (1:1 per job)
 │    │    └── Messages (many per thread)
 │    │         └── Attachments (optional per message)
 │    ├── QuoteItems (many per job)
 │    ├── Inspections (many per job)
 │    └── Attachments (direct per job)
```

### Caching Strategy

| Data | TTL | Notes |
|------|-----|-------|
| Sheet rows (per tab) | 30 seconds | In-memory; busted on writes |
| Sheet metadata (IDs) | 5 minutes | Tab name → sheet ID mapping |
| Row deduplication | On write | Prevents duplicate seeds by UUID |

---

## 19. API Reference

### Jobs

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/jobs` | List jobs (filtered by role/tenant) | All authenticated |
| POST | `/api/jobs` | Create new job | Ops Manager, Super Admin |
| GET | `/api/jobs/[id]` | Job detail + thread + quotes | Role-filtered |
| PATCH | `/api/jobs/[id]` | Update job fields | Ops/Admin full; Client: quoteStatus only |
| POST | `/api/jobs/[id]/quote` | Create & send quote | Ops Manager, Super Admin |

### Chat

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/chat/[threadId]` | Get messages (supports `?since=` for backfill) | Thread participants |
| POST | `/api/chat/[threadId]` | Send message | Thread participants |
| GET | `/api/chat/[threadId]/stream` | SSE real-time stream | Thread participants |
| GET | `/api/chat/[threadId]/pdf` | Export chat as PDF | Thread participants |

### Inspections

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/inspections` | Submit inspection report | Tech, Ops, Admin |

### Notifications

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/notifications` | Get role-based notifications | All authenticated |

### Users

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/users` | List all users | Super Admin |
| POST | `/api/users` | Create user | Super Admin |
| GET | `/api/users/[id]` | Get user detail | Super Admin |
| PATCH | `/api/users/[id]` | Update user | Super Admin |

### Tenants

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/tenants` | List all companies | Super Admin |
| POST | `/api/tenants` | Create company | Super Admin |

### Authentication

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/auth/forgot-password` | Request password reset | Public |
| POST | `/api/auth/reset-password` | Reset password with token | Public |
| GET/POST | `/api/auth/session` | NextAuth session management | Auto |

### Public

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/public/request` | Submit job request | Public (rate-limited) |
| GET | `/api/public/check-tenant` | Validate tenant slug | Public |
| GET | `/api/public/check-email` | Check if email exists | Public |

### Reports

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/reports/excel` | Generate Excel report | Super Admin |

### Admin

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/admin/migrate-sheets` | Run schema migration | Super Admin |
| POST | `/api/admin/reseed` | Reset demo data | Super Admin |
| POST | `/api/admin/clear-chats` | Clear all chat history | Super Admin |

---

## 20. Recent Changes (Latest Commits)

| Commit | Description | Key Changes |
|--------|------------|-------------|
| `07088bc` | Refine client UI and rollback top-nav enhancement | Cleaner ClientTopNav, removed over-engineering |
| `56f284a` | Refine client UI consistency | Replaced status sliders with cleaner status blocks in client portal |
| `264f77b` | Improve client portal header | Added clickable summary filter cards |
| `83a82d4` | Simplify job workflow | Improved client portal summary UX, cleaner job filters |
| `4f89f47` | Fix chat alignment | Normalized message payloads, hardened SSE stream access |
| `5a6c5c1` | Merge fix-auth-and-latency branch | Multi-tenant auth fixes, optimised Sheets API latency |
| `ff52168` | Fix multi-tenant auth | Fixed job ownership + chat access for clients |
| `0d31192` | Fix UI toggle overflow | Optimised Google Sheets API latency, fixed message glitch |
| `a513d80` | Fix notification popover | Fixed notifications clipping off-screen |
| `8ebc95f` | Restore chat composer | Fixed chat when ChatThreads rows missing |
| `d65a0a1` | QA fixes (5 bugs) | Source formatting, mobile nav, filter overflow, form contrast, ops-manager tech access |
| `5ae1679` | Fix inspection toggle | Added to new job form, fixed styling consistency |
| `33af33b` | QA audit fixes | Security, UX, and data integrity improvements |
| `fab8c4f` | Fix forgot-password | Auto-create PasswordResets tab, RESEND_TEST_EMAIL override |
| `aaf6666` | UI changes + forget password | Resend email API integration for password reset |

---

## Summary: Role Access Matrix

| Feature | Super Admin | Ops Manager | Technician | Client |
|---------|:-----------:|:-----------:|:----------:|:------:|
| Dashboard | ✅ Global | ✅ Tenant | ❌ | ❌ |
| View all jobs | ✅ All tenants | ✅ Own tenant | ❌ | ❌ |
| View assigned jobs | — | — | ✅ | — |
| View own jobs | — | — | — | ✅ |
| Create jobs | ✅ | ✅ | ❌ | Via form |
| Edit jobs | ✅ | ✅ | Status only | quoteStatus only |
| Create quotes | ✅ | ✅ | ❌ | ❌ |
| Approve/reject quotes | ❌ | ❌ | ❌ | ✅ |
| Assign technicians | ✅ | ✅ | ❌ | ❌ |
| Chat (all threads) | ✅ All | ✅ Tenant | ❌ | ❌ |
| Chat (own jobs) | — | — | ✅ | ✅ |
| Inspections | ✅ | ✅ | ✅ (assigned) | ❌ |
| Manage users | ✅ | ❌ | ❌ | ❌ |
| Manage companies | ✅ | ❌ | ❌ | ❌ |
| Reports | ✅ | ❌ | ❌ | ❌ |
| Public request form | — | — | — | ✅ (link) |
| Notifications | ✅ | ✅ | ❌ | ✅ |

---

*This guide covers the complete DGPS Portal as of commit `07088bc` (2 April 2026).*
