/**
 * Script de nettoyage complet des données locales
 * Usage : importer et appeler depuis l'app, ou intégrer dans un écran debug
 *
 * Vide :
 *  - AsyncStorage (données non chiffrées)
 *  - SecureStore   (tokens et données chiffrées)
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

const SECURE_STORE_KEYS = [
	"access_token",
	"refresh_token",
	"restaurant_id",
	"user_role",
	"server_id",
	"table_id",
];

export async function clearAllAppData() {

	// 1. AsyncStorage
	try {
		await AsyncStorage.clear();
	} catch (e) {
		console.error("❌ Erreur AsyncStorage :", e);
	}

	// 2. SecureStore
	for (const key of SECURE_STORE_KEYS) {
		try {
			await SecureStore.deleteItemAsync(key);
		} catch (e) {
			// Clé inexistante – ignoré
		}
	}

}

// Exécution directe si appelé hors composant
clearAllAppData();
