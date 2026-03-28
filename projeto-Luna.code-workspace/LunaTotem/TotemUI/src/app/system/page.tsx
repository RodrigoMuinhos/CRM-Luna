"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Dashboard } from '@/totem-system/components/Dashboard';
import { clearAuth, ensureFreshToken, isAdminMaster, normalizeRole, setAuth } from "@/lib/apiConfig";
import { Patients } from '@/totem-system/components/Patients';
import { Doctors } from '@/totem-system/components/Doctors';
import { Appointments } from '@/totem-system/components/Appointments';
import { Calendar } from '@/totem-system/components/Calendar';
import { Settings, UserRound, Video as VideoIcon, LogOut, RotateCw, Wrench, Power, ShieldCheck, Users } from "lucide-react";
import { UserManagementDialog } from "@/totem-system/components/UserManagementDialog";
import { VideosPanel } from "@/components/pages/VideosPanel";
import { CompliancePanel } from "@/components/pages/CompliancePanel";
import { ResponsaveisPanel } from "@/components/pages/ResponsaveisPanel";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SupervisorPasswordDialog } from "@/components/SupervisorPasswordDialog";
import { toast } from "sonner";
import {
  tefHealth,
  tefServiceStart,
  tefServiceStatus,
  type TefServiceControlStatus,
} from "@/lib/tefBridge";
import { verifySessionPassword } from "@/lib/reauth";
import { WEB_ONLY_MODE } from "@/lib/appMode";

type UiRole = 'ADMINISTRACAO' | 'MEDICO' | 'RECEPCAO';
type ComplianceLight = 'green' | 'yellow' | 'red' | 'unknown';
type ComplianceSignalColor = 'green' | 'yellow' | 'red' | 'gray';

const ROLE_LABELS: Record<UiRole, string> = {
  ADMINISTRACAO: 'Administração',
  MEDICO: 'Médico',
  RECEPCAO: 'Recepção · Espaço 1',
};

export default function SystemPage() {
  const router = useRouter();
  const [activeView, setActiveView] = useState<'dashboard' | 'patients' | 'doctors' | 'appointments' | 'calendar'>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userRole, setUserRole] = useState<UiRole>('RECEPCAO');
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isConfigMenuOpen, setIsConfigMenuOpen] = useState(false);
  const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false);
  const [isComplianceDialogOpen, setIsComplianceDialogOpen] = useState(false);
  const [isResponsaveisDialogOpen, setIsResponsaveisDialogOpen] = useState(false);
  const [sitefServiceBusy, setSitefServiceBusy] = useState(false);
  const [sitefServiceStatus, setSitefServiceStatus] = useState<TefServiceControlStatus | null>(null);
  const [complianceLight, setComplianceLight] = useState<ComplianceLight>('unknown');
  const [complianceSummary, setComplianceSummary] = useState<string>('Sem dados de conformidade');
  const [sitefAuthOpen, setSitefAuthOpen] = useState(false);
  const [sitefAuthBusy, setSitefAuthBusy] = useState(false);
  const configMenuContainerRef = useRef<HTMLDivElement | null>(null);
  const refreshCallbackRef = useRef<(() => void) | null>(null);

  const describeSitefControlError = (raw: unknown): string => {
    const code = String(raw || '').trim();
    if (!code) return 'Falha ao ligar/validar serviço SiTef.';
    if (code === 'service_control_supported_only_on_windows') {
      return 'Controle de inicialização indisponível no Web App em container Linux. Use o launcher no Windows host ou o app Electron.';
    }
    if (code === 'sitef_start_target_not_found') {
      return 'Script de inicialização do SiTef não encontrado no host.';
    }
    if (code === 'password_required') {
      return 'Senha obrigatória para ligar o SiTef.';
    }
    if (code === 'invalid_password') {
      return 'Senha inválida.';
    }
    if (code === 'sitef_start_timeout_waiting_health') {
      return 'O SiTef recebeu o comando de inicialização, mas ainda está subindo. Aguarde alguns segundos e atualize o status.';
    }
    return code;
  };

  const waitSitefRunning = async (timeoutMs: number): Promise<TefServiceControlStatus> => {
    const startedAt = Date.now();
    let latest = await tefServiceStatus();
    setSitefServiceStatus(latest);
    if (latest.running) return latest;

    while (Date.now() - startedAt < timeoutMs) {
      await new Promise((resolve) => window.setTimeout(resolve, 1500));
      latest = await tefServiceStatus();
      setSitefServiceStatus(latest);
      if (latest.running) return latest;
    }

    return latest;
  };

  const handleReturnToTotem = () => {
    // No password required to return to the totem — simply navigate
    router.push('/');
  };

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const storedUser = window.localStorage.getItem('user');
    const token = window.localStorage.getItem('lv_token');
    const role = normalizeRole(window.localStorage.getItem('lv_role'));
    const hasValidToken =
      !!token && token !== 'undefined' && token !== 'null' && token.split('.').length === 3;
    if (hasValidToken) {
      setAuth(token, role);
      ensureFreshToken();
    } else if (token) {
      // Token exists but is invalid (common after older login payload mismatches)
      clearAuth();
    }

    if (role === 'ADMINISTRACAO' || role === 'MEDICO' || role === 'RECEPCAO') {
      setUserRole(role);
    }
    if (!storedUser) {
      return;
    }

    try {
      const parsed = JSON.parse(storedUser);
      const parsedRole = normalizeRole(parsed?.role);
      if (parsedRole === 'ADMINISTRACAO' || parsedRole === 'MEDICO' || parsedRole === 'RECEPCAO') {
        setUserRole(parsedRole);
      }
    } catch (error) {
      console.warn('Falha ao interpretar usuário salvo', error);
    }
  }, []);

  useEffect(() => {
    if (userRole === 'RECEPCAO' && activeView === 'doctors') {
      setActiveView('patients');
    }
  }, [userRole, activeView]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent | TouchEvent) => {
      if (!isConfigMenuOpen) {
        return;
      }
      const target = event.target as Node;
      if (configMenuContainerRef.current && !configMenuContainerRef.current.contains(target)) {
        setIsConfigMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isConfigMenuOpen]);

  useEffect(() => {
    if (userRole !== 'ADMINISTRACAO') {
      setIsConfigMenuOpen(false);
      setIsVideoDialogOpen(false);
      setIsComplianceDialogOpen(false);
      setIsResponsaveisDialogOpen(false);
    }
  }, [userRole]);

  const ensureSitefRunning = async (password: string) => {
    if (sitefServiceBusy) return;
    setSitefServiceBusy(true);
    try {
      const started = await tefServiceStart(password);
      setSitefServiceStatus(started);
      const delayedStartup = String(started.error || '') === 'sitef_start_timeout_waiting_health';
      if (!started.ok && !started.running && !delayedStartup) {
        throw new Error(describeSitefControlError(started.error || 'Falha ao ligar serviço SiTef.'));
      }

      const current = await waitSitefRunning(delayedStartup ? 95_000 : 20_000);
      if (!current.running) {
        throw new Error(describeSitefControlError(current.error || 'SiTef não ficou ativo após o comando de ligar.'));
      }

      const health = await tefHealth().catch((e: any) => ({ ok: false, error: String(e?.message || 'health_failed') }));
      if (!health?.ok) {
        throw new Error(describeSitefControlError(health?.error || 'Bridge SiTef sem health'));
      }

      toast.success('SiTef ligado e validado.');
      setSitefAuthOpen(false);
    } catch (e: any) {
      const msg = describeSitefControlError(e?.message || 'Falha ao ligar/validar serviço SiTef.');
      toast.error(msg);
    } finally {
      setSitefServiceBusy(false);
    }
  };

  const requestStartSitefService = () => {
    if (sitefServiceBusy || sitefAuthBusy || sitefServiceStatus?.supported === false) return;
    setSitefAuthOpen(true);
  };

  useEffect(() => {
    if (WEB_ONLY_MODE) return;
    if (!isConfigMenuOpen || userRole !== 'ADMINISTRACAO') return;
    let isMounted = true;
    const safeRefresh = async () => {
      const status = await tefServiceStatus();
      if (isMounted) {
        setSitefServiceStatus(status);
      }
    };
    safeRefresh();
    const intervalId = window.setInterval(safeRefresh, 5000);
    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [isConfigMenuOpen, userRole]);

  useEffect(() => {
    if (userRole !== 'ADMINISTRACAO') return;

    let mounted = true;

    const refreshComplianceLight = async () => {
      try {
        const res = await fetch('/api/compliance/status', { cache: 'no-store' });
        const data = await res.json();

        if (!mounted) return;

        if (!data?.ok || !data?.hasReport) {
          setComplianceLight('unknown');
          const code = data?.signal?.code || 'CMP-GRAY-NODATA';
          setComplianceSummary(`${code} • Sem relatório recente`);
          return;
        }

        const signalColor = String(data?.signal?.color || 'gray') as ComplianceSignalColor;
        const lightMap: Record<ComplianceSignalColor, ComplianceLight> = {
          green: 'green',
          yellow: 'yellow',
          red: 'red',
          gray: 'unknown',
        };

        const nextLight = lightMap[signalColor] || 'unknown';
        const code = String(data?.signal?.code || 'CMP-GRAY-ERROR');
        const label = String(data?.signal?.label || 'Conformidade');
        const failed = Array.isArray(data?.failedRequirements) ? data.failedRequirements : [];
        const failedCodes = failed.map((f: any) => f?.code).filter(Boolean).join(', ');

        setComplianceLight(nextLight);
        setComplianceSummary(`${code} • ${label}${failedCodes ? ` • Falhou: ${failedCodes}` : ''}`);
      } catch {
        if (!mounted) return;
        setComplianceLight('unknown');
        setComplianceSummary('CMP-GRAY-ERROR • Falha ao ler conformidade');
      }
    };

    refreshComplianceLight();
    const id = window.setInterval(refreshComplianceLight, 30000);
    return () => {
      mounted = false;
      window.clearInterval(id);
    };
  }, [userRole]);

  const toggleConfigMenu = () => {
    setIsConfigMenuOpen((prev) => !prev);
  };

  const handleOpenUserSettings = () => {
    setIsConfigMenuOpen(false);
    setIsUserDialogOpen(true);
  };

  const handleOpenVideoManager = () => {
    setIsConfigMenuOpen(false);
    setIsVideoDialogOpen(true);
  };

  const handleOpenTechnician = () => {
    setIsConfigMenuOpen(false);
    router.push('/system/technician');
  };

  const handleOpenCompliance = () => {
    setIsConfigMenuOpen(false);
    setIsComplianceDialogOpen(true);
  };

  const handleOpenResponsaveis = () => {
    setIsConfigMenuOpen(false);
    setIsResponsaveisDialogOpen(true);
  };

  const handleLogout = () => {
    setIsConfigMenuOpen(false);
    clearAuth();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user');
    }
    router.push('/');
  };

  const handleGlobalRefresh = () => {
    if (refreshCallbackRef.current) {
      refreshCallbackRef.current();
    }
  };

  // Close with Escape and lock body scroll when menu opens (mobile)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };

    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', onKey);
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [mobileMenuOpen]);
  const roleDisplay = ROLE_LABELS[userRole];
  return (
    <div className="min-h-screen bg-gray-50">
    <div className="flex min-h-screen w-full overflow-hidden">

        {/* Sidebar - on small screens this becomes an overlay */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-200 ease-in-out bg-white border-r shadow-sm w-72 sm:static sm:translate-x-0 sm:inset-auto sm:z-auto ${
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full sm:translate-x-0'
          }`}
          aria-hidden={!mobileMenuOpen && true}
        >
          <div className="px-6 py-8 border-b relative">
            <div className="text-xs uppercase tracking-wider text-gray-400">Luna Vita</div>
            <div className="mt-3 text-3xl font-serif leading-tight">Work<br/>Space</div>
            {/* Close button for mobile */}
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="sm:hidden absolute top-3 right-3 inline-flex items-center justify-center rounded-md p-2 text-gray-600 hover:bg-gray-100"
              aria-label="Fechar menu"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 6L18 18M6 18L18 6" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          <nav className="px-4 py-6 space-y-2">
            <button
              onClick={() => { setActiveView('dashboard'); setMobileMenuOpen(false); }}
              className={`w-full text-left rounded-md px-3 py-2 text-sm font-medium ${
                activeView === 'dashboard' ? 'bg-[#F8F8F8] text-gray-900 border-l-4 border-[#D3A67F]' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Dashboard
            </button>

            <button
              onClick={() => { setActiveView('patients'); setMobileMenuOpen(false); }}
              className={`w-full text-left rounded-md px-3 py-2 text-sm font-medium ${
                activeView === 'patients' ? 'bg-[#F8F8F8] text-gray-900 border-l-4 border-[#D3A67F]' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Pacientes
            </button>

            {userRole !== 'RECEPCAO' && (
              <button
                onClick={() => { setActiveView('doctors'); setMobileMenuOpen(false); }}
                className={`w-full text-left rounded-md px-3 py-2 text-sm font-medium ${
                  activeView === 'doctors' ? 'bg-[#F8F8F8] text-gray-900 border-l-4 border-[#D3A67F]' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Médicos
              </button>
            )}

            <button
              onClick={() => { setActiveView('appointments'); setMobileMenuOpen(false); }}
              className={`w-full text-left rounded-md px-3 py-2 text-sm font-medium ${
                activeView === 'appointments' ? 'bg-[#F8F8F8] text-gray-900 border-l-4 border-[#D3A67F]' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Consultas
            </button>

            <button
              onClick={() => { setActiveView('calendar'); setMobileMenuOpen(false); }}
              className={`w-full text-left rounded-md px-3 py-2 text-sm font-medium ${
                activeView === 'calendar' ? 'bg-[#F8F8F8] text-gray-900 border-l-4 border-[#D3A67F]' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Calendário
            </button>
          </nav>

          <div className="px-6 py-4 border-t space-y-4">
            {!WEB_ONLY_MODE && (
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={handleReturnToTotem}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-md border border-[#D3A67F] px-3 py-2 text-sm font-medium text-[#D3A67F] hover:bg-[#F9F6F2]"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor" />
                  </svg>
                  Voltar ao Totem
                </button>
              </div>
            )}
            <div className="text-sm text-gray-700">
              <div className="text-xs text-gray-400">Conectado como</div>
              <div className="mt-1 font-medium">{ROLE_LABELS[userRole]}</div>
            </div>
          </div>
        </aside>

        {/* Main area */}
        <div className="flex-1 flex flex-col min-w-0">
          <header className="flex flex-col gap-4 bg-white px-6 py-4 border-b shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4 w-full min-w-0">
              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileMenuOpen((s) => !s)}
                className="sm:hidden inline-flex items-center justify-center h-10 w-10 rounded-md text-gray-700 hover:bg-gray-100"
                aria-label="Abrir menu"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 6h18M3 12h18M3 18h18" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <div className="min-w-0">
                <h1 className="text-xl font-semibold text-gray-800 truncate">Painel Administrativo</h1>
                <p className="text-sm text-gray-500 mt-1">Visão geral e operações</p>
              </div>
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-4">
              {userRole === 'ADMINISTRACAO' && (
                <div className="relative flex justify-end sm:justify-start gap-2" ref={configMenuContainerRef}>
                  <button
                    type="button"
                    onClick={handleGlobalRefresh}
                    className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[#D3A67F]/50 text-[#D3A67F] transition hover:bg-[#F6EFE7]"
                    aria-label="Atualizar página"
                    title="Atualizar"
                  >
                    <RotateCw size={20} />
                  </button>
                  <button
                    type="button"
                    onClick={toggleConfigMenu}
                    className="relative inline-flex h-12 w-12 items-center justify-center rounded-full border border-[#D3A67F]/50 text-[#D3A67F] transition hover:bg-[#F6EFE7]"
                    aria-label="Configurações rápidas"
                    aria-haspopup="menu"
                    aria-expanded={isConfigMenuOpen}
                    title={`Configurações • ${complianceSummary}`}
                  >
                    <Settings size={20} />
                    <span
                      className={`absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white ${
                        complianceLight === 'green'
                          ? 'bg-green-500'
                          : complianceLight === 'yellow'
                          ? 'bg-amber-400'
                          : complianceLight === 'red'
                          ? 'bg-red-500'
                          : 'bg-gray-300'
                      }`}
                      aria-hidden
                    />
                  </button>
                  {isConfigMenuOpen && (
                    <div
                      role="menu"
                      className="absolute right-0 z-20 mt-3 w-64 rounded-[30px] border border-[#E8E2DA] bg-white px-4 py-5 shadow-2xl"
                    >
                      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-[#C4A07C]">
                        Configurações
                      </p>
                      <div className="space-y-3">
                        <button
                          type="button"
                          onClick={handleOpenUserSettings}
                          className="group flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition hover:bg-[#F8F6F1]"
                        >
                          <span className="flex h-12 w-12 items-center justify-center rounded-full border border-[#D3A67F]/40 bg-[#F9F6F2] text-[#D3A67F] transition group-hover:bg-[#F2E7DD]">
                            <UserRound size={18} />
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-[#4A4A4A]">Login</p>
                            <p className="text-xs text-[#4A4A4A]/60">Gerencie acessos e senhas</p>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={handleOpenVideoManager}
                          className="group flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition hover:bg-[#F8F6F1]"
                        >
                          <span className="flex h-12 w-12 items-center justify-center rounded-full border border-[#D3A67F]/40 bg-[#F9F6F2] text-[#D3A67F] transition group-hover:bg-[#F2E7DD]">
                            <VideoIcon size={18} />
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-[#4A4A4A]">Vídeo</p>
                            <p className="text-xs text-[#4A4A4A]/60">Enviar e organizar mídia</p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={handleOpenCompliance}
                          className="group flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition hover:bg-[#F8F6F1]"
                        >
                          <span className="flex h-12 w-12 items-center justify-center rounded-full border border-[#D3A67F]/40 bg-[#F9F6F2] text-[#D3A67F] transition group-hover:bg-[#F2E7DD]">
                            <ShieldCheck size={18} />
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-[#4A4A4A]">Conformidade</p>
                            <p className="text-xs text-[#4A4A4A]/60">Status operacional e evidências</p>
                          </div>
                          <span
                            className={`ml-auto inline-flex h-2.5 w-2.5 rounded-full ${
                              complianceLight === 'green'
                                ? 'bg-green-500'
                                : complianceLight === 'yellow'
                                ? 'bg-amber-400'
                                : complianceLight === 'red'
                                ? 'bg-red-500'
                                : 'bg-gray-300'
                            }`}
                            title={complianceSummary}
                          />
                        </button>

                        <button
                          type="button"
                          onClick={handleOpenResponsaveis}
                          className="group flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition hover:bg-[#F8F6F1]"
                        >
                          <span className="flex h-12 w-12 items-center justify-center rounded-full border border-[#D3A67F]/40 bg-[#F9F6F2] text-[#D3A67F] transition group-hover:bg-[#F2E7DD]">
                            <Users size={18} />
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-[#4A4A4A]">Responsáveis</p>
                            <p className="text-xs text-[#4A4A4A]/60">Definir quem é quem</p>
                          </div>
                        </button>

                        {!WEB_ONLY_MODE && (
                          <button
                            type="button"
                            onClick={handleOpenTechnician}
                            className="group flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition hover:bg-[#F8F6F1]"
                          >
                            <span className="flex h-12 w-12 items-center justify-center rounded-full border border-[#D3A67F]/40 bg-[#F9F6F2] text-[#D3A67F] transition group-hover:bg-[#F2E7DD]">
                              <Wrench size={18} />
                            </span>
                            <div>
                              <p className="text-sm font-semibold text-[#4A4A4A]">Técnico</p>
                            </div>
                          </button>
                        )}
                        {!WEB_ONLY_MODE && (
                          <button
                            type="button"
                            onClick={requestStartSitefService}
                            disabled={sitefServiceBusy || sitefServiceStatus?.supported === false}
                            className="group flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition hover:bg-[#F8F6F1] disabled:opacity-60"
                          >
                            <span className="flex h-12 w-12 items-center justify-center rounded-full border border-[#D3A67F]/40 bg-[#F9F6F2] text-[#D3A67F]">
                              <Power size={18} />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-[#4A4A4A]">SiTef</p>
                              <p className="text-xs text-[#4A4A4A]/60">
                                {sitefServiceStatus?.supported === false
                                  ? 'Controle indisponível neste ambiente'
                                  : sitefServiceStatus?.running
                                  ? 'Ligado'
                                  : 'Desligado'}
                              </p>
                            </div>
                            <span className="text-xs font-semibold text-[#7C4C30]">
                              {sitefServiceBusy ? 'Ligando...' : 'Ligar'}
                            </span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="group flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition hover:bg-red-50"
                        >
                          <span className="flex h-12 w-12 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-600 transition group-hover:bg-red-100">
                            <LogOut size={18} />
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-red-600">Logout</p>
                            <p className="text-xs text-red-500/80">Encerrar sessão</p>
                          </div>
                        </button>
                      </div>
                      <div className="absolute -bottom-1 right-6 h-4 w-4 rotate-45 border-b border-r border-[#E8E2DA] bg-white" aria-hidden />
                    </div>
                  )}
                </div>
              )}
            </div>
          </header>

          <main className="flex-1 min-w-0 overflow-y-auto px-4 pt-4 pb-20 sm:px-6 sm:py-6">
            {activeView === 'dashboard' && <Dashboard refreshCallbackRef={refreshCallbackRef} />}
            {activeView === 'patients' && <Patients refreshCallbackRef={refreshCallbackRef} />}
            {activeView === 'doctors' && userRole !== 'RECEPCAO' && <Doctors refreshCallbackRef={refreshCallbackRef} />}
            {activeView === 'appointments' && (
              <Appointments canControlTimers={userRole === 'MEDICO'} refreshCallbackRef={refreshCallbackRef} />
            )}
            {activeView === 'calendar' && <Calendar refreshCallbackRef={refreshCallbackRef} />}
          </main>
        </div>

        {/* Overlay behind mobile menu */}
        {/* overlay - fades in/out */}
        <div
          onClick={() => setMobileMenuOpen(false)}
          className={`fixed inset-0 z-40 sm:hidden transition-opacity duration-200 ${mobileMenuOpen ? 'opacity-100 bg-black/30 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        />

        {userRole === 'ADMINISTRACAO' && (
          <UserManagementDialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen} />
        )}
        {userRole === 'ADMINISTRACAO' && (
          <Dialog open={isVideoDialogOpen} onOpenChange={setIsVideoDialogOpen}>
            <DialogContent className="w-full max-w-5xl rounded-[32px] border border-[#E8E2DA] bg-[#F8F6F1] text-[#2F2F2F]">
              <DialogHeader className="pb-2">
                <DialogTitle className="text-2xl font-semibold text-[#4A4A4A]">
                  Biblioteca de vídeos
                </DialogTitle>
              </DialogHeader>
              <div className="max-h-[78vh] overflow-y-auto pr-1">
                <VideosPanel />
              </div>
            </DialogContent>
          </Dialog>
        )}
        {userRole === 'ADMINISTRACAO' && (
          <Dialog open={isComplianceDialogOpen} onOpenChange={setIsComplianceDialogOpen}>
            <DialogContent className="sm:w-[94vw] sm:max-w-[1100px] rounded-[28px] border border-[#E8E2DA] bg-[#F8F6F1] text-[#2F2F2F] [&>button]:absolute [&>button]:right-4 [&>button]:top-4 [&>button]:z-20">
              <DialogHeader className="pb-2">
                <DialogTitle className="text-2xl font-semibold text-[#4A4A4A]">
                  Central de Conformidade
                </DialogTitle>
              </DialogHeader>
              <div className="max-h-[80vh] overflow-y-auto pr-1">
                <CompliancePanel />
              </div>
            </DialogContent>
          </Dialog>
        )}
        {userRole === 'ADMINISTRACAO' && (
          <Dialog open={isResponsaveisDialogOpen} onOpenChange={setIsResponsaveisDialogOpen}>
            <DialogContent className="sm:w-[94vw] sm:max-w-[1100px] rounded-[28px] border border-[#E8E2DA] bg-[#F8F6F1] text-[#2F2F2F] [&>button]:absolute [&>button]:right-4 [&>button]:top-4 [&>button]:z-20">
              <DialogHeader className="pb-2">
                <DialogTitle className="text-2xl font-semibold text-[#4A4A4A]">
                  Responsáveis da Operação
                </DialogTitle>
              </DialogHeader>
              <div className="max-h-[80vh] overflow-y-auto pr-1">
                <ResponsaveisPanel />
              </div>
            </DialogContent>
          </Dialog>
        )}
        {userRole === 'ADMINISTRACAO' && (
          <SupervisorPasswordDialog
            open={sitefAuthOpen}
            onOpenChange={(open) => {
              setSitefAuthOpen(open);
              if (!open) {
                setSitefAuthBusy(false);
              }
            }}
            busy={sitefAuthBusy || sitefServiceBusy}
            actionLabel={'ligar e validar serviço SiTef'}
            onConfirm={async (password) => {
              setSitefAuthBusy(true);
              try {
                await verifySessionPassword(password);
                await ensureSitefRunning(password);
              } finally {
                setSitefAuthBusy(false);
              }
            }}
          />
        )}

      </div>
    </div>
  );
}


