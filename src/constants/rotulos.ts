import type { StatusDose } from '@/db/schema';

export const ROTULOS_STATUS_DOSE: Record<StatusDose, string> = {
  pendente: 'Pendente',
  aguardando: 'Aguardando resposta',
  tomada: 'Tomada',
  tomada_com_atraso: 'Tomada com atraso',
  pulada: 'Pulada',
  perdida: 'Perdida',
};

/** Cor de texto por status, reaproveitada na agenda diária e no calendário mensal. */
export const CORES_STATUS_DOSE: Record<StatusDose, string> = {
  pendente: '#60646C',
  aguardando: '#b45309',
  tomada: '#16a34a',
  tomada_com_atraso: '#b45309',
  pulada: '#60646C',
  perdida: '#dc2626',
};
