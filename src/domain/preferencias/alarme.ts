/**
 * Preferências do alarme dos especiais (alarme-tela-cheia, design.md,
 * decisão 6; specs/user-profile, "Personalização do alarme dos especiais").
 * Aqui só a interpretação dos valores guardados; a leitura/gravação no
 * kv-store e o repasse ao módulo nativo ficam em `src/lib/preferencias.ts`.
 */

export const CHAVES_ALARME = {
  tema: 'alarme.tema',
  toque: 'alarme.toque',
  vibrar: 'alarme.vibrar',
  crescente: 'alarme.crescente',
} as const;

export const TEMAS_ALARME = ['noite', 'verde', 'claro', 'aurora'] as const;
export type TemaAlarme = (typeof TEMAS_ALARME)[number];

export const NOMES_TEMAS_ALARME: Record<TemaAlarme, string> = {
  noite: 'Noite',
  verde: 'Verde',
  claro: 'Claro',
  aurora: 'Aurora',
};

export const TOQUES_DO_APP = [
  { id: 'alvorada', nome: 'Alvorada', descricao: 'Melodia que sobe · padrão' },
  { id: 'sino', nome: 'Sino suave', descricao: 'Calmo, bom para de manhã' },
  { id: 'digital', nome: 'Bipe digital', descricao: 'Curto e repetido, difícil de ignorar' },
  { id: 'marimba', nome: 'Marimba', descricao: 'Ritmado e leve' },
] as const;
export type ToqueDoApp = (typeof TOQUES_DO_APP)[number]['id'];

/** Um toque do app ou um toque de alarme do aparelho (`uri` do `RingtoneManager`). */
export type ToqueAlarme = { tipo: 'app'; id: ToqueDoApp } | { tipo: 'aparelho'; uri: string; titulo: string };

export interface PreferenciasAlarme {
  tema: TemaAlarme;
  toque: ToqueAlarme;
  vibrar: boolean;
  crescente: boolean;
}

export const TOQUE_PADRAO: ToqueAlarme = { tipo: 'app', id: 'alvorada' };

export function lerTemaAlarme(valor: string | null): TemaAlarme {
  return (TEMAS_ALARME as readonly string[]).includes(valor ?? '') ? (valor as TemaAlarme) : 'noite';
}

/**
 * Toque do app guardado pelo id; do aparelho, como JSON com `uri` e `titulo`
 * (o título é o que o Perfil mostra). Valor ausente ou inválido vira Alvorada.
 */
export function lerToqueAlarme(valor: string | null): ToqueAlarme {
  if (!valor) return TOQUE_PADRAO;
  const doApp = TOQUES_DO_APP.find((t) => t.id === valor);
  if (doApp) return { tipo: 'app', id: doApp.id };
  try {
    const salvo = JSON.parse(valor) as { uri?: unknown; titulo?: unknown };
    if (typeof salvo.uri === 'string' && salvo.uri) {
      return { tipo: 'aparelho', uri: salvo.uri, titulo: typeof salvo.titulo === 'string' ? salvo.titulo : 'Toque do aparelho' };
    }
  } catch {
    // valor antigo ou corrompido: cai no padrão
  }
  return TOQUE_PADRAO;
}

export function gravarToqueAlarme(toque: ToqueAlarme): string {
  return toque.tipo === 'app' ? toque.id : JSON.stringify({ uri: toque.uri, titulo: toque.titulo });
}

/** Vibrar e volume crescente vêm ligados por padrão; só `'0'` desliga. */
export function lerLigadoPorPadrao(valor: string | null): boolean {
  return valor !== '0';
}

export function nomeDoToque(toque: ToqueAlarme): string {
  return toque.tipo === 'aparelho' ? toque.titulo : (TOQUES_DO_APP.find((t) => t.id === toque.id)?.nome ?? 'Alvorada');
}

/** O valor que o módulo nativo entende: o id do toque do app ou `aparelho:<uri>`. */
export function toqueParaNativo(toque: ToqueAlarme): string {
  return toque.tipo === 'app' ? toque.id : `aparelho:${toque.uri}`;
}

/** Resumo do card "Alarme dos especiais" no Perfil, ex.: "Alvorada · Noite · vibração ligada". */
export function resumoDoAlarme(preferencias: PreferenciasAlarme): string {
  return [
    nomeDoToque(preferencias.toque),
    NOMES_TEMAS_ALARME[preferencias.tema],
    preferencias.vibrar ? 'vibração ligada' : 'sem vibração',
  ].join(' · ');
}
