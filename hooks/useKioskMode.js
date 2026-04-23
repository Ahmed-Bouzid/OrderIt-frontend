import { useState, useEffect, useCallback, useRef } from "react";
import { Platform, AppState } from "react-native";
import * as SecureStore from "expo-secure-store";
import * as NavigationBar from "expo-navigation-bar";
import * as KioskModule from "../modules/kiosk-module";

const KIOSK_PIN_KEY = "kiosk_admin_pin";
const DEFAULT_PIN = "1234"; // À changer via setPin() après le premier démarrage
const CORNER_TAPS_REQUIRED = 5;
const CORNER_TAP_WINDOW_MS = 3000;

/**
 * Hook de gestion du Kiosk Mode (Lock Task Android).
 *
 * Usage :
 *   const { isLocked, pinModalVisible, handleCornerTap, unlock, setPin } = useKioskMode({ enabled: true });
 *
 * Prérequis matériel (une seule fois par tablette) :
 *   adb shell dpm set-device-owner com.sunnygo.dev/.DeviceAdminReceiver
 *
 * Sans Device Owner, startLockTask() s'ignore silencieusement —
 * la navigation bar reste masquée via expo-navigation-bar.
 */
export function useKioskMode({ enabled = false } = {}) {
	const [isLocked, setIsLocked] = useState(false);
	const [pinModalVisible, setPinModalVisible] = useState(false);
	const cornerTapCount = useRef(0);
	const cornerTapTimer = useRef(null);

	// --- Démarrage kiosk ---
	const startKiosk = useCallback(async () => {
		if (Platform.OS !== "android") return;
		try {
			await KioskModule.startLockTask();
			await NavigationBar.setVisibilityAsync("hidden");
			await NavigationBar.setBehaviorAsync("overlay-swipe");
			setIsLocked(true);
		} catch (e) {
			console.warn("[Kiosk] startLockTask:", e.message);
		}
	}, []);

	// --- Arrêt kiosk (après PIN validé) ---
	const stopKiosk = useCallback(async () => {
		if (Platform.OS !== "android") return;
		try {
			await KioskModule.stopLockTask();
			await NavigationBar.setVisibilityAsync("visible");
			setIsLocked(false);
		} catch (e) {
			console.warn("[Kiosk] stopLockTask:", e.message);
		}
	}, []);

	// --- Changer le PIN admin ---
	const setPin = useCallback(async (newPin) => {
		await SecureStore.setItemAsync(KIOSK_PIN_KEY, newPin);
	}, []);

	// --- Valider le PIN et déverrouiller ---
	const unlock = useCallback(
		async (enteredPin) => {
			const stored = (await SecureStore.getItemAsync(KIOSK_PIN_KEY)) ?? DEFAULT_PIN;
			if (enteredPin === stored) {
				setPinModalVisible(false);
				await stopKiosk();
				return true;
			}
			return false;
		},
		[stopKiosk],
	);

	// --- Geste secret : taper 5× dans le coin en moins de 3 secondes ---
	const handleCornerTap = useCallback(() => {
		cornerTapCount.current += 1;
		if (cornerTapTimer.current) clearTimeout(cornerTapTimer.current);

		if (cornerTapCount.current >= CORNER_TAPS_REQUIRED) {
			cornerTapCount.current = 0;
			setPinModalVisible(true);
		} else {
			cornerTapTimer.current = setTimeout(() => {
				cornerTapCount.current = 0;
			}, CORNER_TAP_WINDOW_MS);
		}
	}, []);

	// --- Démarrer au montage si enabled ---
	useEffect(() => {
		if (!enabled || Platform.OS !== "android") return;
		startKiosk();
	}, [enabled, startKiosk]);

	// --- Re-cacher la nav bar quand l'app repasse au premier plan ---
	useEffect(() => {
		if (!enabled || Platform.OS !== "android") return;
		const sub = AppState.addEventListener("change", (state) => {
			if (state === "active" && isLocked) {
				NavigationBar.setVisibilityAsync("hidden").catch(() => {});
			}
		});
		return () => sub.remove();
	}, [enabled, isLocked]);

	return {
		isLocked,
		pinModalVisible,
		setPinModalVisible,
		handleCornerTap,
		unlock,
		setPin,
		startKiosk,
		stopKiosk,
	};
}
