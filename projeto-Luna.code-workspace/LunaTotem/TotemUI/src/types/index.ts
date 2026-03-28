export interface Patient {
  id: string;
  name: string;
  cpf: string;
  phone: string;
  photo?: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patient: Patient;
  doctor: string;
  specialty: string;
  type?: string;
  date: string;
  time: string;
  status: string;
  paid: boolean;
  amount: number;
  cpf: string;
}

export type PaymentMethod = 'credit' | 'debit' | 'pix' | 'wallet';

export interface PaymentData {
  appointmentId: string;
  method: PaymentMethod;
  installments?: number;
  amount: number;
}
