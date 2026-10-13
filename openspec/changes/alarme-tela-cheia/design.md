## Context

**Como os lembretes funcionam hoje.** Todos são agendados pelo `expo-notifications` (`src/notifications/agendamento.ts`), com gatilho `DATE` e um canal por estilo (`canais.ts`).

**O reconciliador.** `src/notifications/reconciliador.ts`:
1. lê os alvos desejados do banco (`listarAlvosDesejados`, a partir de `doses.proximaNotificacaoEm`);
2. compara com `getAllScheduledNotificationsAsync()`;
3. cancela os sobrando e (re)agenda todos os desejados.

O banco é a fonte de verdade.

**O reenvio.** Ele avança por `registrarEntregaDeNotificacao` (domínio), chamado a partir da entrega da notificação. Para especiais, a dose nunca vira perdida.

**O que o `expo-notifications` não faz.** Não expõe:
- `fullScreenIntent`;
- som em loop;
- `AlarmManager.setAlarmClock`;
- `canScheduleExactAlarms()`;
- `canUseFullScreenIntent()`.

Por isso o Perfil mostra o alarme exato como "desconhecido".

**Ambiente.** O projeto já usa EAS Build com APK (development build), então pode ter código nativo. As telas de referência estão no canvas: "Alarme da dose especial (tela cheia)" e "Perfil — personalizar alarme".

## Goals / Non-Goals

**Goals:**
- Um alarme confiável para doses especiais: dispara no horário exato mesmo no Doze, sobre o bloqueio, com som contínuo, e se rearma sozinho a cada 30 min e após reboot.
- A UI do alarme em React Native, para reaproveitar tema, fontes e o domínio.
- Banco continua fonte de verdade, e o reconciliador cobre os dois agendadores.

**Non-Goals:**
- iOS.
- Usar o alarme nativo para doses comuns ou lembretes de pausa: continuam no `expo-notifications`.
- Soneca configurável: o intervalo continua fixo em 30 min (spec).
- Mostrar a observação na notificação comum.

## Decisions

### 1. Módulo nativo local com Expo Modules API

Fica em `modules/alarme-dose` (`npx create-expo-module --local`), em Kotlin, com uma API JS mínima:

| Função | Faz |
|---|---|
| `agendar(id, epochMs, dados)` | `AlarmManager.setAlarmClock` + persistir em SharedPreferences |
| `cancelar(id)` | cancela o alarme e, se `id` está tocando, para o som e remove o aviso |
| `listarAgendados()` | ids e horários persistidos (para o reconciliador) |
| `consumirDisparos()` | devolve e limpa o log de disparos ocorridos (id, horário) |
| `silenciar(id)` | para som e vibração do disparo atual |
| `configurar({ toque, vibrar, crescente })` | grava as preferências lidas pelo serviço na hora do disparo |
| `tocarPrevia(toque)` / `pararPrevia()` | prévia de 5 s na tela de personalização |
| `escolherToqueDoAparelho()` | `RingtoneManager.ACTION_RINGTONE_PICKER` (TYPE_ALARM) e retorna a URI e o título |
| `permissoes()` | `{ alarmeExato: canScheduleExactAlarms(), telaCheia: canUseFullScreenIntent() }` |
| `abrirConfigTelaCheia()` / `abrirConfigAlarmeExato()` | abrem as telas do sistema |
| `exibirSobreBloqueio(ativo)` | `setShowWhenLocked` / `setTurnScreenOn` na Activity atual |

*Alternativas consideradas:*
- **notifee**: tem full-screen e loop, mas teria um segundo sistema de agendamento e canais paralelo ao `expo-notifications`, e sua manutenção é incerta.
- **Só ajustar o canal do expo-notifications** (uso de áudio ALARM): não dá tela cheia nem som contínuo. Não atende a spec.

### 2. Fluxo do disparo

```
setAlarmClock ─▶ AlarmeReceiver
                   ├─ registra disparo no log (SharedPreferences)
                   ├─ rearma o mesmo id para +30 min (reenvio sem depender do JS)
                   └─ startForegroundService(AlarmeService, id, dados)
AlarmeService (tipo mediaPlayback)
   ├─ MediaPlayer em loop, AudioAttributes USAGE_ALARM, volume crescente opcional
   ├─ Vibrator (padrão repetido) se vibrar
   ├─ notificação no canal "alarme_especial" (IMPORTANCE_HIGH, sem som próprio):
   │    fullScreenIntent + contentIntent → calendariomedicamentos://alarme/<doseId>
   │    ação "Tomei agora" → calendariomedicamentos://alarme/<doseId>?acao=tomei
   └─ para sozinho após 5 min (aviso continua) — spec
```

`setAlarmClock` foi escolhido em vez de `setExactAndAllowWhileIdle` porque:
- é a API do Android para alarmes que o usuário espera;
- fura o Doze sem limite de frequência;
- mostra o ícone de alarme na barra de status.

O rearme +30 min no receiver garante o reenvio com o app fechado. Uma confirmação cancela a cadeia via `cancelar(id)`.

### 3. A tela de alarme é uma rota React Native

A rota `src/app/alarme/[doseId].tsx` fica fora do `Stack.Protected` das abas e é apresentada em `fullScreenModal`. Ela:
- chama `exibirSobreBloqueio(true)` ao montar e `false` ao sair;
- lê o tema das preferências e dose, medicamento e observação do banco;
- em "Tomei agora", chama `confirmarDose` (o mesmo caminho idempotente de `fix-permissoes-e-respostas`), depois `cancelar(id)` e fecha;
- em "Silenciar som", chama `silenciar(id)`.

Com `acao=tomei` no deep link, confirma direto e mostra o estado "Dose registrada".

A saudação diária não deve abrir por cima. O deep link de alarme conta como abertura por notificação.

*Alternativa considerada:* uma Activity nativa com layout XML. Foi descartada porque duplicaria tema e fontes, e a personalização ficaria em dois lugares.

### 4. Reconciliador com dois agendadores

Cria-se uma interface `Agendador { listar(); agendar(alvo); cancelar(id) }` com duas implementações:
- `agendadorNotificacoes` (`expo-notifications`): comum e pausa de ciclo;
- `agendadorAlarme` (módulo): doses especiais.

`agendarAlvo` escolhe pela criticidade. O reconciliador:
1. começa com `consumirDisparos()`, aplicando `registrarEntregaDeNotificacao` a cada disparo do log, para que `proximaNotificacaoEm` no banco alcance o rearme que o nativo já fez;
2. depois planeja sobre a união das duas listagens.

Sem o passo 1, o reconciliador reagendaria o especial para um horário já passado (o banco ficaria atrasado em relação ao nativo).

Se a criticidade de um medicamento muda (comum ↔ especial), o identificador continua o mesmo, mas o alvo troca de agendador. O plano cancela nos dois agendadores qualquer id que não esteja desejado *naquele* agendador.

### 5. Reboot

Um `BootReceiver` (só `BOOT_COMPLETED`; o banco não está acessível antes do desbloqueio) rearma todos os alarmes persistidos em SharedPreferences. Os horários que já passaram durante o desligamento disparam imediatamente uma vez. A tarefa periódica continua como rede de segurança.

### 6. Preferências do alarme

As preferências ficam no `expo-sqlite/kv-store`, como as demais:
- `alarme.tema`: `noite` | `verde` | `claro` | `aurora`;
- `alarme.toque`: `alvorada` | `sino` | `digital` | `marimba` | `aparelho:<uri>`;
- `alarme.vibrar`;
- `alarme.crescente`.

Cada mudança chama `configurar(...)` no módulo, porque o serviço nativo não lê o kv-store. As paletas dos 4 temas ficam em `src/constants/cores.ts`, e os valores saem do canvas.

### 7. Toques do app

Quatro arquivos `.ogg` curtos e em loop, de licença CC0 (por exemplo, do freesound.org), ficam em `res/raw` do módulo, com a licença e a origem registradas em `modules/alarme-dose/SONS.md`. Um toque do aparelho é guardado como URI. Se a URI deixar de existir, o serviço volta para "Alvorada".

### 8. Canais

Os canais do Android não podem ser alterados depois de criados, então:
- cria-se `dose_comum_v2` com o padrão `[0, 500, 250, 500, 250, 500, 250, 500]` (o atual do especial);
- cria-se `alarme_especial` (no módulo, sem som próprio, porque quem toca é o serviço);
- os antigos `doseComum` e `doseEspecialCritico` são apagados com `deleteNotificationChannelAsync` na inicialização.

Os ids ficam em `CANAIS_NOTIFICACAO`.

### 9. Permissões no Perfil

`consultarPermissoes` passa a usar `permissoes()` do módulo e devolve `alarmeExato` e `telaCheia` reais, sem mais `null`. O pedido de tela cheia do primeiro cadastro de especial continua como está na spec.

## Risks / Trade-offs

- **[Risco] Android 14+ concede `USE_FULL_SCREEN_INTENT` automaticamente só para apps de alarme/chamada da Play Store.** Em APK instalado por fora, o padrão pode ser negado. → Mitigação: o especial cai para o aviso flutuante com som contínuo (spec), o Perfil mostra o estado e há o pedido no primeiro cadastro de especial.
- **[Risco] Restrições de serviço em primeiro plano iniciado do fundo (Android 12+).** → Mitigação: iniciar a partir de um alarme `setAlarmClock` é uma isenção documentada. O tipo é `mediaPlayback`, com a permissão correspondente declarada. Tarefa de spike (1.2) valida no aparelho antes do resto.
- **[Risco] Fabricantes com gerenciamento agressivo (Xiaomi, Huawei) matarem o serviço ou ignorarem o boot.** → Mitigação: a tarefa periódica e a abertura do app rearmam. Não pedimos mais a isenção de bateria (decisão de `fix-permissoes-e-respostas`); se for necessário, volta como opção no Perfil, nunca automática.
- **[Trade-off] Duas fontes de agendamento aumentam a complexidade do reconciliador.** → Mitigação: a interface `Agendador`, e testes do plano de reconciliação com os dois lados (domínio puro, já testável no vitest).
- **[Trade-off] O rearme nativo e o banco podem divergir enquanto o app está fechado.** → Mitigação: `consumirDisparos()` sincroniza no início de cada reconciliação. Como especial nunca vira perdida, uma divergência só afeta o contador.
- **[Risco] Som em loop esquecido tocando, por exemplo se o processo JS morrer no meio da confirmação.** → Mitigação: o limite de 5 min no serviço e o `cancelar(id)` chamado depois de gravar a confirmação.

## Migration Plan

1. Novo APK obrigatório (módulo nativo e manifest).
2. Na primeira abertura após atualizar, a inicialização:
   - apaga os canais antigos e cria os novos;
   - cancela no `expo-notifications` as notificações de doses especiais já agendadas;
   - roda o reconciliador, que as recria no agendador de alarme.
3. Preferências de alarme ausentes assumem os padrões: Noite, Alvorada, vibrar e crescente ligados.
4. Rollback: voltar ao APK anterior. Os alarmes nativos órfãos somem com a desinstalação/atualização do módulo, e o reconciliador da versão antiga reagenda tudo no `expo-notifications`.
