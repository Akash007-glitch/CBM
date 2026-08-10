import { LoginFormErrors, LoginFormState } from "@/types/auth";

/**
 * Validates login form fields client-side before submitting to Supabase.
 * Returns an errors object — empty means all fields are valid.
 */
export function validateLoginForm({ email, password }: LoginFormState): LoginFormErrors {
  const errors: LoginFormErrors = {};

  if (!email.trim()) {
    errors.email = "Email address is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Enter a valid email address.";
  }

  if (!password) {
    errors.password = "Password is required.";
  } else if (password.length < 6) {
    errors.password = "Password must be at least 6 characters.";
  }

  return errors;
}

/** Maps Supabase auth error messages to friendly UI copy. */
export function mapAuthError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("invalid login credentials") || lower.includes("invalid credentials")) {
    return "Incorrect email or password. Please try again.";
  }
  if (lower.includes("email not confirmed")) {
    return "Your email is not yet verified. Check your inbox.";
  }
  if (lower.includes("user not found")) {
    return "No account found with this email address.";
  }
  if (lower.includes("too many requests") || lower.includes("rate limit")) {
    return "Too many attempts. Please wait a few minutes before trying again.";
  }
  if (lower.includes("network") || lower.includes("fetch")) {
    return "Network error. Check your internet connection and try again.";
  }

  return "An unexpected error occurred. Please try again.";
}
