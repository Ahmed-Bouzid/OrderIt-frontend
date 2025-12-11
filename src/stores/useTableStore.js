import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as RootNavigation from "../../utils/RootNavigation";

const useTableStore = create((set, get) => ({
  tables: [],
  isLoading: false,
  lastFetch: null,

  // ⚡ Récupérer toutes les tables (côté serveur, besoin de token)
  fetchTables: async (restaurantId) => {
    const state = get();

    if (state.isLoading) {
      console.log("⏳ Fetch tables déjà en cours...");
      return;
    }

    if (state.lastFetch && Date.now() - state.lastFetch < 30000) {
      console.log("♻️ Tables déjà en cache");
      return;
    }

    try {
      set({ isLoading: true });

      const token = await AsyncStorage.getItem("token");
      if (!token) {
        console.log("⚠️ Aucun token trouvé — redirection vers Login");
        set({ isLoading: false });
        RootNavigation.navigate("Login");
        return;
      }

      const response = await fetch(
        `http://192.168.1.185:3000/tables/restaurant/${restaurantId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.status === 401 || response.status === 403) {
        console.log("🔒 Token expiré ou invalide — redirection vers Login");
        await AsyncStorage.removeItem("token");
        set({ isLoading: false });
        RootNavigation.navigate("Login");
        return;
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
      const response = await fetch(`http://192.168.1.185:3000/tables/${tableId}`);
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
