## Why

O formulário de cadastro oferece cinco tipos de esquema — Diário, A cada X horas, Dias da semana, Cíclico e Se necessário — sem explicar nenhum. Alguns têm regras pouco óbvias (o cíclico só avança com a confirmação da nova cartela; o intervalo conta a partir de quando a dose foi tomada; o "se necessário" não tem lembretes), e escolher o tipo errado gera uma agenda errada.

## What Changes

- Um botão de informação **(i)** ao lado do título "Como tomar" no formulário (cadastro e edição).
- Ao tocar, abre um **modal sobre o formulário** com um carrossel que explica os cinco tipos, um por vez: nome, frase curta, exemplo com uma ilustração simples e os pontos-chave de cada tipo.
- Navegação por setas e por **uma bolinha para cada tipo** (a bolinha do tipo atual fica destacada; tocar numa bolinha vai direto para aquele tipo).
- O modal **abre no tipo selecionado** no formulário.
- O modal fecha ao **tocar fora dele** (e pelo botão voltar do Android); nada no formulário muda.

Referência visual: artboards "Novo medicamento" (com o (i)) e "Info — tipos de esquema" do canvas (https://claude.ai/artifact/5RZ2sX5YF1fbQTYfot6j8J).

## Capabilities

### New Capabilities
- (nenhuma)

### Modified Capabilities
- `medication-registration`: explicação dos tipos de esquema acessível no formulário. (A spec ainda vive na change ativa `add-medication-scheduling`.)

## Impact

- **Código**: novo `src/components/medicamento/ajuda-tipos-esquema.tsx` (modal + carrossel) e o conteúdo dos tipos num módulo de constantes; `src/components/medicamento/formulario-medicamento.tsx` (o (i) e o estado do modal); ícone `info` já existe no `Icone`.
- Sem mudança de banco nem de regras de agendamento.
