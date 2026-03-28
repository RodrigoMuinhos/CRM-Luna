import { Suspense } from "react";
import { ResetPassword } from "@/components/auth/ResetPassword";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Carregando...</div>}>
      <ResetPassword />
    </Suspense>
  );
}
