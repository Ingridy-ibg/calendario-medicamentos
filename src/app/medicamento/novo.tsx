import { router } from 'expo-router';

import { FormularioMedicamento } from '@/components/medicamento/formulario-medicamento';
import { db } from '@/db/client';
import { cadastrarMedicamento } from '@/domain/medication-registration/registration';
import { aposSalvarMedicamento } from '@/lib/apos-salvar-medicamento';

export default function NovoMedicamentoScreen() {
  return (
    <FormularioMedicamento
      modo="cadastro"
      titulo="Novo medicamento"
      rotuloSalvar="Salvar medicamento"
      aoSalvar={(dados) => {
        cadastrarMedicamento(db, dados, new Date());
        aposSalvarMedicamento(dados.comuns.criticidade);
        router.back();
      }}
    />
  );
}
