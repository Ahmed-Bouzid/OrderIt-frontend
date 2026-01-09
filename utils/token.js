import { getItem as getSecureItem } from "./secureStorage";

// utils/token.js (ou dans le même fichier si tu préfères)
export const getToken = async () => {
	try {
		const token = await getSecureItem("@access_token");
		if (!token) {
			console.warn("⚠️ Pas de token trouvé dans SecureStore");
			return null;
		}
		return token;
	} catch (err) {
		console.error("❌ Erreur lors de la récupération du token :", err);
		return null;
	}
};
export default getToken;
