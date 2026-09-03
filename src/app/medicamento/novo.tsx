import { router } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { db } from '@/db/client';
import { CRITICIDADES, type Criticidade, TIPOS_ESQUEMA, type TipoEsquema } from '@/db/schema';
import { cadastrarMedicamento, ErroValidacao } from '@/domain/medication-registration/registration';
import type { DadosEsquemaFormulario, ModoDuracao } from '@/domain/medication-registration/types';
import type { ErrosValidacao } from '@/domain/medication-registration/validation';
import { isExpoGo } from '@/lib/expo-go';

const ROTULOS_TIPO: Record<TipoEsquema, string> = {
  DIARIO: 'Diário',
  INTERVALO_HORAS: 'Intervalo em horas',
  DIAS_SEMANA: 'Dias da semana',
  CICLICO: 'Cíclico',
  SE_NECESSARIO: 'Se necessário',
};

const ROTULOS_DIA_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

function limparHorarios(horarios: string[]): string[] {
  return horarios.map((h) => h.trim()).filter(Boolean);
}

function paraNumero(valor: string): number {
  return Number(valor.replace(',', '.'));
}

interface SeletorProps<T extends string> {
  opcoes: readonly T[];
  rotulo: (opcao: T) => string;
  selecionado: T;
  onSelecionar: (opcao: T) => void;
  desabilitado?: boolean;
}

function Seletor<T extends string>({ opcoes, rotulo, selecionado, onSelecionar, desabilitado }: SeletorProps<T>) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {opcoes.map((opcao) => {
        const ativo = opcao === selecionado;
        return (
          <Pressable
            key={opcao}
            disabled={desabilitado}
            onPress={() => onSelecionar(opcao)}
            className={`rounded-full border px-3 py-2 ${
              ativo
                ? 'border-blue-600 bg-blue-600'
                : 'border-neutral-300 bg-transparent dark:border-neutral-700'
            } ${desabilitado ? 'opacity-50' : ''}`}>
            <ThemedText type="small" style={ativo ? { color: '#ffffff' } : undefined}>
              {rotulo(opcao)}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

function Campo({
  rotulo,
  erro,
  children,
}: {
  rotulo: string;
  erro?: string;
  children: ReactNode;
}) {
  return (
    <View className="gap-2">
      <ThemedText type="smallBold">{rotulo}</ThemedText>
      {children}
      {erro ? (
        <ThemedText type="small" style={{ color: '#dc2626' }}>
          {erro}
        </ThemedText>
      ) : null}
    </View>
  );
}

function campoTextoClasse() {
  return 'rounded-lg border border-neutral-300 px-3 py-2 text-black dark:border-neutral-700 dark:text-white';
}

function ListaHorarios({ horarios, onChange }: { horarios: string[]; onChange: (h: string[]) => void }) {
  return (
    <View className="gap-2">
      {horarios.map((horario, indice) => (
        <View key={indice} className="flex-row items-center gap-2">
          <TextInput
            className={`flex-1 ${campoTextoClasse()}`}
            placeholder="08:00"
            value={horario}
            onChangeText={(valor) => onChange(horarios.map((h, i) => (i === indice ? valor : h)))}
          />
          <Pressable onPress={() => onChange(horarios.filter((_, i) => i !== indice))}>
            <ThemedText type="small" themeColor="textSecondary">
              remover
            </ThemedText>
          </Pressable>
        </View>
      ))}
      <Pressable onPress={() => onChange([...horarios, ''])}>
        <ThemedText type="link" themeColor="text">
          + adicionar horário
        </ThemedText>
      </Pressable>
    </View>
  );
}

function SeletorDuracao({ duracao, onChange }: { duracao: ModoDuracao; onChange: (d: ModoDuracao) => void }) {
  return (
    <View className="gap-2">
      <Seletor
        opcoes={['continuo', 'dias'] as const}
        rotulo={(opcao) => (opcao === 'continuo' ? 'Uso contínuo' : 'Número fixo de dias')}
        selecionado={duracao.modo}
        onSelecionar={(modo) => onChange(modo === 'continuo' ? { modo: 'continuo' } : { modo: 'dias', dias: 0 })}
      />
      {duracao.modo === 'dias' ? (
        <TextInput
          className={campoTextoClasse()}
          placeholder="Número de dias"
          keyboardType="numeric"
          value={duracao.dias ? String(duracao.dias) : ''}
          onChangeText={(valor) => onChange({ modo: 'dias', dias: paraNumero(valor) })}
        />
      ) : null}
    </View>
  );
}

export default function NovoMedicamentoScreen() {
  const [nome, setNome] = useState('');
  const [dosagem, setDosagem] = useState('');
  const [criticidade, setCriticidade] = useState<Criticidade>('comum');
  const [quantidadeEmEstoque, setQuantidadeEmEstoque] = useState('');
  const [quantidadePorEmbalagem, setQuantidadePorEmbalagem] = useState('');

  const [tipo, setTipo] = useState<TipoEsquema>('DIARIO');
  const [horarios, setHorarios] = useState<string[]>(['']);
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
        return { tipo: 'DIARIO', horarios: limparHorarios(horarios), duracao };
      case 'INTERVALO_HORAS':
        return { tipo: 'INTERVALO_HORAS', intervaloHoras: paraNumero(intervaloHoras), duracao };
      case 'DIAS_SEMANA':
        return { tipo: 'DIAS_SEMANA', diasDaSemana, horarios: limparHorarios(horarios), duracao };
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

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerClassName="gap-4 p-4" keyboardShouldPersistTaps="handled">
          <ThemedText type="title" style={{ fontSize: 28, lineHeight: 34 }}>
            Novo medicamento
          </ThemedText>

          <Campo rotulo="Nome" erro={erros.nome}>
            <TextInput className={campoTextoClasse()} value={nome} onChangeText={setNome} placeholder="Losartana" />
          </Campo>

          <Campo rotulo="Dose" erro={erros.dosagem}>
            <TextInput
              className={campoTextoClasse()}
              value={dosagem}
              onChangeText={setDosagem}
              placeholder="50mg"
            />
          </Campo>

          <Campo rotulo="Criticidade">
            <Seletor
              opcoes={CRITICIDADES}
              rotulo={(opcao) => (opcao === 'comum' ? 'Comum' : 'Especial')}
              selecionado={criticidadeEfetiva}
              onSelecionar={setCriticidade}
              desabilitado={tipo === 'CICLICO'}
            />
            {tipo === 'CICLICO' ? (
              <ThemedText type="small" themeColor="textSecondary">
                Medicamentos cíclicos são sempre especiais.
              </ThemedText>
            ) : null}
          </Campo>

          <Campo rotulo="Quantidade em estoque" erro={erros.quantidadeEmEstoque}>
            <TextInput
              className={campoTextoClasse()}
              value={quantidadeEmEstoque}
              onChangeText={setQuantidadeEmEstoque}
              keyboardType="numeric"
              placeholder="30"
            />
          </Campo>

          <Campo rotulo="Quantidade por embalagem" erro={erros.quantidadePorEmbalagem}>
            <TextInput
              className={campoTextoClasse()}
              value={quantidadePorEmbalagem}
              onChangeText={setQuantidadePorEmbalagem}
              keyboardType="numeric"
              placeholder="30"
            />
          </Campo>

          <Campo rotulo="Tipo de esquema">
            <Seletor opcoes={TIPOS_ESQUEMA} rotulo={(opcao) => ROTULOS_TIPO[opcao]} selecionado={tipo} onSelecionar={setTipo} />
          </Campo>

          {tipo === 'DIARIO' ? (
            <>
              <Campo rotulo="Horários" erro={erros.horarios}>
                <ListaHorarios horarios={horarios} onChange={setHorarios} />
              </Campo>
              <Campo rotulo="Duração" erro={erros.duracao}>
                <SeletorDuracao duracao={duracao} onChange={setDuracao} />
              </Campo>
            </>
          ) : null}

          {tipo === 'INTERVALO_HORAS' ? (
            <>
              <Campo rotulo="Intervalo entre doses (horas)" erro={erros.intervaloHoras}>
                <TextInput
                  className={campoTextoClasse()}
                  value={intervaloHoras}
                  onChangeText={setIntervaloHoras}
                  keyboardType="numeric"
                  placeholder="8"
                />
              </Campo>
              <Campo rotulo="Duração" erro={erros.duracao}>
                <SeletorDuracao duracao={duracao} onChange={setDuracao} />
              </Campo>
            </>
          ) : null}

          {tipo === 'DIAS_SEMANA' ? (
            <>
              <Campo rotulo="Dias da semana" erro={erros.diasDaSemana}>
                <View className="flex-row flex-wrap gap-2">
                  {[0, 1, 2, 3, 4, 5, 6].map((dia) => {
                    const ativo = diasDaSemana.includes(dia);
                    return (
                      <Pressable
                        key={dia}
                        onPress={() =>
                          setDiasDaSemana((atual) =>
                            ativo ? atual.filter((d) => d !== dia) : [...atual, dia].sort(),
                          )
                        }
                        className={`rounded-full border px-3 py-2 ${
                          ativo ? 'border-blue-600 bg-blue-600' : 'border-neutral-300 dark:border-neutral-700'
                        }`}>
                        <ThemedText type="small" style={ativo ? { color: '#ffffff' } : undefined}>
                          {ROTULOS_DIA_SEMANA[dia]}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              </Campo>
              <Campo rotulo="Horários" erro={erros.horarios}>
                <ListaHorarios horarios={horarios} onChange={setHorarios} />
              </Campo>
              <Campo rotulo="Duração" erro={erros.duracao}>
                <SeletorDuracao duracao={duracao} onChange={setDuracao} />
              </Campo>
            </>
          ) : null}

          {tipo === 'CICLICO' ? (
            <>
              <Campo rotulo="Dias ativos" erro={erros.diasAtivos}>
                <TextInput
                  className={campoTextoClasse()}
                  value={diasAtivos}
                  onChangeText={setDiasAtivos}
                  keyboardType="numeric"
                  placeholder="21"
                />
              </Campo>
              <Campo rotulo="Dias de pausa" erro={erros.diasPausa}>
                <TextInput
                  className={campoTextoClasse()}
                  value={diasPausa}
                  onChangeText={setDiasPausa}
                  keyboardType="numeric"
                  placeholder="7"
                />
              </Campo>
              <Campo rotulo="Horário diário da dose" erro={erros.horario}>
                <TextInput
                  className={campoTextoClasse()}
                  value={horarioCiclico}
                  onChangeText={setHorarioCiclico}
                  placeholder="08:00"
                />
              </Campo>
            </>
          ) : null}

          {tipo === 'SE_NECESSARIO' ? (
            <Campo rotulo="Limite máximo de doses por dia" erro={erros.limiteDiario}>
              <TextInput
                className={campoTextoClasse()}
                value={limiteDiario}
                onChangeText={setLimiteDiario}
                keyboardType="numeric"
                placeholder="4"
              />
            </Campo>
          ) : null}

          <Pressable onPress={enviar} className="mt-2 items-center rounded-lg bg-blue-600 px-4 py-3">
            <ThemedText type="smallBold" style={{ color: '#ffffff' }}>
              Cadastrar
            </ThemedText>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
