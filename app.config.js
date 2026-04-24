export default {
	expo: {
		name: "SunnyGo",
		slug: "sunnygo",
		version: "1.0.0",
		orientation: "default", // Portrait + paysage
		scheme: "sunnygo", // Ajout pour corriger le warning Expo Linking
		icon: "./assets/images/icon.png",
		splash: {
			image: "./assets/images/splash.png",
			resizeMode: "contain",
			backgroundColor: "#000000",
		},
		plugins: ["expo-web-browser"],
		updates: {
			url: "https://u.expo.dev/dea632ab-80a0-4526-ab61-8a6022535377",
		},
		runtimeVersion: "1.0.0",
		ios: {
			bundleIdentifier: "com.sunnygo.dev",
			infoPlist: {
				// 🖨️ Déclarer le scheme Thermer pour que Linking.canOpenURL fonctionne sur iOS
				// Si le scheme de l'app change, mettre à jour ici aussi
				LSApplicationQueriesSchemes: ["thermer"],
			},
		},
		android: {
			package: "com.sunnygo.dev",
			adaptiveIcon: {
				foregroundImage: "./assets/images/adaptive-icon.png",
				backgroundColor: "#000000",
			},
		},
		extra: {
			eas: {
				projectId: "dea632ab-80a0-4526-ab61-8a6022535377",
			},
			apiUrl: "https://orderit-backend-6y1m.onrender.com",
			socketUrl: "https://orderit-backend-6y1m.onrender.com",
			// 🖨️ URL du print daemon LOCAL (Mac avec l'imprimante GEZHI) — mettre à jour si l'IP change
			// Démarrer avec : cd backend && node printDaemon.js
			localPrintUrl: "http://192.168.1.162:5555",
			stripePublishableKey:
				"pk_test_51Ski7zH5JuPQb6uBXm8NJZxdZ6JOXtMMvr7hBfODwDp2Q5rYjM4bKfEQE1vSsNCcVvN6wKJq8Ls6hPcfqrUxSN6S00qyP6vp7q",
		},
	},
};
