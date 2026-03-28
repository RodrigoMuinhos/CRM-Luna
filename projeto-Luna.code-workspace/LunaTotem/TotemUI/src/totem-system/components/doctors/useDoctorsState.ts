'use client';

import { FormEvent, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Doctor, doctorAPI } from '@/lib/api';
import { maskPhone, stripPhone } from '@/lib/phone';

export type DoctorForm = {
  name: string;
  specialty: string;
  email: string;
  phone: string;
  availability: string;
  crmUf: string;
  crmNumber: string;
};

const emptyForm: DoctorForm = {
  name: '',
  specialty: '',
  email: '',
  phone: '',
  availability: '',
  crmUf: '',
  crmNumber: '',
};

export const availabilityDays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'] as const;
export const shiftOptions = ['Manhã', 'Tarde', 'Noite'] as const;
type Day = (typeof availabilityDays)[number];
type Shift = (typeof shiftOptions)[number];

const getDefaultAvailability = (): Partial<Record<Day, string[]>> => ({
  Seg: ['Manhã', 'Tarde'],
  Qua: ['Manhã', 'Tarde'],
  Sex: ['Manhã', 'Tarde'],
});

const normalizeShift = (value: string): Shift | null => {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
  if (normalized === 'manha') return 'Manhã';
  if (normalized === 'tarde') return 'Tarde';
  if (normalized === 'noite') return 'Noite';
  return null;
};

export function useDoctorsState() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formValues, setFormValues] = useState<DoctorForm>(emptyForm);
  const [prefix, setPrefix] = useState<'Dr.' | 'Dra.'>('Dr.');
  const [availabilitySelection, setAvailabilitySelection] = useState<Partial<Record<Day, string[]>>>(() =>
    getDefaultAvailability()
  );
  const [crmTouched, setCrmTouched] = useState(false);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [expandedDoctorId, setExpandedDoctorId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingDoctorId, setEditingDoctorId] = useState<string | null>(null);

  const reloadDoctors = async () => {
    setLoadingDoctors(true);
    try {
      const result = await doctorAPI.getAll();
      setDoctors(result);
    } catch {
      toast.error('Não foi possível carregar os médicos.');
    } finally {
      setLoadingDoctors(false);
    }
  };

  useEffect(() => {
    reloadDoctors();
  }, []);

  const crmRegex = /^CRM\/[A-Z]{2}\s\d{4,7}$/;
  const crmUfValue = formValues.crmUf.trim().toUpperCase();
  const crmNumberValue = formValues.crmNumber.trim();
  const crmValue = crmUfValue && crmNumberValue ? `CRM/${crmUfValue} ${crmNumberValue}` : '';
  const crmValid = crmValue.length > 0 && crmRegex.test(crmValue);
  const showCrmError = crmTouched && Boolean(crmNumberValue) && !crmValid;

  const formatAvailability = (selection: Partial<Record<Day, string[]>>) => {
    const entries = availabilityDays
      .map((day) => {
        const shifts = selection[day];
        if (!shifts || shifts.length === 0) return null;
        return `${day} (${shifts.join(', ')})`;
      })
      .filter(Boolean);
    return entries.length > 0 ? entries.join('; ') : 'Seg a Sex';
  };

  const toggleShift = (day: Day, shift: Shift) => {
    setAvailabilitySelection((prev) => {
      const current = prev[day] ?? [];
      const hasShift = current.includes(shift);
      const updated = hasShift ? current.filter((value) => value !== shift) : [...current, shift];
      if (updated.length === 0) {
        const { [day]: _removed, ...rest } = prev;
        return rest;
      }
      const ordered = shiftOptions.filter((option) => updated.includes(option));
      return { ...prev, [day]: ordered };
    });
  };

  const resetAvailability = () => setAvailabilitySelection(getDefaultAvailability());

  const handleChange = (field: keyof DoctorForm, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  };

  const openModal = (doctor?: Doctor) => {
    setCurrentStep(1);
    setFormError(null);
    setCrmTouched(false);
    if (doctor) {
      setIsEditing(true);
      setEditingDoctorId(doctor.id);
      const prefixGuess = doctor.name?.toLowerCase().startsWith('dra') ? 'Dra.' : 'Dr.';
      const nameNoPrefix = doctor.name?.replace(/^(draa?\.?|dra\.?|dr\.?)\s*/i, '').trim() || doctor.name;
      const crmMatch = /CRM\/([A-Z]{2})\s+(\d+)/.exec(doctor.crm || '');
      const crmUf = crmMatch?.[1] || '';
      const crmNumber = crmMatch?.[2] || '';
      const selectionFromText: Partial<Record<Day, string[]>> = {};
      (doctor.availability || '').split(';').forEach((entry) => {
        const match = entry.trim().match(/^([\p{L}-]+)\s*\(([^)]+)\)/u);
        if (!match) return;
        const day = match[1].trim() as Day;
        if (!availabilityDays.includes(day)) return;
        const shifts = match[2]
          .split(',')
          .map((s) => normalizeShift(s.trim()))
          .filter((s): s is Shift => Boolean(s));
        if (shifts.length > 0) selectionFromText[day] = shifts;
      });
      setPrefix(prefixGuess as 'Dr.' | 'Dra.');
      setFormValues({
        name: nameNoPrefix || '',
        specialty: doctor.specialty || '',
        email: doctor.email || '',
        phone: maskPhone(doctor.phone || ''),
        availability: doctor.availability || '',
        crmUf,
        crmNumber,
      });
      setAvailabilitySelection(Object.keys(selectionFromText).length > 0 ? selectionFromText : getDefaultAvailability());
    } else {
      setIsEditing(false);
      setEditingDoctorId(null);
      setFormValues(emptyForm);
      setAvailabilitySelection(getDefaultAvailability());
      setPrefix('Dr.');
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormValues(emptyForm);
    setPrefix('Dr.');
    setAvailabilitySelection(getDefaultAvailability());
    setCrmTouched(false);
    setFormError(null);
    setIsSaving(false);
    setIsEditing(false);
    setEditingDoctorId(null);
  };

  const stepsTotal = 3;
  const canProceedFromStep1 = () => {
    setFormError(null);
    if (!formValues.name.trim()) return (setFormError('Informe o nome.'), false);
    if (!formValues.email.trim()) return (setFormError('Informe o e-mail.'), false);
    if (!formValues.phone.trim()) return (setFormError('Informe o telefone.'), false);
    return true;
  };
  const canProceedFromStep2 = () => {
    setFormError(null);
    if (!formValues.specialty.trim()) return (setFormError('Informe a especialidade.'), false);
    return true;
  };
  const nextStep = () => {
    if (currentStep === 1 && !canProceedFromStep1()) return;
    if (currentStep === 2 && !canProceedFromStep2()) return;
    setCurrentStep((prev) => (Math.min(prev + 1, stepsTotal) as 1 | 2 | 3));
  };
  const prevStep = () => setCurrentStep((prev) => (Math.max(prev - 1, 1) as 1 | 2 | 3));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (currentStep < 3) {
      nextStep();
      return;
    }
    const { name, specialty, email, phone } = formValues;
    if (!name.trim() || !specialty.trim() || !email.trim() || !crmUfValue || !crmNumberValue) {
      setFormError('Preencha nome, especialidade, e-mail e CRM.');
      return;
    }
    if (!crmValid) {
      setCrmTouched(true);
      setFormError('CRM deve seguir o padrão CRM/UF 123456.');
      return;
    }

    const payload: Omit<Doctor, 'id'> = {
      name: `${prefix} ${name.trim()}`,
      specialty: specialty.trim(),
      email: email.trim(),
      phone: stripPhone(maskPhone(phone)),
      availability: formatAvailability(availabilitySelection),
      crm: crmValue,
    };

    setIsSaving(true);
    try {
      let saved: Doctor;
      if (isEditing && editingDoctorId) {
        saved = await doctorAPI.update(editingDoctorId, payload);
        setDoctors((prev) => prev.map((d) => (d.id === editingDoctorId ? saved : d)));
        toast.success('Médico atualizado.');
      } else {
        saved = await doctorAPI.create(payload);
        setDoctors((prev) => [...prev, saved]);
        toast.success('Médico cadastrado.');
      }
      closeModal();
    } catch {
      toast.error('Não foi possível salvar o médico.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDoctor = async () => {
    if (!editingDoctorId) {
      toast.error('Não foi possível excluir: id ausente.');
      return;
    }
    const confirmed = window.confirm('Deseja excluir este médico? Esta ação não poderá ser desfeita.');
    if (!confirmed) return;
    setIsSaving(true);
    try {
      await doctorAPI.delete(editingDoctorId);
      setDoctors((prev) => prev.filter((d) => d.id !== editingDoctorId));
      toast.success('Médico excluído.');
      closeModal();
    } catch {
      toast.error('Falha ao excluir médico. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  return {
    doctors,
    loadingDoctors,
    isModalOpen,
    openModal,
    closeModal,
    formValues,
    handleChange,
    prefix,
    setPrefix,
    availabilityDays,
    shiftOptions,
    availabilitySelection,
    resetAvailability,
    toggleShift,
    crmValue,
    showCrmError,
    crmTouched,
    setCrmTouched,
    formError,
    isSaving,
    isEditing,
    currentStep,
    nextStep,
    prevStep,
    stepsTotal,
    expandedDoctorId,
    setExpandedDoctorId,
    handleSubmit,
    handleDeleteDoctor,
    reloadDoctors,
  };
}
