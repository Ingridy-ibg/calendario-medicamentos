import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SeloEstoque } from '@/components/medicamento/selo-estoque';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Botao } from '@/components/ui/botao';
import { CabecalhoSecao } from '@/components/ui/cabecalho-secao';
import { Cartao } from '@/components/ui/cartao';
import { Icone } from '@/components/ui/icone';
import { Tocavel } from '@/components/ui/tocavel';
import { FAMILIA_TEXTO, FAMILIA_TITULO } from '@/constants/fontes';
import { TOKEN_STATUS_DOSE } from '@/constants/rotulos';
import { db } from '@/db/client';
import { buscarProximaDoseAtiva } from '@/db/repositories/doses';
import { listarEsquemasPorMedicamento, paraEsquemaDominio } from '@/db/repositories/esquemas';
import { buscarMedicamentoPorId } from '@/db/repositories/medicamentos';
import type { Esquema } from '@/domain/dose-scheduling/types';
import {
  type AdesaoDias,
  adesaoUltimosDias,
  definirNotificacoesAtivas,
  descreverEsquema,
  type PrevisaoEstoque,
  preverFimDoEstoque,
  situacaoCiclo,
  textoSituacaoCiclo,
} from '@/domain/medication-management/gestao';
import { removerMedicamentoComHistorico } from '@/domain/medication-registration/registration';
import { type AlertaEstoque, alertaForte, textoAlertaEstoque } from '@/domain/medication-stock/alerta';
import { paraCaixas, textoEstoque } from '@/domain/medication-stock/caixas';
import { alertaEstoqueDoMedicamento } from '@/domain/medication-stock/situacao';
import { useTheme } from '@/hooks/use-theme';
import { reconciliarNotificacoesSeDisponivel } from '@/lib/notificacoes-seguras';

type Medicamento = NonNullable<ReturnType<typeof buscarMedicamentoPorId>>;

interface DadosDetalhe {
  medicamento: Medicamento;
  esquema: Esquema;
  adesao: AdesaoDias | null;
  previsao: PrevisaoEstoque | null;
  alerta: AlertaEstoque;
}

function carregar(id: string, agora: Date): DadosDetalhe | null {
  const medicamento = buscarMedicamentoPorId(db, id);
  const linha = listarEsquemasPorMedicamento(db, id).find((esquema) => esquema.deletedAt === null);
  if (!medicamento || medicamento.deletedAt || !linha) return null;
  const esquema = paraEsquemaDominio(linha);
  const proxima = esquema.tipo === 'INTERVALO_HORAS' ? (buscarProximaDoseAtiva(db, esquema.id)?.dataHoraPrevista ?? null) : null;
  return {
    medicamento,
    esquema,
    adesao: esquema.tipo === 'SE_NECESSARIO' ? null : adesaoUltimosDias(db, id, agora),
    previsao: preverFimDoEstoque(esquema, medicamento.quantidadeEmEstoque, agora, proxima),
    alerta: alertaEstoqueDoMedicamento(db, esquema, medicamento, agora),
  };
}

function textoPrevisao(previsao: PrevisaoEstoque | null): string | null {
  if (!previsao) return null;
  switch (previsao.tipo) {
    case 'data':
      return `Dura até ${previsao.aproximada ? '~' : ''}${format(previsao.data, "d 'de' MMMM", { locale: ptBR })}`;
    case 'acabou':
      return 'O estoque acabou';
    case 'sobra':
      return 'Dá para terminar o tratamento';
    case 'mais_de_2_anos':
      return 'Dura mais de 2 anos';
  }
}

function UltimosDias({ adesao }: { adesao: AdesaoDias }) {
  const theme = useTheme();
  return (
    <View style={{ gap: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.divider }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <ThemedText type="smallBold">Últimos 7 dias</ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">
          {adesao.total === 0 ? 'Nenhuma dose registrada' : `${adesao.tomadas} de ${adesao.total} tomadas`}
        </ThemedText>
      </View>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {adesao.dias.map(({ dia, pior }, indice) => {
          const hoje = indice === adesao.dias.length - 1;
          return (
            <View
              key={dia.toISOString()}
              style={{ flex: 1, alignItems: 'center', gap: 4 }}
              accessible
              accessibilityLabel={`${format(dia, "EEEE, d 'de' MMMM", { locale: ptBR })}: ${pior ? pior.replace(/_/g, ' ') : 'sem registro'}`}>
              <View
                style={{
                  alignSelf: 'stretch',
                  height: 28,
                  borderRadius: 8,
                  backgroundColor: pior ? theme[TOKEN_STATUS_DOSE[pior]] : theme.surfaceMuted,
                }}
              />
              <ThemedText
                type="caption"
                themeColor={hoje ? 'text' : 'textSecondary'}
                style={{ fontSize: 11, fontFamily: hoje ? FAMILIA_TEXTO[700] : FAMILIA_TEXTO[500] }}>
                {hoje ? 'hoje' : format(dia, 'EEEEEE', { locale: ptBR }).toLowerCase()}
              </ThemedText>
            </View>
          );
        })}
      </View>
      <Tocavel accessibilityRole="link" onPress={() => router.push('/calendario')} style={{ alignSelf: 'flex-start', paddingVertical: 8 }}>
        <ThemedText type="smallBold" themeColor="accent">
          Ver no calendário
        </ThemedText>
      </Tocavel>
    </View>
  );
}

/** Detalhe do medicamento (specs/medication-management): compra, notificações, editar e remover. */
export default function DetalheMedicamentoScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [dados, setDados] = useState<DadosDetalhe | null>(null);

  const recarregar = useCallback(() => {
    const novos = carregar(id, new Date());
    if (!novos) {
      router.back();
      return;
    }
    setDados(novos);
  }, [id]);

  useFocusEffect(recarregar);

  if (!dados) return <ThemedView style={{ flex: 1 }} />;
  const { medicamento, esquema, adesao, previsao, alerta } = dados;
  const descricao = descreverEsquema(esquema);
  const ciclico = esquema.tipo === 'CICLICO';
  // A sobra é só um aviso discreto abaixo da barra; o selo fica para os alertas.
  const alertaSelo = alerta?.tipo === 'sobra' ? null : alerta;
  const estoqueBaixo = alertaForte(alerta);
  const { emUso } = paraCaixas(medicamento.quantidadeEmEstoque, medicamento.quantidadePorEmbalagem);
  const fracaoEmbalagem = Math.min(1, emUso / Math.max(1, medicamento.quantidadePorEmbalagem));

  async function alternarNotificacoes(ativas: boolean) {
    definirNotificacoesAtivas(db, medicamento.id, ativas);
    await reconciliarNotificacoesSeDisponivel(db);
    recarregar();
  }

  function confirmarRemocao() {
    Alert.alert(
      `Remover ${medicamento.nome}?`,
      'Os lembretes e as doses futuras serão cancelados. O histórico de doses já registradas é mantido.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            removerMedicamentoComHistorico(db, medicamento.id, new Date());
            await reconciliarNotificacoesSeDisponivel(db);
            router.back();
          },
        },
      ],
    );
  }

  const botaoTopo = { height: 44, borderRadius: 14, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: theme.surface };

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ gap: 14, padding: 20, paddingBottom: 40 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Tocavel accessibilityRole="button" accessibilityLabel="Voltar" onPress={() => router.back()} style={{ ...botaoTopo, width: 44 }}>
              <Icone nome="voltar" cor={theme.text} tamanho={22} />
            </Tocavel>
            <Tocavel
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/medicamento/[id]/editar', params: { id: medicamento.id } })}
              style={{ ...botaoTopo, flexDirection: 'row', gap: 8, paddingHorizontal: 16 }}>
              <Icone nome="editar" cor={theme.text} tamanho={18} />
              <ThemedText type="smallBold">Editar</ThemedText>
            </Tocavel>
          </View>

          <View style={{ gap: 8, paddingHorizontal: 2, paddingTop: 6 }}>
            <ThemedText type="display" accessibilityRole="header" style={{ fontSize: 36, lineHeight: 40 }}>
              {medicamento.nome}
            </ThemedText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <ThemedText themeColor="textSecondary">{medicamento.dosagem}</ThemedText>
              <View style={{ borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: theme.surfaceMuted }}>
                <ThemedText type="caption" themeColor="textSecondary" style={{ fontFamily: FAMILIA_TEXTO[600] }}>
                  Prioridade {medicamento.criticidade === 'especial' ? 'especial' : 'comum'}
                </ThemedText>
              </View>
            </View>
          </View>

          <Cartao>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: theme.accentSoft,
                }}>
                <Icone nome="relogio" cor={theme.onAccentSoft} tamanho={20} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <ThemedText style={{ fontFamily: FAMILIA_TEXTO[700] }}>{descricao.titulo}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {esquema.tipo === 'CICLICO' ? `${textoSituacaoCiclo(situacaoCiclo(esquema, new Date()))} · ` : ''}
                  {descricao.subtitulo}
                </ThemedText>
              </View>
            </View>
            {adesao ? <UltimosDias adesao={adesao} /> : null}
          </Cartao>

          <Cartao>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <View style={{ flex: 1, gap: 2 }}>
                <CabecalhoSecao>Estoque</CabecalhoSecao>
                <ThemedText style={{ fontFamily: FAMILIA_TITULO[700], fontSize: 26, lineHeight: 32 }}>
                  {textoEstoque(medicamento.quantidadeEmEstoque, medicamento.quantidadePorEmbalagem, ciclico)}
                </ThemedText>
                <ThemedText type="caption" themeColor="textSecondary" numerico>
                  {medicamento.quantidadeEmEstoque} {medicamento.quantidadeEmEstoque === 1 ? 'unidade' : 'unidades'} no total
                </ThemedText>
              </View>
              <SeloEstoque alerta={alertaSelo} />
            </View>
            <View style={{ gap: 6 }}>
              <View style={{ height: 8, borderRadius: 4, backgroundColor: theme.surfaceMuted, overflow: 'hidden' }}>
                <View
                  style={{
                    width: `${fracaoEmbalagem * 100}%`,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: estoqueBaixo ? theme.statusPerdida : theme.accent,
                  }}
                />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                <ThemedText type="caption" themeColor="textSecondary">
                  {textoPrevisao(previsao) ?? ''}
                </ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  {ciclico ? 'Cartela' : 'Caixa'} com {medicamento.quantidadePorEmbalagem}
                </ThemedText>
              </View>
              {alerta?.tipo === 'sobra' ? (
                <ThemedText type="caption" themeColor="textSecondary">
                  {textoAlertaEstoque(alerta)}
                </ThemedText>
              ) : null}
            </View>
            <Botao
              rotulo="Registrar compra"
              icone="mais"
              tamanho="grande"
              onPress={() => router.push({ pathname: '/medicamento/[id]/compra', params: { id: medicamento.id } })}
            />
          </Cartao>

          {esquema.tipo !== 'SE_NECESSARIO' ? (
            <Cartao>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
                <ThemedText style={{ fontFamily: FAMILIA_TEXTO[700] }}>Notificações</ThemedText>
                <Switch
                  accessibilityLabel="Notificações deste medicamento"
                  value={medicamento.notificacoesAtivas}
                  onValueChange={alternarNotificacoes}
                  trackColor={{ true: theme.accent, false: theme.border }}
                  thumbColor={theme.surface}
                />
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                {medicamento.notificacoesAtivas
                  ? 'Lembretes no horário de cada dose, repetidos se você não responder.'
                  : 'Silenciado. As doses continuam na agenda para você marcar, mas nenhum lembrete será enviado.'}
              </ThemedText>
            </Cartao>
          ) : null}

          <View style={{ alignItems: 'center', gap: 4, paddingTop: 10 }}>
            <Botao rotulo="Remover medicamento" variante="perigo" icone="lixeira" onPress={confirmarRemocao} />
            <ThemedText type="caption" themeColor="textSecondary">
              O histórico de doses é mantido.
            </ThemedText>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
