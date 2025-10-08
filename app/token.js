import AsyncStorage from "@react-native-async-storage/async-storage";

// utils/token.js (ou dans le même fichier si tu préfères)
export const getToken = async () => {
	try {
		const token = await AsyncStorage.getItem("token");
		if (!token) {
			console.warn("⚠️ Pas de token trouvé dans AsyncStorage");
			return null;
		}
		return token;
	} catch (err) {
		console.error("❌ Erreur lors de la récupération du token :", err);
		return null;
	}
};
