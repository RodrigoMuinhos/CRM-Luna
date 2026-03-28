// Exemplo de uso da API no componente React/Next.js
import { useState, useEffect } from 'react';
import {
  patientAPI,
  doctorAPI,
  appointmentAPI,
  paymentAPI,
  type Patient,
  type Doctor,
  type Appointment,
  type PaymentRequest
} from '@/lib/api';

export default function ExampleComponent() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Carregar dados ao montar o componente
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [patientsData, doctorsData] = await Promise.all([
        patientAPI.getAll(),
        doctorAPI.getAll()
      ]);
      setPatients(patientsData);
      setDoctors(doctorsData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  // Buscar paciente por CPF
  const searchPatientByCPF = async (cpf: string) => {
    try {
      const patient = await patientAPI.getByCpf(cpf);
      console.log('Paciente encontrado:', patient);
      return patient;
    } catch (error) {
      console.error('Paciente não encontrado:', error);
      return null;
    }
  };

  // Criar novo paciente
  const createPatient = async (patientData: Omit<Patient, 'id'>) => {
    try {
      const newPatient = await patientAPI.create(patientData);
      console.log('Paciente criado:', newPatient);
      setPatients([...patients, newPatient]);
      return newPatient;
    } catch (error) {
      console.error('Erro ao criar paciente:', error);
      throw error;
    }
  };

  // Criar consulta
  const createAppointment = async (
    appointmentData: Omit<Appointment, 'id'>
  ) => {
    try {
      const appointment = await appointmentAPI.create(appointmentData);
      console.log('Consulta criada:', appointment);
      return appointment;
    } catch (error) {
      console.error('Erro ao criar consulta:', error);
      throw error;
    }
  };

  // Processar pagamento
  const processPayment = async (
    appointmentId: string,
    amount: number,
    method: PaymentRequest['method']
  ) => {
    try {
      const result = await paymentAPI.process({
        appointmentId,
        amount,
        method
      });
      console.log('Pagamento processado:', result);
      return result;
    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
      throw error;
    }
  };

  return (
    <div>
      {loading ? (
        <p>Carregando...</p>
      ) : (
        <>
          <h2>Pacientes: {patients.length}</h2>
          <h2>Médicos: {doctors.length}</h2>
        </>
      )}
    </div>
  );
}

// Exemplo de uso em páginas do Next.js com Server-Side Rendering
export async function getServerSideProps() {
  try {
    const doctors = await doctorAPI.getAll();
    return {
      props: { doctors }
    };
  } catch (error) {
    console.error('Erro ao carregar médicos:', error);
    return {
      props: { doctors: [] }
    };
  }
}
