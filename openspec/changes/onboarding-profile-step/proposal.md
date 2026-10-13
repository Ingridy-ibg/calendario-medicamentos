## Why

O nome (usado na saudação) e a aparência do app hoje só podem ser definidos no Perfil, que a pessoa precisa descobrir sozinha. Perguntar isso uma única vez, logo na primeira abertura, deixa o app personalizado desde o início — inclusive a saudação do dia seguinte já com o nome.

## What Changes

- A boas-vindas ganha uma **segunda etapa**, mostrada logo depois de "Ativar lembretes e começar" (após os pedidos de permissão) **ou** de "Agora não": "Como podemos te chamar?" com o campo de nome (opcional) e a escolha de aparência (Sistema / Claro / Escuro, com miniaturas).
- A aparência escolhida é **aplicada na hora**, na própria tela.
- Um único botão, **"Começar"**, salva nome e aparência e abre a agenda — com ou sem nome.
- Fechar o app nessa etapa não traz a boas-vindas de volta: o que já estiver escolhido fica salvo, e o resto pode ser mudado depois no Perfil.
- **O Perfil sai do cabeçalho da agenda e vira a última aba da barra inferior**, com o ícone clássico de pessoa. O botão redondo ao lado do "Novo" disputava espaço com o título e cortava o nome na saudação. A tela de perfil, agora uma aba, perde o botão de voltar.

Referência visual: artboard "Boas-vindas — nome e aparência" do canvas (https://claude.ai/artifact/5RZ2sX5YF1fbQTYfot6j8J); os botões do artboard "Boas-vindas" levam a ele.

## Capabilities

### New Capabilities
- (nenhuma)

### Modified Capabilities
- `onboarding`: etapa de nome e aparência depois dos pedidos de permissão (ou de "Agora não").
- `user-profile`: o acesso ao perfil deixa de ser um botão no cabeçalho da agenda e passa a ser a aba "Perfil".

(As duas specs vivem na change `apply-visual-identity`, já implementada e não arquivada.)

## Impact

- **Código**: `src/app/boas-vindas.tsx` (duas etapas); extração dos controles de nome e aparência de `src/app/perfil.tsx` para componentes reutilizados (`src/components/perfil/`); nenhuma mudança em `src/lib/preferencias.ts` além de usar o que já existe (`definirNome`, `definirAparencia`, `gravarBoasVindasConcluida`, `concluirBoasVindas`).
- **Navegação**: `src/app/perfil.tsx` passa para `src/app/(tabs)/perfil.tsx`; `src/components/app-tabs.tsx` e `app-tabs.web.tsx` ganham a aba (ícone Material `person` / SF `person`); o `BotaoPerfil` sai de `src/app/(tabs)/index.tsx`; a rota `perfil` sai do `Stack` do `_layout.tsx`.
- Sem mudança de banco.
