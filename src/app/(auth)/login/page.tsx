import { Suspense } from "react";
import { LoginForm } from "@/features/auth/components/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4 dark:bg-zinc-950">
      <div className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">Dositej Kartice</h1>
          <p className="mt-1 text-sm text-zinc-500">Prijava</p>
        </div>
        {/* Suspense je obavezan jer LoginForm koristi useSearchParams.
            Bez ovoga Next bail-uje iz static pre-render-a → build error. */}
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
