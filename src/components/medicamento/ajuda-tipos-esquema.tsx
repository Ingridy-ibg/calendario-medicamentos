import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { CONTEUDO_TIPOS_ESQUEMA } from '@/constants/tipos-esquema';
import { FAMILIA_TEXTO } from '@/constants/fontes';
import { TIPOS_ESQUEMA, type TipoEsquema } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';

import { ModalAjudaPaginada } from './modal-ajuda-paginada';

const LETRAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const DIAS_EXEMPLO_SEMANA = [1, 3, 5];
const HORAS_EXEMPLO_INTERVALO = ['06:00', '14:00', '22:00', '06:00'];

const ITENS = TIPOS_ESQUEMA.map((tipo) => ({ chave: tipo, conteudo: CONTEUDO_TIPOS_ESQUEMA[tipo] }));

/**
 * Modal que explica os tipos de esquema, um por vez (schedule-type-help;
 * artboard "Info — tipos de esquema"). Abre no tipo marcado no formulário;
 * fecha ao tocar fora ou no voltar do Android, sem mexer no formulário.
 */
export function AjudaTiposEsquema({
  visivel,
  tipoInicial,
  aoFechar,
}: {
  visivel: boolean;
  tipoInicial: TipoEsquema;
  aoFechar: () => void;
}) {
  return (
    <ModalAjudaPaginada
      visivel={visivel}
      aoFechar={aoFechar}
      rotuloSecao="Tipos de esquema"
      rotulos={{ anterior: 'Tipo anterior', proximo: 'Próximo tipo' }}
      itens={ITENS}
      chaveInicial={tipoInicial}
      renderIlustracao={(tipo) => <Ilustracao tipo={tipo} />}
    />
  );
}

/** Desenho simples de cada tipo, feito com `View`s; o exemplo em texto já o descreve. */
function Ilustracao({ tipo }: { tipo: TipoEsquema }) {
  const theme = useTheme();
  const tracejado = { borderWidth: 1.5, borderStyle: 'dashed', borderColor: theme.border } as const;
  const rotulo = (texto: string) => (
    <ThemedText type="caption" themeColor="textSecondary" style={{ fontSize: 11, lineHeight: 14 }}>
      {texto}
    </ThemedText>
  );

  switch (tipo) {
    case 'DIARIO':
      return (
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {LETRAS_SEMANA.map((letra, d) => (
            <View key={d} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
              <View style={{ alignSelf: 'stretch', height: 10, borderRadius: 5, backgroundColor: theme.accent }} />
              <View style={{ alignSelf: 'stretch', height: 10, borderRadius: 5, backgroundColor: theme.accent }} />
              {rotulo(letra)}
            </View>
          ))}
        </View>
      );
    case 'INTERVALO_HORAS':
      return (
        <View style={{ height: 34 }}>
          <View style={{ position: 'absolute', left: 0, right: 0, top: 10, height: 2, backgroundColor: theme.border }} />
          {HORAS_EXEMPLO_INTERVALO.map((hora, k) => (
            <View key={k} style={{ position: 'absolute', top: 4, left: `${k * 31}%`, width: 40, alignItems: 'center', gap: 2 }}>
              <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: theme.accent }} />
              {rotulo(hora)}
            </View>
          ))}
        </View>
      );
    case 'DIAS_SEMANA':
      return (
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {LETRAS_SEMANA.map((letra, d) => (
            <View key={d} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
              <View
                style={[
                  { alignSelf: 'stretch', height: 22, borderRadius: 6 },
                  DIAS_EXEMPLO_SEMANA.includes(d) ? { backgroundColor: theme.accent } : tracejado,
                ]}
              />
              {rotulo(letra)}
            </View>
          ))}
        </View>
      );
    case 'CICLICO':
      return (
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', gap: 3 }}>
            <View style={{ flex: 21, height: 12, borderRadius: 6, backgroundColor: theme.accent }} />
            <View style={[{ flex: 7, height: 12, borderRadius: 6 }, tracejado]} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <ThemedText type="caption">
              <ThemedText type="caption" style={{ fontFamily: FAMILIA_TEXTO[700] }}>
                21 dias
              </ThemedText>{' '}
              <ThemedText type="caption" themeColor="textSecondary">
                tomando
              </ThemedText>
            </ThemedText>
            <ThemedText type="caption">
              <ThemedText type="caption" style={{ fontFamily: FAMILIA_TEXTO[700] }}>
                7 dias
              </ThemedText>{' '}
              <ThemedText type="caption" themeColor="textSecondary">
                de pausa
              </ThemedText>
            </ThemedText>
          </View>
        </View>
      );
    case 'SE_NECESSARIO':
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {[true, true, false, false].map((tomada, k) => (
            <View
              key={k}
              style={[{ width: 26, height: 26, borderRadius: 8 }, tomada ? { backgroundColor: theme.accent } : tracejado]}
            />
          ))}
          <ThemedText type="caption" themeColor="textSecondary" numerico style={{ marginLeft: 6 }}>
            2 de 4 hoje
          </ThemedText>
        </View>
      );
  }
}
