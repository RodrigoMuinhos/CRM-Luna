import { FormEvent, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Appointment, Doctor, Patient, appointmentAPI, doctorAPI, patientAPI } from '@/lib/api';
import { maskCPF, stripCPF, validateCPF } from '@/lib/cpf';
import { onPaymentConfirmed } from '../../bridge/paymentBridge';
import { getLatestPhotoBlob } from '../../bridge/photoBridge';
import { API_ENDPOINTS } from '@/lib/apiConfig';
import { getAppointmentCreditInstallments, setAppointmentCreditInstallments } from '@/lib/creditInstallmentsConfig';

const formatDate = (value?: string) => {
  if (!value) return '-';
  const iso = typeof value === 'string' ? value : String(value);
  const dateOnly = iso.length >= 10 ? iso.slice(0, 10) : iso;
  const [y, m, d] = dateOnly.split('-');
  if (y && m && d) return `${d}/${m}/${y}`;
  try {
    return new Date(value).toLocaleDateString('pt-BR');
  } catch {
    return value;
  }
};

const toDateOnlyISO = (value?: string) => {
  if (!value) return '';
  try {
    return new Date(value).toISOString().slice(0, 10);
  } catch {
    return value.slice(0, 10);
  }
};

const getStatusColor = (status: string) => {
  const s = (status || '').toString().toLowerCase().replace(/\s+/g, '-');
  if (s === 'confirmado' || s === 'confirmed' || s === 'confirmada') return 'bg-[#CDDCDC] text-gray-700';
  if (s === 'em-atendimento' || s === 'em_atendimento' || s === 'in_service' || s === 'in-service') return 'bg-[#D3A67F] text-white';
  if (s === 'aguardando' || s === 'agendado' || s === 'scheduled' || s === 'agendado(a)') return 'bg-[#ECEDDE] text-gray-600';
  if (s === 'cancelado' || s === 'canceled' || s === 'cancelada') return 'bg-[#CDB0AD] text-gray-700';
  return 'bg-gray-100 text-gray-600';
};

const formatCurrency = (value?: number) => {
  const safeValue = typeof value === 'number' && !Number.isNaN(value) ? value : 0;
  return safeValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatCurrencyInput = (value: string) => {
  const cleaned = value.replace(/[^\d,]/g, '');
  if (!cleaned) return '';
  const parts = cleaned.split(',');
  const integerPart = parts[0] ? parts[0].replace(/^0+(?=\d)/, '') || '0' : '0';
  const decimals = parts[1]?.slice(0, 2);
  return decimals ? `${integerPart},${decimals}` : `${integerPart},00`;
};

const parseCurrencyInput = (value: string) => {
  const normalized = value.replace(/\./g, '').replace(',', '.');
  const num = Number(normalized);
  return Number.isNaN(num) ? 0 : num;
};

const snapTimeToFiveMinutes = (value: string) => {
  const match = /^(\d{1,2}):(\d{2})/.exec(value);
  if (!match) return value;
  const hours = Math.min(23, Math.max(0, Number(match[1])));
  const minutes = Math.floor(Math.min(59, Math.max(0, Number(match[2]))) / 5) * 5;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}`;
};

const buildEmptyAppointment = (today: string) => ({
  time: '',
  date: today,
  patient: '',
  patientEmail: '',
  patientId: '',
  doctor: '',
  specialty: '',
  type: '',
  value: '',
  cpf: '',
  doctorId: '',
  creditInstallments: '1',
});

type TimerState = Record<string, { running: boolean; startAt: number | null; elapsedMs: number }>;

export function useAppointmentsState() {
  const today = new Date().toISOString().slice(0, 10);

  const [filterStatus, setFilterStatus] = useState('todos');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [detailAppointment, setDetailAppointment] = useState<Appointment | null>(null);
  const [expandedAppointmentId, setExpandedAppointmentId] = useState<string | null>(null);
  const [newAppointment, setNewAppointment] = useState(buildEmptyAppointment(today));
  const [patientList, setPatientList] = useState<Patient[]>([]);
  const [doctorList, setDoctorList] = useState<Doctor[]>([]);
  const [patientSuggestions, setPatientSuggestions] = useState<Patient[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null);
  const [filterPatient, setFilterPatient] = useState('');
  const [filterDoctor, setFilterDoctor] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState(today);
  const [filterDateTo, setFilterDateTo] = useState(today);
  const [timers, setTimers] = useState<TimerState>({});
  const [now, setNow] = useState(Date.now());
  
  // Success modal state
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [savedAppointmentData, setSavedAppointmentData] = useState<{
    id: string;
    patientEmail: string;
    patientName: string;
    doctorEmail?: string;
  } | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const filteredAppointments = appointments
    .filter((apt) => (filterStatus === 'todos' ? true : apt.status === filterStatus))
    .filter((apt) => {
      const p = filterPatient.trim().toLowerCase();
      if (!p) return true;
      const cpf = (apt.cpf || '').toLowerCase();
      const name = (apt.patient || '').toLowerCase();
      return name.includes(p) || cpf.includes(p.replace(/\D/g, ''));
    })
    .filter((apt) => {
      const d = filterDoctor.trim().toLowerCase();
      if (!d) return true;
      const name = (apt.doctor || '').toLowerCase();
      const spec = (apt.specialty || '').toLowerCase();
      return name.includes(d) || spec.includes(d);
    })
    .filter((apt) => {
      const dateOnly = toDateOnlyISO(apt.date);
      const fromOk = filterDateFrom ? dateOnly >= filterDateFrom : true;
      const toOk = filterDateTo ? dateOnly <= filterDateTo : true;
      return fromOk && toOk;
    });

  const paymentSummary = useMemo(() => {
    const totalValue = appointments.reduce((sum, apt) => sum + apt.amount, 0);
    const paidValue = appointments.reduce((sum, apt) => (apt.paid ? sum + apt.amount : sum), 0);
    const paidPercent = totalValue === 0 ? 0 : Math.round((paidValue / totalValue) * 100);
    return { totalValue, paidValue, paidPercent };
  }, [appointments]);

  useEffect(() => {
    const unsubscribe = onPaymentConfirmed(async (payload) => {
      let targetId: string | undefined;
      setAppointments((prev) =>
        prev.map((apt) => {
          if (apt.cpf === payload.cpf) {
            targetId = apt.id ?? targetId;
            return { ...apt, paid: true, status: 'confirmado' };
          }
          return apt;
        })
      );
      try {
        if (targetId) {
          const blob = await appointmentAPI.downloadReportBlob(targetId);
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `relatorio-${targetId}.pdf`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
        }
      } catch {}
    });
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;
    const loadPatients = async () => {
      try {
        const data = await patientAPI.getAll();
        if (active) {
          setPatientList(data);
          setLoadingPatients(false);
        }
      } catch (error) {
        toast.error('Não foi possível carregar os pacientes.');
      }
    };
    const loadDoctors = async () => {
      try {
        const data = await doctorAPI.getAll();
        if (active) {
          setDoctorList(data);
          setLoadingDoctors(false);
        }
      } catch (error) {
        toast.error('Não foi possível carregar os médicos.');
      }
    };
    const loadAppointments = async () => {
      try {
        const data = await appointmentAPI.getAll();
        if (active) {
          setAppointments(data);
          setLoadingAppointments(false);
        }
      } catch (error) {
        toast.error('Não foi possível carregar consultas.');
      }
    };
    loadPatients();
    loadDoctors();
    loadAppointments();
    return () => {
      active = false;
    };
  }, []);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => {
    setIsModalOpen(false);
    setPatientSuggestions([]);
    setNewAppointment(buildEmptyAppointment(today));
    setEditingAppointmentId(null);
  };

  const openDetails = (appointment: Appointment) => setDetailAppointment(appointment);
  const closeDetails = () => setDetailAppointment(null);

  const handleEditAppointment = (appointment: Appointment) => {
    setNewAppointment({
      time: appointment.time,
      date: appointment.date,
      patient: appointment.patient,
      patientEmail: appointment.patientEmail ?? '',
      patientId: appointment.patientId ?? '',
      doctor: appointment.doctor,
      specialty: appointment.specialty,
      type: appointment.type,
      value: appointment.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      cpf: maskCPF(appointment.cpf),
      doctorId: '',
      creditInstallments: String(getAppointmentCreditInstallments(appointment.id) ?? 1),
    });
    setEditingAppointmentId(appointment.id ?? null);
    setIsModalOpen(true);
    closeDetails();
  };

  const reloadAppointments = async () => {
    try {
      setLoadingAppointments(true);
      const data = await appointmentAPI.getAll();
      setAppointments(data);
      toast.success('Consultas atualizadas');
    } catch (error) {
      console.error('Erro ao atualizar consultas:', error);
      toast.error('Erro ao atualizar consultas');
    } finally {
      setLoadingAppointments(false);
    }
  };

  const handleDeleteAppointment = async (appointmentId?: string) => {
    if (!appointmentId) return;
    const confirmed = window.confirm('Deseja realmente remover esta consulta?');
    if (!confirmed) return;
    try {
      await appointmentAPI.delete(appointmentId);
      setAppointments((prev) => prev.filter((apt) => apt.id !== appointmentId));
      if (detailAppointment?.id === appointmentId) {
        closeDetails();
      }
      toast.success('Consulta removida.');
    } catch (error) {
      toast.error('Não foi possível remover a consulta.');
    }
  };

  const handleUpdateAppointmentStatus = async (appointmentId: string, newStatus: string) => {
    try {
      await appointmentAPI.updateStatus(appointmentId, newStatus);
      setAppointments((prev) =>
        prev.map((apt) =>
          apt.id === appointmentId ? { ...apt, status: newStatus } : apt
        )
      );
      setDetailAppointment((prev) =>
        prev && prev.id === appointmentId ? { ...prev, status: newStatus } : prev
      );
      toast.success('Status atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  const handleNewAppointmentChange = (field: string, value: string) => {
    const nextValue = field === 'time' ? snapTimeToFiveMinutes(value) : value;
    setNewAppointment((prev) => ({
      ...prev,
      [field]: nextValue,
      ...(field === 'patient' ? { patientId: '', patientEmail: '' } : {}),
      ...(field === 'doctor' ? { specialty: '' } : {}),
    }));
    if (field === 'patient') {
      const query = value.trim().toLowerCase();
      setPatientSuggestions(
        query
          ? patientList.filter((p) => p.name.toLowerCase().startsWith(query)).slice(0, 6)
          : []
      );
    }
  };

  const selectPatient = (patient: Patient) => {
    setNewAppointment((prev) => ({
      ...prev,
      patient: patient.name,
      patientEmail: patient.email ?? '',
      patientId: patient.id ?? '',
      cpf: maskCPF(patient.cpf),
    }));
    setPatientSuggestions([]);
  };

  const findDoctorEmail = (doctorName: string) => doctorList.find((d) => d.name === doctorName)?.email;

  const sendEmailNotifications = async (appointmentId: string, patientEmail?: string, doctorEmail?: string) => {
    if (!appointmentId) return;
    // Não engolir o erro - deixar propagar para quem chamou
    await appointmentAPI.notify(appointmentId, {
      patientEmail: patientEmail || undefined,
      doctorEmail: doctorEmail || undefined,
    });
  };

  const handleNewAppointmentSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newAppointment.patient || !newAppointment.doctor) {
      toast.error('Preencha os campos obrigatórios.');
      return;
    }

    const cleanedCpf = stripCPF(newAppointment.cpf);
    if (!cleanedCpf) {
      toast.error('Informe um CPF válido.');
      return;
    }
    if (!validateCPF(cleanedCpf)) {
      toast.error('CPF inválido.');
      return;
    }

    const matchedPatient = patientList.find(
      (patient) => stripCPF(patient.cpf) === cleanedCpf
    );
    const resolvedPatientEmail = (newAppointment.patientEmail || matchedPatient?.email || '').trim();
    const resolvedPatientId = newAppointment.patientId || matchedPatient?.id || '';
    const resolvedPatientName = newAppointment.patient || matchedPatient?.name || '';

    setIsModalOpen(false);
    const payload = {
      patient: resolvedPatientName,
      patientId: resolvedPatientId,
      patientEmail: resolvedPatientEmail,
      doctor: newAppointment.doctor,
      specialty: newAppointment.specialty || '',
      date: newAppointment.date,
      time: newAppointment.time || '10:00',
      type: newAppointment.type,
      amount: parseCurrencyInput(newAppointment.value),
      cpf: cleanedCpf,
      status: 'aguardando' as const,
      paid: false,
    };
    const creditInstallments = Math.max(1, Math.min(12, Math.trunc(Number(newAppointment.creditInstallments || '1'))));

    try {
      if (editingAppointmentId) {
        const updated = await appointmentAPI.update(editingAppointmentId, payload);
        if (updated.id) {
          setAppointmentCreditInstallments(updated.id, creditInstallments);
        }
        setAppointments((prev) => prev.map((apt) => (apt.id === updated.id ? updated : apt)));
        
        // Enviar email apenas para o médico
        const doctorEmail = findDoctorEmail(payload.doctor);
        if (doctorEmail && updated.id) {
          try {
            await sendEmailNotifications(updated.id, '', doctorEmail);
          } catch (emailError) {
            console.error('Erro ao enviar email para o médico:', emailError);
          }
        }
        
        toast.success('Consulta atualizada com sucesso.');
        setSavedAppointmentData({
          id: updated.id ?? '',
          patientEmail: '',
          patientName: payload.patient,
          doctorEmail: doctorEmail,
        });
        setSuccessModalOpen(true);
      } else {
        const saved = await appointmentAPI.create(payload);
        if (saved.id) {
          setAppointmentCreditInstallments(saved.id, creditInstallments);
        }
        setAppointments((prev) => [...prev, saved]);
        
        // Enviar email apenas para o médico
        const doctorEmail = findDoctorEmail(payload.doctor);
        if (doctorEmail && saved.id) {
          try {
            await sendEmailNotifications(saved.id, '', doctorEmail);
          } catch (emailError) {
            console.error('Erro ao enviar email para o médico:', emailError);
          }
        }
        
        setSavedAppointmentData({
          id: saved.id ?? '',
          patientEmail: '',
          patientName: payload.patient,
          doctorEmail: doctorEmail,
        });
        setSuccessModalOpen(true);
      }
      closeModal();
    } catch (error) {
      toast.error('Não foi possível salvar a consulta.');
    }
  };

  const closeSuccessModal = () => {
    setSuccessModalOpen(false);
    setSavedAppointmentData(null);
  };

  const handleSendEmailFromModal = async () => {
    // Função removida - email não é mais enviado para o paciente
    closeSuccessModal();
  };

  const toggleAppointmentExpansion = (appointmentId: string) => {
    setExpandedAppointmentId((prev) => (prev === appointmentId ? null : appointmentId));
  };

  useEffect(() => {
    const hasRunning = Object.values(timers).some((t) => t.running);
    if (!hasRunning) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [timers]);

  const getElapsedMs = (appointmentId: string) => {
    const timer = timers[appointmentId];
    if (!timer) return 0;
    const runningBonus = timer.running && timer.startAt ? now - timer.startAt : 0;
    return timer.elapsedMs + runningBonus;
  };

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return hours > 0 ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
  };

  const toggleTimer = async (appointment: Appointment) => {
    const appointmentId = appointment.id;
    if (!appointmentId) return;

    let becameRunning = false;
    let elapsedOnStop = 0;

    setTimers((prev) => {
      const current = prev[appointmentId];
      if (current?.running) {
        const elapsed = getElapsedMs(appointmentId);
        elapsedOnStop = elapsed;
        return { ...prev, [appointmentId]: { running: false, startAt: null, elapsedMs: elapsed } };
      }
      becameRunning = true;
      return { ...prev, [appointmentId]: { running: true, startAt: Date.now(), elapsedMs: current?.elapsedMs ?? 0 } };
    });

    setAppointments((prev) =>
      prev.map((apt) => (apt.id === appointmentId ? { ...apt, status: becameRunning ? 'em-atendimento' : 'confirmado' } : apt))
    );

    if (!becameRunning) {
      toast.success(`Consulta encerrada (${formatDuration(elapsedOnStop)})`);
      return;
    }

    try {
      const blob = await getLatestPhotoBlob();
      if (blob) {
        await appointmentAPI.uploadPhoto(appointmentId, blob);
        setAppointments((prev) =>
          prev.map((a) => (a.id === appointmentId ? { ...a, photoUrl: `${API_ENDPOINTS.appointmentPhoto(appointmentId)}` } : a))
        );
        toast.success('Foto anexada automaticamente.');
      }
    } catch {
      toast.error('Não foi possível anexar a foto.');
    }
  };

  return {
    // helpers
    formatDate,
    getStatusColor,
    formatCurrency,
    formatCurrencyInput,
    formatDuration,
    getElapsedMs,

    // state
    today,
    filterStatus,
    setFilterStatus,
    filterPatient,
    setFilterPatient,
    filterDoctor,
    setFilterDoctor,
    filterDateFrom,
    setFilterDateFrom,
    filterDateTo,
    setFilterDateTo,
    appointments,
    filteredAppointments,
    paymentSummary,
    loadingAppointments,
    loadingDoctors,
    loadingPatients,

    // cards
    expandedAppointmentId,
    toggleAppointmentExpansion,
    toggleTimer,
    timers,

    // details
    detailAppointment,
    openDetails,
    closeDetails,

    // form/modal
    isModalOpen,
    openModal,
    closeModal,
    newAppointment,
    handleNewAppointmentChange,
    handleNewAppointmentSubmit,
    handleEditAppointment,
    reloadAppointments,
    handleUpdateAppointmentStatus,
    handleDeleteAppointment,
    selectPatient,
    patientSuggestions,
    doctorList,

    // success modal
    successModalOpen,
    savedAppointmentData,
    isSendingEmail,
    closeSuccessModal,
    handleSendEmailFromModal,
  };
}
