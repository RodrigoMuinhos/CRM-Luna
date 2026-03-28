'use client';

import { Plus, Filter } from 'lucide-react';
import { AppointmentCard } from './appointments/AppointmentCard';
import { AppointmentDetailsModal } from './appointments/AppointmentDetailsModal';
import { NewAppointmentModal } from './appointments/NewAppointmentModal';
import { AppointmentSuccessModal } from './appointments/AppointmentSuccessModal';
import { useAppointmentsState } from './appointments/useAppointments';
import { useEffect, RefObject } from 'react';

type AppointmentsProps = {
  canControlTimers?: boolean;
  refreshCallbackRef?: RefObject<(() => void) | null>;
};

export function Appointments({ canControlTimers = true, refreshCallbackRef }: AppointmentsProps) {
  const {
    formatDate,
    formatCurrency,
    formatCurrencyInput,
    formatDuration,
    getStatusColor,
    getElapsedMs,
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
    filteredAppointments,
    paymentSummary,
    expandedAppointmentId,
    toggleAppointmentExpansion,
    toggleTimer,
    detailAppointment,
    openDetails,
    closeDetails,
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
    timers,
    // success modal
    successModalOpen,
    savedAppointmentData,
    isSendingEmail,
    closeSuccessModal,
    handleSendEmailFromModal,
  } = useAppointmentsState();

  // Register refresh callback
  useEffect(() => {
    if (refreshCallbackRef) {
      refreshCallbackRef.current = reloadAppointments;
    }
  }, [refreshCallbackRef, reloadAppointments]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-end">
          <div className="flex items-center gap-3">
            <Filter size={20} className="text-gray-500" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D3A67F]"
            >
              <option value="todos">Todos os Status</option>
              <option value="confirmado">Confirmado</option>
              <option value="aguardando">Aguardando</option>
              <option value="em-atendimento">Em Atendimento</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <label className="flex flex-col text-sm text-gray-600">
              CPF
              <input
                value={filterPatient}
                onChange={(e) => setFilterPatient(e.target.value)}
                className="mt-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#D3A67F] focus:outline-none"
                placeholder="Digite o CPF do paciente"
              />
            </label>
            <label className="flex flex-col text-sm text-gray-600">
              Médico/Especialidade
              <input
                value={filterDoctor}
                onChange={(e) => setFilterDoctor(e.target.value)}
                className="mt-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#D3A67F] focus:outline-none"
                placeholder="Digite o nome ou especialidade do médico"
              />
            </label>
            <label className="flex flex-col text-sm text-gray-600">
              Data inicial
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="mt-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#D3A67F] focus:outline-none"
              />
            </label>
            <label className="flex flex-col text-sm text-gray-600">
              Data final
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="mt-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#D3A67F] focus:outline-none"
              />
            </label>
          </div>
        </div>
        <div className="flex justify-end items-center gap-3">
          <button
            className="flex items-center gap-2 px-8 py-3 bg-[#D3A67F] text-white rounded-full shadow-[0_20px_40px_rgba(211,166,127,0.3)] hover:bg-[#c99970] transition-colors"
            onClick={openModal}
          >
            <Plus size={20} />
            Nova Consulta
          </button>
        </div>
      </div>

      {/* Pagamento */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-[#E5E2D7] bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm uppercase tracking-[0.3em] text-gray-500">
            Recebidos
          </div>
          <p className="mt-2 text-3xl font-semibold text-[#4A4A4A]">
            {formatCurrency(paymentSummary.paidValue)}
          </p>
          <p className="text-xs uppercase tracking-[0.3em] text-[#D3A67F]">
            {paymentSummary.paidPercent}% do total
          </p>
        </div>
        <div className="rounded-xl border border-[#E5E2D7] bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Impacto no dashboard</p>
          <p className="mt-3 text-2xl font-semibold text-[#D3A67F]">
            {paymentSummary.paidPercent}%
          </p>
          <p className="text-xs text-gray-400">dos valores foram confirmados</p>
        </div>
      </div>

      {/* Appointments Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {filteredAppointments.length === 0 ? (
          <div className="col-span-full bg-white rounded-lg border border-gray-100 p-8 text-center text-gray-500">
            Nenhuma consulta agendada – as consultas aparecerão aqui quando houver registros no sistema.
          </div>
        ) : (
          filteredAppointments.map((appointment) => {
            const appointmentId = appointment.id ?? '';
            const isExpanded = expandedAppointmentId === appointmentId;
            const elapsed = formatDuration(getElapsedMs(appointmentId));
            const isRunning = !!timers[appointmentId]?.running;
            return (
              <AppointmentCard
                key={appointmentId}
                appointment={appointment}
                isExpanded={isExpanded}
                onToggle={() => toggleAppointmentExpansion(appointmentId)}
                onOpenDetails={() => openDetails(appointment)}
                onToggleTimer={() => toggleTimer(appointment)}
                formatCurrency={formatCurrency}
                formatDate={formatDate}
                getStatusColor={getStatusColor}
                elapsedLabel={elapsed}
                isRunning={isRunning}
                canControlTimer={canControlTimers}
              />
            );
          })
        )}
      </div>

      {detailAppointment && (
        <AppointmentDetailsModal
          appointment={detailAppointment}
          onClose={closeDetails}
          onDelete={() => handleDeleteAppointment(detailAppointment.id)}
          onEdit={(appointmentId) => {
            handleEditAppointment(detailAppointment);
          }}
          onStatusChange={(appointmentId, newStatus) => {
            handleUpdateAppointmentStatus(appointmentId, newStatus);
          }}
          formatCurrency={formatCurrency}
          getStatusColor={getStatusColor}
        />
      )}

      {isModalOpen && (
        <NewAppointmentModal
          isOpen={isModalOpen}
          onClose={closeModal}
          onSubmit={handleNewAppointmentSubmit}
          newAppointment={newAppointment}
          today={today}
          doctorList={doctorList}
          patientSuggestions={patientSuggestions}
          handleChange={handleNewAppointmentChange}
          selectPatient={selectPatient}
          formatCurrencyInput={formatCurrencyInput}
        />
      )}

      <AppointmentSuccessModal
        isOpen={successModalOpen}
        onClose={closeSuccessModal}
        patientName={savedAppointmentData?.patientName ?? ''}
      />
    </div>
  );
}
