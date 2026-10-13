## MODIFIED Requirements

### Requirement: Situação das permissões de lembrete
A tela de perfil SHALL mostrar se cada permissão de que os lembretes dependem está concedida: notificações, alarmes no horário exato, alarme em tela cheia e alarme por cima de outros apps. O estado exibido SHALL refletir a situação real do aparelho, sem pedir nenhuma permissão só por ter sido aberta. Para cada permissão não concedida, SHALL oferecer a ação "Permitir", que faz o pedido (ou abre a configuração do sistema, quando o pedido direto não for possível) e atualiza a situação exibida ao voltar.

#### Scenario: Permissão já concedida
- **WHEN** as notificações estão permitidas e o usuário abre o perfil
- **THEN** a linha "Notificações" aparece como ativa, sem ação

#### Scenario: Concedendo a permissão que falta
- **WHEN** o alarme exato não está permitido e o usuário toca em "Permitir"
- **THEN** o pedido (ou a configuração do sistema) é aberto e, ao voltar com a permissão concedida, a linha aparece como ativa

#### Scenario: Tela cheia negada
- **WHEN** a permissão de tela cheia não está concedida e o usuário abre o perfil
- **THEN** a linha "Alarme em tela cheia" mostra que, sem ela, o especial vira só uma notificação, e oferece "Permitir"

#### Scenario: Aparecer sobre outros apps negada
- **WHEN** a permissão "Aparecer sobre outros apps" não está concedida e o usuário abre o perfil
- **THEN** a linha "Alarme por cima de outros apps" mostra que, sem ela, com o celular em uso o especial aparece só como aviso, e oferece "Permitir"

#### Scenario: Abrir o perfil não pede permissão
- **WHEN** o usuário abre o perfil com alguma permissão não concedida
- **THEN** nenhum pedido de permissão aparece até ele tocar em "Permitir"

## ADDED Requirements

### Requirement: Personalização do alarme dos especiais
O perfil SHALL ter uma entrada "Alarme dos especiais" que abre uma tela de personalização com:
- uma prévia da tela de alarme;
- a ação "Testar alarme";
- a aparência da tela de alarme entre "Noite" (padrão), "Verde", "Claro" e "Aurora";
- o toque entre os toques do app ("Alvorada", o padrão; "Sino suave"; "Bipe digital"; "Marimba") ou um toque de alarme escolhido entre os do aparelho, cada toque com um botão para ouvi-lo;
- "Vibrar junto" (ligado por padrão);
- "Volume aumenta aos poucos" (ligado por padrão).

As escolhas SHALL valer para todos os medicamentos especiais, SHALL ser aplicadas a partir do próximo alarme e SHALL ser mantidas entre aberturas do app.

#### Scenario: Trocando a aparência
- **WHEN** o usuário escolhe a aparência "Claro"
- **THEN** a prévia muda na hora, e o próximo alarme de dose especial abre com a aparência clara

#### Scenario: Ouvindo um toque
- **WHEN** o usuário toca no botão de ouvir do "Sino suave"
- **THEN** o toque é reproduzido brevemente sem mudar a escolha atual

#### Scenario: Toque do aparelho
- **WHEN** o usuário toca em "Usar um toque do aparelho" e escolhe um toque de alarme do sistema
- **THEN** esse toque passa a ser o som dos alarmes dos especiais

#### Scenario: Testando
- **WHEN** o usuário toca em "Testar alarme"
- **THEN** a tela de alarme abre com o toque, a vibração e a aparência escolhidos, sem registrar nenhuma dose

#### Scenario: Volume crescente
- **WHEN** "Volume aumenta aos poucos" está ligado e um alarme dispara
- **THEN** o som começa baixo e chega ao volume de alarme do aparelho em cerca de 30 segundos
