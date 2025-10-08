import { create } from "zustand";

import AsyncStorage from "@react-native-async-storage/async-storage";

export const useServerStore = create((set, get) => ({
	servers: [],
	activeServer: null,

	setServers: (servers) => set({ servers }),
	setActiveServer: (server) => set({ activeServer: server }),

	fetchServers: async () => {
		try {
			const token = await AsyncStorage.getItem("token");
			const restaurantId = await AsyncStorage.getItem("restaurantId");

			if (!restaurantId) throw new Error("Pas de restaurantId trouvé");

			const response = await fetch(
				`http://192.168.1.165:3000/servers/${restaurantId}`,
				{
					method: "GET",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
				}
			);

			if (!response.ok) {
				const text = await response.text();
				console.error("❌ Texte reçu :", text);
				throw new Error("Erreur de récupération des servers");
			}

			const data = await response.json();
			set({ servers: data.map((srv) => srv.name) });
		} catch (err) {
			console.error("fetchServers error:", err);
		}
	},
}));
