package expo.modules.alarmedose

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import expo.modules.core.interfaces.Package
import expo.modules.core.interfaces.ReactActivityLifecycleListener
import java.lang.ref.WeakReference

class AlarmeDosePackage : Package {
  override fun createReactActivityLifecycleListeners(activityContext: Context?): List<ReactActivityLifecycleListener> =
    listOf(AlarmeActivityListener)
}

/**
 * Quando o app é aberto por um alarme (full-screen intent ou toque na
 * notificação), a Activity passa a aparecer sobre a tela de bloqueio e acende
 * a tela — sem isso, o Android a abriria escondida atrás do bloqueio.
 */
internal object AlarmeActivityListener : ReactActivityLifecycleListener {
  private var activity = WeakReference<Activity>(null)

  /** A última abertura veio de um alarme; o app consome para não mostrar a saudação por cima. */
  @Volatile
  var abertoPeloAlarme = false

  override fun onCreate(activity: Activity?, savedInstanceState: Bundle?) {
    this.activity = WeakReference(activity)
    aplicar(activity, activity?.intent)
  }

  override fun onResume(activity: Activity?) {
    // A tela abriu: a janela-ponte do Android 15+ já pode sair.
    AlarmeService.telaExibida()
  }

  override fun onNewIntent(intent: Intent?): Boolean {
    aplicar(activity.get(), intent)
    return false
  }

  override fun onDestroy(activity: Activity?) {
    if (this.activity.get() === activity) this.activity = WeakReference(null)
  }

  /** Volta ao normal quando a tela de alarme fecha (chamado pelo módulo). */
  fun exibirSobreBloqueio(ativo: Boolean) {
    val atual = activity.get() ?: return
    atual.runOnUiThread { definirSobreBloqueio(atual, ativo) }
  }

  private fun aplicar(activity: Activity?, intent: Intent?) {
    if (intent?.getBooleanExtra(Alarmes.EXTRA_ABERTO_PELO_ALARME, false) != true) return
    abertoPeloAlarme = true
    if (activity != null) definirSobreBloqueio(activity, true)
  }

  private fun definirSobreBloqueio(activity: Activity, ativo: Boolean) {
    if (Build.VERSION.SDK_INT >= 27) {
      activity.setShowWhenLocked(ativo)
      activity.setTurnScreenOn(ativo)
    } else {
      @Suppress("DEPRECATION")
      val flags = WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
      if (ativo) activity.window.addFlags(flags) else activity.window.clearFlags(flags)
    }
  }
}
