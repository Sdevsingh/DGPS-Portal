# DGPS Portal — Master Implementation Guide for Emergent
## Complete Feature Specification + Supabase Migration + New Features

> **Target Agent:** Emergent (Autonomous AI Developer)
> **Project:** Domain Group Property Services (DGPS) Portal
> **Repo:** https://github.com/Sdevsingh/DGPS-Portal.git
> **Authored:** 2 April 2026 | For zero-ambiguity autonomous implementation

---

## CRITICAL READING INSTRUCTIONS FOR EMERGENT

Read this entire document before writing a single line of code. This is a living specification — every section must be implemented fully. Do not skip, paraphrase, or approximate any requirement. Where SQL is given, use it exactly. Where a component spec is given, build it exactly. When unsure, prefer **more explicit** error messages and **stricter** access control over permissive defaults.

The codebase currently uses **Google Sheets as the database**. Your primary task is to **migrate the entire database layer to Supabase (PostgreSQL)** while simultaneously implementing all new features listed in this document.

---

## PART 1 — SYSTEM OVERVIEW

### What DGPS Portal Is

A multi-tenant, role-based job management SaaS platform for property maintenance companies in Australia. It manages the full lifecycle of service jobs: client submission → quoting → field execution → inspection → invoicing → payment, with real-time chat between all parties at every step.

### Who Uses It

| Role | Count per Tenant | Purpose |
|------|-----------------|---------|
| Super Admin | 1 (global) | Platform owner — manages all companies |
| Operations Manager | 1–N per company | Day-to-day ops, quoting, team management |
| Technician | 1–N per company | Field workers — execute jobs |
| Client | Unlimited | External customers — submit and track jobs |

### Multi-Tenancy Model

- Every company is a **Tenant** (row in the `tenants` table)
- Every data row in every table carries a `tenant_id` foreign key
- Users belong to exactly one tenant, except Super Admin who is global
- **NEW:** An Operations Manager can be assigned to multiple tenants by Super Admin
- Data is strictly partitioned — no tenant can ever see another tenant's data (enforced by Supabase RLS + API logic)

---

## PART 2 — TECHNOLOGY STACK (FINAL)

```
Framework:        Next.js 16+ (App Router, React 19)
Auth:             NextAuth v4 (Credentials + Google OAuth provider)
                  + @next-auth/supabase-adapter
Database:         Supabase (PostgreSQL) — replaces Google Sheets
ORM:              Supabase JS client (@supabase/supabase-js v2)
Real-time:        Supabase Realtime (replaces custom SSE for chat)
File Storage:     Supabase Storage (replaces local/undefined uploads)
Charts:           Recharts (PieChart, BarChart, LineChart, AreaChart)
Email:            Resend API (already in package.json — keep using)
Styling:          Tailwind CSS v4 + Framer Motion (already installed)
PDF Export:       jsPDF (already installed)
Excel Export:     xlsx (already installed)
Type Safety:      TypeScript strict mode throughout
```

### Packages to Add

```bash
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs recharts
npm install next-auth@4 @next-auth/supabase-adapter
# Google OAuth is part of next-auth, no extra package needed
```

### Packages to Remove

```bash
npm uninstall googleapis
# Remove all references to bcryptjs password hashing — Supabase Auth handles it
```

---

## PART 3 — SUPABASE PROJECT SETUP

### 3.1 Environment Variables (.env.local)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-min-32-chars

# Google OAuth (for Sign in with Google)
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret

# Resend (email)
RESEND_API_KEY=your-resend-api-key
RESEND_FROM=noreply@dgps.com.au
RESEND_TEST_EMAIL=          # override recipient in dev
```

### 3.2 Supabase Client Setup

Create `src/lib/supabase.ts`:

```typescript
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Browser client (for client components)
export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Server client (for API routes — bypasses RLS with service role)
export const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
```

---

## PART 4 — COMPLETE DATABASE SCHEMA (PostgreSQL / Supabase)

Run every SQL block below in Supabase SQL Editor in the order presented.

### 4.1 Enable Extensions

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for fast text search
```

### 4.2 Tenants Table

```sql
CREATE TABLE public.tenants (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  email       TEXT,
  phone       TEXT,
  address     TEXT,
  logo_url    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tenants_slug ON public.tenants(slug);
```

### 4.3 Users Table

```sql
CREATE TYPE public.user_role AS ENUM (
  'super_admin',
  'operations_manager',
  'technician',
  'client'
);

CREATE TABLE public.users (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id            UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  email                TEXT NOT NULL,
  password_hash        TEXT,             -- NULL for Google OAuth users
  role                 public.user_role NOT NULL DEFAULT 'client',
  phone                TEXT,
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  google_id            TEXT UNIQUE,      -- Google sub claim for OAuth
  avatar_url           TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(email, tenant_id)
);

CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_tenant ON public.users(tenant_id);
CREATE INDEX idx_users_role ON public.users(role);
```

### 4.4 Ops Manager → Multi-Tenant Assignment Table (NEW)

```sql
-- This replaces the comma-separated assignedTenantIds approach
CREATE TABLE public.ops_manager_tenants (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  assigned_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by_id  UUID REFERENCES public.users(id),
  UNIQUE(user_id, tenant_id)
);

CREATE INDEX idx_omt_user ON public.ops_manager_tenants(user_id);
CREATE INDEX idx_omt_tenant ON public.ops_manager_tenants(tenant_id);
```

### 4.5 Jobs Table

```sql
CREATE TYPE public.job_status AS ENUM (
  'new', 'ready', 'in_progress', 'completed', 'invoiced', 'paid'
);
CREATE TYPE public.quote_status AS ENUM (
  'pending', 'sent', 'approved', 'rejected'
);
CREATE TYPE public.payment_status AS ENUM (
  'unpaid', 'paid'
);
CREATE TYPE public.job_priority AS ENUM (
  'low', 'medium', 'high'
);
CREATE TYPE public.job_source AS ENUM (
  'public_form', 'manual', 'email', 'phone'
);
CREATE TYPE public.job_category AS ENUM (
  'Plumbing', 'Electrical', 'Roofing', 'HVAC', 'General Maintenance', 'Other'
);
CREATE TYPE public.inspection_status AS ENUM (
  'not_required', 'required', 'done'
);

CREATE TABLE public.jobs (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id             UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  job_number            TEXT NOT NULL,
  date_received         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  company_name          TEXT,
  agent_name            TEXT,
  agent_contact         TEXT,
  agent_email           TEXT,
  property_address      TEXT NOT NULL,
  description           TEXT NOT NULL,
  category              public.job_category NOT NULL DEFAULT 'General Maintenance',
  priority              public.job_priority NOT NULL DEFAULT 'medium',
  source                public.job_source NOT NULL DEFAULT 'manual',
  job_status            public.job_status NOT NULL DEFAULT 'new',
  quote_status          public.quote_status NOT NULL DEFAULT 'pending',
  payment_status        public.payment_status NOT NULL DEFAULT 'unpaid',
  sla_deadline          TIMESTAMPTZ,
  assigned_to_id        UUID REFERENCES public.users(id),
  assigned_to_name      TEXT,
  team_group            TEXT,
  quote_amount          NUMERIC(12,2),
  quote_gst             NUMERIC(12,2),
  quote_total_with_gst  NUMERIC(12,2),
  inspection_required   public.inspection_status NOT NULL DEFAULT 'not_required',
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_user_id    UUID REFERENCES public.users(id),
  created_by_name       TEXT,
  created_by_role       TEXT,
  UNIQUE(tenant_id, job_number)
);

CREATE INDEX idx_jobs_tenant ON public.jobs(tenant_id);
CREATE INDEX idx_jobs_status ON public.jobs(job_status);
CREATE INDEX idx_jobs_quote_status ON public.jobs(quote_status);
CREATE INDEX idx_jobs_assigned ON public.jobs(assigned_to_id);
CREATE INDEX idx_jobs_agent_email ON public.jobs(agent_email);
CREATE INDEX idx_jobs_created ON public.jobs(created_at DESC);
```

### 4.6 Quote Items Table

```sql
CREATE TABLE public.quote_items (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id       UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  description  TEXT NOT NULL,
  quantity     NUMERIC(10,2) NOT NULL,
  unit_price   NUMERIC(12,2) NOT NULL,
  total        NUMERIC(12,2) NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_quote_items_job ON public.quote_items(job_id);
```

### 4.7 Chat Threads Table

```sql
CREATE TYPE public.pending_on AS ENUM ('none', 'client', 'team');

CREATE TABLE public.chat_threads (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id           UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  job_id              UUID NOT NULL UNIQUE REFERENCES public.jobs(id) ON DELETE CASCADE,
  pending_on          public.pending_on NOT NULL DEFAULT 'none',
  last_message        TEXT,
  last_message_at     TIMESTAMPTZ,
  last_message_by     TEXT,
  last_response_time  TIMESTAMPTZ,
  response_due_time   TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_threads_job ON public.chat_threads(job_id);
CREATE INDEX idx_threads_tenant ON public.chat_threads(tenant_id);
CREATE INDEX idx_threads_pending ON public.chat_threads(pending_on);
```

### 4.8 Messages Table

```sql
CREATE TYPE public.message_type AS ENUM ('text', 'attachment', 'system');
CREATE TYPE public.sender_role_type AS ENUM (
  'super_admin', 'operations_manager', 'technician', 'client', 'system'
);

CREATE TABLE public.messages (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  thread_id    UUID NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  sender_id    UUID REFERENCES public.users(id),
  sender_name  TEXT NOT NULL,
  sender_role  public.sender_role_type NOT NULL DEFAULT 'system',
  type         public.message_type NOT NULL DEFAULT 'text',
  content      TEXT NOT NULL,
  metadata     JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_thread ON public.messages(thread_id);
CREATE INDEX idx_messages_created ON public.messages(created_at);
-- Supabase Realtime will subscribe to this table
ALTER TABLE public.messages REPLICA IDENTITY FULL;
```

### 4.9 Attachments Table

```sql
CREATE TABLE public.attachments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id      UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  message_id  UUID REFERENCES public.messages(id),
  file_name   TEXT NOT NULL,
  file_type   TEXT,
  file_url    TEXT NOT NULL,  -- Supabase Storage public URL
  file_size   BIGINT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_attachments_job ON public.attachments(job_id);
```

### 4.10 Inspections Table

```sql
CREATE TYPE public.inspection_result AS ENUM ('passed', 'failed');

CREATE TABLE public.inspections (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  job_id        UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  inspected_by  UUID REFERENCES public.users(id),
  inspected_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checklist     JSONB NOT NULL,   -- { "water_pressure": "pass", "leaks": "fail", ... }
  notes         TEXT,
  status        public.inspection_result NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inspections_job ON public.inspections(job_id);
```

### 4.11 Password Resets Table

```sql
CREATE TABLE public.password_resets (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email       TEXT NOT NULL,
  token       TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_password_resets_token ON public.password_resets(token);
CREATE INDEX idx_password_resets_email ON public.password_resets(email);
```

### 4.12 Quote History Table (NEW — for technician quote modifications)

```sql
-- Immutable audit trail — every version of every quote is preserved
CREATE TABLE public.quote_history (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id          UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  version         INTEGER NOT NULL,         -- 1, 2, 3... increments per job
  created_by_id   UUID REFERENCES public.users(id),
  created_by_name TEXT,
  created_by_role TEXT,
  items           JSONB NOT NULL,           -- snapshot of quote_items at time of creation
  subtotal        NUMERIC(12,2) NOT NULL,
  gst             NUMERIC(12,2) NOT NULL,
  total           NUMERIC(12,2) NOT NULL,
  status          public.quote_status NOT NULL DEFAULT 'sent',
  notes           TEXT,                     -- reason for revision
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_quote_history_job ON public.quote_history(job_id);
```

### 4.13 Auto-Update Triggers

```sql
-- Auto-update updated_at on jobs
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_threads_updated_at
  BEFORE UPDATE ON public.chat_threads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 4.14 Row Level Security (RLS)

```sql
-- Enable RLS on all tables
ALTER TABLE public.tenants          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ops_manager_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_threads     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_resets  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_history    ENABLE ROW LEVEL SECURITY;

-- All tables: service_role bypasses RLS (used by server-side code only)
-- Anon/authenticated roles are blocked by default
-- API routes use supabaseAdmin client which bypasses RLS
-- This is the correct architecture for server-rendered apps

CREATE POLICY "service_role_all" ON public.tenants
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Repeat the same policy pattern for every table
-- (copy and replace table name for each)
```

> **Architecture note for Emergent:** All database access from API routes uses `supabaseAdmin` (service role key). RLS is a secondary safety net but NOT relied upon as the primary auth mechanism — that is enforced in the API routes themselves by checking session role/tenantId before every query.

---

## PART 5 — AUTHENTICATION

### 5.1 Strategy

Use **NextAuth v4** with two providers:
1. **CredentialsProvider** — email + password (bcrypt, stored in `users.password_hash`)
2. **GoogleProvider** — OAuth 2.0 Sign in with Google

### 5.2 Updated `src/lib/auth.ts`

```typescript
import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "./supabase";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: "/login" },

  providers: [
    // ── Google OAuth ─────────────────────────────────────────────────────────
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    // ── Email + Password ─────────────────────────────────────────────────────
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email:      { label: "Email",        type: "email" },
        password:   { label: "Password",     type: "password" },
        tenantSlug: { label: "Company Slug", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email.toLowerCase().trim();
        const tenantSlug = credentials.tenantSlug?.trim().toLowerCase();

        // Find active users with this email
        let query = supabaseAdmin
          .from("users")
          .select("*, tenants(id, name, slug)")
          .eq("email", email)
          .eq("is_active", true);

        if (tenantSlug) {
          const { data: tenant } = await supabaseAdmin
            .from("tenants")
            .select("id")
            .eq("slug", tenantSlug)
            .single();
          if (!tenant) return null;
          query = query.eq("tenant_id", tenant.id);
        }

        const { data: users } = await query;
        if (!users || users.length === 0) return null;

        // Test password against each candidate (handles multi-tenant same email)
        const matches = [];
        for (const u of users) {
          if (!u.password_hash) continue;
          const ok = await bcrypt.compare(credentials.password, u.password_hash);
          if (ok) matches.push(u);
        }
        if (matches.length !== 1) return null;
        const user = matches[0];

        // For ops managers, fetch all assigned tenant IDs
        let assignedTenantIds: string[] = [];
        if (user.role === "operations_manager") {
          const { data: assignments } = await supabaseAdmin
            .from("ops_manager_tenants")
            .select("tenant_id")
            .eq("user_id", user.id);
          assignedTenantIds = assignments?.map((a) => a.tenant_id) ?? [];
          // Always include own tenant
          if (!assignedTenantIds.includes(user.tenant_id)) {
            assignedTenantIds.unshift(user.tenant_id);
          }
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenant_id,
          tenantName: user.tenants?.name ?? "",
          tenantSlug: user.tenants?.slug ?? "",
          assignedTenantIds,
          avatarUrl: user.avatar_url,
        };
      },
    }),
  ],

  callbacks: {
    // ── Google OAuth: find or create user in our DB ───────────────────────────
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const email = user.email!.toLowerCase();

        // Check if user exists
        const { data: existing } = await supabaseAdmin
          .from("users")
          .select("*, tenants(id, name, slug)")
          .eq("email", email)
          .eq("is_active", true)
          .limit(1)
          .single();

        if (existing) {
          // Attach our DB data to the NextAuth user object for JWT callback
          (user as any).dbId = existing.id;
          (user as any).role = existing.role;
          (user as any).tenantId = existing.tenant_id;
          (user as any).tenantName = existing.tenants?.name ?? "";
          (user as any).tenantSlug = existing.tenants?.slug ?? "";
          (user as any).assignedTenantIds = [];
          return true;
        }

        // No account found for this Google email — block sign-in
        // (Clients must be pre-registered or submit through the public form)
        return "/login?error=google_no_account";
      }
      return true;
    },

    async jwt({ token, user, account }) {
      if (user) {
        const u = user as any;
        token.id              = u.dbId ?? u.id;
        token.role            = u.role;
        token.tenantId        = u.tenantId;
        token.tenantName      = u.tenantName;
        token.tenantSlug      = u.tenantSlug;
        token.assignedTenantIds = u.assignedTenantIds ?? [];
        token.avatarUrl       = u.avatarUrl ?? u.image;
      }
      return token;
    },

    async session({ session, token }) {
      session.user.id               = token.id as string;
      session.user.role             = token.role as string;
      session.user.tenantId         = token.tenantId as string;
      session.user.tenantName       = token.tenantName as string;
      session.user.tenantSlug       = token.tenantSlug as string;
      session.user.assignedTenantIds = token.assignedTenantIds as string[];
      session.user.avatarUrl        = token.avatarUrl as string;
      return session;
    },
  },
};
```

### 5.3 Updated `src/types/next-auth.d.ts`

```typescript
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      tenantId: string;
      tenantName: string;
      tenantSlug: string;
      assignedTenantIds: string[];  // Ops manager multi-tenant
      avatarUrl?: string;
    };
  }
}
declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    tenantId: string;
    tenantName: string;
    tenantSlug: string;
    assignedTenantIds: string[];
    avatarUrl?: string;
  }
}
```

### 5.4 Login Page (`/login`)

Build a full-screen premium login page with:

**Left panel (hidden on mobile):** Gradient background with Domain Group logo, tagline, and animated floating elements.

**Right panel (form area):**
- Domain Group logo at top
- "Sign in to DGPS Portal" heading
- **Google Sign-In button** (fully functional — calls `signIn("google")` from next-auth/react)
  - Use official Google brand colours: white background, Google logo SVG, border
  - Text: "Continue with Google"
- `OR` divider with horizontal rules
- Email input
- Password input (with show/hide toggle)
- "Company (optional)" input for multi-tenant disambiguation
- "Forgot password?" link
- "Sign In" button (loading spinner during submit)
- Staggered fade-in animations on each element
- Demo account quick-fill buttons for each role

**Error handling:**
- `?error=google_no_account` → Show: "No account found for this Google email. Contact your company admin."
- `?error=CredentialsSignin` → Show: "Invalid email or password."

---

## PART 6 — ROLE SYSTEM (COMPLETE SPECIFICATION)

### 6.1 Role Hierarchy

```
super_admin
  └── operations_manager (can manage 1+ tenants)
       ├── technician (scoped to 1 tenant, sees only assigned jobs)
       └── client (scoped to 1 tenant, sees only own jobs)
```

### 6.2 Super Admin

**Capabilities (exhaustive):**
- Read/write all data across all tenants — no tenant restriction ever applies
- Create new companies (tenants)
- Create users in any tenant with any role (including other super_admins)
- Assign operations_managers to one or multiple tenants
- View Analytics Dashboard (see Part 10)
- Generate Excel reports across all companies
- Access admin utilities: reseed, migrate, clear-chats
- Can impersonate any tenant's view by passing `?tenantId=xxx` to job list

**Navigation:**
- Dashboard (global overview with company breakdown)
- Jobs (all companies, filterable)
- Companies (tenant management)
- Analytics (NEW — exclusive to super admin)
- Settings → Users

**Data access pattern:**
```typescript
// Super admin queries: no tenant filter
const jobs = await supabaseAdmin.from("jobs").select("*");
// With optional tenant scope:
const jobs = await supabaseAdmin.from("jobs").select("*")
  .eq("tenant_id", requestedTenantId ?? undefined); // skip if null
```

### 6.3 Operations Manager

**Capabilities (exhaustive):**
- Manage all jobs in **all tenants assigned to them** (see multi-tenant section below)
- Create jobs in any of their assigned tenants
- Create and send quotes to clients
- **Modify quotes after submission** (creates a new quote version in `quote_history`)
- Assign technicians (from any of their assigned tenants) to jobs
- Create technician accounts (NEW — in any of their assigned tenants)
- View and respond to all chat threads in their assigned tenants
- View all users in their assigned tenants (read-only for non-technician roles)
- View dashboard with metrics for all assigned tenants combined

**Cannot do:**
- Create ops_manager or super_admin accounts
- View other tenants not assigned to them
- Access Analytics, Companies, or Reports pages
- Modify system configuration

**Multi-tenant data pattern:**
```typescript
// Ops manager queries: filter by all assigned tenants
const allowedTenantIds = session.user.assignedTenantIds;
const jobs = await supabaseAdmin.from("jobs").select("*")
  .in("tenant_id", allowedTenantIds);
```

### 6.4 Technician

**Capabilities:**
- View only jobs where `assigned_to_id = their user ID`
- Update job status: new → in_progress → completed
- Complete inspection checklists for assigned jobs
- **NEW: Submit quote revision after site visit** (only if job is in_progress)
  - Technician fills in revised quote items
  - Quote status resets to `pending_tech_revision`
  - System message: "Technician has revised the quote after site visit — awaiting re-approval"
  - Client must approve/reject the revised quote again
- Post messages in assigned job chats
- Navigate to job location (Apple Maps link)

**Cannot do:**
- View unassigned jobs
- Create or delete jobs
- Manage users
- Access dashboard or reports

### 6.5 Client

**Capabilities:**
- View jobs they submitted (`created_by_user_id = their ID`) or are agent on (`agent_email = their email`)
- Approve or reject quotes (both original ops manager quotes AND technician revised quotes)
- Post messages in their job chats
- Submit new requests via public form or client portal button

**Hard restrictions enforced in every PATCH `/api/jobs/[id]` call:**
```typescript
if (role === "client") {
  const allowed = ["quote_status"];
  const hasDisallowed = Object.keys(body).some((k) => !allowed.includes(k));
  if (hasDisallowed) return 403;
  // Client can only set: "approved" or "rejected"
  const validValues = ["approved", "rejected"];
  if (!validValues.includes(body.quote_status)) return 400;
}
```

---

## PART 7 — FEATURE: TECHNICIAN ACCOUNT CREATION

### Who Can Create Technician Accounts

| Creator | Can Create | Tenant Scope |
|---------|-----------|-------------|
| Super Admin | Any role in any tenant | Any |
| Operations Manager | `technician` role only | Their assigned tenants only |

### Updated User Management Component

The `UserManagement` component (used on `/settings/users`) must be updated:

**For Super Admin:**
- Can select any role from dropdown (super_admin, operations_manager, technician, client)
- Can select any tenant from dropdown
- Full CRUD on all users

**For Operations Manager (NEW access):**
- Ops managers now get a tab in `/settings` called "My Team"
- Route: `/settings/team` (accessible by ops_manager and super_admin)
- They see only users in their assigned tenants
- Role dropdown shows only `technician` (hardcoded restriction)
- Tenant dropdown shows only their assigned tenants

### API Change: `POST /api/users`

```typescript
// Existing: super_admin only
// NEW: operations_manager can create technician accounts
if (role === "operations_manager") {
  const { userRole, tenantId } = body;
  // Ops manager can ONLY create technicians
  if (userRole !== "technician") return 403;
  // Ops manager can only create in their assigned tenants
  const allowed = session.user.assignedTenantIds;
  if (!allowed.includes(tenantId)) return 403;
  // Proceed with creation
}
```

### My Team Page (`/settings/team`)

**Access:** Operations Manager, Super Admin

**Layout:**
- Header: "My Team" with "Add Technician" button (for ops managers) or "Add User" (for super admin)
- Filter tabs: All | Technicians | Active | Inactive
- User cards showing:
  - Avatar (initials or photo)
  - Name, email, phone
  - Role badge
  - Company badge (for ops managers who see multiple tenants)
  - Active/Inactive status toggle
  - "Edit" button
- "Add Technician" modal with fields: Name, Email, Phone, Password, Assign to Tenant (dropdown of their tenants)

---

## PART 8 — FEATURE: OPS MANAGER MULTI-COMPANY ASSIGNMENT

### How Assignment Works

1. Super Admin navigates to `/settings/users` or the Companies page
2. Clicks on an Ops Manager user → opens their profile panel
3. Sees "Assigned Companies" section with checkboxes for every tenant
4. Saves → upserts rows in `ops_manager_tenants` table
5. On next login, the ops manager's JWT `assignedTenantIds` reflects the new assignments

### API Endpoints

**`GET /api/users/[id]/assignments`** (Super Admin only)
- Returns all tenant assignments for an ops manager

**`PUT /api/users/[id]/assignments`** (Super Admin only)
- Body: `{ tenantIds: string[] }` — complete replacement
- Deletes all existing rows for this user, inserts new ones

### Dashboard for Multi-Tenant Ops Manager

When an ops manager has multiple assigned tenants:
- Dashboard shows combined metrics across all assigned tenants
- Each metric card shows a count with a breakdown tooltip: "12 total (5 DGPS, 7 PropServ)"
- Filter dropdown at top of dashboard: "All Companies | [Company A] | [Company B]"
- Selecting a company filters all metrics to that company only

---

## PART 9 — FEATURE: QUOTE MODIFICATION BY TECHNICIAN

### Extended Quote Status Enum

Add to the `quote_status` PostgreSQL enum:

```sql
ALTER TYPE public.quote_status ADD VALUE 'tech_revision_pending'
  AFTER 'rejected';
```

### Workflow

```
pending → sent → approved            (standard flow)
                → rejected → sent    (re-quote by ops)

in_progress + technician on site:
  tech submits revision → tech_revision_pending
  client approves       → approved (new total applied)
  client rejects        → ops manager notified, can re-quote
```

### When Is Technician Revision Allowed?

- `job_status` must be `in_progress`
- `quote_status` must be `approved` (can't revise a quote that wasn't approved)
- Only the assigned technician (`assigned_to_id = technicianUserId`)
- Each revision creates a new row in `quote_history` (preserves prior approved quote)

### API: `POST /api/jobs/[id]/quote/revision`

**Access:** Technician (only if assigned to job)

**Body:**
```json
{
  "items": [
    { "description": "Additional pipe fitting", "quantity": 2, "unit_price": 85.00 },
    { "description": "Labour", "quantity": 3, "unit_price": 120.00 }
  ],
  "notes": "Additional parts required after opening the wall"
}
```

**Server actions:**
1. Verify `assigned_to_id === userId` and `job_status === 'in_progress'` and `quote_status === 'approved'`
2. Save current quote snapshot to `quote_history` with version N
3. Delete current `quote_items` rows for this job
4. Insert new `quote_items` rows
5. Recalculate subtotal, GST (10%), total
6. Update `jobs` row with new amounts, set `quote_status = 'tech_revision_pending'`
7. Set `chat_threads.pending_on = 'client'`, `response_due_time = NOW() + 48 hours`
8. Post system message: "Technician has submitted a revised quote of $X.XX after site inspection. Your approval is required."
9. Create notification for client

### Client View of Revised Quote

On `/client/jobs/[id]`:
- Show "Revised Quote" banner in amber: "Your technician visited the site and has updated the quote. Please review and confirm."
- Show old quote (from `quote_history`, version N-1) in collapsed section with label "Previous Quote"
- Show new quote items prominently
- Approve / Reject buttons same as original quote flow

### Technician UI

On `/technician/jobs/[id]`:
- Show "Revise Quote" button only when `job_status === 'in_progress'` and `quote_status === 'approved'`
- Tapping opens a bottom sheet / modal with:
  - Pre-filled with current quote items
  - Add/remove line items
  - "Notes for client" textarea
  - "Submit for Re-approval" button

---

## PART 10 — FEATURE: SUPER ADMIN ANALYTICS DASHBOARD

### Route: `/analytics`

**Access:** Super Admin only
**Navigation position:** Second item in sidebar after Dashboard

### 10.1 Layout

```
/analytics
  ├── [Tab: Overview]         ← default
  ├── [Tab: Revenue]
  ├── [Tab: Quotations]
  └── [Tab: Insights]
```

### 10.2 Overview Tab

**Top row — Global KPI cards (animated number count-up on load):**

| Card | Value | Sub-label |
|------|-------|-----------|
| Total Revenue | Sum of `quote_total_with_gst` for all paid/invoiced jobs | All time |
| Active Jobs | Count where `job_status IN ('new','ready','in_progress')` | Across all companies |
| Completion Rate | `completed+invoiced+paid / total * 100` | % jobs completed |
| Avg Quote Value | `AVG(quote_total_with_gst)` for approved quotes | Per job |

**Chart row 1 — Quotation Pie Chart (INTERACTIVE):**

Use `Recharts PieChart` with `cx="50%"` `cy="50%"` `outerRadius={120}`.

Data:
- **Sent/Pending Response** — count of `quote_status = 'sent'` (amber)
- **Approved** — count of `quote_status = 'approved'` (green)
- **Declined** — count of `quote_status = 'rejected'` (red)
- **Pending (no quote yet)** — count of `quote_status = 'pending'` (grey)

Interactivity:
- Clicking any slice navigates to `/analytics/quotations?status=[segment]`
- On that page, show a searchable, filterable table of all jobs matching that quote status
- Filter by company dropdown at top
- Columns: Job#, Company, Address, Category, Amount, Agent, Date, Status badge

**Chart row 2 — Jobs by Company Bar Chart:**

Use `Recharts BarChart` grouped bars:
- X axis: company names
- Y axis: job count
- Bar groups: New (blue), In Progress (amber), Completed (green), Paid (emerald)
- Hovering shows tooltip with exact counts

**Chart row 3 — Monthly Activity Line Chart:**

Use `Recharts AreaChart` with `fillOpacity={0.2}`:
- X axis: last 12 months (Jan, Feb, … Dec)
- Lines: Jobs Created (blue), Jobs Completed (green), Quotes Sent (amber)
- Date range picker to adjust the window

### 10.3 Revenue Tab

**Header row — Revenue KPI cards:**
- Total Revenue (all time, all companies)
- This Month Revenue
- YoY Growth % (this month vs same month last year)
- Largest Revenue Company (name + amount)

**Company Revenue Bar Chart:**

`Recharts BarChart` horizontal:
- Y axis: company names
- X axis: total revenue (AUD)
- Each bar is clickable

**On clicking a company bar (or the company name):**
- Opens a drill-down panel / slide-over (not a new page)
- Shows **Monthly Revenue Line Chart** for that company: last 12 months
- Uses `Recharts LineChart` with `dot={{ r: 4 }}`
- Tooltip shows month + total revenue + job count
- Shows list of top 5 highest-value jobs for that company
- "View All Jobs →" link to `/jobs?tenantId=[id]`

**Revenue Breakdown Donut Chart:**
- Split by category (Plumbing, Electrical, Roofing, etc.)
- Shows which service type generates the most revenue

### 10.4 Quotations Tab

**Filterable, sortable table of all quotations:**

Columns: Job#, Company, Address, Agent, Amount excl. GST, GST, Total incl. GST, Quote Status, Date Sent, Days to Decision.

Filters:
- Company dropdown (all companies by default)
- Quote status (pending / sent / approved / rejected / tech_revision_pending)
- Date range picker
- Amount range slider

Clicking any row opens the job detail in a side panel (slide-over) showing full quote items, chat summary, and status history.

**At top: 4 clickable stat cards (same data as pie chart in Overview)**
- Clicking a card filters the table to that status
- URL updates: `/analytics/quotations?status=approved&company=tenant_id`

### 10.5 Insights Tab

A grid of "insight cards" — each is a white card with an icon, a metric, a sparkline, and a plain-English insight statement.

**Implement ALL of the following insights:**

#### Manpower Insights

| Insight | Calculation | Visualization |
|---------|------------|---------------|
| Total Platform Users | COUNT(users) | Number + badge breakdown |
| Users by Role | COUNT per role | Horizontal bar chart |
| Technicians per Company | technicians grouped by tenant | Table with company logos |
| Ops Manager Load | jobs assigned per ops manager | Bar chart, highest load highlighted |
| Inactive Accounts | is_active = false | Count + list |

#### Revenue Insights

| Insight | Calculation | Visualization |
|---------|------------|---------------|
| Revenue per Technician | Σ job total where technician assigned | Ranked list |
| Avg Days to Payment | date(payment received) - date(job created) | Histogram |
| Revenue Trend | Monthly total, 12 months | Sparkline |
| Outstanding Revenue | Approved quotes not yet paid | $ amount + job count |
| Category Revenue Split | Σ total by category | Donut chart |

#### Operational Insights

| Insight | Calculation | Visualization |
|---------|------------|---------------|
| Avg Quote Acceptance Rate | approved / (approved+rejected) * 100 | % gauge |
| Avg Time to Quote | date(quote_sent) - date(job_created) | in hours, per company |
| Jobs Awaiting Quote | quoteStatus = 'pending' | Count, grouped by company |
| Inspection Pass Rate | passed / total * 100 | % per company |
| Chat Response SLA | messages responded within 4h / total | % compliance |
| Overdue Jobs | sla_deadline < NOW() and not completed | Count + list |

#### Strategic Insights (AI-style text cards)

These are computed text statements that auto-populate based on real data. Use template strings filled with actual values:

- "**[Company A]** generates **[X]%** of total platform revenue. Consider expanding their team."
- "**Quote acceptance rate is [X]%** — industry benchmark is 65–75%."
- "**[N] jobs** have been waiting longer than 7 days for a quote. Assign ops managers to clear backlog."
- "**[Technician Name]** has the highest job completion rate at **[X]%**."
- "**[Month]** was the busiest month with **[N]** jobs created."

---

## PART 11 — ALL PAGES (COMPLETE ROUTE MAP)

### Public Routes (no auth)
```
/login                          Login page (Credentials + Google)
/reset-password                 Password reset via token
/request/[tenantSlug]           Public job request form
```

### App Routes (auth required)
```
/                               Root redirect by role
/dashboard                      Dashboard (all roles)

/jobs                           Jobs list (ops, admin)
/jobs/new                       Create job (ops, admin)
/jobs/[id]                      Job detail (role-filtered)
/jobs/[id]/chat                 Mobile chat view
/jobs/[id]/inspection           Inspection form (tech, ops, admin)

/client                         Client portal dashboard
/client/jobs/[id]               Client job detail + quote approval

/technician                     Technician field dashboard
/technician/jobs/[id]           Technician job detail + actions

/analytics                      Analytics overview (super_admin only)
/analytics/quotations           Quotation drill-down table
/analytics/revenue              Revenue detail view (handled by tabs)
/analytics/insights             Smart insights (handled by tabs)

/companies                      Company management (super_admin)
/companies/[id]                 Company detail + settings

/settings/users                 User management (super_admin)
/settings/team                  My team / technician management (ops, admin)
/settings/profile               Personal profile settings (all roles)

/reports                        Excel export (super_admin)
```

---

## PART 12 — COMPLETE API ROUTES

### Jobs

| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| GET | `/api/jobs` | ops, admin | List jobs; filtered by tenant + query params |
| POST | `/api/jobs` | ops, admin | Create job; auto-creates chat thread |
| GET | `/api/jobs/[id]` | role-filtered | Job + thread + quote items |
| PATCH | `/api/jobs/[id]` | role-filtered | Update fields; client: quoteStatus only |
| POST | `/api/jobs/[id]/quote` | ops, admin | Create/replace quote; set quoteStatus=sent |
| POST | `/api/jobs/[id]/quote/revision` | technician (assigned) | Submit revised quote after site visit |
| GET | `/api/jobs/[id]/quote/history` | ops, admin | Quote version history |

### Chat

| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| GET | `/api/chat/[threadId]` | participants | Fetch messages (supports `?since=`) |
| POST | `/api/chat/[threadId]` | participants | Send message |
| GET | `/api/chat/[threadId]/stream` | participants | Supabase Realtime proxy or SSE |
| GET | `/api/chat/[threadId]/pdf` | participants | Export as PDF |

### Inspections

| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| POST | `/api/inspections` | tech, ops, admin | Submit inspection |

### Notifications

| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| GET | `/api/notifications` | all | Role-based notification list |

### Users

| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| GET | `/api/users` | ops(own tenants), admin | List users |
| POST | `/api/users` | ops(tech only), admin | Create user |
| GET | `/api/users/[id]` | ops(own tenants), admin | User detail |
| PATCH | `/api/users/[id]` | ops(own tenants), admin | Update user |
| GET | `/api/users/[id]/assignments` | admin | Ops manager tenant assignments |
| PUT | `/api/users/[id]/assignments` | admin | Set ops manager tenant assignments |

### Tenants

| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| GET | `/api/tenants` | admin | List all tenants |
| POST | `/api/tenants` | admin | Create tenant |
| GET | `/api/tenants/[id]` | admin | Tenant detail |
| PATCH | `/api/tenants/[id]` | admin | Update tenant |

### Analytics (NEW)

| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| GET | `/api/analytics/overview` | admin | KPIs, chart data, pipeline |
| GET | `/api/analytics/revenue` | admin | Revenue by company + monthly |
| GET | `/api/analytics/quotations` | admin | Quote stats + filtered list |
| GET | `/api/analytics/insights` | admin | Computed insight data |

### Auth

| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| POST | `/api/auth/forgot-password` | public | Request reset token |
| POST | `/api/auth/reset-password` | public | Redeem token, update password |
| `*` | `/api/auth/[...nextauth]` | auto | NextAuth handler |

### Public

| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| POST | `/api/public/request` | public (rate-limited) | Submit job request |
| GET | `/api/public/check-tenant` | public | Validate tenant slug |
| GET | `/api/public/check-email` | public | Check if email exists |

### Admin

| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| POST | `/api/admin/seed` | admin | Seed demo data |
| POST | `/api/admin/clear-chats` | admin | Clear all messages |

### Reports

| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| GET | `/api/reports/excel` | admin | Generate Excel workbook |

### Upload

| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| POST | `/api/upload` | ops, admin, tech | Upload to Supabase Storage |

---

## PART 13 — REAL-TIME CHAT MIGRATION TO SUPABASE REALTIME

### Replace Custom SSE with Supabase Realtime

Current implementation uses a custom SSE endpoint. Replace with Supabase Realtime channel subscription on the `messages` table.

**New `ChatPanel.tsx` real-time pattern:**

```typescript
import { supabase } from "@/lib/supabase";

useEffect(() => {
  const channel = supabase
    .channel(`thread:${threadId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `thread_id=eq.${threadId}`,
      },
      (payload) => {
        setMessages((prev) => [...prev, payload.new as Message]);
        scrollToBottom();
      }
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}, [threadId]);
```

Keep the `/api/chat/[threadId]/stream` route as a fallback SSE endpoint for environments where WebSocket is unavailable (Safari iOS WebView edge cases), but the primary path uses Supabase Realtime.

---

## PART 14 — UI/UX DESIGN SPECIFICATION

This is non-negotiable. Every pixel must reflect a premium, Apple-inspired aesthetic.

### 14.1 Design Principles

1. **Clarity first** — no element exists without purpose. Remove all visual noise.
2. **Purposeful whitespace** — generous padding, breathing room between sections.
3. **Subtle depth** — cards float with `shadow-sm` by default, `shadow-md` on hover.
4. **Micro-interactions** — every interactive element has a smooth transition (150–300ms ease).
5. **Consistent radius** — use `rounded-2xl` for cards, `rounded-xl` for inputs, `rounded-lg` for badges.
6. **Typography hierarchy** — clear distinction between headings (600+), labels (500), body (400).

### 14.2 Colour System (Tailwind)

```
Primary:        blue-600  (#2563EB)  — CTAs, links, active states
Success:        emerald-500 (#10B981) — completed, approved, passed
Warning:        amber-500  (#F59E0B)  — pending, in progress, medium priority
Danger:         red-500    (#EF4444)  — errors, rejected, high priority, overdue
Neutral:        gray-900/700/500/300/100 — text and surface hierarchy
Background:     gray-50    (#F9FAFB)  — page background
Card surface:   white                 — all cards
Border:         gray-100/200          — subtle separators only
```

### 14.3 Typography

```
Font family:    -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
                (Use next/font to load Inter as fallback)

Sizes:
  Page title:   text-2xl font-bold text-gray-900
  Section head: text-lg font-semibold text-gray-800
  Card title:   text-base font-semibold text-gray-800
  Label:        text-xs font-medium text-gray-500 uppercase tracking-wider
  Body:         text-sm text-gray-600
  Caption:      text-xs text-gray-400
```

### 14.4 Animation System

**All animations must use Framer Motion.** Tailwind CSS animations only for micro-interactions (hover, active).

```typescript
// Page entry: staggered children
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } }
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] } }
};

// Card hover
<motion.div whileHover={{ y: -2, boxShadow: "0 8px 24px rgba(0,0,0,0.08)" }} />

// Number count-up on analytics KPIs
// Use framer-motion useMotionValue + useTransform for smooth count animation
```

### 14.5 Component Patterns

**Cards:**
```
bg-white rounded-2xl border border-gray-100 shadow-sm
hover:shadow-md transition-shadow duration-200
p-5 or p-6
```

**Primary Button:**
```
bg-blue-600 hover:bg-blue-700 active:bg-blue-800
text-white text-sm font-medium
px-4 py-2.5 rounded-xl
transition-colors duration-150
focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2
disabled:opacity-50 disabled:cursor-not-allowed
```

**Input Fields:**
```
bg-white border border-gray-200 rounded-xl
px-3.5 py-2.5 text-sm text-gray-900
focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent
placeholder:text-gray-400
transition-all duration-150
```

**Status Badges:**
```
Rounded-full, text-xs font-medium, px-2.5 py-1
new:         bg-gray-100   text-gray-600
ready:       bg-blue-50    text-blue-600
in_progress: bg-amber-50   text-amber-600
completed:   bg-emerald-50 text-emerald-600
invoiced:    bg-purple-50  text-purple-600
paid:        bg-green-50   text-green-700
```

**Sidebar (desktop):**
```
w-60 fixed left-0 top-0 h-screen
bg-gray-950 (near-black, not pure black)
pt-4 pb-6 px-3

Logo area: px-4 py-4 mb-2
Nav items: rounded-xl px-3 py-2.5 text-sm
  default:    text-gray-400 hover:text-white hover:bg-white/5
  active:     text-white bg-white/10 font-medium
  transition: all 150ms ease

Bottom: user avatar + name + sign out
```

**Analytics Charts:**
- Background: white card with `rounded-2xl border border-gray-100 shadow-sm`
- Grid lines: `stroke="#F3F4F6"` (very faint)
- Tooltips: styled with `bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg`
- Pie chart legend: right-aligned, text-sm
- Chart title: top-left, text-base font-semibold text-gray-800
- Sub-label: text-xs text-gray-400 below title
- All charts must have a loading skeleton state (animated pulse)

### 14.6 Responsive Breakpoints

```
Mobile:   < 640px  — single column, bottom nav bar, FAB for chat
Tablet:   640-1024 — 2-column layouts, sidebar as drawer
Desktop:  > 1024   — full sidebar, 2+ column layouts
```

---

## PART 15 — DATA LAYER: SUPABASE QUERY PATTERNS

### 15.1 Database Client Module (`src/lib/db.ts`)

Create a typed query module to replace all `sheets.ts` functions:

```typescript
import { supabaseAdmin } from "./supabase";

// ── Jobs ──────────────────────────────────────────────────────────────────────

export async function getJobs(filters: {
  tenantIds?: string[];  // null = all (super admin)
  status?: string;
  quoteStatus?: string;
  priority?: string;
  assignedToId?: string; // for technician filter
  paymentStatus?: string;
  inspectionRequired?: string;
}) {
  let q = supabaseAdmin
    .from("jobs")
    .select(`
      *,
      chat_threads!jobs_id_fkey (
        id, pending_on, last_message, last_message_at,
        last_message_by, response_due_time
      ),
      quote_items ( id, description, quantity, unit_price, total )
    `)
    .order("created_at", { ascending: false });

  if (filters.tenantIds) q = q.in("tenant_id", filters.tenantIds);
  if (filters.status) q = q.eq("job_status", filters.status);
  if (filters.quoteStatus) q = q.eq("quote_status", filters.quoteStatus);
  if (filters.priority) q = q.eq("priority", filters.priority);
  if (filters.assignedToId) q = q.eq("assigned_to_id", filters.assignedToId);
  if (filters.paymentStatus) q = q.eq("payment_status", filters.paymentStatus);
  if (filters.inspectionRequired) q = q.eq("inspection_required", filters.inspectionRequired);

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function getJobById(id: string) {
  const { data, error } = await supabaseAdmin
    .from("jobs")
    .select(`
      *,
      chat_threads ( *, messages ( * ) ),
      quote_items ( * ),
      inspections ( * )
    `)
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

// ── Analytics ────────────────────────────────────────────────────────────────

export async function getRevenueByTenant() {
  const { data } = await supabaseAdmin
    .from("jobs")
    .select("tenant_id, quote_total_with_gst, job_status, created_at, tenants(name)")
    .in("job_status", ["completed", "invoiced", "paid"]);

  // Group by tenant in application code for flexibility
  // (Supabase doesn't support GROUP BY in client queries — use RPC for complex aggregates)
  return data ?? [];
}

// For complex aggregates, define Supabase RPC functions (stored procedures)
// Example: get_monthly_revenue(tenant_id UUID) → TABLE(month TEXT, revenue NUMERIC)
```

### 15.2 Required Supabase RPC Functions

Create these functions in Supabase SQL Editor (Dashboard → Database → Functions):

```sql
-- Monthly revenue per tenant
CREATE OR REPLACE FUNCTION get_monthly_revenue(p_tenant_id UUID DEFAULT NULL)
RETURNS TABLE(month TEXT, revenue NUMERIC, job_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
    COALESCE(SUM(quote_total_with_gst), 0) AS revenue,
    COUNT(*) AS job_count
  FROM public.jobs
  WHERE
    job_status IN ('completed', 'invoiced', 'paid')
    AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
    AND created_at >= NOW() - INTERVAL '12 months'
  GROUP BY DATE_TRUNC('month', created_at)
  ORDER BY 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Quotation stats
CREATE OR REPLACE FUNCTION get_quote_stats(p_tenant_id UUID DEFAULT NULL)
RETURNS TABLE(status TEXT, count BIGINT, total_value NUMERIC) AS $$
BEGIN
  RETURN QUERY
  SELECT
    quote_status::TEXT,
    COUNT(*) AS count,
    COALESCE(SUM(quote_total_with_gst), 0) AS total_value
  FROM public.jobs
  WHERE (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
  GROUP BY quote_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Manpower summary
CREATE OR REPLACE FUNCTION get_manpower_summary()
RETURNS TABLE(role TEXT, count BIGINT, active_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    role::TEXT,
    COUNT(*) AS count,
    COUNT(*) FILTER (WHERE is_active = TRUE) AS active_count
  FROM public.users
  GROUP BY role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## PART 16 — MIGRATION EXECUTION PLAN

Execute these steps **in strict order**. Do not proceed to the next step if the current step has errors.

### Step 1: Supabase Project + Schema

1. Create a new Supabase project at https://supabase.com
2. Copy the project URL and keys to `.env.local`
3. Run all SQL from Part 4 in Supabase SQL Editor (in order: 4.1 → 4.14)
4. Verify all 11 tables exist in Table Editor
5. Run the 3 RPC functions from Part 15.2
6. Enable Realtime for the `messages` table:
   - Supabase Dashboard → Database → Replication → Tables → enable `messages`

### Step 2: Package Changes

```bash
cd DGPS-Portal
npm uninstall googleapis
npm install @supabase/supabase-js recharts
npm install next-auth@4  # verify already installed
# bcryptjs stays (still needed for Credentials provider)
```

### Step 3: New Core Files

Create in order:
1. `src/lib/supabase.ts` — Supabase client (see Part 3.2)
2. `src/lib/db.ts` — Query module (see Part 15.1)
3. `src/types/database.ts` — Generated types (use `supabase gen types typescript`)
4. `src/lib/auth.ts` — Updated auth with Google provider (see Part 5.2)
5. `src/types/next-auth.d.ts` — Updated session types (see Part 5.3)
6. `src/lib/tenant.ts` — Updated tenant helper (now uses assignedTenantIds array)

### Step 4: Delete Legacy Files

```bash
rm src/lib/sheets.ts
rm src/lib/sheets-seed.ts
rm scripts/seed-sheets.ts
rm scripts/test-chat-persistence.ts
```

### Step 5: Replace API Routes (one by one, test after each)

Replace each API route file, removing all `sheets.ts` imports and replacing with `db.ts` / `supabaseAdmin` calls:

Priority order:
1. `/api/auth/[...nextauth]`
2. `/api/jobs`
3. `/api/jobs/[id]`
4. `/api/jobs/[id]/quote`
5. `/api/chat/[threadId]`
6. `/api/chat/[threadId]/stream` (switch to Supabase Realtime pattern)
7. `/api/users`
8. `/api/users/[id]`
9. `/api/notifications`
10. `/api/public/request`
11. `/api/auth/forgot-password`
12. `/api/auth/reset-password`
13. `/api/tenants`
14. `/api/inspections`
15. `/api/reports/excel`

### Step 6: Add New API Routes

1. `/api/jobs/[id]/quote/revision` — Technician quote revision
2. `/api/jobs/[id]/quote/history` — Quote version history
3. `/api/users/[id]/assignments` — Ops manager tenant assignment
4. `/api/analytics/overview`
5. `/api/analytics/revenue`
6. `/api/analytics/quotations`
7. `/api/analytics/insights`

### Step 7: Update Frontend Pages

1. Update `ChatPanel.tsx` to use Supabase Realtime (see Part 13)
2. Update all pages that fetch from API routes (no sheets direct calls in pages)
3. Add Google sign-in button to login page (see Part 5.4)

### Step 8: New Frontend Pages/Components

1. `/analytics` — Full analytics dashboard (Part 10)
2. `/settings/team` — Team management for ops managers
3. `QuoteRevisionModal.tsx` — Technician quote revision
4. `AssignCompaniesModal.tsx` — Ops manager company assignment
5. `OpsManagerAssignment.tsx` — User management panel component
6. Chart components: `QuotePieChart.tsx`, `RevenueBarChart.tsx`, `MonthlyChart.tsx`, `InsightCard.tsx`

### Step 9: Seed Data

Write a `scripts/seed-supabase.ts` script that inserts demo data matching this structure:

```typescript
// Demo tenants
const tenants = [
  { name: "Domain Group Plumbing", slug: "dgps", email: "admin@dgps.com.au" },
  { name: "PropServ Maintenance", slug: "propserv", email: "admin@propserv.com.au" },
];

// Demo users per tenant
// super_admin (1 global), ops_manager (1 per tenant), technician (2 per tenant), client (3 per tenant)

// Demo jobs (5 per tenant, mix of all statuses)
// Demo quote items, chat threads, messages, inspections
```

### Step 10: Validation Checklist

Before marking any feature done, verify:

- [ ] Login works with email + password
- [ ] Login works with Google OAuth
- [ ] Super admin can see all companies' jobs
- [ ] Ops manager only sees their assigned tenants
- [ ] Technician only sees assigned jobs
- [ ] Client can only modify quoteStatus
- [ ] Real-time chat sends and receives messages without page refresh
- [ ] Quote creation calculates GST correctly
- [ ] Technician can submit quote revision on in_progress jobs
- [ ] Client sees revised quote with old quote history
- [ ] Analytics pie chart renders with correct data
- [ ] Clicking pie chart slice navigates to quotations table filtered by status
- [ ] Company revenue bar chart renders
- [ ] Clicking company bar shows monthly drill-down
- [ ] All insight cards render with real data
- [ ] Ops manager can create technician accounts
- [ ] Super admin can assign companies to ops manager
- [ ] Assigned companies reflected in ops manager's dashboard
- [ ] All pages are mobile-responsive
- [ ] All animations run smoothly (no layout shift, no flicker)

---

## PART 17 — EXISTING FEATURES (UNCHANGED BEHAVIOUR)

The following features exist in the current codebase. Migrate them to use Supabase but **do not change their behaviour or UX**:

### Job Lifecycle
States: `new → ready → in_progress → completed → invoiced → paid`. Same transitions, same system messages triggered in chat.

### Public Job Request Form (`/request/[tenantSlug]`)
3-step form: client info → job details → account creation. Rate limited to 5/IP/min. Honeypot spam protection. Auto-creates user + job + chat thread.

### Notification System
Polls `/api/notifications` every 30s. Role-based notifications (chat replies, overdue, pending quotes, quote ready for clients).

### Job Filters
Filter jobs by status, quote status, priority, payment status, inspection required, company, and chat pending status.

### Assign Technician
Ops manager assigns a technician to a job from their tenant's technician list.

### PDF Chat Export
`GET /api/chat/[threadId]/pdf` — exports all messages as formatted PDF.

### Password Reset Flow
Resend API sends reset email. Token expires in 1 hour. One-use only.

### Inspection System
Structured checklist, pass/fail/N/A per item, auto-status from results, marks job `inspection_required = 'done'`.

### Technician Field Actions
Start Job button (new→in_progress), Mark Completed button (in_progress→completed), Apple Maps navigation.

### Excel Report
Super admin downloads weekly report with job summary, performance, and communication stats.

---

## PART 18 — COMMON MISTAKES TO AVOID

1. **Never expose `service_role` key to the browser.** `supabaseAdmin` must only be used in server-side code (API routes, Server Components). Browser code uses `supabase` with anon key.

2. **Always check session before every database operation.** Do not trust client-supplied `tenantId` — always derive it from `session.user.tenantId` or `session.user.assignedTenantIds`.

3. **Supabase foreign key naming:** The Supabase JS client infers relationship names from FK constraints. If a join fails, explicitly name the relationship: `.select("*, chat_threads!jobs_id_fkey(*)")`.

4. **Do not use Google Sheets HEADERS array format.** All column names are now snake_case PostgreSQL columns, not CamelCase string arrays.

5. **Analytics queries are expensive.** Cache analytics API responses for 5 minutes using Next.js `revalidate`:
   ```typescript
   export const revalidate = 300; // 5 minutes for analytics pages
   ```

6. **Quote GST is always 10%.** Never make this configurable. `gst = subtotal * 0.10`, always `Math.round(result * 100) / 100`.

7. **Job numbers are per-tenant sequential.** When creating a job, find the max job number for that tenant:
   ```sql
   SELECT MAX(CAST(SPLIT_PART(job_number, '-', 2) AS INTEGER)) FROM jobs WHERE tenant_id = $1
   ```
   Then increment: `JOB-001`, `JOB-002`, etc.

8. **Supabase Realtime requires `REPLICA IDENTITY FULL`** on the `messages` table (already included in schema SQL above).

9. **Google OAuth users have no `password_hash`.** Do not attempt to compare passwords for OAuth users. The `signIn` callback handles their auth entirely.

10. **Framer Motion must be loaded as a client component.** Any component using `motion.div` needs `"use client"` at the top. Create wrapper components if needed to avoid making entire pages client-side.

---

## PART 19 — FILE STRUCTURE (FINAL)

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── reset-password/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── jobs/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       ├── chat/page.tsx
│   │   │       └── inspection/page.tsx
│   │   ├── client/
│   │   │   ├── page.tsx
│   │   │   └── jobs/[id]/page.tsx
│   │   ├── technician/
│   │   │   ├── page.tsx
│   │   │   └── jobs/[id]/page.tsx
│   │   ├── analytics/          ← NEW
│   │   │   ├── page.tsx
│   │   │   └── quotations/page.tsx
│   │   ├── companies/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── settings/
│   │   │   ├── users/page.tsx
│   │   │   ├── team/page.tsx   ← NEW
│   │   │   └── profile/page.tsx
│   │   └── reports/page.tsx
│   ├── api/
│   │   ├── auth/
│   │   │   ├── [...nextauth]/route.ts
│   │   │   ├── forgot-password/route.ts
│   │   │   └── reset-password/route.ts
│   │   ├── jobs/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       ├── route.ts
│   │   │       └── quote/
│   │   │           ├── route.ts
│   │   │           ├── revision/route.ts  ← NEW
│   │   │           └── history/route.ts   ← NEW
│   │   ├── chat/[threadId]/
│   │   │   ├── route.ts
│   │   │   ├── stream/route.ts
│   │   │   └── pdf/route.ts
│   │   ├── users/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       ├── route.ts
│   │   │       └── assignments/route.ts  ← NEW
│   │   ├── analytics/          ← NEW
│   │   │   ├── overview/route.ts
│   │   │   ├── revenue/route.ts
│   │   │   ├── quotations/route.ts
│   │   │   └── insights/route.ts
│   │   ├── tenants/route.ts
│   │   ├── inspections/route.ts
│   │   ├── notifications/route.ts
│   │   ├── reports/excel/route.ts
│   │   ├── upload/route.ts
│   │   ├── public/
│   │   │   ├── request/route.ts
│   │   │   ├── check-tenant/route.ts
│   │   │   └── check-email/route.ts
│   │   └── admin/
│   │       ├── seed/route.ts
│   │       └── clear-chats/route.ts
│   ├── request/[tenantSlug]/page.tsx
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── analytics/              ← NEW
│   │   ├── QuotePieChart.tsx
│   │   ├── RevenueBarChart.tsx
│   │   ├── MonthlyLineChart.tsx
│   │   ├── InsightCard.tsx
│   │   ├── KpiCard.tsx
│   │   └── CompanyDrillDown.tsx
│   ├── chat/
│   │   └── ChatPanel.tsx       (updated: Supabase Realtime)
│   ├── companies/
│   │   └── CreateCompanyButton.tsx
│   ├── jobs/
│   │   ├── AssignTechnician.tsx
│   │   ├── InspectionForm.tsx
│   │   ├── JobActions.tsx
│   │   ├── JobFilters.tsx
│   │   ├── QuotePanel.tsx      (updated: shows history)
│   │   ├── QuoteRevisionModal.tsx  ← NEW
│   │   └── TechJobActions.tsx  (updated: add revise quote button)
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── MobileNav.tsx
│   │   └── ClientTopNav.tsx
│   ├── reports/
│   │   └── ExcelDownloadButton.tsx
│   ├── settings/
│   │   ├── UserManagement.tsx  (updated: ops manager create technician)
│   │   ├── TeamManagement.tsx  ← NEW (ops manager's team view)
│   │   └── OpsManagerAssignment.tsx ← NEW (super admin assigns companies)
│   └── ui/
│       ├── Badge.tsx
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Input.tsx
│       ├── Modal.tsx
│       ├── Skeleton.tsx
│       └── UserStatusToggle.tsx
├── lib/
│   ├── auth.ts                 (updated: Google + Supabase)
│   ├── supabase.ts             ← NEW
│   ├── db.ts                   ← NEW (replaces sheets.ts)
│   └── tenant.ts               (updated: works with assignedTenantIds[])
└── types/
    ├── database.ts             ← NEW (generated from Supabase)
    └── next-auth.d.ts          (updated)
```

---

## SUMMARY: WHAT EMERGENT MUST BUILD

| # | Feature | New or Migrated | Priority |
|---|---------|----------------|----------|
| 1 | Supabase database migration | Migration | P0 - DO FIRST |
| 2 | Google OAuth sign-in | New | P0 |
| 3 | Analytics dashboard (4 tabs) | New | P1 |
| 4 | Quotation pie chart with drill-down | New | P1 |
| 5 | Revenue bar chart with monthly drill-down | New | P1 |
| 6 | Smart insights panel | New | P1 |
| 7 | Ops manager multi-company assignment | New | P1 |
| 8 | Technician account creation by ops manager | New | P1 |
| 9 | Technician quote revision (site visit) | New | P1 |
| 10 | Client re-approval of revised quotes | New | P1 |
| 11 | Quote history / version tracking | New | P2 |
| 12 | Supabase Realtime for chat | Migration + Enhancement | P0 |
| 13 | Premium Framer Motion animations | Enhancement | P2 |
| 14 | Supabase Storage for file uploads | Migration | P2 |
| 15 | All existing features (unchanged UX) | Migration | P0 |

---

*End of DGPS Portal Master Implementation Guide. Total tables: 11. Total routes: 35. Total new features: 9. Author: Claude Opus 4.6.*
