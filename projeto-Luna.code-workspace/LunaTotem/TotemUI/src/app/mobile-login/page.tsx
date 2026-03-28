"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoginModal } from '@/components/auth/LoginModal';

export default function MobileLoginPage() {
  const [open, setOpen] = useState(true);
  const router = useRouter();

  return (
    <div className="h-screen w-screen bg-[#F8F6F3] flex items-center justify-center px-4 py-6 sm:px-0">
      <div className="max-w-md w-full">
        <LoginModal
          open={open}
          onClose={() => setOpen(false)}
          onSuccess={() => {
            setOpen(false);
            router.push('/system');
          }}
        />
      </div>

      {/* If modal is closed, show a small CTA so the user can re-open it */}
      {!open && (
        <div className="fixed inset-0 z-20 flex items-center justify-center pointer-events-none">
          <div className="pointer-events-auto">
            <button
              className="px-5 py-3 rounded-lg bg-[#D3A67F] text-white shadow-lg"
              onClick={() => setOpen(true)}
            >
              Abrir login
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
