## ADDED Requirements

### Requirement: Nome e logo do aplicativo
O aplicativo SHALL se chamar "Tomei". O nome SHALL aparecer sob o ícone no inicializador do Android, na tela de boas-vindas e no rodapé do Perfil. O logo SHALL ser uma cápsula inclinada com metade preenchida, em branco sobre verde-petróleo, e SHALL ser usado no ícone do app e na boas-vindas.

#### Scenario: Ícone no inicializador
- **WHEN** o usuário instala o app e abre a lista de apps do Android
- **THEN** vê o ícone da cápsula sobre verde-petróleo com o nome "Tomei" embaixo

#### Scenario: Ícone temático
- **WHEN** o aparelho usa ícones temáticos (Android 13+)
- **THEN** o ícone do app aparece na versão monocromática do logo, tingida pelo sistema

#### Scenario: Boas-vindas
- **WHEN** a tela de boas-vindas é exibida
- **THEN** ela mostra o logo e o nome "Tomei"

### Requirement: Tela de abertura na identidade do app
A tela de abertura (splash) SHALL usar o verde-petróleo da paleta como fundo, com o logo em branco no centro. Nenhuma cor do visual padrão anterior (azul) SHALL aparecer.

#### Scenario: Abrindo o app a frio
- **WHEN** o usuário abre o app com ele fechado
- **THEN** a tela de abertura aparece em verde-petróleo com o logo, sem azul
