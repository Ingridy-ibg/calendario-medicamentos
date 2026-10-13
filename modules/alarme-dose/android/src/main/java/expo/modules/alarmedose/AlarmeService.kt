package expo.modules.alarmedose

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.app.KeyguardManager
import android.content.pm.ServiceInfo
import android.graphics.PixelFormat
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.MediaPlayer
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.provider.Settings
import android.util.Log
import android.view.View
import android.view.WindowManager
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.app.ServiceCompat
import java.lang.ref.WeakReference

/**
 * Toca o alarme de uma dose especial: som em loop no volume de alarme
 * (USAGE_ALARM — toca mesmo no silencioso), vibração repetida e uma
 * notificação com full-screen intent que abre a tela de alarme do app sobre
 * o bloqueio (alarme-tela-cheia, design.md, decisão 2).
 *
 * Silenciar (pelo app, pela ação da notificação ou pelo limite de 5 min) para
 * o som e a vibração, mas deixa o aviso: a dose continua pendente e o
 * próximo disparo, 30 min depois, já está armado pelo receiver.
 */
class AlarmeService : Service() {
  companion object {
    const val ACAO_TOCAR = "expo.modules.alarmedose.TOCAR"
    const val ACAO_SILENCIAR = "expo.modules.alarmedose.SILENCIAR"
    const val CANAL = "alarme_especial"

    /** specs/dose-notifications: sem resposta, o som para depois de 5 min. */
    private const val LIMITE_MS = 5 * 60 * 1000L

    /** specs/user-profile: o volume crescente chega ao máximo em cerca de 30 s. */
    private const val SUBIDA_VOLUME_MS = 30_000L
    private const val PASSO_VOLUME_MS = 1_000L

    private var instancia = WeakReference<AlarmeService>(null)

    /** Id do alarme tocando agora; nulo quando nada toca. */
    @Volatile
    var idTocando: String? = null
      private set

    fun idNotificacao(id: String) = id.hashCode()

    /** Para o som do alarme `id` (ou de qualquer um, se nulo) mantendo o aviso. */
    fun silenciar(id: String?) {
      val servico = instancia.get() ?: return
      servico.handler.post { if (id == null || id == idTocando) servico.silenciarAtual() }
    }

    /** A Activity do app voltou ao primeiro plano: remove a janela-ponte, se houver. */
    fun telaExibida() {
      val servico = instancia.get() ?: return
      servico.handler.post { servico.removerJanelaPonte() }
    }

    /** Alarme cancelado (dose confirmada): para o som, se for o que toca, e tira o aviso. */
    fun encerrar(context: Context, id: String) {
      instancia.get()?.let { servico -> servico.handler.post { if (id == idTocando) servico.encerrarAtual() } }
      NotificationManagerCompat.from(context).cancel(idNotificacao(id))
    }
  }

  private val handler = Handler(Looper.getMainLooper())
  private var atual: DadosAlarme? = null
  private var player: MediaPlayer? = null
  private var vibrador: Vibrator? = null
  private var wakeLock: PowerManager.WakeLock? = null
  private var inicioMs = 0L
  private var janelaPonte: View? = null
  private val removerPonteDepois = Runnable { removerJanelaPonte() }

  private val limite = Runnable { silenciarAtual() }
  private val subirVolume = object : Runnable {
    override fun run() {
      val fracao = ((System.currentTimeMillis() - inicioMs).toFloat() / SUBIDA_VOLUME_MS).coerceIn(0.1f, 1f)
      player?.setVolume(fracao, fracao)
      if (fracao < 1f) handler.postDelayed(this, PASSO_VOLUME_MS)
    }
  }

  override fun onCreate() {
    super.onCreate()
    instancia = WeakReference(this)
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val dados = intent?.let { Alarmes.lerDados(it) }
    if (intent?.action == ACAO_SILENCIAR) {
      if (dados == null || dados.id == idTocando) silenciarAtual()
      if (atual == null) stopSelf()
      return START_NOT_STICKY
    }
    if (dados == null) {
      if (atual == null) pararServico(manterAviso = false)
      return START_NOT_STICKY
    }

    criarCanal(this)
    // Outro alarme tocando (doses especiais no mesmo horário): o anterior fica só como aviso.
    atual?.takeIf { it.id != dados.id }?.let { anterior ->
      pararSomEVibracao()
      avisar(anterior)
    }
    ServiceCompat.startForeground(
      this,
      idNotificacao(dados.id),
      notificacaoTocando(dados),
      if (Build.VERSION.SDK_INT >= 29) ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK else 0,
    )
    atual = dados
    idTocando = dados.id
    manterAcordado()
    val config = Toques.lerConfig(this)
    tocar(config)
    if (config.vibrar) vibrar()
    handler.removeCallbacks(limite)
    handler.postDelayed(limite, LIMITE_MS)
    abrirPorCimaSeEmUso(dados)
    return START_NOT_STICKY
  }

  /**
   * Celular desbloqueado e em uso: a full-screen intent só mostraria o aviso
   * flutuante, então a tela de alarme é aberta direto, por cima do app em uso
   * (design.md, decisão 10). Exige "Aparecer sobre outros apps". Com o
   * celular bloqueado quem abre é a full-screen intent — abrir aqui também
   * empilharia duas telas. Em ligação, nada por cima: fica o aviso.
   */
  private fun abrirPorCimaSeEmUso(dados: DadosAlarme) {
    if (!Settings.canDrawOverlays(this) || emLigacao()) return
    val bloqueado = getSystemService(KeyguardManager::class.java).isKeyguardLocked
    val telaLigada = getSystemService(PowerManager::class.java).isInteractive
    if (bloqueado || !telaLigada) return
    // Android 15+: a permissão só libera abrir uma tela com uma janela do app visível.
    if (Build.VERSION.SDK_INT >= 35) mostrarJanelaPonte()
    try {
      startActivity(Alarmes.intentAbrirApp(this, dados))
    } catch (erro: Exception) {
      Log.w("AlarmeDose", "Não foi possível abrir a tela de alarme por cima", erro)
      removerJanelaPonte()
    }
  }

  private fun emLigacao(): Boolean {
    val modo = getSystemService(AudioManager::class.java).mode
    return modo == AudioManager.MODE_IN_CALL || modo == AudioManager.MODE_IN_COMMUNICATION || modo == AudioManager.MODE_RINGTONE
  }

  /** Janela sobreposta transparente de 1 px, que não recebe toque, só enquanto a tela de alarme abre. */
  private fun mostrarJanelaPonte() {
    if (janelaPonte != null) return
    val parametros = WindowManager.LayoutParams(
      1,
      1,
      WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE,
      PixelFormat.TRANSLUCENT,
    )
    try {
      val vista = View(this)
      getSystemService(WindowManager::class.java).addView(vista, parametros)
      janelaPonte = vista
      handler.postDelayed(removerPonteDepois, 5_000)
    } catch (erro: Exception) {
      Log.w("AlarmeDose", "Não foi possível mostrar a janela-ponte", erro)
    }
  }

  private fun removerJanelaPonte() {
    handler.removeCallbacks(removerPonteDepois)
    val vista = janelaPonte ?: return
    janelaPonte = null
    try {
      getSystemService(WindowManager::class.java).removeView(vista)
    } catch (_: Exception) {
    }
  }

  override fun onDestroy() {
    removerJanelaPonte()
    pararSomEVibracao()
    idTocando = null
    atual = null
    if (instancia.get() === this) instancia = WeakReference(null)
    super.onDestroy()
  }

  private fun silenciarAtual() {
    val dados = atual ?: return
    pararSomEVibracao()
    pararServico(manterAviso = true)
    avisar(dados)
  }

  private fun encerrarAtual() {
    pararSomEVibracao()
    pararServico(manterAviso = false)
  }

  private fun pararServico(manterAviso: Boolean) {
    idTocando = null
    atual = null
    ServiceCompat.stopForeground(
      this,
      if (manterAviso) ServiceCompat.STOP_FOREGROUND_DETACH else ServiceCompat.STOP_FOREGROUND_REMOVE,
    )
    stopSelf()
  }

  /** Aviso silencioso que fica depois de silenciar: abre a tela de alarme e mantém o "Tomei agora". */
  private fun avisar(dados: DadosAlarme) {
    if (!NotificationManagerCompat.from(this).areNotificationsEnabled()) return
    try {
      NotificationManagerCompat.from(this).notify(idNotificacao(dados.id), base(dados).setSilent(true).build())
    } catch (_: SecurityException) {
    }
  }

  private fun base(dados: DadosAlarme) =
    NotificationCompat.Builder(this, CANAL)
      .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
      .setContentTitle(dados.titulo)
      .setContentText(dados.texto)
      .setPriority(NotificationCompat.PRIORITY_MAX)
      .setCategory(NotificationCompat.CATEGORY_ALARM)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setOngoing(true)
      .setAutoCancel(false)
      .setContentIntent(Alarmes.pendingAbrirApp(this, dados))
      .addAction(0, "Tomei agora", Alarmes.pendingTomei(this, dados))

  private fun notificacaoTocando(dados: DadosAlarme): Notification =
    base(dados)
      // Sem a permissão de tela cheia, o Android mostra só o aviso flutuante — o som continua (spec).
      .setFullScreenIntent(Alarmes.pendingAbrirApp(this, dados), true)
      .addAction(
        0,
        "Silenciar som",
        PendingIntent.getService(
          this,
          dados.id.hashCode() + 2,
          Alarmes.comDados(Intent(this, AlarmeService::class.java), dados).setAction(ACAO_SILENCIAR),
          PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        ),
      )
      .build()

  private fun tocar(config: ConfigAlarme) {
    pararSom()
    inicioMs = System.currentTimeMillis()
    player = Toques.criarPlayer(this, config.toque, loop = true)?.apply {
      if (config.crescente) setVolume(0.1f, 0.1f)
      start()
    }
    if (config.crescente) handler.post(subirVolume)
  }

  private fun vibrar() {
    val vibrador = if (Build.VERSION.SDK_INT >= 31) {
      getSystemService(VibratorManager::class.java).defaultVibrator
    } else {
      @Suppress("DEPRECATION")
      getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
    }
    this.vibrador = vibrador
    val padrao = longArrayOf(0, 500, 250, 500, 250, 500, 1000)
    val atributos = AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).build()
    @Suppress("DEPRECATION")
    if (Build.VERSION.SDK_INT >= 26) {
      vibrador.vibrate(VibrationEffect.createWaveform(padrao, 0), atributos)
    } else {
      vibrador.vibrate(padrao, 0, atributos)
    }
  }

  /** Mantém a CPU acordada enquanto toca, com o aparelho bloqueado e a tela apagada. */
  private fun manterAcordado() {
    if (wakeLock?.isHeld == true) return
    wakeLock = getSystemService(PowerManager::class.java)
      .newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "AlarmeDose::tocando")
      .apply { acquire(LIMITE_MS + 60_000L) }
  }

  private fun pararSom() {
    handler.removeCallbacks(subirVolume)
    player?.run {
      try {
        stop()
      } catch (_: IllegalStateException) {
      }
      release()
    }
    player = null
  }

  private fun pararSomEVibracao() {
    handler.removeCallbacks(limite)
    pararSom()
    vibrador?.cancel()
    vibrador = null
    wakeLock?.takeIf { it.isHeld }?.release()
    wakeLock = null
  }
}

/** Canal mudo: quem toca e vibra é o serviço, em loop (alarme-tela-cheia, design.md, decisão 8). */
internal fun criarCanal(context: Context) {
  if (Build.VERSION.SDK_INT < 26) return
  val gerenciador = context.getSystemService(NotificationManager::class.java)
  if (gerenciador.getNotificationChannel(AlarmeService.CANAL) != null) return
  val canal = NotificationChannel(AlarmeService.CANAL, "Alarme dos especiais", NotificationManager.IMPORTANCE_HIGH).apply {
    description = "Alarme em tela cheia das doses de medicamentos especiais."
    setSound(null, null)
    enableVibration(false)
    lockscreenVisibility = Notification.VISIBILITY_PUBLIC
    setBypassDnd(true)
  }
  gerenciador.createNotificationChannel(canal)
}
