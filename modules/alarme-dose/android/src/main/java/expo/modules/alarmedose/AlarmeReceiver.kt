package expo.modules.alarmedose

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.content.ContextCompat

/**
 * Recebe o disparo do `setAlarmClock`: registra o disparo no log, já rearma o
 * mesmo id para daqui a 30 min (o reenvio do especial continua com o app
 * fechado — alarme-tela-cheia, design.md, decisão 2) e inicia o serviço que
 * toca. Iniciar um serviço em primeiro plano a partir de um alarme exato é
 * uma das exceções permitidas pelo Android 12+.
 */
class AlarmeReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val dados = Alarmes.lerDados(intent) ?: return
    // Cancelado entre o agendamento e o disparo (ex.: confirmado pela agenda).
    if (!Alarmes.estaAgendado(context, dados.id)) return

    val agora = System.currentTimeMillis()
    Alarmes.registrarDisparo(context, Disparo(dados.id, agora))
    Alarmes.agendar(context, dados, agora + Alarmes.INTERVALO_REENVIO_MS)

    val servico = Alarmes.comDados(Intent(context, AlarmeService::class.java), dados)
      .setAction(AlarmeService.ACAO_TOCAR)
    ContextCompat.startForegroundService(context, servico)
  }
}

/**
 * Depois de um reinício o AlarmManager esquece tudo: rearma os alarmes
 * persistidos, sem depender de abrir o app (alarme-tela-cheia, design.md,
 * decisão 5). Também após uma atualização do app.
 */
class BootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    when (intent.action) {
      Intent.ACTION_BOOT_COMPLETED, Intent.ACTION_MY_PACKAGE_REPLACED -> Alarmes.rearmarTodos(context)
    }
  }
}
