import type { TipoEsquema } from '@/db/schema';

export interface ConteudoTipoEsquema {
  titulo: string;
  descricao: string;
  exemplo: string;
  pontos: string[];
}

/**
 * Explicação de cada tipo de esquema no modal de ajuda do formulário
 * (schedule-type-help; artboard "Info — tipos de esquema"). As chaves seguem
 * a ordem de `TIPOS_ESQUEMA`. Ao mudar as regras de um tipo, revise o texto.
 */
export const CONTEUDO_TIPOS_ESQUEMA: Record<TipoEsquema, ConteudoTipoEsquema> = {
  DIARIO: {
    titulo: 'Diário',
    descricao: 'Horários fixos, todos os dias.',
    exemplo: 'Losartana às 08:00 e 20:00',
    pontos: [
      'Cada horário é um compromisso separado: tomar uma dose mais cedo ou mais tarde não muda as outras.',
      'Pode ser de uso contínuo ou por um número de dias.',
    ],
  },
  INTERVALO_HORAS: {
    titulo: 'A cada X horas',
    descricao: 'Uma dose a cada intervalo de horas, o dia todo.',
    exemplo: 'Ibuprofeno a cada 8 horas',
    pontos: [
      'A próxima dose conta a partir de quando você tomou de fato, e não do horário previsto.',
      'Se você pular uma dose, a grade original continua.',
      'Pode ser de uso contínuo ou por um número de dias.',
    ],
  },
  DIAS_SEMANA: {
    titulo: 'Dias da semana',
    descricao: 'Horários fixos só em alguns dias da semana.',
    exemplo: 'Vitamina D seg, qua e sex às 14:00',
    pontos: [
      'Nos outros dias, nada aparece na agenda e nenhum lembrete toca.',
      'Pode ser de uso contínuo ou por um número de dias.',
    ],
  },
  CICLICO: {
    titulo: 'Cíclico',
    descricao: 'Alguns dias seguidos tomando, alguns dias de pausa e, então, uma nova cartela.',
    exemplo: 'anticoncepcional 21/7',
    pontos: [
      'Nos dias de pausa você recebe só um lembrete leve, sem precisar confirmar nada.',
      'A nova cartela começa quando você confirma o primeiro comprimido — o app não avança sozinho.',
      'Cíclicos têm sempre prioridade especial: o lembrete insiste até você confirmar.',
    ],
  },
  SE_NECESSARIO: {
    titulo: 'Se necessário',
    descricao: 'Sem horário fixo: você registra a dose quando tomar.',
    exemplo: 'Dipirona, até 4 por dia',
    pontos: [
      'Não há lembretes: a agenda mostra quantas doses você já registrou hoje.',
      'Ao passar do limite do dia, o app avisa e pede confirmação — mas não impede o registro.',
    ],
  },
};
