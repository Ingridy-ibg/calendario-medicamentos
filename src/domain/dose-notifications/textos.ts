import type { Criticidade } from '@/db/schema';

export interface DadosTextoDose {
  nomeMedicamento: string;
  dosagem: string;
  criticidade: Criticidade;
  notificacoesSemResposta: number;
  /** Dose de início de uma nova cartela ainda não confirmada (inicio-de-cartela). */
  inicioDeCartela: boolean;
}

export interface TextosDose {
  titulo: string;
  corpo: string;
}

/**
 * Título e corpo do lembrete de uma dose — os mesmos para a notificação e
 * para o alarme dos especiais. O início de cartela deixa claro que é o 1º
 * comprimido de uma nova cartela (specs/dose-notifications, "Alarme de
 * início de nova cartela").
 */
export function textosDaDose(dados: DadosTextoDose): TextosDose {
  if (dados.inicioDeCartela) {
    return { titulo: `Nova cartela: ${dados.nomeMedicamento}`, corpo: 'Hora de tomar o 1º comprimido da nova cartela' };
  }
  const ehReenvio = dados.notificacoesSemResposta > 0;
  const titulo =
    dados.criticidade === 'especial'
      ? `⏰ Hora de tomar ${dados.nomeMedicamento}`
      : `${ehReenvio ? 'Lembrete: ' : ''}Hora de tomar ${dados.nomeMedicamento}`;
  return { titulo, corpo: dados.dosagem };
}
