import { useState } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

export interface TocavelProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /** Estilo aplicado por cima enquanto pressionado; padrão: opacidade 0,8. */
  estiloPressionado?: StyleProp<ViewStyle>;
}

/**
 * `Pressable` com o estado "pressionado" guardado aqui e o estilo sempre em
 * objeto. O NativeWind envolve todo `Pressable` e nunca chama um
 * `style={({ pressed }) => …}`, o que deixava botões sem fundo nem borda
 * (change fix-pressable-styles). Use este componente para qualquer elemento
 * tocável com feedback de toque.
 */
export function Tocavel({ style, estiloPressionado, onPressIn, onPressOut, disabled, ...rest }: TocavelProps) {
  const [pressionado, setPressionado] = useState(false);
  return (
    <Pressable
      disabled={disabled}
      onPressIn={(evento) => {
        setPressionado(true);
        onPressIn?.(evento);
      }}
      onPressOut={(evento) => {
        setPressionado(false);
        onPressOut?.(evento);
      }}
      style={[style, pressionado && !disabled ? (estiloPressionado ?? { opacity: 0.8 }) : null]}
      {...rest}
    />
  );
}
