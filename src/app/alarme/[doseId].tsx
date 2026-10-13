import { format } from 'date-fns';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Icone } from '@/components/ui/icone';
import { Tocavel } from '@/components/ui/tocavel';
import { PALETAS_ALARME } from '@/constants/cores';
import { FAMILIA_TEXTO, FAMILIA_TITULO } from '@/constants/fontes';
import { db } from '@/db/client';
import { buscarDosePorId } from '@/db/repositories/doses';
import { identificadorDose } from '@/domain/dose-notifications/reconciliador';
import { aplicarRespostaDeNotificacao } from '@/domain/dose-notifications/resolucao-por-notificacao';
import { cancelarAlarme, exibirSobreBloqueio, ID_ALARME_TESTE, silenciarAlarme } from '@/lib/alarme-dose';
import { reconciliarNotificacoesSeDisponivel } from '@/lib/notificacoes-seguras';
import { usePreferencias } from '@/lib/preferencias';
import { buscarContextoDaDose } from '@/notifications/contexto';
import { useDadosStore } from '@/state/dados-store';

type Estado = 'tocando' | 'silenciado' | 'tomada' | 'inexistente';

interface DadosTela {
  horario: Date;
  nome: string;
  dosagem: string;
  observacoes: string | null;
}

/** "Testar alarme" do Perfil abre esta rota com o id de teste: nada é lido nem gravado no banco. */
const DADOS_TESTE: DadosTela = {
  horario: new Date(),
  nome: 'Teste do alarme',
  dosagem: 'Nenhuma dose é registrada',
  observacoes: 'Assim aparece a observação do medicamento.',
};

function carregar(doseId: string): { dados: DadosTela | null; resolvida: boolean } {
  if (doseId === ID_ALARME_TESTE) return { dados: DADOS_TESTE, resolvida: false };
  const dose = buscarDosePorId(db, doseId);
  const contexto = buscarContextoDaDose(db, doseId);
  if (!dose || !contexto) return { dados: null, resolvida: true };
  return {
    dados: {
      horario: dose.dataHoraPrevista ?? new Date(),
      nome: contexto.medicamento.nome,
      dosagem: contexto.medicamento.dosagem,
      observacoes: contexto.medicamento.observacoes,
    },
    resolvida: dose.status !== 'pendente' && dose.status !== 'aguardando',
  };
}

function fechar() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/**
 * Tela de alarme da dose especial (alarme-tela-cheia, design.md, decisão 3;
 * canvas "Alarme da dose especial (tela cheia)"). Abre pela full-screen
 * intent ou pelo aviso do alarme nativo, sobre a tela de bloqueio. Com
 * `acao=tomei` no link (ação "Tomei agora" do aviso), confirma direto.
 */
export default function AlarmeScreen() {
  const { doseId, acao } = useLocalSearchParams<{ doseId: string; acao?: string }>();
  const teste = doseId === ID_ALARME_TESTE;
  const idAlarme = teste ? ID_ALARME_TESTE : identificadorDose(doseId);
  const tema = usePreferencias((estado) => estado.alarme.tema);
  const cores = PALETAS_ALARME[tema];
  const avisarDadosMudaram = useDadosStore((estado) => estado.avisarDadosMudaram);

  const [{ dados, resolvida }] = useState(() => carregar(doseId));
  const [estado, setEstado] = useState<Estado>(!dados ? 'inexistente' : resolvida ? 'tomada' : 'tocando');
  const [tomadaEm, setTomadaEm] = useState<Date | null>(null);
  const confirmando = useRef(false);

  useEffect(() => {
    exibirSobreBloqueio(true);
    return () => {
      exibirSobreBloqueio(false);
      // O teste nunca deixa um alarme rearmado para daqui a 30 min.
      if (teste) cancelarAlarme(ID_ALARME_TESTE);
    };
  }, [teste]);

  async function tomar() {
    if (confirmando.current) return;
    confirmando.current = true;
    const agora = new Date();
    if (!teste) {
      const contexto = buscarContextoDaDose(db, doseId);
      if (contexto) {
        // O mesmo caminho idempotente das respostas de notificação: dose já resolvida não muda.
        aplicarRespostaDeNotificacao(db, contexto.esquema, contexto.medicamento.criticidade, doseId, 'tomei_agora', agora);
      }
    }
    // Só depois de gravar: para o som e cancela os reenvios.
    cancelarAlarme(idAlarme);
    setTomadaEm(agora);
    setEstado('tomada');
    if (!teste) {
      avisarDadosMudaram();
      await reconciliarNotificacoesSeDisponivel(db);
    }
  }

  function silenciar() {
    silenciarAlarme(idAlarme);
    setEstado('silenciado');
  }

  useEffect(() => {
    // Aberta para uma dose já resolvida ou removida: garante que o alarme dela pare.
    if (estado === 'tomada' || estado === 'inexistente') cancelarAlarme(idAlarme);
  }, []);

  useEffect(() => {
    // "Tomei agora" do aviso do alarme: confirma direto, uma vez.
    if (acao === 'tomei' && estado !== 'tomada' && estado !== 'inexistente') void tomar();
  }, [acao]);

  const pendente = estado === 'tocando' || estado === 'silenciado';

  return (
    <View style={{ flex: 1, backgroundColor: cores.fundo }}>
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24, gap: 20 }}>
        <View style={{ alignItems: 'center' }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: cores.borda,
            }}>
            <Icone nome="sino" cor={cores.texto} tamanho={16} />
            <ThemedText style={{ color: cores.texto, fontFamily: FAMILIA_TEXTO[700], fontSize: 13 }}>
              {teste ? 'Teste do alarme' : 'Dose especial'}
            </ThemedText>
          </View>
        </View>

        {dados ? (
          <View style={{ alignItems: 'center', gap: 18, paddingTop: 12 }}>
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={{
                width: 112,
                height: 112,
                borderRadius: 56,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: cores.disco,
                borderWidth: estado === 'tocando' ? 8 : 0,
                borderColor: cores.destaque,
              }}>
              <Icone nome="pilula" cor={cores.discoTexto} tamanho={56} />
            </View>
            <ThemedText
              numerico
              style={{ color: cores.texto, fontFamily: FAMILIA_TITULO[700], fontSize: 84, lineHeight: 92, letterSpacing: -2.5 }}>
              {format(dados.horario, 'HH:mm')}
            </ThemedText>
            <View style={{ alignItems: 'center', gap: 4 }}>
              <ThemedText style={{ color: cores.secundario, fontFamily: FAMILIA_TEXTO[500], fontSize: 16 }}>
                Hora de tomar
              </ThemedText>
              <ThemedText
                accessibilityRole="header"
                style={{
                  color: cores.texto,
                  fontFamily: FAMILIA_TITULO[700],
                  fontSize: 34,
                  lineHeight: 38,
                  letterSpacing: -0.7,
                  textAlign: 'center',
                }}>
                {dados.nome}
              </ThemedText>
              <ThemedText style={{ color: cores.secundario, fontFamily: FAMILIA_TEXTO[500], fontSize: 16 }}>
                {dados.dosagem}
              </ThemedText>
            </View>
          </View>
        ) : (
          <View style={{ flex: 1, justifyContent: 'center', gap: 8 }}>
            <ThemedText accessibilityRole="header" style={{ color: cores.texto, fontFamily: FAMILIA_TITULO[700], fontSize: 28 }}>
              Dose não encontrada
            </ThemedText>
            <ThemedText style={{ color: cores.secundario, fontSize: 16 }}>
              O medicamento desta dose foi removido. O alarme foi desligado.
            </ThemedText>
          </View>
        )}

        {dados?.observacoes ? (
          <View accessibilityLabel="Observação" style={{ borderRadius: 20, padding: 16, gap: 6, backgroundColor: cores.cartao }}>
            <ThemedText
              style={{ color: cores.secundario, fontFamily: FAMILIA_TEXTO[700], fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' }}>
              Observação
            </ThemedText>
            <ThemedText style={{ color: cores.texto, fontSize: 16, lineHeight: 23 }}>{dados.observacoes}</ThemedText>
          </View>
        ) : null}

        <View style={{ flex: 1 }} />

        {pendente ? (
          <View style={{ gap: 8 }}>
            <Tocavel
              accessibilityRole="button"
              onPress={() => void tomar()}
              style={{
                height: 64,
                borderRadius: 20,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                backgroundColor: cores.destaque,
              }}>
              <Icone nome="check" cor={cores.onDestaque} tamanho={24} />
              <ThemedText style={{ color: cores.onDestaque, fontFamily: FAMILIA_TEXTO[700], fontSize: 19 }}>Tomei agora</ThemedText>
            </Tocavel>
            <Tocavel
              accessibilityRole="button"
              accessibilityState={{ disabled: estado === 'silenciado' }}
              disabled={estado === 'silenciado'}
              onPress={silenciar}
              style={{
                height: 48,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1.5,
                borderColor: cores.borda,
                opacity: estado === 'silenciado' ? 0.6 : 1,
              }}>
              <ThemedText style={{ color: cores.texto, fontFamily: FAMILIA_TEXTO[600], fontSize: 15 }}>
                {estado === 'silenciado' ? 'Som silenciado' : 'Silenciar som'}
              </ThemedText>
            </Tocavel>
            <ThemedText style={{ color: cores.secundario, fontSize: 13, lineHeight: 18, textAlign: 'center' }}>
              {teste
                ? 'Este é só um teste: nenhuma dose será registrada.'
                : 'Se você não confirmar, o alarme toca de novo em 30 min.'}
            </ThemedText>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {estado === 'tomada' ? (
              <View
                accessibilityRole="alert"
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                  padding: 18,
                  borderRadius: 20,
                  backgroundColor: cores.destaque,
                }}>
                <Icone nome="check" cor={cores.onDestaque} tamanho={28} />
                <View style={{ flex: 1, gap: 2 }}>
                  <ThemedText style={{ color: cores.onDestaque, fontFamily: FAMILIA_TEXTO[700], fontSize: 17 }}>
                    {teste ? 'Teste concluído' : 'Dose registrada'}
                  </ThemedText>
                  <ThemedText style={{ color: cores.onDestaque, fontSize: 14 }}>
                    {teste
                      ? 'Nenhuma dose foi registrada.'
                      : tomadaEm
                        ? `Tomada às ${format(tomadaEm, 'HH:mm')}. Pode fechar.`
                        : 'Esta dose já estava resolvida.'}
                  </ThemedText>
                </View>
              </View>
            ) : null}
            <Tocavel
              accessibilityRole="button"
              onPress={fechar}
              style={{
                height: 48,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1.5,
                borderColor: cores.borda,
              }}>
              <ThemedText style={{ color: cores.texto, fontFamily: FAMILIA_TEXTO[600], fontSize: 15 }}>Fechar</ThemedText>
            </Tocavel>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}
