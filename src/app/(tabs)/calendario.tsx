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
import { CORES_STATUS_DOSE, ROTULOS_STATUS_DOSE } from '@/constants/rotulos';
import { db } from '@/db/client';
import {
  type DiaCalendario,
  type ItemDiaCalendario,
  montarCalendarioMensal,
} from '@/domain/agenda-views/calendario-mensal';

const ROTULOS_DIA_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function corDoDia(itens: ItemDiaCalendario[]): string | null {
  const historico = itens.filter((item): item is Extract<ItemDiaCalendario, { tipo: 'historico' }> => item.tipo === 'historico');
  if (historico.some((item) => item.status === 'perdida')) return CORES_STATUS_DOSE.perdida;
  if (historico.some((item) => item.status === 'pulada')) return CORES_STATUS_DOSE.pulada;
  if (historico.some((item) => item.status === 'tomada_com_atraso')) return CORES_STATUS_DOSE.tomada_com_atraso;
  if (historico.some((item) => item.status === 'tomada')) return CORES_STATUS_DOSE.tomada;
  if (itens.some((item) => item.tipo === 'previsto')) return '#3c87f7';
  if (itens.some((item) => item.tipo === 'pausa-ciclo')) return '#9ca3af';
  return null;
}

function ItemDoDia({ item }: { item: ItemDiaCalendario }) {
  if (item.tipo === 'historico') {
    return (
      <View className="flex-row items-center justify-between">
        <ThemedText type="small">{item.nome}</ThemedText>
        <ThemedText type="small" style={{ color: CORES_STATUS_DOSE[item.status] }}>
          {item.horario ? `${format(item.horario, 'HH:mm')} · ` : ''}
          {ROTULOS_STATUS_DOSE[item.status]}
        </ThemedText>
      </View>
    );
  }
  if (item.tipo === 'previsto') {
    return (
      <View className="flex-row items-center justify-between">
        <ThemedText type="small">{item.nome}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {format(item.horario, 'HH:mm')}
          {item.estimado ? ' (estimado)' : ''}
        </ThemedText>
      </View>
    );
  }
  return (
    <View className="flex-row items-center justify-between">
      <ThemedText type="small">{item.nome}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Dia de pausa
      </ThemedText>
    </View>
  );
}

export default function CalendarioMensalScreen() {
  const [mesReferencia, setMesReferencia] = useState(() => startOfMonth(new Date()));
  const [diaSelecionado, setDiaSelecionado] = useState(() => new Date());
  const [dias, setDias] = useState<DiaCalendario[]>([]);

  const recarregar = useCallback(() => {
    setDias(montarCalendarioMensal(db, mesReferencia, new Date()));
  }, [mesReferencia]);

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

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerClassName="gap-4 p-4" contentInsetAdjustmentBehavior="automatic">
          <View className="flex-row items-center justify-between">
            <Pressable onPress={() => setMesReferencia((m) => subMonths(m, 1))} className="px-3 py-2">
              <ThemedText type="link">◀</ThemedText>
            </Pressable>
            <ThemedText type="smallBold" style={{ textTransform: 'capitalize' }}>
              {format(mesReferencia, 'MMMM yyyy', { locale: ptBR })}
            </ThemedText>
            <Pressable onPress={() => setMesReferencia((m) => addMonths(m, 1))} className="px-3 py-2">
              <ThemedText type="link">▶</ThemedText>
            </Pressable>
          </View>

          <View className="flex-row">
            {ROTULOS_DIA_SEMANA.map((rotulo, indice) => (
              <View key={indice} className="flex-1 items-center">
                <ThemedText type="small" themeColor="textSecondary">
                  {rotulo}
                </ThemedText>
              </View>
            ))}
          </View>

          <View className="gap-2">
            {semanas.map((semana, indiceSemana) => (
              <View key={indiceSemana} className="flex-row">
                {semana.map((dia) => {
                  const doMes = isSameMonth(dia, mesReferencia);
                  const diaCalendario = dias.find((d) => isSameDay(d.dia, dia));
                  const cor = doMes ? corDoDia(diaCalendario?.itens ?? []) : null;
                  const selecionado = isSameDay(dia, diaSelecionado);

                  return (
                    <Pressable key={dia.toISOString()} onPress={() => setDiaSelecionado(dia)} className="flex-1 items-center py-1">
                      <ThemedView
                        type={selecionado ? 'backgroundSelected' : undefined}
                        className="items-center justify-center rounded-full"
                        style={{ width: 32, height: 32 }}>
                        <ThemedText type="small" themeColor={doMes ? 'text' : 'textSecondary'}>
                          {dia.getDate()}
                        </ThemedText>
                      </ThemedView>
                      <View style={{ width: 6, height: 6, borderRadius: 3, marginTop: 2, backgroundColor: cor ?? 'transparent' }} />
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>

          <ThemedView type="backgroundElement" className="gap-3 rounded-xl p-4">
            <ThemedText type="smallBold" style={{ textTransform: 'capitalize' }}>
              {format(diaSelecionado, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </ThemedText>
            {!diaCalendarioSelecionado || diaCalendarioSelecionado.itens.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                Nada registrado ou previsto para este dia.
              </ThemedText>
            ) : (
              diaCalendarioSelecionado.itens.map((item, indice) => <ItemDoDia key={indice} item={item} />)
            )}
          </ThemedView>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
