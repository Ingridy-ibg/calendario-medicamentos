## 1. Módulo nativo: base e spike

- [x] 1.1 Criar o módulo local `modules/alarme-dose` com `npx create-expo-module --local` (conferir a doc do SDK 57) e um plugin de config que declara as permissões, receivers e serviço, e o `showWhenLocked` da Activity. Verificar: `npx expo prebuild --clean` gera o manifest com os elementos novos
- [ ] 1.2 Spike: implementar `agendar`, o `AlarmeReceiver` e o `AlarmeService` com som em loop (USAGE_ALARM) e notificação com full-screen intent, e testar num APK com o aparelho bloqueado e no modo silencioso. Verificar: o alarme acende a tela e toca. Registrar no PR a versão do Android testada
- [ ] 1.3 Implementar `cancelar`, `silenciar`, `listarAgendados` e a persistência em SharedPreferences. Verificar: agendar dois alarmes, cancelar um e `listarAgendados()` retornar só o outro
- [ ] 1.4 Implementar o rearme +30 min no receiver e o log consumido por `consumirDisparos()`. Verificar: com o app fechado, um alarme ignorado dispara de novo 30 min depois, e `consumirDisparos()` retorna os dois disparos
- [ ] 1.5 Implementar o limite de 5 min do serviço e o volume crescente. Verificar: o som para sozinho após 5 min, e o aviso permanece
- [ ] 1.6 Implementar o `BootReceiver` que rearma os alarmes persistidos. Verificar: agendar para daqui a 10 min, reiniciar o aparelho sem abrir o app e o alarme disparar
- [ ] 1.7 Implementar `configurar`, `tocarPrevia`/`pararPrevia`, `escolherToqueDoAparelho`, `permissoes`, `abrirConfigTelaCheia`, `abrirConfigAlarmeExato` e `exibirSobreBloqueio`. Verificar: chamar cada função de uma tela de debug temporária no APK
- [ ] 1.8 Adicionar os 4 toques CC0 em `res/raw` e registrar a origem e a licença em `modules/alarme-dose/SONS.md`. Verificar: `tocarPrevia` toca cada um
- [ ] 1.9 Criar o wrapper TS `src/lib/alarme-dose.ts` com guarda de Expo Go (no-op e permissões "desconhecidas" no Expo Go). Verificar: o app abre no Expo Go sem erro

## 2. Agendamento e reconciliação

- [x] 2.1 Extrair a interface `Agendador` com as implementações `expo-notifications` e alarme nativo, e fazer `agendarAlvo`/`cancelarAlvo` escolherem pela criticidade. Verificar: `npx tsc --noEmit` passa
- [x] 2.2 Ajustar `planejarReconciliacao` (domínio) para planejar por agendador, cancelando um id no agendador errado quando a criticidade muda. Verificar: novos testes no vitest para comum→especial e especial→comum
- [x] 2.3 Fazer o reconciliador começar consumindo `consumirDisparos()` e aplicando `registrarEntregaDeNotificacao` a cada disparo. Verificar: teste com um log de 2 disparos deixando `proximaNotificacaoEm` = último + 30 min
- [ ] 2.4 Canais: criar `dose_comum_v2` com o padrão longo, apagar `doseComum` e `doseEspecialCritico`, e atualizar `CANAIS_NOTIFICACAO`. Verificar: em Configurações > Apps > Tomei > Notificações aparecem só os canais novos, e a dose comum vibra em 4 pulsos
- [ ] 2.5 Na inicialização, cancelar no `expo-notifications` as notificações de doses especiais remanescentes (migração). Verificar: depois de atualizar o APK, `getAllScheduledNotificationsAsync` não tem doses especiais e `listarAgendados()` tem

## 3. Tela de alarme

- [x] 3.1 Adicionar as paletas Noite/Verde/Claro/Aurora em `src/constants/cores.ts` (valores do canvas) e as preferências `alarme.*` em `src/lib/preferencias.ts`, chamando `configurar` a cada mudança. Verificar: teste das funções puras de preferência (leitura com padrão)
- [ ] 3.2 Criar a rota `alarme/[doseId]` (fullScreenModal, fora das abas) conforme o artboard: hora, nome, dosagem, card de observação condicional, "Tomei agora" e "Silenciar som". Verificar: o deep link `calendariomedicamentos://alarme/<id>` abre a tela com os dados certos
- [ ] 3.3 "Tomei agora" confirma pela função idempotente, chama `cancelar(id)` e mostra "Dose registrada"; `acao=tomei` no link confirma direto; "Silenciar som" chama `silenciar(id)`. Verificar: no aparelho, confirmar para o som e a dose aparece tomada na agenda; silenciar mantém pendente
- [ ] 3.4 Impedir a saudação diária quando a abertura vem do alarme. Verificar: abrir pelo alarme de manhã não mostra a saudação
- [ ] 3.5 Confirmar uma dose especial pela agenda enquanto ela toca também para o alarme (via `cancelarAlvo`). Verificar: no aparelho

## 4. Perfil

- [ ] 4.1 `consultarPermissoes` passa a usar `permissoes()` do módulo; o Perfil ganha a linha "Alarme em tela cheia" e mostra o estado real do alarme exato. Verificar: negar a tela cheia nas Configurações e ver a linha mudar ao voltar
- [ ] 4.2 Adicionar o card "Alarme dos especiais" no Perfil (resumo do toque, do tema e da vibração) levando à nova rota `perfil/alarme`. Verificar: navegação no app
- [ ] 4.3 Criar a tela "Alarme dos especiais" conforme o artboard: prévia ao vivo, 4 aparências, lista de toques com botão de ouvir, "Usar um toque do aparelho", "Vibrar junto", "Volume aumenta aos poucos" e "Testar alarme" (abre a rota de alarme em modo teste, sem dose). Verificar: cada escolha persiste após fechar o app e vale para o próximo alarme

## 5. Alarme por cima de outros apps

- [ ] 5.1 No módulo nativo, `permissoes()` devolve também `sobreOutrosApps` (`Settings.canDrawOverlays`) e `abrirConfigSobreOutrosApps()` abre `ACTION_MANAGE_OVERLAY_PERMISSION`. Verificar: na tela de debug, o estado muda ao ligar a chave nas Configurações
- [ ] 5.2 No `AlarmeService`, ao tocar, abrir a tela de alarme com `startActivity` quando a permissão estiver concedida e não houver ligação em curso; no Android 15+, antes, adicionar a janela sobreposta transparente e removê-la quando a Activity for exibida ou após 5 s. Verificar: no aparelho (Android 14), com o celular em uso em outro app, o alarme toma a tela; o caminho do 15+ fica registrado como não validado se não houver aparelho
- [ ] 5.3 Durante ligação ou chamada de vídeo, não abrir por cima e manter o aviso flutuante. Verificar: no aparelho, disparar o alarme durante uma ligação
- [ ] 5.4 Linha "Alarme por cima de outros apps" no Perfil, com `consultarPermissoes` devolvendo `sobreOutrosApps`. Verificar: negar e conceder nas Configurações e ver a linha mudar ao voltar
- [ ] 5.5 No primeiro cadastro de um especial, pedir em sequência a tela cheia e a de aparecer sobre outros apps, só as que faltam. Verificar: teste da função pura que decide quais pedir; no aparelho, o cenário "Primeiro medicamento especial"

## 6. Validação

- [x] 6.1 Rodar `npx vitest run` e `npx tsc --noEmit`. Verificar: ambos passam
- [ ] 6.2 Gerar o APK e testar no aparelho os cenários da spec: bloqueado, em uso (com e sem a permissão de aparecer sobre outros apps), durante ligação, modo silencioso, sem permissão de tela cheia, ignorar por 5 min, silenciar, reinício, comum vibrando e personalização. Verificar: checklist anexado ao PR
