import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CORES_STATUS_DOSE, ROTULOS_STATUS_DOSE } from '@/constants/rotulos';
import { db } from '@/db/client';
import { buscarEsquemaPorId, paraEsquemaDominio } from '@/db/repositories/esquemas';
import {
  type ItemAgenda,
  type ItemAgendaDose,
  type ItemAgendaSeNecessario,
  montarAgendaDoDia,
} from '@/domain/agenda-views/agenda-diaria';
import { confirmarDose, pularDose } from '@/domain/adherence-history/resolucao';
import { registrarDoseSeNecessarioNoBanco } from '@/domain/adherence-history/se-necessario';
import type { EsquemaSeNecessario } from '@/domain/dose-scheduling/types';
import { reconciliarNotificacoesSeDisponivel } from '@/lib/notificacoes-seguras';

function esquemaDominioOuFalha(esquemaId: string) {
  const linha = buscarEsquemaPorId(db, esquemaId);
  if (!linha) {
    throw new Error(`Esquema ${esquemaId} não encontrado`);
  }
  return paraEsquemaDominio(linha);
}

function ItemDose({ item, aoMudar }: { item: ItemAgendaDose; aoMudar: () => void }) {
  const resolvida = item.status !== 'pendente' && item.status !== 'aguardando';

  async function tomarAgora() {
    confirmarDose(db, esquemaDominioOuFalha(item.esquemaId), item.doseId, new Date());
    await reconciliarNotificacoesSeDisponivel(db);
    aoMudar();
  }

  async function naoTomar() {
    pularDose(db, esquemaDominioOuFalha(item.esquemaId), item.doseId, new Date());
    await reconciliarNotificacoesSeDisponivel(db);
    aoMudar();
  }

  return (
    <ThemedView type="backgroundElement" className="gap-2 rounded-xl p-4">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 gap-1">
          <ThemedText type="smallBold">{item.nome}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {item.dosagem}
            {item.horario ? ` · ${format(item.horario, 'HH:mm')}` : ''}
          </ThemedText>
          {item.posicaoCiclo ? (
            <ThemedText type="small" themeColor="textSecondary">
              dia {item.posicaoCiclo.dia} de {item.posicaoCiclo.totalDiasAtivos}
            </ThemedText>
          ) : null}
        </View>
        <View className="items-end gap-1">
          <ThemedText type="small" style={{ color: CORES_STATUS_DOSE[item.status] }}>
            {ROTULOS_STATUS_DOSE[item.status]}
          </ThemedText>
          {item.alertaEstoque ? (
            <ThemedText type="small" style={{ color: '#dc2626' }}>
              Estoque baixo
            </ThemedText>
          ) : null}
        </View>
      </View>

      {!resolvida ? (
        <View className="flex-row gap-2">
          <Pressable onPress={tomarAgora} className="flex-1 items-center rounded-lg bg-blue-600 px-3 py-2">
            <ThemedText type="small" style={{ color: '#ffffff' }}>
              Tomei agora
            </ThemedText>
          </Pressable>
          <Pressable onPress={naoTomar} className="flex-1 items-center rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700">
            <ThemedText type="small">Não tomar</ThemedText>
          </Pressable>
        </View>
      ) : null}
    </ThemedView>
  );
}

function ItemSeNecessario({ item, aoMudar }: { item: ItemAgendaSeNecessario; aoMudar: () => void }) {
  function registrar() {
    const esquema = esquemaDominioOuFalha(item.esquemaId) as EsquemaSeNecessario;
    registrarDoseSeNecessarioNoBanco(db, esquema, new Date());
    aoMudar();
  }

  return (
    <ThemedView type="backgroundElement" className="gap-2 rounded-xl p-4">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 gap-1">
          <ThemedText type="smallBold">{item.nome}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {item.dosagem} · se necessário
          </ThemedText>
        </View>
        <View className="items-end gap-1">
          <ThemedText type="small" themeColor="textSecondary">
            {item.registradasHoje} de {item.limiteDiario}
          </ThemedText>
          {item.alertaEstoque ? (
            <ThemedText type="small" style={{ color: '#dc2626' }}>
              Estoque baixo
            </ThemedText>
          ) : null}
        </View>
      </View>

      <Pressable onPress={registrar} className="items-center rounded-lg bg-blue-600 px-3 py-2">
        <ThemedText type="small" style={{ color: '#ffffff' }}>
          Registrar dose
        </ThemedText>
      </Pressable>
    </ThemedView>
  );
}

export default function AgendaDoDiaScreen() {
  const [itens, setItens] = useState<ItemAgenda[]>([]);
  const [hoje, setHoje] = useState(new Date());

  const recarregar = useCallback(() => {
    const agora = new Date();
    setHoje(agora);
    setItens(montarAgendaDoDia(db, agora));
  }, []);

  useFocusEffect(recarregar);

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerClassName="gap-3 p-4" contentInsetAdjustmentBehavior="automatic">
          <View className="flex-row items-center justify-between">
            <View className="gap-1">
              <ThemedText type="title" style={{ fontSize: 28, lineHeight: 34 }}>
                Agenda
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {format(hoje, "EEEE, d 'de' MMMM", { locale: ptBR })}
              </ThemedText>
            </View>
            <Pressable
              onPress={() => router.push('/medicamento/novo')}
              className="items-center justify-center rounded-full bg-blue-600 px-4 py-2">
              <ThemedText type="smallBold" style={{ color: '#ffffff' }}>
                + Novo
              </ThemedText>
            </Pressable>
          </View>

          {itens.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              Nada por aqui hoje.
            </ThemedText>
          ) : (
            itens.map((item) =>
              item.tipo === 'dose' ? (
                <ItemDose key={item.doseId} item={item} aoMudar={recarregar} />
              ) : (
                <ItemSeNecessario key={item.esquemaId} item={item} aoMudar={recarregar} />
              ),
            )
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
