import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as RootNavigation from "../../utils/RootNavigation";
import { getItem as getSecureItem } from "../../utils/secureStorage";

let socketListenerAttached = false; // ⭐ Flag pour éviter les doublons

const useTableStore = create((set, get) => ({
	tables: [],
	isLoading: false,
	lastFetch: null,

	// ⭐ Fonction pour attacher les listeners WebSocket
	attachSocketListener: (socket) => {
		if (!socket || socketListenerAttached) {
			return;
		}

		socketListenerAttached = true;

		socket.on("table", (event) => {
			const { type, data } = event;

			const state = get();

			switch (type) {
				case "created": {
					const exists = state.tables.some((t) => t._id === data._id);
					if (!exists) {
						set({ tables: [...state.tables, data] });
					}
					break;
				}

				case "updated":
				case "statusChanged": {
					const updated = state.tables.map((t) =>
						t._id === data._id ? data : t
					);
					set({ tables: updated });
					break;
				}

				case "deleted": {
					const filtered = state.tables.filter((t) => t._id !== data._id);
					set({ tables: filtered });
					break;
				}

				default:
					console.warn(`Unknown table event type: ${type}`);
			}
		});

		return () => {
			if (socket) {
				socket.off("table");
				socketListenerAttached = false;
			}
		};
	},

	// ⚡ Récupérer toutes les tables (côté serveur, besoin de token)
	fetchTables: async (restaurantId) => {
		const state = get();

		if (state.isLoading) {
			return;
		}

		if (state.lastFetch && Date.now() - state.lastFetch < 30000) {
			return;
		}

		try {
			set({ isLoading: true });

			const token = await getSecureItem("@access_token");
			if (!token) {
				set({ isLoading: false });
				RootNavigation.navigate("Login");
				return;
			}

			const { baseURL } = require("../config/apiConfig");
			const response = await fetch(
				`${baseURL}/tables/restaurant/${restaurantId}`,
				{ headers: { Authorization: `Bearer ${token}` } }
			);

			if (response.status === 401 || response.status === 403) {
				throw new Error("Session expirée");
			}

			if (!response.ok) {
				console.error("❌ Erreur fetch tables :", response.status);
				set({ isLoading: false });
				return;
			}

			const data = await response.json();
			set({ tables: data, isLoading: false, lastFetch: Date.now() });
		} catch (err) {
			console.error("🚨 Erreur récupération tables :", err);
			set({ isLoading: false });
		}
	},

	// ⚡ Récupérer une table par son ID (pas besoin de token côté client)
	getTableById: async (tableId) => {
		try {
			const { baseURL } = require("../config/apiConfig");
			const response = await fetch(`${baseURL}/tables/${tableId}`);
			if (!response.ok) {
				console.error("Erreur fetch table:", response.status);
				return null;
			}
			const data = await response.json();
			return data; // { _id, number, restaurantId, etc. }
		} catch (err) {
			console.error("Erreur récupération table:", err);
			return null;
		}
	},

	resetTables: () => set({ tables: [], lastFetch: null }),
}));

export default useTableStore;
