import { Users, Calendar, Clock, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import ResponsiveTable from '@/components/ui/responsive-table';
import { useEffect, useState, useRef, useCallback, RefObject } from 'react';
import { API_ENDPOINTS, authRole, normalizeRole } from '@/lib/apiConfig';
import { getStatusBadgeClasses, getStatusLabel } from '@/lib/status';
import { appointmentAPI } from '@/lib/api';
import { toast } from 'sonner';

type Role = 'ADMINISTRACAO' | 'MEDICO' | 'RECEPCAO';

const isValidRole = (value: string | null | undefined): value is Role =>
  value === 'ADMINISTRACAO' || value === 'MEDICO' || value === 'RECEPCAO';

interface DashboardSummary {
  scheduledCount: number;
  activePatients: number;
  receivables: number;
  freeSlots: number;
  recentAppointments: Array<{
    id: string;
    patient: string;
    doctor: string;
    date: string;
    time: string;
    status: string;
    paid?: boolean;
    amount?: number;
  }>;
}

const statusOptions = ['aguardando', 'confirmado', 'em-atendimento', 'cancelado'];

type DashboardProps = {
  refreshCallbackRef?: RefObject<(() => void) | null>;
};

export function Dashboard({ refreshCallbackRef }: DashboardProps) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastGoodSummaryRef = useRef<DashboardSummary | null>(null);
  const lastErrorToastAtRef = useRef<number>(0);
  const normalizedAuthRole = normalizeRole(authRole);
  const [userRole, setUserRole] = useState<Role | null>(
    isValidRole(normalizedAuthRole) ? (normalizedAuthRole as Role) : null
  );
  const [updatingAppointmentId, setUpdatingAppointmentId] = useState<string | null>(null);
  const [updatingPaidId, setUpdatingPaidId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedRole = normalizeRole(window.localStorage.getItem('lv_role'));
    if (isValidRole(storedRole)) {
      setUserRole(storedRole);
    }
  }, []);

  const fetchSummary = useCallback(async () => {
    if (userRole !== 'ADMINISTRACAO') {
      setSummary(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const roleForRequest = userRole ?? 'ADMINISTRACAO';
    const remoteEndpoint =
      roleForRequest === 'ADMINISTRACAO'
        ? API_ENDPOINTS.dashboardSummaryFull
        : API_ENDPOINTS.dashboardSummary;
    const localEndpoint =
      roleForRequest === 'ADMINISTRACAO'
        ? '/api/dashboard/summary/full'
        : '/api/dashboard/summary';

    const headers = {
      'Content-Type': 'application/json',
      ...(typeof window !== 'undefined' && localStorage.getItem('lv_token')
        ? { Authorization: `Bearer ${localStorage.getItem('lv_token')}` }
        : {}),
    };

    const request = async (url: string) => {
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error(res.statusText || 'Erro ao carregar resumo');
      return res.json();
    };

    try {
      const data = await request(remoteEndpoint);
      setSummary(data);
      lastGoodSummaryRef.current = data;
      setLastUpdated(new Date());
    } catch (remoteError) {
      console.warn('Dashboard summary falling back to local data', remoteError);
      try {
        const data = await request(localEndpoint);
        setSummary(data);
        lastGoodSummaryRef.current = data;
        setLastUpdated(new Date());
      } catch (fallbackError) {
        console.error('Error loading dashboard:', fallbackError);
        // Keep last known good data to avoid the dashboard randomly going blank on transient failures.
        setSummary((prev) => prev ?? lastGoodSummaryRef.current);
        const now = Date.now();
        if (now - lastErrorToastAtRef.current > 60_000) {
          lastErrorToastAtRef.current = now;
          toast.error('Falha ao atualizar o dashboard. Exibindo os últimos dados carregados.');
        }
      }
    } finally {
      setLoading(false);
    }
  }, [userRole]);

  // Register refresh callback
  useEffect(() => {
    if (refreshCallbackRef) {
      refreshCallbackRef.current = fetchSummary;
    }
  }, [refreshCallbackRef, fetchSummary]);

  // Initial load + polling every 60s
  useEffect(() => {
    fetchSummary();
    if (userRole === 'RECEPCAO') {
      return;
    }
    intervalRef.current = setInterval(fetchSummary, 60000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchSummary, userRole]);

  // Production: no real metrics yet, use placeholders so the layout never looks empty.
  const formatCurrency = (amount?: number | null) => {
    if (typeof amount !== 'number' || Number.isNaN(amount)) {
      return 'R$ 0,00';
    }
    return `R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const stats: Array<{
    label: string;
    value?: string;
    change?: string;
    trend?: 'up' | 'down';
    icon?: any;
    color?: string;
  }> = summary ? [
    {
      label: 'Consultas agendadas',
      value: String(summary.scheduledCount),
      change: 'Dados atualizados',
      icon: Calendar,
      color: '#D3A67F',
    },
    {
      label: 'Pacientes ativos',
      value: String(summary.activePatients),
      change: 'Dados atualizados',
      icon: Users,
      color: '#CDDCDC',
    },
    {
      label: 'Horários livres',
      value: String(summary.freeSlots),
      change: 'Dados atualizados',
      icon: Clock,
      color: '#CDB0AD',
    },
    {
      label: 'Recebimentos previstos',
      value: formatCurrency(summary.receivables),
      change: 'Dados atualizados',
      icon: DollarSign,
      color: '#4A4A4A',
    },
  ].filter(stat => stat.label !== 'Recebimentos previstos' || (summary && summary.receivables !== null && summary.receivables !== undefined)) : [];

  const placeholderStats: Array<{
    label: string;
    value: string;
    change: string;
    trend?: 'up' | 'down';
    icon: typeof Calendar;
    color: string;
  }> = [
    {
      label: 'Consultas agendadas',
      value: '0',
      change: 'Sem dados disponíveis',
      icon: Calendar,
      color: '#D3A67F',
    },
    {
      label: 'Pacientes ativos',
      value: '0',
      change: 'Sem dados disponíveis',
      icon: Users,
      color: '#CDDCDC',
    },
    {
      label: 'Horários livres',
      value: '0',
      change: 'Sem dados disponíveis',
      icon: Clock,
      color: '#CDB0AD',
    },
    {
      label: 'Recebimentos previstos',
      value: 'R$ 0,00',
      change: 'Sem dados disponíveis',
      icon: DollarSign,
      color: '#4A4A4A',
    },
  ];
  const hasStats = stats.length > 0;
  const statsToRender = hasStats ? stats : placeholderStats;

  // Default: empty — real appointments should be loaded from API in production
  const recentAppointments = summary?.recentAppointments || [];

  const formatDate = (date: string) => {
    const parts = date?.split('-');
    if (parts && parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return date || '-';
  };

  const getStatusColor = (status: string) => getStatusBadgeClasses(status);

  const renderPaidBadge = (paid: any, appointmentId?: string) => {
    const isPaid = Boolean(paid);
    const label = isPaid ? 'Pago' : 'Não pago';
    const classes = isPaid
      ? 'bg-green-100 text-green-800 border border-green-200'
      : 'bg-amber-100 text-amber-800 border border-amber-200';

    if (!appointmentId || userRole !== 'ADMINISTRACAO') {
      return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${classes}`}>{label}</span>;
    }

    return (
      <button
        onClick={() => handlePaidToggle(appointmentId, isPaid)}
        disabled={updatingPaidId === appointmentId}
        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold cursor-pointer hover:scale-105 hover:shadow-md transition-all disabled:opacity-50 ${classes}`}
        title="Clique para alternar pago/não pago"
      >
        {updatingPaidId === appointmentId ? '...' : label}
      </button>
    );
  };

  const handlePaidToggle = async (appointmentId: string, currentlyPaid: boolean) => {
    const nextPaid = !currentlyPaid;
    setUpdatingPaidId(appointmentId);
    try {
      await appointmentAPI.updatePaid(appointmentId, nextPaid);
      setSummary((prev) =>
        prev
          ? {
              ...prev,
              recentAppointments: prev.recentAppointments.map((apt) =>
                apt.id === appointmentId ? { ...apt, paid: nextPaid } : apt
              ),
            }
          : null
      );
      toast.success(nextPaid ? 'Marcado como pago' : 'Marcado como não pago');
    } catch (error) {
      console.error('Erro ao atualizar pagamento:', error);
      toast.error('Erro ao atualizar pagamento');
    } finally {
      setUpdatingPaidId(null);
    }
  };

  const handleStatusChange = async (appointmentId: string, currentStatus: string) => {
    const currentIndex = statusOptions.indexOf(currentStatus);
    const nextIndex = (currentIndex + 1) % statusOptions.length;
    const nextStatus = statusOptions[nextIndex];
    
    setUpdatingAppointmentId(appointmentId);
    try {
      await appointmentAPI.updateStatus(appointmentId, nextStatus);
      setSummary((prev) =>
        prev
          ? {
              ...prev,
              recentAppointments: prev.recentAppointments.map((apt) =>
                apt.id === appointmentId ? { ...apt, status: nextStatus } : apt
              ),
            }
          : null
      );
      toast.success(`Status atualizado para ${nextStatus}`);
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status');
    } finally {
      setUpdatingAppointmentId(null);
    }
  };

  const isFallback = !hasStats;
  const hideStats = userRole !== 'ADMINISTRACAO';

  return (
    <div className="space-y-6">
      {!hideStats ? (
        <>
          {/* Stats Grid */}
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-gray-500">
              {lastUpdated && !loading && (
                <span>Atualizado em {lastUpdated.toLocaleTimeString('pt-BR')}</span>
              )}
              {loading && <span>Atualizando...</span>}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statsToRender.map((stat, index) => {
              const Icon = stat.icon;
              const TrendIcon = stat.trend === 'up' ? TrendingUp : TrendingDown;
              return (
                <div key={`${stat.label}-${index}`} className="bg-white rounded-lg p-6 border border-gray-100">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-gray-500 text-sm">{stat.label}</p>
                      <p className="mt-2 text-gray-800 text-3xl font-semibold">
                        {stat.value ?? (isFallback ? '0,00' : '-')}
                      </p>
                      {stat.trend ? (
                        <div className="flex items-center gap-1 mt-2">
                          <TrendIcon
                            size={16}
                            className={stat.trend === 'up' ? 'text-green-500' : 'text-red-500'}
                          />
                          <span
                            className={`text-sm ${stat.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}
                          >
                            {stat.change}
                          </span>
                        </div>
                      ) : (
                        stat.change && (
                          <p className="text-sm text-gray-500 mt-2">{stat.change}</p>
                        )
                      )}
                    </div>
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: (stat.color ?? '#000') + '20' }}
                    >
                      {Icon && <Icon size={24} style={{ color: stat.color }} />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : null}

      {/* Recent Appointments */}
      <div className="bg-white rounded-lg border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-gray-800">Consultas Recentes</h2>
        </div>
        <div className="p-4 md:p-0">
          {loading ? (
            <div className="p-6 text-center text-gray-500">Carregando...</div>
          ) : recentAppointments.length === 0 ? (
            <div className="p-6 text-center text-gray-500">Nenhum registro</div>
          ) : (
            <ResponsiveTable
              data={recentAppointments}
              rowKey={(r) => r.id}
              columns={[
                { key: 'patient', header: 'Paciente', cell: (a) => <span className="text-gray-800">{a.patient}</span> },
                { key: 'doctor', header: 'Médico', cell: (a) => <span className="text-gray-600">{a.doctor}</span> },
                { key: 'date', header: 'Data', cell: (a) => <span className="text-gray-600">{formatDate(a.date)}</span> },
                { key: 'time', header: 'Horário', cell: (a) => <span className="text-gray-600">{a.time}</span> },
                { key: 'paid', header: 'Pagamento', cell: (a) => renderPaidBadge((a as any).paid, a.id) },
                { key: 'status', header: 'Status', cell: (a) => (
                  <button
                    onClick={() => handleStatusChange(a.id, a.status)}
                    disabled={updatingAppointmentId === a.id}
                    className={`px-3 py-1 rounded-full text-sm cursor-pointer hover:scale-105 hover:shadow-md transition-all disabled:opacity-50 ${getStatusColor(a.status)}`}
                    title="Clique para alternar status"
                  >
                    {updatingAppointmentId === a.id ? '...' : getStatusLabel(a.status)}
                  </button>
                ) },
              ]}
              cardRenderer={(appointment) => (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-800">{appointment.patient}</div>
                    <div className="text-xs text-gray-500">{appointment.doctor}</div>
                    <div className="mt-2">{renderPaidBadge((appointment as any).paid, appointment.id)}</div>
                  </div>
                  <div className="text-xs text-gray-500 text-right">
                    <div>{formatDate(appointment.date)}</div>
                    <div>{appointment.time}</div>
                    <div className="mt-1">
                      <button
                        onClick={() => handleStatusChange(appointment.id, appointment.status)}
                        disabled={updatingAppointmentId === appointment.id}
                        className={`px-2 py-0.5 rounded-full text-xs cursor-pointer hover:scale-105 hover:shadow-md transition-all disabled:opacity-50 ${getStatusColor(appointment.status)}`}
                        title="Clique para alternar status"
                      >
                        {updatingAppointmentId === appointment.id ? '...' : getStatusLabel(appointment.status)}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            />
          )}
        </div>
      </div>
    </div>
  );
}
