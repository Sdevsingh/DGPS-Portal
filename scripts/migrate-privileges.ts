/**
 * Migration: Add client_company_name to users table
 *
 * Get your SUPABASE_DB_URL from:
 *   Supabase Dashboard → Your Project → Settings → Database
 *   → Connection String → "URI" tab (use the direct connection, NOT the pooler)
 *   It looks like: postgresql://postgres:[YOUR-PASSWORD]@db.zsbtgekwrybjnxumrlem.supabase.co:5432/postgres
 *
 * Add it to .env.local as SUPABASE_DB_URL, then run:
 *   npx tsx --env-file=.env.local scripts/migrate-privileges.ts
 */

import { Client } from "pg";

const DB_URL = process.env.SUPABASE_DB_URL;

if (!DB_URL) {
  console.error(`
ERROR: SUPABASE_DB_URL is not set.

Add it to your .env.local file:
  SUPABASE_DB_URL=postgresql://postgres:[YOUR-PASSWORD]@db.zsbtgekwrybjnxumrlem.supabase.co:5432/postgres

Get it from: Supabase Dashboard → Project → Settings → Database → Connection String (URI)
  `);
  process.exit(1);
}

async function migrate() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  console.log("Connected to database.");

  try {
    // Check if column already exists
    const { rows } = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'client_company_name';
    `);

    if (rows.length > 0) {
      console.log("✓ Column 'client_company_name' already exists. No changes needed.");
      return;
    }

    // Add the column
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS client_company_name TEXT;
    `);

    console.log("✓ Added 'client_company_name' column to users table.");
    console.log("Migration complete.");
  } finally {
    await client.end();
  }
}

migrate().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
