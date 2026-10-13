## 1. Modelo e funções puras do ciclo

- [x] 1.1 Adicionar `inicioCartelaPrevisto` (timestamp, nulo) em `esquemas` no `src/db/schema.ts`, gerar a migração Drizzle e expor o campo em `paraEsquemaDominio` e `EsquemaCiclico`. Verificar: `npx drizzle-kit generate` cria a migração e `npx tsc --noEmit` passa
- [x] 1.2 Implementar `inicioPrevistoDaCartela(esquema)` em `ciclico.ts` (derivado da âncora, ou da coluna sem âncora, sempre no horário do ciclo). Verificar: testes vitest para ciclo 21/7, ciclo sem pausa, sem âncora com coluna e sem âncora sem coluna (null)
- [x] 1.3 Implementar `ehInicioDeCartelaPendente(esquema, dose)`. Verificar: testes para dose de início pendente, dia 1 do cadastro em uso (não é início), dia 1 resolvido e início vencido de dias atrás
- [x] 1.4 Fazer `gerarDosesCiclico` emitir a dose `numeroNoCiclo = 1` no início previsto quando ele cai em `[de, ate]`, sem nunca emitir dias 2+ de ciclo não iniciado. Verificar: testes em `ciclico.test.ts` (fim da pausa dentro e fora da janela, sem âncora com coluna)
- [x] 1.5 Implementar `projetarCiclos(esquema, de, ate, hoje)` com a âncora de projeção `max(inicioPrevisto, hoje)` e repetição de ciclos. Verificar: testes cobrindo os cenários "Próxima cartela no mês", "Ciclos seguintes em meses à frente" e "Cartela atrasada" de specs/agenda-views

## 2. Janela rolante e confirmação

- [x] 2.1 Conferir que `substituirDosesFuturas` e `substituirDosesAPartirDe` não apagam doses pendentes anteriores ao início da janela, ajustando se preciso. Verificar: teste em que uma dose de início vencida de 2 dias atrás sobrevive à renovação e à edição
- [x] 2.2 Garantir que a edição do horário ou de dias ativos/pausa move a dose de início (via gerador). Verificar: teste do cenário "Horário editado durante a espera" de specs/dose-scheduling
- [x] 2.3 Generalizar `confirmarNovaCartelaCiclica` (resolver a dose de início no dia ou depois; apagar e seguir o fluxo atual antes do dia; zerar `inicioCartelaPrevisto`; materializar sem duplicar o dia 1). Verificar: testes dos cenários "Confirmação dois dias depois do previsto" e "Começando antes do previsto", e estoque −1 em ambos
- [x] 2.4 Em `aplicarRespostaDeNotificacao`, desviar `tomei_agora` de uma dose de início pendente para `confirmarNovaCartelaCiclica`. Verificar: teste do cenário "Confirmando pelo alarme" de specs/dose-notifications (ciclo iniciado e dose do dia 2 criada)
- [x] 2.5 Correção única na inicialização: cíclicos na agenda sem âncora e sem `inicioCartelaPrevisto` recebem hoje ou amanhã conforme o horário. Verificar: teste idempotente (rodar duas vezes não muda o resultado)

## 3. Notificações

- [ ] 3.1 Passar o indicador de início de cartela para `conteudoDose` e trocar título e corpo ("Nova cartela: <nome>" / "Hora de tomar o 1º comprimido da nova cartela"). Se `alarme-tela-cheia` já estiver implementada, aplicar o mesmo texto ao alarme nativo. Verificar: teste de conteúdo, e no aparelho o alarme do início mostra o texto novo
- [x] 3.2 Conferir que a dose de início entra nos alvos do reconciliador como especial (cascata indefinida) e fica fora deles com notificações desativadas. Verificar: testes em `alvos.test.ts` e `reconciliador.test.ts`

## 4. Calendário

- [x] 4.1 Trocar o laço `CICLICO` de `calendario-mensal.ts` por `projetarCiclos` e adicionar o `ItemDiaInicioCartela`. Verificar: testes em `calendario-mensal.test.ts` com os cenários de specs/agenda-views
- [ ] 4.2 Rotular no painel do dia o histórico com `numeroNoCiclo = 1` e o item futuro como "Início da nova cartela · HH:MM". Verificar: no app, o painel de um dia de início mostra o rótulo
- [ ] 4.3 Adicionar a marca de nova cartela em `marcador-dia.ts` (vence "previsto", perde para os status de histórico) e "Nova cartela" na legenda de `calendario.tsx`, seguindo o canvas. Verificar: testes em `marcador-dia.test.ts`, e no app o dia aparece destacado e a legenda tem o item

## 5. Agenda diária

- [x] 5.1 Em `agenda-diaria.ts`, adicionar `inicioPrevisto` e `atrasada` ao item `aguardando_cartela` e filtrar a dose de início pendente de `itensDose`. Verificar: testes em `agenda-diaria.test.ts` para "hoje às 22:00", "amanhã" e "atrasada desde 29/10", sem item duplicado
- [ ] 5.2 Mostrar em `src/app/(tabs)/index.tsx` o texto "Aguardando nova cartela · hoje às 22:00 / amanhã às 22:00 / atrasada desde dd/mm", com o atraso em âmbar e ícone. Verificar: no app, um cíclico em cada estado mostra o texto certo
- [x] 5.3 Conferir o resumo do dia (`resumo-dia.ts`) com uma dose de início pendente hoje: ela conta como dose agendada e aparece como próxima dose com o nome do medicamento. Verificar: teste em `resumo-dia`

## 6. Cadastro e volta à agenda

- [x] 6.1 Em `previa.ts`, calcular o modo de início do cíclico sem "em uso" (`hoje` ou `pergunta`) e aceitar a escolha (`ja_tomei` ou `amanha`) no plano, preenchendo `inicioCartelaPrevisto` ou `dataInicioCiclo` com `dosesTomadasHoje`. Verificar: testes para os 3 cenários de specs/medication-registration, com estoque inalterado em "Já tomei hoje"
- [x] 6.2 Aplicar o plano em `cadastrarMedicamento` e `adicionarAAgenda`. Verificar: teste de volta à agenda de um cíclico às 15:00 com início hoje às 22:00
- [ ] 6.3 Em `confirmar.tsx`, mostrar "Nova cartela: …" ou a pergunta com as duas opções, bloquear o "Confirmar e agendar" sem escolha e recalcular a prévia no toque. Verificar: no app, os cenários "Sem escolha" e "Horário passa com a tela aberta"

## 7. Verificação final

- [ ] 7.1 Rodar `npx vitest run`, `npx tsc --noEmit` e o lint. Verificar: tudo passa
- [ ] 7.2 Teste no aparelho (APK de preview): cadastrar um cíclico 1/1 com o horário daqui a 5 minutos, deixar o alarme de início tocar e reenviar, confirmar pelo alarme e conferir agenda, calendário (início e ciclos seguintes) e estoque. Verificar: todos os passos se comportam como nas specs
