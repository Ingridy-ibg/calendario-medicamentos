## Why

Quando a pausa de um medicamento cíclico termina, o esquema fica "aguardando nova cartela" sem data: o calendário mensal fica vazio a partir daí e nenhum alarme toca no dia em que a nova cartela deveria começar. Esse é justamente o dia mais crítico de um cíclico, como um anticoncepcional: esquecer de começar a cartela é o erro mais comum, e hoje o app não ajuda a evitá-lo.

## What Changes

- **Início previsto da nova cartela**: todo cíclico na agenda passa a ter uma data prevista para o início da próxima cartela:
  - o dia seguinte ao fim da pausa, quando há ciclo em andamento;
  - a data escolhida no cadastro ou na volta à agenda, quando ainda não há ciclo.
- **Dose de início de cartela**: no dia previsto, no horário do ciclo, existe uma dose real (dia 1 da nova cartela). Como todo cíclico é especial, ela:
  - toca como alarme especial;
  - só oferece "Tomei agora";
  - repete a cada 30 minutos até ser confirmada, mesmo atravessando dias;
  - nunca vira perdida.

  Confirmar essa dose, pela notificação ou pelo "Comecei a nova cartela" da agenda, inicia o ciclo como hoje: o dia 1 é o horário da confirmação. Os dias 2 em diante só são agendados depois da confirmação.
- **Calendário projeta os ciclos seguintes**: o calendário mensal mostra o dia de início da nova cartela com destaque e projeta, a partir dele, os dias ativos e de pausa dos ciclos seguintes até o fim do mês exibido. Se a cartela estiver atrasada, a projeção supõe que ela começa hoje.
- **Cadastro e volta à agenda definem o primeiro início**: para um cíclico novo, ou que volta à agenda, o primeiro início depende do horário do ciclo:
  - se o horário de hoje ainda não passou, o início é hoje;
  - se já passou, a tela "Confira antes de salvar" pergunta "Já tomei hoje" ou "Começo amanhã".
    - "Já tomei hoje" inicia o ciclo hoje, com a dose do dia 1 registrada como tomada no horário do ciclo.
    - "Começo amanhã" agenda o início para amanhã.
- **BREAKING (comportamento)**: o cíclico deixa de ficar "aguardando nova cartela" sem data e sem alarme. O estado de espera continua existindo, mas sempre com uma dose de início agendada.

## Capabilities

### New Capabilities
<!-- nenhuma -->

### Modified Capabilities
- `dose-scheduling`:
  - início previsto da nova cartela e dose de início de cartela;
  - a confirmação dessa dose inicia o ciclo;
  - a renovação da janela gera a dose de início;
  - "Voltar à agenda" do cíclico passa a definir o início.
- `dose-notifications`: a dose de início de cartela tem alarme e conteúdo próprio, e segue as regras do especial.
- `agenda-views`:
  - o calendário mostra o início de cartela e projeta os ciclos seguintes;
  - a agenda mostra a dose de início no lugar do "Aguardando nova cartela", inclusive quando ela está atrasada de dias anteriores.
- `medication-registration`: a confirmação do cadastro de um cíclico novo pergunta "Já tomei hoje" ou "Começo amanhã" quando o horário de hoje já passou, e mostra a data de início da cartela.

## Impact

- `src/db/schema.ts` e uma nova migração: o esquema guarda a data prevista do início quando ainda não há ciclo.
- `src/domain/dose-scheduling`: `ciclico.ts` (data prevista do início e projeção), `janela-rolante.ts` (gera a dose de início) e `resolucao.ts` (`confirmarNovaCartelaCiclica` resolve a dose de início existente).
- `src/domain/dose-notifications/resolucao-por-notificacao.ts`: "Tomei agora" numa dose de início de cartela inicia o ciclo.
- `src/notifications/conteudo.ts`: texto do alarme de início de cartela.
- `src/domain/agenda-views`: `calendario-mensal.ts` (novo item de início de cartela e projeção), `marcador-dia.ts`, `agenda-diaria.ts` e o painel do dia em `src/app/(tabs)/calendario.tsx`.
- `src/domain/medication-registration`: `previa.ts`, `registration.ts` (`cadastrarMedicamento`, `adicionarAAgenda`) e `src/app/medicamento/confirmar.tsx`.
- Combina com `alarme-tela-cheia` sem dependência: a dose de início é especial e usa o agendador do especial, qualquer que seja a change implementada primeiro.
