## MODIFIED Requirements

### Requirement: Notificações especiais usam um estilo crítico e difícil de ignorar
O sistema SHALL apresentar cada disparo de dose de um medicamento especial como um alarme. Com o aparelho bloqueado ou com a tela apagada, o sistema SHALL acender a tela e exibir a tela de alarme em tela cheia sobre o bloqueio. Com o aparelho desbloqueado e em uso, o sistema SHALL exibir um aviso flutuante persistente com a ação "Tomei agora", que ao ser tocado no corpo abre a tela de alarme. Em ambos os casos o sistema SHALL tocar o som de alarme escolhido em repetição contínua, usando o volume de alarme do aparelho (inclusive com o aparelho no modo silencioso ou vibrar), e vibrar se essa opção estiver ligada, até o usuário confirmar a dose ou silenciar o alarme, ou por no máximo 5 minutos sem resposta. Nesse caso o som para, o aviso continua visível e o reenvio de 30 minutos segue normalmente. Se a permissão de tela cheia não estiver concedida, o sistema SHALL exibir o aviso flutuante com som contínuo no lugar da tela cheia.

#### Scenario: Estilo de notificação especial
- **WHEN** uma notificação dispara para a dose de um dia ativo de um medicamento especial
- **THEN** ela é apresentada como alarme (tela cheia ou aviso flutuante com som contínuo), não no estilo padrão das notificações comuns

#### Scenario: Aparelho bloqueado
- **WHEN** chega o horário de uma dose especial com o aparelho bloqueado e a tela apagada
- **THEN** a tela acende, a tela de alarme aparece sobre o bloqueio e o som toca em repetição até uma ação do usuário

#### Scenario: Ninguém responde
- **WHEN** o alarme de uma dose especial toca por 5 minutos sem nenhuma ação
- **THEN** o som para, o aviso continua na tela de bloqueio e o próximo alarme dispara 30 minutos após o disparo

#### Scenario: Aparelho em uso
- **WHEN** chega o horário de uma dose especial com o usuário usando outro app
- **THEN** um aviso flutuante com "Tomei agora" aparece no topo e o som toca em repetição

#### Scenario: Modo silencioso
- **WHEN** o aparelho está no modo silencioso e chega o horário de uma dose especial
- **THEN** o alarme toca usando o volume de alarme do aparelho

#### Scenario: Sem permissão de tela cheia
- **WHEN** a permissão de tela cheia foi negada e chega o horário de uma dose especial com o aparelho bloqueado
- **THEN** o aviso aparece na tela de bloqueio com som contínuo, sem abrir a tela cheia

## ADDED Requirements

### Requirement: Tela de alarme da dose especial
A tela de alarme SHALL mostrar o horário previsto da dose, o nome e a dosagem do medicamento e, quando houver, a observação do medicamento. SHALL oferecer a ação principal "Tomei agora" e a ação secundária "Silenciar som". SHALL usar a aparência escolhida em "Alarme dos especiais" no Perfil.

#### Scenario: Medicamento com observação
- **WHEN** dispara o alarme de um medicamento especial com a observação "Tomar com água"
- **THEN** a tela de alarme mostra "Tomar com água" num card de observação

#### Scenario: Medicamento sem observação
- **WHEN** dispara o alarme de um medicamento especial sem observação
- **THEN** a tela de alarme não mostra o card de observação

### Requirement: Confirmar a dose pelo alarme
Tocar em "Tomei agora" na tela de alarme ou no aviso flutuante SHALL registrar a dose como tomada com o horário do toque, parar o som e a vibração, fechar o alarme e cancelar os reenvios daquela dose.

#### Scenario: Confirmando na tela de alarme
- **WHEN** o usuário toca em "Tomei agora" na tela de alarme
- **THEN** o som para, a dose fica registrada como tomada e nenhum novo alarme dispara para ela

### Requirement: Silenciar o alarme não resolve a dose
Tocar em "Silenciar som" SHALL parar o som e a vibração do disparo atual sem alterar o status da dose. A dose SHALL continuar pendente, e o próximo alarme SHALL disparar 30 minutos após o disparo silenciado, conforme o reenvio indefinido dos especiais.

#### Scenario: Silenciando
- **WHEN** o alarme das 08:00 toca e o usuário toca em "Silenciar som"
- **THEN** o som para, a dose continua pendente e o alarme toca de novo às 08:30

### Requirement: Reenvio do especial independe do app estar aberto
O reenvio a cada 30 minutos de uma dose especial não confirmada SHALL continuar com o app fechado e SHALL ser restabelecido automaticamente depois de o aparelho ser reiniciado, sem que o usuário precise abrir o app.

#### Scenario: Reinício do aparelho
- **WHEN** existe um alarme de dose especial agendado para as 22:00 e o aparelho é reiniciado às 21:00 sem que o app seja aberto
- **THEN** o alarme dispara às 22:00

#### Scenario: App fechado durante a noite
- **WHEN** o alarme de uma dose especial dispara às 23:00 com o app fechado e ninguém responde
- **THEN** novos alarmes disparam às 23:30, 00:00 e assim por diante, até a confirmação

### Requirement: Notificação comum vibra de forma marcante
A notificação de dose de um medicamento comum SHALL vibrar com um padrão longo, de quatro pulsos, distinto da vibração padrão do sistema, e SHALL continuar sendo uma notificação comum (sem tela cheia nem som contínuo).

#### Scenario: Dose comum
- **WHEN** chega a notificação de uma dose comum
- **THEN** o aparelho vibra em quatro pulsos longos e a notificação aparece com as três ações, sem abrir tela cheia
