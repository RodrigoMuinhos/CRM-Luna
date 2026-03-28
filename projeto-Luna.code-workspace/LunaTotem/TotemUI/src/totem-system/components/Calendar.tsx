'use client';

import { useCalendarState } from './calendar/useCalendarState';
import { TodayPanel } from './calendar/TodayPanel';
import { SelectedDayPanel } from './calendar/SelectedDayPanel';
import { CalendarGrid } from './calendar/CalendarGrid';
import { NewAppointmentModal } from './calendar/NewAppointmentModal';
import { maskCPF } from '@/lib/cpf';
import { useEffect, RefObject } from 'react';

type CalendarProps = {
  refreshCallbackRef?: RefObject<(() => void) | null>;
};

export function Calendar({ refreshCallbackRef }: CalendarProps) {
  const {
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
  } = useCalendarState();

  // Register refresh callback
  useEffect(() => {
    if (refreshCallbackRef) {
      refreshCallbackRef.current = reloadAppointments;
    }
  }, [refreshCallbackRef, reloadAppointments]);

  return (
    <div className="space-y-4">
      <TodayPanel todayStr={todayStr} todaysAppointments={todaysAppointments} formatDisplayDate={formatDisplayDate} />

      <SelectedDayPanel
        selectedDate={selectedDate}
        selectedDateAppointments={selectedDateAppointments}
        isLoading={isLoading}
        formatDisplayDate={formatDisplayDate}
        onOpenNew={() => setShowNewAppointmentForm(true)}
        onUpdateStatus={updateAppointmentStatus}
        onTogglePayment={togglePaymentStatus}
        onEditAppointment={editAppointment}
      />

      <CalendarGrid
        currentDate={currentDate}
        monthNames={monthNames}
        dayNames={dayNames}
        daysInMonth={daysInMonth}
        startingDayOfWeek={startingDayOfWeek}
        isToday={isToday}
        selectedDate={selectedDate}
        formatDateStr={formatDateStr}
        getAppointmentsForDate={(dateStr) =>
          appointments
            .filter((apt) => apt.date === dateStr)
            .map((apt) => ({ time: apt.time, patient: apt.patient }))
        }
        onSelectDay={handleDateClick}
        previousMonth={previousMonth}
        nextMonth={nextMonth}
      />

      {selectedDate && (
        <NewAppointmentModal
          selectedDate={selectedDate}
          show={showNewAppointmentForm}
          onClose={() => {
            setShowNewAppointmentForm(false);
            resetForm();
          }}
          patientSearch={patientSearch}
          onPatientSearch={handlePatientSearch}
          patientSuggestions={patientSuggestions}
          onSelectPatient={selectPatient}
          doctors={doctors}
          onDoctorChange={handleDoctorChange}
          newAppointment={newAppointment}
          onNewAppointmentChange={setNewAppointment}
          onCreate={handleCreateAppointment}
          formatDisplayDate={formatDisplayDate}
          isEditing={!!editingAppointmentId}
        />
      )}
    </div>
  );
}
