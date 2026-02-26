/**
 * 📨 useMessages - Hook pour gestion messagerie interne
 */
import { useCallback, useState } from "react";
import { useAuthFetch } from "./useAuthFetch";
import { useMessagesStore } from "../src/stores/useMessagesStore";

export const useMessages = () => {
	const authFetch = useAuthFetch();
	const store = useMessagesStore();
	const [isLoading, setIsLoading] = useState(false);

	// Récupérer les messages du serveur
	const fetchMessages = useCallback(
		async (status = "pending", limit = 50, skip = 0) => {
			// ⛔ Bloqué si feature indisponible (pas de retry automatique)
			if (!store.featureAvailable) {
				console.warn("⚠️ Messagerie indisponible (backend non déployé)");
				return null;
			}

			setIsLoading(true);
			try {
				const response = await authFetch(
					`/messages/server?status=${status}&limit=${limit}&skip=${skip}`,
					{
						method: "GET",
					},
				);

				// ⛔ Détecter si authFetch a retourné [] (erreur 404 ou autre)
				if (Array.isArray(response) && response.length === 0) {
					console.error(
						"❌ API messagerie indisponible - Backend non déployé ?",
					);
					store.setFeatureAvailable(false);
					store.setError("Messagerie interne non disponible sur ce serveur");
					return null;
				}

				if (response && response.success) {
					store.setMessages(response.messages);
					return response;
				} else {
					store.setError(response?.error || "Erreur de chargement");
					return null;
				}
			} catch (error) {
				console.error("❌ [useMessages] fetchMessages error:", error);
				store.setError(error.message);
				store.setFeatureAvailable(false);
				return null;
			} finally {
				setIsLoading(false);
			}
		},
		[authFetch, store],
	);

	// Récupérer le nombre de messages non lus
	const fetchUnreadCount = useCallback(async () => {
		// ⛔ Bloqué si feature indisponible
		if (!store.featureAvailable) {
			return 0;
		}

		try {
			const response = await authFetch("/messages/unread", {
				method: "GET",
			});

			// ⛔ Détecter si authFetch a retourné [] (erreur 404)
			if (Array.isArray(response) && response.length === 0) {
				console.error("❌ API messagerie indisponible");
				store.setFeatureAvailable(false);
				return 0;
			}

			if (response && response.success) {
				store.setUnreadCount(response.unreadCount);
				return response.unreadCount;
			}
			return 0;
		} catch (error) {
			console.error("❌ [useMessages] fetchUnreadCount error:", error);
			store.setFeatureAvailable(false);
			return 0;
		}
	}, [authFetch, store]);

	// Créer un nouveau message (Manager only)
	const sendMessage = useCallback(
		async (messageData) => {
			setIsLoading(true);
			try {
				const response = await authFetch("/messages", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(messageData),
				});

				if (response.success) {
					return response.message;
				} else {
					store.setError(response.error || "Erreur d'envoi");
					return null;
				}
			} catch (error) {
				console.error("❌ [useMessages] sendMessage error:", error);
				store.setError(error.message);
				return null;
			} finally {
				setIsLoading(false);
			}
		},
		[authFetch, store],
	);

	// Répondre à un message (Accepter/Refuser)
	const respondToMessage = useCallback(
		async (messageId, status, notes = "") => {
			setIsLoading(true);
			try {
				const response = await authFetch(`/messages/${messageId}/respond`, {
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ status, notes }),
				});

				if (response.success) {
					store.respondToMessage(messageId, {
						status,
						respondedAt: new Date(),
						notes,
					});
					return response.message;
				} else {
					store.setError(response.error || "Erreur de réponse");
					return null;
				}
			} catch (error) {
				console.error("❌ [useMessages] respondToMessage error:", error);
				store.setError(error.message);
				return null;
			} finally {
				setIsLoading(false);
			}
		},
		[authFetch, store],
	);

	// Marquer un message comme lu
	const markAsRead = useCallback(
		async (messageId) => {
			try {
				const response = await authFetch(`/messages/${messageId}/read`, {
					method: "PUT",
				});

				if (response.success) {
					store.markAsRead(messageId);
					return true;
				}
				return false;
			} catch (error) {
				console.error("❌ [useMessages] markAsRead error:", error);
				return false;
			}
		},
		[authFetch, store],
	);

	// Supprimer un message
	const deleteMessage = useCallback(
		async (messageId) => {
			setIsLoading(true);
			try {
				const response = await authFetch(`/messages/${messageId}`, {
					method: "DELETE",
				});

				if (response.success) {
					store.removeMessage(messageId);
					return true;
				} else {
					store.setError(response.error || "Erreur de suppression");
					return false;
				}
			} catch (error) {
				console.error("❌ [useMessages] deleteMessage error:", error);
				store.setError(error.message);
				return false;
			} finally {
				setIsLoading(false);
			}
		},
		[authFetch, store],
	);

	// Récupérer l'historique d'un message
	const fetchHistory = useCallback(
		async (messageId) => {
			try {
				const response = await authFetch(`/messages/${messageId}/history`, {
					method: "GET",
				});

				if (response.success) {
					return response.history;
				}
				return [];
			} catch (error) {
				console.error("❌ [useMessages] fetchHistory error:", error);
				return [];
			}
		},
		[authFetch],
	);

	// Récupérer les statistiques (Manager only)
	const fetchStats = useCallback(async () => {
		try {
			const response = await authFetch("/messages/stats", {
				method: "GET",
			});

			if (response.success) {
				return response.stats;
			}
			return null;
		} catch (error) {
			console.error("❌ [useMessages] fetchStats error:", error);
			return null;
		}
	}, [authFetch]);

	// ⭐ Forcer un nouvel essai (appelé manuellement par l'utilisateur)
	const retryConnection = useCallback(() => {
		console.log("🔄 Réinitialisation de la connexion messagerie...");
		store.setFeatureAvailable(true);
		store.setError(null);
	}, [store]);

	// ⛔ DÉSACTIVÉ : L'auto-fetch au montage causait des boucles infinies
	// Le composant appelant doit explicitement appeler fetchUnreadCount()
	// useEffect(() => {
	// 	if (store.featureAvailable) {
	// 		fetchUnreadCount();
	// 	}
	// }, [fetchUnreadCount, store.featureAvailable]);

	return {
		// État
		messages: store.messages,
		unreadCount: store.unreadCount,
		isLoading,
		error: store.error,
		featureAvailable: store.featureAvailable,

		// Méthodes
		fetchMessages,
		fetchUnreadCount,
		sendMessage,
		respondToMessage,
		markAsRead,
		deleteMessage,
		fetchHistory,
		fetchStats,
		retryConnection, // ⭐ Permet de réessayer manuellement

		// Reset
		reset: store.reset,
	};
};
