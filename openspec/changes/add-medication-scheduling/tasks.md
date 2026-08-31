## 1. Setup do projeto e da stack

- [x] 1.1 Configurar `expo-router` como navegação do projeto; verificar que uma rota de teste renderiza corretamente.
- [x] 1.2 Configurar NativeWind para estilo com Tailwind sobre componentes nativos; verificar que uma classe utilitária aplicada a um componente de teste reflete no estilo renderizado.
- [x] 1.3 Adicionar Zustand e criar a store inicial de estado de UI (ex: filtros da agenda, estado de formulários em edição); verificar com um teste que a store lê/escreve corretamente.
- [x] 1.4 Configurar Vitest para rodar testes do motor de agendamento sem simulador; verificar que `vitest run` executa um teste de exemplo com sucesso.
- [x] 1.5 Adicionar `date-fns` e `date-fns-tz`; verificar com um teste que uma operação de soma de horas e uma conversão de fuso produzem o resultado esperado.

## 2. Camada de dados local (Drizzle + expo-sqlite)

- [x] 2.1 Adicionar `expo-sqlite` e o Drizzle ORM com seu adaptador, e inicializar a conexão/migração de banco na abertura do app; verificar que o app inicia com o arquivo do banco criado e que uma etapa de migração roda sem erro.
- [x] 2.2 Criar a tabela `medicamentos` (id uuid, nome, dosagem, criticidade, quantidadeEmEstoque, quantidadePorEmbalagem, notificacoesAtivas, createdAt, updatedAt, deletedAt); verificar com um teste que uma linha pode ser inserida e lida de volta.
- [x] 2.3 Criar a tabela `esquemas` (id uuid, medicamentoId, tipo — DIARIO/INTERVALO_HORAS/DIAS_SEMANA/CICLICO/SE_NECESSARIO —, e as colunas de parâmetros específicas de cada tipo: horários, intervaloHoras, diasDaSemana, diasAtivos, diasPausa, dataInicioCiclo, duracaoDias/contínuo, limiteDiario); verificar com testes que um esquema de cada tipo pode ser inserido e lido com seus parâmetros corretos.
- [x] 2.4 Criar a tabela `doses` (id uuid, esquemaId, dataHoraPrevista nullable, status: pendente/aguardando/tomada/tomada com atraso/pulada/perdida, dataHoraRegistro nullable, contador de notificações sem resposta, numeroNoCiclo nullable, createdAt, updatedAt, deletedAt); verificar inserção/leitura/atualização em um teste.
- [x] 2.5 Implementar a regra "doses passadas (com dataHoraRegistro preenchido) nunca são sobrescritas pelo motor de agendamento, apenas doses futuras podem ser apagadas e regeneradas"; verificar com um teste de integração que editar um esquema não altera linhas de `doses` já registradas.

## 3. Motor de cálculo de doses (funções puras, conforme `specs/dose-scheduling`)

- [x] 3.1 Implementar `gerarDoses(esquema, de, ate, hoje)` para o tipo DIARIO (horários fixos, independentes entre si); verificar com um teste unitário que confirmar um horário atrasado não desloca os demais horários do dia.
- [x] 3.2 Implementar `gerarDoses` para o tipo INTERVALO_HORAS, incluindo a regra de reset pelo horário real de confirmação; verificar com testes unitários para confirmação adiantada e atrasada.
- [x] 3.3 Implementar `gerarDoses` para o tipo DIAS_SEMANA (horários fixos aplicados só nos dias configurados); verificar com um teste unitário que dias fora da lista configurada não geram dose.
- [x] 3.4 Implementar a regra de pular: marcar uma dose como "pulada" calcula a próxima dose a partir do horário fixo/originalmente previsto, não do horário em que foi pulada; verificar com um teste unitário para DIARIO e para INTERVALO_HORAS.
- [x] 3.5 Implementar o corte por duração fixa e a geração contínua para os tipos DIARIO, INTERVALO_HORAS e DIAS_SEMANA; verificar com testes unitários que o dia seguinte ao fim da duração não produz nova dose, e que um esquema contínuo nunca para.
- [x] 3.6 Implementar o algoritmo do tipo CICLICO como aritmética modular pura (`calcularStatusDoDia`), incluindo o rastreamento de posição (dia N de M) e o carve-out dos dias de pausa sem dose para confirmar; verificar com testes unitários cobrindo um dia ativo, o último dia ativo, um dia de pausa e a virada de pausa para novo ciclo, incluindo casos de borda (virada de mês, virada de ano, ano bissexto).
- [x] 3.7 Implementar o controle de início de ciclo: confirmar a primeira dose de uma nova cartela define uma nova data-âncora de dia 1 e recalcula as janelas de ativo/pausa; verificar com um teste unitário que confirmar após o fim da janela de pausa define uma âncora nova no horário de confirmação, e que sem essa confirmação o esquema permanece em espera.
- [x] 3.8 Implementar o tipo SE_NECESSARIO: nenhuma dose é pré-gerada; registrar uma dose grava apenas o horário real, e uma consulta compara o total de doses de hoje contra o limite diário configurado; verificar com testes unitários que nenhuma linha de dose pendente é criada automaticamente e que ultrapassar o limite emite um aviso sem bloquear o registro.
- [x] 3.9 Implementar a janela rolante: materializar no banco as doses das próximas 2 a 4 semanas a partir de cada esquema ativo; verificar com um teste de integração que a janela é preenchida corretamente ao criar um esquema e reajustada ao editá-lo.
- [x] 3.10 Conectar o motor para que toda resolução de dose (tomei agora / não tomar) grave a próxima linha de dose pendente pela regra correta do tipo de esquema; verificar de ponta a ponta com um teste de integração para cada um dos cinco tipos.

## 4. Cadastro de medicamentos (conforme `specs/medication-registration`)

- [x] 4.1 Construir o formulário de cadastro com os campos comuns (nome, dose, criticidade, quantidade em estoque, quantidade por embalagem) e um seletor de tipo de esquema; verificar renderizando o formulário e enviando com cada tipo selecionado.
- [x] 4.2 Construir os campos do esquema DIARIO (lista de horários, duração) com validação; verificar que ao menos um horário é exigido.
- [x] 4.3 Construir os campos do esquema INTERVALO_HORAS (intervalo em horas, duração) com validação; verificar que valores inválidos/ausentes são rejeitados antes do envio.
- [x] 4.4 Construir os campos do esquema DIAS_SEMANA (dias da semana, horários, duração) com validação; verificar que ao menos um dia e um horário são exigidos.
- [x] 4.5 Construir os campos do esquema CICLICO (dias ativos, dias de pausa, horário diário) com validação, e forçar a criticidade para especial independentemente do valor selecionado no controle de criticidade; verificar com um teste que enviar cíclico + comum persiste como especial.
- [x] 4.6 Construir o campo do esquema SE_NECESSARIO (limite diário) sem campos de horário/duração; verificar que o formulário não exibe campos irrelevantes para esse tipo.
- [x] 4.7 Implementar o fluxo de edição: atualizar os campos de um medicamento ou esquema afeta apenas a geração de doses futuras, nunca as linhas de `doses`/histórico já passadas; verificar editando um intervalo e confirmando que as linhas de histórico existentes permanecem inalteradas.
- [x] 4.8 Implementar o fluxo de remoção: excluir um medicamento cancela suas notificações pendentes e para a geração de doses futuras, mantendo intactas as linhas de seu histórico; verificar removendo um medicamento com doses pendentes e confirmando que as consultas de histórico ainda retornam seus registros passados.

## 5. Notificações (conforme `specs/dose-notifications`)

- [ ] 5.1 Adicionar `expo-notifications`, configurar os canais de notificação (dose regular, início/fim de pausa, estoque baixo), e solicitar `POST_NOTIFICATIONS`, `SCHEDULE_EXACT_ALARM` e a isenção de otimização de bateria na primeira abertura relevante; verificar que os pedidos de permissão aparecem nos pontos corretos em um dispositivo/emulador. **Implementado** (`src/notifications/canais.ts`, `permissoes.ts`, `inicializar.ts`); falta verificar em dispositivo/emulador real.
- [ ] 5.2 Solicitar a permissão de full-screen intent no primeiro cadastro de medicamento especial; verificar o fluxo de permissão em um dispositivo/emulador. **Implementado** (`solicitarPermissaoFullScreenIntent` chamada em `src/app/medicamento/novo.tsx`); falta verificar em dispositivo/emulador real.
- [ ] 5.3 Implementar o reconciliador da janela rolante: a cada abertura do app (e em tarefa de segundo plano quando possível), remover do sistema operacional alarmes já disparados e agendar exatamente uma notificação por dose ativa dentro da janela; verificar inspecionando os alarmes agendados após rodar o reconciliador. **Implementado e testado na camada pura** (`planejarReconciliacao`, `listarAlvosDesejados`); falta inspecionar alarmes reais em dispositivo/emulador.
- [ ] 5.4 Implementar o conjunto de ações do comum (tomei agora / adiar / não tomar) como ações de notificação, conectadas para atualizar a linha de `doses` e acionar o motor de cálculo; verificar que cada ação atualiza o status e calcula a próxima dose corretamente em um dispositivo/emulador. **Implementado e testado via harness** (`resolucao-por-notificacao.test.ts`); falta verificar as ações reais de notificação em dispositivo/emulador.
- [x] 5.5 Implementar a cascata de reenvio do comum: sem resposta em 30 minutos, incrementar o contador de sem resposta e reagendar +30 minutos, até 4 notificações no total, então marcar a dose como perdida e parar; verificar com um harness de teste simulando 4 janelas de silêncio.
- [x] 5.6 Implementar que o "adiar" explícito reagenda +30 minutos sem incrementar o contador de sem resposta; verificar com um teste simulando toques repetidos em "adiar".
- [x] 5.7 Implementar o conjunto de ações do especial (apenas tomei agora, sem pular) e reenvio infinito de 30 em 30 minutos sem resultado perdida; verificar com um harness de teste simulando muitas janelas de silêncio seguidas sem atingir nenhum limite.
- [ ] 5.8 Implementar a apresentação crítica/estilo alarme (full-screen intent / canal de alta prioridade) para notificações especiais, e a apresentação padrão para as comuns; verificar visualmente em um dispositivo/emulador que especiais e comuns se parecem e se comportam de forma diferente. **Implementado** (canal MAX + bypassDnd + permissão full-screen intent, `src/notifications/canais.ts`/`conteudo.ts`); falta verificar visualmente em dispositivo/emulador — expo-notifications não expõe full-screen intent nativo na API JS, só a permissão declarada, ver nota em `permissoes.ts`.
- [x] 5.9 Implementar o lembrete de dia de pausa do ciclo como uma notificação diária leve e sem ação, sempre no estilo leve mesmo para medicamentos especiais; verificar que a notificação de pausa de um cíclico especial usa o estilo leve, não o crítico.
- [x] 5.10 Confirmar que medicamentos SE_NECESSARIO nunca recebem notificação agendada; verificar com um teste que nenhum alarme é criado para esses medicamentos.
- [ ] 5.11 Garantir que o dispensar nativo de notificação do Android (swipe) não cancele nem altere o ciclo de reenvio; verificar arrastando uma notificação e confirmando que o próximo reenvio ainda dispara no horário previsto. **Implementado por construção** (a cascata só avança por entrega/resposta, nunca por um evento de dispensar — `tarefas.ts` não escuta esse evento); falta verificar arrastando uma notificação em dispositivo/emulador real.
- [ ] 5.12 Implementar a ativação/desativação de notificações por medicamento dentro do app; verificar desativando notificações de um medicamento e confirmando que suas doses continuam sendo geradas/resolvidas sem exibir notificação. **Capacidade implementada e testada** (`atualizarMedicamento` + reconciliador respeita `notificacoesAtivas`, ver `alvos.test.ts`); falta o controle "dentro do app" em si — adiado para as telas da fase 8, já que a única tela de medicamentos hoje (`novo.tsx`) será reestruturada em 8.1/8.2.
- [ ] 5.13 Implementar a recuperação após reboot: no `RECEIVE_BOOT_COMPLETED`, rederivar a próxima notificação pendente de cada medicamento a partir da tabela `doses` e rearmar exatamente um alarme por medicamento; verificar reiniciando um dispositivo/emulador de teste com doses pendentes. **Implementado via reconciliador idempotente + tarefa periódica do `expo-background-task`** (WorkManager sobrevive a reboot sozinho, ver nota em `tarefas.ts`), em vez de um `BroadcastReceiver` de boot próprio; falta verificar reiniciando um dispositivo/emulador real.

## 6. Histórico de adesão (conforme `specs/adherence-history`)

- [x] 6.1 Implementar a classificação de status na resolução da dose: tomada, tomada com atraso, pulada, perdida; verificar com testes unitários cobrindo cada caminho de classificação.
- [x] 6.2 Implementar o registro de doses SE_NECESSARIO sem horário previsto e sem os status atrasada/perdida; verificar com um teste que uma dose se necessário é sempre gravada como tomada, com horário previsto nulo.
- [x] 6.3 Implementar uma API de consulta de histórico (por medicamento, por intervalo de datas) lendo as linhas resolvidas de `doses`; verificar com um teste que remover ou editar um medicamento não altera as linhas de histórico já retornadas anteriormente.

## 7. Controle de estoque (conforme `specs/medication-stock`)

- [x] 7.1 Implementar o decremento automático do estoque em uma unidade ao confirmar uma dose como tomada; verificar com um teste unitário.
- [x] 7.2 Implementar a reposição manual de estoque (somar uma quantidade informada ao estoque atual); verificar com um teste unitário.
- [x] 7.3 Implementar o alerta de recompra quando o estoque cair abaixo da quantidade de uma embalagem, e sua remoção quando o estoque for reposto; verificar com testes unitários cobrindo a ativação e a remoção do alerta.

## 8. Telas de agenda (conforme `specs/agenda-views`)

- [ ] 8.1 Substituir as telas padrão do starter do Expo (`index`, `explore`) pelo ponto de entrada real de navegação do app para a agenda diária; verificar que o app abre diretamente na agenda diária.
- [ ] 8.2 Construir a tela de agenda diária listando as doses de hoje com status, a posição no ciclo para medicamentos cíclicos, o progresso do limite diário para medicamentos se necessário (com ação de registrar nova dose), e a sinalização de alerta de estoque; verificar visualmente com dados de teste cobrindo cada tipo de esquema.
- [ ] 8.3 Excluir da agenda diária os medicamentos de duração fixa já encerrada, mantendo-os consultáveis no histórico; verificar com dados de teste que um curso concluído não aparece hoje mas aparece no histórico.
- [ ] 8.4 Construir a tela de calendário mensal mostrando histórico registrado para dias passados e horário previsto para dias futuros (definitivo para diário/dias da semana/cíclico, estimado para intervalo em horas, ausente para se necessário); verificar visualmente navegando até um mês passado e um mês futuro com dados de teste.

## 9. Verificação de ponta a ponta

- [ ] 9.1 Percorrer manualmente o ciclo de vida completo em um dispositivo Android físico/emulado para um medicamento de cada tipo de esquema (diário, intervalo em horas, dias da semana, cíclico, se necessário) cruzando comum/especial onde aplicável: cadastrar, receber notificação (quando houver), responder, confirmar que a próxima dose resultante, o estoque e o registro de histórico estão corretos; documentar o resultado do percurso.
