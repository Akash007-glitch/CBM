/**
 * Supabase admin client — uses the service role key.
 *
 * ⚠️  SECURITY: This client bypasses ALL Row Level Security policies.
 *     Use it ONLY in server-side Route Handlers or Server Actions.
 *     NEVER import this in a Client Component or expose the key client-side.
 *
 * The service role key is stored in SUPABASE_SERVICE_ROLE_KEY (no NEXT_PUBLIC_
 * prefix) so it is never included in the browser bundle.
 */
import { createClient } from "@supabase/supabase-js";

export function createAdminSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (
    !url ||
    !serviceKey ||
    serviceKey.includes("your-service-role-key") ||
    serviceKey === "your-service-role-key-here" ||
    serviceKey.trim().length < 20
  ) {
    throw new Error(
      "Missing or unconfigured SUPABASE_SERVICE_ROLE_KEY env var."
    );
  }

  return createClient(url, serviceKey, {
    auth: {
      // Disable auto-refresh and session persistence — this is a server-only,
      // short-lived client used for administrative operations only.
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
