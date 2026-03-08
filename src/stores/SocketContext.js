/**
 * Context global pour Socket.io
 * Gère la connexion et expose le socket à tous les composants
 */

import React, {
	createContext,
	useContext,
	useEffect,
	useState,
	useCallback,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import useSocket from "../../hooks/useSocket";
import useReservationStore from "./useReservationStore";
import useProductStore from "./useProductStore";
import { useServerStore } from "./useRestaurantStaffStore";
import useTableStore from "./useRestaurantTableStore";
import useNotificationStore from "./useNotificationStore";

export const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
	const socketHook = useSocket();
	const [connected, setConnected] = useState(false);

	const attachAllListeners = useCallback((socketInstance) => {
		if (!socketInstance) return;

		// ⭐ Attacher les listeners des stores
		const attachReservationListener =
			useReservationStore.getState().attachSocketListener;
		const attachProductListener =
			useProductStore.getState().attachSocketListener;
		const attachServerListener = useServerStore.getState().attachSocketListener;
		const attachTableListener = useTableStore.getState().attachSocketListener;

		// 🔔 Attacher le listener des notifications
		const attachNotificationListeners =
			useNotificationStore.getState().attachSocketListeners;

		attachReservationListener(socketInstance);
		attachProductListener(socketInstance);
		attachServerListener(socketInstance);
		attachTableListener(socketInstance);
		attachNotificationListeners(socketInstance);
	}, []);

	const setupSocket = useCallback(async () => {
		try {
			// ⭐ Vérifier si un restaurantId existe (mode développeur sans sélection)
			const restaurantId = await AsyncStorage.getItem("restaurantId");

			if (!restaurantId) {
				setConnected(false);
				return;
			}

			const socketInstance = await socketHook.connect();

			if (socketInstance) {
				setConnected(true);
				attachAllListeners(socketInstance);

				// ✅ Écouter les reconnexions (listeners survivent à la reconnexion)
				socketInstance.on("connect", () => {
					setConnected(true);
					// ✅ NE PAS réattacher : les listeners persistent entre reconnexions
					// Réattacher causerait des doublons → memory leak
				});
			} else {
				setConnected(false);
				console.warn("⚠️ Socket.io non disponible, fallback REST API");
			}
		} catch (error) {
			console.error("❌ Erreur setup Socket.io:", error);
			setConnected(false);
		}
	}, [socketHook, attachAllListeners]);

	// ⭐ Utiliser un ref pour suivre si le socket a déjà été setup
	const hasSetupRef = React.useRef(false);

	useEffect(() => {
		// ⭐ Ne setup qu'une seule fois
		if (!hasSetupRef.current) {
			setupSocket();
			hasSetupRef.current = true;
		}

		// ⚠️ Ne PAS déconnecter au unmount car le socket doit rester actif
		// pour toute l'application (même entre changements d'onglets)
		// Le cleanup sera fait uniquement à la fermeture de l'app
	}, []); // ⭐ Dépendances vides = setup une seule fois

	return (
		<SocketContext.Provider value={{ socket: socketHook, connected }}>
			{children}
		</SocketContext.Provider>
	);
};

export const useSocketContext = () => {
	const context = useContext(SocketContext);
	if (!context) {
		console.warn("useSocketContext utilisé hors de SocketProvider");
		return { socket: null, connected: false };
	}
	return context;
};
