import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Pressable, useColorScheme, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Icone } from '@/components/ui/icone';
import { PALETAS_SAUDACAO, type PaletaSaudacao } from '@/constants/cores';
import { FAMILIA_TEXTO, FAMILIA_TITULO } from '@/constants/fontes';
import { db } from '@/db/client';
import { montarAgendaDoDia } from '@/domain/agenda-views/agenda-diaria';
import { resumirDia } from '@/domain/agenda-views/resumo-dia';
import { type Periodo, periodoDoDia, resumoSaudacao, textoSaudacao } from '@/domain/daily-greeting/saudacao';
import { useTheme } from '@/hooks/use-theme';
import { gravarUltimaSaudacao, usePreferencias } from '@/lib/preferencias';

const DURACAO_MS = 2500;

function capitalizar(texto: string) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Sol (manhã/tarde) ou meia-lua com estrelas (noite) — nunca sol à noite (specs/daily-greeting). */
function Ilustracao({ periodo, paleta }: { periodo: Periodo; paleta: PaletaSaudacao }) {
  const noite = periodo === 'noite';
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ height: 300, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: paleta.halo }} />
      <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: paleta.astro, overflow: 'hidden' }}>
        {noite ? (
          // A "sombra" na cor do halo recorta o círculo claro em meia-lua.
          <View
            style={{
              position: 'absolute',
              width: 104,
              height: 104,
              borderRadius: 52,
              top: -22,
              left: 34,
              backgroundColor: paleta.halo,
            }}
          />
        ) : null}
      </View>
      {noite
        ? [
            { top: 70, left: 64, tamanho: 4 },
            { top: 120, right: 70, tamanho: 3 },
            { top: 200, left: 100, tamanho: 3 },
            { top: 48, right: 120, tamanho: 5 },
          ].map(({ tamanho, ...posicao }, indice) => (
            <View
              key={indice}
              style={{ position: 'absolute', ...posicao, width: tamanho, height: tamanho, borderRadius: tamanho, backgroundColor: paleta.secundario }}
            />
          ))
        : null}
    </View>
  );
}

/**
 * Tela de saudação da primeira abertura do dia (specs/daily-greeting). Segue
 * sozinha para a agenda em ~2,5 s — exceto com leitor de tela ativo — e
 * qualquer toque pula a espera. Sai com `replace` para que voltar não a reabra.
 */
export default function SaudacaoScreen() {
  const theme = useTheme();
  const esquema = useColorScheme();
  const nome = usePreferencias((estado) => estado.nome);
  const [agora] = useState(() => new Date());
  const [leitorDeTela, setLeitorDeTela] = useState<boolean | null>(null);
  const progresso = useSharedValue(0);

  const periodo = periodoDoDia(agora);
  const paleta = PALETAS_SAUDACAO[esquema === 'dark' ? 'dark' : 'light'][periodo];
  const resumo = useMemo(() => resumoSaudacao(resumirDia(montarAgendaDoDia(db, agora))), [agora]);

  useEffect(() => {
    // Gravada ao exibir, não ao sair: fechar o app no meio conta como vista.
    gravarUltimaSaudacao(agora);
    AccessibilityInfo.isScreenReaderEnabled().then(setLeitorDeTela);
  }, [agora]);

  useEffect(() => {
    if (leitorDeTela !== false) return;
    progresso.value = withTiming(1, { duration: DURACAO_MS, easing: Easing.linear });
    const timer = setTimeout(() => router.replace('/'), DURACAO_MS);
    return () => clearTimeout(timer);
  }, [leitorDeTela, progresso]);

  const estiloProgresso = useAnimatedStyle(() => ({ width: `${progresso.value * 100}%` }));

  return (
    <Pressable
      accessible={false}
      onPress={() => router.replace('/')}
      style={{ flex: 1, backgroundColor: paleta.fundo }}>
      <SafeAreaView style={{ flex: 1 }}>
        <Ilustracao periodo={periodo} paleta={paleta} />

        <View style={{ flex: 1, paddingHorizontal: 28, gap: 14 }}>
          <ThemedText style={{ color: paleta.secundario, fontFamily: FAMILIA_TEXTO[600], fontSize: 15 }}>
            {capitalizar(format(agora, "EEEE, d 'de' MMMM · HH:mm", { locale: ptBR }))}
          </ThemedText>
          <ThemedText
            accessibilityRole="header"
            style={{ color: paleta.texto, fontFamily: FAMILIA_TITULO[700], fontSize: 46, lineHeight: 50, letterSpacing: -0.9 }}>
            {textoSaudacao(periodo, nome)}
          </ThemedText>
          <ThemedText style={{ color: paleta.secundario, fontSize: 18, lineHeight: 26 }}>{resumo.frase}</ThemedText>

          {resumo.cartao ? (
            <View
              style={{
                marginTop: 8,
                borderRadius: 20,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                backgroundColor: paleta.cartao,
              }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: paleta.iconeFundo,
                }}>
                <Icone nome="relogio" cor={paleta.iconeTexto} tamanho={20} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <ThemedText type="caption" style={{ color: paleta.secundario, fontFamily: FAMILIA_TEXTO[600] }}>
                  {resumo.cartao.rotulo}
                </ThemedText>
                <ThemedText numerico style={{ color: paleta.texto, fontFamily: FAMILIA_TEXTO[700], fontSize: 17 }}>
                  {resumo.cartao.dose}
                </ThemedText>
              </View>
            </View>
          ) : null}
        </View>

        <View style={{ paddingHorizontal: 28, paddingBottom: 32, gap: 14 }}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace('/')}
            style={({ pressed }) => ({
              minHeight: 54,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.accent,
              opacity: pressed ? 0.8 : 1,
            })}>
            <ThemedText style={{ color: theme.onAccent, fontFamily: FAMILIA_TEXTO[700] }}>Ver agenda</ThemedText>
          </Pressable>
          {leitorDeTela === false ? (
            <View style={{ alignItems: 'center', gap: 8 }} importantForAccessibility="no-hide-descendants">
              <View style={{ width: 64, height: 4, borderRadius: 2, overflow: 'hidden', backgroundColor: paleta.halo }}>
                <Animated.View style={[{ height: 4, borderRadius: 2, backgroundColor: theme.accent }, estiloProgresso]} />
              </View>
              <ThemedText type="caption" style={{ color: paleta.secundario }}>
                Abrindo a agenda… toque para pular
              </ThemedText>
            </View>
          ) : null}
        </View>
      </SafeAreaView>
    </Pressable>
  );
}
