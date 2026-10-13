## ADDED Requirements

### Requirement: Cadastrar sem adicionar à agenda
A tela de confirmação do cadastro SHALL ter o interruptor "Adicionar à agenda", ligado por padrão. Desligado, a confirmação SHALL mostrar que o medicamento será cadastrado sem entrar na agenda, SHALL esconder os blocos de próximas doses, cartela, tratamento e doses de hoje, e o cadastro SHALL salvar o medicamento fora da agenda, sem doses nem lembretes, ignorando as respostas de "Já estava tomando".

#### Scenario: Cadastro padrão
- **WHEN** o usuário confirma o cadastro sem mexer no interruptor
- **THEN** o medicamento é cadastrado na agenda, como antes

#### Scenario: Só cadastrar
- **WHEN** o usuário desliga "Adicionar à agenda" e confirma
- **THEN** o medicamento aparece na aba Medicamentos com o selo "Fora da agenda" e não aparece na agenda nem gera lembretes
