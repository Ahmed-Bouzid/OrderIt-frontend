import { useEffect } from "react";
import { Platform } from "react-native";
import ErrorLogger from "../utils/ErrorLogger";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Hook pour capturer les erreurs globales de l'application
 * À utiliser dans le composant racine (App.tsx ou _layout.tsx)
 */
export const useErrorCapture = () => {
	useEffect(() => {
		// Nettoyer les vieux logs au démarrage
		ErrorLogger.cleanupOldLogs();

		// Configuration du gestionnaire d'erreurs global
		const originalHandler = ErrorUtils.getGlobalHandler();

		const customErrorHandler = async (error, isFatal) => {
			console.error("[useErrorCapture] Erreur globale capturée:", {
				message: error.message,
				isFatal,
			});

			try {
				// Récupérer le contexte utilisateur
				const userId = await AsyncStorage.getItem("@user_id");
				const restaurantId = await AsyncStorage.getItem("@restaurant_id");

				// Enregistrer l'erreur
				await ErrorLogger.logError(error, {
					screen: "Global",
					action: isFatal ? "Fatal Error" : "Error",
					userId,
					restaurantId,
					platform: Platform.OS,
					isFatal,
				});
			} catch (logError) {
				console.error("[useErrorCapture] Erreur lors du logging:", logError);
			}

			// Appeler le gestionnaire d'erreurs original
			if (originalHandler) {
				originalHandler(error, isFatal);
			}
		};

		// Installer le gestionnaire personnalisé
		ErrorUtils.setGlobalHandler(customErrorHandler);

		// Nettoyer au démontage
		return () => {
			if (originalHandler) {
				ErrorUtils.setGlobalHandler(originalHandler);
			}
		};
	}, []);
};

export default useErrorCapture;
