'use client';

import { ReactNode } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { personalFields, type FormValues } from './formState';

const FormField = ({ id, label, children }: { id: string; label: string; children: ReactNode }) => (
  <div className="space-y-1">
    <Label htmlFor={id}>{label}</Label>
    {children}
  </div>
);

type ChangeHandler = (field: keyof FormValues, value: string) => void;

export const StepPersonalData = ({ values, onChange }: { values: FormValues; onChange: ChangeHandler }) => (
  <div className="grid gap-4">
    {personalFields.map(({ id, label, field, placeholder, type, required }) => (
      <FormField key={id} id={id} label={label}>
        <Input
          id={id}
          placeholder={placeholder}
          type={type}
          required={required}
          value={values[field]}
          onChange={(event) => onChange(field, event.target.value)}
        />
      </FormField>
    ))}
  </div>
);

type AddressProps = {
  values: FormValues;
  onChange: ChangeHandler;
  fetchAddress: () => Promise<void>;
  isFetching: boolean;
  cepError: string;
};

export const StepAddressData = ({ values, onChange, fetchAddress, isFetching, cepError }: AddressProps) => (
  <div className="grid gap-4">
    <FormField id="patient-cep" label="CEP">
      <div className="flex items-center gap-2">
        <Input
          id="patient-cep"
          placeholder="00000-000"
          value={values.cep}
          onChange={(event) => onChange('cep', event.target.value)}
          onBlur={() => {
            if (values.cep.replace(/\D/g, '').length === 8) fetchAddress();
          }}
        />
        <button
          type="button"
          disabled={isFetching}
          onClick={fetchAddress}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 transition hover:border-gray-400 hover:text-gray-800 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
          aria-label="Buscar endereço por CEP"
        >
          {isFetching ? <Search size={18} className="animate-spin" /> : <Search size={18} />}
        </button>
      </div>
      {cepError && <p className="text-xs text-red-600">{cepError}</p>}
    </FormField>
    <FormField id="patient-address" label="Endereço completo">
      <Input
        id="patient-address"
        placeholder="Rua, número, bairro"
        value={values.address}
        onChange={(event) => onChange('address', event.target.value)}
      />
    </FormField>
  </div>
);

export const StepClinicalData = ({ values, onChange }: { values: FormValues; onChange: ChangeHandler }) => (
  <div className="grid gap-4">
    <FormField id="patient-plan" label="Convênio / Plano">
      <Input
        id="patient-plan"
        placeholder="Ex: Particular, Bradesco Saúde"
        value={values.healthPlan}
        onChange={(event) => onChange('healthPlan', event.target.value)}
      />
    </FormField>
    <FormField id="patient-notes" label="Observações clínicas">
      <Textarea
        id="patient-notes"
        placeholder="Doenças prévias, alergias, medicamentos em uso..."
        value={values.notes}
        rows={4}
        onChange={(event) => onChange('notes', event.target.value)}
      />
    </FormField>
  </div>
);
