'use client';

import { useEffect, useMemo, useState } from 'react';
import { appointmentAPI, doctorAPI, patientAPI, Appointment, Doctor, Patient } from '@/lib/api';
import { maskCPF, stripCPF, validateCPF } from '@/lib/cpf';
import { toast } from 'sonner';

export type CalendarAppointment = {
  id: string;
  date: string;
  time: string;
  patient: string;
  doctor: string;
  type: string;
  status: string;
  paid: boolean;
  amount: number;
  cpf: string;
};

export function useCalendarState() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<CalendarAppointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewAppointmentForm, setShowNewAppointmentForm] = useState(false);
  const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null);

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [patientSuggestions, setPatientSuggestions] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [newAppointment, setNewAppointment] = useState({
    date: '',
    time: '',
    doctor: '',
    specialty: '',
    type: 'Consulta',
    amount: '',
    cpf: '',
    patientEmail: '',
  });

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      try {
        const [appointmentsData, doctorsData, patientsData] = await Promise.all([
          appointmentAPI.getAll(),
          doctorAPI.getAll(),
          patientAPI.getAll(),
        ]);
        if (!active) return;

        const mapped = appointmentsData.map((apt: Appointment) => ({
          id: apt.id ?? '',
          date: apt.date,
          time: apt.time,
          patient: apt.patient,
          doctor: apt.doctor,
          type: apt.type ?? 'Consulta',
          status: apt.status ?? 'aguardando',
          paid: apt.paid ?? false,
          amount: apt.amount ?? 0,
          cpf: apt.cpf ?? '',
        }));

        setAppointments(mapped);
        setDoctors(doctorsData);
        setPatients(patientsData);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        toast.error('Erro ao carregar agendamentos');
      } finally {
        if (active) setIsLoading(false);
      }
    };
    loadData();
    return () => {
      active = false;
    };
  }, []);

  const reloadAppointments = async () => {
    setIsLoading(true);
    try {
      const [appointmentsData, doctorsData, patientsData] = await Promise.all([
        appointmentAPI.getAll(),
        doctorAPI.getAll(),
        patientAPI.getAll(),
      ]);

      const mapped = appointmentsData.map((apt: Appointment) => ({
        id: apt.id ?? '',
        date: apt.date,
        time: apt.time,
        patient: apt.patient,
        doctor: apt.doctor,
        type: apt.type ?? 'Consulta',
        status: apt.status ?? 'aguardando',
        paid: apt.paid ?? false,
        amount: apt.amount ?? 0,
        cpf: apt.cpf ?? '',
      }));

      setAppointments(mapped);
      setDoctors(doctorsData);
      setPatients(patientsData);
      toast.success('Agendamentos atualizados');
    } catch (error) {
      console.error('Erro ao atualizar agendamentos:', error);
      toast.error('Erro ao atualizar agendamentos');
    } finally {
      setIsLoading(false);
    }
  };

  const monthNames = useMemo(
    () => [
      'Janeiro',
      'Fevereiro',
      'Março',
      'Abril',
      'Maio',
      'Junho',
      'Julho',
      'Agosto',
      'Setembro',
      'Outubro',
      'Novembro',
      'Dezembro',
    ],
    []
  );
  const dayNames = useMemo(() => ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'], []);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    return { daysInMonth: lastDay.getDate(), startingDayOfWeek: firstDay.getDay() };
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);

  const previousMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const formatDateStr = (day: number) =>
    `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const formatDisplayDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const getAppointmentsForDate = (dateStr: string) => appointments.filter((apt) => apt.date === dateStr);

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  const handleDateClick = (day: number) => {
    const dateStr = formatDateStr(day);
    setSelectedDate(dateStr);
    setNewAppointment((prev) => ({ ...prev, date: dateStr }));
  };

  const handlePatientSearch = (value: string) => {
    setPatientSearch(value);
    if (value.length >= 2) {
      const filtered = patients.filter((p) => p.name.toLowerCase().includes(value.toLowerCase()));
      setPatientSuggestions(filtered.slice(0, 5));
    } else {
      setPatientSuggestions([]);
    }
  };

  const selectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setPatientSearch(patient.name);
    setPatientSuggestions([]);
    setNewAppointment((prev) => ({
      ...prev,
      cpf: patient.cpf,
      patientEmail: patient.email ?? '',
    }));
  };

  const handleDoctorChange = (doctorName: string) => {
    const doctor = doctors.find((d) => d.name === doctorName);
    setNewAppointment((prev) => ({
      ...prev,
      doctor: doctorName,
      specialty: doctor?.specialty ?? '',
    }));
  };

  const resetForm = () => {
    setPatientSearch('');
    setSelectedPatient(null);
    setPatientSuggestions([]);
    setNewAppointment({
      date: selectedDate ?? '',
      time: '',
      doctor: '',
      specialty: '',
      type: 'Consulta',
      amount: '',
      cpf: '',
      patientEmail: '',
    });
  };

  const handleCreateAppointment = async () => {
    if (!selectedPatient || !newAppointment.doctor || !newAppointment.date || !newAppointment.time) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    const cleanCpf = stripCPF(newAppointment.cpf);
    if (!validateCPF(cleanCpf)) {
      toast.error('CPF inválido');
      return;
    }

    try {
      const payload = {
        patient: selectedPatient.name,
        patientId: selectedPatient.id ?? '',
        doctor: newAppointment.doctor,
        specialty: newAppointment.specialty,
        date: newAppointment.date,
        time: newAppointment.time,
        type: newAppointment.type,
        amount: parseFloat(newAppointment.amount) || 0,
        cpf: cleanCpf,
        patientEmail: newAppointment.patientEmail,
        status: 'aguardando' as const,
        paid: false,
      };

      if (editingAppointmentId) {
        // Atualizando agendamento existente
        await appointmentAPI.update(editingAppointmentId, payload);
        setAppointments((prev) =>
          prev.map((apt) =>
            apt.id === editingAppointmentId
              ? {
                  id: apt.id,
                  date: payload.date,
                  time: payload.time,
                  patient: payload.patient,
                  doctor: payload.doctor,
                  type: payload.type,
                  status: apt.status,
                  paid: apt.paid,
                  amount: payload.amount,
                  cpf: payload.cpf,
                }
              : apt
          )
        );
        toast.success('Agendamento atualizado com sucesso!');
      } else {
        // Criando novo agendamento
        const saved = await appointmentAPI.create(payload);
        setAppointments((prev) => [
          ...prev,
          {
            id: saved.id ?? '',
            date: saved.date,
            time: saved.time,
            patient: saved.patient,
            doctor: saved.doctor,
            type: saved.type ?? 'Consulta',
            status: saved.status ?? 'aguardando',
            paid: saved.paid ?? false,
            amount: saved.amount ?? 0,
            cpf: saved.cpf ?? '',
          },
        ]);
        toast.success('Agendamento criado com sucesso!');
      }

      setShowNewAppointmentForm(false);
      setEditingAppointmentId(null);
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar agendamento:', error);
      toast.error('Erro ao salvar agendamento');
    }
  };

  const updateAppointmentStatus = async (appointmentId: string, newStatus: string) => {
    try {
      await appointmentAPI.updateStatus(appointmentId, newStatus);
      setAppointments((prev) =>
        prev.map((apt) =>
          apt.id === appointmentId ? { ...apt, status: newStatus } : apt
        )
      );
      toast.success('Status atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  const togglePaymentStatus = async (appointmentId: string, currentPaid: boolean) => {
    try {
      const appointment = appointments.find((apt) => apt.id === appointmentId);
      if (!appointment) return;

      const newPaid = !currentPaid;
      await appointmentAPI.updatePaid(appointmentId, newPaid);

      setAppointments((prev) =>
        prev.map((apt) =>
          apt.id === appointmentId ? { ...apt, paid: newPaid } : apt
        )
      );
      
      toast.success(newPaid ? 'Pagamento confirmado!' : 'Pagamento marcado como pendente');
    } catch (error) {
      console.error('Erro ao atualizar pagamento:', error);
      toast.error('Erro ao atualizar pagamento');
    }
  };

  const editAppointment = (appointmentId: string) => {
    const appointment = appointments.find((apt) => apt.id === appointmentId);
    if (appointment) {
      setEditingAppointmentId(appointmentId);
      setSelectedDate(appointment.date);
      setNewAppointment({
        date: appointment.date,
        time: appointment.time,
        doctor: appointment.doctor,
        specialty: '',
        type: appointment.type,
        amount: appointment.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        cpf: maskCPF(appointment.cpf),
        patientEmail: '',
      });
      const patient = patients.find((p) => p.cpf === appointment.cpf);
      if (patient) {
        setSelectedPatient(patient);
        setPatientSearch(patient.name);
      }
      setShowNewAppointmentForm(true);
      toast.info('Edite os dados e clique em Atualizar');
    }
  };

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const todaysAppointments = getAppointmentsForDate(todayStr);
  const selectedDateAppointments = selectedDate ? getAppointmentsForDate(selectedDate) : [];

  return {
    // state
    currentDate,
    selectedDate,
    appointments,
    isLoading,
    showNewAppointmentForm,
    editingAppointmentId,
    doctors,
    patientSearch,
    patientSuggestions,
    newAppointment,
    selectedPatient,
    // helpers
    monthNames,
    dayNames,
    daysInMonth,
    startingDayOfWeek,
    todayStr,
    todaysAppointments,
    selectedDateAppointments,
    formatDisplayDate,
    formatDateStr,
    isToday,
    // actions
    previousMonth,
    nextMonth,
    handleDateClick,
    handlePatientSearch,
    selectPatient,
    handleDoctorChange,
    setNewAppointment,
    setShowNewAppointmentForm,
    handleCreateAppointment,
    resetForm,
    updateAppointmentStatus,
    togglePaymentStatus,
    editAppointment,
    reloadAppointments,
  };
}
