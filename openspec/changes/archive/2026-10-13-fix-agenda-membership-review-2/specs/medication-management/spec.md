## MODIFIED Requirements

### Requirement: Paginação da aba Medicamentos
A aba Medicamentos SHALL carregar a lista em páginas de 20 medicamentos, carregando a próxima página ao chegar ao fim da rolagem, e SHALL voltar à primeira página quando o filtro mudar. Um medicamento SHALL NOT aparecer mais de uma vez na lista, mesmo que o fim da rolagem seja atingido várias vezes seguidas. Ao voltar para a aba (por exemplo, depois de abrir o detalhe de um medicamento), a lista SHALL mostrar os dados atualizados mantendo a quantidade de itens já carregados.

#### Scenario: Mais de 20 medicamentos
- **WHEN** há 45 medicamentos e o usuário rola até o fim da lista
- **THEN** a lista mostra os 20 primeiros, depois 40 e depois os 45

#### Scenario: Fim da rolagem atingido duas vezes seguidas
- **WHEN** há 45 medicamentos, 20 estão carregados e o fim da rolagem é atingido duas vezes antes de a lista se atualizar
- **THEN** a lista passa a mostrar 40 medicamentos, cada um uma vez só

#### Scenario: Voltando do detalhe
- **WHEN** há 45 medicamentos, o usuário rolou até carregar 40, abre o detalhe do 35º e volta
- **THEN** a lista continua com 40 medicamentos carregados, com os dados atualizados
