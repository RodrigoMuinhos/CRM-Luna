"use client";

import { useState } from "react";
import { authAPI } from "@/lib/api";
import { AUTH_STORAGE_KEYS, normalizeRole, setAuth } from "@/lib/apiConfig";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";

interface LoginModalProps {
  open: boolean;
  onSuccess: (user?: unknown) => void;
  onClose: () => void;
  onForgotPassword?: () => void;
}

export function LoginModal({
  open,
  onSuccess,
  onClose,
  onForgotPassword,
}: LoginModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const router = useRouter();

  if (!open) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const res = await authAPI.login(email, password);
      // Persist auth
      localStorage.setItem(AUTH_STORAGE_KEYS.token, res.token);
      const normalizedRole = normalizeRole(res.role);
      if (normalizedRole) {
        localStorage.setItem(AUTH_STORAGE_KEYS.role, normalizedRole);
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEYS.role);
      }

      const rawRole = String((res as any)?.role ?? '').trim();
      if (rawRole) {
        localStorage.setItem(AUTH_STORAGE_KEYS.roleRaw, rawRole);
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEYS.roleRaw);
      }

      // Used for the "re-auth password" prompt in Admin Master-only tools.
      localStorage.setItem(AUTH_STORAGE_KEYS.email, email.trim());

      localStorage.setItem(AUTH_STORAGE_KEYS.refresh, res.refreshToken);
      setAuth(res.token, normalizedRole);
      onSuccess(res);
      onClose();
    } catch (e: any) {
      alert(e.message || 'Falha no login');
    }
  };

  const handleForgotPassword = () => {
    onForgotPassword?.();
    onClose();
    router.push("/forgot-password");
  };

  // Self-service access disabled

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-10">
      <div className="relative w-full max-w-md overflow-hidden rounded-[28px] bg-white shadow-[0_30px_90px_rgba(28,23,18,0.25)]">
        <button
          type="button"
          className="absolute top-4 right-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-[#7C4C30] shadow-lg transition hover:bg-white"
          onClick={onClose}
          aria-label="Fechar modal"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 6L18 18M6 18L18 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="bg-gradient-to-b from-[#DD9063] to-[#CFA076] px-8 py-14 text-white">
          <p className="text-xs uppercase tracking-[0.6em]">LUNA VITA</p>
          <h1 className="font-serif text-4xl leading-tight">WORK<br />SPACE</h1>
          <p className="mt-2 text-sm text-white/90">
            Acesse sua área de trabalho e tenha uma ótima jornada.
          </p>
        </div>
        <div className="px-8 py-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Entrar</h2>
          <p className="text-sm text-gray-500 mb-6">Acesse o painel de gestão.</p>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="text-sm text-gray-700 mb-2 inline-block">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="seu.email@exemplo.com"
                  className="w-full rounded-xl border border-gray-200 bg-white px-11 py-3 text-sm text-gray-700 focus:border-[#D3A67F] focus:outline-none focus:ring-2 focus:ring-[#D3A67F]"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-sm text-gray-700 mb-2 inline-block">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-gray-200 bg-white px-11 py-3 text-sm text-gray-700 focus:border-[#D3A67F] focus:outline-none focus:ring-2 focus:ring-[#D3A67F]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Remember */}
            <div className="flex items-center justify-between text-sm text-[#4A4A4A]">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-[#D3A67F] focus:ring-[#D3A67F]"
                />
                Lembrar-me
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-[#D3A67F] hover:text-[#c99970] transition-colors text-sm"
              >
                Esqueceu a senha?
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full rounded-xl bg-[#D3A67F] py-3 text-base font-semibold text-white shadow-md shadow-[#D3A67F]/40 transition hover:bg-[#c99970]"
            >
              Entrar
            </button>
          </form>

          {/* Self-service registration removed intentionally */}
        </div>

        <div className="px-8 pb-6 pt-1 text-center text-xs text-gray-500">
          © 2025 Lunavita. Todos os direitos reservados.
        </div>
      </div>
    </div>
  );
}
