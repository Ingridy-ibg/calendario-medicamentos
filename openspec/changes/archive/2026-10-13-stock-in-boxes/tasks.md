## 1. Regras puras

- [x] 1.1 Criar `src/domain/medication-stock/caixas.ts` (`paraUnidades`, `paraCaixas`, `textoEstoque`); verificar com testes: 1+12/30 → 42; 12/30 → "1 caixa · restam 12"; 42/30 → "2 caixas · uma em uso com 12"; 72/30 → "3 caixas · uma em uso com 12"; 60/30 → "2 caixas"; 0 → "Acabou"; 30/21 cíclico → "2 cartelas · uma em uso com 9".
- [x] 1.2 Extrair de `previa.ts` a contagem de doses restantes do tratamento para `contarDosesRestantesDoTratamento`, sem mudar o comportamento da prévia; verificar com os testes de `previa.test.ts` passando e um teste novo da função.
- [x] 1.3 Substituir `temAlertaDeRecompra` por `classificarEstoque`; verificar com testes: contínuo na última caixa → baixo; tratamento 11 doses/8 un. → insuficiente (faltam 3); tratamento 14/20 → sobra 6; tratamento com fim nunca recebe "baixo"; "se necessário" 4 → baixo_leve e 5 → nada; cíclico na última cartela → baixo.

## 2. Domínio e formulário

- [x] 2.1 Trocar `alertaEstoque: boolean` por `AlertaEstoque` nos itens de `montarAgendaDoDia` e ajustar os testes da agenda; verificar com `npx vitest run`.
- [x] 2.2 Trocar `quantidadeEmEstoque` por `caixasFechadas` + `naCaixaEmUso` em `ValoresFormulario`, `paraDadosFormulario` e `paraValoresFormulario`, com a validação de `naCaixaEmUso < porCaixa`; verificar com o teste de ida e volta do formulário (42/30 ↔ 1 + 12) e um teste do erro.

## 3. Telas

- [x] 3.1 Formulário (cadastro e edição): campos "Caixas fechadas", "Na caixa em uso" (opcional) e "Unidades por caixa" e a prévia do total; verificar no app cadastrando 1 + 12 por 30 e editando em seguida.
- [x] 3.2 Agenda, aba Medicamentos, detalhe, compra e confirmação do cadastro: estoque com `textoEstoque` e alertas por `classificarEstoque` (forte, leve e, só no detalhe, a sobra); verificar no app um contínuo na última caixa, um tratamento insuficiente, um tratamento com sobra e um "se necessário" com 4 unidades, nos temas claro e escuro.

## 4. Verificação

- [x] 4.1 Rodar `npx vitest run` e `npx tsc --noEmit` sem falhas e percorrer no aparelho cadastro → agenda → compra → detalhe para os quatro casos de alerta; documentar o resultado.

> Verificação no aparelho concluída em 13/10/2026: todos os percursos manuais desta change foram testados e aprovados.
