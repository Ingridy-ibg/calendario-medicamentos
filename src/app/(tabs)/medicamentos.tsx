import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SeloEstoque } from '@/components/medicamento/selo-estoque';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Botao } from '@/components/ui/botao';
import { Cartao } from '@/components/ui/cartao';
import { Icone } from '@/components/ui/icone';
import { Tocavel } from '@/components/ui/tocavel';
import { FAMILIA_TEXTO } from '@/constants/fontes';
import { db } from '@/db/client';
import { paraEsquemaDominio } from '@/db/repositories/esquemas';
import { listarMedicamentosAtivosComEsquema } from '@/db/repositories/medicamentos';
import { resumirEsquema, situacaoCiclo, textoSituacaoCiclo } from '@/domain/medication-management/gestao';
import { type AlertaEstoque, alertaForte, alertaVisivelNaLista, textoAlertaEstoque } from '@/domain/medication-stock/alerta';
import { textoEstoque } from '@/domain/medication-stock/caixas';
import { alertaEstoqueDoMedicamento } from '@/domain/medication-stock/situacao';
import { useTheme } from '@/hooks/use-theme';

interface ItemLista {
  id: string;
  nome: string;
  dosagem: string;
  resumo: string;
  situacao: string | null;
  /** "1 caixa · restam 12" etc. */
  estoque: string;
  alerta: AlertaEstoque;
  silenciado: boolean;
}

function montarLista(agora: Date): ItemLista[] {
  return listarMedicamentosAtivosComEsquema(db).map(({ medicamento, esquema }) => {
    const dominio = paraEsquemaDominio(esquema);
    return {
      id: medicamento.id,
      nome: medicamento.nome,
      dosagem: medicamento.dosagem,
      resumo: resumirEsquema(dominio),
      situacao: dominio.tipo === 'CICLICO' ? textoSituacaoCiclo(situacaoCiclo(dominio, agora)) : null,
      estoque: textoEstoque(medicamento.quantidadeEmEstoque, medicamento.quantidadePorEmbalagem, dominio.tipo === 'CICLICO'),
      alerta: alertaVisivelNaLista(alertaEstoqueDoMedicamento(db, dominio, medicamento, agora)),
      // "Se necessário" nunca tem lembrete, então "silenciado" não se aplica.
      silenciado: !medicamento.notificacoesAtivas && dominio.tipo !== 'SE_NECESSARIO',
    };
  });
}

function Selo({ texto, icone }: { texto: string; icone?: 'sinoDesligado' }) {
  const theme = useTheme();
  const cor = theme.textSecondary;
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        marginTop: 4,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 2,
        backgroundColor: theme.surfaceMuted,
      }}>
      {icone ? <Icone nome={icone} cor={cor} tamanho={12} /> : null}
      <ThemedText type="caption" style={{ color: cor, fontFamily: FAMILIA_TEXTO[600] }}>
        {texto}
      </ThemedText>
    </View>
  );
}

function LinhaMedicamento({ item, ultimo }: { item: ItemLista; ultimo: boolean }) {
  const theme = useTheme();
  return (
    <Tocavel
      accessibilityRole="button"
      accessibilityLabel={`${item.nome}, ${item.dosagem}. ${item.resumo}. Estoque: ${item.estoque}${item.alerta ? `, ${textoAlertaEstoque(item.alerta)}` : ''}${item.silenciado ? ', notificações silenciadas' : ''}`}
      onPress={() => router.push({ pathname: '/medicamento/[id]', params: { id: item.id } })}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        padding: 16,
        minHeight: 72,
        borderBottomWidth: ultimo ? 0 : 1,
        borderBottomColor: theme.divider,
      }}>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.accentSoft,
        }}>
        <ThemedText style={{ color: theme.onAccentSoft, fontFamily: FAMILIA_TEXTO[700] }}>
          {item.nome.charAt(0).toLocaleUpperCase('pt-BR')}
        </ThemedText>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText style={{ fontFamily: FAMILIA_TEXTO[600] }}>
          {item.nome}
          <ThemedText themeColor="textSecondary">{` · ${item.dosagem}`}</ThemedText>
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {item.resumo}
        </ThemedText>
        {item.situacao ? (
          <ThemedText type="caption" themeColor="textSecondary">
            {item.situacao}
          </ThemedText>
        ) : null}
        <ThemedText type="caption" style={{ color: alertaForte(item.alerta) ? theme.statusPerdida : theme.textSecondary }}>
          {item.estoque}
        </ThemedText>
        {item.alerta ? (
          <View style={{ marginTop: 4 }}>
            <SeloEstoque alerta={item.alerta} />
          </View>
        ) : null}
        {item.silenciado ? <Selo texto="Silenciado" icone="sinoDesligado" /> : null}
      </View>
    </Tocavel>
  );
}

/** Aba Medicamentos (specs/medication-management): todos os medicamentos ativos, com ou sem dose hoje. */
export default function MedicamentosScreen() {
  const theme = useTheme();
  const [itens, setItens] = useState<ItemLista[]>([]);

  useFocusEffect(useCallback(() => setItens(montarLista(new Date())), []));

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={{ gap: 18, padding: 20, paddingBottom: 32 }} contentInsetAdjustmentBehavior="automatic">
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
            <View style={{ flex: 1, gap: 4 }}>
              <ThemedText type="small" themeColor="textSecondary">
                {itens.length === 1 ? '1 em uso' : `${itens.length} em uso`}
              </ThemedText>
              <ThemedText type="display" accessibilityRole="header" numberOfLines={1}>
                Medicamentos
              </ThemedText>
            </View>
            <Botao
              rotulo="Novo"
              icone="mais"
              onPress={() => router.push('/medicamento/novo')}
              style={{ borderRadius: 999, paddingLeft: 14, paddingRight: 18 }}
            />
          </View>

          {itens.length === 0 ? (
            <Cartao style={{ alignItems: 'center', paddingVertical: 32, gap: 14 }}>
              <Icone nome="pilula" cor={theme.textSecondary} tamanho={32} />
              <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
                Você ainda não cadastrou nenhum medicamento.
              </ThemedText>
              <Botao rotulo="Cadastrar o primeiro" variante="suave" onPress={() => router.push('/medicamento/novo')} />
            </Cartao>
          ) : (
            <Cartao style={{ padding: 0, gap: 0 }}>
              {itens.map((item, indice) => (
                <LinhaMedicamento key={item.id} item={item} ultimo={indice === itens.length - 1} />
              ))}
            </Cartao>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
