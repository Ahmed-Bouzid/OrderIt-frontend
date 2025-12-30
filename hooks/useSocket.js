import { useRef, useCallback, useEffect } from "react";
import { io } from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SOCKET_CONFIG } from "../src/config/apiConfig";

// ============ SINGLETON & ÉTAT GLOBAL ============
let socketInstance = null;
let globalReconnectAttempts = 0;
let globalFallbackMode = false;
let reconnectTimer = null;
let fallbackExitTimer = null;

// ============ CONSTANTES ============
const MAX_RECONNECT_ATTEMPTS = 5;
const INITIAL_RECONNECT_DELAY = 1000; // 1s
const MAX_RECONNECT_DELAY = 30000; // 30s
const FALLBACK_EXIT_DELAY = 5 * 60 * 1000; // 5 minutes
const SOFT_DISCONNECT_TYPES = [
	"ping timeout",
	"transport close",
	"transport error",
];

// ============ UTILITAIRES ============

/**
 * Calcule le délai de reconnexion avec backoff exponentiel
 * @param {number} attempt - Numéro de la tentative
 * @returns {number} Délai en millisecondes
 */
const calculateBackoffDelay = (attempt) => {
	const delay = Math.min(
		INITIAL_RECONNECT_DELAY * Math.pow(2, attempt),
		MAX_RECONNECT_DELAY
	);
	// Ajout d'un jitter (variation aléatoire ±20%) pour éviter les reconnexions simultanées
	const jitter = delay * 0.2 * (Math.random() - 0.5);
	return Math.floor(delay + jitter);
};

/**
 * Vérifie si la déconnexion est "douce" (timeout, inactivité)
 * Ces déconnexions ne comptent pas comme des échecs critiques
 */
const isSoftDisconnect = (reason) => {
	return SOFT_DISCONNECT_TYPES.some((type) => reason.includes(type));
};

/**
 * Planifie une sortie automatique du mode fallback
 */
const scheduleFallbackExit = () => {
	if (fallbackExitTimer) clearTimeout(fallbackExitTimer);

	console.log(
		`⏱️ Sortie du fallback planifiée dans ${FALLBACK_EXIT_DELAY / 60000}min`
	);

	fallbackExitTimer = setTimeout(() => {
		if (globalFallbackMode) {
			console.log("🔄 Tentative de sortie du mode fallback...");
			globalFallbackMode = false;
			globalReconnectAttempts = 0;

			// Tenter une reconnexion si le socket existe mais est déconnecté
			if (socketInstance && !socketInstance.connected) {
				console.log("🔌 Reconnexion automatique depuis le fallback");
				socketInstance.connect();
			}
		}
	}, FALLBACK_EXIT_DELAY);
};

/**
 * Nettoie les listeners internes du socket
 */
const cleanupInternalListeners = (socket) => {
	if (!socket) return;
	socket.off("connect");
	socket.off("disconnect");
	socket.off("connect_error");
	socket.off("reconnect_attempt");
	socket.off("reconnect_failed");
};

// ============ HOOK PRINCIPAL ============

const useSocket = () => {
	const socketRef = useRef(null);
	const listenerMapRef = useRef(new Map()); // Track des listeners custom pour cleanup

	// Cleanup à la destruction du hook
	useEffect(() => {
		return () => {
			// Nettoyer les listeners custom de cette instance
			listenerMapRef.current.forEach((callback, event) => {
				if (socketRef.current) {
					socketRef.current.off(event, callback);
				}
			});
			listenerMapRef.current.clear();
		};
	}, []);

	const connect = useCallback(async () => {
		try {
			// Récupérer les tokens
			const token = await AsyncStorage.getItem("@access_token");
			const refreshToken = await AsyncStorage.getItem("refreshToken");

			if (!token || !refreshToken) {
				console.log("ℹ️ Socket: En attente de connexion utilisateur");
				globalFallbackMode = true;
				return null;
			}

			// Si déjà connecté, retourner l'instance existante
			if (socketInstance && socketInstance.connected) {
				console.log("🔌 Socket déjà connecté");
				socketRef.current = socketInstance;
				return socketInstance;
			}

			// Si une instance existe mais déconnectée, nettoyer les anciens listeners
			if (socketInstance) {
				console.log("🔌 Nettoyage des anciens listeners...");
				cleanupInternalListeners(socketInstance);
			}

			// Créer ou récupérer l'instance
			if (!socketInstance) {
				console.log("🔌 Création d'une nouvelle connexion Socket.io...");
				socketInstance = io(SOCKET_CONFIG.socketURL, {
					...SOCKET_CONFIG.options,
					auth: { token },
					reconnection: true,
					reconnectionAttempts: Infinity,
					reconnectionDelay: INITIAL_RECONNECT_DELAY,
					reconnectionDelayMax: MAX_RECONNECT_DELAY,
					timeout: 20000,
				});
			}

			const socket = socketInstance;
			socketRef.current = socket;

			// ============ LISTENER: CONNEXION RÉUSSIE ============
			socket.off("connect"); // Nettoyer l'ancien
			socket.on("connect", () => {
				console.log("✅ Socket connecté avec succès");

				// Réinitialiser les compteurs
				globalReconnectAttempts = 0;
				globalFallbackMode = false;

				// Annuler les timers
				if (reconnectTimer) {
					clearTimeout(reconnectTimer);
					reconnectTimer = null;
				}
				if (fallbackExitTimer) {
					clearTimeout(fallbackExitTimer);
					fallbackExitTimer = null;
				}
			});

			// ============ LISTENER: DÉCONNEXION ============
			socket.off("disconnect");
			socket.on("disconnect", (reason) => {
				console.warn(`🔌 Socket déconnecté: ${reason}`);

				// Différencier les types de déconnexion
				if (isSoftDisconnect(reason)) {
					console.log(
						"💤 Déconnexion douce (timeout/inactivité) - reconnexion rapide"
					);
					// Ne pas incrémenter le compteur pour les déconnexions douces
					// Socket.io reconnectera automatiquement avec un délai court
				} else if (reason === "io server disconnect") {
					console.warn("⚠️ Déconnexion initiée par le serveur");
					// Le serveur a fermé la connexion, reconnexion manuelle requise
					socket.connect();
				} else if (reason === "io client disconnect") {
					console.log("ℹ️ Déconnexion manuelle par le client");
					// Déconnexion volontaire, ne rien faire
				} else {
					console.error(`❌ Déconnexion critique: ${reason}`);
					globalReconnectAttempts += 1;
				}
			});

			// ============ LISTENER: ERREUR DE CONNEXION ============
			socket.off("connect_error");
			socket.on("connect_error", (error) => {
				console.error("❌ Erreur connexion Socket:", error?.message || error);

				globalReconnectAttempts += 1;

				// Calcul du backoff
				const delay = calculateBackoffDelay(globalReconnectAttempts - 1);
				console.log(
					`🔄 Tentative ${globalReconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} - Prochaine dans ${delay}ms`
				);

				// Activer le fallback après max tentatives
				if (globalReconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
					console.error(
						"❌ Max tentatives atteint → Activation du mode fallback REST"
					);
					globalFallbackMode = true;

					// Planifier une sortie automatique du fallback
					scheduleFallbackExit();
				}
			});

			// ============ LISTENER: TENTATIVE DE RECONNEXION ============
			socket.off("reconnect_attempt");
			socket.on("reconnect_attempt", (attemptNumber) => {
				console.log(`🔄 Tentative de reconnexion #${attemptNumber}...`);
			});

			// ============ LISTENER: ÉCHEC DÉFINITIF ============
			socket.off("reconnect_failed");
			socket.on("reconnect_failed", () => {
				console.error("❌ Reconnexion échouée définitivement");
				globalFallbackMode = true;
				scheduleFallbackExit();
			});

			return socket;
		} catch (error) {
			console.error("❌ Erreur lors de la création du socket:", error);
			globalFallbackMode = true;
			scheduleFallbackExit();
			return null;
		}
	}, []);

	const disconnect = useCallback(() => {
		console.log("🔌 Déconnexion manuelle du socket...");

		// Nettoyer les timers
		if (reconnectTimer) {
			clearTimeout(reconnectTimer);
			reconnectTimer = null;
		}
		if (fallbackExitTimer) {
			clearTimeout(fallbackExitTimer);
			fallbackExitTimer = null;
		}

		// Nettoyer les listeners custom de cette instance
		listenerMapRef.current.forEach((callback, event) => {
			if (socketRef.current) {
				socketRef.current.off(event, callback);
			}
		});
		listenerMapRef.current.clear();

		// Déconnecter si c'est la dernière référence
		if (socketRef.current) {
			cleanupInternalListeners(socketRef.current);
			socketRef.current.disconnect();
			socketRef.current = null;
		}

		// Ne pas détruire le singleton global ici (d'autres hooks pourraient l'utiliser)
		// socketInstance sera réutilisé lors du prochain connect()
	}, []);

	// Fonction pour écouter les événements custom
	const on = useCallback((event, callback) => {
		if (socketRef.current) {
			// Nettoyer l'ancien listener s'il existe
			const oldCallback = listenerMapRef.current.get(event);
			if (oldCallback) {
				socketRef.current.off(event, oldCallback);
			}

			// Ajouter le nouveau listener
			socketRef.current.on(event, callback);
			listenerMapRef.current.set(event, callback);
		}
	}, []);

	// Fonction pour arrêter l'écoute des événements custom
	const off = useCallback((event, callback) => {
		if (socketRef.current) {
			socketRef.current.off(event, callback);
			listenerMapRef.current.delete(event);
		}
	}, []);

	// Fonction pour émettre des événements
	const emit = useCallback((event, data) => {
		if (socketRef.current && socketRef.current.connected) {
			socketRef.current.emit(event, data);
			return true;
		} else {
			console.warn(`⚠️ Cannot emit "${event}": socket not connected`);
			return false;
		}
	}, []);

	// Getter pour vérifier si connecté
	const isConnected = useCallback(() => {
		return socketRef.current?.connected || false;
	}, []);

	// Getter pour savoir si en mode fallback
	const isFallbackMode = useCallback(() => {
		return globalFallbackMode;
	}, []);

	return {
		connect,
		disconnect,
		on,
		off,
		emit,
		isConnected,
		isFallbackMode,
		socket: socketRef.current,
	};
};

export default useSocket;
