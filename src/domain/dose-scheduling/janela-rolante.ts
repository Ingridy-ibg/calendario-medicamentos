import { addDays, addWeeks, max, startOfDay } from 'date-fns';

import {
  inserirDose,
  listarDosesPorEsquema,
  type NovaDose,
  substituirDosesAPartirDe,
  substituirDosesFuturas,
} from '@/db/repositories/doses';
import { listarEsquemasAtivos, paraEsquemaDominio } from '@/db/repositories/esquemas';
import type { AppDb } from '@/db/repositories/types';

import { gerarDosesCiclico } from './ciclico';
import { gerarDosesDiario } from './diario';
import { gerarDosesDiasSemana } from './dias-semana';
import type { DoseGerada, Esquema } from './types';

export const SEMANAS_JANELA_MINIMA = 2;
export const SEMANAS_JANELA_MAXIMA = 4;

/**
 * INTERVALO_HORAS e SE_NECESSARIO não têm grade pré-calculável (ver
 * design.md e specs/dose-scheduling) — não fazem parte da janela rolante.
 */
function gerarDosesParaJanela(esquema: Esquema, de: Date, ate: Date): DoseGerada[] | null {
  switch (esquema.tipo) {
    case 'DIARIO':
      return gerarDosesDiario(esquema, de, ate);
    case 'DIAS_SEMANA':
      return gerarDosesDiasSemana(esquema, de, ate);
    case 'CICLICO':
      return gerarDosesCiclico(esquema, de, ate);
    case 'INTERVALO_HORAS':
    case 'SE_NECESSARIO':
      return null;
  }
}

/**
 * Materializa no banco as doses futuras de um esquema dentro da janela
 * rolante [hoje, hoje + semanas]. Usa `substituirDosesFuturas`, que nunca
 * apaga uma dose já resolvida (ver regra 2.5) — por isso é seguro chamar
 * tanto na criação do esquema quanto após editá-lo.
 */
export function materializarJanela(
  db: AppDb,
  esquema: Esquema,
  hoje: Date,
  semanas: number = SEMANAS_JANELA_MAXIMA,
) {
  const dosesGeradas = gerarDosesParaJanela(esquema, hoje, addWeeks(hoje, semanas));
  if (dosesGeradas === null) {
    return [];
  }

  return substituirDosesFuturas(
    db,
    esquema.id,
    dosesGeradas.map(
      (dose): NovaDose => ({
        esquemaId: esquema.id,
        dataHoraPrevista: dose.dataHoraPrevista,
        numeroNoCiclo: dose.numeroNoCiclo ?? null,
      }),
    ),
  );
}

/**
 * Variante de `materializarJanela` para a edição de um esquema: refaz só as
 * doses de horário depois de `agora`, deixando intactas as pendentes cujo
 * horário já passou (manage-medications, decisão 4).
 */
export function rematerializarJanelaAposEdicao(db: AppDb, esquema: Esquema, agora: Date) {
  const geradas = gerarDosesParaJanela(esquema, agora, addWeeks(agora, SEMANAS_JANELA_MAXIMA));
  if (geradas === null) return [];
  return substituirDosesAPartirDe(
    db,
    esquema.id,
    agora,
    geradas.map((dose): NovaDose => ({
      esquemaId: esquema.id,
      dataHoraPrevista: dose.dataHoraPrevista,
      numeroNoCiclo: dose.numeroNoCiclo ?? null,
    })),
  );
}

/**
 * Mantém a janela rolante viva (change fix-cyclic-and-rolling-window): se a
 * última dose prevista do esquema estiver a menos de `SEMANAS_JANELA_MINIMA`
 * semanas de `agora`, gera as doses até `SEMANAS_JANELA_MAXIMA` semanas à
 * frente e **só insere as que faltam** — nunca apaga nem altera doses
 * existentes (ao contrário de `materializarJanela`, que substitui as não
 * resolvidas e por isso não serve para rodar a cada abertura). Dias já
 * passados não são preenchidos; o dia de hoje é. Esquemas sem grade
 * (intervalo em horas, se necessário) e cíclicos em espera não geram nada.
 */
export function renovarJanela(db: AppDb, esquema: Esquema, agora: Date): number {
  const existentes = listarDosesPorEsquema(db, esquema.id).filter((dose) => dose.dataHoraPrevista !== null);
  const ultimaPrevista = existentes.reduce<Date | null>(
    (maior, dose) => (maior === null || dose.dataHoraPrevista! > maior ? dose.dataHoraPrevista! : maior),
    null,
  );
  if (ultimaPrevista && ultimaPrevista >= addWeeks(agora, SEMANAS_JANELA_MINIMA)) {
    return 0;
  }

  const inicio = ultimaPrevista ? max([addDays(startOfDay(ultimaPrevista), 1), startOfDay(agora)]) : startOfDay(agora);
  const geradas = gerarDosesParaJanela(esquema, inicio, addWeeks(agora, SEMANAS_JANELA_MAXIMA));
  if (!geradas) return 0;

  const jaExiste = new Set(existentes.map((dose) => dose.dataHoraPrevista!.getTime()));
  let inseridas = 0;
  for (const dose of geradas) {
    if (jaExiste.has(dose.dataHoraPrevista.getTime())) continue;
    inserirDose(db, { esquemaId: esquema.id, dataHoraPrevista: dose.dataHoraPrevista, numeroNoCiclo: dose.numeroNoCiclo ?? null });
    inseridas++;
  }
  return inseridas;
}

/** Renova a janela de todo esquema ativo — na abertura do app, na volta ao primeiro plano e na tarefa periódica. */
export function renovarJanelasAtivas(db: AppDb, agora: Date = new Date()): number {
  return listarEsquemasAtivos(db).reduce((total, linha) => total + renovarJanela(db, paraEsquemaDominio(linha), agora), 0);
}
