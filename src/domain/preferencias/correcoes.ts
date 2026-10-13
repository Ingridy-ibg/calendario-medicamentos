/**
 * Correções de dados que rodam uma vez só, marcadas no kv-store
 * (fix-revisao-inicio-de-cartela, design.md, decisão 7). A execução fica em
 * `src/lib/correcoes-unicas.ts`; aqui só a regra da marca.
 */
export const CHAVES_CORRECOES = {
  inicioCartelaSemData: 'correcao.inicioCartelaSemData',
} as const;

/** A correção ainda não rodou: a marca é gravada só depois de ela terminar. */
export function deveAplicarCorrecao(valorGuardado: string | null): boolean {
  return valorGuardado !== '1';
}
