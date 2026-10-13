import { addNotificationResponseReceivedListener } from 'expo-notifications';

import { db } from '@/db/client';

import { configurarCanaisAndroid } from './canais';
import { configurarCategoriasAcao } from './categorias';
import { configurarComportamentoEmPrimeiroPlano } from './handler';
import { reconciliarNotificacoes } from './reconciliador';
import { processarResposta, registrarReconciliacaoPeriodica, registrarTarefaDeNotificacao } from './tarefas';

let ouvindoRespostas = false;

/**
 * Ponto de entrada único, chamado uma vez na abertura do app (ver
 * `src/app/_layout.tsx`): prepara canais/categorias/handler, registra a
 * tarefa de resposta em segundo plano, o ouvinte de respostas com o app
 * aberto e a reconciliação periódica, e roda o reconciliador imediatamente —
 * a rede de segurança da janela rolante (5.3) e da recuperação após reboot
 * (5.13), ver design.md.
 *
 * Nunca pede permissão: o único pedido automático é o da boas-vindas
 * (specs/onboarding); depois dela, só pelo "Permitir" do Perfil.
 */
export async function inicializarNotificacoes(): Promise<void> {
  configurarComportamentoEmPrimeiroPlano();
  await configurarCanaisAndroid();
  await configurarCategoriasAcao();
  // A tarefa de fundo só recebe as ações com o app em segundo plano ou
  // fechado; com ele aberto, a resposta chega apenas por este ouvinte.
  if (!ouvindoRespostas) {
    ouvindoRespostas = true;
    addNotificationResponseReceivedListener((resposta) => void processarResposta(resposta));
  }
  await registrarTarefaDeNotificacao();
  await registrarReconciliacaoPeriodica();
  await reconciliarNotificacoes(db);
}
