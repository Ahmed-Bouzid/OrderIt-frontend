import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Store pour le mode développeur
 * Gère la sélection de restaurant et le contexte développeur
 */
const useDeveloperStore = create((set, get) => ({
	// État
	isDeveloper: false,
	restaurants: [],
	selectedRestaurant: null,

	// Initialiser le mode développeur depuis le login
	initDeveloper: async (restaurants) => {
		set({
			isDeveloper: true,
			restaurants: restaurants || [],
		});
	},

	// Sélectionner un restaurant
	selectRestaurant: async (restaurant) => {
		try {
			// Sauvegarder dans AsyncStorage
			await AsyncStorage.setItem("restaurantId", restaurant._id);
			await AsyncStorage.setItem(
				"selectedRestaurant",
				JSON.stringify(restaurant)
			);

			set({ selectedRestaurant: restaurant });
			return true;
		} catch (error) {
			console.error("❌ Erreur sélection restaurant:", error);
			return false;
		}
	},

	// Changer de restaurant (sans déconnexion)
	switchRestaurant: async (restaurant) => {
		try {
			await AsyncStorage.setItem("restaurantId", restaurant._id);
			await AsyncStorage.setItem(
				"selectedRestaurant",
				JSON.stringify(restaurant)
			);

			set({ selectedRestaurant: restaurant });
			return true;
		} catch (error) {
			console.error("❌ Erreur changement restaurant:", error);
			return false;
		}
	},

	// Reset (déconnexion)
	reset: async () => {
		await AsyncStorage.removeItem("selectedRestaurant");
		set({
			isDeveloper: false,
			restaurants: [],
			selectedRestaurant: null,
		});
	},

	// Charger le restaurant sauvegardé
	loadSavedRestaurant: async () => {
		try {
			const saved = await AsyncStorage.getItem("selectedRestaurant");
			if (saved) {
				const restaurant = JSON.parse(saved);
				set({ selectedRestaurant: restaurant });
				return restaurant;
			}
		} catch (error) {
			console.error("❌ Erreur chargement restaurant:", error);
		}
		return null;
	},
}));

export default useDeveloperStore;
