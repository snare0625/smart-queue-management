import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// NEXT_PUBLIC_* values are baked into the browser bundle at build time — fine for the URL and anon key,
// because Row Level Security in the database decides what that key may do. Never put the service_role key here.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null | undefined;

/** The shared Supabase client, or null when the env vars aren't set (the app then runs as a local demo). */
export function getSupabase(): SupabaseClient | null {
  if (client === undefined) client = url && anonKey ? createClient(url, anonKey) : null;
  return client;
}
