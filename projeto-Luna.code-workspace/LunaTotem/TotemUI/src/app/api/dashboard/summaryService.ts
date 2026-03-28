import { readAppointments } from '../appointments/appointmentStore';
import { readPatients } from '../patients/patientStore';

export type DashboardSummary = {
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
    paid: boolean;
    amount: number;
  }>;
  fullDetail?: {
    pendingAppointments: number;
    dailyRevenueForecast: number;
  };
};

export async function buildDashboardSummary(full = false): Promise<DashboardSummary> {
  const [appointments, patients] = await Promise.all([readAppointments(), readPatients()]);

  const scheduledCount = appointments.filter((appt) => {
    const s = String(appt.status ?? '').toLowerCase();
    return s !== 'cancelada' && s !== 'cancelado' && s !== 'canceled' && s !== 'cancelled';
  }).length;
  const receivables = appointments
    .filter((appt) => !appt.paid)
    .reduce((total, appt) => total + (appt.amount ?? 0), 0);
  const activePatients = patients.length;
  const capacity = scheduledCount;
  const freeSlots = Math.max(capacity - scheduledCount, 0);

  const recentAppointments = [...appointments]
    .sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`))
    .slice(0, 5)
    .map((appt) => ({
      id: appt.id ?? '',
      patient: appt.patient,
      doctor: appt.doctor,
      date: appt.date ?? '',
      time: appt.time ?? '',
      status: appt.status,
      paid: Boolean(appt.paid),
      amount: Number(appt.amount ?? 0),
    }));

  const summary: DashboardSummary = {
    scheduledCount,
    activePatients,
    receivables,
    freeSlots,
    recentAppointments,
  };

  if (full) {
    summary.fullDetail = {
      pendingAppointments: appointments.filter((appt) => appt.status === 'pending' || appt.status === 'scheduled').length,
      dailyRevenueForecast: receivables,
    };
  }

  return summary;
}
