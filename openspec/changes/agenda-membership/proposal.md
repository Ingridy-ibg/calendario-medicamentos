## Why

Hoje um medicamento só tem dois estados: ativo (na agenda, com lembretes) ou excluído. Falta um meio-termo para quem quer manter um remédio cadastrado — com dosagem, estoque e histórico — sem que ele apareça na rotina: um analgésico que só se usa às vezes, um tratamento que acabou mas pode voltar, ou um remédio recém-comprado que ainda não começou. Com mais medicamentos cadastrados, a aba Medicamentos também precisa de filtro e de paginação.

## What Changes

- Novo estado por medicamento: **na agenda** (padrão) ou **fora da agenda**. Fora da agenda: sem doses futuras, sem lembretes, sem alertas de estoque, fora da agenda e da projeção do calendário; continua cadastrado, editável, com histórico.
- **Detalhe do medicamento**: rodapé com dois botões lado a lado — à esquerda "Retirar da agenda" (ou "Adicionar à agenda", quando fora) e à direita "Excluir" (o que já existe). O interruptor de notificações some quando o medicamento está fora da agenda.
- **Retirar da agenda** pede confirmação e apaga as doses ainda não resolvidas; o histórico fica.
- **Adicionar à agenda** abre a tela de confirmação com o resumo do medicamento **como se ele estivesse sendo cadastrado agora** (duração recomeça hoje, intervalo começa agora, cíclico aguarda a nova cartela); "Editar" leva à edição, "Adicionar à agenda" confirma.
- **Cadastro**: a confirmação ganha o interruptor "Adicionar à agenda", ligado por padrão; desligado, o medicamento só é cadastrado — os blocos de doses/cartela/hoje somem e o "Já estava tomando" é ignorado.
- **Aba Medicamentos**: filtro escondido atrás do ícone de filtro (Todos / Na agenda / Fora da agenda, com o ícone destacado quando aplicado); em "Todos", os fora da agenda vêm por último; lista paginada com rolagem infinita (20 por vez); selo "Fora da agenda" nos itens.

## Capabilities

### New Capabilities
- (nenhuma)

### Modified Capabilities
- `medication-management`: estado na/fora da agenda, botões do detalhe, filtro e paginação da lista. (Spec na change ativa `manage-medications`.)
- `medication-registration`: interruptor "Adicionar à agenda" na confirmação do cadastro.
- `dose-scheduling`: medicamento fora da agenda não gera doses; voltar à agenda recomeça o esquema a partir de agora.
- `agenda-views`: medicamentos fora da agenda não aparecem na agenda diária nem na projeção futura do calendário.

## Impact

- **Banco**: coluna `medicamentos.na_agenda` (boolean, padrão `true`) — migração `drizzle-kit`.
- **Código**: domínio (`retirarDaAgenda`, `adicionarAAgenda`, filtros em `listarEsquemasAtivos`/`renovarJanelasAtivas`/agenda/calendário/alvos de notificação), `cadastrarMedicamento` (opção de não agendar), detalhe, aba Medicamentos, tela de confirmação.
- **Relação com outras changes**: depende de `manage-medications` e `register-ongoing-medication` (já implementadas); `stock-in-boxes` (não implementada) deve tratar "fora da agenda" como sem alerta.
