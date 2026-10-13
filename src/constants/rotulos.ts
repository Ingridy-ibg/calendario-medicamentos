import type { ThemeColor } from '@/constants/cores';
import type { StatusDose } from '@/db/schema';

export const ROTULOS_STATUS_DOSE: Record<StatusDose, string> = {
  pendente: 'Pendente',
  aguardando: 'Aguardando resposta',
  tomada: 'Tomada',
  tomada_com_atraso: 'Tomada com atraso',
  pulada: 'Pulada',
  perdida: 'Perdida',
};

/**
 * Token de cor por status, reaproveitado na agenda diária, no calendário
 * mensal e no detalhe — resolva com `useTheme()` para respeitar o tema.
 */
export const TOKEN_STATUS_DOSE: Record<StatusDose, ThemeColor> = {
  pendente: 'statusNeutro',
  aguardando: 'statusAtraso',
  tomada: 'statusTomada',
  tomada_com_atraso: 'statusAtraso',
  pulada: 'statusNeutro',
  perdida: 'statusPerdida',
};

/** Fundo suave do ícone de status (ex.: o quadrado com ✓ na agenda). */
export const TOKEN_STATUS_DOSE_SUAVE: Record<StatusDose, ThemeColor> = {
  pendente: 'statusNeutroSoft',
  aguardando: 'statusAtrasoSoft',
  tomada: 'statusTomadaSoft',
  tomada_com_atraso: 'statusAtrasoSoft',
  pulada: 'statusNeutroSoft',
  perdida: 'statusPerdidaSoft',
};
