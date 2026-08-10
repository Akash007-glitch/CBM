import React from "react";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <main className="min-h-dvh bg-login-gradient flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 overflow-y-auto">
      <LoginForm />
    </main>
  );
}
