import { type AndroidSymbol, type SFSymbol, SymbolView } from 'expo-symbols';
import type { ColorValue } from 'react-native';

/**
 * Ícones do app por nome semântico (design.md, decisão 3). O `SymbolView`
 * precisa do objeto por plataforma: string pura vira SF Symbol e não
 * renderiza no Android.
 */
const SIMBOLOS = {
  check: { ios: 'checkmark', android: 'check' },
  relogio: { ios: 'clock', android: 'schedule' },
  mais: { ios: 'plus', android: 'add' },
  menos: { ios: 'minus', android: 'remove' },
  fechar: { ios: 'xmark', android: 'close' },
  voltar: { ios: 'chevron.left', android: 'chevron_left' },
  avancar: { ios: 'chevron.right', android: 'chevron_right' },
  seta: { ios: 'arrow.right', android: 'arrow_forward' },
  calendario: { ios: 'calendar', android: 'calendar_month' },
  lista: { ios: 'list.bullet', android: 'format_list_bulleted' },
  sino: { ios: 'bell', android: 'notifications' },
  sinoDesligado: { ios: 'bell.slash', android: 'notifications_off' },
  estoque: { ios: 'shippingbox', android: 'inventory_2' },
  pilula: { ios: 'pills', android: 'pill' },
  pessoa: { ios: 'person', android: 'person' },
  editar: { ios: 'pencil', android: 'edit' },
  lixeira: { ios: 'trash', android: 'delete' },
  alerta: { ios: 'exclamationmark.triangle', android: 'warning' },
  info: { ios: 'info.circle', android: 'info' },
  cadeado: { ios: 'lock', android: 'lock' },
  filtro: { ios: 'line.3.horizontal.decrease', android: 'filter_list' },
  tocar: { ios: 'play.fill', android: 'play_arrow' },
} as const satisfies Record<string, { ios: SFSymbol; android: AndroidSymbol }>;

export type NomeIcone = keyof typeof SIMBOLOS;

export function Icone({ nome, cor, tamanho = 24 }: { nome: NomeIcone; cor: ColorValue; tamanho?: number }) {
  const { ios, android } = SIMBOLOS[nome];
  return <SymbolView name={{ ios, android, web: android }} tintColor={cor} size={tamanho} />;
}
