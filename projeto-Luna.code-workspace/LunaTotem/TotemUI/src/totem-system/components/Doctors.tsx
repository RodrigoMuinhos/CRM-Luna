'use client';

import { Plus } from 'lucide-react';
import { DoctorCard } from './doctors/DoctorCard';
import { DoctorFormModal } from './doctors/DoctorFormModal';
import { useDoctorsState } from './doctors/useDoctorsState';
import { useEffect, RefObject } from 'react';

type DoctorsProps = {
  refreshCallbackRef?: RefObject<(() => void) | null>;
};

export function Doctors({ refreshCallbackRef }: DoctorsProps) {
  const {
    doctors,
    loadingDoctors,
    isModalOpen,
    openModal,
    closeModal,
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
    expandedDoctorId,
    setExpandedDoctorId,
    handleSubmit,
    handleDeleteDoctor,
    reloadDoctors,
  } = useDoctorsState();

  // Register refresh callback
  useEffect(() => {
    if (refreshCallbackRef) {
      refreshCallbackRef.current = reloadDoctors;
    }
  }, [refreshCallbackRef, reloadDoctors]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-serif">Médicos</h2>
          <p className="text-sm text-gray-500">Cadastre os especialistas que atendem no Totem.</p>
        </div>
        <button
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#D3A67F] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#c99970] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D3A67F]"
          onClick={() => openModal()}
        >
          <Plus size={16} />
          Adicionar médico
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-100">
        <div className="p-3 space-y-2">
          {loadingDoctors ? (
            <div className="px-4 py-8 text-center text-gray-500">Carregando médicos...</div>
          ) : doctors.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">Nenhum médico cadastrado ainda.</div>
          ) : (
            doctors.map((doctor) => (
              <DoctorCard
                key={doctor.id}
                doctor={doctor}
                isExpanded={expandedDoctorId === doctor.id}
                onToggle={() => setExpandedDoctorId(expandedDoctorId === doctor.id ? null : doctor.id)}
                onEdit={() => openModal(doctor)}
              />
            ))
          )}
        </div>
      </div>

      <DoctorFormModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSubmit={handleSubmit}
        formValues={formValues}
        handleChange={handleChange}
        prefix={prefix}
        setPrefix={setPrefix}
        availabilitySelection={availabilitySelection}
        resetAvailability={resetAvailability}
        toggleShift={toggleShift}
        showCrmError={showCrmError}
        setCrmTouched={setCrmTouched}
        formError={formError}
        isSaving={isSaving}
        isEditing={isEditing}
        currentStep={currentStep}
        nextStep={nextStep}
        prevStep={prevStep}
        stepsTotal={stepsTotal}
        onDelete={handleDeleteDoctor}
      />
    </div>
  );
}
