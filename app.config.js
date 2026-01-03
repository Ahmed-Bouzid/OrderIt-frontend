export default {
	expo: {
		name: "OrderIt",
		slug: "orderit",
		version: "1.0.0",
		scheme: "orderit", // Ajout pour corriger le warning Expo Linking
		ios: {
			bundleIdentifier: "com.anonymous.orderit",
		},
		android: {
			package: "com.anonymous.orderit",
		},
		extra: {
			eas: {
				projectId: "7f4da96b-0521-4dd5-a79c-03ca45d626c8",
			},
			apiUrl: "https://orderit-backend-6y1m.onrender.com",
			socketUrl: "https://orderit-backend-6y1m.onrender.com",
			stripePublishableKey:
				"pk_test_51Ski7zH5JuPQb6uBXm8NJZxdZ6JOXtMMvr7hBfODwDp2Q5rYjM4bKfEQE1vSsNCcVvN6wKJq8Ls6hPcfqrUxSN6S00qyP6vp7q",
		},
	},
};
