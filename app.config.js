export default {
	expo: {
		name: "OrderIt",
		slug: "orderit",
		version: "1.0.0",
		scheme: "orderit", // Ajout pour corriger le warning Expo Linking
		extra: {
			apiUrl: "https://orderit-backend-6y1m.onrender.com",
			socketUrl: "https://orderit-backend-6y1m.onrender.com",
		},
	},
};
