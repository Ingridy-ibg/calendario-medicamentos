import { db } from '@/db/client';

import { configurarCanaisAndroid } from './canais';
import { configurarCategoriasAcao } from './categorias';
import { configurarComportamentoEmPrimeiroPlano } from './handler';
import { solicitarPermissoesEssenciais } from './permissoes';
import { reconciliarNotificacoes } from './reconciliador';
import { registrarReconciliacaoPeriodica, registrarTarefaDeNotificacao } from './tarefas';

/**
 * Ponto de entrada único, chamado uma vez na abertura do app (ver
 * `src/app/_layout.tsx`): prepara canais/categorias/handler, solicita as
 * permissões essenciais (5.1), registra a tarefa de resposta em segundo
 * plano e a reconciliação periódica, e roda o reconciliador imediatamente —
 * a rede de segurança da janela rolante (5.3) e da recuperação após reboot
 * (5.13), ver design.md.
 */
export async function inicializarNotificacoes({ pedirPermissoes }: { pedirPermissoes: boolean }): Promise<void> {
  configurarComportamentoEmPrimeiroPlano();
  await configurarCanaisAndroid();
  await configurarCategoriasAcao();
  // Antes de a boas-vindas ser concluída, nenhum pedido automático (specs/onboarding).
  if (pedirPermissoes) {
    await solicitarPermissoesEssenciais();
  }
  await registrarTarefaDeNotificacao();
  await registrarReconciliacaoPeriodica();
  await reconciliarNotificacoes(db);
}
