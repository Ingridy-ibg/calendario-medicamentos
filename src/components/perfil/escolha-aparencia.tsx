import { Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/cores';
import type { Aparencia } from '@/domain/preferencias/preferencias';
import { useTheme } from '@/hooks/use-theme';

const OPCOES_APARENCIA: { valor: Aparencia; rotulo: string; descricao: string }[] = [
  { valor: 'sistema', rotulo: 'Sistema', descricao: 'Segue o modo claro ou escuro do Android.' },
  { valor: 'claro', rotulo: 'Claro', descricao: 'Sempre claro, mesmo com o Android no modo escuro.' },
  { valor: 'escuro', rotulo: 'Escuro', descricao: 'Sempre escuro, mesmo com o Android no modo claro.' },
];

/** Miniatura do tema dentro de cada opção de aparência. */
export function PreviaTema({ valor }: { valor: Aparencia }) {
  const theme = useTheme();
  const paleta = valor === 'escuro' ? Colors.dark : Colors.light;
  return (
    <View
      style={{
        width: '100%',
        height: 58,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: theme.border,
        overflow: 'hidden',
        flexDirection: 'row',
      }}>
      {(valor === 'sistema' ? [Colors.light, Colors.dark] : [paleta]).map((p, indice) => (
        <View key={indice} style={{ flex: 1, backgroundColor: p.background, padding: 8, gap: 6 }}>
          <View style={{ width: '60%', height: 6, borderRadius: 3, backgroundColor: p.accent }} />
          <View style={{ flex: 1, borderRadius: 6, backgroundColor: p.surface }} />
        </View>
      ))}
    </View>
  );
}

/**
 * As três opções de aparência com miniatura e a frase da opção marcada.
 * Usada no Perfil e na boas-vindas (onboarding-profile-step).
 */
export function EscolhaAparencia({ valor, aoEscolher }: { valor: Aparencia; aoEscolher: (aparencia: Aparencia) => void }) {
  const theme = useTheme();
  const descricao = OPCOES_APARENCIA.find((opcao) => opcao.valor === valor)?.descricao;
  return (
    <>
      <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: 8 }}>
        {OPCOES_APARENCIA.map((opcao) => {
          const ativa = opcao.valor === valor;
          return (
            <Pressable
              key={opcao.valor}
              accessibilityRole="radio"
              accessibilityState={{ checked: ativa }}
              accessibilityLabel={`Aparência: ${opcao.rotulo}`}
              onPress={() => aoEscolher(opcao.valor)}
              style={{
                flex: 1,
                alignItems: 'center',
                gap: 8,
                paddingHorizontal: 6,
                paddingTop: 10,
                paddingBottom: 12,
                borderRadius: 16,
                borderWidth: ativa ? 2 : 1.5,
                borderColor: ativa ? theme.accent : theme.border,
                backgroundColor: theme.surface,
              }}>
              <PreviaTema valor={opcao.valor} />
              <ThemedText type="smallBold">{opcao.rotulo}</ThemedText>
            </Pressable>
          );
        })}
      </View>
      <ThemedText type="caption" themeColor="textSecondary">
        {descricao}
      </ThemedText>
    </>
  );
}
