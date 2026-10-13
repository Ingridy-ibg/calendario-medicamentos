## 1. Regra pura

- [x] 1.1 Implementar `estadoLimiteSeNecessario(registradas, limite)` em `src/domain/dose-scheduling/se-necessario.ts`; verificar com testes de 3/4 (abaixo), 4/4 (atingido), 5/4 (acima) e limite 1, e que `exigeConfirmacao` coincide com `avisoLimiteExcedido`.

## 2. Agenda

- [x] 2.1 Mostrar no `ItemSeNecessario` o contador em âmbar/vermelho e a linha "Limite de hoje atingido" / "Acima do limite recomendado" com ícone; verificar no app os três estados nos temas claro e escuro.
- [x] 2.2 Pedir confirmação com `Alert.alert` ao registrar com o limite já atingido ("Cancelar" / "Registrar mesmo assim"), registrando direto dentro do limite; verificar com teste de domínio que cancelar não grava e confirmar grava e desconta estoque, e no app os três cenários da spec.

## 3. Verificação

- [x] 3.1 Rodar `npx vitest run` e `npx tsc --noEmit` sem falhas e, no aparelho, registrar doses de um "se necessário" com limite 2 até passar do limite; documentar o resultado.

> Verificação no aparelho concluída em 13/10/2026: todos os percursos manuais desta change foram testados e aprovados.
