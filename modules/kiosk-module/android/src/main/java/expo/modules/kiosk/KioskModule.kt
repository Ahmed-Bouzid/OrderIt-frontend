package expo.modules.kiosk

import android.app.ActivityManager
import android.content.Context
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class KioskModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("KioskModule")

        // Démarre le Lock Task Mode
        // Fonctionne en mode kiosk si l'app est Device Owner ou whitelisted
        AsyncFunction("startLockTask") {
            val activity = appContext.activityProvider?.currentActivity
                ?: throw Exception("Activity non disponible")
            activity.runOnUiThread {
                try {
                    activity.startLockTask()
                } catch (e: Exception) {
                    // Silently fail si pas Device Owner — l'app fonctionne quand même
                }
            }
        }

        // Arrête le Lock Task Mode (appelé après validation PIN)
        AsyncFunction("stopLockTask") {
            val activity = appContext.activityProvider?.currentActivity
                ?: throw Exception("Activity non disponible")
            activity.runOnUiThread {
                try {
                    activity.stopLockTask()
                } catch (e: Exception) {
                    // Silently fail
                }
            }
        }

        // Retourne l'état courant du Lock Task Mode
        // LOCK_TASK_MODE_NONE=0, LOCK_TASK_MODE_LOCKED=1, LOCK_TASK_MODE_PINNED=2
        Function("getLockTaskMode") {
            val am = appContext.reactContext
                ?.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager
            am?.lockTaskModeState ?: 0
        }
    }
}
