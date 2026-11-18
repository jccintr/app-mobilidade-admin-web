export const money = (value) =>
  Number(value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const dateTime = (value) =>
  value
    ? new Date(value).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
    : '—';

export const timeOnly = (value) =>
  value ? new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—';

export const DRIVER_STATUS = {
  incomplete: { label: 'Cadastro incompleto', tone: 'gray' },
  pending_approval: { label: 'Aguardando aprovação', tone: 'amber' },
  approved: { label: 'Aprovado', tone: 'green' },
  rejected: { label: 'Reprovado', tone: 'red' },
  blocked: { label: 'Bloqueado', tone: 'red' },
};

export const RIDE_STATUS = {
  requested: { label: 'Buscando motorista', tone: 'amber' },
  accepted: { label: 'Motorista a caminho', tone: 'blue' },
  arrived: { label: 'Motorista chegou', tone: 'blue' },
  in_progress: { label: 'Em andamento', tone: 'blue' },
  completed: { label: 'Concluída', tone: 'green' },
  cancelled: { label: 'Cancelada', tone: 'gray' },
  no_driver: { label: 'Sem motorista', tone: 'red' },
};

export const VEHICLE = { car: 'Carro' };
export const DOC_LABEL = { cnh: 'CNH', selfie: 'Selfie', crlv: 'CRLV' };
export const PAYMENT = { cash: 'Dinheiro', pix_direct: 'Pix direto ao motorista' };
export const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const vehicleText = (v) => (v ? [v.brand, v.model, v.color, v.plate].filter(Boolean).join(' · ') : '—');
