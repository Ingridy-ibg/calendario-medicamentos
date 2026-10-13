## Why

As telas atuais ainda usam o visual do starter do Expo: azul genérico, fonte do sistema, cartões cinza e nenhuma hierarquia entre o que já foi resolvido e o que precisa de ação agora. Já existe um design de referência para as telas do app (canvas "Calendário de Medicamentos — Telas", https://claude.ai/artifact/5RZ2sX5YF1fbQTYfot6j8J), e aplicá-lo agora, logo depois da fase 8 (agenda e calendário), evita que novas telas nasçam em cima do visual provisório.

## What Changes

- Adotar uma identidade visual única para o app: paleta verde-petróleo sobre fundo verde-acinzentado claro, cartões brancos arredondados, cores de status que se distinguem também pela claridade (âmbar para atraso, vermelho para perdida, cinza para pulada/pendente), e as fontes Bricolage Grotesque (títulos) e Figtree (texto) embutidas no app.
- Criar uma versão escura derivada da mesma identidade. Por padrão o app segue o tema claro/escuro do sistema, e o usuário pode fixar Claro ou Escuro na tela de perfil.
- Adicionar uma tela **Meu perfil**, aberta por um botão com a inicial do usuário no cabeçalho da agenda, com: nome (opcional, usado na inicial do botão), escolha de aparência (Sistema / Claro / Escuro), situação das permissões de lembrete com atalho para conceder as que faltam, e o aviso de que os dados ficam só no aparelho.
- Adicionar uma tela de **boas-vindas** exibida apenas na primeira abertura, que apresenta o app e concentra o pedido das permissões de notificação ("Ativar lembretes e começar" / "Agora não").
- Redesenhar a **agenda diária**: cabeçalho com data e botão "Novo", cartão-resumo do dia ("X / Y doses", uma barra por dose, próxima dose), doses agrupadas por período (Manhã, Tarde, Noite) e seção "Se necessário", com ícone de status em cada item e destaque para a próxima dose pendente.
- Redesenhar o **calendário mensal**: título do mês com navegação por botões com ícone, grade em cartão com o dia de hoje marcado por anel e o selecionado preenchido, ponto de status por dia (preenchido para histórico, contorno para previsto), legenda das cores e painel do dia selecionado com marcador de status por dose.
- Redesenhar o **formulário de novo medicamento**: seções em cartões (Medicamento, Como tomar, Duração, Estoque, Prioridade dos lembretes), tipos de esquema como chips, horários como chips removíveis, duração como controle segmentado, criticidade como opções com descrição, e botão "Salvar medicamento" fixo no rodapé.
- Atualizar a barra de abas (cores e ícones) para a nova identidade.
- Nenhuma regra de domínio (agendamento, adesão, estoque, notificações) muda.

## Capabilities

### New Capabilities
- `visual-identity`: tokens de cor (claro e escuro), tipografia embutida, cores de status de dose e os padrões visuais compartilhados pelas telas (cartões, botões, chips, alvos de toque, acessibilidade).
- `onboarding`: tela de boas-vindas na primeira abertura, persistência de que ela já foi vista e o ponto em que as permissões essenciais de notificação são pedidas.
- `user-profile`: tela Meu perfil — nome do usuário, preferência de aparência e situação das permissões de lembrete.

### Modified Capabilities
- `agenda-views`: adiciona o resumo do dia, o agrupamento por período e a indicação da próxima dose na agenda diária, e a legenda e os marcadores de dia de hoje/selecionado no calendário mensal. A spec dessa capability ainda vive na change ativa `add-medication-scheduling` (não arquivada); esta delta só acrescenta requisitos e deve ser arquivada depois dela.

## Impact

- **Código**: `src/constants/theme.ts`, `src/constants/rotulos.ts`, `src/components/themed-text.tsx`, `src/components/themed-view.tsx`, `src/components/app-tabs.tsx`, `src/app/_layout.tsx`, `src/app/(tabs)/index.tsx`, `src/app/(tabs)/calendario.tsx`, `src/app/medicamento/novo.tsx`; novas rotas `src/app/boas-vindas.tsx` e `src/app/perfil.tsx`; `src/hooks/use-color-scheme.ts` e `src/notifications/permissoes.ts` (consulta da situação das permissões, sem pedir); novos componentes de UI compartilhados em `src/components/`; `src/notifications/inicializar.ts` (o pedido de permissões passa a respeitar a boas-vindas). Possivelmente `src/domain/agenda-views/agenda-diaria.ts` para expor o resumo e o período (função pura, com teste).
- **Dependências**: `@expo-google-fonts/bricolage-grotesque` e `@expo-google-fonts/figtree` (via `expo-font`, já instalado). A persistência da boas-vindas, do nome e da preferência de aparência usa `expo-sqlite/kv-store`, já disponível.
- **Assets**: novos ícones das abas em `assets/images/tabIcons/`.
- **Sem migração de banco** e sem mudança nas notificações em si.
