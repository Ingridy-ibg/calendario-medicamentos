## Why

A spec `dose-scheduling` (change `add-medication-scheduling`) já exige que o sistema **avise** ao registrar uma dose "se necessário" que ultrapasse o limite diário, **sem impedir** o registro. O domínio calcula esse aviso (`registrarDoseSeNecessarioNoBanco` devolve `avisoLimiteExcedido`), mas a agenda ignora o retorno: hoje dá para registrar a 5ª, 6ª, 7ª dose de um analgésico com limite de 4 por dia sem nenhum alerta. Como esses medicamentos (dipirona, ibuprofeno…) têm risco real em superdosagem, o alerta precisa existir e aparecer antes da dose.

## What Changes

- **Aviso visual no cartão** "se necessário" da agenda: o contador "X de N hoje" fica âmbar ao atingir o limite e vermelho acima dele, com a linha "Limite de hoje atingido" (no limite) ou "Acima do limite recomendado" (acima).
- **Confirmação antes de passar do limite**: ao tocar em "Registrar dose" quando o limite do dia já foi atingido, um diálogo avisa "Você já tomou X de N hoje. Tomar mais que o recomendado não é aconselhado." com "Cancelar" e "Registrar mesmo assim". Doses dentro do limite continuam com um toque, sem diálogo.
- O registro continua permitido — nada é bloqueado.

Suposições (decididas na exploração, sem objeção): texto do alerta como acima; o detalhe do medicamento não ganha o contador do dia nesta change.

## Capabilities

### New Capabilities
- (nenhuma)

### Modified Capabilities
- `agenda-views`: o item "se necessário" da agenda mostra o estado do limite diário e pede confirmação antes de uma dose acima do limite. (A spec ainda vive na change ativa `add-medication-scheduling`; esta delta só acrescenta requisitos.)

## Impact

- **Código**: `src/app/(tabs)/index.tsx` (item "se necessário"); uma função pura nova em `src/domain/dose-scheduling/se-necessario.ts` para classificar o estado do limite; testes.
- Sem mudança de banco, de notificações ou de dependências.
