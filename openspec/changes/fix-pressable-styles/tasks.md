## 1. Confirmar a causa

- [ ] 1.1 No aparelho (Expo Go), confirmar com uma tela temporária que um `Pressable` com `style` em objeto mostra o fundo e com `style={({ pressed }) => …}` não mostra; remover a tela temporária. Se ambos falharem, pausar e revisar o design.md. **Pendente**: sem aparelho nesta máquina; o relato do usuário ("Novo" e "Salvar medicamento" transparentes) confirma o lado da função — confirmar o lado do objeto junto com a 3.2.

## 2. Componente e correções

- [x] 2.1 Criar `src/components/ui/tocavel.tsx` (Pressable com `pressionado` em estado, estilo em objeto, handlers repassados); verificar com `npx tsc --noEmit`.
- [x] 2.2 Reescrever `Botao` e `Chip` sobre `Tocavel`; verificar no aparelho que "Novo", "Salvar medicamento", "Tomei agora", "Não tomar" e os chips de tipo de esquema mostram fundo e borda, nos temas claro e escuro. **Implementado** (typecheck ok); falta conferir no aparelho.
- [x] 2.3 Trocar os `Pressable` com estilo em função de `ChipAdicionar` (`novo.tsx`), `BotaoPerfil` (`index.tsx`), botões de mês (`calendario.tsx`), "Ver agenda" (`saudacao.tsx`) e `TabButton` (`app-tabs.web.tsx`) por `Tocavel`; verificar no aparelho cada um deles. **Implementado** (typecheck ok); falta conferir no aparelho.

## 3. Proteção contra regressão

- [x] 3.1 Criar o teste de varredura que falha se algum `.tsx` em `src/` tiver `style={({`; verificar que ele falha antes das correções (rodando contra o código atual) e passa depois. Falhou apontando os 7 pontos (calendario.tsx, index.tsx, novo.tsx, saudacao.tsx, app-tabs.web.tsx, botao.tsx, chip.tsx) e passa depois da correção.
- [ ] 3.2 Rodar `npx vitest run` e `npx tsc --noEmit` sem falhas e percorrer no aparelho agenda, calendário, formulário, perfil, boas-vindas e saudação conferindo que nenhum elemento tocável está sem fundo ou borda; documentar o resultado. **Parcial**: `npx vitest run` (266 testes) e `npx tsc --noEmit` passam; falta o percurso no aparelho.
