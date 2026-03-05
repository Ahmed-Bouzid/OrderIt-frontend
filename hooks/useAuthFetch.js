// hooks/useAuthFetch.js
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
	getItem as getSecureItem,
	setItem as setSecureItem,
} from "../utils/secureStorage";
import { useCallback, useRef, useEffect } from "react";

import { API_CONFIG } from "../src/config/apiConfig";
const API_BASE_URL = API_CONFIG.baseURL;
const TOKEN_REFRESH_INTERVAL = 105 * 60 * 1000; // Rafraîchir après 1h45 (15 min avant l'expiration 2h)

// ⭐ Variables globales pour éviter les doublons de timers
let globalRefreshInterval = null;
let isRefreshSetup = false;

// authFetch qui garantit TOUJOURS un tableau vide en cas d'erreur (airbag)
// Retourne les données réelles du serveur (objet, tableau) si succès
export function useAuthFetch() {
	const router = useRouter();
	const isRedirectingRef = useRef(false);
	const refreshPromiseRef = useRef(null); // ⭐ Éviter multiples refresh simultanés

	// ⭐ Fonction pour rafraîchir le token
	const refreshAccessToken = useCallback(async () => {
		try {
			const refreshToken = await getSecureItem("refreshToken");

			if (!refreshToken) {
				console.log("⚠️ ATTENTION: Pas de refresh token en AsyncStorage");
				console.log("Tentative de récupération depuis le login...");
				// Ne pas jeter d'erreur immédiatement, attendre que le login repasse
				throw new Error("Pas de refresh token - session perdue");
			}

			console.log("🔑 Refresh token trouvé, tentative de refresh...");

			// ⭐ Faire la requête de refresh
			const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				// ⭐ Passer le refreshToken en body puisqu'on peut pas utiliser les cookies
				body: JSON.stringify({ refreshToken }),
			});

			if (!response.ok) {
				throw new Error(`Refresh échoué: ${response.status}`);
			}

			const data = await response.json();

			if (data.accessToken) {
				// ⭐ Stocker le nouveau token
				await setSecureItem("@access_token", data.accessToken);

				// ⭐ Mettre à jour le refresh token s'il a changé
				if (data.refreshToken) {
					await setSecureItem("refreshToken", data.refreshToken);
				}

				console.log("✅ Token rafraîchi avec succès (anticipé)");
				return data.accessToken;
			}

			throw new Error("Pas de token reçu");
		} catch (error) {
			// ⭐ Gérer les AbortError (timeouts) gracieusement
			if (error.name === "AbortError") {
				console.warn("⏱️ Refresh annulé (timeout)");
				throw error;
			}
			console.error("❌ Erreur refresh token:", error);
			throw error;
		}
	}, []);

	// ⭐ Mettre en place le rafraîchissement automatique du token (SINGLETON GLOBAL)
	const setupAutoRefresh = useCallback(() => {
		// ⭐ Vérifier si le refresh est déjà configuré globalement
		if (isRefreshSetup) {
			console.log("⏭️ Auto-refresh déjà configuré, skip");
			return;
		}

		// Nettoyer l'ancien interval s'il existe
		if (globalRefreshInterval) {
			clearInterval(globalRefreshInterval);
		}

		// Mettre en place un nouvel interval qui rafraîchit le token tous les 110 minutes (1h50)
		globalRefreshInterval = setInterval(async () => {
			try {
				const token = await getSecureItem("@access_token");
				const refreshToken = await getSecureItem("refreshToken");

				console.log(
					"🔍 Vérification auto-refresh: token=",
					!!token,
					"refreshToken=",
					!!refreshToken,
				);

				// Si on a les deux tokens, rafraîchir le token d'accès
				if (token && refreshToken) {
					console.log(
						"🔄 Rafraîchissement automatique du token (avant expiration)...",
					);
					await refreshAccessToken();
				} else {
					console.warn("⚠️ Impossible de rafraîchir: tokens manquants");
					if (!refreshToken) {
						console.error(
							"❌ PROBLÈME CRITQUE: refreshToken disparu de SecureStore!",
						);
						// Force logout si refresh token est perdu
						await setSecureItem("@access_token", "");
						await AsyncStorage.removeItem("restaurantId");
						redirectToLogin(router, isRedirectingRef);
					}
				}
			} catch (error) {
				console.error("❌ Erreur lors du refresh automatique:", error);
				// Ne pas rediriger vers login pour un simple refresh automatique échoué
				// Le vrai refresh au moment d'une requête prendra le relais
			}
		}, TOKEN_REFRESH_INTERVAL);

		isRefreshSetup = true;
	}, [refreshAccessToken, router, isRedirectingRef]); // ⭐ Démarrer le refresh automatique dès que le composant est monté
	useEffect(() => {
		// Vérifier si on a déjà un token, si oui, démarrer le refresh automatique
		const initAutoRefresh = async () => {
			const token = await getSecureItem("@access_token");
			const refreshToken = await getSecureItem("refreshToken");

			if (token && refreshToken && !isRefreshSetup) {
				setupAutoRefresh();
			}
		};

		initAutoRefresh();

		// ⚠️ Ne PAS nettoyer globalRefreshInterval au unmount car il est partagé !
		// Il doit persister pour toute l'app
	}, [setupAutoRefresh]);

	const authFetch = useCallback(
		async (url, options = {}) => {
			try {
				let token = await getSecureItem("@access_token");

				if (!token) {
					console.warn("⚠️ Aucun token disponible, requête annulée :", url);
					// ⭐ Rediriger vers login si pas de token (nettoyer SecureStore)
					await getSecureItem("@access_token")
						.then(() => {})
						.catch(() => {}); // Force cleanup
					redirectToLogin(router, isRedirectingRef);
					throw new Error("Token manquant, fetch annulé");
				}

				// ⭐ Mettre en place le refresh automatique si pas déjà fait
				if (!isRefreshSetup) {
					setupAutoRefresh();
				}

				// ⭐ Construire l'URL complète si c'est un chemin relatif
				const fullUrl = url.startsWith("http") ? url : `${API_BASE_URL}${url}`;

				// ⭐ Sérialiser le body en JSON si c'est un objet
				const fetchOptions = {
					...options,
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
						...options.headers,
					},
				};

				// ⭐ Convertir le body en JSON string si c'est un objet
				if (options.body && typeof options.body === "object") {
					fetchOptions.body = JSON.stringify(options.body);
				}

				let response = await fetch(fullUrl, fetchOptions);

				// ⭐ Si 401, essayer de rafraîchir le token
				if (response.status === 401 || response.status === 403) {
					console.log("🔄 Token expiré, tentative de refresh...");

					try {
						// ⭐ Utiliser une seule promesse de refresh si plusieurs requêtes en parallèle
						if (!refreshPromiseRef.current) {
							refreshPromiseRef.current = refreshAccessToken();
						}

						const newToken = await refreshPromiseRef.current;
						refreshPromiseRef.current = null;

						// ⭐ Réessayer avec le nouveau token
						fetchOptions.headers.Authorization = `Bearer ${newToken}`;
						response = await fetch(fullUrl, fetchOptions);

						if (response.status === 401 || response.status === 403) {
							// ⭐ Refresh a échoué, token vraiment expiré
							throw new Error("Refresh failed");
						}
					} catch (refreshError) {
						console.error("❌ Refresh échoué:", refreshError);
						await setSecureItem("@access_token", "");
						await setSecureItem("refreshToken", "");
						redirectToLogin(router, isRedirectingRef);
						return []; // ⭐ Retourne tableau vide = airbag
					}
				}

				if (!response.ok) {
					console.error(`❌ Erreur ${response.status} sur ${url}`);
					// Log le body de l'erreur pour le debug
					try {
						const errorBody = await response.text();
						console.error(`❌ Body erreur:`, errorBody);
					} catch (e) {
						console.error(`❌ Impossible de lire le body`);
					}
					return []; // ⭐ Retourne tableau vide = airbag
				}

				// ⭐ Parser JSON en toute sécurité
				try {
					const contentType = response.headers.get("content-type");
					if (!contentType || !contentType.includes("application/json")) {
						console.warn("⚠️ Réponse non-JSON du serveur:", contentType);
						return []; // ⭐ Airbag si réponse non-JSON
					}
					const data = await response.json();
					return data;
				} catch (parseError) {
					console.error("❌ Erreur parsing JSON:", parseError);
					const bodyText = await response.text();
					console.error("❌ Body brut:", bodyText);
					return []; // ⭐ Airbag en cas d'erreur JSON
				}
			} catch (error) {
				// ⭐ Gérer les AbortError (timeouts) gracieusement
				if (error.name === "AbortError") {
					console.warn("⏱️ Requête annulée (timeout):", url);
					return []; // ⭐ Retourne tableau vide = airbag
				}
				console.error("❌ Erreur réseau:", error);
				return []; // ⭐ Retourne tableau vide = airbag
			}
		},
		[router, refreshAccessToken, setupAutoRefresh],
	);

	return authFetch;
}

// ⭐ Fonction exportée pour initialiser le refresh automatique après le login
export async function startTokenRefresh() {
	try {
		const token = await getSecureItem("@access_token");
		const refreshToken = await getSecureItem("refreshToken");

		if (token && refreshToken) {
			console.log("🚀 Démarrage forcé du refresh automatique après login");
			// Le refresh sera géré par useAuthFetch dans le composant principal
			return true;
		}
		return false;
	} catch (error) {
		console.error("❌ Erreur startTokenRefresh:", error);
		return false;
	}
}

// ⭐ Fonction helper pour la redirection (exportée pour réutilisation)
export const redirectToLogin = (router, isRedirectingRef) => {
	if (!isRedirectingRef.current) {
		isRedirectingRef.current = true;

		Alert.alert(
			"Session expirée",
			"Veuillez vous reconnecter.",
			[
				{
					text: "OK",
					onPress: () => {
						isRedirectingRef.current = false;
						router.replace("/login");
					},
				},
			],
			{ cancelable: false },
		);
	}
};
