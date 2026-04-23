/**
 * Utilitaire pour récupérer l'ID du restaurant
 * Compatible React Native (AsyncStorage)
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_CONFIG } from "../config/apiConfig.js";

/**
 * Récupère l'ID du restaurant depuis AsyncStorage ou la config par défaut
 * @returns {Promise<string>} - L'ID du restaurant
 */
export const getRestaurantId = async () => {
	try {
		const savedId = await AsyncStorage.getItem("restaurantId");
		return savedId || API_CONFIG.Resto_id_key || null;
	} catch (error) {
		console.error("❌ Erreur récupération restaurantId:", error);
		return API_CONFIG.Resto_id_key || null;
	}
};

/**
 * Définit l'ID du restaurant dans AsyncStorage
 * @param {string} restaurantId - L'ID du restaurant
 */
export const setRestaurantId = async (restaurantId) => {
	try {
		await AsyncStorage.setItem("restaurantId", restaurantId);
		console.log("✅ RestaurantId sauvegardé:", restaurantId);
	} catch (error) {
		console.error("❌ Erreur sauvegarde restaurantId:", error);
	}
};

/**
 * Supprime l'ID du restaurant d'AsyncStorage
 */
export const clearRestaurantId = async () => {
	try {
		await AsyncStorage.removeItem("restaurantId");
		console.log("✅ RestaurantId supprimé");
	} catch (error) {
		console.error("❌ Erreur suppression restaurantId:", error);
	}
};
