## MODIFIED Requirements

### Requirement: Confirmação obrigatória antes de salvar
Todo cadastro de medicamento, em uso ou não, SHALL passar por uma tela "Confira antes de salvar" que mostra o resumo calculado do que vai entrar na agenda, sem gravar nada até o usuário tocar em "Confirmar e agendar". "Ajustar" SHALL voltar ao formulário com todos os valores preenchidos. A tela SHALL mostrar, conforme o caso:
- nome, dose, esquema e criticidade;
- a próxima dose (com "hoje", "amanhã" ou a data) e, para esquemas com grade, as próximas doses seguintes;
- para duração fixa: dia atual do tratamento, doses restantes, data e hora da última dose;
- para cíclico em uso: dia da cartela, comprimidos restantes na cartela, último comprimido da cartela, período da pausa e a data prevista da nova cartela (indicada como prevista, já que ela só começa com a confirmação do primeiro comprimido);
- estoque e até quando ele dura;
- as doses de hoje marcadas como tomadas e as que entram na agenda;
- quando houver dias anteriores ao cadastro, o aviso de que eles ficam sem registro no histórico.

Se, no momento do toque em "Confirmar e agendar", os dados deixarem de passar na validação (por exemplo, porque a data mudou desde que a tela foi aberta), a tela SHALL mostrar a mensagem da validação, SHALL NOT salvar nada e SHALL continuar utilizável, para o usuário tocar em "Ajustar".

#### Scenario: Medicamento novo com horário de hoje já passado
- **WHEN** às 15:00 o usuário cadastra, sem "já estava tomando", um medicamento de seg/qua/sex às 14:00 numa segunda-feira
- **THEN** a confirmação mostra a próxima dose como "Qua às 14:00", e nenhuma dose de hoje é criada

#### Scenario: Ajustando antes de confirmar
- **WHEN** o usuário toca em "Ajustar" na confirmação
- **THEN** volta ao formulário com os valores que tinha preenchido e nada foi salvo

#### Scenario: Confirmando
- **WHEN** o usuário toca em "Confirmar e agendar"
- **THEN** o medicamento é salvo exatamente como mostrado na confirmação e o usuário volta para a agenda

#### Scenario: Dados que deixaram de valer ao confirmar
- **WHEN** o usuário informa em "Já estava tomando" um tratamento de 7 dias iniciado há 6 dias, abre a confirmação antes da meia-noite com "Adicionar à agenda" ligado e confirma depois da meia-noite
- **THEN** a confirmação mostra "Esse tratamento já terminou", nada é salvo e "Ajustar" leva de volta ao formulário preenchido
