import { maskCPF } from '@/lib/cpf';
import { maskPhone } from '@/lib/phone';

export type FormValues = {
  name: string;
  email: string;
  phone: string;
  cpf: string;
  birthDate: string;
  address: string;
  healthPlan: string;
  notes: string;
  cep: string;
};

export const initialFormValues: FormValues = {
  name: '',
  email: '',
  phone: '',
  cpf: '',
  birthDate: '',
  address: '',
  healthPlan: '',
  notes: '',
  cep: '',
};

export const personalFields: Array<{
  id: string;
  label: string;
  field: keyof FormValues;
  placeholder?: string;
  type?: string;
  required?: boolean;
}> = [
  { id: 'patient-name', label: 'Nome completo', field: 'name', placeholder: 'Ex: Ana Moreira', required: true },
  { id: 'patient-cpf', label: 'CPF', field: 'cpf', placeholder: '000.000.000-00', required: true },
  { id: 'patient-birth', label: 'Data de nascimento', field: 'birthDate', type: 'date', required: true },
  { id: 'patient-phone', label: 'Telefone', field: 'phone', placeholder: '(11) 90000-0000', required: true },
  { id: 'patient-email', label: 'Email', field: 'email', placeholder: 'ana@mail.com', type: 'email' },
];

const formatCep = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return digits.length <= 5 ? digits : `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

const fieldFormatters: Partial<Record<keyof FormValues, (value: string) => string>> = {
  cpf: maskCPF,
  phone: maskPhone,
  cep: formatCep,
};

export const formatFieldValue = (field: keyof FormValues, value: string) => {
  const formatter = fieldFormatters[field];
  return formatter ? formatter(value) : value;
};
