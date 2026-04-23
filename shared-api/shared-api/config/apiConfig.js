import { Resto_id_key } from "./restaurantConfig.js";

export const API_CONFIG = {
	BASE_URL:
		process.env.EXPO_PUBLIC_API_BASE_URL ||
		"https://orderit-backend-6y1m.onrender.com",
	RESTAURANT_ID: Resto_id_key,
};
