/**
 * 🎨 Theme Utilities - Helpers pour thème dynamique
 * Fournit des fonctions pour obtenir les couleurs selon le mode (clair/sombre/ocean)
 * et le scaling des polices (S/M/L)
 */

import {
	DARK_THEME,
	LIGHT_THEME,
	OCEAN_THEME,
	CLOUD_THEME,
	THEME_MODES,
} from "../src/styles/themes";
import { TYPOGRAPHY } from "../constants/Theme";

/**
 * Créer une version scalée de la typographie
 * @param {number} multiplier - Multiplicateur de taille (0.9 pour S, 1.0 pour M, 1.15 pour L)
 * @returns {object} Typographie avec tailles scalées
 */
const getScaledTypography = (multiplier = 1.0) => {
	if (multiplier === 1.0) {
		return TYPOGRAPHY;
	}

	const scaledSizes = {};
	Object.entries(TYPOGRAPHY.sizes).forEach(([key, value]) => {
		scaledSizes[key] = Math.round(value * multiplier);
	});

	return {
		...TYPOGRAPHY,
		sizes: scaledSizes,
	};
};

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
		case THEME_MODES.CLOUD:
		case "cloud":
			return CLOUD_THEME;
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
 * @param {number} fontMultiplier - Multiplicateur de taille de police (0.9, 1.0, 1.15)
 * @returns {object} Configuration complète du thème
 */
export const getTheme = (mode = true, fontMultiplier = 1.0) => ({
	colors: getThemeColors(mode),
	spacing: SPACING,
	radius: RADIUS,
	typography: getScaledTypography(fontMultiplier),
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
