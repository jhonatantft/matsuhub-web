import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client with the service role key (bypasses RLS).
 * Never import this from a Client Component, and never expose these env vars as NEXT_PUBLIC_*.
 */
if (typeof window !== "undefined") {
  throw new Error("lib/supabase/server.ts must only run on the server");
}

let client: SupabaseClient | null = null;

/** The admin client, or null when SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set. */
export function supabaseAdmin(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  client ??= createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { "x-application-name": "matsuhub-web" } },
  });
  return client;
}

/** Row shape of public.leads (supabase/migrations/0001_leads.sql), minus the generated columns. */
export type LeadRow = {
  source: "site" | "demo-imobiliaria" | "demo-restaurante";
  name: string;
  contact: string;
  interests: string[] | null;
  interest: string | null;
  message: string | null;
  user_agent: string | null;
  referer: string | null;
};
