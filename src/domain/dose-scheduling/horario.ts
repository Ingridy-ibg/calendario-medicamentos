/** Combina um dia (a parte de data) com um horário "HH:mm" (hora local). */
export function combinarDataEHorario(dia: Date, horario: string): Date {
  const [horas, minutos] = horario.split(':').map(Number);
  const resultado = new Date(dia);
  resultado.setHours(horas, minutos, 0, 0);
  return resultado;
}
