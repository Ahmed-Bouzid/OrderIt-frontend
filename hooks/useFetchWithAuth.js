import AsyncStorage from "@react-native-async-storage/async-storage";
import { getToken } from "../utils/token";

export function useFetchWithAuth() {
	const fetchWithAuth = async (
		url,
		{ method = "GET", body = null, headers = {}, retryCount = 0 } = {}
	) => {
		try {
			const token = await getToken();

			if (!token) {
				// Token manquant - redirection immédiate
				console.log("❌ Aucun token disponible");
				throw new Error("NO_TOKEN");
			}

			const options = {
				method,
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
					...headers,
				},
			};

			if (body) {
				options.body = JSON.stringify(body);
			}

			const response = await fetch(url, options);

			// 🔥 CRITIQUE : Gérer les erreurs de token SANS créer de boucle
			if (response.status === 401 || response.status === 403) {
				console.log("🔒 Token invalide/expiré, nettoyage...");
				await AsyncStorage.removeItem("token");

				// NE PAS appeler Alert.alert ou router.replace ici
				// À la place, lancer une erreur spéciale
				throw new Error("TOKEN_EXPIRED");
			}

			// Gérer le rate limiting
			if (response.status === 429) {
				if (retryCount < 3) {
					const delay = Math.pow(2, retryCount) * 1000;
					console.log(`⏳ 429 - Retry dans ${delay}ms`);
					await new Promise((resolve) => setTimeout(resolve, delay));
					return fetchWithAuth(url, {
						method,
						body,
						headers,
						retryCount: retryCount + 1,
					});
				}
				throw new Error("RATE_LIMIT");
			}

			// Vérifier si la réponse est OK
			if (!response.ok) {
				const text = await response.text();
				console.error(`❌ Erreur ${response.status}:`, text);
				throw new Error(`HTTP_${response.status}`);
			}

			// Parser la réponse JSON
			const data = await response.json();
			return data;
		} catch (error) {
			// 🔥 IMPORTANT : Ne pas gérer la redirection ici
			// Juste propager l'erreur
			console.error("❌ Erreur fetchWithAuth:", error.message);

			// Pour TOKEN_EXPIRED, on propage simplement
			if (error.message === "TOKEN_EXPIRED" || error.message === "NO_TOKEN") {
				throw error; // Le composant gérera ça
			}

			// Pour les autres erreurs, retourner null ou propager
			throw error;
		}
	};

	return fetchWithAuth;
}
