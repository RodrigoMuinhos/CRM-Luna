'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Search, Plus, Trash, RotateCw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { patientAPI } from '@/lib/api';
import { maskCPF, stripCPF, validateCPF } from '@/lib/cpf';
import { maskPhone, stripPhone } from '@/lib/phone';
import { toast } from 'sonner';
import { mapToRecord, type PatientRecord } from './patients/types';
import { usePatientRecords } from './patients/usePatientRecords';
import { DesktopPatientTable } from './patients/DesktopPatientTable';
import { MobilePatientList } from './patients/MobilePatientList';
import { formatFieldValue, initialFormValues, type FormValues } from './patients/formState';
import { StepAddressData, StepClinicalData, StepPersonalData } from './patients/FormSteps';

const stepsTotal = 4;



type PatientModalProps = {
  isOpen: boolean;
  onClose: () => void;
  patient?: PatientRecord;
  onSaved: (record: PatientRecord) => void;
  onDeleted: (id: string) => void;
  reloadPatients: () => Promise<void>;
};

const PatientModal = ({ isOpen, onClose, patient, onSaved, onDeleted, reloadPatients }: PatientModalProps) => {
  const [formValues, setFormValues] = useState<FormValues>(initialFormValues);
  const [formError, setFormError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFetchingAddress, setIsFetchingAddress] = useState(false);
  const [cepError, setCepError] = useState('');

  const isEditing = Boolean(patient);

  useEffect(() => {
    if (!isOpen) return;
    setCurrentStep(1);
    setFormError(null);
    setCepError('');
    setFormValues(
      patient
        ? {
            name: patient.name || '',
            email: patient.email || '',
            phone: maskPhone(patient.phone || ''),
            cpf: maskCPF(patient.cpf || ''),
            birthDate: patient.birthDate || '',
            address: patient.address || '',
            healthPlan: patient.healthPlan || '',
            notes: patient.notes || '',
            cep: '',
          }
        : initialFormValues
    );
  }, [isOpen, patient]);

  const handlePatientChange = (field: keyof FormValues, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: formatFieldValue(field, value) }));
    setFormError(null);
    if (field === 'cep') setCepError('');
  };

  const fetchAddressFromCep = async () => {
    const digits = formValues.cep.replace(/\D/g, '');
    if (digits.length !== 8) {
      setCepError('Informe um CEP válido.');
      return;
    }
    setIsFetchingAddress(true);
    setCepError('');
    try {
      const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      if (!response.ok) throw new Error('Falha ao consultar o CEP.');
      const data = await response.json();
      if (data.erro) throw new Error('CEP não encontrado.');
      const suggested = `${data.logradouro || ''}${data.bairro ? `, ${data.bairro}` : ''}`.trim();
      setFormValues((prev) => ({
        ...prev,
        address: `${suggested}${data.localidade ? ` - ${data.localidade}` : ''}`.trim(),
      }));
    } catch (error) {
      console.error('Erro ao buscar CEP', error);
      setCepError((error as Error).message || 'Não foi possível carregar o endereço.');
    } finally {
      setIsFetchingAddress(false);
    }
  };

  const canProceedFromStep1 = () => {
    if (!formValues.name.trim() || !formValues.cpf.trim() || !formValues.phone.trim() || !formValues.birthDate) {
      setFormError('Preencha Nome, CPF, Data de Nascimento e Telefone para continuar.');
      return false;
    }
    if (!validateCPF(stripCPF(formValues.cpf))) {
      setFormError('CPF inválido.');
      return false;
    }
    return true;
  };

  const nextStep = () => {
    if (currentStep === 1 && !canProceedFromStep1()) return;
    setFormError(null);
    setCurrentStep((prev) => (Math.min(prev + 1, stepsTotal) as 1 | 2 | 3 | 4));
  };

  const prevStep = () => {
    setFormError(null);
    setCurrentStep((prev) => (Math.max(prev - 1, 1) as 1 | 2 | 3 | 4));
  };

  const handlePatientSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (currentStep < stepsTotal) {
      nextStep();
      return;
    }
    if (!formValues.name.trim() || !formValues.cpf.trim() || !formValues.phone.trim()) {
      setFormError('Nome, CPF e telefone são obrigatórios.');
      return;
    }
    if (!validateCPF(stripCPF(formValues.cpf))) {
      setFormError('CPF inválido.');
      return;
    }
    if (!formValues.birthDate) {
      setFormError('Informe a data de nascimento.');
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        name: formValues.name.trim(),
        cpf: stripCPF(formValues.cpf),
        phone: stripPhone(formValues.phone),
        email: formValues.email.trim() || undefined,
        birthDate: formValues.birthDate || undefined,
        address: formValues.address || undefined,
        healthPlan: formValues.healthPlan || undefined,
        notes: formValues.notes || undefined,
      };
      const saved = patient && patient.id ? await patientAPI.update(patient.id, payload) : await patientAPI.create(payload);
      onSaved(mapToRecord(saved));
      toast.success('Paciente salvo com sucesso.');
      onClose();
    } catch (error) {
      console.error('Erro ao salvar paciente', error);
      toast.error('Falha ao salvar paciente. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePatient = async () => {
    if (!patient?.id) {
      toast.error('Não foi possível excluir: id ausente.');
      return;
    }
    if (!window.confirm('Deseja excluir este paciente? Esta ação não poderá ser desfeita.')) return;
    setIsDeleting(true);
    try {
      await patientAPI.delete(patient.id);
      onDeleted(patient.id);
      toast.success('Paciente excluído com sucesso.');
      onClose();
    } catch (error) {
      console.error('Erro ao excluir paciente', error);
      await reloadPatients();
      toast.error('Falha ao excluir paciente. Verifique se ele ainda existe e tente novamente.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="space-y-4 bg-white text-[#2F2F2F]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Paciente' : 'Novo Paciente'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Atualize os dados do paciente.' : 'Cadastre os dados necessários para agendar consultas.'}
          </DialogDescription>
          <div className="mt-2">
            <div className="h-1 w-full rounded bg-gray-200">
              <div
                className="h-1 rounded bg-[#D3A67F] transition-all"
                style={{ width: `${(Math.min(currentStep, 3) / 3) * 100}%` }}
              />
            </div>
            <div className="mt-2 text-xs text-gray-500">Passo {Math.min(currentStep, 3)} de 3</div>
          </div>
        </DialogHeader>

        <form
          onSubmit={handlePatientSubmit}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && currentStep < stepsTotal) {
              event.preventDefault();
              nextStep();
            }
          }}
          className="space-y-4"
        >
          {currentStep === 1 && <StepPersonalData values={formValues} onChange={handlePatientChange} />}
          {currentStep === 2 && (
            <StepAddressData
              values={formValues}
              onChange={handlePatientChange}
              fetchAddress={fetchAddressFromCep}
              isFetching={isFetchingAddress}
              cepError={cepError}
            />
          )}
          {currentStep === 3 && <StepClinicalData values={formValues} onChange={handlePatientChange} />}

          {formError && <p className="text-sm text-red-600">{formError}</p>}

          <DialogFooter className="gap-3">
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  Cancelar
                </button>
                {isEditing && (
                  <>
                    <button
                      type="button"
                      onClick={() => window.location.reload()}
                      className="inline-flex items-center justify-center rounded-lg border border-[#4A4A4A]/20 p-2 text-[#4A4A4A]/60 transition hover:bg-[#4A4A4A]/5 disabled:cursor-not-allowed disabled:opacity-60"
                      aria-label="Atualizar"
                      title="Atualizar"
                    >
                      <RotateCw size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={handleDeletePatient}
                      disabled={isDeleting}
                      className="inline-flex items-center justify-center rounded-lg border border-[#D3A67F]/50 px-2.5 py-2 text-[#D3A67F] transition hover:bg-[#D3A67F]/10 disabled:cursor-not-allowed disabled:opacity-60"
                      aria-label="Excluir paciente"
                    >
                      {isDeleting ? <span className="text-xs font-semibold">...</span> : <Trash size={18} />}
                    </button>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                  >
                    Voltar
                  </button>
                )}
                {currentStep < stepsTotal ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="rounded-lg bg-[#D3A67F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#c99970]"
                  >
                    Próximo
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="rounded-lg bg-[#D3A67F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#c99970] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSaving ? 'Salvando...' : 'Salvar paciente'}
                  </button>
                )}
              </div>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};


type PatientsProps = {
  refreshCallbackRef?: React.RefObject<(() => void) | null>;
};

export function Patients({ refreshCallbackRef }: PatientsProps) {
  const { patients, isLoading, reloadPatients, upsertPatient, removePatient } = usePatientRecords();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | undefined>(undefined);

  // Register refresh callback
  useEffect(() => {
    if (refreshCallbackRef) {
      refreshCallbackRef.current = reloadPatients;
    }
  }, [refreshCallbackRef, reloadPatients]);

  const filteredPatients = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    if (!search) return patients;
    return patients.filter((patient) => patient.name.toLowerCase().includes(search));
  }, [patients, searchTerm]);

  const openModal = (patient?: PatientRecord) => {
    setSelectedPatient(patient);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedPatient(undefined);
  };

  return (
    <div className="space-y-6">
      <PatientModal
        isOpen={isModalOpen}
        patient={selectedPatient}
        onClose={closeModal}
        onSaved={upsertPatient}
        onDeleted={removePatient}
        reloadPatients={reloadPatients}
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-gray-500">Pacientes</div>
        <button
          type="button"
          onClick={() => openModal()}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#D3A67F] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#c99970] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D3A67F]"
        >
          <Plus size={20} />
          Novo Paciente
        </button>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Buscar paciente..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-[#D3A67F]"
        />
      </div>
      {isLoading && <div className="text-xs text-gray-500">Carregando pacientes...</div>}

      <div className="rounded-lg border border-gray-100 bg-white">
        <DesktopPatientTable patients={filteredPatients} onSelect={openModal} />
        <MobilePatientList patients={filteredPatients} onSelect={openModal} />
      </div>
    </div>
  );
}
