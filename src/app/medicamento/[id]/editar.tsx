import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { FormularioMedicamento } from '@/components/medicamento/formulario-medicamento';
import { ThemedView } from '@/components/themed-view';
import { db } from '@/db/client';
import { listarEsquemasPorMedicamento } from '@/db/repositories/esquemas';
import { buscarMedicamentoPorId } from '@/db/repositories/medicamentos';
import { paraValoresFormulario } from '@/domain/medication-registration/formulario';
import { editarMedicamento } from '@/domain/medication-registration/registration';
import { aposSalvarMedicamento } from '@/lib/apos-salvar-medicamento';

/**
 * Edição de medicamento (specs/medication-registration): o mesmo formulário
 * do cadastro, já preenchido, com o tipo de esquema travado. Vale só para
 * doses futuras; fechar sem salvar não altera nada.
 */
export default function EditarMedicamentoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [inicial] = useState(() => {
    const medicamento = buscarMedicamentoPorId(db, id);
    const esquema = listarEsquemasPorMedicamento(db, id).find((linha) => linha.deletedAt === null);
    return medicamento && !medicamento.deletedAt && esquema ? { medicamento, valores: paraValoresFormulario(medicamento, esquema) } : null;
  });

  if (!inicial) return <ThemedView style={{ flex: 1 }} />;

  return (
    <FormularioMedicamento
      modo="edicao"
      valoresIniciais={inicial.valores}
      subtitulo={inicial.medicamento.nome}
      titulo="Editar medicamento"
      rotuloSalvar="Salvar alterações"
      aoSalvar={(dados) => {
        editarMedicamento(db, id, dados, new Date());
        aposSalvarMedicamento(dados.comuns.criticidade);
        router.back();
      }}
    />
  );
}
