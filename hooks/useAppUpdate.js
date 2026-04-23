import { useState, useEffect, useCallback } from "react";
import { Platform } from "react-native";
import * as FileSystem from "expo-file-system";
import * as IntentLauncher from "expo-intent-launcher";
import Constants from "expo-constants";

const VERSION_URL = `${process.env.EXPO_PUBLIC_API_URL}/api/app/version`;

/**
 * Hook de vérification et installation automatique de mise à jour APK.
 *
 * Usage :
 *   const { updateAvailable, updateInfo, downloading, progress, downloadAndInstall } = useAppUpdate();
 *
 * Flow :
 *   1. Au démarrage, fetch GET /api/app/version
 *   2. Compare avec Constants.expoConfig.version
 *   3. Si nouvelle version → updateAvailable = true → afficher UpdateBanner
 *   4. L'utilisateur tape "Mettre à jour" → downloadAndInstall()
 *   5. L'APK est téléchargé puis l'installeur Android natif est lancé
 */
export function useAppUpdate() {
	const [updateAvailable, setUpdateAvailable] = useState(false);
	const [updateInfo, setUpdateInfo] = useState(null); // { version, apkUrl, releaseNotes }
	const [downloading, setDownloading] = useState(false);
	const [progress, setProgress] = useState(0); // 0..1
	const [error, setError] = useState(null);

	const checkForUpdate = useCallback(async () => {
		if (Platform.OS !== "android") return;
		try {
			const res = await fetch(VERSION_URL, { method: "GET" });
			if (!res.ok) return;
			const data = await res.json();
			const current = Constants.expoConfig?.version ?? "1.0.0";
			if (isNewerVersion(data.version, current)) {
				setUpdateAvailable(true);
				setUpdateInfo(data);
			}
		} catch (_) {
			// Pas de réseau ou backend down — on ignore silencieusement
		}
	}, []);

	const downloadAndInstall = useCallback(async () => {
		if (!updateInfo?.apkUrl) return;
		setDownloading(true);
		setProgress(0);
		setError(null);

		try {
			const dir = FileSystem.documentDirectory + "kiosk_updates/";
			await FileSystem.makeDirectoryAsync(dir, { intermediates: true });

			const apkPath = dir + `orderit-${updateInfo.version}.apk`;

			// Supprimer l'ancienne version si présente
			const existing = await FileSystem.getInfoAsync(apkPath);
			if (existing.exists) await FileSystem.deleteAsync(apkPath, { idempotent: true });

			// Téléchargement avec suivi de progression
			const dl = FileSystem.createDownloadResumable(
				updateInfo.apkUrl,
				apkPath,
				{},
				({ totalBytesWritten, totalBytesExpectedToWrite }) => {
					if (totalBytesExpectedToWrite > 0) {
						setProgress(totalBytesWritten / totalBytesExpectedToWrite);
					}
				},
			);

			const result = await dl.downloadAsync();
			if (!result?.uri) throw new Error("Téléchargement échoué");

			// Convertir en content:// URI (requis Android 7+ via FileProvider)
			const contentUri = await FileSystem.getContentUriAsync(result.uri);

			// Lancer l'installeur natif Android
			await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
				data: contentUri,
				flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
				type: "application/vnd.android.package-archive",
			});
		} catch (e) {
			setError(e.message ?? "Erreur inconnue");
		} finally {
			setDownloading(false);
		}
	}, [updateInfo]);

	useEffect(() => {
		checkForUpdate();
	}, [checkForUpdate]);

	return {
		updateAvailable,
		updateInfo,
		downloading,
		progress,
		error,
		downloadAndInstall,
		checkForUpdate,
	};
}

// Compare "1.2.3" > "1.2.0" → true
function isNewerVersion(remote, current) {
	const parse = (v) => (v ?? "0").split(".").map(Number);
	const [ra = 0, rb = 0, rc = 0] = parse(remote);
	const [ca = 0, cb = 0, cc = 0] = parse(current);
	if (ra !== ca) return ra > ca;
	if (rb !== cb) return rb > cb;
	return rc > cc;
}
