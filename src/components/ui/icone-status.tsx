import { View } from 'react-native';

import { TOKEN_STATUS_DOSE, TOKEN_STATUS_DOSE_SUAVE } from '@/constants/rotulos';
import type { StatusDose } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';

import { Icone, type NomeIcone } from './icone';

const ICONE_POR_STATUS: Record<StatusDose, NomeIcone> = {
  pendente: 'pilula',
  aguardando: 'relogio',
  tomada: 'check',
  tomada_com_atraso: 'relogio',
  pulada: 'menos',
  perdida: 'alerta',
};

/** Quadrado com o ícone do status da dose (o rótulo em texto fica ao lado, nunca só a cor). */
export function IconeStatus({ status, tamanho = 40 }: { status: StatusDose; tamanho?: number }) {
  const theme = useTheme();
  const corIcone = status === 'pendente' ? theme.text : theme[TOKEN_STATUS_DOSE[status]];
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: tamanho,
        height: tamanho,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme[TOKEN_STATUS_DOSE_SUAVE[status]],
      }}>
      <Icone nome={ICONE_POR_STATUS[status]} cor={corIcone} tamanho={20} />
    </View>
  );
}
