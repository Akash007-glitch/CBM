import { supabase } from "@/app/lib/supabase";
import { mapAuthError } from "@/lib/auth/validation";

export interface SignInResult {
  success: boolean;
  error?: string;
}

export interface ResetPasswordResult {
  success: boolean;
  error?: string;
}

/**
 * Signs in the user via Supabase email/password auth.
 * Returns success flag and a friendly error string on failure.
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<SignInResult> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { success: false, error: mapAuthError(error.message) };
  }

  return { success: true };
}

/**
 * Sends a password reset email via Supabase.
 * Redirect URL can be configured per-environment.
 */
export async function sendPasswordReset(email: string): Promise<ResetPasswordResult> {
  const redirectTo =
    typeof window !== "undefined"
      ? `${window.location.origin}/auth/reset-password`
      : undefined;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    return { success: false, error: mapAuthError(error.message) };
  }

  return { success: true };
}

/**
 * Signs out the current user session.
 */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
