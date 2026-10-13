## Why

A revisão de código da change `agenda-membership` (já mesclada em `master`) encontrou quatro defeitos de comportamento — três deles podem levar a uma **dose dupla**, o risco mais grave do app — e um conjunto de problemas de qualidade e desempenho introduzidos pela mesma change. Convém corrigir tudo agora, antes da verificação no aparelho que ainda está pendente em `agenda-membership` (tarefas 2.x e 3.1).

## What Changes

**Comportamento (bugs)**

- **Voltar à agenda não duplica dose já resolvida**: ao recolocar um medicamento de grade (diário, dias da semana, cíclico) na agenda, horários de hoje que já têm dose resolvida (tomada ou pulada) não ganham uma nova dose pendente nem lembrete.
- **Intervalo em horas respeita a última dose ao voltar**: a primeira dose depois da volta passa a ser `última dose tomada + intervalo`, ou o momento da volta se esse horário já passou — e não mais sempre "agora". A prévia da confirmação mostra o mesmo horário.
- **Agenda de hoje mantém o que já foi registrado**: as doses de hoje já resolvidas de um medicamento retirado da agenda continuam aparecendo na agenda diária (sem alerta de estoque), como já aparecem no calendário.
- **Cadastrar sem agenda não trava a tela**: com "Adicionar à agenda" desligado, a confirmação não valida mais as respostas de "Já estava tomando" (que serão descartadas), então um tratamento que "já terminou" não lança erro.

**Qualidade e desempenho**

- **Paginação real na aba Medicamentos**: a lista passa a buscar só a página pedida (filtro, ordem e `LIMIT/OFFSET` na consulta, com contagem à parte), e o resumo, a situação e o alerta de estoque são calculados só para os itens da página. O comportamento visível (20 por vez, rolagem infinita, fora da agenda por último) não muda.
- **Volta à agenda grava a prévia que foi conferida**: `adicionarAAgenda` recebe o plano já calculado pela confirmação, em vez de recalcular `prepararVoltaAAgenda`.
- **Alerta de estoque com `naAgenda` obrigatório**: o tipo do parâmetro passa a exigir o campo, para o compilador pegar um chamador que o esqueça.
- **Um único selo**: o `Selo` local da aba Medicamentos e `SeloForaDaAgenda` viram um componente compartilhado.
- **Gating de agenda num lugar só**: remove a checagem redundante de `naAgenda` no reconciliador de notificações e devolve o filtro de tipo de `listarEsquemasCiclicos` para o SQL.

## Capabilities

### New Capabilities
- (nenhuma)

### Modified Capabilities
- `dose-scheduling`: a volta à agenda não recria doses de hoje já resolvidas, e no intervalo em horas a primeira dose parte da última dose tomada. (Requisito "Voltar à agenda recomeça o esquema", da change `agenda-membership`.)
- `agenda-views`: a agenda diária mostra as doses de hoje já resolvidas de um medicamento fora da agenda. (Requisito "Agenda e calendário ignoram medicamentos fora da agenda", da change `agenda-membership`.)
- `medication-registration`: cadastrar sem adicionar à agenda nunca falha por causa das respostas de "Já estava tomando". (Requisito "Cadastrar sem adicionar à agenda", da change `agenda-membership`.)

A paginação, o selo e os demais itens de qualidade não mudam requisitos: o requisito "Paginação da aba Medicamentos" continua valendo como está.

## Impact

- **Domínio**: `src/domain/medication-registration/registration.ts` (`prepararVoltaAAgenda`, `adicionarAAgenda`, materialização da volta), `src/domain/agenda-views/agenda-diaria.ts`, `src/domain/medication-stock/situacao.ts`, `src/domain/medication-management/lista.ts`.
- **Repositórios**: `src/db/repositories/medicamentos.ts` (consulta paginada e contagem), `src/db/repositories/esquemas.ts` (`listarEsquemasCiclicos`).
- **Notificações**: `src/notifications/contexto.ts`.
- **Telas e componentes**: `src/app/medicamento/confirmar.tsx`, `src/app/(tabs)/medicamentos.tsx`, `src/app/medicamento/[id]/index.tsx`, `src/components/medicamento/` (selo compartilhado).
- **Banco**: sem migração.
- **Relação com outras changes**: corrige `agenda-membership`; suas tarefas pendentes de verificação no aparelho devem rodar depois desta.
