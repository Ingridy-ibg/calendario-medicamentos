import { eq } from 'drizzle-orm';

import { generateId } from '@/lib/id';

import { esquemas } from '../schema';
import type { AppDb } from './types';

interface CamposComuns {
  medicamentoId: string;
  duracaoDias?: number | null;
}

export type NovoEsquema =
  | (CamposComuns & { tipo: 'DIARIO'; horarios: string[] })
  | (CamposComuns & { tipo: 'INTERVALO_HORAS'; intervaloHoras: number })
  | (CamposComuns & { tipo: 'DIAS_SEMANA'; diasDaSemana: number[]; horarios: string[] })
  | (Omit<CamposComuns, 'duracaoDias'> & {
      tipo: 'CICLICO';
      diasAtivos: number;
      diasPausa: number;
      dataInicioCiclo: Date;
      horarios: string[];
    })
  | (Omit<CamposComuns, 'duracaoDias'> & { tipo: 'SE_NECESSARIO'; limiteDiario: number });

export function inserirEsquema(db: AppDb, dados: NovoEsquema) {
  const agora = new Date();
  const base = {
    id: generateId(),
    medicamentoId: dados.medicamentoId,
    tipo: dados.tipo,
    horarios: null as string[] | null,
    intervaloHoras: null as number | null,
    diasDaSemana: null as number[] | null,
    diasAtivos: null as number | null,
    diasPausa: null as number | null,
    dataInicioCiclo: null as Date | null,
    duracaoDias: null as number | null,
    limiteDiario: null as number | null,
    createdAt: agora,
    updatedAt: agora,
    deletedAt: null as Date | null,
  };

  const registro = (() => {
    switch (dados.tipo) {
      case 'DIARIO':
        return { ...base, horarios: dados.horarios, duracaoDias: dados.duracaoDias ?? null };
      case 'INTERVALO_HORAS':
        return { ...base, intervaloHoras: dados.intervaloHoras, duracaoDias: dados.duracaoDias ?? null };
      case 'DIAS_SEMANA':
        return {
          ...base,
          diasDaSemana: dados.diasDaSemana,
          horarios: dados.horarios,
          duracaoDias: dados.duracaoDias ?? null,
        };
      case 'CICLICO':
        return {
          ...base,
          diasAtivos: dados.diasAtivos,
          diasPausa: dados.diasPausa,
          dataInicioCiclo: dados.dataInicioCiclo,
          horarios: dados.horarios,
        };
      case 'SE_NECESSARIO':
        return { ...base, limiteDiario: dados.limiteDiario };
    }
  })();

  db.insert(esquemas).values(registro).run();
  return registro;
}

export function buscarEsquemaPorId(db: AppDb, id: string) {
  return db.select().from(esquemas).where(eq(esquemas.id, id)).get();
}
