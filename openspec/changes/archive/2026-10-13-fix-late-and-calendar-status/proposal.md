## Why

Três defeitos reproduzidos com teste:

1. **"Com atraso" nunca acontece sem lembretes.** `classificarResposta` só conta lembretes de reenvio entregues (`notificacoesSemResposta >= 2`); no Expo Go, num medicamento silenciado ou quando o Android segura a notificação, uma dose das 08:00 confirmada às 14:00 fica "tomada". A spec descreve uma regra de **tempo** ("antes que a primeira notificação de reenvio dispararia").
2. **Dose não respondida nunca vira "perdida"** sem a cascata de lembretes: fica pendente para sempre e o dia aparece no calendário igual a um dia futuro.
3. **O calendário trata hoje como futuro**: monta o dia a partir da previsão do esquema, então uma dose tomada hoje aparece como "Prevista" (contorno) até virar o dia.

## What Changes

- **Atraso por tempo**: confirmação mais de 30 minutos depois do horário previsto (quando o primeiro reenvio tocaria) — ou depois de um reenvio entregue — registra **tomada com atraso**.
- **Novo estado exibido "Atrasada"**: dose ainda não tomada mais de 30 minutos depois do horário, para comum e especial, com os lembretes continuando normalmente. Aparece na agenda e no calendário.
- **Perdida por tempo para comum**: dose comum não respondida 2 horas depois do horário (o fim da cascata de 4 lembretes) vira **perdida**, com ou sem lembretes entregues. Especial nunca vira perdida: fica "Atrasada" e continua lembrando até ser confirmada.
- **Silenciado** segue as mesmas regras de tempo, sem notificações.
- **Calendário mostra hoje com as doses reais**: resolvidas com seu status, pendentes como "Pendente" ou "Atrasada"; o ponto do dia usa o pior status já registrado.
- A varredura de perdidas por tempo roda também no Expo Go (abertura, volta ao primeiro plano e foco da agenda), não só no reconciliador de notificações.

## Capabilities

### New Capabilities
- (nenhuma)

### Modified Capabilities
- `adherence-history`: classificação do status final passa a ser por tempo (atraso e perdida), incluindo o estado exibido "Atrasada".
- `agenda-views`: "Atrasada" na agenda e no calendário; o calendário mostra o dia de hoje com as doses reais.

(As specs ainda vivem na change ativa `add-medication-scheduling`.)

## Impact

- **Código**: `src/domain/adherence-history/classificacao.ts` e `resolucao.ts` (atraso por tempo), nova varredura `marcarPerdidasPorTempo` (domínio) chamada no layout raiz, no foco da agenda e na tarefa periódica; `src/domain/agenda-views/agenda-diaria.ts`, `calendario-mensal.ts`, `marcador-dia.ts` e as telas da agenda e do calendário (estado "Atrasada" e hoje real); `constants/rotulos.ts`.
- Sem migração: "Atrasada" é derivado (dose não resolvida + horário), não um status gravado.
