export default {
	expo: {
		name: "SunnyGo",
		slug: "sunnygo",
		version: "1.0.0",
		scheme: "sunnygo", // Ajout pour corriger le warning Expo Linking
		plugins: ["expo-web-browser"],
		updates: {
			url: "https://u.expo.dev/dea632ab-80a0-4526-ab61-8a6022535377",
		},
		runtimeVersion: "1.0.0",
		ios: {
			bundleIdentifier: "com.sunnygo.dev",
		},
		android: {
			package: "com.sunnygo.dev",
		},
		extra: {
			eas: {
				projectId: "dea632ab-80a0-4526-ab61-8a6022535377",
			},
			apiUrl: "https://orderit-backend-6y1m.onrender.com",
			socketUrl: "https://orderit-backend-6y1m.onrender.com",
			stripePublishableKey:
				"pk_test_51Ski7zH5JuPQb6uBXm8NJZxdZ6JOXtMMvr7hBfODwDp2Q5rYjM4bKfEQE1vSsNCcVvN6wKJq8Ls6hPcfqrUxSN6S00qyP6vp7q",
		},
	},
};
