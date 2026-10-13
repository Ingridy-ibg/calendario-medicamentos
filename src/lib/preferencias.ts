import Storage from 'expo-sqlite/kv-store';
import { Appearance } from 'react-native';
import { create } from 'zustand';

import {
  CHAVES_ALARME,
  gravarToqueAlarme,
  lerLigadoPorPadrao,
  lerTemaAlarme,
  lerToqueAlarme,
  type PreferenciasAlarme,
  toqueParaNativo,
} from '@/domain/preferencias/alarme';
import {
  type Aparencia,
  CHAVES_PREFERENCIAS,
  deveExibirBoasVindas,
  devePedirTelaCheia,
  esquemaDaAparencia,
  lerAparencia,
  lerDataGuardada,
  normalizarNome,
} from '@/domain/preferencias/preferencias';

import { configurarAlarme } from './alarme-dose';

/**
 * Preferências locais (design.md, decisões 5, 8 e 9): guardadas no
 * `expo-sqlite/kv-store` — síncrono, então o layout raiz já lê tudo antes da
 * primeira renderização — e expostas num store Zustand para que o layout e as
 * telas reajam quando elas mudam (ex.: concluir a boas-vindas troca o guard
 * das rotas protegidas).
 */
interface PreferenciasState {
  boasVindasConcluida: boolean;
  nome: string | null;
  aparencia: Aparencia;
  /** Grava a flag sem liberar as rotas ainda — usada antes dos pedidos de permissão. */
  gravarBoasVindasConcluida: () => void;
  concluirBoasVindas: () => void;
  definirNome: (nome: string) => void;
  definirAparencia: (aparencia: Aparencia) => void;
  /** Alarme dos especiais (alarme-tela-cheia): vale a partir do próximo alarme. */
  alarme: PreferenciasAlarme;
  definirAlarme: (mudanca: Partial<PreferenciasAlarme>) => void;
}

function lerItem(chave: string): string | null {
  try {
    return Storage.getItemSync(chave);
  } catch {
    return null;
  }
}

function lerPreferenciasAlarme(): PreferenciasAlarme {
  return {
    tema: lerTemaAlarme(lerItem(CHAVES_ALARME.tema)),
    toque: lerToqueAlarme(lerItem(CHAVES_ALARME.toque)),
    vibrar: lerLigadoPorPadrao(lerItem(CHAVES_ALARME.vibrar)),
    crescente: lerLigadoPorPadrao(lerItem(CHAVES_ALARME.crescente)),
  };
}

/** O serviço nativo não lê o kv-store: cada mudança é repassada a ele (design.md, decisão 6). */
function repassarAoAlarme(alarme: PreferenciasAlarme): void {
  configurarAlarme({ toque: toqueParaNativo(alarme.toque), vibrar: alarme.vibrar, crescente: alarme.crescente });
}

/**
 * `Appearance.setColorScheme` só existe no app nativo: na renderização
 * estática da web (Node, no `expo export`) ela não existe e quebraria o
 * export (fix-revisao-inicio-de-cartela).
 */
function aplicarEsquema(aparencia: Aparencia): void {
  if (typeof Appearance.setColorScheme === 'function') Appearance.setColorScheme(esquemaDaAparencia(aparencia));
}

export const usePreferencias = create<PreferenciasState>((set, get) => ({
  boasVindasConcluida: !deveExibirBoasVindas(lerItem(CHAVES_PREFERENCIAS.boasVindasConcluida)),
  nome: normalizarNome(lerItem(CHAVES_PREFERENCIAS.nome)),
  aparencia: lerAparencia(lerItem(CHAVES_PREFERENCIAS.aparencia)),

  gravarBoasVindasConcluida: () => {
    Storage.setItemSync(CHAVES_PREFERENCIAS.boasVindasConcluida, '1');
  },

  concluirBoasVindas: () => {
    Storage.setItemSync(CHAVES_PREFERENCIAS.boasVindasConcluida, '1');
    // O dia do primeiro uso conta como já saudado: a saudação só aparece a
    // partir da próxima abertura em outro dia (specs/daily-greeting).
    gravarUltimaSaudacao(new Date());
    set({ boasVindasConcluida: true });
  },

  definirNome: (valor) => {
    const nome = normalizarNome(valor);
    if (nome) Storage.setItemSync(CHAVES_PREFERENCIAS.nome, nome);
    else Storage.removeItemSync(CHAVES_PREFERENCIAS.nome);
    set({ nome });
  },

  definirAparencia: (aparencia) => {
    Storage.setItemSync(CHAVES_PREFERENCIAS.aparencia, aparencia);
    aplicarEsquema(aparencia);
    set({ aparencia });
  },

  alarme: lerPreferenciasAlarme(),

  definirAlarme: (mudanca) => {
    const alarme = { ...get().alarme, ...mudanca };
    Storage.setItemSync(CHAVES_ALARME.tema, alarme.tema);
    Storage.setItemSync(CHAVES_ALARME.toque, gravarToqueAlarme(alarme.toque));
    Storage.setItemSync(CHAVES_ALARME.vibrar, alarme.vibrar ? '1' : '0');
    Storage.setItemSync(CHAVES_ALARME.crescente, alarme.crescente ? '1' : '0');
    repassarAoAlarme(alarme);
    set({ alarme });
  },
}));

/** Na abertura do app, garante que o módulo nativo tem as preferências atuais. */
export function sincronizarPreferenciasDoAlarme(): void {
  repassarAoAlarme(usePreferencias.getState().alarme);
}

/** Lida no topo do layout raiz, antes de qualquer tela, para a splash já abrir no tema certo. */
export function aplicarAparenciaSalva(): void {
  aplicarEsquema(usePreferencias.getState().aparencia);
}

/** Data da última tela de saudação exibida (add-daily-greeting). */
export function lerUltimaSaudacao(): Date | null {
  return lerDataGuardada(lerItem(CHAVES_PREFERENCIAS.ultimaSaudacao));
}

export function gravarUltimaSaudacao(agora: Date): void {
  Storage.setItemSync(CHAVES_PREFERENCIAS.ultimaSaudacao, agora.toISOString());
}

/** Diz se deve pedir a permissão de tela cheia agora e já marca como pedida. */
export function consumirPedidoTelaCheia(criticidade: 'comum' | 'especial'): boolean {
  if (!devePedirTelaCheia(criticidade, lerItem(CHAVES_PREFERENCIAS.telaCheiaPedida))) return false;
  Storage.setItemSync(CHAVES_PREFERENCIAS.telaCheiaPedida, '1');
  return true;
}
