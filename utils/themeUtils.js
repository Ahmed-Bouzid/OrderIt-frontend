/**
 * 🎨 Theme Utilities - Helpers pour thème dynamique
 * Fournit des fonctions pour obtenir les couleurs selon le mode (clair/sombre/ocean)
 */

import {
	DARK_THEME,
	LIGHT_THEME,
	OCEAN_THEME,
	THEME_MODES,
} from "../src/styles/themes";
import { TYPOGRAPHY } from "../constants/Theme";

/**
 * Obtenir le thème de base selon le mode
 * @param {boolean|string} mode - Mode du thème
 * @returns {object} Thème de base
 */
const getBaseTheme = (mode) => {
	// Support legacy (boolean)
	if (typeof mode === "boolean") {
		return mode ? DARK_THEME : LIGHT_THEME;
	}
	// Nouveau système (string)
	switch (mode) {
		case THEME_MODES.LIGHT:
		case "light":
			return LIGHT_THEME;
		case THEME_MODES.OCEAN:
		case "ocean":
			return OCEAN_THEME;
		case THEME_MODES.DARK:
		case "dark":
		default:
			return DARK_THEME;
	}
};

/**
 * Obtenir les couleurs du thème selon le mode
 * @param {boolean|string} mode - Mode du thème (boolean pour legacy, string pour nouveau)
 * @returns {object} Couleurs du thème
 */
export const getThemeColors = (mode = true) => {
	const theme = getBaseTheme(mode);
	return {
		background: {
			dark: theme.colors.background,
			card: theme.colors.card,
			elevated: theme.colors.cardAlt,
		},
		primary: {
			amber: theme.colors.primary,
			amberDark: theme.colors.primaryDark,
		},
		text: {
			primary: theme.colors.text.primary,
			secondary: theme.colors.text.secondary,
			muted: theme.colors.text.muted,
		},
		border: {
			default: theme.colors.border,
			light: theme.colors.borderLight,
			subtle: theme.colors.borderLight,
			focus: `${theme.colors.primary}80`, // 50% opacity
		},
		status: {
			success: theme.colors.status.success,
			warning: theme.colors.status.warning,
			error: theme.colors.status.error,
			info: theme.colors.status.info,
		},
		role: theme.colors.role || {
			server: {
				bg: theme.colors.status.infoLight,
				text: theme.colors.status.info,
			},
			manager: {
				bg: theme.colors.status.warningLight,
				text: theme.colors.status.warning,
			},
		},
		overlay: theme.colors.overlay,
	};
};

/**
 * Constantes de spacing (identiques pour tous les thèmes)
 */
export const SPACING = {
	xs: 4,
	sm: 8,
	md: 12,
	lg: 16,
	xl: 20,
	"2xl": 24,
	"3xl": 32,
};

/**
 * Constantes de border radius (identiques pour tous les thèmes)
 */
export const RADIUS = {
	sm: 6,
	md: 10,
	lg: 14,
	xl: 18,
	"2xl": 24,
};

/**
 * Obtenir la configuration complète du thème
 * @param {boolean|string} mode - Mode du thème (boolean pour legacy, string pour nouveau)
 * @returns {object} Configuration complète du thème
 */
export const getTheme = (mode = true) => ({
	colors: getThemeColors(mode),
	spacing: SPACING,
	radius: RADIUS,
	typography: TYPOGRAPHY,
});

/**
 * Obtenir les gradients du thème
 * @param {boolean|string} mode - Mode du thème
 * @returns {object} Gradients du thème
 */
export const getThemeGradients = (mode = true) => {
	const theme = getBaseTheme(mode);
	return theme.gradients;
};
