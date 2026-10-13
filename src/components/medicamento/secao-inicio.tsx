import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { differenceInCalendarDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { CabecalhoSecao } from '@/components/ui/cabecalho-secao';
import { Campo, CampoTexto } from '@/components/ui/campo-texto';
import { Cartao } from '@/components/ui/cartao';
import { Icone } from '@/components/ui/icone';
import { Segmentado } from '@/components/ui/segmentado';
import { Tocavel } from '@/components/ui/tocavel';
import { FAMILIA_TEXTO } from '@/constants/fontes';
import type { TipoEsquema } from '@/db/schema';
import type { ErrosValidacao } from '@/domain/medication-registration/validation';
import type { ModoDuracao } from '@/domain/medication-registration/types';
import { useTheme } from '@/hooks/use-theme';

export interface EstadoInicio {
  emUso: boolean;
  dataInicio: Date | null;
  ultimaDose: Date | null;
  faseCiclo: 'ativo' | 'pausa';
  diaCiclo: string;
  tomadasHoje: string[];
}

export const ESTADO_INICIO_PADRAO: EstadoInicio = {
  emUso: false,
  dataInicio: null,
  ultimaDose: null,
  faseCiclo: 'ativo',
  diaCiclo: '',
  tomadasHoje: [],
};

function abrirSeletorData(valor: Date, modo: 'date' | 'time', aoEscolher: (data: Date) => void) {
  DateTimePickerAndroid.open({
    value: valor,
    mode: modo,
    is24Hour: true,
    maximumDate: new Date(),
    onChange: (evento, data) => {
      if (evento.type === 'set' && data) aoEscolher(data);
    },
  });
}

function BotaoData({ rotulo, texto, aoTocar }: { rotulo: string; texto: string; aoTocar: () => void }) {
  const theme = useTheme();
  return (
    <Tocavel
      accessibilityRole="button"
      accessibilityLabel={`${rotulo}: ${texto}`}
      onPress={aoTocar}
      style={{
        flex: 1,
        minHeight: 48,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: theme.border,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.surface,
      }}>
      <ThemedText style={{ fontFamily: FAMILIA_TEXTO[600] }} numerico>
        {texto}
      </ThemedText>
      <Icone nome={rotulo.includes('Horário') ? 'relogio' : 'calendario'} cor={theme.textSecondary} tamanho={18} />
    </Tocavel>
  );
}

/**
 * Seção "Início" do cadastro (register-ongoing-medication): "Já estava
 * tomando" e as perguntas de cada tipo. Os horários de hoje já passados vêm
 * prontos de quem usa a seção.
 */
export function SecaoInicio({
  tipo,
  duracao,
  diasAtivos,
  diasPausa,
  horariosDeHojePassados,
  estado,
  aoMudar,
  erros,
}: {
  tipo: TipoEsquema;
  duracao: ModoDuracao;
  diasAtivos: number;
  diasPausa: number;
  horariosDeHojePassados: string[];
  estado: EstadoInicio;
  aoMudar: (estado: EstadoInicio) => void;
  erros: ErrosValidacao;
}) {
  const theme = useTheme();
  const mudar = (parcial: Partial<EstadoInicio>) => aoMudar({ ...estado, ...parcial });
  const hoje = new Date();
  const comDuracao = duracao.modo === 'dias' && duracao.dias > 0;
  const formatarData = (data: Date | null) => (data ? format(data, "EEE, d 'de' MMMM", { locale: ptBR }) : 'Escolher');

  const campoInicio = (
    <Campo
      rotulo="Começou em"
      erro={erros.dataInicio}
      ajuda={
        estado.dataInicio && comDuracao
          ? `Hoje é o ${differenceInCalendarDays(hoje, estado.dataInicio) + 1}º dia de ${duracao.dias}.`
          : undefined
      }>
      <BotaoData
        rotulo="Data de início"
        texto={formatarData(estado.dataInicio)}
        aoTocar={() => abrirSeletorData(estado.dataInicio ?? hoje, 'date', (data) => mudar({ dataInicio: data }))}
      />
    </Campo>
  );

  const tomadasHoje =
    horariosDeHojePassados.length > 0 ? (
      <Campo rotulo="Já tomou as doses de hoje?" ajuda="Só aparecem os horários que já passaram. As marcadas descontam do estoque.">
        <View style={{ gap: 8 }}>
          {horariosDeHojePassados.map((horario) => {
            const tomou = estado.tomadasHoje.includes(horario);
            return (
              <Tocavel
                key={horario}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: tomou }}
                accessibilityLabel={`Dose das ${horario}`}
                onPress={() =>
                  mudar({ tomadasHoje: tomou ? estado.tomadasHoje.filter((h) => h !== horario) : [...estado.tomadasHoje, horario] })
                }
                style={{
                  minHeight: 52,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderWidth: tomou ? 2 : 1.5,
                  borderColor: tomou ? theme.accent : theme.border,
                  backgroundColor: theme.surface,
                }}>
                <ThemedText numerico style={{ fontFamily: FAMILIA_TEXTO[700] }}>
                  {horario}
                </ThemedText>
                <ThemedText type="smallBold" themeColor={tomou ? 'accent' : 'textSecondary'}>
                  {tomou ? 'Tomei' : 'Não tomei'}
                </ThemedText>
              </Tocavel>
            );
          })}
        </View>
      </Campo>
    ) : null;

  return (
    <Cartao style={{ gap: 14 }}>
      <CabecalhoSecao>Início</CabecalhoSecao>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <ThemedText style={{ fontFamily: FAMILIA_TEXTO[700] }}>Já estava tomando</ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            {estado.emUso ? 'O app continua de onde você parou.' : 'Desligado: começa hoje, no próximo horário.'}
          </ThemedText>
        </View>
        <Switch
          accessibilityLabel="Já estava tomando"
          value={estado.emUso}
          onValueChange={(emUso) => mudar({ emUso })}
          trackColor={{ true: theme.accent, false: theme.border }}
          thumbColor={theme.surface}
        />
      </View>

      {estado.emUso ? (
        <View style={{ gap: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: theme.divider }}>
          {tipo === 'CICLICO' ? (
            <>
              <Campo rotulo="Em que ponto da cartela você está?">
                <Segmentado
                  opcoes={
                    diasPausa > 0
                      ? [
                          { valor: 'ativo', rotulo: 'Tomando' },
                          { valor: 'pausa', rotulo: 'Na pausa' },
                        ]
                      : [{ valor: 'ativo', rotulo: 'Tomando' }]
                  }
                  selecionado={estado.faseCiclo}
                  onSelecionar={(faseCiclo) => mudar({ faseCiclo, tomadasHoje: [] })}
                />
              </Campo>
              <CampoTexto
                rotulo={estado.faseCiclo === 'ativo' ? `Hoje é o dia da cartela (de ${diasAtivos || '—'})` : `Hoje é o dia da pausa (de ${diasPausa || '—'})`}
                erro={erros.diaCiclo}
                value={estado.diaCiclo}
                onChangeText={(diaCiclo) => mudar({ diaCiclo })}
                keyboardType="number-pad"
                placeholder={estado.faseCiclo === 'ativo' ? '12' : '3'}
              />
              {estado.faseCiclo === 'ativo' ? tomadasHoje : null}
            </>
          ) : null}

          {tipo === 'INTERVALO_HORAS' ? (
            <>
              <Campo rotulo="Última dose" erro={erros.ultimaDose}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <BotaoData
                    rotulo="Data da última dose"
                    texto={estado.ultimaDose ? format(estado.ultimaDose, 'dd/MM') : 'Data'}
                    aoTocar={() =>
                      abrirSeletorData(estado.ultimaDose ?? hoje, 'date', (data) => {
                        const base = estado.ultimaDose ?? hoje;
                        data.setHours(base.getHours(), base.getMinutes(), 0, 0);
                        mudar({ ultimaDose: data });
                      })
                    }
                  />
                  <BotaoData
                    rotulo="Horário da última dose"
                    texto={estado.ultimaDose ? format(estado.ultimaDose, 'HH:mm') : 'Hora'}
                    aoTocar={() =>
                      abrirSeletorData(estado.ultimaDose ?? hoje, 'time', (hora) => {
                        const data = new Date(estado.ultimaDose ?? hoje);
                        data.setHours(hora.getHours(), hora.getMinutes(), 0, 0);
                        mudar({ ultimaDose: data });
                      })
                    }
                  />
                </View>
              </Campo>
              {comDuracao ? campoInicio : null}
            </>
          ) : null}

          {tipo === 'DIARIO' || tipo === 'DIAS_SEMANA' ? (
            <>
              {comDuracao ? campoInicio : null}
              {tomadasHoje}
              {!comDuracao && horariosDeHojePassados.length === 0 ? (
                <ThemedText type="small" themeColor="textSecondary">
                  Uso contínuo: as doses seguem a partir do próximo horário.
                </ThemedText>
              ) : null}
            </>
          ) : null}
        </View>
      ) : null}
    </Cartao>
  );
}
