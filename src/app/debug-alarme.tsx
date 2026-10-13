import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Botao } from '@/components/ui/botao';
import {
  abrirConfigAlarmeExato,
  abrirConfigTelaCheia,
  agendarAlarme,
  alarmeDisponivel,
  cancelarAlarme,
  consumirDisparosDoAlarme,
  escolherToqueDoAparelho,
  exibirSobreBloqueio,
  listarAlarmesAgendados,
  pararPreviaDoToque,
  permissoesDoAlarme,
  silenciarAlarme,
  tocarPreviaDoToque,
} from '@/lib/alarme-dose';

/**
 * TEMPORÁRIA — spike da alarme-tela-cheia (tarefas 1.2 a 1.8): chama cada
 * função do módulo nativo para validar no aparelho. Aberta por um toque
 * longo no rodapé do Perfil. Sai quando a tela de alarme e a de
 * personalização estiverem validadas no aparelho (tarefa 5.2).
 */
export default function DebugAlarmeScreen() {
  const [aviso, setAviso] = useState('');
  const permissoes = permissoesDoAlarme();

  function agendarEm(id: string, segundos: number) {
    agendarAlarme(id, new Date(Date.now() + segundos * 1000), {
      titulo: 'Hora de tomar Anticoncepcional',
      texto: '1 comprimido',
      link: 'calendariomedicamentos://debug-alarme',
    });
    setAviso(`Alarme "${id}" agendado para daqui a ${segundos} s. Bloqueie o aparelho e espere.`);
  }

  function mostrar(titulo: string, valor: unknown) {
    setAviso(`${titulo}: ${JSON.stringify(valor)}`);
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
          <ThemedText type="display">Teste do alarme</ThemedText>
          {!alarmeDisponivel ? (
            <ThemedText>Módulo nativo indisponível (Expo Go ou fora do Android).</ThemedText>
          ) : (
            <>
              <ThemedText>Alarme exato: {permissoes.alarmeExato ? 'permitido' : 'NÃO permitido'}</ThemedText>
              <ThemedText>Tela cheia: {permissoes.telaCheia ? 'permitida' : 'NÃO permitida'}</ThemedText>
              {aviso ? <ThemedText themeColor="textSecondary">{aviso}</ThemedText> : null}
              <View style={{ gap: 10 }}>
                <Botao rotulo="Alarme A em 15 segundos" onPress={() => agendarEm('teste-a', 15)} />
                <Botao rotulo="Alarme B em 10 minutos" onPress={() => agendarEm('teste-b', 600)} />
                <Botao rotulo="Silenciar" variante="secundario" onPress={() => silenciarAlarme()} />
                <Botao rotulo="Cancelar A" variante="secundario" onPress={() => cancelarAlarme('teste-a')} />
                <Botao rotulo="Cancelar B" variante="secundario" onPress={() => cancelarAlarme('teste-b')} />
                <Botao rotulo="Listar agendados" variante="secundario" onPress={() => mostrar('Agendados', listarAlarmesAgendados())} />
                <Botao rotulo="Consumir disparos" variante="secundario" onPress={() => mostrar('Disparos', consumirDisparosDoAlarme())} />
                {(['alvorada', 'sino', 'digital', 'marimba'] as const).map((toque) => (
                  <Botao key={toque} rotulo={`Prévia: ${toque}`} variante="secundario" onPress={() => tocarPreviaDoToque(toque)} />
                ))}
                <Botao rotulo="Parar prévia" variante="secundario" onPress={() => pararPreviaDoToque()} />
                <Botao
                  rotulo="Escolher toque do aparelho"
                  variante="secundario"
                  onPress={async () => mostrar('Toque escolhido', await escolherToqueDoAparelho(null))}
                />
                <Botao rotulo="Config. tela cheia" variante="secundario" onPress={() => abrirConfigTelaCheia()} />
                <Botao rotulo="Config. alarme exato" variante="secundario" onPress={() => abrirConfigAlarmeExato()} />
                <Botao rotulo="Sair de cima do bloqueio" variante="secundario" onPress={() => exibirSobreBloqueio(false)} />
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
