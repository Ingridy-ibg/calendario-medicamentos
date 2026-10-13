## 1. Banco e domínio

- [ ] 1.1 Adicionar `na_agenda` (boolean, padrão `true`) a `medicamentos`, gerar a migração e atualizar `drizzle/migrations.js`; verificar com `create-test-db.ts` que medicamentos novos e existentes ficam na agenda.
- [ ] 1.2 Fazer `listarEsquemasAtivos` ignorar medicamentos fora da agenda; verificar com testes que agenda, calendário (só futuro), `renovarJanelasAtivas` e `listarAlvosDesejados` deixam de incluir um medicamento fora da agenda e que o histórico passado continua no calendário.
- [ ] 1.3 Implementar `retirarDaAgenda` e `adicionarAAgenda`; verificar com testes: retirar apaga pendentes e mantém resolvidas; voltar com tratamento de 7 dias em 12/10 gera doses de 12/10 a 18/10; voltar às 10:00 não cria a dose das 08:00 de hoje; cíclico volta aguardando nova cartela; edição fora da agenda não gera doses.
- [ ] 1.4 Dar a `cadastrarMedicamento` a opção `naAgenda: false` (sem doses, ignorando "em uso"); verificar com teste que o medicamento fica fora da agenda e sem doses.
- [ ] 1.5 Implementar `listarMedicamentosComEsquema` (fora da agenda por último) e `filtrarEPaginar`; verificar com testes de ordem, dos três filtros e de 45 itens em páginas de 20.

## 2. Telas

- [ ] 2.1 Detalhe: rodapé com "Retirar da agenda"/"Adicionar à agenda" à esquerda e "Excluir" à direita, confirmação ao retirar, interruptor de notificações oculto fora da agenda e selo "Fora da agenda"; verificar no app os dois estados.
- [ ] 2.2 Confirmação: interruptor "Adicionar à agenda" no cadastro (esconde os blocos de agenda quando desligado) e modo "voltar à agenda" com "Editar" e "Adicionar à agenda"; verificar no app cadastrando sem agenda e voltando um medicamento para a agenda.
- [ ] 2.3 Aba Medicamentos: ícone de filtro que mostra/esconde Todos/Na agenda/Fora da agenda (destacado quando aplicado), selo "Fora da agenda", `FlatList` paginada de 20 em 20; verificar no app com mais de 20 medicamentos e os três filtros.

## 3. Verificação

- [ ] 3.1 Rodar `npx vitest run` e `npx tsc --noEmit` sem falhas e, no aparelho, cadastrar sem agenda → adicionar à agenda → retirar → conferir agenda, calendário e lembretes; documentar o resultado.
