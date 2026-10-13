import type { Criticidade } from '@/db/schema';

import type { ConteudoAjuda } from './ajuda';

/**
 * Explicação de cada prioridade de lembrete no modal de ajuda do formulário
 * (ajuda-prioridade-lembretes; artboard "Info — prioridade dos lembretes").
 * As chaves seguem a ordem de `CRITICIDADES`. Ao mudar as regras de
 * notificação ou do alarme, revise o texto.
 */
export const CONTEUDO_PRIORIDADES: Record<Criticidade, ConteudoAjuda> = {
  comum: {
    titulo: 'Comum',
    descricao: 'Uma notificação que vibra, com três respostas.',
    exemplo: 'Vitamina D às 14:00',
    pontos: [
      'Você responde direto na notificação: tomei agora, adiar 30 min ou não tomar.',
      'Sem resposta, ela volta a cada 30 min, até 4 vezes.',
      'Depois da 4ª sem resposta, a dose é marcada como perdida.',
      'A observação do remédio aparece só aqui no app.',
    ],
  },
  especial: {
    titulo: 'Especial',
    descricao: 'Um alarme em tela cheia, com som, até você confirmar.',
    exemplo: 'Anticoncepcional às 08:00',
    pontos: [
      'A única resposta é "Tomei agora": não dá para pular a dose.',
      'Silenciar só para o som; o alarme volta em 30 min até você confirmar.',
      'A dose nunca é marcada como perdida.',
      'A observação do remédio aparece na tela do alarme. Cíclicos são sempre especiais.',
    ],
  },
};
