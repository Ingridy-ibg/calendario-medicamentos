## Why

A segunda revisão de código (commit `b9e6f35`, da change `fix-agenda-membership-review`) achou dois caminhos que ainda geram **dose dupla** na volta à agenda, um erro sem tratamento na confirmação do cadastro e defeitos na paginação da aba Medicamentos. Parte deles contraria requisitos já escritos; outra parte vem de casos que as specs não cobriam. Convém fechar isso antes da verificação no aparelho que ainda está pendente em `agenda-membership` e `fix-agenda-membership-review`.

## What Changes

**Comportamento (bugs)**

- **Confirmação do cadastro não quebra com dados que deixaram de valer**: com "Adicionar à agenda" ligado, se as respostas de "Já estava tomando" deixarem de valer entre abrir a confirmação e confirmar (por exemplo, passou da meia-noite e o tratamento "já terminou"), a tela mostra a mensagem da validação e não salva, em vez de lançar um erro não tratado.
- **Intervalo em horas não repete horário já resolvido na volta**: se `última dose tomada + intervalo` cair num horário que já tem dose resolvida (por exemplo, pulada), a primeira dose avança de intervalo em intervalo até um horário livre. A prévia e o que é gravado mostram o mesmo horário.
- **Horário editado fora da agenda não gera dose extra hoje**: na volta à agenda de um medicamento de grade, cada dose de hoje já resolvida cobre o horário da grade atual mais próximo do horário em que estava prevista. Assim, editar 20:00 para 20:30 enquanto o medicamento estava fora da agenda não cria uma segunda dose da noite.
- **Paginação sem página repetida**: chegar ao fim da lista duas vezes seguidas não carrega a mesma página duas vezes.
- **Voltar à aba Medicamentos mantém o que já foi carregado**: ao voltar do detalhe, a lista é atualizada com a mesma quantidade de itens já carregados, em vez de voltar só para os 20 primeiros. A troca de filtro continua recomeçando da primeira página.

**Robustez e qualidade**

- **Contagem igual à listagem**: o total que decide se há mais páginas conta só os medicamentos que a listagem consegue devolver (com esquema não removido).
- **Agenda do dia filtra explicitamente**: de um medicamento fora da agenda, a agenda de hoje só mostra doses já resolvidas, sem depender de `retirarDaAgenda` ter apagado as pendentes.
- **Limpeza**: o total por filtro vira um helper ao lado de `naAgendaDoFiltro`, e o critério "dose tomada" vira uma função só em `historicoDaVolta`.
- **Planejamento**: a tarefa 4.1 de `fix-agenda-membership-review` passa a descrever o que o design decidiu (ordenação em JS sobre uma única consulta), não `ORDER BY/LIMIT/OFFSET` no SQL.

## Capabilities

### New Capabilities
- (nenhuma)

### Modified Capabilities
- `dose-scheduling`: "Voltar à agenda recomeça o esquema" ganha a regra do intervalo que cai em horário resolvido e a da grade editada fora da agenda.
- `medication-registration`: "Confirmação obrigatória antes de salvar" passa a exigir que dados que deixaram de valer na hora de confirmar mostrem a mensagem e não salvem.
- `medication-management`: "Paginação da aba Medicamentos" proíbe repetir itens e manda manter os itens carregados ao voltar para a aba.

A agenda do dia não muda de requisito: "Agenda e calendário ignoram medicamentos fora da agenda" já proíbe pendentes de medicamentos fora da agenda. A mudança só passa a garantir isso na própria montagem da agenda.

## Impact

- **Domínio**: `src/domain/medication-registration/previa.ts` (`resolverPlano`), `src/domain/medication-registration/registration.ts` (`historicoDaVolta`), `src/domain/agenda-views/agenda-diaria.ts`, `src/domain/medication-management/lista.ts`.
- **Repositório**: `src/db/repositories/medicamentos.ts` (`contarMedicamentos`).
- **Telas**: `src/app/medicamento/confirmar.tsx`, `src/app/(tabs)/medicamentos.tsx`.
- **Planejamento**: `openspec/changes/fix-agenda-membership-review/tasks.md` (texto da 4.1).
- **Banco**: sem migração.
