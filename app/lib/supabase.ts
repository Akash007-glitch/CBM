/**
 * Supabase browser client — uses @supabase/ssr createBrowserClient so the
 * session is stored in cookies (not just localStorage). This is required so
 * proxy.ts (running on the server) can read the session on every request.
 */
import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.");
}

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
