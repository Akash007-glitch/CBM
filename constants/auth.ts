import { UserRole, RoleDetail, SecurityMetric } from "@/types/auth";

export const ROLE_CONFIGS: Record<UserRole, RoleDetail> = {
  admin: {
    id: "admin",
    label: "Admin",
    portalTitle: "Admin Portal",
    portalSubtitle: "Enter your administrative credentials",
    defaultEmail: "[EMAIL_ADDRESS]",
    requiredRole: "admin",
  },
  salesman: {
    id: "salesman",
    label: "Salesman",
    portalTitle: "Salesman Portal",
    portalSubtitle: "Enter your salesman credentials",
    defaultEmail: "[EMAIL_ADDRESS]",
    requiredRole: "salesman",
  },
};

export const SECURITY_METRICS: SecurityMetric[] = [
  { label: "Encryption", value: "AES-256 GCM" },
  { label: "Session Integrity", value: "Zero-Trust JWT" },
  { label: "Audit Compliance", value: "SOC2 Type II" },
];

/** Route to redirect to after successful login, keyed by role. */
export const ROLE_REDIRECT: Record<UserRole, string> = {
  admin: "/dashboard/admin",
  salesman: "/dashboard/salesman",
};
