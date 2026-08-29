import { setNotificationHandler } from 'expo-notifications';

/**
 * Comportamento quando uma notificação chega com o app em primeiro plano:
 * sempre mostra (banner + lista), já que tanto comum quanto especial
 * precisam ser vistas mesmo com o app aberto — a diferença de estilo entre
 * elas vem do canal (ver `canais.ts`), não deste handler.
 */
export function configurarComportamentoEmPrimeiroPlano(): void {
  setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}
