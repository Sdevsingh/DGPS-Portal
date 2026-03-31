# Tradie Ops — DGPS Portal

A job management platform for Domain Group Property Services built with Next.js, Google Sheets (as the database), and NextAuth.

---

## What's been built

- **Dashboard** — multi-tenant stat cards per company
- **Job management** — create, list, filter, and view job details
- **Quotes** — line items with GST calculation, approve/decline with confirmation
- **Real-time chat** — per-job thread using SSE (no Socket.io)
- **Role-based access** — `super_admin`, `operations_manager`, `technician`, `client`
- **Client portal** — `/client` and `/client/jobs/[id]`
- **Public request form** — `/request/[slug]` with 2-step wizard and password creation
- **Technician mobile view** — `/technician` and `/technician/jobs/[id]`
- **Company & user management**
- **Reports** — Excel export
- **Data migration tool** — fixes Google Sheets schema mismatches

---

## Prerequisites

Before you start, make sure you have:

- [Node.js](https://nodejs.org/) v18 or later
- `npm` (comes with Node)
- The `.env` file — **get this from the team** (contains Google credentials and auth secret)

---

## Running locally (step by step)

### 1. Clone the repo

```bash
git clone https://github.com/Sdevsingh/DGPS-Portal.git
cd DGPS-Portal
```

### 2. Install dependencies

```bash
npm install
```

### 3. Add the environment file

Get the `.env` file from the team and place it in the root of the project (same level as `package.json`).

It should contain keys like:
```
GOOGLE_CLIENT_EMAIL=...
GOOGLE_PRIVATE_KEY=...
GOOGLE_SHEET_ID=...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
```

### 4. Seed the Google Sheet

This creates all the required tabs and populates demo data with the correct schema:

```bash
npx tsx src/lib/sheets-seed.ts
```

> Only needs to be run once. If you re-run it, it will reset the data.

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Demo accounts (for testing)

Use these on the login page (there are quick-fill buttons):

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@dgps.com.au | (use quick-fill on login page) |
| Operations Manager | ops@dgps.com.au | (use quick-fill) |
| Technician | tech@dgps.com.au | (use quick-fill) |
| Client | client@dgps.com.au | (use quick-fill) |

---

## First-time setup after seeding

1. Log in as `admin@dgps.com.au`
2. Go to **Settings → Data Migration**
3. Click **Run Migration** — this fixes any sheet column mismatches
4. You're good to go

---

## Useful commands

| Command | What it does |
|---------|--------------|
| `npm run dev` | Start the development server |
| `npm run build` | Build for production |
| `npm run start` | Run the production build |
| `npm run lint` | Run ESLint |
| `npx tsx src/lib/sheets-seed.ts` | Seed the Google Sheet with demo data |

---

## Tech stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS v4
- **Auth**: NextAuth v4
- **Database**: Google Sheets (via Google Sheets API)
- **Real-time**: Server-Sent Events (SSE)
- **Language**: TypeScript
