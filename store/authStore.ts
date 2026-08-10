import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { supabase } from "@/app/lib/supabase";
import { mapAuthError } from "@/lib/auth/validation";
import { AuthStore } from "@/store/types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Fetches the role for a given user ID from the `profiles` table.
 * RLS ensures a user can only read their own row.
 * Returns null if the profile row doesn't exist yet.
 */
async function fetchProfileRole(
  user: any
): Promise<"admin" | "salesman" | null> {
  if (!user) return null;

  // 1. Check user_metadata (useful when logged in via role portals or admin creation)
  const metaRole = user.user_metadata?.role;
  if (metaRole === "admin" || metaRole === "salesman") return metaRole;

  // 2. Query `profiles` table
  try {
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    const role = (data as { role: string } | null)?.role;
    if (role === "admin" || role === "salesman") return role;
  } catch (err) {
    console.warn("Could not fetch profile role from Supabase:", err);
  }

  return null;
}

// ─── Initial State ────────────────────────────────────────────────────────────

const initialState = {
  user: null,
  session: null,
  role: "salesman" as const,
  isLoading: false,
  isInitialized: false,
  error: null,
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // ── Initialize ──────────────────────────────────────────────────────────
      initialize: async () => {
        if (get().isInitialized) return;

        set({ isLoading: true }, false, "auth/initialize/pending");

        try {
          const {
            data: { session },
            error,
          } = await supabase.auth.getSession();

          if (error) throw error;

          let role: "admin" | "salesman" = "salesman";
          if (session?.user) {
            role = (await fetchProfileRole(session.user)) ?? "salesman";
          }

          set(
            {
              user: session?.user ?? null,
              session: session ?? null,
              role,
              isLoading: false,
              isInitialized: true,
            },
            false,
            "auth/initialize/fulfilled"
          );
        } catch {
          set(
            { isLoading: false, isInitialized: true },
            false,
            "auth/initialize/rejected"
          );
        }

        // Subscribe to Supabase auth state changes (token refresh, sign-out, etc.)
        supabase.auth.onAuthStateChange(async (_event, session) => {
          let role: "admin" | "salesman" = "salesman";
          if (session?.user) {
            role = (await fetchProfileRole(session.user)) ?? "salesman";
          }
          get()._setAuth(session?.user ?? null, session ?? null, role);
        });
      },

      // ── Login ───────────────────────────────────────────────────────────────
      login: async (email, password) => {
        set({ isLoading: true, error: null }, false, "auth/login/pending");

        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          const friendlyError = mapAuthError(error.message);
          set(
            { isLoading: false, error: friendlyError },
            false,
            "auth/login/rejected"
          );
          return { success: false, error: friendlyError };
        }

        // Fetch the real role from `profiles` — this is the authoritative source.
        // Must pass the full user object (not just user.id) so fetchProfileRole
        // can check user_metadata AND query the profiles table correctly.
        const profileRole = data.user
          ? await fetchProfileRole(data.user)
          : null;

        set(
          {
            user: data.user,
            session: data.session,
            role: profileRole ?? "salesman",
            isLoading: false,
            error: null,
          },
          false,
          "auth/login/fulfilled"
        );

        return { success: true, role: profileRole };
      },

      // ── Logout ──────────────────────────────────────────────────────────────
      logout: async () => {
        set({ isLoading: true }, false, "auth/logout/pending");

        await supabase.auth.signOut();

        set(
          {
            ...initialState,
            isInitialized: true, // keep initialized so UI doesn't flash
          },
          false,
          "auth/logout/fulfilled"
        );
      },

      // ── Helpers ─────────────────────────────────────────────────────────────
      setRole: (role) => set({ role }, false, "auth/setRole"),

      clearError: () => set({ error: null }, false, "auth/clearError"),

      _setAuth: (user, session, role) =>
        set(
          { user, session, ...(role !== undefined ? { role } : {}) },
          false,
          "auth/_setAuth"
        ),
    }),
    { name: "AuthStore" }
  )
);

// ─── Selector hooks (prevent unnecessary re-renders) ─────────────────────────

/** Current authenticated user */
export const useUser = () => useAuthStore((s) => s.user);

/** Current active session */
export const useSession = () => useAuthStore((s) => s.session);

/** Whether the user is authenticated */
export const useIsAuthenticated = () => useAuthStore((s) => Boolean(s.user));

/** Loading flag for any in-flight auth op */
export const useAuthLoading = () => useAuthStore((s) => s.isLoading);

/** Whether the store has finished hydrating */
export const useAuthInitialized = () => useAuthStore((s) => s.isInitialized);

/** Current auth error string */
export const useAuthError = () => useAuthStore((s) => s.error);

/** Selected portal role */
export const useRole = () => useAuthStore((s) => s.role);

/** Bound action: login */
export const useLogin = () => useAuthStore((s) => s.login);

/** Bound action: logout */
export const useLogout = () => useAuthStore((s) => s.logout);

/** Bound action: setRole */
export const useSetRole = () => useAuthStore((s) => s.setRole);
