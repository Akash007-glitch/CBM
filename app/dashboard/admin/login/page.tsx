"use client";

import { LoginForm } from "@/components/auth/LoginForm";
import { AuthGuard } from "@/components/auth/AuthGuard";

export default function AdminLoginPage() {
  return (
    <AuthGuard redirectIfAuth>
      <main className="min-h-screen bg-login-gradient flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
        <LoginForm portalRole="admin" />
      </main>
    </AuthGuard>
  );
}
