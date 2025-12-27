/**
 * Hook custom pour gérer la connexion WebSocket
 * Avec fallback automatique en cas d'erreur
 */

import { useRef, useCallback } from "react";
import { io } from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_CONFIG } from "../src/config/apiConfig";
import { SOCKET_CONFIG } from "../src/config/apiConfig";

let socketInstance = null;

const useSocket = () => {
	const socketRef = useRef(null);
	const reconnectAttemptsRef = useRef(0);
	const fallbackModeRef = useRef(false);
	const MAX_RECONNECT_ATTEMPTS = 5;

	const connect = useCallback(async () => {
		try {
			// Récupérer le token depuis AsyncStorage
			const token = await AsyncStorage.getItem("token");
			if (!token) {
				console.warn("⚠️ Socket: Token non disponible, skipping connection");
				fallbackModeRef.current = true;
				return null;
			}

			// Si une connexion existe déjà, la retourner
			if (socketInstance && socketInstance.connected) {
				console.log("🔌 Socket déjà connecté");
				return socketInstance;
			}

			// Créer une nouvelle connexion avec la config Render
			console.log(
				"🔌 Tentative de connexion Socket.io...",
				SOCKET_CONFIG.socketURL,
				SOCKET_CONFIG.options
			);
			const socket = io(SOCKET_CONFIG.socketURL, {
				...SOCKET_CONFIG.options,
				auth: { token },
			});

			// Événement de connexion
			socket.on("connect", () => {
				console.log("✅ Socket connecté avec succès");
				reconnectAttemptsRef.current = 0;
				fallbackModeRef.current = false;
			});

			// Événement de déconnexion
			socket.on("disconnect", (reason) => {
				console.warn("🔌 Socket déconnecté:", reason);
			});

			// Événement d'erreur
			socket.on("connect_error", (error) => {
				console.error("❌ Erreur connexion Socket:", error.message);
				reconnectAttemptsRef.current += 1;
				if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
					console.error(
						"❌ Max reconnection attempts reached, activating REST API fallback"
					);
					fallbackModeRef.current = true;
					socket.disconnect();
				}
			});

			socketInstance = socket;
			socketRef.current = socket;
			return socket;
		} catch (error) {
			console.error("❌ Erreur lors de la connexion Socket:", error);
			fallbackModeRef.current = true;
			return null;
		}
	}, []);

	const disconnect = useCallback(() => {
		if (socketRef.current) {
			socketRef.current.disconnect();
			socketRef.current = null;
			socketInstance = null;
			console.log("🔌 Socket déconnecté manuellement");
		}
	}, []);

	// Fonction pour écouter les événements
	const on = useCallback((event, callback) => {
		if (socketRef.current && socketRef.current.connected) {
			socketRef.current.on(event, callback);
		}
	}, []);

	// Fonction pour arrêter l'écoute des événements
	const off = useCallback((event, callback) => {
		if (socketRef.current) {
			socketRef.current.off(event, callback);
		}
	}, []);

	// Fonction pour émettre des événements
	const emit = useCallback((event, data) => {
		if (socketRef.current && socketRef.current.connected) {
			socketRef.current.emit(event, data);
		}
	}, []);

	// Getter pour vérifier si connecté
	const isConnected = useCallback(() => {
		return socketRef.current && socketRef.current.connected;
	}, []);

	// Getter pour savoir si en mode fallback
	const isFallbackMode = useCallback(() => {
		return fallbackModeRef.current;
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
