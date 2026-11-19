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

// ---- dinheiro em centavos (a API de créditos trabalha em centavos) ----
export const cents = (value) => money((value ?? 0) / 100);

/** "1,50" | "1.50" | "R$ 1,50" -> 150 (centavos). Vazio ou inválido -> null. */
export function parseMoney(text) {
  const clean = String(text ?? '').replace(/[R$\s]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  if (clean === '') return null;
  const value = Number(clean);
  return Number.isFinite(value) && value >= 0 ? Math.round(value * 100) : null;
}

/** 150 -> "1,50" (para preencher campos de texto). */
export const moneyInput = (valueCents) => ((valueCents ?? 0) / 100).toFixed(2).replace('.', ',');

export const PURCHASE_STATUS = {
  pending: { label: 'Aguardando pagamento', tone: 'gray' },
  informed: { label: 'Pagamento informado', tone: 'amber' },
  confirmed: { label: 'Confirmada', tone: 'green' },
  rejected: { label: 'Recusada', tone: 'red' },
  cancelled: { label: 'Cancelada', tone: 'gray' },
  expired: { label: 'Vencida', tone: 'gray' },
};

export const WALLET_TYPE = {
  purchase: 'Compra de créditos',
  welcome: 'Boas-vindas',
  ride_fee: 'Taxa da corrida',
  ride_refund: 'Taxa devolvida (passageiro cancelou)',
  adjustment: 'Ajuste manual',
};

export const FEE_STATUS = {
  none: { label: 'Sem taxa', tone: 'gray' },
  pending: { label: 'A cobrar no aceite', tone: 'gray' },
  charged: { label: 'Cobrada', tone: 'green' },
  refunded: { label: 'Devolvida', tone: 'blue' },
};
