// Extend auth types with form state and server response shapes

export type UserRole = "admin" | "salesman";

export type AuthModalType = "forgot" | "help" | "security" | null;

export type ToastVariant = "success" | "error";

export interface RoleDetail {
  id: UserRole;
  label: string;
  portalTitle: string;
  portalSubtitle: string;
  defaultEmail: string;
  /** Supabase user_metadata role value that must match after sign-in */
  requiredRole: string;
}

export interface SecurityMetric {
  label: string;
  value: string;
}

export interface LoginFormState {
  email: string;
  password: string;
}

export interface LoginFormErrors {
  email?: string;
  password?: string;
  general?: string;
}

export interface ToastState {
  message: string;
  variant: ToastVariant;
}
