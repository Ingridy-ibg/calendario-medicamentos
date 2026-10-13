## Why

A escolha entre prioridade "Comum" e "Especial" muda muito o comportamento dos lembretes:
- quais ações aparecem;
- quantas vezes o lembrete repete;
- se a dose pode virar perdida;
- se toca como alarme em tela cheia.

Hoje o formulário explica isso em uma linha por opção. O "Como tomar" já tem um botão "i" com uma explicação detalhada de cada tipo de esquema, e a prioridade merece o mesmo, para o usuário escolher sabendo o que vai acontecer.

## What Changes

- Novo botão de informação ("i") ao lado do título "Prioridade dos lembretes" no formulário de cadastro e de edição, igual ao de "Como tomar".
- Tocar no botão abre um modal que explica as duas prioridades, uma por vez (Comum, depois Especial), no mesmo formato do modal de tipos de esquema:
  - nome, descrição curta, exemplo e pontos-chave;
  - setas e bolinhas de navegação;
  - abre na prioridade efetiva do formulário (cíclico = Especial);
  - fecha ao tocar fora ou no voltar do Android.
- O conteúdo descreve o comportamento já especificado:
  - **comum**: notificação que vibra, três ações (tomei agora, adiar, não tomar), reenvio a cada 30 min até 4 notificações sem resposta, depois perdida;
  - **especial**: alarme em tela cheia com som, só "tomei agora", repete a cada 30 min até confirmar, nunca vira perdida, cíclicos são sempre especiais, a observação aparece no alarme.
- O modal de tipos de esquema e o novo passam a compartilhar a mesma estrutura de modal paginado. O comportamento do modal de tipos não muda.

Premissa: o texto do Especial descreve o alarme em tela cheia, então esta change deve ser implementada **depois** de `alarme-tela-cheia` (e de `identidade-e-observacoes`, por citar a observação). Se for implementada antes, o texto do Especial tem que ser ajustado ao comportamento da época.

## Capabilities

### New Capabilities
<!-- nenhuma -->

### Modified Capabilities
- `medication-registration`: nova exigência de explicação das prioridades de lembrete no formulário.

## Impact

- `src/components/medicamento/formulario-medicamento.tsx`: botão "i" na seção de prioridade.
- `src/components/medicamento/ajuda-tipos-esquema.tsx`: a estrutura do modal (cartão, cabeçalho "X de N", setas, bolinhas, fechar) é extraída para um componente reutilizável.
- Novo `src/components/medicamento/ajuda-prioridades.tsx` e novo conteúdo em `src/constants/` (`prioridades.ts`) com teste.
- Canvas de telas: um artboard novo "Info — prioridade dos lembretes", opcional, no padrão de "Info — tipos de esquema".
