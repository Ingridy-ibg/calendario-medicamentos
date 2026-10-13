import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Botao } from '@/components/ui/botao';
import { Icone } from '@/components/ui/icone';
import { Tocavel } from '@/components/ui/tocavel';
import { FAMILIA_TEXTO, FAMILIA_TITULO } from '@/constants/fontes';
import { db } from '@/db/client';
import { buscarMedicamentoPorId } from '@/db/repositories/medicamentos';
import { validarQuantidadeCompra } from '@/domain/medication-management/gestao';
import { reporEstoque } from '@/domain/medication-stock/estoque';
import { useTheme } from '@/hooks/use-theme';

/**
 * Registrar compra (specs/medication-stock): sugere uma embalagem, aceita
 * outra quantidade inteira positiva e soma ao estoque. Apresentada como folha.
 */
export default function RegistrarCompraScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [medicamento] = useState(() => buscarMedicamentoPorId(db, id));
  const porEmbalagem = medicamento?.quantidadePorEmbalagem ?? 1;
  const [texto, setTexto] = useState(String(porEmbalagem));

  if (!medicamento) return <ThemedView style={{ flex: 1 }} />;

  const validacao = validarQuantidadeCompra(texto);
  const atual = Number.parseInt(texto, 10);
  const definir = (valor: number) => setTexto(String(Math.max(0, valor)));

  function adicionar() {
    if (!validacao.ok) return;
    reporEstoque(db, medicamento!.id, validacao.quantidade);
    router.back();
  }

  const botaoPasso = (rotulo: string, icone: 'menos' | 'mais', delta: number) => (
    <Tocavel
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      onPress={() => definir((Number.isNaN(atual) ? 0 : atual) + delta)}
      style={{ width: 52, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surfaceMuted }}>
      <Icone nome={icone} cor={theme.text} tamanho={22} />
    </Tocavel>
  );

  return (
    <ThemedView style={{ flex: 1, backgroundColor: theme.surface }}>
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <View style={{ padding: 20, gap: 18 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <ThemedText accessibilityRole="header" style={{ fontFamily: FAMILIA_TITULO[700], fontSize: 26, lineHeight: 30 }}>
                Registrar compra
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {medicamento.nome} {medicamento.dosagem} · embalagem com {porEmbalagem}
              </ThemedText>
            </View>
            <Tocavel
              accessibilityRole="button"
              accessibilityLabel="Fechar"
              onPress={() => router.back()}
              style={{ width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surfaceMuted }}>
              <Icone nome="fechar" cor={theme.text} tamanho={20} />
            </Tocavel>
          </View>

          <View style={{ gap: 8 }}>
            <ThemedText type="smallBold">Unidades compradas</ThemedText>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                padding: 4,
                borderRadius: 16,
                borderWidth: validacao.ok ? 1.5 : 2,
                borderColor: validacao.ok ? theme.border : theme.statusPerdida,
              }}>
              {botaoPasso('Diminuir', 'menos', -1)}
              <TextInput
                accessibilityLabel="Unidades compradas"
                value={texto}
                onChangeText={setTexto}
                keyboardType="number-pad"
                style={{
                  flex: 1,
                  minHeight: 52,
                  textAlign: 'center',
                  color: theme.text,
                  fontFamily: FAMILIA_TITULO[700],
                  fontSize: 30,
                  fontVariant: ['tabular-nums'],
                }}
              />
              {botaoPasso('Aumentar', 'mais', 1)}
            </View>
            {!validacao.ok ? (
              <ThemedText type="small" themeColor="statusPerdida" accessibilityRole="alert">
                {validacao.erro}
              </ThemedText>
            ) : null}
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[1, 2, 3].map((caixas) => {
              const ativo = atual === porEmbalagem * caixas;
              return (
                <Tocavel
                  key={caixas}
                  accessibilityRole="button"
                  accessibilityState={{ selected: ativo }}
                  onPress={() => definir(porEmbalagem * caixas)}
                  style={{
                    flex: 1,
                    minHeight: 60,
                    borderRadius: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 2,
                    borderWidth: ativo ? 0 : 1.5,
                    borderColor: theme.border,
                    backgroundColor: ativo ? theme.inverseSurface : theme.surface,
                  }}>
                  <ThemedText style={{ fontFamily: FAMILIA_TEXTO[700], fontSize: 15, color: ativo ? theme.onInverse : theme.text }}>
                    {caixas === 1 ? '1 caixa' : `${caixas} caixas`}
                  </ThemedText>
                  <ThemedText type="caption" style={{ color: ativo ? theme.onInverseSecondary : theme.textSecondary }}>
                    {porEmbalagem * caixas} un.
                  </ThemedText>
                </Tocavel>
              );
            })}
          </View>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 14,
              borderRadius: 14,
              backgroundColor: theme.background,
            }}>
            <ThemedText type="small" themeColor="textSecondary">
              Estoque depois da compra
            </ThemedText>
            <ThemedText numerico style={{ fontFamily: FAMILIA_TEXTO[700] }}>
              <ThemedText themeColor="textSecondary">{medicamento.quantidadeEmEstoque} → </ThemedText>
              {validacao.ok ? medicamento.quantidadeEmEstoque + validacao.quantidade : medicamento.quantidadeEmEstoque} un.
            </ThemedText>
          </View>

          <Botao rotulo="Adicionar ao estoque" tamanho="grande" disabled={!validacao.ok} onPress={adicionar} />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}
