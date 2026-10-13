package expo.modules.alarmedose

import android.content.ContentResolver
import android.content.Context
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.util.Log

/** Preferências do alarme gravadas pelo app via `configurar` — o serviço não lê o kv-store do JS. */
internal data class ConfigAlarme(val toque: String, val vibrar: Boolean, val crescente: Boolean)

/**
 * Toques do alarme (alarme-tela-cheia, design.md, decisões 6 e 7): os 4 do
 * app ficam em `res/raw`; um toque do aparelho é guardado como
 * `aparelho:<uri>`. Se a URI deixar de existir, volta para "Alvorada".
 */
internal object Toques {
  const val PADRAO = "alvorada"
  private const val TAG = "AlarmeDose"
  private const val DURACAO_PREVIA_MS = 5_000L
  private const val PREFIXO_APARELHO = "aparelho:"

  private val doApp = mapOf(
    "alvorada" to R.raw.toque_alvorada,
    "sino" to R.raw.toque_sino,
    "digital" to R.raw.toque_digital,
    "marimba" to R.raw.toque_marimba,
  )

  val atributosAlarme: AudioAttributes =
    AudioAttributes.Builder()
      .setUsage(AudioAttributes.USAGE_ALARM)
      .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
      .build()

  fun lerConfig(context: Context): ConfigAlarme {
    val prefs = Alarmes.prefs(context)
    return ConfigAlarme(
      toque = prefs.getString("config.toque", PADRAO) ?: PADRAO,
      vibrar = prefs.getBoolean("config.vibrar", true),
      crescente = prefs.getBoolean("config.crescente", true),
    )
  }

  fun gravarConfig(context: Context, config: ConfigAlarme) {
    Alarmes.prefs(context).edit()
      .putString("config.toque", config.toque)
      .putBoolean("config.vibrar", config.vibrar)
      .putBoolean("config.crescente", config.crescente)
      .apply()
  }

  private fun uriDoApp(context: Context, nome: String): Uri {
    val recurso = doApp[nome] ?: doApp.getValue(PADRAO)
    return Uri.parse("${ContentResolver.SCHEME_ANDROID_RESOURCE}://${context.packageName}/$recurso")
  }

  /** Cria um player em loop no volume de alarme, caindo para "Alvorada" se o toque não abrir. */
  fun criarPlayer(context: Context, toque: String, loop: Boolean): MediaPlayer? {
    val uri = if (toque.startsWith(PREFIXO_APARELHO)) Uri.parse(toque.removePrefix(PREFIXO_APARELHO)) else uriDoApp(context, toque)
    return abrir(context, uri, loop) ?: abrir(context, uriDoApp(context, PADRAO), loop)
  }

  private fun abrir(context: Context, uri: Uri, loop: Boolean): MediaPlayer? {
    val player = MediaPlayer()
    return try {
      player.setAudioAttributes(atributosAlarme)
      player.setDataSource(context, uri)
      player.isLooping = loop
      player.prepare()
      player
    } catch (erro: Exception) {
      Log.w(TAG, "Toque indisponível: $uri", erro)
      player.release()
      null
    }
  }

  // Prévia da tela de personalização: um toque por vez, para sozinha em 5 s.
  private val handler = Handler(Looper.getMainLooper())
  private var previa: MediaPlayer? = null
  private val pararPreviaDepois = Runnable { encerrarPrevia() }

  fun tocarPrevia(context: Context, toque: String) {
    handler.post {
      encerrarPrevia()
      previa = criarPlayer(context, toque, loop = true)?.apply { start() }
      handler.postDelayed(pararPreviaDepois, DURACAO_PREVIA_MS)
    }
  }

  fun pararPrevia() {
    handler.post { encerrarPrevia() }
  }

  private fun encerrarPrevia() {
    handler.removeCallbacks(pararPreviaDepois)
    previa?.run {
      try {
        stop()
      } catch (_: IllegalStateException) {
      }
      release()
    }
    previa = null
  }
}
