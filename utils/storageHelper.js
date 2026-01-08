import { multiRemove } from "./secureStorage";
import useUserStore from "../src/stores/useUserStore";

/**
 * 🧹 Nettoie TOUTES les données utilisateur (tokens + infos)
 * À utiliser lors de la déconnexion ou session expirée
 * ✅ Utilise secureStorage qui route automatiquement SecureStore vs AsyncStorage
 */
export async function clearAllUserData() {
	const keys = [
		"@access_token", // 🔐 SecureStore
		"refreshToken", // 🔐 SecureStore
		"restaurantId", // 📦 AsyncStorage
		"userRole", // 📦 AsyncStorage
		"userId", // 📦 AsyncStorage
		"userEmail", // 📦 AsyncStorage
		"userType", // 📦 AsyncStorage
		"category", // 📦 AsyncStorage
		"serverId", // 📦 AsyncStorage
		"tableId", // 📦 AsyncStorage
		"activeReservationId", // 📦 AsyncStorage
	];

	try {
		// Nettoyer SecureStore + AsyncStorage via wrapper
		await multiRemove(keys);
		console.log("✅ SecureStore + AsyncStorage nettoyés");

		// Vider le store Zustand
		useUserStore.getState().clear();
		console.log("✅ UserStore vidé");
	} catch (error) {
		console.error("❌ Erreur clearAllUserData:", error);
		throw error;
	}
}
