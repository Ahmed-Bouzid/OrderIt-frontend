/**
 * 🎨 useTheme Hook
 * Hook centralisé pour obtenir le thème avec le multiplicateur de police appliqué
 * Utilise automatiquement themeMode et fontSize du store
 */

import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import useThemeStore, { FONT_SIZES } from "../src/stores/useThemeStore";
import { getTheme } from "../utils/themeUtils";

/**
 * Obtenir le multiplicateur de police selon la taille
 * S = taille normale (1.0), M = grand (1.15), L = très grand (1.35)
 * @param {string} size - Taille de police (SMALL, MEDIUM, LARGE)
 * @returns {number} Multiplicateur
 */
const getFontMultiplier = (size) => {
	switch (size) {
		case FONT_SIZES.SMALL:
			return 1.0; // Taille normale (anciennement M)
		case FONT_SIZES.LARGE:
			return 1.35; // Très grand (XL)
		case FONT_SIZES.MEDIUM:
		default:
			return 1.15; // Grand (anciennement L)
	}
};

/**
 * Hook pour obtenir le thème complet avec la taille de police scalée
 * @returns {object} Thème complet (colors, spacing, radius, typography scalée)
 */
export const useTheme = () => {
	// Utiliser useShallow pour garantir le re-render quand themeMode ou fontSize change
	const { themeMode, fontSize } = useThemeStore(
		useShallow((state) => ({
			themeMode: state.themeMode,
			fontSize: state.fontSize,
		}))
	);

	const theme = useMemo(() => {
		const multiplier = getFontMultiplier(fontSize);
		return getTheme(themeMode, multiplier);
	}, [themeMode, fontSize]);

	return theme;
};

/**
 * Hook pour obtenir uniquement les couleurs du thème
 * @returns {object} Couleurs du thème
 */
export const useThemeColors = () => {
	const theme = useTheme();
	return theme.colors;
};

/**
 * Hook pour obtenir uniquement la typographie scalée
 * @returns {object} Typographie avec tailles scalées
 */
export const useTypography = () => {
	const theme = useTheme();
	return theme.typography;
};

export default useTheme;
