## 1. Conteúdo

- [x] 1.1 Criar `src/constants/tipos-esquema.ts` com título, descrição, exemplo e pontos de cada tipo (textos do artboard "Info — tipos de esquema"); verificar com teste que todo `TipoEsquema` tem conteúdo, na ordem de `TIPOS_ESQUEMA`.

## 2. Modal

- [x] 2.1 Criar `src/components/medicamento/ajuda-tipos-esquema.tsx` (Modal transparente, fundo tocável que fecha, `onRequestClose`, carrossel com setas e bolinhas acessíveis, ilustração por tipo) conforme o artboard; verificar com `npx tsc --noEmit` e o teste de varredura de `Pressable` passando.

## 3. Formulário

- [ ] 3.1 Adicionar o botão (i) ao lado de "Como tomar" no `FormularioMedicamento` (cadastro e edição), abrindo o modal no tipo selecionado; verificar no app: abre no tipo marcado, setas e bolinhas navegam, primeira/última seta desativada, tocar fora e o voltar do Android fecham sem mudar o formulário.

## 4. Verificação

- [ ] 4.1 Rodar `npx vitest run` e `npx tsc --noEmit` sem falhas e conferir no aparelho com TalkBack (rótulos do (i), setas, bolinhas e anúncio da troca de tipo); documentar o resultado.
