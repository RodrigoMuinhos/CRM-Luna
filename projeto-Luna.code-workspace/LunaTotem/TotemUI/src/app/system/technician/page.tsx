"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TechnicianPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/system/tef/110");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#F6F3EF] px-6 py-10 text-[#3B2B22]">
      <div className="mx-auto max-w-xl rounded-2xl border border-[#E8E2DA] bg-white p-6">
        <p className="text-sm font-semibold">Redirecionando para a operação TEF…</p>
        <p className="mt-1 text-xs text-[#4A4A4A]/70">
          A tela técnica foi unificada em uma única página: <span className="font-mono">/system/tef/110</span>.
        </p>
      </div>
    </div>
  );
}
