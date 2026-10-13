## Context

O ícone, a splash (`#208AEF`) e o nome do app (`calendario-medicamentos`) ainda são os do template do Expo. O logo foi desenhado no canvas de telas (artboard "Nome e logo") como SVG: um quadrado arredondado em `#0E6B58` e uma cápsula rotacionada −45°, com contorno branco e a metade direita preenchida. Não há ferramenta de conversão SVG→PNG instalada no projeto nem no sistema.

A tabela `medicamentos` não tem campo de texto livre. O formulário de cadastro e o de edição compartilham `src/components/medicamento/formulario-medicamento.tsx` e o estado em `src/state/cadastro-store.ts`.

## Goals / Non-Goals

**Goals:**
- Um SVG-fonte versionado e um script que gera todos os PNGs de ícone e splash de forma reproduzível.
- Observações persistidas, editáveis e exibidas no detalhe.

**Non-Goals:**
- Mostrar a observação na tela de alarme. Isso fica com a `alarme-tela-cheia`, que lê o mesmo campo.
- Trocar `slug`, `package` ou `scheme`: mudariam o projeto EAS e o identificador do app instalado.
- O ícone de iOS (`assets/expo.icon`): o app é distribuído só para Android.

## Decisions

### 1. SVG-fonte + script com `sharp`

Ficam `assets/brand/logo.svg` (com fundo), `assets/brand/logo-glifo.svg` (só a cápsula) e `scripts/gerar-icones.mjs`, que usa `sharp` como devDependency para gerar:
- `icon.png` (1024);
- foreground adaptativo (1024, glifo branco dentro da zona segura de 66%);
- background adaptativo (cor sólida `#0E6B58`);
- monocromático (glifo preto sobre transparente);
- `splash-icon.png` (glifo branco);
- `favicon.png`.

*Alternativa considerada:* exportar os PNGs manualmente de um editor. Foi descartada por não ser reproduzível; qualquer ajuste no logo exigiria repetir o processo à mão.

### 2. Configuração nativa via `app.json`

Os campos alterados são:
- `name: "Tomei"`;
- `android.adaptiveIcon.backgroundColor: "#0E6B58"`, apontando para os novos PNGs;
- plugin `expo-splash-screen` com `backgroundColor: "#0E6B58"` e `image` do glifo.

Splash em modo escuro: a mesma cor, porque o verde-petróleo tem contraste com o glifo branco nos dois temas.

### 3. Coluna `observacoes` nula

A coluna é `observacoes text` (nula) em `medicamentos`, com a migração gerada por `drizzle-kit generate`. Nulo significa "sem observação"; o texto é normalizado (trim, vazio → `null`) no domínio, na validação do cadastro, para que repositório e telas nunca vejam string vazia. O limite de 200 caracteres é validado no domínio e reforçado com `maxLength` no campo.

*Alternativa considerada:* tabela separada de anotações. Foi descartada porque é sempre 1:1 com o medicamento e não há histórico de observações.

### 4. Dica dependente da prioridade efetiva

A dica usa a criticidade *efetiva*: cíclico conta sempre como especial, a mesma regra que trava a escolha de prioridade no formulário. Isso evita uma dica de "só no app" para um cíclico, que terá alarme.

### 5. Card no detalhe abaixo do cabeçalho

O card fica acima do esquema, como no canvas: a instrução é o que o usuário mais precisa ver ao abrir o remédio. O texto quebra linhas normalmente, sem truncar.

## Risks / Trade-offs

- **[Risco] O `sharp` falhar ao instalar no ambiente de CI/EAS.** → Mitigação: o script roda só localmente, e os PNGs gerados são commitados. O build não depende do `sharp`.
- **[Risco] O launcher manter o ícone antigo em cache.** → Mitigação: reinstalar o APK ou limpar o cache do launcher no teste. Não afeta usuários novos.
- **[Trade-off] O nome "Tomei" está decidido só na exploração.** Trocar depois exige mudar apenas `app.json`, as strings de boas-vindas e Perfil e o wordmark.

## Migration Plan

1. A migração `0004` adiciona a coluna nula. Medicamentos existentes ficam sem observação e não há backfill.
2. Novo APK por causa do ícone e do nome (fingerprint muda). Usuários que atualizarem por cima mantêm os dados, porque o `package` é o mesmo.
3. Rollback: a coluna nula pode ficar no banco mesmo se o código voltar, sem quebrar a versão anterior.
