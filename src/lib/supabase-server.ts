import { createClient } from "@supabase/supabase-js";

// Server-only admin client (uses service role key — NEVER expose to browser)
// Only import this in API routes, server components, and server-side utilities
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
