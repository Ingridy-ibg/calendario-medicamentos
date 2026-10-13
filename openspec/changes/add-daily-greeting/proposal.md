## Why

O app é aberto várias vezes ao dia, quase sempre direto para a agenda, sem nenhum momento que situe o usuário no dia: quantas doses tem hoje, qual é a próxima. Uma saudação personalizada ("Bom dia, Ana!") na primeira abertura do dia, junto com esse resumo, deixa o app mais acolhedor e útil — sem atrapalhar as aberturas seguintes, que continuam indo direto para a agenda.

## What Changes

- Adicionar uma tela de **saudação** exibida na **primeira abertura do dia**: "Bom dia", "Boa tarde" ou "Boa noite" conforme o horário, com o primeiro nome do usuário quando houver, a data e a hora, um resumo das doses do dia e um cartão com a próxima dose. O visual acompanha o período (manhã, tarde, noite).
- A saudação segue **sozinha para a agenda** depois de alguns segundos; um toque em qualquer lugar ou em "Ver agenda" pula a espera.
- A saudação **não** aparece: na primeira abertura do app (boas-vindas), quando o app é aberto por uma notificação, nem nas aberturas seguintes do mesmo dia.
- O **cabeçalho da agenda** passa a mostrar sempre a saudação do período ("Bom dia, Ana!") como título, com a data acima.

## Capabilities

### New Capabilities
- `daily-greeting`: regras de período, nome, frequência, conteúdo e passagem automática da tela de saudação, e a saudação no cabeçalho da agenda.

### Modified Capabilities
- (nenhuma) — o uso do nome na saudação foi acomodado na própria spec `user-profile` da change `apply-visual-identity`, ainda não arquivada, que agora permite que outras capabilities exibam o nome dentro do app.

## Impact

- **Código**: nova rota `src/app/saudacao.tsx`; lógica pura em `src/domain/` (período, texto da saudação, resumo, decisão de exibir); leitura/gravação da data da última saudação no `expo-sqlite/kv-store`; `src/app/_layout.tsx` (decidir a rota inicial junto com a boas-vindas e ignorar aberturas por notificação); cabeçalho de `src/app/(tabs)/index.tsx`.
- **Dependências entre changes**: implementar depois de `apply-visual-identity`, de onde vêm o nome do perfil, a flag da boas-vindas, `resumirDia`, os tokens de cor e o cabeçalho redesenhado da agenda.
- **Sem migração de banco** e sem dependência nova.
- **Referência visual**: artboard "Saudação ao abrir" (com os períodos no Tweaks) e o cabeçalho de "Agenda do dia" e "Agenda do dia — escuro" no canvas (https://claude.ai/artifact/5RZ2sX5YF1fbQTYfot6j8J).
