## Purpose

Define a identidade visual única do aplicativo — cores nos temas claro e escuro, tipografia, cores de status de dose e padrões de interação compartilhados — para que todas as telas tenham a mesma aparência e sejam legíveis e acessíveis.

## ADDED Requirements

### Requirement: O app usa uma paleta única em todas as telas
Todas as telas do aplicativo SHALL usar a mesma paleta de cores: fundo verde-acinzentado, superfícies (cartões) destacadas do fundo, texto principal quase preto, texto secundário em cinza-esverdeado e verde-petróleo como cor de destaque para ações primárias, item ativo e elementos selecionados. Nenhuma tela SHALL usar a cor de destaque azul do visual anterior.

#### Scenario: Ação primária usa a cor de destaque
- **WHEN** o usuário vê uma ação primária em qualquer tela (ex.: "Tomei agora", "Salvar medicamento", "Novo")
- **THEN** o botão é exibido com fundo verde-petróleo e texto branco

#### Scenario: Conteúdo agrupado em cartões
- **WHEN** o usuário abre a agenda, o calendário ou o formulário de novo medicamento
- **THEN** os grupos de conteúdo aparecem em cartões de cantos arredondados, em cor de superfície distinta do fundo da tela

### Requirement: O app tem versão escura da identidade
O aplicativo SHALL ter uma variante escura da mesma paleta (fundo escuro esverdeado, superfícies um pouco mais claras que o fundo, texto claro e o mesmo matiz de destaque ajustado para contraste). O tema em uso SHALL ser definido pela preferência de aparência do usuário (ver `user-profile`): com "Sistema", o padrão, o app segue o tema claro ou escuro do sistema operacional; com "Claro" ou "Escuro", usa sempre essa variante, independentemente do sistema.

#### Scenario: Sistema em modo escuro
- **WHEN** a preferência de aparência é "Sistema", o sistema operacional está em modo escuro e o usuário abre o app
- **THEN** todas as telas, incluindo a barra de abas, usam a variante escura da paleta

#### Scenario: Troca de tema do sistema com o app aberto
- **WHEN** a preferência é "Sistema" e o usuário muda o tema do sistema com o app aberto
- **THEN** o app passa a usar a variante correspondente sem precisar ser reiniciado

#### Scenario: Preferência fixa ignora o sistema
- **WHEN** a preferência de aparência é "Claro" e o sistema operacional está em modo escuro
- **THEN** todas as telas usam a variante clara

### Requirement: Tipografia própria do app
O aplicativo SHALL exibir títulos de tela na fonte Bricolage Grotesque e todo o restante do texto na fonte Figtree, embutidas no app e disponíveis sem conexão. Horários e contagens SHALL usar algarismos de largura fixa para que fiquem alinhados.

#### Scenario: Título e corpo com as fontes do app
- **WHEN** o usuário abre a agenda diária
- **THEN** o título "Agenda" aparece em Bricolage Grotesque e os nomes e dosagens dos medicamentos em Figtree

#### Scenario: Sem conexão
- **WHEN** o aparelho está sem internet e o usuário abre o app
- **THEN** as fontes do app são exibidas normalmente

#### Scenario: Fontes ainda carregando
- **WHEN** o app está sendo aberto e as fontes ainda não foram carregadas
- **THEN** a tela de abertura permanece visível até que as fontes estejam prontas, sem exibir texto na fonte errada

### Requirement: Cores de status de dose distinguíveis
Cada status de dose SHALL ter uma cor fixa, igual em todas as telas: tomada em verde-petróleo, tomada com atraso em âmbar, perdida em vermelho, e pulada, pendente e aguardando em cinza. As cores de tomada, atraso e perdida SHALL diferir entre si também em claridade (não só em matiz), e todo status SHALL ser acompanhado de um rótulo em texto ou de um ícone, nunca transmitido só pela cor.

#### Scenario: Status com rótulo e cor
- **WHEN** uma dose foi tomada com atraso
- **THEN** o item mostra o rótulo "Com atraso" em âmbar, junto com o horário em que foi tomada

#### Scenario: Mesma cor em telas diferentes
- **WHEN** uma dose perdida aparece na agenda e no calendário
- **THEN** ela usa o mesmo vermelho nas duas telas

### Requirement: Legibilidade e alvos de toque
Todo texto SHALL ter contraste mínimo de 4,5:1 com o fundo em que aparece (3:1 para texto a partir de 24 px), nos dois temas. Todo elemento tocável SHALL ter área de toque de pelo menos 44 × 44 pt, e botões só com ícone SHALL ter rótulo de acessibilidade.

#### Scenario: Botão só com ícone
- **WHEN** um leitor de tela foca o botão de mês anterior do calendário
- **THEN** ele anuncia "Mês anterior"

#### Scenario: Texto secundário legível
- **WHEN** o texto secundário (ex.: dosagem e horário) é exibido sobre um cartão, em qualquer tema
- **THEN** seu contraste com o cartão é de pelo menos 4,5:1

### Requirement: Barra de abas na identidade do app
Todas as abas principais do app (hoje "Agenda" e "Calendário"; outras capacidades podem acrescentar abas) SHALL ter rótulo e ícone próprio. A barra de abas SHALL usar a cor de superfície como fundo, a cor de destaque para a aba ativa e o texto secundário para as inativas, e SHALL acomodar até cinco abas sem cortar rótulos.

#### Scenario: Aba ativa destacada
- **WHEN** o usuário está na tela de calendário
- **THEN** a aba "Calendário" aparece na cor de destaque e a aba "Agenda" em cinza
