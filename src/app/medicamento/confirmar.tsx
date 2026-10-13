import { format, isSameDay, isTomorrow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Botao } from '@/components/ui/botao';
import { CabecalhoSecao } from '@/components/ui/cabecalho-secao';
import { Cartao } from '@/components/ui/cartao';
import { Icone } from '@/components/ui/icone';
import { Tocavel } from '@/components/ui/tocavel';
import { FAMILIA_TEXTO, FAMILIA_TITULO } from '@/constants/fontes';
import { db } from '@/db/client';
import type { PrevisaoEstoque } from '@/domain/medication-management/gestao';
import { type PreviaCadastro } from '@/domain/medication-registration/previa';
import { adicionarAAgenda, cadastrarMedicamento, ErroValidacao, prepararCadastro, prepararVoltaAAgenda } from '@/domain/medication-registration/registration';
import { textoEstoque } from '@/domain/medication-stock/caixas';
import type { DadosFormularioMedicamento } from '@/domain/medication-registration/types';
import { useTheme } from '@/hooks/use-theme';
import { aposSalvarMedicamento } from '@/lib/apos-salvar-medicamento';
import { useCadastroStore } from '@/state/cadastro-store';

const dia = (data: Date) => format(data, 'dd/MM');
const diaSemana = (data: Date) => format(data, "EEE, dd/MM", { locale: ptBR });
const hora = (data: Date) => format(data, 'HH:mm');

function quando(data: Date, agora: Date): string {
  if (isSameDay(data, agora)) return `Hoje às ${hora(data)}`;
  if (isTomorrow(data)) return `Amanhã às ${hora(data)}`;
  return `${diaSemana(data)} às ${hora(data)}`;
}

function textoPrevisao(previsao: PrevisaoEstoque | null): string | null {
  if (!previsao) return null;
  if (previsao.tipo === 'data') return `dura até ${previsao.aproximada ? '~' : ''}${diaSemana(previsao.data)}`;
  if (previsao.tipo === 'acabou') return 'o estoque acabou';
  if (previsao.tipo === 'sobra') return 'dá para todo o tratamento';
  return 'dura mais de 2 anos';
}

function resumoEsquema(dados: DadosFormularioMedicamento): string {
  const { esquema } = dados;
  switch (esquema.tipo) {
    case 'DIARIO':
      return `Diário · ${esquema.horarios.join(', ')}`;
    case 'INTERVALO_HORAS':
      return `A cada ${esquema.intervaloHoras} h`;
    case 'DIAS_SEMANA':
      return `Dias da semana · ${esquema.horarios.join(', ')}`;
    case 'CICLICO':
      return `Cíclico ${esquema.diasAtivos}/${esquema.diasPausa} · ${esquema.horario}`;
    case 'SE_NECESSARIO':
      return `Se necessário · até ${esquema.limiteDiario} por dia`;
  }
}

/** Assinatura do que seria gravado — se mudar entre "Continuar" e "Confirmar", a prévia é mostrada de novo. */
function assinatura(previa: PreviaCadastro): string {
  return JSON.stringify({ plano: previa.plano, proximas: previa.proximasDoses, hoje: previa.hoje });
}

function CartaoEscuro({ titulo, detalhe, principal, unidade, linhas }: {
  titulo: string;
  detalhe: string;
  principal: string;
  unidade: string;
  linhas: [string, string][];
}) {
  const theme = useTheme();
  return (
    <Cartao fundo="inverseSurface" style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <ThemedText type="caption" style={{ color: theme.onInverseSecondary, fontFamily: FAMILIA_TEXTO[700], letterSpacing: 1, textTransform: 'uppercase' }}>
          {titulo}
        </ThemedText>
        <ThemedText type="caption" style={{ color: theme.onInverseSecondary }}>
          {detalhe}
        </ThemedText>
      </View>
      <ThemedText numerico style={{ color: theme.onInverse, fontFamily: FAMILIA_TITULO[700], fontSize: 34, lineHeight: 38 }}>
        {principal} <ThemedText style={{ color: theme.onInverseSecondary, fontSize: 18 }}>{unidade}</ThemedText>
      </ThemedText>
      <View style={{ gap: 8 }}>
        {linhas.map(([rotulo, valor]) => (
          <View key={rotulo} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
            <ThemedText type="small" style={{ color: theme.onInverseSecondary }}>
              {rotulo}
            </ThemedText>
            <ThemedText type="smallBold" style={{ color: theme.onInverse }} numerico>
              {valor}
            </ThemedText>
          </View>
        ))}
      </View>
    </Cartao>
  );
}

/**
 * "Confira antes de salvar" (register-ongoing-medication): mostra a prévia
 * calculada e só grava em "Confirmar e agendar". "Ajustar" volta ao
 * formulário preenchido sem gravar nada. No cadastro, "Adicionar à agenda"
 * desligado só cadastra; na volta à agenda (agenda-membership, decisão 4), a
 * mesma prévia mostra o medicamento como se fosse cadastrado agora.
 */
export default function ConfirmarCadastroScreen() {
  const theme = useTheme();
  const { dados, previa, modo, definir, limpar } = useCadastroStore();
  const [aviso, setAviso] = useState<string | null>(null);
  const [adicionarNaAgenda, setAdicionarNaAgenda] = useState(true);

  if (!dados || !previa) return <ThemedView style={{ flex: 1 }} />;
  const { agora } = previa;
  const volta = modo.tipo === 'volta_agenda';
  // Só cadastrar: nada de doses, cartela, tratamento nem "hoje".
  const naAgenda = volta || adicionarNaAgenda;

  /**
   * Prévia recalculada no toque. Se os dados deixaram de valer desde que a tela
   * abriu (ex.: passou da meia-noite), mostra a validação e não salva
   * (fix-agenda-membership-review-2, decisão 3).
   */
  function recalcular(calcular: () => PreviaCadastro): PreviaCadastro | null {
    try {
      return calcular();
    } catch (erro) {
      if (!(erro instanceof ErroValidacao)) throw erro;
      setAviso(`${Object.values(erro.erros).join(' ')} Toque em "Ajustar" para conferir.`);
      return null;
    }
  }

  function confirmar() {
    const agoraConfirmacao = new Date();
    if (modo.tipo === 'volta_agenda') {
      const novaPrevia = recalcular(() => prepararVoltaAAgenda(db, modo.medicamentoId, agoraConfirmacao).previa);
      if (!novaPrevia) return;
      if (assinatura(novaPrevia) !== assinatura(previa!)) {
        definir(dados!, novaPrevia);
        setAviso('Os horários mudaram desde que você abriu esta tela. Confira de novo.');
        return;
      }
      adicionarAAgenda(db, modo.medicamentoId, novaPrevia);
      aposSalvarMedicamento(dados!.comuns.criticidade);
      limpar();
      router.back();
      return;
    }

    // Só cadastrar descarta "Já estava tomando" — então nem o valida (fix-agenda-membership-review).
    const novaPrevia = recalcular(() => prepararCadastro(adicionarNaAgenda ? dados! : { ...dados!, emUso: undefined }, agoraConfirmacao));
    if (!novaPrevia) return;
    if (adicionarNaAgenda && assinatura(novaPrevia) !== assinatura(previa!)) {
      // O relógio andou e mudou o que seria gravado: mostra de novo em vez de salvar.
      definir(dados!, novaPrevia);
      setAviso('Os horários mudaram desde que você abriu esta tela. Confira de novo.');
      return;
    }
    cadastrarMedicamento(db, dados!, novaPrevia.agora, { naAgenda: adicionarNaAgenda });
    if (adicionarNaAgenda) aposSalvarMedicamento(dados!.comuns.criticidade);
    limpar();
    router.dismissAll();
  }

  function editarAntesDeVoltar() {
    if (modo.tipo !== 'volta_agenda') return;
    // Nada é agendado: a edição salva o medicamento ainda fora da agenda.
    const id = modo.medicamentoId;
    limpar();
    router.replace({ pathname: '/medicamento/[id]/editar', params: { id } });
  }

  const { tratamento, cartela, estoque } = previa;

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ gap: 14, padding: 20, paddingBottom: 24 }}>
          <Tocavel
            accessibilityRole="button"
            accessibilityLabel="Voltar e ajustar"
            onPress={() => router.back()}
            style={{ width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surface }}>
            <Icone nome="voltar" cor={theme.text} tamanho={22} />
          </Tocavel>
          <View style={{ gap: 4 }}>
            <ThemedText type="small" themeColor="textSecondary">
              {volta ? 'Confira antes de voltar à agenda' : 'Confira antes de salvar'}
            </ThemedText>
            <ThemedText type="display" accessibilityRole="header">
              {dados.comuns.nome}
            </ThemedText>
            <ThemedText themeColor="textSecondary">
              {dados.comuns.dosagem} · {resumoEsquema(dados)} · {dados.comuns.criticidade === 'especial' ? 'Especial' : 'Comum'}
            </ThemedText>
          </View>

          {aviso ? (
            <Cartao fundo="statusAtrasoSoft" style={{ flexDirection: 'row', gap: 10 }}>
              <Icone nome="info" cor={theme.statusAtraso} tamanho={20} />
              <ThemedText type="small" style={{ color: theme.statusAtraso, flex: 1 }} accessibilityRole="alert">
                {aviso}
              </ThemedText>
            </Cartao>
          ) : null}

          {!volta ? (
            <Cartao>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
                <ThemedText style={{ fontFamily: FAMILIA_TEXTO[700] }}>Adicionar à agenda</ThemedText>
                <Switch
                  accessibilityLabel="Adicionar à agenda"
                  value={adicionarNaAgenda}
                  onValueChange={setAdicionarNaAgenda}
                  trackColor={{ true: theme.accent, false: theme.border }}
                  thumbColor={theme.surface}
                />
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                {adicionarNaAgenda
                  ? 'As doses entram na agenda, com lembretes.'
                  : 'Só cadastrar: o medicamento fica fora da agenda, sem doses nem lembretes. Você pode adicioná-lo depois pelo detalhe.'}
              </ThemedText>
            </Cartao>
          ) : null}

          {!naAgenda ? null : cartela ? (
            <CartaoEscuro
              titulo="Cartela atual"
              detalhe={cartela.fase === 'ativo' ? `dia ${cartela.dia} de ${cartela.total}` : `pausa: dia ${cartela.dia} de ${cartela.total}`}
              principal={cartela.fase === 'ativo' ? `Faltam ${cartela.restantesNaCartela}` : 'Em pausa'}
              unidade={cartela.fase === 'ativo' ? (cartela.restantesNaCartela === 1 ? 'comprimido' : 'comprimidos') : ''}
              linhas={[
                ...(cartela.fase === 'ativo' ? ([['Último desta cartela', diaSemana(cartela.ultimoDaCartela)]] as [string, string][]) : []),
                ['Pausa', `${dia(cartela.pausaDe)} a ${dia(cartela.pausaAte)}`],
                ['Nova cartela prevista', diaSemana(cartela.novaCartelaPrevista)],
              ]}
            />
          ) : tratamento ? (
            <CartaoEscuro
              titulo="Tratamento"
              detalhe={`dia ${tratamento.diaAtual} de ${tratamento.totalDias}`}
              principal={`Faltam ${tratamento.dosesRestantes}`}
              unidade={tratamento.dosesRestantes === 1 ? 'dose' : 'doses'}
              linhas={[
                ['Começou', diaSemana(tratamento.inicio)],
                ...(tratamento.ultimaDose ? ([['Última dose', `${diaSemana(tratamento.ultimaDose)} às ${hora(tratamento.ultimaDose)}`]] as [string, string][]) : []),
              ]}
            />
          ) : (
            <Cartao>
              <CabecalhoSecao>Próximas doses</CabecalhoSecao>
              {previa.proximasDoses.length === 0 ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {dados.esquema.tipo === 'SE_NECESSARIO' ? 'Sem horário: você registra quando tomar.' : 'Nenhuma dose agendada por enquanto.'}
                </ThemedText>
              ) : (
                <>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.accent }}>
                      <Icone nome="relogio" cor={theme.onAccent} tamanho={18} />
                    </View>
                    <View style={{ gap: 2 }}>
                      <ThemedText style={{ fontFamily: FAMILIA_TEXTO[700] }}>{quando(previa.proximasDoses[0], agora)}</ThemedText>
                      <ThemedText type="caption" themeColor="textSecondary">
                        {previa.primeiraDosePrevistaOriginal
                          ? `Estava prevista às ${hora(previa.primeiraDosePrevistaOriginal)}`
                          : 'Primeira dose'}
                      </ThemedText>
                    </View>
                  </View>
                  {previa.proximasDoses.length > 1 ? (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingLeft: 48 }}>
                      {previa.proximasDoses.slice(1).map((dose) => (
                        <View key={dose.getTime()} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: theme.surfaceMuted }}>
                          <ThemedText type="caption" style={{ fontFamily: FAMILIA_TEXTO[600] }} numerico>
                            {diaSemana(dose)} {hora(dose)}
                          </ThemedText>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </>
              )}
            </Cartao>
          )}

          {naAgenda && estoque.insuficiente ? (
            <Cartao fundo="statusPerdidaSoft" style={{ flexDirection: 'row', gap: 12 }} accessibilityRole="alert">
              <Icone nome="alerta" cor={theme.statusPerdida} tamanho={22} />
              <View style={{ flex: 1, gap: 4 }}>
                <ThemedText style={{ fontFamily: FAMILIA_TEXTO[700], color: theme.statusPerdida }}>
                  Faltam {estoque.insuficiente.dosesRestantes} doses e você tem {estoque.quantidade}
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.statusPerdida }}>
                  O estoque acaba na dose de {diaSemana(estoque.insuficiente.acabaEm)} às {hora(estoque.insuficiente.acabaEm)}. Compre mais{' '}
                  {estoque.insuficiente.faltam} antes disso.
                </ThemedText>
              </View>
            </Cartao>
          ) : null}

          <Cartao>
            <CabecalhoSecao>Estoque</CabecalhoSecao>
            <ThemedText style={{ fontFamily: FAMILIA_TEXTO[700] }}>
              {textoEstoque(estoque.quantidade, dados!.comuns.quantidadePorEmbalagem, dados!.esquema.tipo === 'CICLICO')}
            </ThemedText>
            {naAgenda && textoPrevisao(estoque.previsao) ? (
              <ThemedText type="small" themeColor="textSecondary">
                {estoque.quantidade} {estoque.quantidade === 1 ? 'unidade' : 'unidades'} · {textoPrevisao(estoque.previsao)}
              </ThemedText>
            ) : null}
          </Cartao>

          {naAgenda && (previa.hoje.tomadas.length > 0 || previa.hoje.aAgendar.length > 0) ? (
            <Cartao>
              <CabecalhoSecao>Hoje</CabecalhoSecao>
              {previa.hoje.tomadas.map((dose) => (
                <View key={`t${dose.getTime()}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Icone nome="check" cor={theme.statusTomada} tamanho={20} />
                  <ThemedText>{hora(dose)} · registrada como tomada</ThemedText>
                </View>
              ))}
              {previa.hoje.aAgendar.map((dose) => (
                <View key={`a${dose.getTime()}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Icone nome="relogio" cor={theme.textSecondary} tamanho={20} />
                  <ThemedText>{hora(dose)} · entra na agenda</ThemedText>
                </View>
              ))}
            </Cartao>
          ) : null}

          {naAgenda && previa.diasSemRegistro ? (
            <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 4 }}>
              <Icone nome="info" cor={theme.textSecondary} tamanho={16} />
              <ThemedText type="caption" themeColor="textSecondary" style={{ flex: 1 }}>
                De {dia(previa.diasSemRegistro.de)} a {dia(previa.diasSemRegistro.ate)} o histórico fica sem registro.
                {cartela ? ' A nova cartela só começa quando você confirmar o primeiro comprimido.' : ''}
              </ThemedText>
            </View>
          ) : null}
        </ScrollView>

        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20, backgroundColor: theme.background }}>
          {volta ? (
            <>
              <Botao rotulo="Editar" variante="secundario" tamanho="grande" onPress={editarAntesDeVoltar} style={{ flex: 1 }} />
              <Botao rotulo="Adicionar à agenda" tamanho="grande" onPress={confirmar} style={{ flex: 1.6 }} />
            </>
          ) : (
            <>
              <Botao rotulo="Ajustar" variante="secundario" tamanho="grande" onPress={() => router.back()} style={{ flex: 1 }} />
              <Botao rotulo={adicionarNaAgenda ? 'Confirmar e agendar' : 'Cadastrar'} tamanho="grande" onPress={confirmar} style={{ flex: 1.6 }} />
            </>
          )}
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}
