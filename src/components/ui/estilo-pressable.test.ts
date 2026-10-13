import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const RAIZ = path.resolve(import.meta.dirname, '../..');

function arquivosTsx(diretorio: string): string[] {
  return readdirSync(diretorio).flatMap((nome) => {
    const caminho = path.join(diretorio, nome);
    if (statSync(caminho).isDirectory()) return arquivosTsx(caminho);
    return caminho.endsWith('.tsx') ? [caminho] : [];
  });
}

/**
 * O NativeWind envolve todo `Pressable` e trata `style` como objeto: um
 * `style={({ pressed }) => …}` nunca é chamado e o elemento perde fundo, borda
 * e raio (change fix-pressable-styles). Use `Tocavel` em vez disso.
 */
describe('Pressable sem estilo em forma de função', () => {
  it('nenhum .tsx em src/ usa style={({ … }) => …}', () => {
    const ofensores = arquivosTsx(RAIZ).flatMap((arquivo) =>
      readFileSync(arquivo, 'utf8')
        .split('\n')
        .flatMap((linha, indice) =>
          /style=\{\s*\(\s*\{/.test(linha) && !/^\s*(\*|\/\/)/.test(linha) ? [`${path.relative(RAIZ, arquivo)}:${indice + 1} — use Tocavel`] : [],
        ),
    );
    expect(ofensores).toEqual([]);
  });
});
