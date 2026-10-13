## Why

Hoje só dá para cadastrar um medicamento: não existe tela para editá-lo, removê-lo, registrar a compra de uma caixa nova nem silenciar as notificações dele. A lógica de domínio para tudo isso já existe e está testada (`editarEsquema`, `removerMedicamentoComHistorico`, `reporEstoque`, `notificacoesAtivas` respeitado pelo reconciliador), mas nenhuma tela a usa — então quatro requisitos das specs `medication-registration`, `medication-stock` e `dose-notifications` não estão disponíveis para o usuário. Além disso, um medicamento sem dose no dia (dia de pausa, dia da semana sem dose) não aparece em lugar nenhum do app.

## What Changes

- Adicionar uma terceira aba, **Medicamentos**, com a lista de todos os medicamentos ativos (nome, dosagem, resumo do esquema, estoque e indicadores de estoque baixo e de notificações silenciadas), com atalho para cadastrar um novo.
- Adicionar uma tela de **detalhe do medicamento**, aberta pela lista ou tocando num item da agenda diária, com:
  - resumo do medicamento e do esquema;
  - **estoque** atual com ação "Registrar compra", que soma uma embalagem por padrão ou uma quantidade informada;
  - interruptor **Notificações** para silenciar ou reativar os lembretes desse medicamento;
  - ações **Editar** e **Remover**.
- **Edição**: reaproveita o formulário de cadastro, preenchido com os dados atuais. O tipo de esquema não pode ser trocado (para isso, remover e cadastrar de novo). As alterações valem só para doses futuras.
- **Remoção**: pede confirmação, para o agendamento e as notificações futuras e preserva o histórico já registrado.
- Toda ação que muda o que deve ser notificado (editar, remover, silenciar, reativar) reconcilia as notificações agendadas imediatamente.
- Adicionar ao domínio uma função de edição dos campos comuns do medicamento (nome, dosagem, criticidade, quantidade por embalagem e correção da quantidade em estoque), com a mesma validação do cadastro — hoje só existe a edição do esquema.

## Capabilities

### New Capabilities
- `medication-management`: aba Medicamentos (lista), tela de detalhe e a navegação até ela a partir da lista e da agenda diária.

### Modified Capabilities
- `medication-registration`: detalha como a edição e a remoção acontecem para o usuário (formulário preenchido, tipo de esquema fixo, confirmação de remoção). As specs dessa capability ainda vivem na change ativa `add-medication-scheduling`; esta delta só acrescenta requisitos.
- `medication-stock`: detalha o registro de compra a partir do detalhe do medicamento (uma embalagem por padrão, quantidade customizável, validação).
- `dose-notifications`: detalha onde fica o controle de silenciar/reativar notificações e o efeito imediato sobre lembretes já agendados.

## Impact

- **Código novo**: `src/app/(tabs)/medicamentos.tsx` (lista), `src/app/medicamento/[id].tsx` (detalhe), `src/app/medicamento/[id]/editar.tsx` (edição), uma função de domínio para editar campos comuns em `src/domain/medication-registration/registration.ts` e uma consulta de lista de medicamentos com resumo.
- **Código alterado**: `src/app/medicamento/novo.tsx` (formulário extraído para ser reaproveitado na edição), `src/app/(tabs)/index.tsx` (item da agenda abre o detalhe), `src/components/app-tabs.tsx` (terceira aba), `src/app/_layout.tsx` (novas rotas do Stack).
- **Dependências**: nenhuma nova. Sem migração de banco — `notificacoesAtivas`, `deletedAt` e os campos de estoque já existem.
- **Ordem**: arquivar `add-medication-scheduling` antes desta change. Se `apply-visual-identity` for implementada antes (recomendado), estas telas usam seus componentes de UI; senão, seguem o visual atual e são restilizadas depois.
