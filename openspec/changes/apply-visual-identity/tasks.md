## 1. Base: tokens, fontes e ícones (conforme `specs/visual-identity`)

- [ ] 1.1 Consultar na documentação do Expo v57 as APIs usadas nesta change (`expo-font`/`useFonts`, `expo-symbols`/`SymbolView` no Android, `NativeTabs.Trigger.Icon` com ícone Material, `expo-sqlite/kv-store`, redirecionamento inicial no expo-router) e anotar no design.md qualquer divergência da decisão tomada; verificar que cada decisão do design.md cita uma API existente na v57.
- [ ] 1.2 Substituir `Colors.light/dark` em `src/constants/theme.ts` pelos tokens do design.md (incluindo os de status) e migrar os usos de `backgroundElement`/`backgroundSelected`; verificar com `npx tsc --noEmit` sem erros.
- [ ] 1.3 Escrever um teste Vitest que calcula o contraste WCAG de cada par texto/fundo usado (texto, texto secundário, status e `onAccent` sobre seus fundos) nos dois temas e ajustar os valores escuros até todos passarem 4,5:1; verificar com o teste passando.
- [ ] 1.4 Trocar `CORES_STATUS_DOSE` em `src/constants/rotulos.ts` por um mapa status → token resolvido via `useTheme()`, e atualizar os usos na agenda e no calendário; verificar com `npx tsc --noEmit` e os testes existentes passando.
- [ ] 1.5 Adicionar `@expo-google-fonts/bricolage-grotesque` e `@expo-google-fonts/figtree` com `npx expo install`, carregar com `useFonts` em `src/app/_layout.tsx` mantendo a splash até migrações e fontes ficarem prontas (erro de fonte não bloqueia); verificar abrindo o app que não há flash de fonte do sistema.
- [ ] 1.6 Atualizar `ThemedText` para escolher a família pelo peso (Figtree) e adicionar o tipo `display` (Bricolage Grotesque), com algarismos tabulares para horários; verificar visualmente o título "Agenda" em Bricolage e o corpo em Figtree.
- [ ] 1.7 Criar `src/components/ui/icone.tsx` sobre `SymbolView` com o mapeamento de nomes do design.md (plano B: SVG, se a 1.1 mostrar que não funciona no Expo Go); verificar que cada ícone do mapeamento aparece numa tela de teste temporária ou na agenda.

## 2. Componentes de UI compartilhados

- [ ] 2.1 Criar em `src/components/ui/` os componentes `Cartao`, `Botao` (primário, secundário, suave), `Chip`, `Segmentado`, `CampoTexto` (rótulo, input, erro), `CabecalhoSecao` e `IconeStatus`, todos lendo cores de `useTheme()` e com área de toque mínima de 44 pt; verificar com `npx tsc --noEmit` e usando-os nas tarefas 3 e 4.

## 3. Agenda diária (conforme `specs/agenda-views`)

- [ ] 3.1 Implementar `resumirDia(itens, agora)` em `src/domain/agenda-views/` (tomadas/total só de doses agendadas, marcas por status, próxima pendente/aguardando por horário); verificar com testes cobrindo dia vazio, todas resolvidas, empate de horário e exclusão de "se necessário".
- [ ] 3.2 Implementar `agruparPorPeriodo(itens)` (Manhã < 12:00, Tarde < 18:00, Noite, Se necessário, sem seções vazias); verificar com testes cobrindo os cortes exatos de 12:00 e 18:00 e a omissão de seções vazias.
- [ ] 3.3 Reescrever `src/app/(tabs)/index.tsx` conforme o artboard "Agenda do dia": cabeçalho com data e botão "Novo", cartão-resumo, seções por período, itens com ícone de status, destaque da próxima dose, ações em toda dose pendente/aguardando, alerta de estoque e posição do ciclo; verificar no app com dados de teste de cada tipo de esquema e status, nos temas claro e escuro.

## 4. Calendário mensal e formulário

- [ ] 4.1 Alterar `corDoDia` para devolver token e estilo (cheio/contorno) e reescrever `src/app/(tabs)/calendario.tsx` conforme o artboard "Calendário mensal" (navegação com ícones e rótulos de acessibilidade, hoje com anel, selecionado preenchido, legenda, painel do dia com marcador de status); verificar no app navegando entre meses e selecionando dias passados, hoje e futuros, nos dois temas.
- [ ] 4.2 Reescrever `src/app/medicamento/novo.tsx` conforme o artboard "Novo medicamento" (seções em cartões, chips de tipo, horários em chips com "+ Horário", seletor de horário também no Cíclico, duração segmentada, criticidade com descrição e travada no Cíclico, "Salvar medicamento" fixo no rodapé) e desligar o cabeçalho nativo do modal em `_layout.tsx`; verificar cadastrando um medicamento de cada tipo de esquema e provocando um erro de validação de cada campo.

## 5. Barra de abas

- [ ] 5.1 Atualizar `src/components/app-tabs.tsx` com as cores da identidade e ícones Material (lista e calendário), e remover os PNGs do starter de `assets/images/tabIcons/` se não forem mais usados; verificar no app que a aba ativa aparece na cor de destaque nos dois temas.

## 6. Boas-vindas (conforme `specs/onboarding`)

- [ ] 6.1 Criar um módulo fino em `src/lib/` que lê e grava a flag `boasVindasConcluida` no `expo-sqlite/kv-store`, e a função pura que decide se a boas-vindas deve ser exibida; verificar com teste da função pura.
- [ ] 6.2 Criar `src/app/boas-vindas.tsx` conforme o artboard "Boas-vindas" (sem cabeçalho e sem voltar), com "Ativar lembretes e começar" (grava a flag, pede as permissões essenciais via import dinâmico, `replace` para a agenda) e "Agora não" (grava a flag, `replace` para a agenda), e redirecionar para ela em `_layout.tsx` quando a flag estiver ausente; verificar limpando os dados do app: a boas-vindas aparece, e após cada opção não aparece mais.
- [ ] 6.3 Fazer `inicializarNotificacoes()` pular `solicitarPermissoesEssenciais()` enquanto a flag estiver ausente, mantendo canais, tarefas e reconciliador; verificar numa instalação limpa que nenhum pedido de permissão aparece sobre a boas-vindas e que, depois de "Agora não", o pedido volta a aparecer na abertura seguinte.

## 7. Meu perfil e aparência (conforme `specs/user-profile`)

- [ ] 7.1 Criar em `src/lib/` a leitura/gravação de `perfil.nome` e `aparencia` no kv-store, com funções puras para normalizar o nome (vazio/só espaços → sem nome), obter a inicial e mapear a preferência para o valor de `Appearance.setColorScheme`; verificar com testes das funções puras.
- [ ] 7.2 Aplicar a preferência salva no topo de `_layout.tsx`, antes da primeira renderização; verificar no app que, com "Escuro" salvo e o sistema claro, a splash, a boas-vindas e a agenda abrem escuras.
- [ ] 7.3 Adicionar `consultarPermissoes()` em `src/notifications/permissoes.ts` (sem pedir nada), com o comportamento de fallback do design.md para o alarme exato; verificar num dispositivo/emulador que abrir o perfil não dispara nenhum pedido.
- [ ] 7.4 Criar `src/app/perfil.tsx` conforme o artboard "Meu perfil" (nome, escolha de aparência com prévias e frase explicativa, permissões com "Permitir" e releitura ao voltar ao foco/primeiro plano, aviso de privacidade e versão) e registrá-la no `Stack`; verificar no app que trocar a aparência muda todas as telas na hora, inclusive a barra de abas, e que a escolha sobrevive a fechar e abrir o app.
- [ ] 7.5 Adicionar o botão de perfil (inicial ou ícone de pessoa, rótulo "Meu perfil") ao cabeçalho da agenda; verificar que ele abre o perfil e que a inicial muda ao alterar o nome.

## 8. Verificação de ponta a ponta

- [ ] 8.1 Percorrer o app num dispositivo/emulador Android em instalação limpa, nas aparências Sistema (com o Android claro e escuro), Claro e Escuro: boas-vindas → agenda → perfil → novo medicamento → agenda → calendário, comparando cada tela com o artboard correspondente do canvas; rodar `npx vitest run` e `npx tsc --noEmit` sem falhas; documentar diferenças intencionais e o que ficou pendente.
