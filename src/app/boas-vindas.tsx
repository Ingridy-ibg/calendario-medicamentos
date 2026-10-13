import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EscolhaAparencia } from '@/components/perfil/escolha-aparencia';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Botao } from '@/components/ui/botao';
import { CampoTexto } from '@/components/ui/campo-texto';
import { Icone, type NomeIcone } from '@/components/ui/icone';
import { FAMILIA_TEXTO } from '@/constants/fontes';
import { useTheme } from '@/hooks/use-theme';
import { isExpoGo } from '@/lib/expo-go';
import { usePreferencias } from '@/lib/preferencias';

const RECURSOS: { icone: NomeIcone; texto: string }[] = [
  { icone: 'sino', texto: 'Lembretes que insistem até você responder' },
  { icone: 'calendario', texto: 'Histórico de adesão no calendário' },
  { icone: 'estoque', texto: 'Aviso de estoque baixo' },
];

/** Grade decorativa do topo (canvas "Boas-vindas"): uma semana de doses em miniatura. */
const GRADE: ('vazio' | 'tomada' | 'atraso')[] = [
  'vazio', 'tomada', 'tomada', 'vazio', 'tomada', 'tomada', 'vazio',
  'tomada', 'atraso', 'tomada', 'tomada', 'vazio', 'tomada', 'tomada',
  'tomada', 'vazio', 'tomada', 'tomada', 'vazio', 'vazio', 'vazio',
];

/**
 * Primeira abertura (specs/onboarding), em duas etapas: a apresentação e,
 * depois dela, nome e aparência (onboarding-profile-step). O roteamento fica
 * no layout raiz: quando a flag é concluída, o `Stack.Protected` troca para a
 * agenda sozinho.
 */
export default function BoasVindasScreen() {
  const [etapa, setEtapa] = useState<'apresentacao' | 'perfil'>('apresentacao');
  return etapa === 'apresentacao' ? <EtapaApresentacao aoAvancar={() => setEtapa('perfil')} /> : <EtapaPerfil />;
}

function EtapaApresentacao({ aoAvancar }: { aoAvancar: () => void }) {
  const theme = useTheme();
  const [pedindo, setPedindo] = useState(false);
  const { gravarBoasVindasConcluida } = usePreferencias();

  async function ativarLembretes() {
    setPedindo(true);
    // A flag é gravada antes dos pedidos: negar, ou fechar o app no meio de um
    // diálogo ou na etapa seguinte, não traz a boas-vindas de volta. Este é o
    // único pedido automático de permissões do app (specs/onboarding).
    gravarBoasVindasConcluida();
    try {
      if (!isExpoGo) {
        // Import dinâmico: `expo-notifications` lança exceção só de ser
        // importado no Expo Go (ver `lib/expo-go.ts`).
        const { solicitarPermissoesEssenciais } = await import('@/notifications');
        await solicitarPermissoesEssenciais();
      }
    } finally {
      aoAvancar();
    }
  }

  function agoraNao() {
    gravarBoasVindasConcluida();
    aoAvancar();
  }

  const corGrade = { vazio: '#22322D', tomada: '#2F6E5F', atraso: '#8A5A24' } as const;

  return (
    <ThemedView style={{ flex: 1 }}>
      <View
        style={{
          height: 340,
          backgroundColor: '#15211D',
          borderBottomLeftRadius: 36,
          borderBottomRightRadius: 36,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingBottom: 48,
        }}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden>
        <View style={{ position: 'absolute', top: 72, left: 32, right: 32, flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {GRADE.map((celula, indice) => (
            <View key={indice} style={{ width: '11%', height: 34, borderRadius: 10, backgroundColor: corGrade[celula] }} />
          ))}
        </View>
        <View
          style={{
            width: 112,
            height: 112,
            borderRadius: 32,
            backgroundColor: theme.accent,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 10,
            borderColor: '#15211D',
          }}>
          <Icone nome="pilula" cor={theme.onAccent} tamanho={56} />
        </View>
      </View>

      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <ScrollView contentContainerStyle={{ padding: 28, paddingTop: 32, gap: 14 }}>
          <ThemedText type="display" accessibilityRole="header" style={{ fontSize: 34, lineHeight: 38 }}>
            Seus remédios,{'\n'}na hora certa.
          </ThemedText>
          <ThemedText themeColor="textSecondary">
            Organize horários, acompanhe cada dose e saiba quando o estoque está acabando.
          </ThemedText>
          <View style={{ gap: 12, marginTop: 8 }}>
            {RECURSOS.map(({ icone, texto }) => (
              <View key={icone} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    backgroundColor: theme.accentSoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Icone nome={icone} cor={theme.onAccentSoft} tamanho={18} />
                </View>
                <ThemedText style={{ flex: 1, fontSize: 15 }}>{texto}</ThemedText>
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={{ paddingHorizontal: 28, paddingBottom: 24, gap: 6 }}>
          <Botao rotulo="Ativar lembretes e começar" tamanho="grande" onPress={ativarLembretes} disabled={pedindo} />
          <Pressable
            accessibilityRole="button"
            onPress={agoraNao}
            disabled={pedindo}
            style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
            <ThemedText themeColor="textSecondary" style={{ fontFamily: FAMILIA_TEXTO[600], fontSize: 15 }}>
              Agora não
            </ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

/**
 * Nome e aparência (artboard "Boas-vindas — nome e aparência"). A aparência é
 * gravada e aplicada a cada toque; "Começar" grava o nome e libera a agenda.
 */
function EtapaPerfil() {
  const theme = useTheme();
  const { aparencia, definirNome, definirAparencia, concluirBoasVindas } = usePreferencias();
  const [rascunhoNome, setRascunhoNome] = useState('');

  function comecar() {
    definirNome(rascunhoNome);
    concluirBoasVindas();
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 40, gap: 22 }} keyboardShouldPersistTaps="handled">
            <View style={{ gap: 10 }}>
              <View
                style={{
                  alignSelf: 'flex-start',
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 999,
                  backgroundColor: theme.accentSoft,
                }}>
                <ThemedText
                  style={{
                    color: theme.onAccentSoft,
                    fontFamily: FAMILIA_TEXTO[700],
                    fontSize: 12,
                    lineHeight: 16,
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                  }}>
                  Quase lá
                </ThemedText>
              </View>
              <ThemedText type="display" accessibilityRole="header">
                Como podemos te chamar?
              </ThemedText>
              <ThemedText themeColor="textSecondary">
                Usamos seu nome só para te cumprimentar.
              </ThemedText>
            </View>

            <CampoTexto
              rotulo="Seu nome (opcional)"
              value={rascunhoNome}
              onChangeText={setRascunhoNome}
              onBlur={() => definirNome(rascunhoNome)}
              placeholder="Ex.: Ana"
              autoCapitalize="words"
              autoComplete="given-name"
              returnKeyType="done"
            />

            <View style={{ gap: 10 }}>
              <ThemedText type="smallBold">Aparência do app</ThemedText>
              <EscolhaAparencia valor={aparencia} aoEscolher={definirAparencia} />
            </View>
          </ScrollView>

          <View style={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 24, gap: 10 }}>
            <ThemedText type="caption" themeColor="textSecondary" style={{ textAlign: 'center' }}>
              {rascunhoNome.trim()
                ? 'Você pode mudar tudo isso depois em Meu perfil.'
                : 'Sem nome, tudo bem: você pode mudar isso depois em Meu perfil.'}
            </ThemedText>
            <Botao rotulo="Começar" tamanho="grande" onPress={comecar} />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}
