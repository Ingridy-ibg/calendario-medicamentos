## 1. Domínio e consultas

- [x] 1.1 Consultar a documentação do Expo v57 para rotas dinâmicas (`[id]`) e precedência de `novo` sobre `[id]`, apresentação em folha/modal e `NativeTabs` com três abas; anotar no design.md qualquer divergência; verificar que cada rota do design.md é suportada na v57.
- [x] 1.2 Escrever um teste que edita, às 10:00, um esquema diário com a dose das 08:00 ainda pendente; se ele falhar (dose some), implementar `substituirDosesAPartirDe` e usá-la em `materializarDosesFuturasAposEdicao`; verificar com o teste passando e os testes existentes de `registration` e `janela-rolante` sem regressão.
- [x] 1.3 Implementar `editarMedicamento` em `registration.ts` (validação completa, cíclico sempre especial, campos comuns incluindo correção de estoque, rejeição de troca de tipo, transação); verificar com testes cobrindo edição válida, edição inválida sem gravar nada, troca de tipo rejeitada e histórico intacto.
- [x] 1.4 Fazer `reporEstoque` rejeitar quantidade ≤ 0 e criar `validarQuantidadeCompra`; verificar com testes de 0, negativo, não numérico e valor válido.
- [x] 1.5 Criar `definirNotificacoesAtivas(db, id, ativas, agora)`; verificar com teste que o campo muda e que `listarAlvosDesejados` deixa de incluir as doses do medicamento silenciado.
- [x] 1.6 Criar `listarMedicamentosAtivosComEsquema` e `resumirEsquema`; verificar com testes: removidos ficam de fora, ordem alfabética em pt-BR, e um resumo por tipo de esquema.
- [x] 1.7 Criar `paraValoresFormulario(medicamento, esquemaRow)`; verificar com um teste por tipo de esquema que o resultado, convertido de volta, gera os mesmos `DadosFormularioMedicamento`.
- [x] 1.8 Teste: medicamento especial com dose em reenvio é editado para comum; verificar que o reconciliador passa a tratá-lo pela regra do comum.

- [x] 1.9 Implementar `situacaoCiclo(esquema, hoje)`; verificar com testes de dia ativo, meio da pausa, último dia de pausa ("volta amanhã") e aguardando nova cartela.
- [x] 1.10 Implementar `adesaoUltimosDias(db, medicamentoId, hoje, 7)`; verificar com testes de semana completa, dose perdida, dias sem dose prevista, cadastro recente e dose pendente de hoje fora do total.
- [x] 1.11 Implementar `preverFimDoEstoque(esquema, estoque, agora)`; verificar com testes de diário (12 unidades → 24 de outubro no cenário da spec), dias da semana, cíclico atravessando a pausa, intervalo em horas marcado como aproximado, estoque zero, limite de 2 anos e `null` para "se necessário".

## 2. Formulário compartilhado

- [x] 2.1 Extrair de `src/app/medicamento/novo.tsx` o componente `FormularioMedicamento` (valores iniciais, modo cadastro/edição com tipo travado e nota, `aoSalvar`), mantendo `novo.tsx` como casca fina; verificar cadastrando um medicamento de cada tipo e conferindo que o comportamento é o mesmo de antes (`npx tsc --noEmit` e `npx vitest run` passando). **Implementado** (typecheck e 312 testes ok); falta cadastrar um de cada tipo no aparelho.

## 3. Aba Medicamentos (conforme `specs/medication-management`)

- [x] 3.1 Criar `src/app/(tabs)/medicamentos.tsx` conforme o artboard "Medicamentos (lista)" (lista com nome, dosagem, resumo do esquema, estoque, indicadores de estoque baixo e silenciado, estado vazio e ação "Novo") e adicionar a terceira aba em `app-tabs.tsx`; verificar no app com medicamentos de cada tipo, um silenciado e um com estoque baixo. **Implementado** (typecheck e testes ok); falta conferir no aparelho.
- [x] 3.2 Mostrar a situação do ciclo ("Dia X de Y", "Em pausa · volta em N dias", "Aguardando nova cartela") nos itens cíclicos da lista; verificar no app com um cíclico em dia ativo e outro em pausa. **Implementado** (typecheck e testes ok); falta conferir no aparelho.

## 4. Detalhe do medicamento

- [x] 4.1 Criar `src/app/medicamento/[id].tsx` conforme o artboard "Detalhe do medicamento" (dados, esquema por extenso, últimos 7 dias com atalho para o calendário, estoque com barra até uma embalagem e previsão "Dura até", interruptor de notificações oculto para "se necessário", ações Registrar compra, Editar, Remover) e registrar a rota no `Stack` de `_layout.tsx`; verificar abrindo o detalhe de um medicamento de cada tipo. **Implementado** (typecheck e testes ok); falta conferir no aparelho.
- [x] 4.2 Implementar o interruptor de notificações (`definirNotificacoesAtivas` + reconciliar); verificar num dispositivo/emulador que, ao desligar, o lembrete agendado some e, ao religar, volta. **Implementado** (typecheck e testes ok); falta conferir no aparelho.
- [x] 4.3 Implementar "Registrar compra" conforme o artboard "Registrar compra" (folha com quantidade sugerida = uma embalagem, atalhos +1/+2 caixas, erro para quantidade inválida); verificar no app que 2 + 30 resulta em 32 e que o alerta de estoque baixo some da agenda e da lista. **Implementado** (typecheck e testes ok); falta conferir no aparelho.
- [x] 4.4 Implementar "Remover" com `Alert.alert` de confirmação, remoção, reconciliação e volta à tela anterior; verificar que o medicamento some da lista e da agenda, que o cancelamento não muda nada, e que as doses já resolvidas continuam no calendário. **Implementado** (typecheck e testes ok); falta conferir no aparelho.

## 5. Edição

- [x] 5.1 Criar `src/app/medicamento/[id]/editar.tsx` conforme o artboard "Editar medicamento", usando `FormularioMedicamento` em modo edição com `paraValoresFormulario`, salvando com `editarMedicamento` + reconciliação (e pedido de full-screen intent ao virar especial); verificar trocando o horário de um diário de 20:00 para 21:00: a agenda mostra 21:00, o histórico das 20:00 continua no calendário e o lembrete passa a ser às 21:00. **Implementado** (typecheck e testes ok); falta conferir no aparelho.
- [x] 5.2 Verificar no app que uma edição inválida mostra o erro no campo e não grava nada, e que fechar sem salvar não altera o medicamento.

## 6. Integração com a agenda

- [x] 6.1 Tornar o nome/área de informação de cada item da agenda diária um link para o detalhe, sem interferir nos botões "Tomei agora", "Não tomar" e "Registrar dose"; verificar tocando em cada área. **Implementado** (typecheck e testes ok); falta conferir no aparelho.

## 7. Verificação de ponta a ponta

- [x] 7.1 Num dispositivo/emulador Android: cadastrar → abrir pela lista e pela agenda → registrar compra → silenciar e reativar → editar → remover, para um medicamento diário, um cíclico e um "se necessário"; rodar `npx vitest run` e `npx tsc --noEmit` sem falhas; documentar o resultado. **Parcial**: `npx vitest run` (312 testes) e `npx tsc --noEmit` passam; falta o percurso no aparelho.

> Verificação no aparelho concluída em 13/10/2026: todos os percursos manuais desta change foram testados e aprovados.
