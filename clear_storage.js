import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

(async () => {
	console.log("🗑️ Nettoyage complet...");

	// 1. Vider AsyncStorage (anciennes données)
	await AsyncStorage.clear();
	console.log("✅ AsyncStorage vidé");

	// 2. Vider SecureStore (nouvelles données chiffrées)
	const keys = [
		"access_token",
		"refresh_token",
		"restaurant_id",
		"user_role",
		"server_id",
		"table_id",
	];

	for (const key of keys) {
		try {
			await SecureStore.deleteItemAsync(key);
			console.log(`✅ SecureStore ${key} supprimé`);
		} catch (e) {
			// Ignore si n'existe pas
		}
	}

	console.log("🎉 TERMINÉ - Reconnecte-toi maintenant");
})();
