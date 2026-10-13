## Context

A referência visual é o canvas "Calendário de Medicamentos — Telas" (https://claude.ai/artifact/5RZ2sX5YF1fbQTYfot6j8J), com quatro artboards: Boas-vindas, Agenda do dia, Calendário mensal e Novo medicamento. Ele foi desenhado só no tema claro, em HTML; os valores de cor, tamanhos e raios abaixo foram tirados dele.

Estado atual relevante:

- `src/constants/theme.ts` define `Colors.light/dark` com cinco tokens herdados do starter (`text`, `background`, `backgroundElement`, `backgroundSelected`, `textSecondary`); `useTheme()` devolve o conjunto do esquema atual.
- As telas misturam `ThemedText`/`ThemedView` com classes NativeWind de cor fixa (`bg-blue-600`, `border-neutral-300 dark:border-neutral-700`), e `CORES_STATUS_DOSE` em `src/constants/rotulos.ts` é um mapa fixo de hex que ignora o tema.
- `inicializarNotificacoes()` (`src/notifications/inicializar.ts`) chama `solicitarPermissoesEssenciais()` a cada abertura, logo depois das migrações.
- A barra de abas usa `NativeTabs` com ícones PNG do starter.
- O AGENTS.md exige consultar a documentação versionada do Expo 57 antes de escrever código; APIs citadas aqui (`NativeTabs.Trigger.Icon`, `expo-font`, `expo-sqlite/kv-store`, redirecionamento no expo-router) devem ser conferidas lá na implementação.

## Goals / Non-Goals

**Goals:**
- Uma única fonte de verdade para cores (claro e escuro), tipografia e cores de status, consumida por todas as telas.
- Telas fiéis ao canvas no tema claro, e uma variante escura coerente.
- Lógica nova (resumo do dia, período, "próxima dose", decisão de mostrar a boas-vindas) em funções puras testadas com Vitest, como o resto do domínio.

**Non-Goals:**
- Telas que não estão no canvas (detalhe/edição de medicamento, reposição de estoque, controle de notificações por medicamento da tarefa 5.12) — continuam pendentes na change `add-medication-scheduling` e passam a usar os componentes desta change quando forem feitas.
- Animações e transições além das padrão do expo-router.
- Contas, login ou sincronização: o perfil é local, e o nome é só para exibição.
- Configurações de lembrete por usuário (intervalo de reenvio, horário de silêncio): continuam definidas pela criticidade de cada medicamento.
- Mudar o layout por tipo de esquema do formulário: o canvas mostra "Duração" para todos os tipos, mas o formulário continua mostrando duração só para Diário, Intervalo e Dias da semana, e mantém o campo "Horário diário da dose" do Cíclico, que o canvas omitiu — as regras de cadastro mandam.

## Decisions

### 1. Tokens em `theme.ts`, consumidos via `useTheme()`; NativeWind só para layout

`Colors.light` e `Colors.dark` ganham os tokens do canvas:

| token | claro | escuro |
|---|---|---|
| `background` | `#F3F5F2` | `#0E1412` |
| `surface` | `#FFFFFF` | `#18211E` |
| `surfaceMuted` (chips, segmentado) | `#ECEFED` | `#222D29` |
| `text` | `#15211D` | `#E8EEEB` |
| `textSecondary` | `#5B6661` | `#9DABA5` |
| `border` | `#CBD3CF` | `#34413C` |
| `accent` | `#0E6B58` | `#3FB89A` |
| `onAccent` | `#FFFFFF` | `#0B1F1A` |
| `accentSoft` | `#DDEFE9` | `#173A32` |
| `inverseSurface` (cartão-resumo) | `#15211D` | `#22302B` |

Mais os de status (`statusTomada`, `statusAtraso`, `statusAtrasoSoft`, `statusPerdida`, `statusPerdidaSoft`, `statusNeutro`), valores claros do canvas (`#0E6B58`, `#9A4A06`, `#FCEBD6`, `#B42318`, `#FDE7E4`, `#5B6661`) e escuros clareados até passar 4,5:1 sobre `surface`. Os tokens antigos `backgroundElement`/`backgroundSelected` são removidos e os usos migrados para `surface`/`surfaceMuted`.

`CORES_STATUS_DOSE` deixa de ser um mapa de hex e passa a mapear status → nome de token; quem renderiza resolve com `useTheme()`. Os rótulos ficam onde estão.

Classes NativeWind continuam para layout (flex, gap, padding, raio). Cores fixas em classe (`bg-blue-600`, `border-neutral-*`) saem.

*Alternativa considerada:* variáveis CSS do NativeWind com `vars()` e `dark:`. Descartada porque obriga a manter os tokens em dois lugares (CSS e TS — a barra de abas nativa e os ícones SVG recebem cor por prop, não por classe) e o projeto já tem `useTheme()`.

### 2. Componentes de UI compartilhados em `src/components/ui/`

Pequenos componentes que encapsulam o padrão visual, para as quatro telas não repetirem estilos: `Cartao`, `Botao` (variantes `primario`, `secundario`, `suave`), `Chip` (selecionável), `Segmentado`, `CampoTexto` (rótulo + input + erro), `CabecalhoSecao` (rótulo em caixa alta), `IconeStatus` e `Icone`. `ThemedText` ganha os tipos `display` (título de tela, Bricolage 32–36) e mantém os demais em Figtree; o tipo `link`/`linkPrimary` passa a usar `accent`.

*Alternativa:* estilizar cada tela diretamente. Descartada: as telas futuras (Non-Goals) precisam reaproveitar o mesmo padrão.

### 3. Ícones com `expo-symbols` (Material Symbols), sem dependência nova

O canvas usa ícones de traço inline. O projeto já depende de `expo-symbols`, que no Android renderiza Material Symbols (e `@expo-google-fonts/material-symbols` já está em `node_modules`). Decisão: `Icone` é um wrapper de `SymbolView` de `expo-symbols` com nomes Material (`check`, `schedule`, `add`, `close`, `chevron_left`, `chevron_right`, `calendar_month`, `format_list_bulleted`, `notifications`, `inventory_2`, `pill`). Nada de dependência nova para ícones, e os mesmos nomes servem à barra de abas (`NativeTabs.Trigger.Icon` com `md`, a confirmar na doc v57), o que permite apagar os PNGs do starter.

*Alternativa:* adicionar `react-native-svg` e copiar os paths do canvas. Fica como plano B se `SymbolView` não renderizar em Expo Go ou na web.

### 4. Fontes com `@expo-google-fonts/*` + `useFonts`, segurando a splash

Adicionar `@expo-google-fonts/bricolage-grotesque` (pesos 500 e 700) e `@expo-google-fonts/figtree` (400, 500, 600, 700). `RootLayout` chama `useFonts` e só renderiza (e esconde a splash, que já está presa com `preventAutoHideAsync`) quando migrações **e** fontes estiverem prontas; erro de fonte não bloqueia o app (cai na fonte do sistema). Como no React Native o peso é um arquivo de fonte separado, `ThemedText` escolhe a `fontFamily` pelo peso (ex.: `Figtree_600SemiBold`) em vez de usar `fontWeight`.

*Alternativa:* plugin de config do `expo-font` para embutir no build nativo. Mais rápido na abertura, mas não funciona no Expo Go, que o projeto usa (`isExpoGo`). Pode ser adotado depois sem mudar o comportamento.

### 5. Boas-vindas como rota `src/app/boas-vindas.tsx` com flag em `expo-sqlite/kv-store`

- A flag `boasVindasConcluida` fica no `kv-store` do `expo-sqlite` (síncrono, já instalado, sobrevive a reinícios). Não vai para o schema Drizzle: é preferência de UI, não dado de domínio, e evita migração.
- `RootLayout` lê a flag de forma síncrona e, se ausente, redireciona para `/boas-vindas` (via `Redirect`/rota inicial do expo-router, conforme a doc v57). A boas-vindas é uma tela do `Stack` sem cabeçalho e sem gesto de voltar.
- "Ativar lembretes e começar": grava a flag, chama `solicitarPermissoesEssenciais()` (import dinâmico, mesma regra do Expo Go já usada no projeto) e faz `router.replace('/')`. "Agora não": grava a flag e `router.replace('/')`. A flag é gravada **antes** dos pedidos de permissão, para que negar ou matar o app no meio do diálogo não traga a boas-vindas de volta.
- `inicializarNotificacoes()` recebe um parâmetro (ou lê a flag) e pula `solicitarPermissoesEssenciais()` enquanto a boas-vindas não foi concluída; canais, tarefas e reconciliador continuam rodando sempre.
- A decisão "mostrar ou não" é uma função pura pequena, testada; a leitura do kv-store fica num módulo fino em `src/lib/`.

*Alternativa:* tabela `preferencias` no SQLite via Drizzle. Descartada por exigir migração para um único booleano.

### 6. Resumo, período e próxima dose como funções puras em `agenda-views`

Em `src/domain/agenda-views/`, novas funções sobre o `ItemAgenda[]` que `montarAgendaDoDia` já devolve (sem mudar sua assinatura):

- `resumirDia(itens)` → `{ tomadas, total, marcas: StatusDose[], proxima: ItemAgendaDose | null }`. Conta só itens `tipo: 'dose'`; tomadas = `tomada` + `tomada_com_atraso`; próxima = a dose `pendente`/`aguardando` de menor horário (em empate, a primeira na ordem da lista), mesmo que o horário já tenha passado.
- `agruparPorPeriodo(itens)` → seções `manha` / `tarde` / `noite` / `se_necessario`, omitindo as vazias. Corte em 12:00 e 18:00 no horário local. Dose sem horário previsto (não deveria ocorrer para doses agendadas) cai em "Manhã" no topo para não sumir da lista.

Testes no mesmo padrão de `agenda-diaria.test.ts`.

### 7. Calendário: estado de "hoje" separado do selecionado; formulário: horários como chips

- O calendário passa a desenhar três estados de célula (normal, hoje = anel `accent`, selecionado = preenchido `inverseSurface`), ponto preenchido para histórico e em contorno para previsto. `corDoDia` passa a devolver `{ token, estilo: 'cheio' | 'contorno' } | null`. Legenda estática abaixo da grade. Os botões ◀/▶ viram `Icone` com `accessibilityLabel`.
- No formulário, `ListaHorarios` vira uma linha de chips (`08:00 ×`) mais um chip tracejado "+ Horário" que abre o mesmo `DateTimePickerAndroid` de hoje. O "Horário diário da dose" do Cíclico passa a usar o mesmo seletor de horário (hoje é texto livre), mantendo o valor `HH:mm` que a validação espera. O botão "Salvar medicamento" fica fora do `ScrollView`, fixo no rodapé dentro do `KeyboardAvoidingView`. O título nativo do modal ("Novo medicamento" em `_layout.tsx`) é desligado, já que a tela desenha o próprio cabeçalho com botão de fechar.

### 8. Preferência de aparência via `Appearance.setColorScheme`

A preferência (`sistema` | `claro` | `escuro`) fica no `expo-sqlite/kv-store`, como a flag da boas-vindas. Ela é aplicada com `Appearance.setColorScheme` do React Native (`'light'`, `'dark'` ou o valor que volta a seguir o sistema — `'unspecified'`/`null`, conforme a versão do RN 0.86, a confirmar na doc). Com isso, `useColorScheme()` em todo o app — `useTheme()`, `app-tabs.tsx`, o `ThemeProvider` do `_layout.tsx` — passa a refletir a preferência sem nenhuma mudança nos consumidores, e a barra de status e de navegação do Android acompanham.

- A leitura é síncrona e acontece no topo de `_layout.tsx`, antes da primeira renderização, para que a splash e a boas-vindas já abram no tema certo.
- A tela de perfil grava a preferência e chama `setColorScheme` na hora (spec: aplicação imediata).
- `src/hooks/use-color-scheme.ts` continua reexportando o hook do RN; nada de contexto novo.

*Alternativa:* um contexto React próprio com a preferência, combinado com o tema do sistema em `useTheme()`. Descartada: obrigaria a trocar todos os usos de `useColorScheme` (inclusive em `app-tabs.tsx` e no `ThemeProvider`) e não alcançaria a barra de status nem componentes nativos, que leem o esquema do sistema. Se `setColorScheme` se mostrar instável no Expo Go/Android 16, o contexto próprio é o plano B, isolado em `use-color-scheme.ts`.

### 9. Perfil: rota `src/app/perfil.tsx`, nome no kv-store, permissões só consultadas

- Rota no `Stack` raiz, com cabeçalho próprio (botão voltar), aberta pelo botão de perfil no cabeçalho da agenda. O botão lê o nome do kv-store a cada foco da agenda (`useFocusEffect`, como o resto da tela) para refletir a inicial.
- Nome: `kv-store`, chave `perfil.nome`, gravado ao sair do campo (`onBlur`) e ao sair da tela; valor só com espaços conta como vazio. Não vai para o banco Drizzle pelos mesmos motivos da decisão 5.
- Permissões: novas funções de **consulta** em `src/notifications/permissoes.ts` (`consultarPermissoes()` → `{ notificacoes, alarmeExato }`), separadas das de pedido que já existem. Notificações via `getPermissionsAsync` do `expo-notifications`; alarme exato pela API que a v57 oferecer — se não houver como consultar, a linha mostra só a ação "Abrir configurações", sem estado (registrar na tarefa 1.1). "Permitir" reaproveita `solicitarPermissaoPostNotifications` / `solicitarPermissaoAlarmeExato`. A situação é relida quando a tela volta ao foco e quando o app volta do segundo plano (`AppState`), já que a permissão pode ter sido dada na configuração do sistema. Tudo por import dinâmico, pela mesma regra do Expo Go do resto do projeto; no Expo Go a seção mostra que lembretes não estão disponíveis.
- A versão vem de `expo-constants` (`Constants.expoConfig?.version`), já instalado.

### Notas da conferência na documentação do Expo v57 (tarefa 1.1)

- **`SymbolView` (expo-symbols)**: funciona no Android (Material Symbols), no Expo Go e na web, mas `name` precisa ser um objeto por plataforma (`{ ios, android, web }`); string pura é tratada como SF Symbol e não renderiza no Android. `Icone` passa sempre o objeto. Biblioteca em beta.
- **`NativeTabs.Trigger.Icon`**: aceita `md` (nome Material) — confirmado nos tipos do pacote instalado; prioridade no Android `drawable` > `md` > `src`. `NativeTabs` aceita `iconColor`, `tintColor`, `indicatorColor`, `backgroundColor` e `labelStyle`.
- **`expo-sqlite/kv-store`**: `import Storage from 'expo-sqlite/kv-store'`, com `getItemSync`, `setItemSync`, `removeItemSync` (valores string).
- **`useFonts`**: devolve `[loaded, error]`; suportado no Expo Go.
- **Redirecionamento inicial**: em vez de `Redirect`, usar `Stack.Protected` com `guard` (ao mudar o guard, o expo-router leva à primeira tela disponível e limpa o histórico da protegida). A flag da boas-vindas fica num store Zustand inicializado do kv-store, para o layout reagir quando a boas-vindas a grava. `redirectTo` só existe a partir do SDK 58 e não é usado.
- **`Appearance.setColorScheme`**: no RN 0.86 o tipo é `'light' | 'dark' | 'unspecified'`; "Sistema" usa `'unspecified'` (não `null`).
- **Alarme exato**: o `expo-notifications` não expõe consulta de `SCHEDULE_EXACT_ALARM`. Conforme o fallback já previsto, a linha do perfil mostra só "Abrir configurações", sem estado.

## Risks / Trade-offs

- [Contraste da paleta escura não validado no canvas] → os valores escuros acima são ponto de partida; a tarefa de verificação mede contraste de cada par texto/fundo usado (ex.: com um script simples sobre os tokens) e ajusta antes de fechar.
- [`SymbolView` pode não renderizar no Expo Go/web ou não ter algum nome] → `Icone` centraliza o mapeamento, então trocar por SVG (plano B da decisão 3) afeta um arquivo só.
- [Fontes atrasam a primeira renderização] → a splash já cobre esse tempo; em erro de carregamento o app segue com a fonte do sistema em vez de travar.
- [Mudar o momento do pedido de permissões pode quebrar a verificação pendente das tarefas 5.1/5.2 da change anterior] → o comportamento após a boas-vindas é o mesmo de hoje; registrar na verificação manual que o primeiro pedido agora vem da boas-vindas.
- [Usuários que já usam o app verão a boas-vindas uma vez após a atualização] → aceitável (app de uso pessoal); se incomodar, a flag pode ser pré-gravada quando já houver medicamentos cadastrados — deixado de fora para manter a regra simples da spec.
- [A delta de `agenda-views` depende da spec ainda não arquivada] → arquivar `add-medication-scheduling` antes desta change.

- [Preferência fixa "Claro"/"Escuro" esquecida pelo usuário faz o app ignorar o modo escuro do sistema] → a frase sob a escolha deixa isso explícito ("Sempre claro, mesmo com o Android no modo escuro").
- [Consulta do alarme exato pode não existir na API JS da v57] → a linha cai para "Abrir configurações" sem estado, sem bloquear o resto do perfil.

## Migration Plan

Sem migração de dados. Ordem segura de implementação: tokens e fontes → componentes de UI → telas existentes → barra de abas → boas-vindas e ajuste do pedido de permissões. Cada passo deixa o app funcionando. Rollback é reverter os commits; a flag no kv-store é inofensiva se ficar órfã.
