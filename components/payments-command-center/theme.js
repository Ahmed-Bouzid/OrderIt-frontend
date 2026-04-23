// components/payments-command-center/theme.js
// Thème isolé — 100% indépendant du thème global de l'app
// Ambiance: centre de contrôle / trading desk / caisse premium

const PCC_THEME = {
	// ── Fond ──
	bg: {
		primary: "#0D0F14",       // fond principal sombre mat
		secondary: "#141821",     // fond cartes
		tertiary: "#1A1F2E",      // fond surligné
		overlay: "rgba(0,0,0,0.75)", // overlay derrière fenêtre
		glass: "rgba(20,24,33,0.95)", // fond vitré
	},

	// ── Texte ──
	text: {
		primary: "#F0F2F5",
		secondary: "#8B93A7",
		muted: "#4A5168",
		inverse: "#0D0F14",
	},

	// ── Accents ──
	accent: {
		green: "#00E676",         // succès / positif
		greenDim: "rgba(0,230,118,0.12)",
		blue: "#448AFF",          // en ligne
		blueDim: "rgba(68,138,255,0.12)",
		amber: "#FFB300",         // en attente
		amberDim: "rgba(255,179,0,0.12)",
		red: "#FF5252",           // refusé / erreur
		redDim: "rgba(255,82,82,0.12)",
		purple: "#B388FF",        // divers
		purpleDim: "rgba(179,136,255,0.12)",
		cyan: "#18FFFF",          // accent néon
		cyanDim: "rgba(24,255,255,0.10)",
	},

	// ── Bordures ──
	border: {
		subtle: "rgba(255,255,255,0.06)",
		card: "rgba(255,255,255,0.08)",
		focus: "rgba(68,138,255,0.4)",
		glow: "rgba(0,230,118,0.25)",
	},

	// ── Ombres ──
	shadow: {
		card: {
			shadowColor: "#000",
			shadowOffset: { width: 0, height: 4 },
			shadowOpacity: 0.3,
			shadowRadius: 12,
			elevation: 8,
		},
		window: {
			shadowColor: "#000",
			shadowOffset: { width: 0, height: 8 },
			shadowOpacity: 0.5,
			shadowRadius: 24,
			elevation: 16,
		},
		glow: (color) => ({
			shadowColor: color,
			shadowOffset: { width: 0, height: 0 },
			shadowOpacity: 0.4,
			shadowRadius: 12,
			elevation: 6,
		}),
	},

	// ── Typographie ──
	font: {
		mono: Platform => Platform.select({
			ios: "Menlo",
			android: "monospace",
			default: "monospace",
		}),
	},

	// ── Spacing ──
	spacing: {
		xs: 4,
		sm: 8,
		md: 12,
		lg: 16,
		xl: 20,
		xxl: 28,
	},

	// ── Radius ──
	radius: {
		sm: 6,
		md: 10,
		lg: 14,
		xl: 18,
		pill: 50,
	},
};

export default PCC_THEME;
