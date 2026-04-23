import { Platform } from "react-native";

let NativeKiosk = null;

// On importe le module natif seulement sur Android
if (Platform.OS === "android") {
	try {
		const { requireNativeModule } = require("expo-modules-core");
		NativeKiosk = requireNativeModule("KioskModule");
	} catch (e) {
		console.warn("[KioskModule] Module natif non disponible (build dev ?):", e.message);
	}
}

/**
 * Démarre le Lock Task Mode (kiosk).
 * Nécessite que l'app soit Device Owner (voir README_KIOSK.md) ou whitelisted.
 */
export async function startLockTask() {
	if (Platform.OS !== "android" || !NativeKiosk) return;
	return NativeKiosk.startLockTask();
}

/**
 * Arrête le Lock Task Mode.
 * Appelé après validation du PIN administrateur.
 */
export async function stopLockTask() {
	if (Platform.OS !== "android" || !NativeKiosk) return;
	return NativeKiosk.stopLockTask();
}

/**
 * Retourne l'état courant du Lock Task Mode.
 * 0 = NONE, 1 = LOCKED, 2 = PINNED
 */
export function getLockTaskMode() {
	if (Platform.OS !== "android" || !NativeKiosk) return 0;
	return NativeKiosk.getLockTaskMode();
}

export const LOCK_TASK_MODE_NONE = 0;
export const LOCK_TASK_MODE_LOCKED = 1;
export const LOCK_TASK_MODE_PINNED = 2;
