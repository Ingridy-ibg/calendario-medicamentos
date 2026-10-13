## Why

A spec já pede que a dose especial seja "estilo alarme, difícil de ignorar (ex.: tela cheia)". Hoje ela é só uma notificação de prioridade máxima. O `expo-notifications` não suporta full-screen intent nem som contínuo, então no aparelho real o especial é tão fácil de perder quanto o comum. O usuário quer um alarme de verdade: tela cheia, com som até confirmar, personalizável.

## What Changes

- A dose especial passa a disparar um **alarme em tela cheia**:
  - liga a tela, aparece sobre o bloqueio e toca som em loop (e vibra) até o usuário agir;
  - com o aparelho em uso, abre a tela de alarme por cima do app em uso, quando a permissão "Aparecer sobre outros apps" está concedida. Sem ela, ou durante uma ligação, aparece como um aviso flutuante com "Tomei agora".
- Nova **tela de alarme** com hora, nome, dosagem e a **observação** do medicamento, e as ações:
  - **Tomei agora**: registra a dose e encerra o alarme;
  - **Silenciar som**: para o som e a vibração, a dose continua pendente e o alarme volta no próximo reenvio de 30 min.
- O reenvio a cada 30 min do especial passa a continuar mesmo com o app fechado e depois de reiniciar o aparelho, sem depender de abrir o app.
- Nova tela **"Alarme dos especiais"**, a partir do Perfil:
  - aparência da tela de alarme: Noite, Verde, Claro ou Aurora;
  - toque: 4 do app ou um toque de alarme do aparelho;
  - vibrar junto;
  - volume aumentando aos poucos;
  - prévia e "Testar alarme".
- A **notificação comum** passa a usar o padrão de vibração longo que hoje é do especial.
- O Perfil passa a mostrar o **estado real** das permissões "Alarmes no horário exato", "Alarme em tela cheia" e "Alarme por cima de outros apps" (hoje o alarme exato aparece como "desconhecido"). As duas últimas também são pedidas no primeiro cadastro de um especial.

Depende de `identidade-e-observacoes` (campo de observações) e de `fix-permissoes-e-respostas` (processamento de respostas idempotente). Implementar depois das duas.

## Capabilities

### New Capabilities
<!-- nenhuma -->

### Modified Capabilities
- `dose-notifications`:
  - estilo crítico do especial passa a ser alarme em tela cheia com som contínuo;
  - novas exigências para a tela de alarme, silenciar, reenvio sem o app e após reinício;
  - vibração da notificação comum.
- `user-profile`:
  - situação das permissões inclui tela cheia, com estado real;
  - nova tela de personalização do alarme dos especiais.

## Impact

- **Novo módulo nativo local** (Expo Modules API, Kotlin) em `modules/alarme-dose`, com AlarmManager, BroadcastReceiver, serviço em primeiro plano, notificação com full-screen intent, receiver de boot e acesso a `RingtoneManager`.
- `app.json`: plugin do módulo (permissões `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_MEDIA_PLAYBACK`, `RECEIVE_BOOT_COMPLETED`, `USE_FULL_SCREEN_INTENT`; atividade sobre a tela de bloqueio).
- `src/notifications`: o reconciliador e o agendamento passam a ter dois agendadores (expo-notifications para comum e pausa, alarme nativo para especial), e os canais mudam de id.
- Novas rotas: `alarme/[doseId]` e `perfil/alarme`. Novas preferências no kv-store.
- Novos assets de áudio (4 toques com licença livre) em `modules/alarme-dose/android/src/main/res/raw`.
- Não roda no Expo Go: exige o development build/APK (já é o fluxo atual).
