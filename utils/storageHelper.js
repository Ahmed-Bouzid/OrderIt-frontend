import { multiRemove } from "./secureStorage";
import useUserStore from "../src/stores/useUserStore";
import useDeveloperStore from "../src/stores/useDeveloperStore";

/**
 * 🧹 Nettoie TOUTES les données utilisateur (tokens + infos)
 * À utiliser lors de la déconnexion ou session expirée
 * ✅ Utilise secureStorage qui route automatiquement SecureStore vs AsyncStorage
 * 🛡️ CORRIGÉ: Reset aussi useDeveloperStore pour éviter faille sécurité
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
		"selectedRestaurant", // 📦 AsyncStorage - AJOUTÉ pour reset développeur
		"restaurantName", // 📦 AsyncStorage - cache nom du restaurant
		"restaurantNameId", // 📦 AsyncStorage - ID associé au cache nom
	];

	try {
		// Nettoyer SecureStore + AsyncStorage via wrapper
		await multiRemove(keys);

		// Vider le store Zustand
		useUserStore.getState().clear();

		// 🛡️ SÉCURITÉ CRITIQUE: Reset DeveloperStore pour éviter faille
		await useDeveloperStore.getState().reset();
	} catch (error) {
		console.error("❌ Erreur clearAllUserData:", error);
		throw error;
	}
}
