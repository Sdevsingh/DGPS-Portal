# DGPS Portal

Multi-tenant, role-based job operations platform for Domain Group Property Services.

This branch aligns with the **Emergent master implementation spec** and uses a **Supabase-first** architecture for data, auth integration, and real-time chat.

## Core Docs

- `EMERGENT_MASTER_GUIDE.md` — complete implementation spec and migration plan (authoritative)
- `DGPS_Portal_Complete_Guide.md` — product and workflow reference

## Platform Scope

- Full job lifecycle: request, quote, dispatch, execution, inspection, invoicing, payment
- Multi-tenant isolation by company (`tenant_id` across entities)
- Role-based access: `super_admin`, `operations_manager`, `technician`, `client`
- Client, technician, operations, and super-admin experiences
- Real-time job chat and response tracking
- Reporting and export workflows

## Tech Stack

- Next.js 16 (App Router) + React 19
- TypeScript
- Tailwind CSS v4 + Framer Motion
- NextAuth v4 (Credentials + Google OAuth)
- Supabase (PostgreSQL + Realtime + Storage)
- Recharts, jsPDF, xlsx, Resend

## Environment Variables

Create a local env file (`.env`) in the project root with:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

RESEND_API_KEY=
RESEND_FROM=
```

Important: keep `SUPABASE_SERVICE_ROLE_KEY` server-only. Never expose it to client code.

## Local Setup

1. Clone and enter the repo

```bash
git clone https://github.com/Sdevsingh/DGPS-Portal.git
cd DGPS-Portal
```

2. Install dependencies

```bash
npm install
```

3. Provision Supabase schema

- Create a Supabase project.
- Apply the SQL schema blocks from `EMERGENT_MASTER_GUIDE.md` (Part 4) in order.

4. Seed demo data (optional but recommended)

```bash
npx tsx --env-file=.env scripts/seed-supabase.ts
```

5. Start development server

```bash
npm run dev
```

Open `http://localhost:3000`.

## Demo Credentials (Seed Script)

Default password for seeded users: `password123`

- Super Admin: `admin@dgps.com.au`
- Ops Manager (DGPS): `ops@dgps.com.au`
- Technician (DGPS): `tech@dgps.com.au`
- Client (DGPS): `client@dgps.com.au`

Additional tenant users are also seeded for `propserv`.

## Useful Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start local dev server |
| `npm run build` | Build for production |
| `npm run start` | Run production build |
| `npm run lint` | Run ESLint |
| `npx tsx --env-file=.env scripts/seed-supabase.ts` | Seed Supabase demo data |

## Branch Workflow

Current working feature branch for this track: `DGPS_V2`.
