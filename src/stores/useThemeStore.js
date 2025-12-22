import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ⭐ Thème clair (défaut)
const lightTheme = {
	mode: "light",
	backgroundColor: "#ffffff",
	textColor: "#000000",
	cardColor: "#f9f9f9",
	borderColor: "#e0e0e0",
	containerBg: "#ffffff",
	separatorColor: "#d0d0d0",
	buttonBg: "#007AFF",
	buttonText: "#ffffff",
};

// ⭐ Thème sombre
const darkTheme = {
	mode: "dark",
	backgroundColor: "#1a1a1a",
	textColor: "#ffffff",
	cardColor: "#2a2a2a",
	borderColor: "#444444",
	containerBg: "#000000",
	separatorColor: "#444444",
	buttonBg: "#0A84FF",
	buttonText: "#ffffff",
};

const useThemeStore = create((set) => ({
	isDarkMode: false,
	theme: lightTheme,

	// Initialiser le thème depuis AsyncStorage
	initTheme: async () => {
		try {
			const savedMode = await AsyncStorage.getItem("darkMode");
			const isDark = savedMode === "true";
			set({
				isDarkMode: isDark,
				theme: isDark ? darkTheme : lightTheme,
			});
		} catch (error) {
			console.error("Erreur chargement thème:", error);
		}
	},

	// Basculer entre clair et sombre
	toggleDarkMode: async () => {
		try {
			set((state) => {
				const newDarkMode = !state.isDarkMode;
				const newTheme = newDarkMode ? darkTheme : lightTheme;

				// Sauvegarder dans AsyncStorage
				AsyncStorage.setItem("darkMode", newDarkMode.toString());

				return {
					isDarkMode: newDarkMode,
					theme: newTheme,
				};
			});
		} catch (error) {
			console.error("Erreur toggle dark mode:", error);
		}
	},

	// Obtenir la couleur du thème actuel
	getThemeColor: (colorKey) => {
		return lightTheme[colorKey]; // sera mis à jour avec le sélecteur
	},
}));

export default useThemeStore;
