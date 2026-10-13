import Storage from 'expo-sqlite/kv-store';

import type { AppDb } from '@/db/repositories/types';
import { definirInicioDosCiclicosSemData } from '@/domain/dose-scheduling/janela-rolante';
import { CHAVES_CORRECOES, deveAplicarCorrecao } from '@/domain/preferencias/correcoes';

/**
 * Correções de dados de versões anteriores, uma vez só (design.md, decisão 7):
 * hoje, a dos cíclicos que aguardavam nova cartela sem data, de antes de
 * inicio-de-cartela. Roda antes da renovação da janela, no layout raiz e na
 * tarefa periódica. A marca é gravada depois, e a correção é idempotente.
 */
export function aplicarCorrecoesUnicas(db: AppDb, agora: Date = new Date()): void {
  let marca: string | null = null;
  try {
    marca = Storage.getItemSync(CHAVES_CORRECOES.inicioCartelaSemData);
  } catch {
    marca = null;
  }
  if (!deveAplicarCorrecao(marca)) return;
  definirInicioDosCiclicosSemData(db, agora);
  Storage.setItemSync(CHAVES_CORRECOES.inicioCartelaSemData, '1');
}
