import Constants from 'expo-constants';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Botao } from '@/components/ui/botao';
import { CabecalhoSecao } from '@/components/ui/cabecalho-secao';
import { CampoTexto } from '@/components/ui/campo-texto';
import { Cartao } from '@/components/ui/cartao';
import { Icone } from '@/components/ui/icone';
import { Colors } from '@/constants/cores';
import { FAMILIA_TEXTO } from '@/constants/fontes';
import { type Aparencia, inicialDoNome } from '@/domain/preferencias/preferencias';
import { useTheme } from '@/hooks/use-theme';
import { isExpoGo } from '@/lib/expo-go';
import { usePreferencias } from '@/lib/preferencias';
import type { SituacaoPermissoes } from '@/notifications';

const OPCOES_APARENCIA: { valor: Aparencia; rotulo: string; descricao: string }[] = [
  { valor: 'sistema', rotulo: 'Sistema', descricao: 'Segue o modo claro ou escuro do Android.' },
  { valor: 'claro', rotulo: 'Claro', descricao: 'Sempre claro, mesmo com o Android no modo escuro.' },
  { valor: 'escuro', rotulo: 'Escuro', descricao: 'Sempre escuro, mesmo com o Android no modo claro.' },
];

function Avatar({ nome, tamanho }: { nome: string | null; tamanho: number }) {
  const theme = useTheme();
  const inicial = inicialDoNome(nome);
  return (
    <View
      style={{
        width: tamanho,
        height: tamanho,
        borderRadius: tamanho / 2,
        backgroundColor: theme.accentSoft,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      {inicial ? (
        <ThemedText style={{ color: theme.onAccentSoft, fontFamily: FAMILIA_TEXTO[700], fontSize: tamanho * 0.4 }}>
          {inicial}
        </ThemedText>
      ) : (
        <Icone nome="pessoa" cor={theme.onAccentSoft} tamanho={tamanho * 0.5} />
      )}
    </View>
  );
}

/** Miniatura do tema dentro de cada opção de aparência. */
function PreviaTema({ valor }: { valor: Aparencia }) {
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

function LinhaPermissao({
  titulo,
  descricao,
  ativa,
  rotuloAcao,
  aoTocar,
}: {
  titulo: string;
  descricao: string;
  ativa: boolean;
  rotuloAcao: string;
  aoTocar: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText style={{ fontFamily: FAMILIA_TEXTO[600], fontSize: 15 }}>{titulo}</ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">
          {descricao}
        </ThemedText>
      </View>
      {ativa ? (
        <View style={{ backgroundColor: theme.accentSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
          <ThemedText type="caption" style={{ color: theme.onAccentSoft, fontFamily: FAMILIA_TEXTO[700] }}>
            Ativa
          </ThemedText>
        </View>
      ) : (
        <Botao rotulo={rotuloAcao} variante="suave" onPress={aoTocar} />
      )}
    </View>
  );
}

export default function PerfilScreen() {
  const theme = useTheme();
  const { nome, aparencia, definirNome, definirAparencia } = usePreferencias();
  const [rascunhoNome, setRascunhoNome] = useState(nome ?? '');
  const [permissoes, setPermissoes] = useState<SituacaoPermissoes | null>(null);
  const rascunhoRef = useRef(rascunhoNome);
  rascunhoRef.current = rascunhoNome;

  // O nome é gravado ao sair do campo e também ao sair da tela (design.md, decisão 9).
  useEffect(() => () => definirNome(rascunhoRef.current), [definirNome]);

  // Só consulta — abrir o perfil nunca dispara pedido de permissão (specs/user-profile).
  const atualizarPermissoes = useCallback(() => {
    if (isExpoGo) return;
    void import('@/notifications').then(({ consultarPermissoes }) => consultarPermissoes().then(setPermissoes));
  }, []);

  useFocusEffect(atualizarPermissoes);

  useEffect(() => {
    // A permissão pode ter sido dada nas Configurações do sistema: relê ao voltar.
    const assinatura = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') atualizarPermissoes();
    });
    return () => assinatura.remove();
  }, [atualizarPermissoes]);

  async function permitirNotificacoes() {
    const { solicitarPermissaoPostNotifications } = await import('@/notifications');
    await solicitarPermissaoPostNotifications();
    atualizarPermissoes();
  }

  async function abrirAlarmeExato() {
    const { solicitarPermissaoAlarmeExato } = await import('@/notifications');
    await solicitarPermissaoAlarmeExato();
    atualizarPermissoes();
  }

  const descricaoAparencia = OPCOES_APARENCIA.find((opcao) => opcao.valor === aparencia)?.descricao;

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ gap: 14, padding: 20, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Voltar para a agenda"
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
          </Pressable>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 4 }}>
            <Avatar nome={rascunhoNome} tamanho={64} />
            <ThemedText type="display" accessibilityRole="header" style={{ flex: 1 }}>
              Meu perfil
            </ThemedText>
          </View>

          <Cartao>
            <CabecalhoSecao>Você</CabecalhoSecao>
            <CampoTexto
              rotulo="Nome"
              ajuda="Opcional. Fica só neste aparelho."
              value={rascunhoNome}
              onChangeText={setRascunhoNome}
              onBlur={() => definirNome(rascunhoNome)}
              placeholder="Como quer ser chamado(a)?"
              autoCapitalize="words"
              returnKeyType="done"
            />
          </Cartao>

          <Cartao>
            <CabecalhoSecao>Aparência</CabecalhoSecao>
            <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: 8 }}>
              {OPCOES_APARENCIA.map((opcao) => {
                const ativa = opcao.valor === aparencia;
                return (
                  <Pressable
                    key={opcao.valor}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: ativa }}
                    accessibilityLabel={`Aparência: ${opcao.rotulo}`}
                    onPress={() => definirAparencia(opcao.valor)}
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
                    }}>
                    <PreviaTema valor={opcao.valor} />
                    <ThemedText type="smallBold">{opcao.rotulo}</ThemedText>
                  </Pressable>
                );
              })}
            </View>
            <ThemedText type="caption" themeColor="textSecondary">
              {descricaoAparencia}
            </ThemedText>
          </Cartao>

          <Cartao>
            <CabecalhoSecao>Lembretes</CabecalhoSecao>
            {isExpoGo ? (
              <ThemedText type="small" themeColor="textSecondary">
                Lembretes não funcionam no Expo Go. Use uma build de desenvolvimento para ativá-los.
              </ThemedText>
            ) : (
              <>
                <LinhaPermissao
                  titulo="Notificações"
                  descricao={permissoes?.notificacoes ? 'Permitidas' : 'Sem elas, nenhum lembrete aparece'}
                  ativa={!!permissoes?.notificacoes}
                  rotuloAcao="Permitir"
                  aoTocar={permitirNotificacoes}
                />
                <View style={{ height: 1, backgroundColor: theme.divider }} />
                <LinhaPermissao
                  titulo="Alarmes no horário exato"
                  descricao={
                    permissoes?.alarmeExato === null
                      ? 'Confira nas configurações do Android'
                      : 'Sem isso, lembretes podem atrasar'
                  }
                  ativa={permissoes?.alarmeExato === true}
                  rotuloAcao={permissoes?.alarmeExato === null ? 'Abrir configurações' : 'Permitir'}
                  aoTocar={abrirAlarmeExato}
                />
              </>
            )}
          </Cartao>

          <View style={{ alignItems: 'center', gap: 4, paddingTop: 4 }}>
            <ThemedText type="caption" themeColor="textSecondary" style={{ textAlign: 'center' }}>
              Seus dados ficam salvos só neste aparelho.
            </ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              Versão {Constants.expoConfig?.version ?? '—'}
            </ThemedText>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
