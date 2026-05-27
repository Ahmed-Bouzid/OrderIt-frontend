const { expo: baseConfig } = require("./app.json");

export default {
	expo: {
		...baseConfig,
		// Dynamic overrides (EAS updates, runtime version, extra)
		updates: {
			url: "https://u.expo.dev/dea632ab-80a0-4526-ab61-8a6022535377",
		},
		runtimeVersion: "1.0.0",
		ios: {
			...baseConfig.ios,
			infoPlist: {
				// Déclarer le scheme Thermer pour que Linking.canOpenURL fonctionne sur iOS
				LSApplicationQueriesSchemes: ["thermer"],
			},
		},
		android: {
			...baseConfig.android,
			adaptiveIcon: {
				...baseConfig.android.adaptiveIcon,
				backgroundColor: "#000000",
			},
		},
		extra: {
			eas: {
				projectId: "dea632ab-80a0-4526-ab61-8a6022535377",
			},
			apiUrl: "https://orderit-backend-6y1m.onrender.com",
			socketUrl: "https://orderit-backend-6y1m.onrender.com",
			// URL du print daemon LOCAL (Mac avec l'imprimante GEZHI) — mettre à jour si l'IP change
			// Démarrer avec : cd backend && node printDaemon.js
			localPrintUrl: "http://192.168.1.162:5555",
			stripePublishableKey:
				"pk_test_51Ski7zH5JuPQb6uBXm8NJZxdZ6JOXtMMvr7hBfODwDp2Q5rYjM4bKfEQE1vSsNCcVvN6wKJq8Ls6hPcfqrUxSN6S00qyP6vp7q",
		},
	},
};
