import { router } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CabecalhoSecao } from '@/components/ui/cabecalho-secao';
import { Cartao } from '@/components/ui/cartao';
import { Icone } from '@/components/ui/icone';
import { Tocavel } from '@/components/ui/tocavel';
import { PALETAS_ALARME } from '@/constants/cores';
import { FAMILIA_TEXTO, FAMILIA_TITULO } from '@/constants/fontes';
import {
  NOMES_TEMAS_ALARME,
  nomeDoToque,
  TEMAS_ALARME,
  type ToqueAlarme,
  TOQUES_DO_APP,
  toqueParaNativo,
} from '@/domain/preferencias/alarme';
import { useTheme } from '@/hooks/use-theme';
import {
  agendarAlarme,
  alarmeDisponivel,
  escolherToqueDoAparelho,
  ID_ALARME_TESTE,
  linkDoAlarme,
  pararPreviaDoToque,
  tocarPreviaDoToque,
} from '@/lib/alarme-dose';
import { usePreferencias } from '@/lib/preferencias';

/** Miniatura da tela de alarme no tema escolhido (canvas "Perfil — personalizar alarme"). */
function Previa() {
  const tema = usePreferencias((estado) => estado.alarme.tema);
  const cores = PALETAS_ALARME[tema];
  const theme = useTheme();
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={{
        width: 112,
        height: 196,
        borderRadius: 18,
        paddingTop: 16,
        paddingHorizontal: 10,
        paddingBottom: 10,
        alignItems: 'center',
        gap: 6,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: cores.fundo,
      }}>
      <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: cores.disco }} />
      <ThemedText numerico style={{ color: cores.texto, fontFamily: FAMILIA_TITULO[700], fontSize: 28, lineHeight: 32 }}>
        08:00
      </ThemedText>
      <ThemedText style={{ color: cores.texto, fontFamily: FAMILIA_TEXTO[700], fontSize: 10, lineHeight: 13 }}>
        Anticoncepcional
      </ThemedText>
      <View style={{ width: '100%', height: 22, borderRadius: 6, backgroundColor: cores.cartao }} />
      <View style={{ flex: 1 }} />
      <View
        style={{
          width: '100%',
          height: 24,
          borderRadius: 8,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: cores.destaque,
        }}>
        <ThemedText style={{ color: cores.onDestaque, fontFamily: FAMILIA_TEXTO[700], fontSize: 9, lineHeight: 12 }}>
          Tomei agora
        </ThemedText>
      </View>
    </View>
  );
}

function Radio({ ativo }: { ativo: boolean }) {
  const theme = useTheme();
  return (
    <View
      style={{
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: ativo ? 6 : 2,
        borderColor: ativo ? theme.accent : theme.textSecondary,
      }}
    />
  );
}

function LinhaToque({
  nome,
  descricao,
  ativo,
  aoEscolher,
  aoOuvir,
}: {
  nome: string;
  descricao: string;
  ativo: boolean;
  aoEscolher: () => void;
  aoOuvir: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Tocavel
        accessibilityRole="radio"
        accessibilityState={{ checked: ativo }}
        onPress={aoEscolher}
        style={{ flex: 1, minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Radio ativo={ativo} />
        <View style={{ flex: 1, gap: 1 }}>
          <ThemedText style={{ fontFamily: FAMILIA_TEXTO[600], fontSize: 15 }}>{nome}</ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            {descricao}
          </ThemedText>
        </View>
      </Tocavel>
      <Tocavel
        accessibilityRole="button"
        accessibilityLabel={`Ouvir ${nome}`}
        onPress={aoOuvir}
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.surfaceMuted,
        }}>
        <Icone nome="tocar" cor={theme.text} tamanho={18} />
      </Tocavel>
    </View>
  );
}

function LinhaInterruptor({
  titulo,
  descricao,
  valor,
  aoMudar,
}: {
  titulo: string;
  descricao: string;
  valor: boolean;
  aoMudar: (valor: boolean) => void;
}) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14, minHeight: 44 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText style={{ fontFamily: FAMILIA_TEXTO[600], fontSize: 15 }}>{titulo}</ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">
          {descricao}
        </ThemedText>
      </View>
      <Switch
        accessibilityLabel={titulo}
        value={valor}
        onValueChange={aoMudar}
        trackColor={{ true: theme.accent, false: theme.border }}
        thumbColor={theme.surface}
      />
    </View>
  );
}

/**
 * "Alarme dos especiais" (specs/user-profile, "Personalização do alarme dos
 * especiais"; alarme-tela-cheia, design.md, decisão 6). Cada escolha é
 * gravada na hora e repassada ao módulo nativo, valendo a partir do próximo
 * alarme.
 */
export default function PersonalizarAlarmeScreen() {
  const theme = useTheme();
  const alarme = usePreferencias((estado) => estado.alarme);
  const definirAlarme = usePreferencias((estado) => estado.definirAlarme);

  useEffect(() => () => pararPreviaDoToque(), []);

  function ouvir(toque: ToqueAlarme) {
    tocarPreviaDoToque(toqueParaNativo(toque));
  }

  async function usarToqueDoAparelho() {
    const atual = alarme.toque.tipo === 'aparelho' ? alarme.toque.uri : null;
    const escolhido = await escolherToqueDoAparelho(atual);
    if (escolhido) definirAlarme({ toque: { tipo: 'aparelho', uri: escolhido.uri, titulo: escolhido.titulo } });
  }

  function testar() {
    // Um alarme de verdade, daqui a 1 s, com o id de teste: toca com o toque e a
    // vibração escolhidos, e a tela de alarme não registra nenhuma dose.
    agendarAlarme(ID_ALARME_TESTE, new Date(Date.now() + 1000), {
      titulo: 'Teste do alarme',
      texto: 'Nenhuma dose é registrada',
      link: linkDoAlarme(ID_ALARME_TESTE),
    });
    router.push({ pathname: '/alarme/[doseId]', params: { doseId: ID_ALARME_TESTE } });
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ gap: 14, padding: 20, paddingBottom: 40 }}>
          <Tocavel
            accessibilityRole="button"
            accessibilityLabel="Voltar para o perfil"
            onPress={() => router.back()}
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.surface,
            }}>
            <Icone nome="voltar" cor={theme.text} tamanho={22} />
          </Tocavel>

          <View style={{ gap: 6 }}>
            <ThemedText type="display" accessibilityRole="header">
              Alarme dos especiais
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={{ fontSize: 15, lineHeight: 21 }}>
              Toca em tela cheia na hora das doses de prioridade especial. Vale para todos eles.
            </ThemedText>
          </View>

          {!alarmeDisponivel ? (
            <Cartao>
              <ThemedText type="small" themeColor="textSecondary">
                O alarme em tela cheia só funciona no app instalado no Android, não no Expo Go. As escolhas abaixo ficam
                guardadas mesmo assim.
              </ThemedText>
            </Cartao>
          ) : null}

          <Cartao style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
            <Previa />
            <View style={{ flex: 1, gap: 10 }}>
              <View style={{ gap: 2 }}>
                <CabecalhoSecao>Prévia</CabecalhoSecao>
                <ThemedText style={{ fontFamily: FAMILIA_TEXTO[700], fontSize: 16 }}>
                  Tema {NOMES_TEMAS_ALARME[alarme.tema]}
                </ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  {nomeDoToque(alarme.toque)} · {alarme.vibrar ? 'com vibração' : 'sem vibração'}
                </ThemedText>
              </View>
              <Tocavel
                accessibilityRole="button"
                disabled={!alarmeDisponivel}
                onPress={testar}
                style={{
                  height: 44,
                  borderRadius: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  backgroundColor: theme.accent,
                  opacity: alarmeDisponivel ? 1 : 0.5,
                }}>
                <Icone nome="tocar" cor={theme.onAccent} tamanho={16} />
                <ThemedText style={{ color: theme.onAccent, fontFamily: FAMILIA_TEXTO[700], fontSize: 15 }}>
                  Testar alarme
                </ThemedText>
              </Tocavel>
            </View>
          </Cartao>

          <Cartao>
            <CabecalhoSecao>Aparência</CabecalhoSecao>
            <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: 8 }}>
              {TEMAS_ALARME.map((tema) => {
                const ativo = alarme.tema === tema;
                const cores = PALETAS_ALARME[tema];
                return (
                  <Tocavel
                    key={tema}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: ativo }}
                    accessibilityLabel={NOMES_TEMAS_ALARME[tema]}
                    onPress={() => definirAlarme({ tema })}
                    style={{
                      flex: 1,
                      alignItems: 'center',
                      gap: 8,
                      paddingTop: 8,
                      paddingHorizontal: 6,
                      paddingBottom: 10,
                      borderRadius: 16,
                      borderWidth: ativo ? 2 : 1.5,
                      borderColor: ativo ? theme.accent : theme.border,
                      backgroundColor: theme.surface,
                    }}>
                    <View
                      style={{
                        width: '100%',
                        height: 64,
                        borderRadius: 10,
                        padding: 6,
                        justifyContent: 'flex-end',
                        borderWidth: 1,
                        borderColor: theme.border,
                        backgroundColor: cores.fundo,
                      }}>
                      <View style={{ height: 10, borderRadius: 4, backgroundColor: cores.destaque }} />
                    </View>
                    <ThemedText style={{ fontFamily: FAMILIA_TEXTO[700], fontSize: 13 }}>{NOMES_TEMAS_ALARME[tema]}</ThemedText>
                  </Tocavel>
                );
              })}
            </View>
          </Cartao>

          <Cartao style={{ gap: 4 }}>
            <View style={{ paddingBottom: 6 }}>
              <CabecalhoSecao>Toque</CabecalhoSecao>
            </View>
            <View accessibilityRole="radiogroup">
              {TOQUES_DO_APP.map((toque) => (
                <LinhaToque
                  key={toque.id}
                  nome={toque.nome}
                  descricao={toque.descricao}
                  ativo={alarme.toque.tipo === 'app' && alarme.toque.id === toque.id}
                  aoEscolher={() => definirAlarme({ toque: { tipo: 'app', id: toque.id } })}
                  aoOuvir={() => ouvir({ tipo: 'app', id: toque.id })}
                />
              ))}
              {alarme.toque.tipo === 'aparelho' ? (
                <LinhaToque
                  nome={alarme.toque.titulo}
                  descricao="Toque do aparelho"
                  ativo
                  aoEscolher={() => undefined}
                  aoOuvir={() => ouvir(alarme.toque)}
                />
              ) : null}
            </View>
            <View style={{ height: 1, backgroundColor: theme.divider, marginVertical: 6 }} />
            <Tocavel
              accessibilityRole="button"
              disabled={!alarmeDisponivel}
              onPress={() => void usarToqueDoAparelho()}
              style={{
                minHeight: 48,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                opacity: alarmeDisponivel ? 1 : 0.5,
              }}>
              <ThemedText style={{ color: theme.accent, fontFamily: FAMILIA_TEXTO[600], fontSize: 15 }}>
                Usar um toque do aparelho
              </ThemedText>
              <Icone nome="avancar" cor={theme.accent} tamanho={20} />
            </Tocavel>
          </Cartao>

          <Cartao>
            <CabecalhoSecao>Comportamento</CabecalhoSecao>
            <LinhaInterruptor
              titulo="Vibrar junto"
              descricao="Vibra enquanto o alarme toca"
              valor={alarme.vibrar}
              aoMudar={(vibrar) => definirAlarme({ vibrar })}
            />
            <View style={{ height: 1, backgroundColor: theme.divider }} />
            <LinhaInterruptor
              titulo="Volume aumenta aos poucos"
              descricao="Começa baixo e sobe em 30 segundos"
              valor={alarme.crescente}
              aoMudar={(crescente) => definirAlarme({ crescente })}
            />
          </Cartao>

          <ThemedText type="caption" themeColor="textSecondary" style={{ textAlign: 'center', paddingHorizontal: 6 }}>
            A observação de cada remédio especial aparece na tela do alarme.
          </ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
