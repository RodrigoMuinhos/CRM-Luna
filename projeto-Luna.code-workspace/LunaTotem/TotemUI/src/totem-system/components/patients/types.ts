import { Patient } from '@/lib/api';
import { stripCPF } from '@/lib/cpf';
import { stripPhone } from '@/lib/phone';

export type PatientRecord = {
  id: string;
  name: string;
  email: string;
  phone: string;
  cpf: string;
  birthDate?: string;
  address?: string;
  healthPlan?: string;
  notes?: string;
  lastVisit: string;
  nextAppointment: string;
};

export const formatDate = (value?: string) => {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleDateString('pt-BR');
  } catch {
    return value;
  }
};

export const mapToRecord = (patient: Patient): PatientRecord => ({
  id: patient.id ?? '',
  name: patient.name,
  email: patient.email ?? '',
  phone: stripPhone(patient.phone),
  cpf: stripCPF(patient.cpf),
  birthDate: patient.birthDate,
  address: patient.address,
  healthPlan: patient.healthPlan,
  notes: patient.notes,
  lastVisit: patient.lastVisit ?? '-',
  nextAppointment: patient.nextAppointment ?? '-',
});
