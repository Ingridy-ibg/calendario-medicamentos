import { format, isSameDay } from 'date-fns';

import type { ResumoDoDia } from '@/domain/agenda-views/resumo-dia';
import { normalizarNome } from '@/domain/preferencias/preferencias';

export type Periodo = 'manha' | 'tarde' | 'noite';

/** specs/daily-greeting: 05:00–11:59 manhã, 12:00–17:59 tarde, 18:00–04:59 noite. */
export function periodoDoDia(agora: Date): Periodo {
  const hora = agora.getHours();
  if (hora >= 5 && hora < 12) return 'manha';
  if (hora >= 12 && hora < 18) return 'tarde';
  return 'noite';
}

const SAUDACOES: Record<Periodo, string> = { manha: 'Bom dia', tarde: 'Boa tarde', noite: 'Boa noite' };

export function primeiroNome(nome: string | null | undefined): string | null {
  return normalizarNome(nome)?.split(' ')[0] ?? null;
}

/** "Boa tarde, Ana!" — ou só "Boa tarde!" sem nome no perfil. */
export function textoSaudacao(periodo: Periodo, nome: string | null | undefined): string {
  const primeiro = primeiroNome(nome);
  return primeiro ? `${SAUDACOES[periodo]}, ${primeiro}!` : `${SAUDACOES[periodo]}!`;
}

export interface ResumoSaudacao {
  frase: string;
  cartao: { rotulo: string; dose: string } | null;
}

/** Frase e cartão da tela de saudação (specs/daily-greeting, "Conteúdo da tela de saudação"). */
export function resumoSaudacao(resumo: ResumoDoDia): ResumoSaudacao {
  if (resumo.total === 0) return { frase: 'Nenhuma dose agendada para hoje.', cartao: null };
  if (resumo.concluido || !resumo.proxima) return { frase: 'Tudo certo com as doses de hoje.', cartao: null };

  const pendentes = resumo.marcas.filter((status) => status === 'pendente' || status === 'aguardando').length;
  const resolvidas = resumo.total - pendentes;
  const horario = resumo.proxima.horario ? ` às ${format(resumo.proxima.horario, 'HH:mm')}` : '';
  const dose = `${resumo.proxima.nome}${horario}`;

  if (resolvidas === 0) {
    const doses = resumo.total === 1 ? '1 dose' : `${resumo.total} doses`;
    return { frase: `Você tem ${doses} hoje.`, cartao: { rotulo: 'Primeira dose', dose } };
  }
  if (pendentes === 1) {
    return { frase: 'Falta só 1 dose para fechar o dia.', cartao: { rotulo: 'Última dose de hoje', dose } };
  }
  return {
    frase: `${resumo.tomadas} de ${resumo.total} doses tomadas até agora.`,
    cartao: { rotulo: 'Próxima dose', dose },
  };
}

/**
 * Exibe só na primeira abertura comum de cada dia do calendário local: nunca
 * antes da boas-vindas nem quando o app foi aberto por uma notificação.
 */
export function deveExibirSaudacao(entrada: {
  agora: Date;
  ultimaExibicao: Date | null;
  boasVindasConcluida: boolean;
  abertoPorNotificacao: boolean;
}): boolean {
  if (!entrada.boasVindasConcluida || entrada.abertoPorNotificacao) return false;
  return entrada.ultimaExibicao === null || !isSameDay(entrada.ultimaExibicao, entrada.agora);
}
