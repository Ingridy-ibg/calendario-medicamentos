## Purpose

Reúne numa tela "Meu perfil" as preferências pessoais do usuário — nome e aparência do app — e a situação das permissões de que os lembretes dependem, com atalho para corrigi-las.

## ADDED Requirements

### Requirement: Acesso ao perfil pela agenda
A agenda diária SHALL ter, no cabeçalho, um botão circular de perfil que abre a tela "Meu perfil". O botão SHALL mostrar a inicial do nome do usuário, ou um ícone de pessoa quando não houver nome, e SHALL ter o rótulo de acessibilidade "Meu perfil".

#### Scenario: Abrindo o perfil
- **WHEN** o usuário toca no botão de perfil no cabeçalho da agenda
- **THEN** a tela "Meu perfil" é aberta, com opção de voltar para a agenda

#### Scenario: Botão sem nome cadastrado
- **WHEN** o usuário ainda não informou um nome
- **THEN** o botão de perfil mostra um ícone de pessoa

### Requirement: Nome do usuário opcional
A tela de perfil SHALL ter um campo de nome opcional, salvo no aparelho e mantido entre aberturas do app. O nome SHALL ser usado apenas para exibição dentro do app (por exemplo, a inicial no botão de perfil e o topo da tela de perfil; outras capabilities, como a saudação diária, podem exibi-lo) e SHALL NOT sair do aparelho.

#### Scenario: Informando o nome
- **WHEN** o usuário digita "Ana" no campo de nome e sai da tela de perfil
- **THEN** o botão de perfil na agenda passa a mostrar "A", e o nome continua preenchido ao reabrir o app

#### Scenario: Apagando o nome
- **WHEN** o usuário apaga o nome
- **THEN** o botão de perfil volta a mostrar o ícone de pessoa

### Requirement: Escolha de aparência
A tela de perfil SHALL oferecer a escolha de aparência entre "Sistema", "Claro" e "Escuro", como opções exclusivas com uma prévia de cada tema e uma frase explicando a opção selecionada. "Sistema" SHALL ser o valor inicial. A escolha SHALL ser aplicada imediatamente a todo o app, sem reiniciar, e SHALL ser mantida entre aberturas do app, inclusive na tela de abertura e na boas-vindas.

#### Scenario: Fixando o modo escuro
- **WHEN** o sistema operacional está em modo claro e o usuário escolhe "Escuro" no perfil
- **THEN** a tela de perfil, a barra de abas e as demais telas passam na hora a usar a variante escura

#### Scenario: Preferência mantida
- **WHEN** o usuário escolheu "Claro", fecha o app e o abre de novo com o sistema em modo escuro
- **THEN** o app abre na variante clara

#### Scenario: Voltando a seguir o sistema
- **WHEN** o usuário escolhe "Sistema"
- **THEN** o app passa a usar o tema atual do sistema operacional e a acompanhar suas mudanças

### Requirement: Situação das permissões de lembrete
A tela de perfil SHALL mostrar se cada permissão de que os lembretes dependem está concedida — notificações e alarmes no horário exato —, sem pedir nenhuma permissão só por ter sido aberta. Para cada permissão não concedida, SHALL oferecer a ação "Permitir", que faz o pedido (ou abre a configuração do sistema, quando o pedido direto não for possível) e atualiza a situação exibida ao voltar.

#### Scenario: Permissão já concedida
- **WHEN** as notificações estão permitidas e o usuário abre o perfil
- **THEN** a linha "Notificações" aparece como ativa, sem ação

#### Scenario: Concedendo a permissão que falta
- **WHEN** o alarme exato não está permitido e o usuário toca em "Permitir"
- **THEN** o pedido (ou a configuração do sistema) é aberto e, ao voltar com a permissão concedida, a linha aparece como ativa

#### Scenario: Abrir o perfil não pede permissão
- **WHEN** o usuário abre o perfil com alguma permissão não concedida
- **THEN** nenhum pedido de permissão aparece até ele tocar em "Permitir"

### Requirement: Aviso de privacidade e versão
A tela de perfil SHALL informar que os dados do app ficam salvos só no aparelho, e SHALL mostrar a versão do aplicativo.

#### Scenario: Rodapé do perfil
- **WHEN** o usuário rola até o fim da tela de perfil
- **THEN** vê "Seus dados ficam salvos só neste aparelho." e o número da versão do app
