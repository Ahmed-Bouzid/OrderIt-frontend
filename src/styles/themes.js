/**
 * Thèmes premium pour OrderIt
 * Mode clair, mode sombre et mode Ocean
 */

// 🌙 Thème sombre premium (ambré/doré)
export const DARK_THEME = {
	colors: {
		// Backgrounds
		background: "#0C0F17",
		card: "#151923",
		cardAlt: "#1E2433",
		inputBg: "#1E2433",

		// Primary (Amber/Gold)
		primary: "#F59E0B",
		primaryLight: "rgba(245, 158, 11, 0.15)",
		primaryDark: "#D97706",

		// Text
		text: {
			primary: "#F8FAFC",
			secondary: "#94A3B8",
			muted: "#64748B",
		},

		// Borders
		border: "rgba(148, 163, 184, 0.12)",
		borderLight: "rgba(148, 163, 184, 0.08)",

		// Status
		status: {
			success: "#10B981",
			successLight: "rgba(16, 185, 129, 0.15)",
			warning: "#F59E0B",
			warningLight: "rgba(245, 158, 11, 0.15)",
			error: "#EF4444",
			errorLight: "rgba(239, 68, 68, 0.15)",
			info: "#3B82F6",
			infoLight: "rgba(59, 130, 246, 0.15)",
		},

		// Overlay
		overlay: "rgba(0, 0, 0, 0.7)",

		// Role colors (for ServerManagement)
		role: {
			server: { bg: "rgba(59, 130, 246, 0.15)", text: "#3B82F6" },
			manager: { bg: "rgba(245, 158, 11, 0.15)", text: "#F59E0B" },
		},
	},

	// Spacing
	spacing: {
		xs: 4,
		sm: 8,
		md: 12,
		lg: 16,
		xl: 24,
		xxl: 32,
	},

	// Border radius
	radius: {
		sm: 6,
		md: 10,
		lg: 14,
		xl: 20,
		pill: 50,
	},

	// Gradients (pour LinearGradient)
	gradients: {
		primary: ["#F59E0B", "#D97706"],
		success: ["#10B981", "#059669"],
		danger: ["#EF4444", "#DC2626"],
		info: ["#3B82F6", "#2563EB"],
	},
};

// ☀️ Thème clair premium
export const LIGHT_THEME = {
	colors: {
		// Backgrounds
		background: "#F8FAFC",
		card: "#FFFFFF",
		cardAlt: "#F1F5F9",
		inputBg: "#F1F5F9",

		// Primary (Amber/Gold - même couleur pour cohérence)
		primary: "#D97706",
		primaryLight: "rgba(217, 119, 6, 0.12)",
		primaryDark: "#B45309",

		// Text
		text: {
			primary: "#0F172A",
			secondary: "#475569",
			muted: "#94A3B8",
		},

		// Borders
		border: "rgba(15, 23, 42, 0.1)",
		borderLight: "rgba(15, 23, 42, 0.06)",

		// Status
		status: {
			success: "#059669",
			successLight: "rgba(5, 150, 105, 0.12)",
			warning: "#D97706",
			warningLight: "rgba(217, 119, 6, 0.12)",
			error: "#DC2626",
			errorLight: "rgba(220, 38, 38, 0.12)",
			info: "#2563EB",
			infoLight: "rgba(37, 99, 235, 0.12)",
		},

		// Overlay
		overlay: "rgba(15, 23, 42, 0.5)",

		// Role colors (for ServerManagement)
		role: {
			server: { bg: "rgba(37, 99, 235, 0.12)", text: "#2563EB" },
			manager: { bg: "rgba(217, 119, 6, 0.12)", text: "#D97706" },
		},
	},

	// Spacing (identique au dark)
	spacing: {
		xs: 4,
		sm: 8,
		md: 12,
		lg: 16,
		xl: 24,
		xxl: 32,
	},

	// Border radius (identique au dark)
	radius: {
		sm: 6,
		md: 10,
		lg: 14,
		xl: 20,
		pill: 50,
	},

	// Gradients
	gradients: {
		primary: ["#D97706", "#B45309"],
		success: ["#059669", "#047857"],
		danger: ["#DC2626", "#B91C1C"],
		info: ["#2563EB", "#1D4ED8"],
	},
};

// 🌊 Thème Ocean - Coloré, professionnel et élégant
export const OCEAN_THEME = {
	colors: {
		// Backgrounds - Bleu océan profond
		background: "#0A1628",
		card: "#0F2847",
		cardAlt: "#153761",
		inputBg: "#153761",

		// Primary - Cyan/Teal lumineux
		primary: "#06B6D4",
		primaryLight: "rgba(6, 182, 212, 0.18)",
		primaryDark: "#0891B2",

		// Text
		text: {
			primary: "#E0F2FE",
			secondary: "#7DD3FC",
			muted: "#38BDF8",
		},

		// Borders - Subtil bleu
		border: "rgba(56, 189, 248, 0.2)",
		borderLight: "rgba(56, 189, 248, 0.1)",

		// Status - Couleurs vives mais pro
		status: {
			success: "#22D3EE", // Cyan clair
			successLight: "rgba(34, 211, 238, 0.18)",
			warning: "#FBBF24", // Ambre doré
			warningLight: "rgba(251, 191, 36, 0.18)",
			error: "#F472B6", // Rose vif
			errorLight: "rgba(244, 114, 182, 0.18)",
			info: "#818CF8", // Indigo clair
			infoLight: "rgba(129, 140, 248, 0.18)",
		},

		// Overlay
		overlay: "rgba(10, 22, 40, 0.85)",

		// Role colors
		role: {
			server: { bg: "rgba(129, 140, 248, 0.18)", text: "#818CF8" },
			manager: { bg: "rgba(251, 191, 36, 0.18)", text: "#FBBF24" },
		},
	},

	// Spacing (identique)
	spacing: {
		xs: 4,
		sm: 8,
		md: 12,
		lg: 16,
		xl: 24,
		xxl: 32,
	},

	// Border radius (identique)
	radius: {
		sm: 6,
		md: 10,
		lg: 14,
		xl: 20,
		pill: 50,
	},

	// Gradients - Dégradés océan
	gradients: {
		primary: ["#06B6D4", "#0891B2"],
		success: ["#22D3EE", "#06B6D4"],
		danger: ["#F472B6", "#EC4899"],
		info: ["#818CF8", "#6366F1"],
	},
};

// Types de thème disponibles
export const THEME_MODES = {
	DARK: "dark",
	LIGHT: "light",
	OCEAN: "ocean",
};

/**
 * Récupère le thème en fonction du mode
 * @param {boolean|string} mode - Mode du thème (boolean pour legacy, string pour nouveau)
 * @returns {object} Le thème correspondant
 */
export const getTheme = (mode) => {
	// Support legacy (boolean)
	if (typeof mode === "boolean") {
		return mode ? DARK_THEME : LIGHT_THEME;
	}
	// Nouveau système (string)
	switch (mode) {
		case THEME_MODES.LIGHT:
			return LIGHT_THEME;
		case THEME_MODES.OCEAN:
			return OCEAN_THEME;
		case THEME_MODES.DARK:
		default:
			return DARK_THEME;
	}
};

/**
 * Helper pour créer des styles conditionnels
 * @param {boolean} isDarkMode
 * @returns {object} Objet avec les styles de base
 */
export const getBaseStyles = (isDarkMode) => {
	const theme = getTheme(isDarkMode);
	return {
		container: {
			flex: 1,
			backgroundColor: theme.colors.background,
		},
		card: {
			backgroundColor: theme.colors.card,
			borderRadius: theme.radius.lg,
			borderWidth: 1,
			borderColor: theme.colors.border,
			padding: theme.spacing.lg,
		},
		text: {
			color: theme.colors.text.primary,
		},
		textSecondary: {
			color: theme.colors.text.secondary,
		},
		textMuted: {
			color: theme.colors.text.muted,
		},
		input: {
			backgroundColor: theme.colors.inputBg,
			borderRadius: theme.radius.md,
			borderWidth: 1,
			borderColor: theme.colors.border,
			padding: theme.spacing.md,
			color: theme.colors.text.primary,
		},
	};
};

export default {
	DARK_THEME,
	LIGHT_THEME,
	OCEAN_THEME,
	THEME_MODES,
	getTheme,
	getBaseStyles,
};
