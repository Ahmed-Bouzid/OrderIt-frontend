import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as RootNavigation from "../../utils/RootNavigation"; // 🔹 si tu veux rediriger même depuis un store

const useTableStore = create((set, get) => ({
	tables: [],
	isLoading: false,
	lastFetch: null,

	fetchTables: async (restaurantId) => {
		const state = get();

		// ⚙️ 1. Empêcher les requêtes simultanées
		if (state.isLoading) {
			console.log("⏳ Fetch tables déjà en cours...");
			return;
		}

		// ⚙️ 2. Utiliser le cache (30 secondes)
		if (state.lastFetch && Date.now() - state.lastFetch < 30000) {
			console.log("♻️ Tables déjà en cache");
			return;
		}

		try {
			set({ isLoading: true });

			// ⚙️ 3. Vérifier le token
			const token = await AsyncStorage.getItem("token");
			if (!token) {
				console.log("⚠️ Aucun token trouvé — redirection vers Login");
				set({ isLoading: false });
				RootNavigation.navigate("Login");
				return;
			}

			// ⚙️ 4. Requête API
			const response = await fetch(
				`http://192.168.1.185:3000/tables/restaurant/${restaurantId}`,
				{ headers: { Authorization: `Bearer ${token}` } }
			);

			// ⚙️ 5. Gestion token expiré / invalide
			if (response.status === 401 || response.status === 403) {
				console.log("🔒 Token expiré ou invalide — redirection vers Login");
				await AsyncStorage.removeItem("token");
				set({ isLoading: false });
				RootNavigation.navigate("Login");
				return;
			}

			// ⚙️ 6. Autres erreurs réseau
			if (!response.ok) {
				console.error("❌ Erreur fetch tables :", response.status);
				set({ isLoading: false });
				return;
			}

			// ✅ 7. Succès : mise à jour du store
			const data = await response.json();
			set({
				tables: data,
				isLoading: false,
				lastFetch: Date.now(),
			});
		} catch (err) {
			console.error("🚨 Erreur récupération tables :", err);
			set({ isLoading: false });
		}
	},

	// 🔹 Reset tables manuellement
	resetTables: () => set({ tables: [], lastFetch: null }),
}));

export default useTableStore;
