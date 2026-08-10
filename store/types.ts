import { User, Session } from "@supabase/supabase-js";
import { UserRole } from "@/types/auth";

// ─── Store State ─────────────────────────────────────────────────────────────

export interface AuthState {
  /** Currently authenticated Supabase user, or null if signed out */
  user: User | null;
  /** Active Supabase session (contains access/refresh tokens), or null */
  session: Session | null;
  /** User's role, sourced from the `profiles` table (not user_metadata) */
  role: UserRole;
  /** True while any async auth operation is in flight */
  isLoading: boolean;
  /** True once the store has hydrated from Supabase (avoids flash) */
  isInitialized: boolean;
  /** Non-null when an auth operation fails */
  error: string | null;
}

// ─── Store Actions ────────────────────────────────────────────────────────────

export interface AuthActions {
  /** Initialise from existing Supabase session (call on app mount) */
  initialize: () => Promise<void>;
  /** Sign in via email + password, fetch role from profiles, populate store */
  login: (
    email: string,
    password: string
  ) => Promise<{
    success: boolean;
    error?: string;
    role?: "admin" | "salesman" | null;
  }>;
  /** Sign out, clear user/session, reset state */
  logout: () => Promise<void>;
  /** Manually set the active role without re-authenticating */
  setRole: (role: UserRole) => void;
  /** Clear any current error string */
  clearError: () => void;
  /** Internal: hydrate user + session + role directly (used by auth listener) */
  _setAuth: (
    user: User | null,
    session: Session | null,
    role?: "admin" | "salesman"
  ) => void;
}

export type AuthStore = AuthState & AuthActions;

