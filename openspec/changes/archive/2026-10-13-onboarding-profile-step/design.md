## Context

- `src/app/boas-vindas.tsx` está atrás de um `Stack.Protected guard={!boasVindasConcluida}`; `concluirBoasVindas()` (store `usePreferencias`) grava a flag no kv-store **e** muda o estado, o que faz o expo-router trocar para a agenda. `gravarBoasVindasConcluida()` grava só no kv-store, sem trocar de tela — hoje usada antes dos pedidos de permissão.
- `src/app/perfil.tsx` tem o campo de nome (gravado em `onBlur`/saída) e a escolha de aparência com `PreviaTema`, usando `definirNome` e `definirAparencia` (que aplica `Appearance.setColorScheme` na hora).

## Goals / Non-Goals

**Goals:** a etapa nova reutiliza os mesmos controles e preferências do Perfil; nenhuma regra nova de persistência.

**Non-Goals:** pedir outras informações (idade, foto); mostrar a etapa a quem já concluiu a boas-vindas antes desta mudança.

## Decisions

### 1. Duas etapas na mesma rota
`boas-vindas.tsx` ganha `etapa: 'apresentacao' | 'perfil'`. "Ativar lembretes e começar" grava a flag (`gravarBoasVindasConcluida`), faz os pedidos de permissão e passa para `'perfil'`; "Agora não" grava a flag e passa para `'perfil'`. "Começar" chama `definirNome(rascunho)` e `concluirBoasVindas()`, que libera a agenda pelo guard.

Como a flag já está gravada desde a etapa 1, fechar o app na etapa 2 abre a agenda na próxima vez (o store lê a flag do kv-store na inicialização). A aparência é gravada a cada toque (`definirAparencia`), então também sobrevive.

*Alternativa:* uma rota separada `boas-vindas/perfil`. Descartada: as duas rotas teriam de ficar no mesmo grupo protegido e a navegação entre elas não acrescenta nada.

### 2. Componentes compartilhados com o Perfil
Extrair de `perfil.tsx` para `src/components/perfil/`:
- `EscolhaAparencia({ valor, aoEscolher })` — as três opções com `PreviaTema` e a frase explicativa;
- `PreviaTema` junto.
O campo de nome usa o `CampoTexto` já existente. O Perfil passa a usar os mesmos componentes, sem mudança visual.

### 3. Texto
Selo "Quase lá", título "Como podemos te chamar?", apoio "Usamos seu nome só para te cumprimentar. Ele fica salvo apenas neste aparelho.", rótulo "Seu nome (opcional)", "Aparência do app", e a dica acima do botão "Você pode mudar tudo isso depois em Meu perfil." — como no artboard.

### 4. Perfil como aba
`src/app/perfil.tsx` vai para `src/app/(tabs)/perfil.tsx` (e sai do `Stack` raiz); o botão "Voltar para a agenda" é removido. Em `app-tabs.tsx`, a quarta aba `perfil` com `NativeTabs.Trigger.Icon md="person" sf="person"` — o mesmo ícone `pessoa` já mapeado no `Icone`. O `BotaoPerfil` e a leitura do nome para a inicial saem da agenda; o título da saudação ocupa a largura toda do cabeçalho ao lado do "Novo". A barra fica com quatro abas, dentro do limite de cinco da spec `visual-identity`.

*Alternativa:* manter o botão e encurtar o título. Descartada: o nome é justamente o que a saudação quer mostrar.

## Risks / Trade-offs

- [Teclado cobrir o botão "Começar"] → a etapa usa `KeyboardAvoidingView` e o campo tem `returnKeyType="done"`.
- [Quem já usa o app não vê a etapa] → aceito (Non-Goals); essas pessoas têm o Perfil.
