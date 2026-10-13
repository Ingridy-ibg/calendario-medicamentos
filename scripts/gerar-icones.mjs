#!/usr/bin/env node

/**
 * Gera os PNGs de ícone e splash do app a partir do glifo do logo (cápsula
 * com metade preenchida) em `assets/brand/` (identidade-e-observacoes,
 * design.md). Rode de novo sempre que o logo mudar e commite os PNGs: o
 * build não depende do `sharp`.
 *
 *   node scripts/gerar-icones.mjs
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const destino = (nome) => path.join(raiz, 'assets/images', nome);

const VERDE = '#0E6B58';
const TAMANHO = 1024;

const glifo = await readFile(path.join(raiz, 'assets/brand/logo-glifo.svg'), 'utf8');
const logo = await readFile(path.join(raiz, 'assets/brand/logo.svg'), 'utf8');

/** O glifo ocupa ~57% do quadro — dentro da zona segura de 66% do ícone adaptativo. */
function glifoNaCor(cor) {
  return Buffer.from(glifo.replaceAll('#FFFFFF', cor));
}

function rasterizar(svg, tamanho = TAMANHO) {
  return sharp(svg, { density: (72 * tamanho) / 100 }).resize(tamanho, tamanho).png();
}

const saidas = [
  // Ícone único (aparelhos sem ícone adaptativo): quadrado cheio, sem cantos nem transparência.
  [
    'icon.png',
    sharp({ create: { width: TAMANHO, height: TAMANHO, channels: 4, background: VERDE } })
      .composite([{ input: await rasterizar(glifoNaCor('#FFFFFF')).toBuffer() }])
      .png(),
  ],
  ['android-icon-foreground.png', rasterizar(glifoNaCor('#FFFFFF'))],
  ['android-icon-background.png', sharp({ create: { width: TAMANHO, height: TAMANHO, channels: 4, background: VERDE } }).png()],
  // Ícone temático (Android 13+): o sistema tinge a forma; só o alfa importa.
  ['android-icon-monochrome.png', rasterizar(glifoNaCor('#000000'))],
  ['splash-icon.png', rasterizar(glifoNaCor('#FFFFFF'))],
  ['favicon.png', rasterizar(Buffer.from(logo), 48)],
];

for (const [nome, imagem] of saidas) {
  await imagem.toFile(destino(nome));
  console.log(`assets/images/${nome}`);
}
