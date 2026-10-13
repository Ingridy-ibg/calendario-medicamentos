import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Botao } from '@/components/ui/botao';
import { CabecalhoSecao } from '@/components/ui/cabecalho-secao';
import { Campo, CampoTexto } from '@/components/ui/campo-texto';
import { Cartao } from '@/components/ui/cartao';
import { Chip } from '@/components/ui/chip';
import { Icone } from '@/components/ui/icone';
import { Segmentado } from '@/components/ui/segmentado';
import { FAMILIA_TEXTO } from '@/constants/fontes';
import { db } from '@/db/client';
import { CRITICIDADES, type Criticidade, TIPOS_ESQUEMA, type TipoEsquema } from '@/db/schema';
import { cadastrarMedicamento, ErroValidacao } from '@/domain/medication-registration/registration';
import type { DadosEsquemaFormulario, ModoDuracao } from '@/domain/medication-registration/types';
import type { ErrosValidacao } from '@/domain/medication-registration/validation';
import { useTheme } from '@/hooks/use-theme';
import { isExpoGo } from '@/lib/expo-go';

const ROTULOS_TIPO: Record<TipoEsquema, string> = {
  DIARIO: 'Diário',
  INTERVALO_HORAS: 'A cada X horas',
  DIAS_SEMANA: 'Dias da semana',
  CICLICO: 'Cíclico',
  SE_NECESSARIO: 'Se necessário',
};

const DIAS_SEMANA = [
  { letra: 'D', nome: 'domingo' },
  { letra: 'S', nome: 'segunda' },
  { letra: 'T', nome: 'terça' },
  { letra: 'Q', nome: 'quarta' },
  { letra: 'Q', nome: 'quinta' },
  { letra: 'S', nome: 'sexta' },
  { letra: 'S', nome: 'sábado' },
];

const DESCRICAO_CRITICIDADE: Record<Criticidade, { titulo: string; descricao: string }> = {
  comum: { titulo: 'Comum', descricao: 'Um lembrete por dose, com repetição curta.' },
  especial: { titulo: 'Especial', descricao: 'Lembretes insistentes até você responder.' },
};

const TIPOS_COM_DURACAO: TipoEsquema[] = ['DIARIO', 'INTERVALO_HORAS', 'DIAS_SEMANA'];

function paraNumero(valor: string): number {
  return Number(valor.replace(',', '.'));
}

function formatarHorario(data: Date): string {
  return `${String(data.getHours()).padStart(2, '0')}:${String(data.getMinutes()).padStart(2, '0')}`;
}

/** Relógio digital nativo do Android (rolagem de horas/minutos), sempre em formato 24h. */
function abrirSeletorDeHorario(aoSelecionar: (horario: string) => void) {
  DateTimePickerAndroid.open({
    value: new Date(),
    mode: 'time',
    is24Hour: true,
    display: 'spinner',
    onChange: (evento, data) => {
      if (evento.type === 'set' && data) {
        aoSelecionar(formatarHorario(data));
      }
    },
  });
}

function SecaoFormulario({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <Cartao style={{ gap: 14 }}>
      <CabecalhoSecao>{titulo}</CabecalhoSecao>
      {children}
    </Cartao>
  );
}

function ChipAdicionar({ rotulo, onPress }: { rotulo: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 44,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        borderRadius: 12,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: theme.textSecondary,
        opacity: pressed ? 0.7 : 1,
      })}>
      <Icone nome="mais" cor={theme.accent} tamanho={18} />
      <ThemedText type="smallBold" themeColor="accent">
        {rotulo}
      </ThemedText>
    </Pressable>
  );
}

function ChipHorario({ horario, onRemover }: { horario: string; onRemover: () => void }) {
  const theme = useTheme();
  return (
    <View
      style={{
        minHeight: 44,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingLeft: 14,
        paddingRight: 4,
        borderRadius: 12,
        backgroundColor: theme.surfaceMuted,
      }}>
      <ThemedText numerico style={{ fontFamily: FAMILIA_TEXTO[600], fontSize: 17 }}>
        {horario}
      </ThemedText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Remover ${horario}`}
        onPress={onRemover}
        hitSlop={6}
        style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
        <Icone nome="fechar" cor={theme.textSecondary} tamanho={18} />
      </Pressable>
    </View>
  );
}

function ListaHorarios({ horarios, onChange }: { horarios: string[]; onChange: (h: string[]) => void }) {
  function adicionar() {
    abrirSeletorDeHorario((horario) => {
      if (horarios.includes(horario)) return;
      onChange([...horarios, horario].sort());
    });
  }

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {horarios.map((horario) => (
        <ChipHorario key={horario} horario={horario} onRemover={() => onChange(horarios.filter((h) => h !== horario))} />
      ))}
      <ChipAdicionar rotulo="Horário" onPress={adicionar} />
    </View>
  );
}

function OpcaoCriticidade({
  criticidade,
  selecionada,
  desabilitada,
  onPress,
}: {
  criticidade: Criticidade;
  selecionada: boolean;
  desabilitada: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const { titulo, descricao } = DESCRICAO_CRITICIDADE[criticidade];
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selecionada, disabled: desabilitada }}
      disabled={desabilitada}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 14,
        borderRadius: 14,
        borderWidth: selecionada ? 2 : 1.5,
        borderColor: selecionada ? theme.accent : theme.border,
        opacity: desabilitada ? 0.5 : 1,
      }}>
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          borderWidth: selecionada ? 6 : 2,
          borderColor: selecionada ? theme.accent : theme.textSecondary,
        }}
      />
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText style={{ fontFamily: FAMILIA_TEXTO[700], fontSize: 15 }}>{titulo}</ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">
          {descricao}
        </ThemedText>
      </View>
    </Pressable>
  );
}

export default function NovoMedicamentoScreen() {
  const theme = useTheme();
  const [nome, setNome] = useState('');
  const [dosagem, setDosagem] = useState('');
  const [criticidade, setCriticidade] = useState<Criticidade>('comum');
  const [quantidadeEmEstoque, setQuantidadeEmEstoque] = useState('');
  const [quantidadePorEmbalagem, setQuantidadePorEmbalagem] = useState('');

  const [tipo, setTipo] = useState<TipoEsquema>('DIARIO');
  const [horarios, setHorarios] = useState<string[]>([]);
  const [duracao, setDuracao] = useState<ModoDuracao>({ modo: 'continuo' });
  const [intervaloHoras, setIntervaloHoras] = useState('');
  const [diasDaSemana, setDiasDaSemana] = useState<number[]>([]);
  const [diasAtivos, setDiasAtivos] = useState('');
  const [diasPausa, setDiasPausa] = useState('');
  const [horarioCiclico, setHorarioCiclico] = useState('');
  const [limiteDiario, setLimiteDiario] = useState('');

  const [erros, setErros] = useState<ErrosValidacao>({});

  const criticidadeEfetiva: Criticidade = tipo === 'CICLICO' ? 'especial' : criticidade;

  function construirDadosEsquema(): DadosEsquemaFormulario {
    switch (tipo) {
      case 'DIARIO':
        return { tipo: 'DIARIO', horarios, duracao };
      case 'INTERVALO_HORAS':
        return { tipo: 'INTERVALO_HORAS', intervaloHoras: paraNumero(intervaloHoras), duracao };
      case 'DIAS_SEMANA':
        return { tipo: 'DIAS_SEMANA', diasDaSemana, horarios, duracao };
      case 'CICLICO':
        return {
          tipo: 'CICLICO',
          diasAtivos: paraNumero(diasAtivos),
          diasPausa: paraNumero(diasPausa),
          horario: horarioCiclico.trim(),
        };
      case 'SE_NECESSARIO':
        return { tipo: 'SE_NECESSARIO', limiteDiario: paraNumero(limiteDiario) };
    }
  }

  function enviar() {
    try {
      cadastrarMedicamento(
        db,
        {
          comuns: {
            nome,
            dosagem,
            criticidade: criticidadeEfetiva,
            quantidadeEmEstoque: paraNumero(quantidadeEmEstoque),
            quantidadePorEmbalagem: paraNumero(quantidadePorEmbalagem),
          },
          esquema: construirDadosEsquema(),
        },
        new Date(),
      );
      setErros({});
      if (!isExpoGo) {
        // Import dinâmico, nunca estático: só de importar `expo-notifications`
        // já lança uma exceção dentro do Expo Go (ver `lib/expo-go.ts`).
        void import('@/notifications').then(({ reconciliarNotificacoes, solicitarPermissaoFullScreenIntent }) => {
          if (criticidadeEfetiva === 'especial') {
            // 5.2: pedida no primeiro cadastro de um medicamento especial, não
            // em toda abertura do app — é o ponto em que ela passa a ser
            // relevante (ver design.md).
            void solicitarPermissaoFullScreenIntent();
          }
          void reconciliarNotificacoes(db);
        });
      }
      router.back();
    } catch (erro) {
      if (erro instanceof ErroValidacao) {
        setErros(erro.erros);
        return;
      }
      throw erro;
    }
  }

  const campoNumerico = (rotulo: string, valor: string, aoMudar: (v: string) => void, erro: string | undefined, placeholder: string) => (
    <CampoTexto
      rotulo={rotulo}
      erro={erro}
      value={valor}
      onChangeText={aoMudar}
      keyboardType="numeric"
      placeholder={placeholder}
    />
  );

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="height">
          <ScrollView contentContainerStyle={{ gap: 14, padding: 20, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
            <View style={{ gap: 16, paddingBottom: 4 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Fechar"
                onPress={() => router.back()}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: theme.surface,
                }}>
                <Icone nome="fechar" cor={theme.text} tamanho={22} />
              </Pressable>
              <ThemedText type="display" accessibilityRole="header">
                Novo medicamento
              </ThemedText>
            </View>

            <SecaoFormulario titulo="Medicamento">
              <CampoTexto rotulo="Nome" erro={erros.nome} value={nome} onChangeText={setNome} placeholder="Ex.: Losartana" />
              <CampoTexto rotulo="Dosagem" erro={erros.dosagem} value={dosagem} onChangeText={setDosagem} placeholder="Ex.: 50 mg" />
            </SecaoFormulario>

            <SecaoFormulario titulo="Como tomar">
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {TIPOS_ESQUEMA.map((opcao) => (
                  <Chip key={opcao} rotulo={ROTULOS_TIPO[opcao]} selecionado={opcao === tipo} onPress={() => setTipo(opcao)} />
                ))}
              </View>

              {tipo === 'DIAS_SEMANA' ? (
                <Campo rotulo="Dias da semana" erro={erros.diasDaSemana}>
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    {DIAS_SEMANA.map(({ letra, nome: nomeDia }, dia) => {
                      const ativo = diasDaSemana.includes(dia);
                      return (
                        <Pressable
                          key={dia}
                          accessibilityRole="button"
                          accessibilityLabel={nomeDia}
                          accessibilityState={{ selected: ativo }}
                          onPress={() =>
                            setDiasDaSemana((atual) => (ativo ? atual.filter((d) => d !== dia) : [...atual, dia].sort()))
                          }
                          style={{
                            flex: 1,
                            minHeight: 44,
                            borderRadius: 12,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderWidth: ativo ? 0 : 1.5,
                            borderColor: theme.border,
                            backgroundColor: ativo ? theme.accent : theme.surface,
                          }}>
                          <ThemedText style={{ fontFamily: FAMILIA_TEXTO[700], color: ativo ? theme.onAccent : theme.text }}>
                            {letra}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                </Campo>
              ) : null}

              {tipo === 'DIARIO' || tipo === 'DIAS_SEMANA' ? (
                <Campo rotulo="Horários" erro={erros.horarios}>
                  <ListaHorarios horarios={horarios} onChange={setHorarios} />
                </Campo>
              ) : null}

              {tipo === 'INTERVALO_HORAS'
                ? campoNumerico('A cada quantas horas?', intervaloHoras, setIntervaloHoras, erros.intervaloHoras, '8')
                : null}

              {tipo === 'CICLICO' ? (
                <>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      {campoNumerico('Dias tomando', diasAtivos, setDiasAtivos, erros.diasAtivos, '21')}
                    </View>
                    <View style={{ flex: 1 }}>
                      {campoNumerico('Dias de pausa', diasPausa, setDiasPausa, erros.diasPausa, '7')}
                    </View>
                  </View>
                  <Campo rotulo="Horário diário da dose" erro={erros.horario}>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {horarioCiclico ? <ChipHorario horario={horarioCiclico} onRemover={() => setHorarioCiclico('')} /> : null}
                      <ChipAdicionar
                        rotulo={horarioCiclico ? 'Trocar' : 'Horário'}
                        onPress={() => abrirSeletorDeHorario(setHorarioCiclico)}
                      />
                    </View>
                  </Campo>
                </>
              ) : null}

              {tipo === 'SE_NECESSARIO' ? (
                <CampoTexto
                  rotulo="Máximo de doses por dia"
                  erro={erros.limiteDiario}
                  ajuda="Sem lembretes: você registra quando tomar."
                  value={limiteDiario}
                  onChangeText={setLimiteDiario}
                  keyboardType="numeric"
                  placeholder="4"
                />
              ) : null}
            </SecaoFormulario>

            {TIPOS_COM_DURACAO.includes(tipo) ? (
              <SecaoFormulario titulo="Duração">
                <Segmentado
                  opcoes={[
                    { valor: 'continuo', rotulo: 'Uso contínuo' },
                    { valor: 'dias', rotulo: 'Nº de dias' },
                  ]}
                  selecionado={duracao.modo}
                  onSelecionar={(modo) => setDuracao(modo === 'continuo' ? { modo: 'continuo' } : { modo: 'dias', dias: 0 })}
                />
                {duracao.modo === 'dias' ? (
                  <CampoTexto
                    rotulo="Tomar por quantos dias?"
                    erro={erros.duracao}
                    value={duracao.dias ? String(duracao.dias) : ''}
                    onChangeText={(valor) => setDuracao({ modo: 'dias', dias: paraNumero(valor) })}
                    keyboardType="numeric"
                    placeholder="10"
                  />
                ) : null}
              </SecaoFormulario>
            ) : null}

            <SecaoFormulario titulo="Estoque">
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  {campoNumerico('Em casa agora', quantidadeEmEstoque, setQuantidadeEmEstoque, erros.quantidadeEmEstoque, '30')}
                </View>
                <View style={{ flex: 1 }}>
                  {campoNumerico(
                    'Por embalagem',
                    quantidadePorEmbalagem,
                    setQuantidadePorEmbalagem,
                    erros.quantidadePorEmbalagem,
                    '30',
                  )}
                </View>
              </View>
              <ThemedText type="caption" themeColor="textSecondary">
                Avisamos quando estiver perto de acabar.
              </ThemedText>
            </SecaoFormulario>

            <SecaoFormulario titulo="Prioridade dos lembretes">
              <View accessibilityRole="radiogroup" style={{ gap: 10 }}>
                {CRITICIDADES.map((opcao) => (
                  <OpcaoCriticidade
                    key={opcao}
                    criticidade={opcao}
                    selecionada={opcao === criticidadeEfetiva}
                    desabilitada={tipo === 'CICLICO'}
                    onPress={() => setCriticidade(opcao)}
                  />
                ))}
              </View>
              {tipo === 'CICLICO' ? (
                <ThemedText type="caption" themeColor="textSecondary">
                  Medicamentos cíclicos são sempre especiais.
                </ThemedText>
              ) : null}
            </SecaoFormulario>
          </ScrollView>

          <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20, backgroundColor: theme.background }}>
            <Botao rotulo="Salvar medicamento" tamanho="grande" onPress={enviar} />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}
