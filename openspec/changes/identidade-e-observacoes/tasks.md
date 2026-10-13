## 1. Logo e ícones

- [x] 1.1 Criar `assets/brand/logo.svg` e `assets/brand/logo-glifo.svg` com o desenho do canvas (tile `#0E6B58` rx 26/100, cápsula −45°, metade preenchida). Verificar: os SVGs abrem no navegador iguais ao artboard "Nome e logo"
- [x] 1.2 Adicionar `sharp` como devDependency e criar `scripts/gerar-icones.mjs`, que gera icon, foreground, background e monocromático adaptativos, splash e favicon em `assets/images/`. Verificar: `node scripts/gerar-icones.mjs` sobrescreve os 6 PNGs, e o glifo do foreground cabe na zona segura de 66%
- [x] 1.3 Atualizar o `app.json`: `name: "Tomei"`, `adaptiveIcon.backgroundColor` e a splash `#0E6B58`. Verificar: `npx expo config --type public` mostra os valores novos
- [x] 1.4 Remover do repositório os assets do template que deixaram de ser usados (`expo-badge*`, `expo-logo`, `react-logo*`, `tutorial-web`, `logo-glow`), se não houver referência. Verificar: `grep -r` não encontra uso e `npx tsc --noEmit` passa

## 2. Nome nas telas

- [x] 2.1 Boas-vindas: trocar o ícone do hero pelo glifo novo, adicionar o wordmark "tomei." acima do título e remover a frase "Tudo fica salvo só neste aparelho" (se ainda estiver lá). Verificar: a tela confere com o artboard "Boas-vindas"
- [x] 2.2 Perfil: o rodapé passa a mostrar "Tomei · versão X.Y.Z", com a versão lida do `expo-constants`. Verificar: a aba Perfil mostra o novo rodapé

## 3. Observações: dados e domínio

- [x] 3.1 Adicionar a coluna `observacoes` (texto nulo) em `medicamentos` no `src/db/schema.ts` e gerar a migração com `npx drizzle-kit generate`. Verificar: aparecem `drizzle/0004_*.sql` e `drizzle/migrations.js` atualizado, e os testes de repositório passam
- [x] 3.2 Incluir `observacoes` nos tipos, na validação (trim, vazio → nulo, máximo 200) e no cadastro/edição de `medication-registration` e no repositório. Verificar: novos testes de validação para espaços, vazio, 200 e 201 caracteres
- [x] 3.3 Incluir `observacoes` no `cadastro-store` e no preenchimento do formulário de edição a partir do medicamento salvo. Verificar: editar um medicamento com observação mostra o texto já preenchido

## 4. Observações: telas

- [x] 4.1 Adicionar o campo multilinha "Observações" no `formulario-medicamento.tsx`, depois de "Prioridade dos lembretes", com `maxLength={200}` e a dica conforme a criticidade efetiva (cíclico = especial). Verificar: trocar a prioridade troca a dica, e cíclico sempre mostra a dica de alarme
- [x] 4.2 Adicionar o card "Observações" no detalhe (`medicamento/[id]/index.tsx`) abaixo do cabeçalho, só quando houver texto. Verificar: aparece com observação e some sem ela

## 5. Validação

- [x] 5.1 Rodar `npx vitest run` e `npx tsc --noEmit`. Verificar: ambos passam
- [ ] 5.2 Gerar um APK (`eas build --profile preview`), instalar por cima da versão atual e conferir o ícone, o nome no launcher, a splash verde e que os medicamentos existentes continuam lá sem observação. Verificar: checagem manual no aparelho
