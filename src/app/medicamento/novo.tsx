import { router } from 'expo-router';

import { FormularioMedicamento } from '@/components/medicamento/formulario-medicamento';
import { prepararCadastro } from '@/domain/medication-registration/registration';
import { useCadastroStore } from '@/state/cadastro-store';

/**
 * Cadastro: "Continuar" valida e leva a "Confira antes de salvar"; nada é
 * gravado aqui (register-ongoing-medication).
 */
export default function NovoMedicamentoScreen() {
  const definir = useCadastroStore((estado) => estado.definir);
  return (
    <FormularioMedicamento
      modo="cadastro"
      titulo="Novo medicamento"
      rotuloSalvar="Continuar"
      aoSalvar={(dados) => {
        definir(dados, prepararCadastro(dados, new Date()), { tipo: 'cadastro' });
        router.push('/medicamento/confirmar');
      }}
    />
  );
}
