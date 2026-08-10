import { LoginForm } from "@/components/auth/LoginForm";

export default function AdminLoginPage() {
  return (
    <main className="min-h-screen bg-login-gradient flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
      <LoginForm portalRole="admin" />
    </main>
  );
}
