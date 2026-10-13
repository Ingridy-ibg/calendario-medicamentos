import { type ReactNode, useState } from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icone } from '@/components/ui/icone';
import { Tocavel } from '@/components/ui/tocavel';
import type { ConteudoAjuda } from '@/constants/ajuda';
import { FAMILIA_TEXTO } from '@/constants/fontes';
import { useTheme } from '@/hooks/use-theme';

/**
 * Modal de ajuda paginado do formulário (schedule-type-help,
 * ajuda-prioridade-lembretes): uma explicação por vez, com setas e bolinhas.
 * Abre na opção marcada no formulário; fecha ao tocar fora ou no voltar do
 * Android, sem mexer no formulário.
 */
export function ModalAjudaPaginada<Chave extends string>({
  visivel,
  aoFechar,
  rotuloSecao,
  rotulos,
  itens,
  chaveInicial,
  renderIlustracao,
}: {
  visivel: boolean;
  aoFechar: () => void;
  /** Cabeçalho do cartão, ex.: "Tipos de esquema" → "Tipos de esquema · 2 de 5". */
  rotuloSecao: string;
  /** Rótulos de acessibilidade das setas. */
  rotulos: { anterior: string; proximo: string };
  itens: { chave: Chave; conteudo: ConteudoAjuda }[];
  /** Página mostrada a cada abertura (a opção marcada no formulário). */
  chaveInicial: Chave;
  renderIlustracao: (chave: Chave) => ReactNode;
}) {
  const theme = useTheme();
  const indiceInicial = () => Math.max(0, itens.findIndex((item) => item.chave === chaveInicial));
  const [indice, setIndice] = useState(indiceInicial);
  const [estavaVisivel, setEstavaVisivel] = useState(visivel);

  // A cada abertura, volta para a opção marcada no formulário.
  if (visivel !== estavaVisivel) {
    setEstavaVisivel(visivel);
    if (visivel) setIndice(indiceInicial());
  }

  const { chave, conteudo } = itens[indice];
  const ultimo = itens.length - 1;
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
            {rotuloSecao} · {indice + 1} de {itens.length}
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
                {renderIlustracao(chave)}
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
            <Seta nome="voltar" rotulo={rotulos.anterior} ativa={indice > 0} onPress={() => ir(indice - 1)} />
            <View accessibilityRole="tablist" accessibilityLabel={rotuloSecao} style={{ flexDirection: 'row', gap: 2 }}>
              {itens.map((item, k) => {
                const ativa = k === indice;
                return (
                  <Tocavel
                    key={item.chave}
                    accessibilityRole="tab"
                    accessibilityLabel={item.conteudo.titulo}
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
            <Seta nome="avancar" rotulo={rotulos.proximo} ativa={indice < ultimo} onPress={() => ir(indice + 1)} />
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

