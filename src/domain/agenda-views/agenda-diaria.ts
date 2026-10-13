import { addDays, format, isSameDay, startOfDay } from 'date-fns';

import { contarDosesRegistradasNoIntervalo, listarDosesDoIntervalo, STATUS_NAO_RESOLVIDOS } from '@/db/repositories/doses';
import { listarEsquemasAtivos, listarEsquemasNaoRemovidos, paraEsquemaDominio } from '@/db/repositories/esquemas';
import { buscarMedicamentoPorId } from '@/db/repositories/medicamentos';
import type { AppDb } from '@/db/repositories/types';
import type { StatusDose } from '@/db/schema';
import { estaAtrasada } from '@/domain/adherence-history/classificacao';
import { calcularStatusDoDia, ehInicioDeCartelaPendente, inicioPrevistoDaCartela } from '@/domain/dose-scheduling/ciclico';
import { combinarDataEHorario } from '@/domain/dose-scheduling/horario';
import { type AlertaEstoque, alertaVisivelNaLista } from '@/domain/medication-stock/alerta';
import { alertaEstoqueDoMedicamento } from '@/domain/medication-stock/situacao';

export interface ItemAgendaDose {
  tipo: 'dose';
  doseId: string;
  esquemaId: string;
  medicamentoId: string;
  nome: string;
  dosagem: string;
  horario: Date | null;
  status: StatusDose;
  /** Quando a dose foi resolvida (ex.: horário real de uma tomada com atraso). */
  horarioRegistro: Date | null;
  /** Não resolvida e mais de 30 min depois do horário (fix-late-and-calendar-status). */
  atrasada: boolean;
  /** Só para CICLICO com dose hoje — dia de pausa não tem dose para confirmar (ver `dose-scheduling/ciclico.ts`). */
  posicaoCiclo: { dia: number; totalDiasAtivos: number } | null;
  /** Estoque insuficiente, baixo ou baixo leve (a sobra só aparece no detalhe). */
  alertaEstoque: AlertaEstoque;
}

export interface ItemAgendaSeNecessario {
  tipo: 'se_necessario';
  esquemaId: string;
  medicamentoId: string;
  nome: string;
  dosagem: string;
  registradasHoje: number;
  limiteDiario: number;
  /** Estoque insuficiente, baixo ou baixo leve (a sobra só aparece no detalhe). */
  alertaEstoque: AlertaEstoque;
}

/**
 * Cíclico sem ciclo em andamento (recém-cadastrado ou depois do fim da
 * pausa): aparece para o usuário iniciar a nova cartela (change
 * fix-cyclic-and-rolling-window). A dose de início de cartela pendente não
 * vira um item à parte — este item a representa (inicio-de-cartela).
 */
export interface ItemAgendaAguardandoCartela {
  tipo: 'aguardando_cartela';
  esquemaId: string;
  medicamentoId: string;
  nome: string;
  dosagem: string;
  /** Hoje no horário do ciclo — define a seção (manhã/tarde/noite) e a ordem. */
  horario: Date | null;
  /** Dia e horário previstos para o início da nova cartela (`null` sem data definida). */
  inicioPrevisto: Date | null;
  /** O início previsto já passou há mais de 30 minutos (mesma tolerância das doses). */
  atrasada: boolean;
  /** O início previsto é hoje: conta no resumo do dia como dose agendada. */
  inicioHoje: boolean;
  /** Estoque insuficiente, baixo ou baixo leve (a sobra só aparece no detalhe). */
  alertaEstoque: AlertaEstoque;
}

/**
 * O início da nova cartela está atrasado: a mesma regra das doses
 * (`estaAtrasada`, mais de 30 min depois do horário). Avaliado com o `agora`
 * de quem exibe, para valer também com a agenda já aberta
 * (fix-revisao-inicio-de-cartela).
 */
export function inicioAtrasado(inicioPrevisto: Date | null, agora: Date): boolean {
  return inicioPrevisto !== null && estaAtrasada({ dataHoraPrevista: inicioPrevisto, status: 'pendente' }, agora);
}

/**
 * Quando começa a nova cartela, para a agenda (specs/agenda-views): "hoje às
 * 22:00", "amanhã às 22:00", "atrasada desde 29/10" ou, mais adiante,
 * "em 05/11 às 22:00". `null` quando não há início definido.
 */
export function textoInicioPrevisto(item: Pick<ItemAgendaAguardandoCartela, 'inicioPrevisto'>, agora: Date): string | null {
  const { inicioPrevisto } = item;
  if (!inicioPrevisto) return null;
  if (inicioAtrasado(inicioPrevisto, agora)) return `atrasada desde ${format(inicioPrevisto, 'dd/MM')}`;
  const horario = format(inicioPrevisto, 'HH:mm');
  if (isSameDay(inicioPrevisto, agora)) return `hoje às ${horario}`;
  if (isSameDay(inicioPrevisto, addDays(agora, 1))) return `amanhã às ${horario}`;
  return `em ${format(inicioPrevisto, 'dd/MM')} às ${horario}`;
}

export type ItemAgenda = ItemAgendaDose | ItemAgendaSeNecessario | ItemAgendaAguardandoCartela;

/**
 * Monta a agenda diária (specs/agenda-views): toda dose com horário previsto
 * hoje, na ordem do horário, seguida dos medicamentos "se necessário" (sem
 * horário, sempre disponíveis para registrar). Um medicamento de duração
 * fixa já encerrada simplesmente não tem linha de dose hoje — o motor de
 * agendamento nunca a materializa (ver `dose-scheduling/duracao.ts`), então
 * ele já sai da agenda sem nenhum filtro extra aqui.
 */
export function montarAgendaDoDia(db: AppDb, hoje: Date): ItemAgenda[] {
  const inicioDoDia = startOfDay(hoje);
  const fimDoDia = addDays(inicioDoDia, 1);

  // "Se necessário" e "aguardando nova cartela" só na agenda; as doses de hoje
  // vêm de todo esquema não removido, para que as já resolvidas de um
  // medicamento retirado da agenda continuem aparecendo, como no calendário
  // (fix-agenda-membership-review). De um fora da agenda só entram as
  // resolvidas (fix-agenda-membership-review-2, decisão 6).
  const esquemas = listarEsquemasAtivos(db);
  const esquemasPorId = new Map(listarEsquemasNaoRemovidos(db).map((esquema) => [esquema.id, esquema]));

  // Um alerta por esquema (um esquema pode ter várias doses hoje); `hoje` é o "agora" de quem abre a agenda.
  const alertas = new Map<string, AlertaEstoque>();
  const alertaDe = (linha: (typeof esquemas)[number], medicamento: { quantidadeEmEstoque: number; quantidadePorEmbalagem: number; naAgenda: boolean }) => {
    if (!alertas.has(linha.id)) {
      alertas.set(linha.id, alertaVisivelNaLista(alertaEstoqueDoMedicamento(db, paraEsquemaDominio(linha), medicamento, hoje)));
    }
    return alertas.get(linha.id) ?? null;
  };

  const itensDose: ItemAgendaDose[] = listarDosesDoIntervalo(db, inicioDoDia, fimDoDia).flatMap((dose) => {
    const esquema = esquemasPorId.get(dose.esquemaId);
    if (!esquema) return [];
    const medicamento = buscarMedicamentoPorId(db, esquema.medicamentoId);
    if (!medicamento || medicamento.deletedAt) return [];
    if (!medicamento.naAgenda && STATUS_NAO_RESOLVIDOS.includes(dose.status)) return [];
    // A dose de início de cartela pendente é representada pelo item "aguardando nova cartela".
    if (esquema.tipo === 'CICLICO') {
      const ciclico = paraEsquemaDominio(esquema);
      if (ciclico.tipo === 'CICLICO' && ehInicioDeCartelaPendente(ciclico, dose)) return [];
    }

    return [
      {
        tipo: 'dose' as const,
        doseId: dose.id,
        esquemaId: esquema.id,
        medicamentoId: medicamento.id,
        nome: medicamento.nome,
        dosagem: medicamento.dosagem,
        horario: dose.dataHoraPrevista,
        status: dose.status,
        horarioRegistro: dose.dataHoraRegistro,
        atrasada: estaAtrasada(dose, hoje),
        posicaoCiclo:
          esquema.tipo === 'CICLICO' && dose.numeroNoCiclo !== null
            ? { dia: dose.numeroNoCiclo, totalDiasAtivos: esquema.diasAtivos ?? 0 }
            : null,
        alertaEstoque: alertaDe(esquema, medicamento),
      },
    ];
  });

  const itensSeNecessario: ItemAgendaSeNecessario[] = esquemas
    .filter((esquema) => esquema.tipo === 'SE_NECESSARIO')
    .flatMap((esquema) => {
      const medicamento = buscarMedicamentoPorId(db, esquema.medicamentoId);
      if (!medicamento || medicamento.deletedAt) return [];

      return [
        {
          tipo: 'se_necessario' as const,
          esquemaId: esquema.id,
          medicamentoId: medicamento.id,
          nome: medicamento.nome,
          dosagem: medicamento.dosagem,
          registradasHoje: contarDosesRegistradasNoIntervalo(db, esquema.id, inicioDoDia, fimDoDia),
          limiteDiario: esquema.limiteDiario ?? 0,
          alertaEstoque: alertaDe(esquema, medicamento),
        },
      ];
    });

  const itensAguardandoCartela: ItemAgendaAguardandoCartela[] = esquemas
    .filter((esquema) => esquema.tipo === 'CICLICO')
    .flatMap((linha) => {
      const esquema = paraEsquemaDominio(linha);
      if (esquema.tipo !== 'CICLICO' || calcularStatusDoDia(esquema, hoje).fase !== 'em_espera') return [];
      const medicamento = buscarMedicamentoPorId(db, esquema.medicamentoId);
      if (!medicamento || medicamento.deletedAt) return [];
      const [horario] = esquema.horarios;
      const inicioPrevisto = inicioPrevistoDaCartela(esquema);

      return [
        {
          tipo: 'aguardando_cartela' as const,
          esquemaId: esquema.id,
          medicamentoId: medicamento.id,
          nome: medicamento.nome,
          dosagem: medicamento.dosagem,
          horario: horario ? combinarDataEHorario(inicioDoDia, horario) : null,
          inicioPrevisto,
          atrasada: inicioAtrasado(inicioPrevisto, hoje),
          inicioHoje: inicioPrevisto !== null && isSameDay(inicioPrevisto, hoje),
          alertaEstoque: alertaDe(linha, medicamento),
        },
      ];
    });

  itensDose.sort((a, b) => (a.horario?.getTime() ?? 0) - (b.horario?.getTime() ?? 0));
  itensSeNecessario.sort((a, b) => a.nome.localeCompare(b.nome));

  return [...itensDose, ...itensAguardandoCartela, ...itensSeNecessario];
}
