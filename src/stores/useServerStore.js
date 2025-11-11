import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as RootNavigation from "../../utils/RootNavigation"; // 🔹 si tu veux rediriger même depuis un store

export const useServerStore = create((set, get) => ({
	servers: [],
	activeServer: null,

	setServers: (servers) => set({ servers }),
	setActiveServer: (server) => set({ activeServer: server }),

	fetchServers: async (restaurantId) => {
		try {
			// ⚙️ Vérifier la présence du restaurantId
			if (!restaurantId) {
				console.error("❌ fetchServers : restaurantId manquant");
				return;
			}

			// ⚙️ Récupérer le token
			const token = await AsyncStorage.getItem("token");
			if (!token) {
				console.log("⚠️ Aucun token trouvé — redirection vers Login");
				RootNavigation.navigate("Login");
				return;
			}

			// ⚙️ Requête API
			const response = await fetch(
				`http://192.168.1.185:3000/servers/${restaurantId}`,
				{
					method: "GET",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
				}
			);

			// ⚙️ Gestion des erreurs d’authentification
			if (response.status === 401 || response.status === 403) {
				console.log("🔒 Token expiré ou invalide — redirection vers Login");
				await AsyncStorage.removeItem("token");
				RootNavigation.navigate("Login");
				return;
			}

			// ⚙️ Autres erreurs serveur
			if (!response.ok) {
				const text = await response.text();
				console.error("❌ Erreur fetch servers :", response.status, text);
				return;
			}

			// ✅ Succès : mise à jour du store
			const data = await response.json();
			set({ servers: data.map((srv) => srv.name) });
			console.log("✅ Serveurs chargés :", data.length);
		} catch (err) {
			console.error("🚨 Erreur récupération serveurs :", err);
		}
	},
}));
