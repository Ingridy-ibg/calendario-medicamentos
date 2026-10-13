## Why

O app ainda se chama `calendario-medicamentos` no aparelho e usa o ícone e a tela de abertura azul padrão do Expo, o que destoa da identidade verde-petróleo já aplicada às telas. Além disso, muitos remédios têm instruções que o usuário precisa lembrar ("em jejum", "com comida", "não partir"), e hoje não há onde anotá-las.

## What Changes

- O app ganha nome, **Tomei**, e um logo: uma cápsula com metade preenchida, sobre verde-petróleo. São aplicados ao ícone do Android (adaptativo, redondo e monocromático/temático), à tela de abertura, à boas-vindas e ao rodapé do Perfil.
- A tela de abertura deixa de usar o azul padrão do Expo e passa ao verde-petróleo com o logo.
- Novo campo opcional **Observações** (até 200 caracteres) no cadastro e na edição de medicamentos. A dica abaixo do campo muda conforme a prioridade:
  - comum: aparece só no app;
  - especial: aparece também na tela do alarme.
- O detalhe do medicamento mostra um card "Observações" quando houver texto.
- As observações não aparecem em notificações nem na agenda. A exibição no alarme dos especiais é entregue pela change `alarme-tela-cheia`.

Premissa: o nome "Tomei" foi escolhido na exploração (canvas "Nome e logo"). Trocar o nome depois muda apenas textos e o `app.json`.

## Capabilities

### New Capabilities
<!-- nenhuma -->

### Modified Capabilities
- `visual-identity`: nova exigência de nome e ícone do app e de tela de abertura na identidade.
- `medication-registration`: novo campo opcional de observações no cadastro e na edição.
- `medication-management`: o detalhe exibe as observações.
- `user-profile`: o rodapé mostra o nome do app junto com a versão.

## Impact

- Banco: nova coluna `observacoes` (texto, nula) em `medicamentos` e nova migração Drizzle (`drizzle/0004_*`).
- Domínio: `medication-registration` (tipos, validação, formulário), repositório `medicamentos`.
- Telas: `medicamento/novo`, `medicamento/[id]/editar` (via `formulario-medicamento.tsx`), `medicamento/[id]/index`, `boas-vindas`, `(tabs)/perfil`.
- Assets: novos `icon.png`, `android-icon-foreground.png`, `android-icon-background.png`, `android-icon-monochrome.png`, `splash-icon.png` e `favicon.png`, gerados a partir de um SVG-fonte versionado no repositório.
- `app.json`: `name`, cores do ícone adaptativo e da splash. O `slug`, o `package` e o projeto EAS não mudam.
- Exige um APK novo, porque ícone e nome são nativos.
