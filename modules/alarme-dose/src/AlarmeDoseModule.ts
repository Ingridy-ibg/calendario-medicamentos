import { NativeModule, requireOptionalNativeModule } from 'expo';

export interface PermissoesAlarme {
  alarmeExato: boolean;
  telaCheia: boolean;
  sobreOutrosApps: boolean;
}

export interface DadosAgendamento {
  titulo: string;
  texto: string;
  /** Link que a tela cheia e a notificação abrem (ex.: `calendariomedicamentos://alarme/<doseId>`). */
  link: string;
}

export interface AlarmeNativo {
  id: string;
  epochMs: number;
}

export interface ConfigAlarmeNativo {
  /** `alvorada` | `sino` | `digital` | `marimba` | `aparelho:<uri>`. */
  toque: string;
  vibrar: boolean;
  crescente: boolean;
}

export interface ToqueDoAparelho {
  uri: string;
  titulo: string;
}

declare class AlarmeDoseModule extends NativeModule {
  agendar(id: string, epochMs: number, dados: DadosAgendamento): void;
  cancelar(id: string): void;
  listarAgendados(): AlarmeNativo[];
  consumirDisparos(): AlarmeNativo[];
  silenciar(id: string | null): void;
  configurar(config: ConfigAlarmeNativo): void;
  tocarPrevia(toque: string): void;
  pararPrevia(): void;
  escolherToqueDoAparelho(atual: string | null): Promise<ToqueDoAparelho | null>;
  permissoes(): PermissoesAlarme;
  abrirConfigTelaCheia(): void;
  abrirConfigAlarmeExato(): void;
  abrirConfigSobreOutrosApps(): void;
  consumirAberturaPeloAlarme(): boolean;
  exibirSobreBloqueio(ativo: boolean): void;
}

/** Módulo nativo só de Android (alarme-tela-cheia); `null` no Expo Go, no iOS e na web. */
export default requireOptionalNativeModule<AlarmeDoseModule>('AlarmeDose');
