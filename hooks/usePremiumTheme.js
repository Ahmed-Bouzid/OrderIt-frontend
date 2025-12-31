/**
 * Hook personnalisé pour le thème premium
 * Fournit le thème complet avec toutes les couleurs, spacings et radius
 * Supporte 3 modes : dark, light, ocean
 */
import useThemeStore from "../src/stores/useThemeStore";
import { getTheme } from "../src/styles/themes";

/**
 * Hook pour obtenir le thème premium complet
 * @returns {object} { theme, isDarkMode, themeMode, toggleDarkMode, setThemeMode, cycleTheme }
 */
export const usePremiumTheme = () => {
	const { isDarkMode, themeMode, toggleDarkMode, setThemeMode, cycleTheme } =
		useThemeStore();
	const theme = getTheme(themeMode);

	return {
		theme,
		isDarkMode, // Legacy compatibility
		themeMode, // New: 'dark' | 'light' | 'ocean'
		toggleDarkMode, // Legacy
		setThemeMode, // New
		cycleTheme, // New: cycle through all themes
	};
};

/**
 * Crée un objet THEME local pour les composants
 * qui n'utilisent pas encore le hook (pour migration progressive)
 * @param {boolean|string} mode - isDarkMode (boolean) ou themeMode (string)
 * @returns {object} THEME object compatible avec le pattern existant
 */
export const createLocalTheme = (mode) => {
	return getTheme(mode);
};

export default usePremiumTheme;
