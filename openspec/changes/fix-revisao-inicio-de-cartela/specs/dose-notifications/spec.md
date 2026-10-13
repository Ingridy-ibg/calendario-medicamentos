## ADDED Requirements

### Requirement: Responder pela notificação remove a notificação da bandeja
Quando o usuário toca numa ação da notificação de uma dose comum ("Tomei agora", "Adiar" ou "Não tomar"), o sistema SHALL aplicar a resposta e remover essa notificação da bandeja, sem abrir o app. No "Adiar", a notificação SHALL voltar 30 minutos depois, como hoje. Quando a dose é resolvida dentro do app com a notificação dela ainda exibida, o sistema SHALL também remover a notificação. Uma notificação de dose ainda pendente SHALL continuar exibida ao abrir o app. Arrastar a notificação para dispensá-la continua sem efeito no reenvio.

#### Scenario: Tomei agora pela notificação
- **WHEN** chega a notificação da dose comum das 08:00 e o usuário toca em "Tomei agora" sem abrir o app
- **THEN** a dose fica registrada como tomada e a notificação sai da bandeja

#### Scenario: Adiar pela notificação
- **WHEN** o usuário toca em "Adiar" na notificação da dose comum das 08:00
- **THEN** a notificação sai da bandeja e volta às 08:30

#### Scenario: Dose resolvida no app com a notificação exibida
- **WHEN** a notificação da dose comum das 08:00 está na bandeja e o usuário marca essa dose como tomada na agenda
- **THEN** a notificação sai da bandeja

#### Scenario: Abrir o app não some com notificação pendente
- **WHEN** a notificação da dose comum das 08:00 está na bandeja, a dose continua pendente e o usuário abre o app
- **THEN** a notificação continua na bandeja

### Requirement: A tela de alarme sempre tem saída
Fechar a tela de alarme SHALL levar o usuário a uma tela utilizável do app: a anterior, se houver, senão a agenda, ou a boas-vindas quando ela ainda não foi concluída. Isso vale inclusive quando a tela abre para uma dose que não existe mais.

#### Scenario: Alarme de dose inexistente logo após instalar
- **WHEN** o app recém-instalado, com a boas-vindas ainda não concluída, abre a tela de alarme mostrando "Dose não encontrada" e o usuário toca em "Fechar"
- **THEN** o app mostra a boas-vindas
