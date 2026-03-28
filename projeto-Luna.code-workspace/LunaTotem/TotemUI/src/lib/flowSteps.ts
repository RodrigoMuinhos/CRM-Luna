export type FlowType = 'checkin' | 'payment';

export const FLOW_STEPS: Record<FlowType, string[]> = {
  checkin: [
    'Identificação',
    'Selecionar paciente',
    'Confirmar dados',
    'Pagamento',
    'Conclusão',
  ],
  payment: [
    'Identificação',
    'Pagamento',
    'Conclusão',
  ],
};

export const getFlowSteps = (flow: FlowType = 'checkin') => FLOW_STEPS[flow];
