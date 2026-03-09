/**
 * 🔒 useScreenProtection
 *
 * Hook de protection anti-screenshot / anti-screen-recording.
 *
 * - Android : active FLAG_SECURE via expo-screen-capture → bloque screenshot,
 *   screen recording et l'aperçu dans le multitâche.
 * - iOS : détecte UIApplication.userDidTakeScreenshotNotification et déclenche
 *   une callback pour flouter/masquer le contenu.
 *
 * Usage :
 *   const { isBlurred, clearBlur } = useScreenProtection({ enabled: true });
 *
 * Options :
 *   enabled        {boolean}  – Active/désactive la protection (défaut: true)
 *   blurOnCapture  {boolean}  – Floute le contenu sur iOS lors d'un screenshot (défaut: true)
 *   blurDuration   {number}   – Durée du blur en ms (défaut: 2000)
 *   onCapture      {function} – Callback optionnel appelé quand un screenshot est détecté
 *   protectionKey  {string}   – Clé unique (utile si plusieurs écrans actifs simultanément)
 */

import { useState, useEffect, useRef, useCallback } from "react";
import * as ScreenCapture from "expo-screen-capture";
import { Platform } from "react-native";

export function useScreenProtection({
	enabled = true,
	blurOnCapture = true,
	blurDuration = 2000,
	onCapture = null,
	protectionKey = "default",
} = {}) {
	const [isBlurred, setIsBlurred] = useState(false);
	const blurTimerRef = useRef(null);
	const listenerRef = useRef(null);

	// ─── Active / désactive FLAG_SECURE (Android) ───────────────────────────
	useEffect(() => {
		if (!enabled) return;

		ScreenCapture.preventScreenCaptureAsync(protectionKey).catch((err) => {
			// Silencieux en Expo Go (pas de module natif)
			if (__DEV__)
				console.warn("[ScreenProtection] preventScreenCapture:", err?.message);
		});

		return () => {
			ScreenCapture.allowScreenCaptureAsync(protectionKey).catch(() => {});
		};
	}, [enabled, protectionKey]);

	// ─── Écouteur screenshot iOS ─────────────────────────────────────────────
	useEffect(() => {
		if (!enabled || Platform.OS !== "ios") return;

		listenerRef.current = ScreenCapture.addScreenshotListener(() => {
			if (blurOnCapture) {
				setIsBlurred(true);
				if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
				blurTimerRef.current = setTimeout(
					() => setIsBlurred(false),
					blurDuration,
				);
			}
			if (onCapture) onCapture();
		});

		return () => {
			listenerRef.current?.remove();
			if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
		};
	}, [enabled, blurOnCapture, blurDuration, onCapture]);

	const clearBlur = useCallback(() => {
		if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
		setIsBlurred(false);
	}, []);

	return { isBlurred, clearBlur };
}
