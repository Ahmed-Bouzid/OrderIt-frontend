// Utilitaire pour récupérer le restaurantId depuis AsyncStorage
import AsyncStorage from "@react-native-async-storage/async-storage";

export async function getRestaurantId() {
	let rid = await AsyncStorage.getItem("restaurantId");
	if (!rid) {
		// fallback éventuel
		rid = process.env.RESTAURANT_ID || null;
	}
	return rid;
}
