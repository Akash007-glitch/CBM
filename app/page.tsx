"use client";

import React from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { AuthGuard } from "@/components/auth/AuthGuard";

export default function LoginPage() {
  return (
    <AuthGuard redirectIfAuth>
      <main className="min-h-dvh bg-login-gradient flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 overflow-y-auto">
        <LoginForm />
      </main>
    </AuthGuard>
  );
}
