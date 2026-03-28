export type TotemSystemPayload = {
  timestamp: string;
  highlights: {
    label: string;
    value: string;
    change: string;
    trend: 'up' | 'down';
  }[];
  alerts: {
    message: string;
    level: 'info' | 'warning' | 'critical';
  }[];
  waitingQueue: {
    patient: string;
    doctor: string;
    eta: string;
    status: string;
  }[];
};

const highlights: TotemSystemPayload['highlights'] = [
  { label: 'Consultas Hoje', value: '24', change: '+12%', trend: 'up' },
  { label: 'Pacientes Ativos', value: '1.247', change: '+8%', trend: 'up' },
  { label: 'Agendamentos', value: '156', change: '+18%', trend: 'up' },
  { label: 'Receita Mensal', value: 'R$ 45.2k', change: '-3%', trend: 'down' },
];

const alerts: TotemSystemPayload['alerts'] = [
  { message: '2 pacientes aguardando confirmação de pagamento', level: 'warning' },
  { message: 'Agenda do Dr. Paulo aproximando lotação máxima', level: 'info' },
  { message: 'Atualização pendente no módulo financeiro', level: 'critical' },
];

const waitingQueue: TotemSystemPayload['waitingQueue'] = [
  { patient: 'Marina Santos', doctor: 'Dra. Ana Costa', eta: '09:45', status: 'Aguardando triagem' },
  { patient: 'Sofia Castro', doctor: 'Dr. Paulo Lima', eta: '10:05', status: 'Em atendimento' },
  { patient: 'Julia Rocha', doctor: 'Dra. Ana Costa', eta: '10:30', status: 'Aguardando confirmação' },
];

export function chamarTotemUI(): TotemSystemPayload {
  return {
    timestamp: new Date().toISOString(),
    highlights,
    alerts,
    waitingQueue,
  };
}
