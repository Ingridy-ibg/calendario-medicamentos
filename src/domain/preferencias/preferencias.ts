/**
 * Regras puras das preferências locais do usuário (boas-vindas, nome e
 * aparência). A leitura/gravação no `expo-sqlite/kv-store` fica em
 * `src/lib/preferencias.ts`; aqui só a interpretação dos valores guardados.
 */

export const CHAVES_PREFERENCIAS = {
  boasVindasConcluida: 'boasVindasConcluida',
  nome: 'perfil.nome',
  aparencia: 'aparencia',
  ultimaSaudacao: 'saudacao.ultimaExibicao',
  telaCheiaPedida: 'permissao.telaCheiaPedida',
} as const;

/** specs/onboarding: a boas-vindas aparece até ser concluída uma vez. */
export function deveExibirBoasVindas(valorGuardado: string | null): boolean {
  return valorGuardado !== '1';
}

/** Nome vazio ou só com espaços conta como "sem nome" (specs/user-profile). */
export function normalizarNome(valor: string | null | undefined): string | null {
  const nome = (valor ?? '').replace(/\s+/g, ' ').trim();
  return nome.length > 0 ? nome : null;
}

/** Inicial exibida no botão de perfil; `null` quando não há nome (mostra o ícone de pessoa). */
export function inicialDoNome(nome: string | null): string | null {
  const normalizado = normalizarNome(nome);
  return normalizado ? normalizado.charAt(0).toLocaleUpperCase('pt-BR') : null;
}

export type Aparencia = 'sistema' | 'claro' | 'escuro';

export function lerAparencia(valorGuardado: string | null): Aparencia {
  return valorGuardado === 'claro' || valorGuardado === 'escuro' ? valorGuardado : 'sistema';
}

/** Valor para `Appearance.setColorScheme`: `'unspecified'` volta a seguir o sistema (RN 0.86). */
export function esquemaDaAparencia(aparencia: Aparencia): 'light' | 'dark' | 'unspecified' {
  if (aparencia === 'claro') return 'light';
  if (aparencia === 'escuro') return 'dark';
  return 'unspecified';
}

/** Datas são guardadas em ISO; valor ausente ou inválido vira `null` ("nunca"). */
export function lerDataGuardada(valor: string | null): Date | null {
  if (!valor) return null;
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? null : data;
}

/**
 * A permissão de tela cheia só é pedida no primeiro cadastro de um
 * medicamento especial (fix-cyclic-and-rolling-window, specs/dose-notifications).
 */
export function devePedirTelaCheia(criticidade: 'comum' | 'especial', valorGuardado: string | null): boolean {
  return criticidade === 'especial' && valorGuardado !== '1';
}
