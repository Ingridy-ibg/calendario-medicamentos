## Why

A revisão de código do merge de `inicio-de-cartela` encontrou falhas reais:
- um cíclico cuja pausa terminou antes da atualização nunca ganha a dose nem o alarme de início de cartela;
- editar o horário com a dose de início pendente cria duas doses de início, e com isso dois alarmes especiais;
- "Só cadastrar" grava a resposta do 1º comprimido num medicamento fora da agenda.

Além disso, no teste do APK, responder a uma notificação de dose comum pelos botões ("Tomei agora", "Adiar", "Não tomar") registra a resposta, mas a notificação continua na bandeja. Parece que nada aconteceu.

E, ao reinstalar o APK, o Android restaurou do backup automático dados antigos do app. Um alarme de dose inexistente abriu a tela de alarme ("Dose não encontrada"), e o "Fechar" dela não levava a lugar nenhum, porque a boas-vindas ainda não estava concluída.

Há também inconsistências menores na agenda e no calendário, e duplicação no agendamento. O primeiro problema atinge justamente quem já usava o app antes do novo APK, por isso a correção vem antes de validar o resto no aparelho.

## What Changes

- **Dose de início sempre existe e é única**:
  - quando o início previsto da nova cartela já passou e não há dose de início para ele (pausa terminada antes da atualização, ou app sem abrir por semanas), a dose é criada no dia e horário previstos, pendente e atrasada, e o alarme especial passa a tocar;
  - editar o horário (ou os dias) com a dose de início pendente substitui essa dose, em vez de criar outra.
- **"Só cadastrar" ignora a resposta do 1º comprimido**, assim como já ignora "Já estava tomando". O medicamento fica fora da agenda, sem âncora de ciclo e sem início previsto.
- **Notificação sai da bandeja depois da resposta**: tocar num botão da notificação de uma dose comum, ou resolver a dose no app com a notificação aberta, remove essa notificação. No "Adiar", ela some e volta em 30 minutos. Arrastar para dispensar continua sem efeito no reenvio.
- **Tela de alarme nunca prende o usuário**: "Fechar" leva à boas-vindas quando ela ainda não foi concluída.
- **Sem backup automático do Android** (`android.allowBackup: false`): reinstalar não restaura alarmes nem banco de backups antigos e possivelmente desencontrados.
- **Exportação para a web não quebra**: aplicar o tema salvo só onde `Appearance.setColorScheme` existe. Sem isso, o `eas update` sem `--platform` falha ao gerar a versão web estática.
- **Calendário**: o dia de hoje com a dose de início pendente mostra a marca de "Nova cartela", como os dias futuros.
- **Agenda**: o atraso do início da cartela usa a mesma regra das doses (`estaAtrasada`) e é avaliado na hora de exibir, não só ao carregar a agenda.
- **Agendamento**: os dois agendadores (notificação e alarme nativo) montam o texto da dose por uma função única, com uma só leitura da dose no banco.
- **Correção única dos cíclicos sem data** (de `inicio-de-cartela`): passa a rodar uma só vez, marcada no kv-store, em vez de a cada abertura do app.

Ficam de fora dois apontamentos da revisão que descrevem o comportamento especificado em `inicio-de-cartela`:
- confirmar uma dose de início atrasada mantém o dia 1 no dia previsto e conta o ciclo a partir da confirmação (decisão 4 do design dela);
- com a cartela atrasada, o calendário projeta o dia seguinte como dia 2 (cenário "Cartela atrasada").

## Capabilities

### New Capabilities
<!-- nenhuma -->

### Modified Capabilities
- `dose-scheduling`: a dose de início de cartela pendente existe sempre que o início previsto já chegou e é única por medicamento, inclusive depois de uma edição.
- `dose-notifications`: responder pela notificação, ou resolver a dose no app, remove a notificação exibida.
- `medication-registration`: "Só cadastrar" ignora a resposta à pergunta do 1º comprimido.
- `agenda-views`: marca de nova cartela também no dia de hoje; atraso do início avaliado na hora de exibir.

## Impact

- `src/domain/dose-scheduling/janela-rolante.ts`:
  - garantir a dose de início vencida na renovação;
  - substituir a dose de início pendente na rematerialização após edição;
  - tirar a correção única de `renovarJanelasAtivas`.
- `src/domain/dose-scheduling/ciclico.ts`: função que diz se falta a dose de início e qual é ela.
- `src/db/repositories/doses.ts`: apagar a dose de início pendente de um esquema.
- `src/app/medicamento/confirmar.tsx` e `src/domain/medication-registration/registration.ts`: "Só cadastrar" sem `inicioCartela`.
- `src/domain/agenda-views/marcador-dia.ts`, `agenda-diaria.ts`, `src/app/(tabs)/index.tsx`: marca de hoje e atraso na exibição.
- `src/notifications/agendamento.ts` e `src/notifications/contexto.ts`: texto da dose num só lugar; `ContextoDose` passa a trazer a dose.
- `src/notifications/agendamento.ts` e `src/notifications/tarefas.ts`: remover a notificação exibida ao cancelar o alvo e no "Adiar".
- `src/app/alarme/[doseId].tsx`: "Fechar" sem a boas-vindas concluída.
- `app.json`: `android.allowBackup: false`. Muda a fingerprint, então exige um APK novo, que esta change já precisa.
- `src/lib/preferencias.ts` e o ponto de inicialização: execução única da correção.
- Testes vitest para cada cenário.
