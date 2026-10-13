## 1. Componentes

- [x] 1.1 Extrair `EscolhaAparencia` e `PreviaTema` de `src/app/perfil.tsx` para `src/components/perfil/` e usá-los no Perfil; verificar com `npx tsc --noEmit` e no app que o Perfil continua igual.

## 2. Boas-vindas em duas etapas (conforme `specs/onboarding`)

- [x] 2.1 Adicionar a etapa `'perfil'` em `src/app/boas-vindas.tsx` conforme o artboard "Boas-vindas — nome e aparência": exibida depois dos pedidos de permissão e depois de "Agora não"; campo de nome (opcional), `EscolhaAparencia` aplicada na hora e o botão único "Começar" (salva o nome e conclui a boas-vindas); verificar no app, em instalação limpa, os caminhos "Ativar lembretes" e "Agora não", com e sem nome, e no modo escuro.
- [x] 2.2 Verificar no app que fechar o app na etapa de nome e aparência abre a agenda direto na próxima vez, com a aparência escolhida.

## 3. Perfil na barra de abas (conforme `specs/user-profile`)

- [x] 3.1 Mover `src/app/perfil.tsx` para `src/app/(tabs)/perfil.tsx` sem o botão de voltar, adicionar a aba "Perfil" (ícone `person`) em `app-tabs.tsx` e `app-tabs.web.tsx`, tirar a rota do `Stack` e o `BotaoPerfil` da agenda; verificar com `npx tsc --noEmit` (tipos de rota regenerados) e no app que a aba abre o perfil, fica ativa e que "Bom dia, Ana!" aparece inteiro no cabeçalho.

## 4. Verificação

- [x] 4.1 Rodar `npx vitest run` e `npx tsc --noEmit` sem falhas e documentar o percurso no aparelho.

> Verificação no aparelho concluída em 13/10/2026: todos os percursos manuais desta change foram testados e aprovados.
