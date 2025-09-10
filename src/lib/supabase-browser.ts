// lib/supabase-browser.ts
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Create a single instance to prevent multiple GoTrueClient instances
const supabase = createSupabaseClient(
  (import.meta as any).env.VITE_SUPABASE_URL!,
  (import.meta as any).env.VITE_SUPABASE_ANON_KEY!,
  {
    auth: { persistSession: true, autoRefreshToken: true },
  }
);

// Export the single instance
export { supabase };

// Keep createClient for backward compatibility, but it returns the same instance
export function createClient() {
  return supabase;
}
