## MODIFIED Requirements

### Requirement: Cadastrar sem adicionar à agenda
A tela de confirmação do cadastro SHALL ter o interruptor "Adicionar à agenda", ligado por padrão. Desligado, a confirmação SHALL mostrar que o medicamento será cadastrado sem entrar na agenda, SHALL esconder os blocos de próximas doses, cartela, tratamento e doses de hoje, e o cadastro SHALL salvar o medicamento fora da agenda, sem doses nem lembretes, ignorando as respostas de "Já estava tomando". Com o interruptor desligado, essas respostas SHALL NOT ser validadas nem impedir o cadastro.

#### Scenario: Cadastro padrão
- **WHEN** o usuário confirma o cadastro sem mexer no interruptor
- **THEN** o medicamento é cadastrado na agenda, como antes

#### Scenario: Só cadastrar
- **WHEN** o usuário desliga "Adicionar à agenda" e confirma
- **THEN** o medicamento aparece na aba Medicamentos com o selo "Fora da agenda" e não aparece na agenda nem gera lembretes

#### Scenario: Respostas de "Já estava tomando" que deixaram de valer
- **WHEN** o usuário informa em "Já estava tomando" um tratamento de 7 dias iniciado há 6 dias, abre a confirmação antes da meia-noite, desliga "Adicionar à agenda" e confirma depois da meia-noite
- **THEN** o medicamento é cadastrado fora da agenda, sem mensagem de erro e sem a tela travar
