import { createClient } from "@supabase/supabase-js";

// Browser client (NEXT_PUBLIC_ keys only — safe for client bundles)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
