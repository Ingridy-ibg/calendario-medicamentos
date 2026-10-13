## Why

O cadastro trata todo medicamento como se começasse no momento do cadastro. Para quem já estava tomando — o caso de quase todo usuário novo do app — isso dá resultados errados: um tratamento de 10 dias iniciado há 4 termina 4 dias depois do real; um "a cada 8 horas" com última dose às 06:00 recebe a próxima dose agora, e não às 14:00; e um cíclico cadastrado no meio da cartela fica em espera, sem nenhuma dose nem lembrete, até a próxima cartela começar (cerca de duas semanas sem lembrete). Além disso, o usuário salva o cadastro sem ver o que o app entendeu: quando é a próxima dose, quando o tratamento termina e se o estoque dá até o fim.

## What Changes

- Adicionar ao cadastro a opção **"Já estava tomando"**, com perguntas conforme o tipo de esquema:
  - Diário / Dias da semana com duração fixa: data em que o tratamento começou.
  - A cada X horas: data e hora da última dose (e, com duração fixa, a data de início).
  - Cíclico: se está tomando ou na pausa, e em que dia da cartela ou da pausa está hoje.
  - Doses de hoje cujo horário já passou: "Já tomou?", por horário; as marcadas entram no histórico como tomadas.
  - "Se necessário": a opção não se aplica.
- Adicionar a tela **"Confira antes de salvar"**, exibida em **todo** cadastro (em uso ou não), com o resumo calculado do que vai entrar na agenda: próximas doses, situação do tratamento (dias e doses restantes, término) ou da cartela (comprimidos restantes, pausa, nova cartela prevista), estoque e até quando dura, as doses de hoje e o aviso de que os dias anteriores ao cadastro ficam sem registro. Nada é salvo antes de "Confirmar e agendar"; "Ajustar" volta ao formulário preenchido.
- Avisar quando o estoque informado **não é suficiente** para terminar um tratamento de duração fixa, com a data da dose em que ele acaba.
- Os dias anteriores ao cadastro **não** recebem registro de adesão (nem tomada nem perdida).
- O formulário de cadastro termina em "Continuar" (vai para a confirmação) em vez de "Salvar medicamento".

## Capabilities

### New Capabilities
- (nenhuma)

### Modified Capabilities
- `medication-registration`: opção "já estava tomando", perguntas por tipo, validações e a tela de confirmação obrigatória.
- `dose-scheduling`: início de tratamento no passado para a contagem da duração, primeira dose do intervalo a partir da última dose informada, e ciclo cíclico já em andamento (dia da cartela ou da pausa) no cadastro.
- `adherence-history`: dias anteriores ao cadastro sem registro; doses de hoje informadas como tomadas no cadastro entram no histórico.
- `medication-stock`: aviso de estoque insuficiente para concluir um tratamento de duração fixa; estoque informado no cadastro já desconta as doses de hoje marcadas como tomadas.

As specs dessas capabilities ainda vivem na change ativa `add-medication-scheduling`; as deltas desta change só acrescentam requisitos.

## Impact

- **Banco**: nova coluna `esquemas.data_inicio` (data de início do tratamento, padrão = `created_at` nas linhas existentes) — migração gerada pelo `drizzle-kit`.
- **Código**: `src/db/schema.ts`, `src/db/repositories/esquemas.ts` (`paraEsquemaDominio` passa a usar `data_inicio`), `src/domain/medication-registration/` (tipos do formulário, validação, `cadastrarMedicamento` com dados de "em uso", nova função pura de prévia), `src/domain/dose-scheduling/` (primeira dose do intervalo a partir da última), nova rota de confirmação `src/app/medicamento/confirmar.tsx`, e o `FormularioMedicamento` compartilhado.
- **Dependências entre changes**: implementar depois de `manage-medications` (formulário compartilhado e `preverFimDoEstoque`) e de `apply-visual-identity` (componentes visuais).
- **Referência visual**: artboards da fileira "Medicamento já em uso" do canvas (https://claude.ai/artifact/5RZ2sX5YF1fbQTYfot6j8J) e o artboard "Novo medicamento" atualizado.
