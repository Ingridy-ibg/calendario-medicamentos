import type { Criticidade } from '@/db/schema';

export type TipoAlvoNotificacao = 'dose' | 'pausa-ciclo';

/**
 * Quem agenda o alvo no aparelho (alarme-tela-cheia, design.md, decisão 4):
 * `notificacoes` é o `expo-notifications` (dose comum e lembrete de pausa);
 * `alarme` é o módulo nativo de alarme em tela cheia (dose especial).
 */
export type TipoAgendador = 'notificacoes' | 'alarme';

export function agendadorParaDose(criticidade: Criticidade): TipoAgendador {
  return criticidade === 'especial' ? 'alarme' : 'notificacoes';
}

export interface AlvoNotificacao {
  /**
   * Identificador determinístico e estável (usado como `identifier` do
   * expo-notifications) — permite ao reconciliador reconhecer, entre os
   * alarmes já agendados no SO, quais correspondem a qual alvo, sem precisar
   * de um id gerado pelo SO guardado à parte.
   */
  identifier: string;
  tipo: TipoAlvoNotificacao;
  dataHora: Date;
  agendador: TipoAgendador;
}

export interface NotificacaoAgendadaNoSistema {
  identifier: string;
  agendador: TipoAgendador;
}

export interface PlanoReconciliacao {
  agendar: AlvoNotificacao[];
  /** O que cancelar, e em qual agendador. */
  cancelar: NotificacaoAgendadaNoSistema[];
}

const PREFIXO_DOSE = 'dose:';
const PREFIXO_PAUSA = 'pausa:';

export function identificadorDose(doseId: string): string {
  return `${PREFIXO_DOSE}${doseId}`;
}

export function identificadorPausaCiclo(esquemaId: string, diaChaveISO: string): string {
  return `${PREFIXO_PAUSA}${esquemaId}:${diaChaveISO}`;
}

function pertenceAoApp(identifier: string): boolean {
  return identifier.startsWith(PREFIXO_DOSE) || identifier.startsWith(PREFIXO_PAUSA);
}

export type IdentificadorAnalisado =
  | { tipo: 'dose'; doseId: string }
  | { tipo: 'pausa-ciclo'; esquemaId: string };

/** Inverso de `identificadorDose`/`identificadorPausaCiclo` — usado ao aplicar o plano de fato. */
export function analisarIdentificador(identifier: string): IdentificadorAnalisado | null {
  if (identifier.startsWith(PREFIXO_DOSE)) {
    return { tipo: 'dose', doseId: identifier.slice(PREFIXO_DOSE.length) };
  }
  if (identifier.startsWith(PREFIXO_PAUSA)) {
    const [esquemaId] = identifier.slice(PREFIXO_PAUSA.length).split(':');
    return { tipo: 'pausa-ciclo', esquemaId };
  }
  return null;
}

/**
 * Compara o que deveria estar agendado (`desejados`, derivado do estado atual
 * do banco) contra o que de fato está agendado no SO, nos dois agendadores,
 * e produz um plano de diffs. Função pura — só orquestra `expo-notifications` a partir daqui é que
 * a camada de plataforma (`src/notifications`) aplica o plano de fato.
 *
 * `agendar` sempre inclui TODOS os desejados, mesmo que o identifier já
 * exista no SO: a camada de plataforma reagenda de forma idempotente
 * (cancela e recria — ver `agendamento.ts`), o que evita depender do formato
 * interno, não documentado publicamente, em que `expo-notifications` serializa
 * de volta o horário de um trigger já agendado só para decidir se está
 * "correto" — mais simples e robusto do que arriscar uma comparação frágil.
 * O número de alvos ativos de um app pessoal é sempre pequeno, então
 * reagendar tudo a cada rodada tem custo desprezível.
 *
 * Serve tanto para 5.3 (reconciliador da janela rolante, rodado a cada
 * abertura do app) quanto para 5.13 (recuperação após reboot): reagendar
 * "exatamente uma notificação por dose ativa" a partir da tabela `doses` é o
 * mesmo cálculo nos dois casos, independentemente do motivo que zerou os
 * alarmes do SO.
 *
 * Um id é cancelado em cada agendador em que não está desejado: quando a
 * criticidade de um medicamento muda (comum ↔ especial), o identificador da
 * dose continua o mesmo, mas o alvo troca de agendador, e o antigo sai do
 * outro (alarme-tela-cheia, design.md, decisão 4).
 */
export function planejarReconciliacao(
  desejados: AlvoNotificacao[],
  agendadosNoSistema: NotificacaoAgendadaNoSistema[],
): PlanoReconciliacao {
  const desejadosPorId = new Map(desejados.map((alvo) => [alvo.identifier, alvo]));

  const cancelar = agendadosNoSistema.filter(
    (n) => pertenceAoApp(n.identifier) && desejadosPorId.get(n.identifier)?.agendador !== n.agendador,
  );

  return { agendar: desejados, cancelar };
}
