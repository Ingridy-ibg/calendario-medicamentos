## Why

Os botões "Novo" e "Salvar medicamento" aparecem transparentes, sem o fundo verde-petróleo que a spec `visual-identity` exige ("Ação primária usa a cor de destaque"). A causa está na combinação do NativeWind v4 com `Pressable`: o NativeWind envolve **todo** `Pressable` do app (`react-native-css-interop/dist/runtime/wrap-jsx.js`) e trata o `style` como estilo inline (`collectInlineRules` em `native-interop.js`). Quando o `style` é uma função (`style={({ pressed }) => …}`), ela é repassada como se fosse um objeto e nunca é chamada — fundo, borda, raio e tamanho mínimo somem. As telas antigas não tinham o problema porque usavam `className`.

## What Changes

Trocar o estilo em forma de função por estilo em objeto, com o estado "pressionado" controlado pelo próprio componente, em todos os pontos afetados:

- `Botao` (`src/components/ui/botao.tsx`) — afeta todos os botões: "Novo", "Salvar medicamento", "Tomei agora", "Não tomar", "Registrar dose", "Ativar lembretes e começar", "Permitir"/"Abrir configurações" do perfil.
- `Chip` (`src/components/ui/chip.tsx`) — tipos de esquema no formulário (o selecionado perde o fundo escuro e todos perdem a borda).
- `ChipAdicionar` em `src/app/medicamento/novo.tsx` — "+ Horário" perde a borda tracejada.
- `BotaoPerfil` em `src/app/(tabs)/index.tsx` — o círculo com a inicial perde o fundo.
- Botões de mês anterior/próximo em `src/app/(tabs)/calendario.tsx` — perdem o fundo branco.
- "Ver agenda" em `src/app/saudacao.tsx` — perde o fundo verde.
- `TabButton` em `src/components/app-tabs.web.tsx` — perde só o efeito de toque.

Também criar um componente `Tocavel` (Pressable com feedback de toque em objeto) para que telas futuras não repitam o erro, e uma verificação automática que falhe se algum `style={({ pressed })` voltar a aparecer.

Nenhum comportamento especificado muda — esta change só faz o código cumprir o que a spec `visual-identity` já exige — por isso não tem delta de specs (`skip_specs`).

## Capabilities

### New Capabilities
- (nenhuma)

### Modified Capabilities
- (nenhuma)

## Impact

- **Código**: os sete arquivos listados acima e um novo `src/components/ui/tocavel.tsx`; um teste de varredura em `src/components/ui/`.
- Sem dependência nova e sem migração.
- **Relação com outras changes**: as telas de `manage-medications` e `register-ongoing-medication` devem usar `Botao`/`Tocavel` já corrigidos; implementar esta antes delas.
