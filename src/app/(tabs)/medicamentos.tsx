import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { FlatList, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SeloEstoque } from '@/components/medicamento/selo-estoque';
import { Selo } from '@/components/medicamento/selo';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Botao } from '@/components/ui/botao';
import { Cartao } from '@/components/ui/cartao';
import { Icone } from '@/components/ui/icone';
import { Segmentado } from '@/components/ui/segmentado';
import { Tocavel } from '@/components/ui/tocavel';
import { FAMILIA_TEXTO } from '@/constants/fontes';
import { db } from '@/db/client';
import { paraEsquemaDominio } from '@/db/repositories/esquemas';
import { contarMedicamentos, listarMedicamentosComEsquema } from '@/db/repositories/medicamentos';
import { resumirEsquema, situacaoCiclo, textoSituacaoCiclo } from '@/domain/medication-management/gestao';
import { type FiltroAgenda, naAgendaDoFiltro, TAMANHO_PAGINA, totalDoFiltro } from '@/domain/medication-management/lista';
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
  naAgenda: boolean;
}

const OPCOES_FILTRO = [
  { valor: 'todos', rotulo: 'Todos' },
  { valor: 'na_agenda', rotulo: 'Na agenda' },
  { valor: 'fora_da_agenda', rotulo: 'Fora da agenda' },
] as const;

/** Busca e monta só uma página — resumo, situação e alerta de estoque saem apenas dos itens dela. */
function montarPagina(filtro: FiltroAgenda, deslocamento: number, limite: number, agora: Date): ItemLista[] {
  const pagina = listarMedicamentosComEsquema(db, { naAgenda: naAgendaDoFiltro(filtro), limite, deslocamento });
  return pagina.map(({ medicamento, esquema }) => {
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
      // Fora da agenda não tem lembretes, então "silenciado" também não se aplica.
      silenciado: !medicamento.notificacoesAtivas && dominio.tipo !== 'SE_NECESSARIO' && medicamento.naAgenda,
      naAgenda: medicamento.naAgenda,
    };
  });
}

function LinhaMedicamento({ item, primeiro, ultimo }: { item: ItemLista; primeiro: boolean; ultimo: boolean }) {
  const theme = useTheme();
  return (
    <Tocavel
      accessibilityRole="button"
      accessibilityLabel={`${item.nome}, ${item.dosagem}. ${item.resumo}. Estoque: ${item.estoque}${item.alerta ? `, ${textoAlertaEstoque(item.alerta)}` : ''}${item.silenciado ? ', notificações silenciadas' : ''}${item.naAgenda ? '' : ', fora da agenda'}`}
      onPress={() => router.push({ pathname: '/medicamento/[id]', params: { id: item.id } })}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        padding: 16,
        minHeight: 72,
        borderBottomWidth: ultimo ? 0 : 1,
        borderBottomColor: theme.divider,
        // A lista paginada é um cartão contínuo: só a primeira e a última linha arredondam.
        backgroundColor: theme.surface,
        borderTopLeftRadius: primeiro ? 22 : 0,
        borderTopRightRadius: primeiro ? 22 : 0,
        borderBottomLeftRadius: ultimo ? 22 : 0,
        borderBottomRightRadius: ultimo ? 22 : 0,
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
        {item.silenciado ? (
          <View style={{ marginTop: 4 }}>
            <Selo texto="Silenciado" icone="sinoDesligado" compacto />
          </View>
        ) : null}
        {!item.naAgenda ? (
          <View style={{ marginTop: 4 }}>
            <Selo texto="Fora da agenda" icone="calendario" compacto />
          </View>
        ) : null}
      </View>
    </Tocavel>
  );
}

/**
 * Aba Medicamentos (specs/medication-management): todos os medicamentos
 * cadastrados, com filtro na agenda / fora da agenda e paginação de 20 em 20
 * (agenda-membership, decisão 5).
 */
export default function MedicamentosScreen() {
  const theme = useTheme();
  const [itens, setItens] = useState<ItemLista[]>([]);
  const [contagem, setContagem] = useState({ total: 0, naAgenda: 0 });
  const [filtro, setFiltro] = useState<FiltroAgenda>('todos');
  const [filtroAberto, setFiltroAberto] = useState(false);

  // Quantos itens já foram pedidos, atualizado na hora: dois `onEndReached` antes
  // do re-render não pedem a mesma página (fix-agenda-membership-review-2, decisão 4).
  const pedidos = useRef(0);
  const filtroCarregado = useRef<FiltroAgenda | null>(null);

  // No foco, recarrega tudo o que já estava carregado (volta do detalhe sem
  // perder a posição); na troca de filtro, recomeça da primeira página.
  useFocusEffect(
    useCallback(() => {
      const limite = filtroCarregado.current === filtro ? Math.max(pedidos.current, TAMANHO_PAGINA) : TAMANHO_PAGINA;
      const carregados = montarPagina(filtro, 0, limite, new Date());
      filtroCarregado.current = filtro;
      pedidos.current = carregados.length;
      setContagem(contarMedicamentos(db));
      setItens(carregados);
    }, [filtro]),
  );

  const filtroAplicado = filtro !== 'todos';

  function carregarMais() {
    const deslocamento = pedidos.current;
    if (deslocamento >= totalDoFiltro(contagem, filtro)) return;
    pedidos.current = deslocamento + TAMANHO_PAGINA;
    const proxima = montarPagina(filtro, deslocamento, TAMANHO_PAGINA, new Date());
    if (proxima.length > 0) setItens((atuais) => [...atuais, ...proxima]);
  }

  const cabecalho = (
    <View style={{ gap: 14, paddingBottom: 18 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <ThemedText type="small" themeColor="textSecondary">
            {contagem.naAgenda === 1 ? '1 na agenda' : `${contagem.naAgenda} na agenda`}
          </ThemedText>
          <ThemedText type="display" accessibilityRole="header" numberOfLines={1}>
            Medicamentos
          </ThemedText>
        </View>
        {contagem.total > 0 ? (
          <Tocavel
            accessibilityRole="button"
            accessibilityLabel={filtroAplicado ? 'Filtro aplicado. Mostrar opções de filtro' : 'Mostrar opções de filtro'}
            accessibilityState={{ expanded: filtroAberto }}
            onPress={() => setFiltroAberto((aberto) => !aberto)}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: filtroAplicado ? theme.accentSoft : theme.surface,
            }}>
            <Icone nome="filtro" cor={filtroAplicado ? theme.onAccentSoft : theme.text} tamanho={20} />
            {filtroAplicado ? (
              <View style={{ position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: theme.accent }} />
            ) : null}
          </Tocavel>
        ) : null}
        <Botao
          rotulo="Novo"
          icone="mais"
          onPress={() => router.push('/medicamento/novo')}
          style={{ borderRadius: 999, paddingLeft: 14, paddingRight: 18 }}
        />
      </View>
      {filtroAberto ? <Segmentado opcoes={OPCOES_FILTRO} selecionado={filtro} onSelecionar={setFiltro} /> : null}
    </View>
  );

  const vazio =
    contagem.total === 0 ? (
      <Cartao style={{ alignItems: 'center', paddingVertical: 32, gap: 14 }}>
        <Icone nome="pilula" cor={theme.textSecondary} tamanho={32} />
        <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
          Você ainda não cadastrou nenhum medicamento.
        </ThemedText>
        <Botao rotulo="Cadastrar o primeiro" variante="suave" onPress={() => router.push('/medicamento/novo')} />
      </Cartao>
    ) : (
      <Cartao style={{ alignItems: 'center', paddingVertical: 24 }}>
        <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
          {filtro === 'na_agenda' ? 'Nenhum medicamento na agenda.' : 'Nenhum medicamento fora da agenda.'}
        </ThemedText>
      </Cartao>
    );

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <FlatList
          data={itens}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => <LinhaMedicamento item={item} primeiro={index === 0} ultimo={index === itens.length - 1} />}
          ListHeaderComponent={cabecalho}
          ListEmptyComponent={vazio}
          onEndReached={carregarMais}
          onEndReachedThreshold={0.5}
          contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
          contentInsetAdjustmentBehavior="automatic"
        />
      </SafeAreaView>
    </ThemedView>
  );
}
