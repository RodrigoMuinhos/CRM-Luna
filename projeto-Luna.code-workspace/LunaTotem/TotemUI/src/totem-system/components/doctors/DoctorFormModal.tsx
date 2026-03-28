'use client';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { DoctorForm, availabilityDays as dayOptions, shiftOptions as shiftOptionsConst } from './useDoctorsState';
import { maskPhone } from '@/lib/phone';
import { Trash } from 'lucide-react';
import { FormEvent } from 'react';

type Day = (typeof dayOptions)[number];
type Shift = (typeof shiftOptionsConst)[number];

type DoctorFormModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  formValues: DoctorForm;
  handleChange: (field: keyof DoctorForm, value: string) => void;
  prefix: 'Dr.' | 'Dra.';
  setPrefix: (value: 'Dr.' | 'Dra.') => void;
  availabilitySelection: Partial<Record<Day, string[]>>;
  resetAvailability: () => void;
  toggleShift: (day: Day, shift: Shift) => void;
  showCrmError: boolean;
  setCrmTouched: (value: boolean) => void;
  formError: string | null;
  isSaving: boolean;
  isEditing: boolean;
  currentStep: 1 | 2 | 3;
  nextStep: () => void;
  prevStep: () => void;
  stepsTotal: number;
  onDelete: () => void;
};

export function DoctorFormModal({
  isOpen,
  onClose,
  onSubmit,
  formValues,
  handleChange,
  prefix,
  setPrefix,
  availabilitySelection,
  resetAvailability,
  toggleShift,
  showCrmError,
  setCrmTouched,
  formError,
  isSaving,
  isEditing,
  currentStep,
  nextStep,
  prevStep,
  stepsTotal,
  onDelete,
}: DoctorFormModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="space-y-4 bg-white text-[#2F2F2F]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar médico' : 'Novo médico'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Atualize os dados do médico.' : 'Cadastre os dados em 3 etapas.'}
          </DialogDescription>
          <div className="mt-2">
            <div className="h-1 w-full bg-gray-200 rounded">
              <div
                className="h-1 bg-[#D3A67F] rounded transition-all"
                style={{ width: `${(currentStep / stepsTotal) * 100}%` }}
              />
            </div>
            <div className="mt-2 text-xs text-gray-500">
              Passo {currentStep} de {stepsTotal}
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          {currentStep === 1 && (
            <div className="grid gap-4">
              <div className="space-y-1">
                <Label>Nome</Label>
                <div className="flex gap-2">
                  <select
                    value={prefix}
                    onChange={(event) => setPrefix(event.target.value as 'Dr.' | 'Dra.')}
                    className="rounded-md border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 focus:border-[#D3A67F] focus:ring-[#D3A67F]/50"
                  >
                    <option value="Dr.">Dr.</option>
                    <option value="Dra.">Dra.</option>
                  </select>
                  <Input
                    id="doctor-name"
                    placeholder="Nome completo"
                    value={formValues.name}
                    onChange={(event) => handleChange('name', event.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="doctor-email">E-mail</Label>
                <Input
                  id="doctor-email"
                  type="email"
                  placeholder="email@exemplo.com"
                  value={formValues.email}
                  onChange={(event) => handleChange('email', event.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="doctor-phone">Telefone</Label>
                <Input
                  id="doctor-phone"
                  placeholder="(00) 00000-0000"
                  value={formValues.phone}
                  onChange={(event) => handleChange('phone', maskPhone(event.target.value))}
                  required
                />
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="grid gap-4">
              <div className="space-y-1">
                <Label htmlFor="doctor-specialty">Especialidade</Label>
                <Input
                  id="doctor-specialty"
                  placeholder="Especialidade"
                  value={formValues.specialty}
                  onChange={(event) => handleChange('specialty', event.target.value)}
                  required
                />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Disponibilidade</Label>
                  <button
                    type="button"
                    onClick={resetAvailability}
                    className="text-xs font-medium text-[#D3A67F] hover:text-[#c99970]"
                  >
                    Resetar
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[320px] overflow-y-auto pr-1">
                  {dayOptions.map((day) => {
                    const selectedShifts = availabilitySelection[day] ?? [];
                    return (
                      <div key={day} className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                        <div className="flex items-center justify-between text-sm font-semibold text-gray-700 mb-2">
                          <span>{day}</span>
                          <span className="text-xs text-gray-400">
                            {selectedShifts.length > 0 ? selectedShifts.join(', ') : 'Nenhum'}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {shiftOptionsConst.map((shift) => {
                            const isActive = selectedShifts.includes(shift);
                            return (
                              <button
                                key={shift}
                                type="button"
                                onClick={() => toggleShift(day, shift)}
                                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                                  isActive
                                    ? 'border-[#D3A67F] bg-[#D3A67F] text-white'
                                    : 'border-gray-200 bg-gray-50 text-gray-600'
                                }`}
                              >
                                {shift}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-500">Toque nos períodos para marcar ou desmarcar.</p>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="grid gap-4">
              <div className="space-y-1">
                <Label>CRM</Label>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="flex items-center rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-500">
                    CRM/
                  </span>
                  <select
                    id="doctor-crm-uf"
                    value={formValues.crmUf}
                    onChange={(event) => handleChange('crmUf', event.target.value)}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 focus:border-[#D3A67F] focus:outline-none"
                    required
                  >
                    <option value="" disabled>
                      UF
                    </option>
                    <option value="SP">SP</option>
                    <option value="CE">CE</option>
                  </select>
                  <Input
                    id="doctor-crm-number"
                    placeholder="0000000"
                    value={formValues.crmNumber}
                    onChange={(event) => handleChange('crmNumber', event.target.value.replace(/\D/g, ''))}
                    onBlur={() => setCrmTouched(true)}
                    className={`flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#D3A67F] focus:outline-none ${
                      showCrmError ? 'border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/40' : ''
                    }`}
                    required
                  />
                </div>
                {showCrmError && <p className="text-xs text-red-600">CRM deve seguir CRM/UF 123456.</p>}
              </div>
            </div>
          )}

          {formError && <p className="text-sm text-red-600">{formError}</p>}

          <DialogFooter className="gap-3">
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={onClose}
                  className="rounded-full bg-white border border-gray-300 px-6 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </Button>
                {isEditing && (
                  <button
                    type="button"
                    onClick={onDelete}
                    disabled={isSaving}
                    className="inline-flex items-center justify-center rounded-lg border border-[#D3A67F]/50 px-3 py-2 text-[#D3A67F] hover:bg-[#D3A67F]/10 transition disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label="Excluir médico"
                    title="Excluir médico"
                  >
                    <Trash size={18} />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                {currentStep > 1 && (
                  <Button
                    type="button"
                    onClick={prevStep}
                    className="rounded-full bg-white border border-gray-300 px-6 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Voltar
                  </Button>
                )}
                {currentStep < stepsTotal ? (
                  <Button
                    type="button"
                    onClick={nextStep}
                    className="rounded-full bg-[#D3A67F] px-6 py-2 text-sm font-semibold text-white hover:bg-[#c99970]"
                  >
                    Próximo
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    className="rounded-full bg-[#D3A67F] px-6 py-2 text-sm font-semibold text-white hover:bg-[#c99970] disabled:opacity-60"
                    disabled={isSaving}
                  >
                    {isSaving ? 'Salvando...' : 'Salvar médico'}
                  </Button>
                )}
              </div>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
