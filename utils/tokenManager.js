import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_CONFIG } from "../src/config/apiConfig";

/**
 * 🔐 Token Manager - Gestion automatique des tokens JWT
 * Gère le refresh automatique des tokens expirés
 */

const API_URL = API_CONFIG.baseURL;

/**
 * Récupère un token valide (refresh automatique si expiré)
 */
export async function getValidToken() {
	try {
		// Récupération sécurisée des tokens
		let token = await AsyncStorage.getItem("@access_token");
		const refreshToken = await AsyncStorage.getItem("refreshToken");

		if (!token || !refreshToken) {
			throw new Error("Pas de token disponible");
		}

		// Valider le format JWT (doit avoir 3 parties séparées par des points)
		const tokenParts = token.split(".");
		if (tokenParts.length !== 3) {
			console.error(
				"❌ Token malformé détecté:",
				token.substring(0, 20) + "..."
			);
			throw new Error("Token JWT malformé");
		}

		// Vérifier si le token est expiré (JWT decode simple)
		const tokenExpired = isTokenExpired(token);

		if (!tokenExpired) {
			return token;
		}

		// Token expiré → refresh
		console.log("🔄 Token expiré, refresh en cours...");
		const newTokens = await refreshAccessToken(refreshToken);

		if (newTokens) {
			// Sauvegarder de manière sécurisée
			await AsyncStorage.setItem("@access_token", newTokens.accessToken);
			await AsyncStorage.setItem("refreshToken", newTokens.refreshToken);
			console.log("✅ Token rafraîchi avec succès");
			return newTokens.accessToken;
		}

		// ⚠️ Refresh échoué : nettoyer et signaler l'échec
		console.error("❌ Refresh échoué - tokens invalides");
		await clearAllUserData();
		throw new Error("Session expirée - refresh échoué");
	} catch (error) {
		console.error("❌ Erreur getValidToken:", error);
		throw error;
	}
}

/**
 * Vérifie si un token JWT est expiré
 */
function isTokenExpired(token) {
	try {
		const payload = JSON.parse(atob(token.split(".")[1]));
		const expirationTime = payload.exp * 1000; // Convertir en millisecondes
		const currentTime = Date.now();
		const bufferTime = 5 * 60 * 1000; // 5 minutes de buffer

		return currentTime >= expirationTime - bufferTime;
	} catch (error) {
		console.error("❌ Erreur parsing token:", error);
		return true; // En cas d'erreur, considérer comme expiré
	}
}

/**
 * Appelle l'API /refresh pour obtenir de nouveaux tokens
 */
async function refreshAccessToken(refreshToken) {
	try {
		const response = await fetch(`${API_URL}/auth/refresh`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ refreshToken }),
		});

		if (!response.ok) {
			console.error("❌ Refresh failed:", response.status);
			return null;
		}

		const data = await response.json();

		if (data.accessToken && data.refreshToken) {
			return {
				accessToken: data.accessToken,
				refreshToken: data.refreshToken,
			};
		}

		return null;
	} catch (error) {
		console.error("❌ Erreur refresh token:", error);
		return null;
	}
}

/**
 * Fetch avec gestion automatique du refresh token
 */
export async function fetchWithAuth(url, options = {}) {
	try {
		const token = await getValidToken();

		const headers = {
			...options.headers,
			Authorization: `Bearer ${token}`,
		};

		const response = await fetch(url, {
			...options,
			headers,
		});

		// Si 401/403, tenter un refresh et réessayer (SEULEMENT pour GET)
		if (response.status === 401 || response.status === 403) {
			const method = (options.method || "GET").toUpperCase();

			// ⚠️ NE PAS retry les requêtes POST/PUT/PATCH/DELETE (non-idempotentes)
			if (method !== "GET" && method !== "HEAD") {
				console.error(
					`❌ ${method} request failed with 401/403 - cannot retry (non-idempotent)`
				);
				throw new Error("Session expirée, veuillez vous reconnecter");
			}

			console.log("🔄 401/403 détecté sur GET, tentative de refresh...");

			const refreshToken = await AsyncStorage.getItem("refreshToken");
			const newTokens = await refreshAccessToken(refreshToken);

			if (newTokens) {
				await AsyncStorage.setItem("@access_token", newTokens.accessToken);
				await AsyncStorage.setItem("refreshToken", newTokens.refreshToken);

				// Réessayer avec le nouveau token (GET uniquement)
				const retryHeaders = {
					...options.headers,
					Authorization: `Bearer ${newTokens.accessToken}`,
				};

				return fetch(url, {
					...options,
					headers: retryHeaders,
				});
			}

			throw new Error("Session expirée, veuillez vous reconnecter");
		}

		return response;
	} catch (error) {
		console.error("❌ Erreur fetchWithAuth:", error);
		throw error;
	}
}
