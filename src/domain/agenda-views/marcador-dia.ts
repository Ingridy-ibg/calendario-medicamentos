import type { ThemeColor } from '@/constants/cores';
import type { StatusDose } from '@/db/schema';

import type { ItemDiaCalendario } from './calendario-mensal';

export interface MarcadorDia {
  token: ThemeColor;
  /**
   * `cheio` = histórico registrado; `contorno` = dose prevista ainda a
   * acontecer; `anel` = início de uma nova cartela (ponto com anel em volta).
   */
  estilo: 'cheio' | 'contorno' | 'anel';
}

/** Do pior para o melhor: o ponto do dia mostra o pior status registrado. */
const ORDEM: { status: StatusDose; token: ThemeColor }[] = [
  { status: 'perdida', token: 'statusPerdida' },
  { status: 'pulada', token: 'statusNeutro' },
  { status: 'tomada_com_atraso', token: 'statusAtraso' },
  { status: 'tomada', token: 'statusTomada' },
];

/**
 * Marcador de um dia no calendário mensal (specs/agenda-views): ponto
 * preenchido na cor do pior status registrado; contorno âmbar quando há dose
 * atrasada (e nenhuma perdida); ponto em contorno quando só há
 * doses previstas/pendentes; ponto cinza em contorno para dia de pausa. O
 * início de uma nova cartela num dia futuro tem marca própria, que vence a de
 * dose prevista mas perde para os status do histórico (inicio-de-cartela).
 */
export function marcadorDoDia(itens: ItemDiaCalendario[]): MarcadorDia | null {
  const historico = itens.filter((item) => item.tipo === 'historico');
  if (historico.some((item) => item.status === 'perdida')) return { token: 'statusPerdida', estilo: 'cheio' };
  // Dose ainda sem resposta e já atrasada: contorno âmbar (fix-late-and-calendar-status).
  if (historico.some((item) => item.atrasada)) return { token: 'statusAtraso', estilo: 'contorno' };
  for (const { status, token } of ORDEM) {
    if (historico.some((item) => item.status === status)) return { token, estilo: 'cheio' };
  }
  // Início de cartela: projetado num dia futuro, ou a dose de hoje ainda por vir (fix-revisao-inicio-de-cartela).
  const inicioDeHojePendente = historico.some(
    (item) => item.inicioDeCartela && (item.status === 'pendente' || item.status === 'aguardando'),
  );
  if (inicioDeHojePendente || itens.some((item) => item.tipo === 'inicio-cartela')) return { token: 'accent', estilo: 'anel' };
  const aguardando = historico.some((item) => item.status === 'pendente' || item.status === 'aguardando');
  if (aguardando || itens.some((item) => item.tipo === 'previsto')) return { token: 'accent', estilo: 'contorno' };
  if (itens.some((item) => item.tipo === 'pausa-ciclo')) return { token: 'statusNeutro', estilo: 'contorno' };
  return null;
}
