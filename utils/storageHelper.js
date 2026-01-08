import AsyncStorage from "@react-native-async-storage/async-storage";
import useUserStore from "../src/stores/useUserStore";

/**
 * 🧹 Nettoie TOUTES les données utilisateur (tokens + infos)
 * À utiliser lors de la déconnexion ou session expirée
 */
export async function clearAllUserData() {
	const keys = [
		"@access_token",
		"refreshToken",
		"restaurantId",
		"userRole",
		"userId",
		"userEmail",
		"userType",
		"category",
		"serverId",
		"tableId",
		"activeReservationId",
	];

	try {
		// Nettoyer AsyncStorage
		await AsyncStorage.multiRemove(keys);
		console.log("✅ AsyncStorage nettoyé");

		// Vider le store Zustand
		useUserStore.getState().clear();
		console.log("✅ UserStore vidé");
	} catch (error) {
		console.error("❌ Erreur clearAllUserData:", error);
		throw error;
	}
}
