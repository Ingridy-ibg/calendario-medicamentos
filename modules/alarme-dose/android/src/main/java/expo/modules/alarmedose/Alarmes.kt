package expo.modules.alarmedose

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import org.json.JSONArray
import org.json.JSONObject

/** Dados de um alarme: o que a notificação mostra e o link que abre a tela de alarme do app. */
internal data class DadosAlarme(val id: String, val titulo: String, val texto: String, val link: String)

/** Um alarme persistido: os dados e o horário em que vai disparar. */
internal data class AlarmeAgendado(val dados: DadosAlarme, val epochMs: Long)

/** Um disparo ocorrido, ainda não consumido pelo reconciliador do app (`consumirDisparos`). */
internal data class Disparo(val id: String, val epochMs: Long)

/**
 * Agendamento dos alarmes das doses especiais com `AlarmManager.setAlarmClock`:
 * a API de alarmes que o usuário espera, que dispara no horário exato mesmo
 * no Doze (alarme-tela-cheia, design.md, decisão 2).
 *
 * Cada alarme agendado fica também em SharedPreferences: é o que o
 * `BootReceiver` rearma depois de um reinício, o que `listarAgendados`
 * devolve ao reconciliador e o que o receiver confere antes de tocar.
 */
internal object Alarmes {
  const val EXTRA_ID = "expo.modules.alarmedose.ID"
  const val EXTRA_TITULO = "expo.modules.alarmedose.TITULO"
  const val EXTRA_TEXTO = "expo.modules.alarmedose.TEXTO"
  const val EXTRA_LINK = "expo.modules.alarmedose.LINK"

  /** Marca o Intent que abre o app a partir de um alarme — ver `AlarmeActivityListener`. */
  const val EXTRA_ABERTO_PELO_ALARME = "expo.modules.alarmedose.ABERTO_PELO_ALARME"

  /** Reenvio do especial sem resposta (specs/dose-notifications) — o mesmo `INTERVALO_REENVIO_MINUTOS` do app. */
  const val INTERVALO_REENVIO_MS = 30 * 60 * 1000L

  private const val ACAO_DISPARAR = "expo.modules.alarmedose.DISPARAR"
  private const val ARQUIVO = "expo.modules.alarmedose"
  private const val CHAVE_AGENDADOS = "agendados"
  private const val CHAVE_DISPAROS = "disparos"

  fun podeAgendarExato(context: Context): Boolean {
    val alarmManager = context.getSystemService(AlarmManager::class.java)
    return android.os.Build.VERSION.SDK_INT < 31 || alarmManager.canScheduleExactAlarms()
  }

  /** Agenda (ou reagenda, se o id já existe) e persiste. */
  fun agendar(context: Context, dados: DadosAlarme, epochMs: Long) {
    armar(context, dados, epochMs)
    val agendados = lerAgendados(context).filterKeys { it != dados.id } + (dados.id to AlarmeAgendado(dados, epochMs))
    gravarAgendados(context, agendados)
  }

  fun cancelar(context: Context, id: String) {
    val alarmManager = context.getSystemService(AlarmManager::class.java)
    pendingDisparo(context, DadosAlarme(id, "", "", ""), PendingIntent.FLAG_NO_CREATE)?.let {
      alarmManager.cancel(it)
      it.cancel()
    }
    gravarAgendados(context, lerAgendados(context) - id)
  }

  fun listarAgendados(context: Context): List<AlarmeAgendado> = lerAgendados(context).values.toList()

  fun estaAgendado(context: Context, id: String): Boolean = lerAgendados(context).containsKey(id)

  /** Rearma no AlarmManager tudo o que está persistido (boot). Horários já passados disparam na hora. */
  fun rearmarTodos(context: Context) {
    for (alarme in lerAgendados(context).values) armar(context, alarme.dados, alarme.epochMs)
  }

  fun registrarDisparo(context: Context, disparo: Disparo) {
    val prefs = prefs(context)
    val lista = JSONArray(prefs.getString(CHAVE_DISPAROS, "[]"))
    lista.put(JSONObject().put("id", disparo.id).put("epochMs", disparo.epochMs))
    prefs.edit().putString(CHAVE_DISPAROS, lista.toString()).apply()
  }

  /** Devolve e limpa o log de disparos (alarme-tela-cheia, design.md, decisão 4). */
  @Synchronized
  fun consumirDisparos(context: Context): List<Disparo> {
    val prefs = prefs(context)
    val lista = JSONArray(prefs.getString(CHAVE_DISPAROS, "[]"))
    prefs.edit().remove(CHAVE_DISPAROS).commit()
    return (0 until lista.length()).map {
      val item = lista.getJSONObject(it)
      Disparo(item.getString("id"), item.getLong("epochMs"))
    }
  }

  /** Intent que abre o app no link do alarme, marcado para aparecer sobre a tela de bloqueio. */
  fun intentAbrirApp(context: Context, dados: DadosAlarme, link: String = dados.link): Intent =
    Intent(Intent.ACTION_VIEW, Uri.parse(link)).apply {
      setPackage(context.packageName)
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
      putExtra(EXTRA_ID, dados.id)
      putExtra(EXTRA_ABERTO_PELO_ALARME, true)
    }

  fun pendingAbrirApp(context: Context, dados: DadosAlarme): PendingIntent =
    PendingIntent.getActivity(
      context,
      dados.id.hashCode(),
      intentAbrirApp(context, dados),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )

  /** "Tomei agora" da notificação: abre a tela de alarme com `acao=tomei`, que confirma direto. */
  fun pendingTomei(context: Context, dados: DadosAlarme): PendingIntent {
    val link = Uri.parse(dados.link).buildUpon().appendQueryParameter("acao", "tomei").build().toString()
    return PendingIntent.getActivity(
      context,
      dados.id.hashCode() + 1,
      intentAbrirApp(context, dados, link),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
  }

  fun lerDados(intent: Intent): DadosAlarme? {
    val id = intent.getStringExtra(EXTRA_ID) ?: return null
    return DadosAlarme(
      id = id,
      titulo = intent.getStringExtra(EXTRA_TITULO) ?: "",
      texto = intent.getStringExtra(EXTRA_TEXTO) ?: "",
      link = intent.getStringExtra(EXTRA_LINK) ?: "",
    )
  }

  fun comDados(intent: Intent, dados: DadosAlarme): Intent =
    intent
      .putExtra(EXTRA_ID, dados.id)
      .putExtra(EXTRA_TITULO, dados.titulo)
      .putExtra(EXTRA_TEXTO, dados.texto)
      .putExtra(EXTRA_LINK, dados.link)

  private fun armar(context: Context, dados: DadosAlarme, epochMs: Long) {
    val alarmManager = context.getSystemService(AlarmManager::class.java)
    val disparo = pendingDisparo(context, dados, PendingIntent.FLAG_UPDATE_CURRENT)!!
    // O ícone de alarme da barra de status leva direto à tela de alarme.
    val mostrar = pendingAbrirApp(context, dados)
    alarmManager.setAlarmClock(AlarmManager.AlarmClockInfo(epochMs, mostrar), disparo)
  }

  /** Um PendingIntent por id: a ação inclui o id para que alarmes diferentes não se sobrescrevam. */
  private fun pendingDisparo(context: Context, dados: DadosAlarme, flag: Int): PendingIntent? {
    val intent = comDados(Intent(context, AlarmeReceiver::class.java).setAction("$ACAO_DISPARAR.${dados.id}"), dados)
    return PendingIntent.getBroadcast(context, dados.id.hashCode(), intent, flag or PendingIntent.FLAG_IMMUTABLE)
  }

  fun prefs(context: Context) = context.getSharedPreferences(ARQUIVO, Context.MODE_PRIVATE)

  private fun lerAgendados(context: Context): Map<String, AlarmeAgendado> {
    val json = JSONObject(prefs(context).getString(CHAVE_AGENDADOS, "{}"))
    return json.keys().asSequence().associateWith { id ->
      val item = json.getJSONObject(id)
      AlarmeAgendado(
        DadosAlarme(id, item.optString("titulo"), item.optString("texto"), item.optString("link")),
        item.getLong("epochMs"),
      )
    }
  }

  private fun gravarAgendados(context: Context, agendados: Map<String, AlarmeAgendado>) {
    val json = JSONObject()
    for ((id, alarme) in agendados) {
      json.put(
        id,
        JSONObject()
          .put("epochMs", alarme.epochMs)
          .put("titulo", alarme.dados.titulo)
          .put("texto", alarme.dados.texto)
          .put("link", alarme.dados.link),
      )
    }
    prefs(context).edit().putString(CHAVE_AGENDADOS, json.toString()).commit()
  }
}
