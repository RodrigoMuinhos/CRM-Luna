'use client';

import { useCallback, useEffect, useState } from 'react';
import { patientAPI } from '@/lib/api';
import { toast } from 'sonner';
import { mapToRecord, type PatientRecord } from './types';

export const usePatientRecords = () => {
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRecords = useCallback(async () => {
    const data = await patientAPI.getAll();
    return data.map(mapToRecord);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const records = await fetchRecords();
        if (active) setPatients(records);
      } catch (error) {
        console.error('Erro ao carregar pacientes', error);
        toast.error('Não foi possível carregar os pacientes no momento.');
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [fetchRecords]);

  const reloadPatients = useCallback(async () => {
    try {
      const records = await fetchRecords();
      setPatients(records);
    } catch (error) {
      console.error('Erro ao recarregar pacientes', error);
    }
  }, [fetchRecords]);

  const upsertPatient = useCallback((record: PatientRecord) => {
    setPatients((prev) =>
      prev.some((patient) => patient.id === record.id)
        ? prev.map((patient) => (patient.id === record.id ? record : patient))
        : [...prev, record]
    );
  }, []);

  const removePatient = useCallback((id: string) => {
    setPatients((prev) => prev.filter((patient) => patient.id !== id));
  }, []);

  return { patients, isLoading, reloadPatients, upsertPatient, removePatient };
};
