import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  type ItemAgendaDose,
  type ItemAgendaSeNecessario,
  montarAgendaDoDia,
} from '@/domain/agenda-views/agenda-diaria';
import { agruparPorPeriodo, type ResumoDoDia, resumirDia } from '@/domain/agenda-views/resumo-dia';
import { confirmarDose, pularDose } from '@/domain/adherence-history/resolucao';
import { registrarDoseSeNecessarioNoBanco } from '@/domain/adherence-history/se-necessario';
import type { EsquemaSeNecessario } from '@/domain/dose-scheduling/types';
import { inicialDoNome } from '@/domain/preferencias/preferencias';
import { useTheme } from '@/hooks/use-theme';
import { reconciliarNotificacoesSeDisponivel } from '@/lib/notificacoes-seguras';
import { usePreferencias } from '@/lib/preferencias';

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

function SeloEstoqueBaixo() {
  const theme = useTheme();
  return (
    <View style={{ backgroundColor: theme.statusPerdidaSoft, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
      <ThemedText type="caption" style={{ color: theme.statusPerdida, fontFamily: FAMILIA_TEXTO[600] }}>
        Estoque baixo
      </ThemedText>
    </View>
  );
}

/** Botão circular de perfil: inicial do nome ou ícone de pessoa (specs/user-profile). */
function BotaoPerfil() {
  const theme = useTheme();
  const inicial = inicialDoNome(usePreferencias((estado) => estado.nome));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Meu perfil"
      onPress={() => router.push('/perfil')}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.accentSoft,
        opacity: pressed ? 0.7 : 1,
      })}>
      {inicial ? (
        <ThemedText style={{ color: theme.onAccentSoft, fontFamily: FAMILIA_TEXTO[700], fontSize: 17 }}>{inicial}</ThemedText>
      ) : (
        <Icone nome="pessoa" cor={theme.onAccentSoft} tamanho={22} />
      )}
    </Pressable>
  );
}

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
  const corStatus = theme[TOKEN_STATUS_DOSE[item.status]];

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
        <IconeStatus status={item.status} />
        <View style={{ flex: 1, gap: 2 }}>
          <ThemedText style={{ fontFamily: FAMILIA_TEXTO[600] }}>{item.nome}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numerico>
            {detalhe}
          </ThemedText>
          {item.posicaoCiclo ? (
            <ThemedText type="small" themeColor="textSecondary">
              dia {item.posicaoCiclo.dia} de {item.posicaoCiclo.totalDiasAtivos}
            </ThemedText>
          ) : null}
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <ThemedText type="smallBold" style={{ color: corStatus, textAlign: 'right' }}>
            {ROTULO_CURTO[item.status]}
            {item.status === 'tomada_com_atraso' && item.horarioRegistro ? `\n${format(item.horarioRegistro, 'HH:mm')}` : ''}
          </ThemedText>
          {item.alertaEstoque ? <SeloEstoqueBaixo /> : null}
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

function ItemSeNecessario({ item, aoMudar }: { item: ItemAgendaSeNecessario; aoMudar: () => void }) {
  function registrar() {
    const esquema = esquemaDominioOuFalha(item.esquemaId) as EsquemaSeNecessario;
    registrarDoseSeNecessarioNoBanco(db, esquema, new Date());
    aoMudar();
  }

  return (
    <Cartao style={{ borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText style={{ fontFamily: FAMILIA_TEXTO[600] }}>{item.nome}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numerico>
          {item.dosagem} · {item.registradasHoje} de {item.limiteDiario} hoje
        </ThemedText>
        {item.alertaEstoque ? (
          <View style={{ alignSelf: 'flex-start', marginTop: 4 }}>
            <SeloEstoqueBaixo />
          </View>
        ) : null}
      </View>
      <Botao rotulo="Registrar dose" variante="suave" onPress={registrar} />
    </Cartao>
  );
}

export default function AgendaDoDiaScreen() {
  const theme = useTheme();
  const [itens, setItens] = useState<ItemAgenda[]>([]);
  const [hoje, setHoje] = useState(new Date());

  const recarregar = useCallback(() => {
    const agora = new Date();
    setHoje(agora);
    setItens(montarAgendaDoDia(db, agora));
  }, []);

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
              <ThemedText type="display" accessibilityRole="header" numberOfLines={1}>
                Agenda
              </ThemedText>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Botao
                rotulo="Novo"
                icone="mais"
                onPress={() => router.push('/medicamento/novo')}
                style={{ borderRadius: 999, paddingLeft: 14, paddingRight: 18 }}
              />
              <BotaoPerfil />
            </View>
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
                  : secao.itens.map((item) => (
                      <ItemDose
                        key={item.doseId}
                        item={item}
                        destaque={item.doseId === resumo.proxima?.doseId}
                        aoMudar={recarregar}
                      />
                    ))}
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
