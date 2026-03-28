import { FormEvent } from 'react';
import { Doctor, Patient } from '@/lib/api';
import { maskCPF } from '@/lib/cpf';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  newAppointment: any;
  today: string;
  doctorList: Doctor[];
  patientSuggestions: Patient[];
  handleChange: (field: string, value: string) => void;
  selectPatient: (patient: Patient) => void;
  formatCurrencyInput: (value: string) => string;
};

export function NewAppointmentModal({
  isOpen,
  onClose,
  onSubmit,
  newAppointment,
  today,
  doctorList,
  patientSuggestions,
  handleChange,
  selectPatient,
  formatCurrencyInput,
}: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-3 sm:px-4">
      <form
        className="w-full max-w-[560px] sm:max-w-lg rounded-2xl sm:rounded-3xl bg-white p-4 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
        onSubmit={onSubmit}
      >
        <h2 className="text-base sm:text-lg font-semibold text-gray-900">Nova Consulta</h2>
        <p className="text-xs sm:text-sm text-gray-500">Preencha os dados e confirme para agendar</p>
        <div className="space-y-4 border border-[#ECE6DF] bg-white/70 p-3 sm:p-4 rounded-2xl shadow-sm">
          <p className="text-[11px] sm:text-xs uppercase tracking-[0.25em] sm:tracking-[0.3em] text-[#C2B5A2]">Dados do médico</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col text-sm text-gray-600">
              Médico
              <select
                value={newAppointment.doctorId}
                onChange={(event) => {
                  const selectedId = event.target.value;
                  const doctor = doctorList.find((d) => d.id === selectedId);
                  if (doctor) {
                    handleChange('doctorId', doctor.id);
                    handleChange('doctor', doctor.name);
                    handleChange('specialty', doctor.specialty);
                  } else {
                    handleChange('doctorId', '');
                    handleChange('doctor', '');
                    handleChange('specialty', '');
                  }
                }}
                className="mt-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-[#D3A67F] focus:outline-none"
              >
                <option value="">Selecione o médico</option>
                {doctorList.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col text-sm text-gray-600">
              Especialidade
              <input
                value={newAppointment.specialty}
                readOnly
                className="mt-2 rounded-lg border border-gray-200 px-3 py-2 text-sm bg-gray-50 text-gray-600 focus:border-[#D3A67F] focus:outline-none"
                placeholder="Especialidade selecionada"
              />
            </label>
          </div>
        </div>

        <div className="space-y-4 border border-[#ECE6DF] bg-white/70 p-3 sm:p-4 rounded-2xl shadow-sm">
          <p className="text-[11px] sm:text-xs uppercase tracking-[0.25em] sm:tracking-[0.3em] text-[#C2B5A2]">Dados do paciente</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col text-sm text-gray-600 relative">
              Paciente
              <input
                value={newAppointment.patient}
                onChange={(event) => handleChange('patient', event.target.value)}
                className="mt-2 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#D3A67F] focus:outline-none"
                placeholder="Digite o nome completo do paciente"
              />
              {patientSuggestions.length > 0 && (
                <ul className="absolute left-0 right-0 top-full z-20 mt-1 max-h-[40vh] overflow-auto rounded-xl border border-gray-200 bg-white shadow-xl">
                  {patientSuggestions.map((patient) => (
                    <li
                      key={patient.id}
                      className="cursor-pointer px-3 py-2 text-sm text-gray-700 hover:bg-[#F6F2EC]"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        selectPatient(patient);
                      }}
                    >
                      {patient.name}
                    </li>
                  ))}
                </ul>
              )}
            </label>
            <label className="flex flex-col text-sm text-gray-600">
              CPF
              <input
                value={newAppointment.cpf}
                onChange={(event) => handleChange('cpf', maskCPF(event.target.value))}
                className="mt-2 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#D3A67F] focus:outline-none"
                placeholder="Digite o CPF do paciente"
              />
            </label>
          </div>

          <label className="flex flex-col text-sm text-gray-600">
            Email do paciente
            <input
              type="email"
              value={newAppointment.patientEmail}
              onChange={(event) => handleChange('patientEmail', event.target.value)}
              className="mt-2 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#D3A67F] focus:outline-none"
              placeholder="Digite o email do paciente"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col text-sm text-gray-600">
              Tipo de consulta
              <input
                value={newAppointment.type}
                onChange={(event) => handleChange('type', event.target.value)}
                className="mt-2 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#D3A67F] focus:outline-none"
                placeholder="Informe o tipo de atendimento"
              />
            </label>
            <label className="flex flex-col text-sm text-gray-600">
              Data
              <input
                type="date"
                value={newAppointment.date}
                onChange={(event) => handleChange('date', event.target.value)}
                className="mt-2 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#D3A67F] focus:outline-none"
                min={today}
              />
            </label>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col text-sm text-gray-600">
            Horário
            <div className="mt-2 grid grid-cols-2 gap-2">
              <select
                value={newAppointment.time.split(':')[0] || ''}
                onChange={(event) => {
                  const hour = event.target.value.padStart(2, '0');
                  const minute = newAppointment.time.split(':')[1] || '00';
                  handleChange('time', `${hour}:${minute}`);
                }}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-[#D3A67F] focus:outline-none"
              >
                <option value="">Hora</option>
                {Array.from({ length: 24 }).map((_, h) => {
                  const hour = String(h).padStart(2, '0');
                  return (
                    <option key={hour} value={hour}>
                      {hour}
                    </option>
                  );
                })}
              </select>
              <select
                value={newAppointment.time.split(':')[1] || ''}
                onChange={(event) => {
                  const minute = event.target.value.padStart(2, '0');
                  const hour = newAppointment.time.split(':')[0] || '00';
                  handleChange('time', `${hour}:${minute}`);
                }}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-[#D3A67F] focus:outline-none"
              >
                <option value="">Minutos</option>
                {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </label>

          <label className="flex flex-col text-sm text-gray-600">
            Valor (R$)
            <input
              type="text"
              inputMode="decimal"
              value={newAppointment.value}
              onChange={(event) => handleChange('value', event.target.value)}
              onBlur={(event) =>
                handleChange('value', formatCurrencyInput(event.target.value))
              }
              className="mt-2 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#D3A67F] focus:outline-none"
              placeholder="Informe o valor do procedimento"
            />
          </label>

          <label className="flex flex-col text-sm text-gray-600">
            Parcelamento no crédito
            <select
              value={String(newAppointment.creditInstallments ?? '1')}
              onChange={(event) => handleChange('creditInstallments', event.target.value)}
              className="mt-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-[#D3A67F] focus:outline-none"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={String(n)}>
                  {n}x {n === 1 ? '(à vista)' : '(sem juros)'}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-6 flex flex-col sm:flex-row justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="rounded-lg bg-[#D3A67F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c99970]"
          >
            Salvar consulta
          </button>
        </div>
      </form>
    </div>
  );
}
