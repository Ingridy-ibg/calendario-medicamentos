package expo.modules.alarmedose

import android.app.Activity
import android.app.NotificationManager
import android.content.Intent
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

class DadosAgendamento : Record {
  @Field
  val titulo: String = ""

  @Field
  val texto: String = ""

  @Field
  val link: String = ""
}

class ConfigRecord : Record {
  @Field
  val toque: String = Toques.PADRAO

  @Field
  val vibrar: Boolean = true

  @Field
  val crescente: Boolean = true
}

/**
 * API JS do alarme das doses especiais (alarme-tela-cheia, design.md,
 * decisão 1). O wrapper com a guarda de Expo Go fica em `src/lib/alarme-dose.ts`.
 */
class AlarmeDoseModule : Module() {
  private val context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private var escolhaPendente: Promise? = null

  override fun definition() = ModuleDefinition {
    Name("AlarmeDose")

    Function("agendar") { id: String, epochMs: Double, dados: DadosAgendamento ->
      Alarmes.agendar(context, DadosAlarme(id, dados.titulo, dados.texto, dados.link), epochMs.toLong())
    }

    Function("cancelar") { id: String ->
      Alarmes.cancelar(context, id)
      AlarmeService.encerrar(context, id)
    }

    Function("listarAgendados") {
      Alarmes.listarAgendados(context).map { mapOf("id" to it.dados.id, "epochMs" to it.epochMs.toDouble()) }
    }

    Function("consumirDisparos") {
      Alarmes.consumirDisparos(context).map { mapOf("id" to it.id, "epochMs" to it.epochMs.toDouble()) }
    }

    Function("silenciar") { id: String? ->
      AlarmeService.silenciar(id)
    }

    Function("configurar") { config: ConfigRecord ->
      Toques.gravarConfig(context, ConfigAlarme(config.toque, config.vibrar, config.crescente))
    }

    Function("tocarPrevia") { toque: String ->
      Toques.tocarPrevia(context, toque)
    }

    Function("pararPrevia") {
      Toques.pararPrevia()
    }

    AsyncFunction("escolherToqueDoAparelho") { atual: String?, promise: Promise ->
      val activity = appContext.currentActivity ?: throw Exceptions.MissingActivity()
      val intent = Intent(RingtoneManager.ACTION_RINGTONE_PICKER)
        .putExtra(RingtoneManager.EXTRA_RINGTONE_TYPE, RingtoneManager.TYPE_ALARM)
        .putExtra(RingtoneManager.EXTRA_RINGTONE_SHOW_SILENT, false)
        .putExtra(RingtoneManager.EXTRA_RINGTONE_SHOW_DEFAULT, false)
        .putExtra(RingtoneManager.EXTRA_RINGTONE_TITLE, "Toque do alarme")
      atual?.let { intent.putExtra(RingtoneManager.EXTRA_RINGTONE_EXISTING_URI, Uri.parse(it)) }
      escolhaPendente?.resolve(null)
      escolhaPendente = promise
      activity.startActivityForResult(intent, PEDIDO_TOQUE)
    }

    OnActivityResult { _, payload ->
      if (payload.requestCode != PEDIDO_TOQUE) return@OnActivityResult
      val promise = escolhaPendente ?: return@OnActivityResult
      escolhaPendente = null
      val uri = if (payload.resultCode == Activity.RESULT_OK) {
        @Suppress("DEPRECATION")
        payload.data?.getParcelableExtra<Uri>(RingtoneManager.EXTRA_RINGTONE_PICKED_URI)
      } else {
        null
      }
      if (uri == null) {
        promise.resolve(null)
      } else {
        val titulo = RingtoneManager.getRingtone(context, uri)?.getTitle(context) ?: "Toque do aparelho"
        promise.resolve(mapOf("uri" to uri.toString(), "titulo" to titulo))
      }
    }

    Function("permissoes") {
      val notificacoes = context.getSystemService(NotificationManager::class.java)
      mapOf(
        "alarmeExato" to Alarmes.podeAgendarExato(context),
        "telaCheia" to (Build.VERSION.SDK_INT < 34 || notificacoes.canUseFullScreenIntent()),
        "sobreOutrosApps" to Settings.canDrawOverlays(context),
      )
    }

    Function("abrirConfigTelaCheia") {
      if (Build.VERSION.SDK_INT >= 34) abrirConfiguracao(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT)
    }

    Function("abrirConfigAlarmeExato") {
      if (Build.VERSION.SDK_INT >= 31) abrirConfiguracao(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM)
    }

    Function("abrirConfigSobreOutrosApps") {
      abrirConfiguracao(Settings.ACTION_MANAGE_OVERLAY_PERMISSION)
    }

    Function("consumirAberturaPeloAlarme") {
      val aberto = AlarmeActivityListener.abertoPeloAlarme
      AlarmeActivityListener.abertoPeloAlarme = false
      aberto
    }

    Function("exibirSobreBloqueio") { ativo: Boolean ->
      AlarmeActivityListener.exibirSobreBloqueio(ativo)
    }
  }

  private fun abrirConfiguracao(acao: String) {
    val intent = Intent(acao, Uri.parse("package:${context.packageName}")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    (appContext.currentActivity ?: context).startActivity(intent)
  }

  private companion object {
    const val PEDIDO_TOQUE = 0x7A1B
  }
}
