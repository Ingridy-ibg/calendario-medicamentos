import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Cartao } from '@/components/ui/cartao';
import { Icone } from '@/components/ui/icone';
import { FAMILIA_TEXTO, FAMILIA_TITULO } from '@/constants/fontes';
import { ROTULOS_STATUS_DOSE, TOKEN_STATUS_DOSE } from '@/constants/rotulos';
import type { ThemeColor } from '@/constants/theme';
import { db } from '@/db/client';
import { marcarPerdidasPorTempo } from '@/domain/adherence-history/perdidas';
import { type DiaCalendario, type ItemDiaCalendario, montarCalendarioMensal } from '@/domain/agenda-views/calendario-mensal';
import { type MarcadorDia, marcadorDoDia } from '@/domain/agenda-views/marcador-dia';
import { useTheme } from '@/hooks/use-theme';
import { Tocavel } from '@/components/ui/tocavel';
import { useDadosStore } from '@/state/dados-store';

const ROTULOS_DIA_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

const LEGENDA: { rotulo: string; marcador: MarcadorDia }[] = [
  { rotulo: 'Tomadas', marcador: { token: 'statusTomada', estilo: 'cheio' } },
  { rotulo: 'Com atraso', marcador: { token: 'statusAtraso', estilo: 'cheio' } },
  { rotulo: 'Pulada', marcador: { token: 'statusNeutro', estilo: 'cheio' } },
  { rotulo: 'Perdida', marcador: { token: 'statusPerdida', estilo: 'cheio' } },
  { rotulo: 'Atrasada', marcador: { token: 'statusAtraso', estilo: 'contorno' } },
  { rotulo: 'Prevista', marcador: { token: 'accent', estilo: 'contorno' } },
];

function capitalizar(texto: string) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function Ponto({ marcador, tamanho = 6 }: { marcador: MarcadorDia | null; tamanho?: number }) {
  const theme = useTheme();
  const cor = marcador ? theme[marcador.token] : 'transparent';
  return (
    <View
      style={{
        width: tamanho,
        height: tamanho,
        borderRadius: tamanho / 2,
        backgroundColor: marcador?.estilo === 'cheio' ? cor : 'transparent',
        borderWidth: marcador?.estilo === 'contorno' ? 1.5 : 0,
        borderColor: cor,
      }}
    />
  );
}

function descreverItem(item: ItemDiaCalendario): { detalhe: string; status: string; token: ThemeColor; marcador: MarcadorDia } {
  if (item.tipo === 'historico' && item.atrasada) {
    return {
      detalhe: item.horario ? format(item.horario, 'HH:mm') : 'Sem horário',
      status: 'Atrasada',
      token: 'statusAtraso',
      marcador: { token: 'statusAtraso', estilo: 'contorno' },
    };
  }
  if (item.tipo === 'historico') {
    return {
      detalhe: item.horario ? format(item.horario, 'HH:mm') : 'Sem horário',
      status: ROTULOS_STATUS_DOSE[item.status],
      token: TOKEN_STATUS_DOSE[item.status],
      marcador:
        item.status === 'pendente' || item.status === 'aguardando'
          ? { token: 'accent', estilo: 'contorno' }
          : { token: TOKEN_STATUS_DOSE[item.status], estilo: 'cheio' },
    };
  }
  if (item.tipo === 'previsto') {
    return {
      detalhe: `${format(item.horario, 'HH:mm')}${item.estimado ? ' (estimado)' : ''}`,
      status: 'Prevista',
      token: 'textSecondary',
      marcador: { token: 'accent', estilo: 'contorno' },
    };
  }
  return { detalhe: 'Cartela em pausa', status: 'Dia de pausa', token: 'textSecondary', marcador: { token: 'statusNeutro', estilo: 'contorno' } };
}

function ItemDoDia({ item }: { item: ItemDiaCalendario }) {
  const theme = useTheme();
  const { detalhe, status, token, marcador } = descreverItem(item);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Ponto marcador={marcador} tamanho={10} />
      <View style={{ flex: 1 }}>
        <ThemedText style={{ fontFamily: FAMILIA_TEXTO[600], fontSize: 15, lineHeight: 20 }}>{item.nome}</ThemedText>
        <ThemedText type="caption" themeColor="textSecondary" numerico>
          {detalhe}
        </ThemedText>
      </View>
      <ThemedText type="smallBold" style={{ color: theme[token] }}>
        {status}
      </ThemedText>
    </View>
  );
}

export default function CalendarioMensalScreen() {
  const theme = useTheme();
  const [mesReferencia, setMesReferencia] = useState(() => startOfMonth(new Date()));
  const [diaSelecionado, setDiaSelecionado] = useState(() => new Date());
  const [hoje, setHoje] = useState(() => new Date());
  const [dias, setDias] = useState<DiaCalendario[]>([]);
  // Resposta de notificação aplicada com a tela aberta (fix-permissoes-e-respostas).
  const versaoDados = useDadosStore((estado) => estado.versaoDados);

  const recarregar = useCallback(() => {
    const agora = new Date();
    marcarPerdidasPorTempo(db, agora);
    setHoje(agora);
    setDias(montarCalendarioMensal(db, mesReferencia, agora));
  }, [mesReferencia, versaoDados]);

  useFocusEffect(recarregar);

  const semanas = useMemo(() => {
    const inicioGrade = startOfWeek(mesReferencia);
    const fimGrade = endOfWeek(endOfMonth(mesReferencia));
    const todosOsDias = eachDayOfInterval({ start: inicioGrade, end: fimGrade });
    const grade: Date[][] = [];
    for (let i = 0; i < todosOsDias.length; i += 7) {
      grade.push(todosOsDias.slice(i, i + 7));
    }
    return grade;
  }, [mesReferencia]);

  const diaCalendarioSelecionado = dias.find((d) => isSameDay(d.dia, diaSelecionado));
  const tituloDia = capitalizar(
    `${isSameDay(diaSelecionado, hoje) ? 'hoje, ' : ''}${format(diaSelecionado, "EEEE, d 'de' MMMM", { locale: ptBR })}`,
  );

  const botaoMes = (rotulo: string, icone: 'voltar' | 'avancar', aoTocar: () => void) => (
    <Tocavel
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      onPress={aoTocar}
      style={{
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.surface,
      }}>
      <Icone nome={icone} cor={theme.text} tamanho={22} />
    </Tocavel>
  );

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={{ gap: 16, padding: 20, paddingBottom: 32 }} contentInsetAdjustmentBehavior="automatic">
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <ThemedText type="display" accessibilityRole="header" style={{ flex: 1 }}>
              {capitalizar(format(mesReferencia, 'MMMM', { locale: ptBR }))}{' '}
              <ThemedText type="display" themeColor="textSecondary" style={{ fontFamily: FAMILIA_TITULO[500] }}>
                {format(mesReferencia, 'yyyy')}
              </ThemedText>
            </ThemedText>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {botaoMes('Mês anterior', 'voltar', () => setMesReferencia((m) => subMonths(m, 1)))}
              {botaoMes('Próximo mês', 'avancar', () => setMesReferencia((m) => addMonths(m, 1)))}
            </View>
          </View>

          <Cartao style={{ paddingHorizontal: 10, paddingVertical: 14, gap: 6 }}>
            <View style={{ flexDirection: 'row', paddingBottom: 4 }}>
              {ROTULOS_DIA_SEMANA.map((rotulo, indice) => (
                <View key={indice} style={{ flex: 1, alignItems: 'center' }}>
                  <ThemedText type="caption" themeColor="textSecondary" style={{ fontFamily: FAMILIA_TEXTO[700] }}>
                    {rotulo}
                  </ThemedText>
                </View>
              ))}
            </View>

            {semanas.map((semana, indiceSemana) => (
              <View key={indiceSemana} style={{ flexDirection: 'row' }}>
                {semana.map((dia) => {
                  const doMes = isSameMonth(dia, mesReferencia);
                  const diaCalendario = dias.find((d) => isSameDay(d.dia, dia));
                  const marcador = doMes ? marcadorDoDia(diaCalendario?.itens ?? []) : null;
                  const selecionado = isSameDay(dia, diaSelecionado);
                  const ehHoje = isSameDay(dia, hoje);

                  return (
                    <Pressable
                      key={dia.toISOString()}
                      accessibilityRole="button"
                      accessibilityLabel={format(dia, "d 'de' MMMM", { locale: ptBR }) + (ehHoje ? ', hoje' : '')}
                      accessibilityState={{ selected: selecionado }}
                      onPress={() => setDiaSelecionado(dia)}
                      style={{ flex: 1, alignItems: 'center', paddingVertical: 4, gap: 3, minHeight: 50 }}>
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: selecionado ? theme.inverseSurface : 'transparent',
                          borderWidth: ehHoje && !selecionado ? 2 : 0,
                          borderColor: theme.accent,
                        }}>
                        <ThemedText
                          numerico
                          style={{
                            fontSize: 15,
                            fontFamily: selecionado || ehHoje ? FAMILIA_TEXTO[700] : FAMILIA_TEXTO[500],
                            color: selecionado
                              ? theme.onInverse
                              : ehHoje
                                ? theme.accent
                                : doMes
                                  ? theme.text
                                  : theme.textSecondary,
                          }}>
                          {dia.getDate()}
                        </ThemedText>
                      </View>
                      <Ponto marcador={marcador} />
                    </Pressable>
                  );
                })}
              </View>
            ))}

            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'center',
                columnGap: 14,
                rowGap: 6,
                paddingTop: 8,
                borderTopWidth: 1,
                borderTopColor: theme.divider,
              }}>
              {LEGENDA.map(({ rotulo, marcador }) => (
                <View key={rotulo} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Ponto marcador={marcador} tamanho={8} />
                  <ThemedText type="caption" themeColor="textSecondary">
                    {rotulo}
                  </ThemedText>
                </View>
              ))}
            </View>
          </Cartao>

          <Cartao accessibilityLiveRegion="polite">
            <ThemedText style={{ fontFamily: FAMILIA_TEXTO[700] }}>{tituloDia}</ThemedText>
            {!diaCalendarioSelecionado || diaCalendarioSelecionado.itens.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                Nada registrado ou previsto para este dia.
              </ThemedText>
            ) : (
              diaCalendarioSelecionado.itens.map((item, indice) => <ItemDoDia key={indice} item={item} />)
            )}
          </Cartao>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
