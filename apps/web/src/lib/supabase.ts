import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase client, created only if the public env vars are present. The anon
 * key is safe to ship in the client — row-level security (see README) is what
 * protects each user's data. Never put the service_role key here.
 *
 * If unconfigured, `supabase` is null and the app runs normally with team
 * saving disabled (a setup hint is shown instead).
 */
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null;

export const authConfigured = supabase !== null;
