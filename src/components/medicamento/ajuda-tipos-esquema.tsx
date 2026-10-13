import { useState } from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icone } from '@/components/ui/icone';
import { Tocavel } from '@/components/ui/tocavel';
import { FAMILIA_TEXTO } from '@/constants/fontes';
import { CONTEUDO_TIPOS_ESQUEMA } from '@/constants/tipos-esquema';
import { TIPOS_ESQUEMA, type TipoEsquema } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';

const LETRAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const DIAS_EXEMPLO_SEMANA = [1, 3, 5];
const HORAS_EXEMPLO_INTERVALO = ['06:00', '14:00', '22:00', '06:00'];

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
  const theme = useTheme();
  const [indice, setIndice] = useState(() => Math.max(0, TIPOS_ESQUEMA.indexOf(tipoInicial)));
  const [estavaVisivel, setEstavaVisivel] = useState(visivel);

  // A cada abertura, volta para o tipo marcado no formulário.
  if (visivel !== estavaVisivel) {
    setEstavaVisivel(visivel);
    if (visivel) setIndice(Math.max(0, TIPOS_ESQUEMA.indexOf(tipoInicial)));
  }

  const tipo = TIPOS_ESQUEMA[indice];
  const conteudo = CONTEUDO_TIPOS_ESQUEMA[tipo];
  const ultimo = TIPOS_ESQUEMA.length - 1;
  const ir = (n: number) => setIndice(Math.max(0, Math.min(ultimo, n)));

  return (
    <Modal visible={visivel} transparent animationType="fade" statusBarTranslucent onRequestClose={aoFechar}>
      <View style={{ flex: 1, justifyContent: 'center', padding: 16 }}>
        <Tocavel
          accessibilityRole="button"
          accessibilityLabel="Fechar explicação"
          onPress={aoFechar}
          estiloPressionado={{}}
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(14, 20, 18, 0.55)' }]}
        />

        <View
          accessibilityViewIsModal
          style={{
            maxHeight: '100%',
            backgroundColor: theme.surface,
            borderRadius: 28,
            paddingTop: 22,
            paddingHorizontal: 22,
            paddingBottom: 18,
            gap: 16,
            shadowColor: '#0E1412',
            shadowOpacity: 0.25,
            shadowRadius: 20,
            shadowOffset: { width: 0, height: 18 },
            elevation: 12,
          }}>
          <ThemedText
            themeColor="textSecondary"
            style={{ fontFamily: FAMILIA_TEXTO[700], fontSize: 12, lineHeight: 16, letterSpacing: 1, textTransform: 'uppercase' }}>
            Tipos de esquema · {indice + 1} de {TIPOS_ESQUEMA.length}
          </ThemedText>

          <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 16 }}>
            <View accessibilityLiveRegion="polite" style={{ gap: 16 }}>
              <ThemedText type="subtitle" accessibilityRole="header">
                {conteudo.titulo}
              </ThemedText>
              <ThemedText themeColor="textSecondary">{conteudo.descricao}</ThemedText>
            </View>

            <View style={{ gap: 10, padding: 14, borderRadius: 16, backgroundColor: theme.background }}>
              <ThemedText type="caption" themeColor="textSecondary" style={{ fontFamily: FAMILIA_TEXTO[600] }}>
                Exemplo: {conteudo.exemplo}
              </ThemedText>
              <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
                <Ilustracao tipo={tipo} />
              </View>
            </View>

            <View style={{ gap: 10 }}>
              {conteudo.pontos.map((ponto) => (
                <View key={ponto} style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ marginTop: 2 }}>
                    <Icone nome="check" cor={theme.accent} tamanho={18} />
                  </View>
                  <ThemedText style={{ flex: 1, fontSize: 15, lineHeight: 21 }}>{ponto}</ThemedText>
                </View>
              ))}
            </View>
          </ScrollView>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <Seta nome="voltar" rotulo="Tipo anterior" ativa={indice > 0} onPress={() => ir(indice - 1)} />
            <View accessibilityRole="tablist" accessibilityLabel="Tipos de esquema" style={{ flexDirection: 'row', gap: 2 }}>
              {TIPOS_ESQUEMA.map((opcao, k) => {
                const ativa = k === indice;
                return (
                  <Tocavel
                    key={opcao}
                    accessibilityRole="tab"
                    accessibilityLabel={CONTEUDO_TIPOS_ESQUEMA[opcao].titulo}
                    accessibilityState={{ selected: ativa }}
                    onPress={() => ir(k)}
                    style={{ width: 28, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                    <View
                      style={{
                        width: ativa ? 22 : 10,
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: ativa ? theme.accent : theme.border,
                      }}
                    />
                  </Tocavel>
                );
              })}
            </View>
            <Seta nome="avancar" rotulo="Próximo tipo" ativa={indice < ultimo} onPress={() => ir(indice + 1)} />
          </View>

          <ThemedText type="caption" themeColor="textSecondary" style={{ alignSelf: 'center' }}>
            Toque fora para voltar ao cadastro
          </ThemedText>
        </View>
      </View>
    </Modal>
  );
}

function Seta({
  nome,
  rotulo,
  ativa,
  onPress,
}: {
  nome: 'voltar' | 'avancar';
  rotulo: string;
  ativa: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Tocavel
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      accessibilityState={{ disabled: !ativa }}
      disabled={!ativa}
      onPress={onPress}
      style={{
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: ativa ? theme.surfaceMuted : 'transparent',
      }}>
      <Icone nome={nome} cor={ativa ? theme.text : theme.border} tamanho={20} />
    </Tocavel>
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
