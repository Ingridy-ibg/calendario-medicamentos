## Why

Uma investigação no código (reproduzida com teste) encontrou três defeitos:

1. **Cíclico nunca entra na agenda.** Todo cíclico é cadastrado "em espera" (`dataInicioCiclo = null`) e só começa quando o primeiro comprimido da nova cartela é confirmado — mas nenhuma tela ou notificação chama `confirmarNovaCartelaCiclica`, e essa função nem grava a nova âncora no banco (não existe função de repositório para isso). Resultado: o anticoncepcional cadastrado não aparece na agenda nem no calendário e não gera lembrete; o mesmo acontece a cada virada de cartela.
2. **As doses acabam ~4 semanas depois do cadastro.** A janela rolante (design da `add-medication-scheduling`) só é materializada no cadastro e na edição; ninguém a renova. Diário, dias da semana e cíclico ficam sem doses e sem lembretes depois de 28 dias (teste: diário com 1 dose em +20 dias e 0 em +35).
3. **Permissão de tela cheia pedida a cada especial.** O cadastro abre a tela de Configurações do Android 14+ toda vez que um medicamento especial é cadastrado, embora o comentário e a tarefa 5.2 digam "no primeiro cadastro".

## What Changes

- Persistir a âncora do ciclo ao confirmar a primeira dose de uma nova cartela e corrigir o teste que só olhava o objeto devolvido.
- Mostrar na agenda diária os cíclicos aguardando nova cartela, com a ação **"Comecei a nova cartela"**, que confirma o primeiro comprimido (dia 1, tomado agora, desconta 1 do estoque) e passa a gerar as doses do ciclo.
- Renovar a janela rolante de todos os esquemas ativos com grade (diário, dias da semana, cíclico) sempre que o app abre ou volta ao primeiro plano e na tarefa periódica de segundo plano, mantendo sempre pelo menos 2 semanas de doses à frente.
- Pedir a permissão de tela cheia só no primeiro cadastro de um especial (lembrando que já foi pedida).

## Capabilities

### New Capabilities
- (nenhuma)

### Modified Capabilities
- `dose-scheduling`: a âncora do novo ciclo é persistida; a janela de doses futuras é renovada continuamente.
- `agenda-views`: cíclicos aguardando nova cartela aparecem na agenda com a ação de iniciar a cartela.
- `dose-notifications`: a permissão de tela cheia é pedida uma única vez.

As specs dessas capabilities ainda vivem na change ativa `add-medication-scheduling`; as deltas só acrescentam requisitos.

## Impact

- **Código**: `src/db/repositories/esquemas.ts` (gravar `dataInicioCiclo`), `src/domain/dose-scheduling/resolucao.ts` e `janela-rolante.ts` (renovação), `src/domain/agenda-views/agenda-diaria.ts` (item "aguardando cartela"), `src/app/(tabs)/index.tsx`, `src/notifications/reconciliador.ts`/`tarefas.ts` ou o layout raiz (onde a renovação roda), `src/app/medicamento/novo.tsx` + `src/lib/preferencias.ts` (flag da permissão).
- Sem migração de banco e sem dependência nova.
- **Relação com outras changes**: `register-ongoing-medication` continua necessária para cadastrar um cíclico já no meio da cartela; esta change cobre o início de cartela nova e a virada depois da pausa. Deve ser implementada antes de `manage-medications` e `register-ongoing-medication`, que dependem de doses existindo.
