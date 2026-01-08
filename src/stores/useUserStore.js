// stores/useUserStore.js
import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Store pour gérer les informations de l'utilisateur connecté
 * Notamment le rôle (admin/server) pour afficher/cacher les fonctionnalités manager
 */
const useUserStore = create((set, get) => ({
	// État utilisateur
	userId: null,
	email: null,
	role: null, // 'admin' ou 'server'
	userType: null, // 'admin' ou 'server'
	restaurantId: null,
	category: null, // 🍔 'restaurant', 'foodtruck', 'snack', etc.
	isManager: false, // Raccourci pour vérifier si admin/manager

	/**
	 * Initialise le store depuis AsyncStorage
	 */
	init: async () => {
		try {
			const [userId, email, role, userType, restaurantId, category] = await Promise.all([
				AsyncStorage.getItem("userId"),
				AsyncStorage.getItem("userEmail"),
				AsyncStorage.getItem("userRole"),
				AsyncStorage.getItem("userType"),
				AsyncStorage.getItem("restaurantId"),
				AsyncStorage.getItem("category"),
			]);

			const isManager = role === "admin" || userType === "admin";

			set({
				userId,
				email,
				role,
				userType,
				restaurantId,
				category,
				isManager,
			});

			console.log("✅ UserStore initialisé:", { role, userType, category, isManager });
			return { role, userType, category, isManager };
		} catch (error) {
			console.error("❌ Erreur init UserStore:", error);
			return null;
		}
	},

	/**
	 * Met à jour les infos utilisateur (appelé après login)
	 */
	setUser: async (userData) => {
		try {
			const { userId, email, role, userType, restaurantId } = userData;
			const isManager = role === "admin" || userType === "admin";

			// Stocker en AsyncStorage
			await Promise.all([
				AsyncStorage.setItem("userId", userId || ""),
				AsyncStorage.setItem("userEmail", email || ""),
				AsyncStorage.setItem("userRole", role || ""),
				AsyncStorage.setItem("userType", userType || ""),
				AsyncStorage.setItem("restaurantId", restaurantId || ""),
			]);

			// Mettre à jour le store
			set({
				userId,
				email,
				role,
				userType,
				restaurantId,
				isManager,
			});

			console.log("✅ UserStore mis à jour:", { role, userType, isManager });
		} catch (error) {
			console.error("❌ Erreur setUser:", error);
		}
	},

	/**
	 * Réinitialise le store (appelé au logout)
	 */
	clear: async () => {
		try {
			await Promise.all([
				AsyncStorage.removeItem("userId"),
				AsyncStorage.removeItem("userEmail"),
				AsyncStorage.removeItem("userRole"),
				AsyncStorage.removeItem("userType"),
			]);

			set({
				userId: null,
				email: null,
				role: null,
				userType: null,
				restaurantId: null,
				isManager: false,
			});

			console.log("✅ UserStore réinitialisé");
		} catch (error) {
			console.error("❌ Erreur clear UserStore:", error);
		}
	},

	/**
	 * Vérifie si l'utilisateur a les droits manager
	 */
	checkIsManager: () => {
		const state = get();
		return state.role === "admin" || state.userType === "admin";
	},
}));

export default useUserStore;
