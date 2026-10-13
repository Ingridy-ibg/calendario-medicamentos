## Context

- `registrarDoseSeNecessario(esquema, jaRegistradasHoje)` (`src/domain/dose-scheduling/se-necessario.ts`) devolve `{ avisoLimiteExcedido: jaRegistradasHoje >= limiteDiario }` — calculado **antes** de inserir a dose; `registrarDoseSeNecessarioNoBanco` o repassa, e a agenda (`ItemSeNecessario` em `src/app/(tabs)/index.tsx`) descarta o retorno.
- O item da agenda (`ItemAgendaSeNecessario`) já traz `registradasHoje` e `limiteDiario`, recalculados a cada foco/registro.
- Diálogos destrutivos/de confirmação já usam `Alert.alert` (remoção de medicamento, change `manage-medications`).

## Goals / Non-Goals

**Goals:** mostrar o estado do limite antes do toque e confirmar só quando a dose vai passar do limite.

**Non-Goals:** bloquear o registro; contador do dia no detalhe do medicamento; histórico marcando doses "acima do limite"; janela móvel de 24 h (o limite continua por dia do calendário, como hoje).

## Decisions

### 1. Função pura `estadoLimiteSeNecessario(registradas, limite)`
Em `se-necessario.ts`, ao lado do motor existente: devolve `'abaixo' | 'atingido' | 'acima'` e é a fonte única para a cor do contador, a linha de aviso e a decisão de confirmar (`exigeConfirmacao = estado !== 'abaixo'`, isto é, `registradas >= limite` — a mesma regra de `avisoLimiteExcedido`). Testada nos limites 3/4, 4/4, 5/4 e limite 1.

*Alternativa:* registrar primeiro e avisar depois com o `avisoLimiteExcedido` já devolvido. Descartada: a dose já estaria tomada quando o aviso aparecesse.

### 2. Confirmação com `Alert.alert`
Título "Limite diário atingido", a mensagem da spec, botões "Cancelar" (`style: 'cancel'`) e "Registrar mesmo assim" (`style: 'destructive'`), no padrão do diálogo de remoção. Dentro do limite, `registrar()` segue direto.

### 3. Cores
Âmbar = token `statusAtraso`; vermelho = `statusPerdida` (ambos já validados no teste de contraste sobre `surface`). A linha de aviso usa o ícone `alerta` + texto, para não depender só da cor.

## Risks / Trade-offs

- [O usuário tomou a dose mas desiste no diálogo, e o histórico fica sem ela] → o texto do botão deixa claro que é só o registro; registrar continua a um toque de distância.
- [Diálogo nativo não estilizável] → aceito, como na remoção.
