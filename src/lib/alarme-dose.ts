import Constants from 'expo-constants';
import { Platform } from 'react-native';

import AlarmeDoseModule, {
  type AlarmeNativo,
  type ConfigAlarmeNativo,
  type DadosAgendamento,
  type ToqueDoAparelho,
} from '../../modules/alarme-dose/src/AlarmeDoseModule';

import { isExpoGo } from './expo-go';

export type { AlarmeNativo, ConfigAlarmeNativo, DadosAgendamento, ToqueDoAparelho };

/**
 * Alarme nativo das doses especiais (alarme-tela-cheia, design.md, decisão 1).
 * Fora de um build com o módulo (Expo Go, iOS, web) tudo vira no-op e as
 * permissões ficam "desconhecidas" (`null`), para o app abrir normalmente.
 */
const nativo = Platform.OS === 'android' && !isExpoGo ? AlarmeDoseModule : null;

export const alarmeDisponivel = nativo != null;

export interface PermissoesAlarmeOuDesconhecidas {
  alarmeExato: boolean | null;
  telaCheia: boolean | null;
}

export function agendarAlarme(id: string, data: Date, dados: DadosAgendamento): void {
  nativo?.agendar(id, data.getTime(), dados);
}

export function cancelarAlarme(id: string): void {
  nativo?.cancelar(id);
}

export function listarAlarmesAgendados(): AlarmeNativo[] {
  return nativo?.listarAgendados() ?? [];
}

/** Disparos ocorridos desde a última chamada (o log é limpo ao ler). */
export function consumirDisparosDoAlarme(): AlarmeNativo[] {
  return nativo?.consumirDisparos() ?? [];
}

export function silenciarAlarme(id: string | null = null): void {
  nativo?.silenciar(id);
}

export function configurarAlarme(config: ConfigAlarmeNativo): void {
  nativo?.configurar(config);
}

export function tocarPreviaDoToque(toque: string): void {
  nativo?.tocarPrevia(toque);
}

export function pararPreviaDoToque(): void {
  nativo?.pararPrevia();
}

export async function escolherToqueDoAparelho(atual: string | null): Promise<ToqueDoAparelho | null> {
  return nativo ? nativo.escolherToqueDoAparelho(atual) : null;
}

export function permissoesDoAlarme(): PermissoesAlarmeOuDesconhecidas {
  return nativo?.permissoes() ?? { alarmeExato: null, telaCheia: null };
}

export function abrirConfigTelaCheia(): void {
  nativo?.abrirConfigTelaCheia();
}

export function abrirConfigAlarmeExato(): void {
  nativo?.abrirConfigAlarmeExato();
}

/** Diz se a abertura atual veio de um alarme, e limpa a marca. Sempre `false` fora do Android nativo. */
export function consumirAberturaPeloAlarme(): boolean {
  return nativo?.consumirAberturaPeloAlarme() ?? false;
}

/** Link que a tela cheia e o aviso do alarme abrem: a rota `alarme/[doseId]`. */
export function linkDoAlarme(doseId: string): string {
  const esquema = Constants.expoConfig?.scheme;
  return `${typeof esquema === 'string' ? esquema : 'calendariomedicamentos'}://alarme/${doseId}`;
}

/** Id do alarme de "Testar alarme", que não é de nenhuma dose (o reconciliador o ignora). */
export const ID_ALARME_TESTE = 'teste-alarme';

export function exibirSobreBloqueio(ativo: boolean): void {
  nativo?.exibirSobreBloqueio(ativo);
}
