import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
	DARK_THEME,
	LIGHT_THEME,
	OCEAN_THEME,
	CLOUD_THEME,
	THEME_MODES,
	getTheme,
} from "../styles/themes";

// Tailles de police disponibles
const FONT_SIZES = {
	SMALL: "small",
	MEDIUM: "medium",
	LARGE: "large",
};

// Multiplicateurs pour chaque taille
const FONT_MULTIPLIERS = {
	[FONT_SIZES.SMALL]: 0.9,
	[FONT_SIZES.MEDIUM]: 1.0,
	[FONT_SIZES.LARGE]: 1.15,
};

// ⭐ Thème clair (legacy - pour compatibilité)
const lightTheme = {
	mode: "light",
	backgroundColor: LIGHT_THEME.colors.background,
	textColor: LIGHT_THEME.colors.text.primary,
	cardColor: LIGHT_THEME.colors.card,
	borderColor: LIGHT_THEME.colors.border,
	containerBg: LIGHT_THEME.colors.background,
	separatorColor: LIGHT_THEME.colors.border,
	buttonBg: LIGHT_THEME.colors.primary,
	buttonText: "#ffffff",
};

// ⭐ Thème sombre (legacy - pour compatibilité)
const darkTheme = {
	mode: "dark",
	backgroundColor: DARK_THEME.colors.background,
	textColor: DARK_THEME.colors.text.primary,
	cardColor: DARK_THEME.colors.card,
	borderColor: DARK_THEME.colors.border,
	containerBg: DARK_THEME.colors.background,
	separatorColor: DARK_THEME.colors.border,
	buttonBg: DARK_THEME.colors.primary,
	buttonText: "#ffffff",
};

// 🌊 Thème Ocean (legacy - pour compatibilité)
const oceanTheme = {
	mode: "ocean",
	backgroundColor: OCEAN_THEME.colors.background,
	textColor: OCEAN_THEME.colors.text.primary,
	cardColor: OCEAN_THEME.colors.card,
	borderColor: OCEAN_THEME.colors.border,
	containerBg: OCEAN_THEME.colors.background,
	separatorColor: OCEAN_THEME.colors.border,
	buttonBg: OCEAN_THEME.colors.primary,
	buttonText: "#ffffff",
};

// ☁️ Thème Cloud (legacy - pour compatibilité)
const cloudTheme = {
	mode: "cloud",
	backgroundColor: CLOUD_THEME.colors.background,
	textColor: CLOUD_THEME.colors.text.primary,
	cardColor: CLOUD_THEME.colors.card,
	borderColor: CLOUD_THEME.colors.border,
	containerBg: CLOUD_THEME.colors.background,
	separatorColor: CLOUD_THEME.colors.border,
	buttonBg: CLOUD_THEME.colors.primary,
	buttonText: "#ffffff",
};

// Helper pour obtenir le thème legacy par mode
const getLegacyTheme = (mode) => {
	switch (mode) {
		case THEME_MODES.LIGHT:
			return lightTheme;
		case THEME_MODES.OCEAN:
			return oceanTheme;
		case THEME_MODES.CLOUD:
			return cloudTheme;
		case THEME_MODES.DARK:
		default:
			return darkTheme;
	}
};

const useThemeStore = create((set, get) => ({
	// ⭐ Nouveau système: themeMode ('dark', 'light', 'ocean', 'cloud')
	themeMode: THEME_MODES.DARK,
	// Legacy: isDarkMode (maintenu pour compatibilité)
	isDarkMode: true,
	theme: darkTheme,

	// 📏 Taille de police (S, M, L)
	fontSize: FONT_SIZES.MEDIUM,

	// Initialiser le thème depuis AsyncStorage
	initTheme: async () => {
		try {
			const savedMode = await AsyncStorage.getItem("themeMode");
			const savedFontSize = await AsyncStorage.getItem("fontSize");
			// Support legacy
			const savedDarkMode = await AsyncStorage.getItem("darkMode");

			let mode = THEME_MODES.DARK;
			if (savedMode) {
				mode = savedMode;
			} else if (savedDarkMode !== null) {
				mode = savedDarkMode === "true" ? THEME_MODES.DARK : THEME_MODES.LIGHT;
			}

			const fontSize = savedFontSize || FONT_SIZES.MEDIUM;

			set({
				themeMode: mode,
				isDarkMode: mode === THEME_MODES.DARK,
				theme: getLegacyTheme(mode),
				fontSize,
			});
		} catch (error) {
			console.error("Erreur chargement thème:", error);
		}
	},

	// ⭐ Nouveau: Définir le thème directement
	setThemeMode: async (mode) => {
		try {
			await AsyncStorage.setItem("themeMode", mode);
			set({
				themeMode: mode,
				isDarkMode: mode === THEME_MODES.DARK,
				theme: getLegacyTheme(mode),
			});
		} catch (error) {
			console.error("Erreur changement thème:", error);
		}
	},

	// ⭐ Nouveau: Cycler entre les thèmes (dark -> light -> ocean -> cloud -> dark)
	cycleTheme: async () => {
		const { themeMode } = get();
		let newMode;
		switch (themeMode) {
			case THEME_MODES.DARK:
				newMode = THEME_MODES.LIGHT;
				break;
			case THEME_MODES.LIGHT:
				newMode = THEME_MODES.OCEAN;
				break;
			case THEME_MODES.OCEAN:
				newMode = THEME_MODES.CLOUD;
				break;
			case THEME_MODES.CLOUD:
			default:
				newMode = THEME_MODES.DARK;
				break;
		}
		await get().setThemeMode(newMode);
	},

	// Legacy: Basculer entre clair et sombre (maintenu pour compatibilité)
	toggleDarkMode: async () => {
		const { themeMode } = get();
		const newMode =
			themeMode === THEME_MODES.DARK ? THEME_MODES.LIGHT : THEME_MODES.DARK;
		await get().setThemeMode(newMode);
	},

	// 📏 Définir la taille de police
	setFontSize: async (size) => {
		try {
			if (!Object.values(FONT_SIZES).includes(size)) {
				console.error("Taille de police invalide:", size);
				return;
			}
			// Set state FIRST pour un re-render immédiat
			set({ fontSize: size });
			// Puis sauvegarder en async
			await AsyncStorage.setItem("fontSize", size);
		} catch (error) {
			console.error("Erreur changement taille police:", error);
		}
	},

	// 📏 Obtenir le multiplicateur de la taille de police actuelle
	getFontMultiplier: () => {
		const { fontSize } = get();
		return FONT_MULTIPLIERS[fontSize] || 1.0;
	},

	// 📏 Cycler entre les tailles (S -> M -> L -> S)
	cycleFontSize: async () => {
		const { fontSize } = get();
		let newSize;
		switch (fontSize) {
			case FONT_SIZES.SMALL:
				newSize = FONT_SIZES.MEDIUM;
				break;
			case FONT_SIZES.MEDIUM:
				newSize = FONT_SIZES.LARGE;
				break;
			case FONT_SIZES.LARGE:
			default:
				newSize = FONT_SIZES.SMALL;
				break;
		}
		await get().setFontSize(newSize);
	},

	// Obtenir la couleur du thème actuel
	getThemeColor: (colorKey) => {
		return get().theme[colorKey];
	},

	// ⭐ Obtenir le thème premium complet
	getPremiumTheme: () => {
		return getTheme(get().themeMode);
	},
}));

export {
	DARK_THEME,
	LIGHT_THEME,
	OCEAN_THEME,
	CLOUD_THEME,
	THEME_MODES,
	FONT_SIZES,
	getTheme,
};
export default useThemeStore;
