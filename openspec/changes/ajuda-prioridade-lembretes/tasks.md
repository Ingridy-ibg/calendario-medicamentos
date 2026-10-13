## 1. Pré-requisito e conteúdo

- [ ] 1.1 Confirmar que `alarme-tela-cheia` e `identidade-e-observacoes` já foram aplicadas. Se não, ajustar o texto do Especial ao comportamento atual antes de seguir. Verificar: `openspec list` mostra as duas concluídas/arquivadas, ou o texto ajustado está registrado no PR
- [ ] 1.2 Mover a interface `ConteudoTipoEsquema` para um tipo comum `ConteudoAjuda` e criar `src/constants/prioridades.ts` com `CONTEUDO_PRIORIDADES` (Comum e Especial, textos da spec). Verificar: novo `prioridades.test.ts` (ordem de `CRITICIDADES` e nenhum campo vazio) passa no `npx vitest run`

## 2. Modal reutilizável

- [ ] 2.1 Extrair `ModalAjudaPaginada` de `ajuda-tipos-esquema.tsx` (overlay, cartão, cabeçalho "X de N", setas, bolinhas, reinício a cada abertura, `onRequestClose`) e reescrever `AjudaTiposEsquema` sobre ele. Verificar: no app, os 5 cenários de "Explicação dos tipos de esquema no formulário" continuam valendo
- [ ] 2.2 Criar `AjudaPrioridades` sobre `ModalAjudaPaginada`, com as ilustrações de miniatura de notificação (Comum) e de miniatura do alarme Noite (Especial). Verificar: `npx tsc --noEmit` passa

## 3. Formulário

- [ ] 3.1 Adicionar o botão "i" (rótulo de acessibilidade "O que é cada prioridade?", alvo de 44 × 44) no `acao` da seção "Prioridade dos lembretes" de `formulario-medicamento.tsx`, abrindo `AjudaPrioridades` na criticidade efetiva. Verificar: no cadastro e na edição, o modal abre em Comum ou Especial conforme a seleção, e cíclico abre em Especial
- [ ] 3.2 Validar no app os cenários da spec: navegar por seta e bolinha, setas desativadas nas pontas, fechar tocando fora e com o voltar do Android sem mudar a prioridade. Verificar: checagem manual, nos temas claro e escuro

## 4. Validação

- [ ] 4.1 Rodar `npx vitest run` e `npx tsc --noEmit`. Verificar: ambos passam
