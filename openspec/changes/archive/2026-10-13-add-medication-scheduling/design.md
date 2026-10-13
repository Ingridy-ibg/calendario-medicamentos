## Context

O aplicativo hoje é o starter padrão do Expo, sem modificações (`src/app/index.tsx`, `explore.tsx`, tabs padrão) — ainda não existe código de domínio. É Android-only, single-user, totalmente local (sem backend, sem sincronização). Veja `proposal.md` para a motivação completa; este documento cobre como construir o motor descrito em `specs/dose-scheduling`, `specs/dose-notifications`, `specs/medication-registration`, `specs/adherence-history`, `specs/medication-stock` e `specs/agenda-views`.

Três características do domínio tornam isso mais difícil que um lembrete recorrente típico:
1. Existem cinco tipos de esquema (diário, intervalo em horas, dias da semana, cíclico, se necessário), cada um com sua própria regra de "quando é a próxima dose" — alguns baseados em horário fixo do relógio, outros baseados no horário real da última confirmação.
2. O horário da próxima dose de um esquema de intervalo em horas só é conhecido depois que a dose atual é confirmada (nunca pré-calculado com muita antecedência).
3. Medicamentos especiais precisam reenviar a cada 30 minutos **para sempre** até serem confirmados, inclusive após reinício do app, reboot do aparelho e Doze/App Standby — isso não pode depender do app estar em memória.

## Goals / Non-Goals

**Goals:**
- Agendamento e entrega local confiáveis de notificações de dose, que sobrevivam ao encerramento do app e a reboots do aparelho.
- Uma única fonte de verdade para "qual é a próxima dose deste medicamento", lida tanto pelo agendador de notificações quanto pela interface.
- Notificações especiais que sejam de fato mais difíceis de ignorar que as comuns no Android.
- Um modelo de dados onde o histórico de doses passadas nunca é reescrito quando a regra do esquema muda.

**Non-Goals:**
- Qualquer backend, sincronização ou suporte a múltiplos dispositivos (embora o esquema de dados deixe a porta aberta — ver Decisions).
- Notificações push (tudo é local).
- Verificação de interação medicamentosa, compartilhamento de dados com terceiros (cuidador, familiar, médico), ou publicação em lojas de aplicativos.

## Decisions

### Stack técnica
| Camada | Tecnologia | Papel |
|---|---|---|
| Framework | Expo (React Native) + TypeScript | Base do aplicativo |
| Navegação | `expo-router` | Roteamento por arquivos |
| Estilo | NativeWind | Tailwind aplicado a componentes nativos |
| Banco local | `expo-sqlite` | Banco relacional embutido no dispositivo, sem servidor |
| ORM | Drizzle ORM | Camada de acesso a dados tipada, sem engine binário |
| Notificações | `expo-notifications` | Agendamento de lembretes locais sobre o AlarmManager do Android |
| Datas | `date-fns` + `date-fns-tz` | Aritmética de datas e fusos horários |
| Estado de UI | Zustand | Estado global leve; o banco continua sendo a fonte da verdade |
| Testes | Vitest | Testes automatizados do motor de agendamento, sem simulador |

**Drizzle em vez de Prisma**: o Prisma depende de um engine binário gerado que roda em Node.js num servidor; esse binário não é feito para o runtime do React Native (o motor Hermes) — existe suporte experimental, mas é uma fonte conhecida de instabilidade em produção. O Drizzle é apenas TypeScript que monta SQL, sem processo binário externo, e tem um adaptador oficial para `expo-sqlite`.

### Modelo de dados em três tabelas: `medicamentos`, `esquemas`, `doses`
A decisão de modelagem mais importante do projeto é separar três conceitos que, à primeira vista, parecem um só: o medicamento em si, a regra que diz quando ele deve ser tomado, e cada ocorrência concreta de uma dose em um dia e horário específicos.

| Camada | O que representa | Frequência de mudança |
|---|---|---|
| `medicamentos` | O que é: nome, dosagem, criticidade, estoque disponível | Raramente |
| `esquemas` | A regra de quando tomar — parâmetros, não uma lista de datas | Ocasional (quando a prescrição muda) |
| `doses` | Uma ocorrência concreta: data, horário e estado (pendente, tomada, pulada, perdida...) | Constante — uma ou mais por dia |

A razão prática: a regra é pequena e estável — muda apenas quando a prescrição muda. As doses são numerosas e mudam de estado o tempo todo. Com a separação, o histórico de doses é imutável quanto ao passado (nunca reescrito pelo motor de agendamento), e apenas as doses futuras são recalculadas quando o esquema muda — o que satisfaz diretamente os requisitos de `adherence-history` sobre o histórico sobreviver a edições.

`esquemas.tipo` é um enum (`DIARIO`, `INTERVALO_HORAS`, `DIAS_SEMANA`, `CICLICO`, `SE_NECESSARIO`) mais um conjunto de colunas de parâmetros específicas de cada tipo (nullable, já que cada linha usa só o subconjunto relevante ao seu tipo). Colunas dedicadas em vez de uma coluna JSON genérica: o número de tipos é pequeno e conhecido de antemão, e colunas tipadas permitem que o Drizzle valide a estrutura em tempo de compilação.

Nota sobre o tipo "duração fixa": a duração (número fixo de dias vs. uso contínuo) é modelada como um **atributo** dos tipos diário, intervalo em horas e dias da semana — não como um tipo de esquema à parte. Um tipo separado de "duração fixa" sem nenhum campo de horário não seria suficiente para saber quando as doses ocorrem (ex: um antibiótico de 7 dias ainda precisa de um horário ou intervalo definido); tratar duração como atributo evita essa ambiguidade.

`medicamentos` e `esquemas` carregam, além dos campos descritos acima, as colunas necessárias para as regras de criticidade e notificação já especificadas em `dose-notifications` (`criticidade`: comum/especial; `notificacoesAtivas`: booleano por medicamento) e para o controle de estoque de `medication-stock` (`quantidadeEmEstoque`, `quantidadePorEmbalagem`).

### Motor de cálculo como funções puras e testáveis
As regras de `dose-scheduling` são implementadas como funções puras, com a data "hoje"/"agora" recebida como parâmetro em vez de lida do relógio do sistema internamente — por exemplo `gerarDoses(esquema: Esquema, de: Date, ate: Date, hoje: Date): Dose[]`. Isso tem três consequências práticas:
- **Testável sem infraestrutura**: testes automatizados chamam a função diretamente, sem precisar de banco de dados, simulador ou celular físico.
- **Determinística**: a mesma entrada sempre produz a mesma saída, o que facilita depurar um caso reportado isolando exatamente a regra e a data envolvidas.
- **Reaproveitável**: a mesma função serve tanto para gerar a agenda real quanto para simular "o que aconteceria se eu mudasse este esquema" antes de confirmar a mudança.

Os casos de teste mais importantes não são os dias comuns, e sim as bordas: virada de mês, virada de ano, ano bissexto, horário de verão (quando ainda se aplicava no Brasil) e o próprio ponto de virada do ciclo (dia 21 para 22 e dia 28 para 1 no exemplo do 21/7).

### Motor de agendamento nunca fala diretamente com o sistema operacional
O motor (camada de domínio) apenas produz uma lista de doses a partir de uma regra e um intervalo de datas. Quem decide o que fazer com essa lista — salvar, agendar notificação, exibir na tela — são as camadas de fora (dados, plataforma, interface). Essa fronteira é o que garante que o motor possa ser testado isoladamente, sem banco de dados e sem simulador Android rodando.

### Janela rolante de agendamento
Em vez de calcular e agendar no sistema operacional todas as doses de um tratamento inteiro de uma vez, o app mantém uma **janela rolante**: o motor de agendamento materializa no banco as doses das próximas duas a quatro semanas, e um reconciliador — executado a cada abertura do app e, quando possível, em uma tarefa de segundo plano — remove do sistema operacional as notificações já disparadas e agenda as que entraram na janela. Isso evita agendar meses ou anos de notificações que provavelmente vão mudar antes de chegar a data (um horário ajustado, um medicamento trocado), e mantém o conjunto de alarmes agendados pequeno o suficiente para o Android gerenciar com folga. Esse reconciliador também serve de rede de segurança para a cascata de notificação por evento descrita abaixo.

### Entrega de notificações: `expo-notifications` sobre o AlarmManager do Android, reagendadas evento a evento
Dentro da janela rolante, cada dose ainda precisa de uma cascata de notificação cujo próximo passo depende de estado em tempo de execução (foi respondida? "adiar" foi tocado explicitamente ou foi silêncio?) — algo que não é conhecido no momento em que a dose é materializada. Por isso, o app agenda **uma notificação local de cada vez** por dose ativa, e reagenda a próxima (+30 min) a partir dos listeners de resposta/recebimento do `expo-notifications`, registrados via tarefa em segundo plano para disparar mesmo com o app fora do primeiro plano.

### Permissões do Android necessárias
- **`SCHEDULE_EXACT_ALARM`** (Android 12+, API 31): necessária para agendar uma notificação que dispare num horário exato. A partir do Android 13 (API 33), essa permissão não vem pré-concedida para apps que não são de alarme ou calendário — é preciso direcionar o usuário à tela "Alarmes e lembretes" nas configurações do sistema para concedê-la manualmente. Como este app é instalado diretamente no aparelho (sem passar pela revisão da Play Store), essa permissão pode ser solicitada diretamente, sem risco de rejeição.
- **Full-screen intent** (`USE_FULL_SCREEN_INTENT`): usada apenas para notificações de medicamentos especiais, para obter a apresentação estilo despertador, difícil de ignorar. Notificações comuns usam um canal padrão de alta importância, sem full-screen intent.
- **`POST_NOTIFICATIONS`** (Android 13+): permissão de execução para o próprio envio de notificações, solicitada ao usuário na primeira vez que o app tenta notificar.
- **Canais de notificação** (obrigatórios desde o Android 8): um canal por tipo de lembrete — dose regular, início/fim de pausa do ciclo, estoque baixo — para que o usuário possa silenciar cada tipo de forma independente.
- Todas são solicitadas/explicadas na primeira vez que o usuário cadastra um medicamento do tipo relevante (ou na primeira abertura do app, no caso do alarme exato e da isenção de otimização de bateria), não todas de uma vez, para que o pedido seja contextual.

### Recuperação após reboot
Ao reiniciar o aparelho (`RECEIVE_BOOT_COMPLETED`), o app rederiva a próxima notificação pendente de cada medicamento a partir do estado no banco (não de qualquer alarme do sistema previamente agendado, que se perde no reboot) e rearma exatamente um alarme por medicamento com dose pendente.

### Convenções de schema pensando em portabilidade futura
Mesmo sem sincronização hoje, duas decisões de schema mantêm essa porta aberta sem exigir reescrita depois: **chave primária UUID** em vez de auto-incremento (evita colisão de identificadores se, no futuro, o banco de dois dispositivos precisar ser mesclado), e **colunas `updatedAt` e `deletedAt` em toda tabela** (permitem soft delete hoje e, futuramente, sincronização incremental baseada em "o que mudou desde a última vez"). O custo de adicionar essas colunas agora é mínimo; o custo de adicioná-las depois, com dados reais em produção, é bem maior.

### Planejamento com OpenSpec
O desenvolvimento é conduzido com o OpenSpec (spec-driven development): cada mudança é organizada em proposta → especificação → design → tarefas, revisável em Markdown antes de qualquer código ser escrito — o que já está sendo seguido nesta própria mudança.

## Risks / Trade-offs

- **[Risco] O Android ainda pode atrasar ou descartar um alarme exato sob otimizações agressivas de bateria de algumas fabricantes (comum em certas skins Android), mesmo com `SCHEDULE_EXACT_ALARM`, e o modo Doze pode atrasar notificações que não usam alarme exato, especialmente com a tela desligada por longos períodos.** → Mitigação: na primeira abertura, uma tela explica por que a permissão de alarme exato e a isenção de otimização de bateria são necessárias, com um atalho direto para essas telas de configuração do sistema; essa é uma limitação conhecida e aceita de apps de medicação baseados em alarme local, sinalizada ao usuário em vez de presumida como totalmente confiável silenciosamente.
- **[Risco] Notificações de full-screen intent são mais invasivas e, se este app algum dia for distribuído pela Play Store, são restritas a apps que o Google classifica como de alarme/chamada.** → Mitigação: não é uma preocupação para uso pessoal/instalação manual (conforme proposal.md, este é um app de uso pessoal, sem publicação em loja); sinalizado aqui caso os planos de distribuição mudem no futuro.
- **[Risco] Reagendar "uma notificação de cada vez" a partir de um listener de resposta significa que uma falha na invocação do listener (ex: o sistema encerra o processo no momento errado) pode quebrar a cadeia.** → Mitigação: a recuperação após reboot e o reconciliador da janela rolante (executado a cada abertura do app) atuam como uma rede de segurança que autocorrige qualquer cadeia quebrada.

## Open Questions

- Texto/iconografia exata da notificação crítica especial (conteúdo da interface em tela cheia) — um detalhe de apresentação que não afeta nenhum requisito do spec, seguro para decidir durante a implementação.
- Se a "dia 1"/primeira dose inicial de um medicamento recém-cadastrado é agendada para "agora mesmo" ou exige que o usuário confirme explicitamente uma primeira dose no momento do cadastro — comportamento menor (afeta apenas a primeiríssima dose de um medicamento novo) e não muda nenhum outro requisito, podendo ser decidido durante a implementação de `medication-registration`.
- O limiar exato do alerta de recompra (hoje definido como "menos de uma embalagem completa") pode precisar ser configurável por medicamento no futuro, mas o valor fixo atual não muda nenhum outro requisito e pode ser ajustado depois sem impacto no restante do design.
