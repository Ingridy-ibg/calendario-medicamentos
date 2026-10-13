import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SeloEstoque } from '@/components/medicamento/selo-estoque';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Botao } from '@/components/ui/botao';
import { CabecalhoSecao } from '@/components/ui/cabecalho-secao';
import { Cartao } from '@/components/ui/cartao';
import { Icone } from '@/components/ui/icone';
import { IconeStatus } from '@/components/ui/icone-status';
import { FAMILIA_TEXTO, FAMILIA_TITULO } from '@/constants/fontes';
import { TOKEN_STATUS_DOSE } from '@/constants/rotulos';
import type { StatusDose } from '@/db/schema';
import { db } from '@/db/client';
import { buscarEsquemaPorId, paraEsquemaDominio } from '@/db/repositories/esquemas';
import {
  type ItemAgenda,
  type ItemAgendaAguardandoCartela,
  type ItemAgendaDose,
  type ItemAgendaSeNecessario,
  montarAgendaDoDia,
} from '@/domain/agenda-views/agenda-diaria';
import { agruparPorPeriodo, type ResumoDoDia, resumirDia } from '@/domain/agenda-views/resumo-dia';
import { marcarPerdidasPorTempo } from '@/domain/adherence-history/perdidas';
import { confirmarDose, pularDose } from '@/domain/adherence-history/resolucao';
import { registrarDoseSeNecessarioNoBanco } from '@/domain/adherence-history/se-necessario';
import { confirmarNovaCartelaCiclica } from '@/domain/dose-scheduling/resolucao';
import { estadoLimiteSeNecessario, exigeConfirmacaoAoRegistrar } from '@/domain/dose-scheduling/se-necessario';
import type { EsquemaCiclico, EsquemaSeNecessario } from '@/domain/dose-scheduling/types';
import { periodoDoDia, textoSaudacao } from '@/domain/daily-greeting/saudacao';
import { useTheme } from '@/hooks/use-theme';
import { reconciliarNotificacoesSeDisponivel } from '@/lib/notificacoes-seguras';
import { usePreferencias } from '@/lib/preferencias';
import { Tocavel } from '@/components/ui/tocavel';
import { useDadosStore } from '@/state/dados-store';

/** Nome/área de informação de cada item leva ao detalhe (manage-medications, 6.1). */
function abrirDetalhe(medicamentoId: string) {
  router.push({ pathname: '/medicamento/[id]', params: { id: medicamentoId } });
}

function esquemaDominioOuFalha(esquemaId: string) {
  const linha = buscarEsquemaPorId(db, esquemaId);
  if (!linha) {
    throw new Error(`Esquema ${esquemaId} não encontrado`);
  }
  return paraEsquemaDominio(linha);
}

function capitalizar(texto: string) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Rótulo curto de status na agenda (canvas "Agenda do dia"). */
const ROTULO_CURTO: Record<StatusDose, string> = {
  pendente: 'Pendente',
  aguardando: 'Aguardando',
  tomada: 'Tomada',
  tomada_com_atraso: 'Com atraso',
  pulada: 'Pulada',
  perdida: 'Perdida',
};

function ResumoCartao({ resumo }: { resumo: ResumoDoDia }) {
  const theme = useTheme();
  const corMarca = (status: StatusDose) =>
    status === 'tomada' ? theme.inverseTomada : status === 'tomada_com_atraso' ? theme.inverseAtraso : theme.inverseTrack;

  return (
    <Cartao fundo="inverseSurface" style={{ gap: 14 }} accessibilityLabel={`${resumo.tomadas} de ${resumo.total} doses tomadas hoje`}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <ThemedText numerico style={{ color: theme.onInverse, fontFamily: FAMILIA_TITULO[700], fontSize: 30, lineHeight: 36 }}>
          {resumo.tomadas}
          <ThemedText style={{ color: theme.onInverseSecondary, fontFamily: FAMILIA_TITULO[700], fontSize: 20 }}>
            {` / ${resumo.total} doses`}
          </ThemedText>
        </ThemedText>
        <ThemedText type="caption" style={{ color: theme.onInverseSecondary }}>
          hoje
        </ThemedText>
      </View>
      <View style={{ flexDirection: 'row', gap: 4 }} importantForAccessibility="no-hide-descendants">
        {resumo.marcas.map((status, indice) => (
          <View key={indice} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: corMarca(status) }} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Icone nome={resumo.proxima ? 'relogio' : 'check'} cor={theme.inverseTomada} tamanho={18} />
        <ThemedText type="small" style={{ color: theme.onInverseSecondary, flex: 1 }}>
          {resumo.proxima ? (
            <>
              Próxima:{' '}
              <ThemedText type="smallBold" style={{ color: theme.onInverse }}>
                {resumo.proxima.nome}
              </ThemedText>
              {resumo.proxima.horario ? ` às ${format(resumo.proxima.horario, 'HH:mm')}` : ''}
            </>
          ) : (
            'Todas as doses de hoje foram concluídas.'
          )}
        </ThemedText>
      </View>
    </Cartao>
  );
}

function ItemDose({ item, destaque, aoMudar }: { item: ItemAgendaDose; destaque: boolean; aoMudar: () => void }) {
  const theme = useTheme();
  const resolvida = item.status !== 'pendente' && item.status !== 'aguardando';
  // "Atrasada" é só exibição: a dose continua pendente e com as ações.
  const statusExibido = item.atrasada ? 'aguardando' : item.status;
  const corStatus = theme[TOKEN_STATUS_DOSE[statusExibido]];

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

  const detalhe = [item.dosagem, item.horario ? format(item.horario, 'HH:mm') : null].filter(Boolean).join(' · ');

  return (
    <Cartao
      style={{
        borderRadius: 18,
        padding: 16,
        gap: 14,
        borderWidth: destaque ? 2 : 0,
        borderColor: destaque ? theme.accent : 'transparent',
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
        <IconeStatus status={statusExibido} />
        <Tocavel
          accessibilityRole="link"
          accessibilityHint="Abre o detalhe do medicamento"
          onPress={() => abrirDetalhe(item.medicamentoId)}
          style={{ flex: 1, gap: 2 }}>
          <ThemedText style={{ fontFamily: FAMILIA_TEXTO[600] }}>{item.nome}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numerico>
            {detalhe}
          </ThemedText>
          {item.posicaoCiclo ? (
            <ThemedText type="small" themeColor="textSecondary">
              dia {item.posicaoCiclo.dia} de {item.posicaoCiclo.totalDiasAtivos}
            </ThemedText>
          ) : null}
        </Tocavel>
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <ThemedText type="smallBold" style={{ color: corStatus, textAlign: 'right' }}>
            {item.atrasada ? 'Atrasada' : ROTULO_CURTO[item.status]}
            {item.status === 'tomada_com_atraso' && item.horarioRegistro ? `\n${format(item.horarioRegistro, 'HH:mm')}` : ''}
          </ThemedText>
          <SeloEstoque alerta={item.alertaEstoque} />
        </View>
      </View>

      {!resolvida ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Botao rotulo="Tomei agora" onPress={tomarAgora} style={{ flex: 1 }} />
          <Botao rotulo="Não tomar" variante="secundario" onPress={naoTomar} style={{ flex: 1 }} />
        </View>
      ) : null}
    </Cartao>
  );
}

/**
 * Cíclico sem ciclo em andamento: o usuário inicia a cartela daqui, o que
 * registra o primeiro comprimido como tomado agora (fix-cyclic-and-rolling-window).
 */
function ItemAguardandoCartela({ item, aoMudar }: { item: ItemAgendaAguardandoCartela; aoMudar: () => void }) {
  async function comecarCartela() {
    confirmarNovaCartelaCiclica(db, esquemaDominioOuFalha(item.esquemaId) as EsquemaCiclico, new Date());
    await reconciliarNotificacoesSeDisponivel(db);
    aoMudar();
  }

  return (
    <Cartao style={{ borderRadius: 18, padding: 16, gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
        <IconeStatus status="pendente" />
        <Tocavel
          accessibilityRole="link"
          accessibilityHint="Abre o detalhe do medicamento"
          onPress={() => abrirDetalhe(item.medicamentoId)}
          style={{ flex: 1, gap: 2 }}>
          <ThemedText style={{ fontFamily: FAMILIA_TEXTO[600] }}>{item.nome}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numerico>
            {[item.dosagem, item.horario ? format(item.horario, 'HH:mm') : null].filter(Boolean).join(' · ')}
          </ThemedText>
        </Tocavel>
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <ThemedText type="smallBold" themeColor="statusAtraso" style={{ textAlign: 'right' }}>
            Aguardando{'\n'}nova cartela
          </ThemedText>
          <SeloEstoque alerta={item.alertaEstoque} />
        </View>
      </View>
      <Botao rotulo="Comecei a nova cartela" onPress={comecarCartela} />
    </Cartao>
  );
}

function ItemSeNecessario({ item, aoMudar }: { item: ItemAgendaSeNecessario; aoMudar: () => void }) {
  const theme = useTheme();
  const estado = estadoLimiteSeNecessario(item.registradasHoje, item.limiteDiario);
  const corContador = estado === 'acima' ? theme.statusPerdida : estado === 'atingido' ? theme.statusAtraso : theme.textSecondary;

  function registrar() {
    const esquema = esquemaDominioOuFalha(item.esquemaId) as EsquemaSeNecessario;
    registrarDoseSeNecessarioNoBanco(db, esquema, new Date());
    aoMudar();
  }

  // Dentro do limite: um toque. No limite ou acima: confirma antes (warn-as-needed-limit).
  function aoTocarRegistrar() {
    if (!exigeConfirmacaoAoRegistrar(item.registradasHoje, item.limiteDiario)) {
      registrar();
      return;
    }
    Alert.alert(
      'Limite diário atingido',
      `Você já tomou ${item.registradasHoje} de ${item.limiteDiario} hoje. Tomar mais que o recomendado não é aconselhado.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Registrar mesmo assim', style: 'destructive', onPress: registrar },
      ],
    );
  }

  return (
    <Cartao style={{ borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <Tocavel
        accessibilityRole="link"
        accessibilityHint="Abre o detalhe do medicamento"
        onPress={() => abrirDetalhe(item.medicamentoId)}
        style={{ flex: 1, gap: 2 }}>
        <ThemedText style={{ fontFamily: FAMILIA_TEXTO[600] }}>{item.nome}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numerico>
          {item.dosagem} ·{' '}
          <ThemedText type="small" numerico style={{ color: corContador, fontFamily: estado === 'abaixo' ? FAMILIA_TEXTO[500] : FAMILIA_TEXTO[700] }}>
            {item.registradasHoje} de {item.limiteDiario} hoje
          </ThemedText>
        </ThemedText>
        {estado !== 'abaixo' ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <Icone nome="alerta" cor={corContador} tamanho={14} />
            <ThemedText type="caption" style={{ color: corContador, fontFamily: FAMILIA_TEXTO[600] }}>
              {estado === 'acima' ? 'Acima do limite recomendado' : 'Limite de hoje atingido'}
            </ThemedText>
          </View>
        ) : null}
        {item.alertaEstoque ? (
          <View style={{ alignSelf: 'flex-start', marginTop: 4 }}>
            <SeloEstoque alerta={item.alertaEstoque} />
          </View>
        ) : null}
      </Tocavel>
      <Botao rotulo="Registrar dose" variante="suave" onPress={aoTocarRegistrar} />
    </Cartao>
  );
}

export default function AgendaDoDiaScreen() {
  const theme = useTheme();
  const nome = usePreferencias((estado) => estado.nome);
  const [itens, setItens] = useState<ItemAgenda[]>([]);
  const [hoje, setHoje] = useState(new Date());
  // Resposta de notificação aplicada com a tela aberta (fix-permissoes-e-respostas).
  const versaoDados = useDadosStore((estado) => estado.versaoDados);

  const recarregar = useCallback(() => {
    const agora = new Date();
    marcarPerdidasPorTempo(db, agora);
    setHoje(agora);
    setItens(montarAgendaDoDia(db, agora));
  }, [versaoDados]);

  useFocusEffect(recarregar);

  const resumo = useMemo(() => resumirDia(itens), [itens]);
  const secoes = useMemo(() => agruparPorPeriodo(itens), [itens]);

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={{ gap: 18, padding: 20, paddingBottom: 32 }} contentInsetAdjustmentBehavior="automatic">
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
            <View style={{ flex: 1, gap: 4 }}>
              <ThemedText type="small" themeColor="textSecondary">
                {capitalizar(format(hoje, "EEEE, d 'de' MMMM", { locale: ptBR }))}
              </ThemedText>
              <ThemedText
                type="display"
                accessibilityRole="header"
                numberOfLines={1}
                style={{ fontSize: 30, lineHeight: 34 }}>
                {textoSaudacao(periodoDoDia(hoje), nome)}
              </ThemedText>
            </View>
            <Botao
              rotulo="Novo"
              icone="mais"
              onPress={() => router.push('/medicamento/novo')}
              style={{ borderRadius: 999, paddingLeft: 14, paddingRight: 18 }}
            />
          </View>

          {resumo.total > 0 ? <ResumoCartao resumo={resumo} /> : null}

          {secoes.length === 0 ? (
            <Cartao style={{ alignItems: 'center', paddingVertical: 28 }}>
              <Icone nome="pilula" cor={theme.textSecondary} />
              <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
                Nada por aqui hoje.
              </ThemedText>
            </Cartao>
          ) : (
            secoes.map((secao) => (
              <View key={secao.chave} style={{ gap: 10 }}>
                <CabecalhoSecao>{secao.titulo}</CabecalhoSecao>
                {secao.chave === 'se_necessario'
                  ? secao.itens.map((item) => <ItemSeNecessario key={item.esquemaId} item={item} aoMudar={recarregar} />)
                  : secao.itens.map((item) =>
                      item.tipo === 'aguardando_cartela' ? (
                        <ItemAguardandoCartela key={item.esquemaId} item={item} aoMudar={recarregar} />
                      ) : (
                        <ItemDose
                          key={item.doseId}
                          item={item}
                          destaque={item.doseId === resumo.proxima?.doseId}
                          aoMudar={recarregar}
                        />
                      ),
                    )}
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
