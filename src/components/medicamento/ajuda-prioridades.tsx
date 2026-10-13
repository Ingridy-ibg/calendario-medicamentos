import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icone, type NomeIcone } from '@/components/ui/icone';
import { PALETAS_ALARME } from '@/constants/cores';
import { FAMILIA_TEXTO, FAMILIA_TITULO } from '@/constants/fontes';
import { CONTEUDO_PRIORIDADES } from '@/constants/prioridades';
import { CRITICIDADES, type Criticidade } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';

import { ModalAjudaPaginada } from './modal-ajuda-paginada';

const ITENS = CRITICIDADES.map((criticidade) => ({ chave: criticidade, conteudo: CONTEUDO_PRIORIDADES[criticidade] }));

/**
 * Modal que explica as prioridades de lembrete, uma por vez
 * (ajuda-prioridade-lembretes; artboard "Info — prioridade dos lembretes").
 * Abre na prioridade efetiva do formulário (cíclico = Especial); só explica,
 * nunca muda a escolha.
 */
export function AjudaPrioridades({
  visivel,
  criticidadeInicial,
  aoFechar,
}: {
  visivel: boolean;
  criticidadeInicial: Criticidade;
  aoFechar: () => void;
}) {
  return (
    <ModalAjudaPaginada
      visivel={visivel}
      aoFechar={aoFechar}
      rotuloSecao="Prioridade dos lembretes"
      rotulos={{ anterior: 'Prioridade anterior', proximo: 'Próxima prioridade' }}
      itens={ITENS}
      chaveInicial={criticidadeInicial}
      renderIlustracao={(criticidade) => (criticidade === 'comum' ? <MiniNotificacao /> : <MiniAlarme />)}
    />
  );
}

/** Comum: uma notificação com as três respostas. */
function MiniNotificacao() {
  const theme = useTheme();
  const botao = (rotulo: string, fundo: string, cor: string) => (
    <View style={{ flex: 1, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: fundo }}>
      <ThemedText style={{ fontSize: 11, lineHeight: 14, fontFamily: FAMILIA_TEXTO[700], color: cor }}>{rotulo}</ThemedText>
    </View>
  );
  return (
    <View style={{ gap: 8, padding: 12, borderRadius: 14, backgroundColor: theme.surface }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 18, height: 18, borderRadius: 5, backgroundColor: theme.accent }} />
        <ThemedText type="caption" themeColor="textSecondary" style={{ flex: 1 }}>
          Tomei · agora
        </ThemedText>
      </View>
      <ThemedText style={{ fontSize: 14, lineHeight: 18, fontFamily: FAMILIA_TEXTO[700] }}>Hora de tomar Vitamina D</ThemedText>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {botao('Tomei agora', theme.accentSoft, theme.onAccentSoft)}
        {botao('Adiar', theme.surfaceMuted, theme.text)}
        {botao('Não tomar', theme.surfaceMuted, theme.text)}
      </View>
    </View>
  );
}

const DESTAQUES_ALARME: { icone: NomeIcone; texto: string }[] = [
  { icone: 'sino', texto: 'Toca até você agir' },
  { icone: 'cadeado', texto: 'Aparece na tela bloqueada' },
  { icone: 'relogio', texto: 'Volta a cada 30 min' },
];

/** Especial: a tela de alarme no tema "Noite", com o que ela faz ao lado. */
function MiniAlarme() {
  const theme = useTheme();
  const noite = PALETAS_ALARME.noite;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <View
        style={{
          width: 96,
          height: 150,
          borderRadius: 16,
          paddingTop: 12,
          paddingHorizontal: 8,
          paddingBottom: 8,
          alignItems: 'center',
          gap: 5,
          backgroundColor: noite.fundo,
        }}>
        <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: noite.disco, borderWidth: 3, borderColor: noite.destaque }} />
        <ThemedText numerico style={{ fontFamily: FAMILIA_TITULO[700], fontSize: 22, lineHeight: 24, color: noite.texto }}>
          08:00
        </ThemedText>
        <ThemedText style={{ fontSize: 9, lineHeight: 12, fontFamily: FAMILIA_TEXTO[700], color: noite.texto }}>Anticoncepcional</ThemedText>
        <View style={{ width: '100%', height: 16, borderRadius: 5, backgroundColor: noite.cartao }} />
        <View style={{ flex: 1 }} />
        <View
          style={{
            width: '100%',
            height: 20,
            borderRadius: 7,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: noite.destaque,
          }}>
          <ThemedText style={{ fontSize: 8, lineHeight: 10, fontFamily: FAMILIA_TEXTO[700], color: noite.onDestaque }}>Tomei agora</ThemedText>
        </View>
      </View>
      <View style={{ flex: 1, gap: 8 }}>
        {DESTAQUES_ALARME.map(({ icone, texto }) => (
          <View key={texto} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icone nome={icone} cor={theme.accent} tamanho={16} />
            <ThemedText type="caption" themeColor="textSecondary" style={{ flex: 1 }}>
              {texto}
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}
