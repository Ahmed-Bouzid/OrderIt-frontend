import { useState, useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuthFetch } from "../hooks/useAuthFetch";
import { API_CONFIG } from "../src/config/apiConfig";
import useReservationStore from "../src/stores/useReservationStore";
import useThemeStore from "../src/stores/useThemeStore";
import useSocket from "./useSocket";

export const useDashboardData = () => {
	const authFetch = useAuthFetch();
	const { reservations, fetchReservations, updateReservation } =
		useReservationStore();
	const { theme, initTheme } = useThemeStore();
	const { socket } = useSocket();

	const [tables, setTables] = useState([]);
	const [loading, setLoading] = useState(true);
	const hasLoadedRef = useRef(false);

	// ✅ Initialiser le thème au montage
	useEffect(() => {
		initTheme();
	}, [initTheme]);

	// Charger tables et réservations
	useEffect(() => {
		if (hasLoadedRef.current) return;
		hasLoadedRef.current = true;

		const loadData = async () => {
			try {
				setLoading(true);
				const storedRestaurantId = await AsyncStorage.getItem("restaurantId");

				if (storedRestaurantId) {
					// Charger tables
					const tablesData = await authFetch(
						`${API_CONFIG.baseURL}/tables/restaurant/${storedRestaurantId}`
					);
					if (Array.isArray(tablesData)) {
						setTables(tablesData);
					} else if (tablesData && tablesData.tables) {
						setTables(tablesData.tables);
					}

					// Charger réservations
					await fetchReservations();
				}
			} catch (error) {
				console.error("❌ Erreur chargement données:", error);
			} finally {
				setLoading(false);
			}
		};

		loadData();
	}, [authFetch, fetchReservations]);

	// Rafraîchir les tables périodiquement
	useEffect(() => {
		const interval = setInterval(async () => {
			const storedRestaurantId = await AsyncStorage.getItem("restaurantId");
			if (storedRestaurantId) {
				const tablesData = await authFetch(
					`${API_CONFIG.baseURL}/tables/restaurant/${storedRestaurantId}`
				);
				if (tablesData && !Array.isArray(tablesData)) {
					setTables(tablesData.tables || []);
				}
			}
		}, 5000);

		return () => clearInterval(interval);
	}, [authFetch]);

	// ⭐ Écouter les mises à jour de réservations via WebSocket
	useEffect(() => {
		if (!socket) return;

		const handleReservationUpdate = (event) => {
			console.log("🔔 Dashboard reçoit mise à jour réservation:", event);

			if (event.type === "updated" && event.data) {
				// Mettre à jour la réservation dans le store
				updateReservation(event.data);
				console.log(
					`✅ Réservation ${event.data._id} mise à jour avec totalAmount: ${event.data.totalAmount}€`
				);
			}
		};

		socket.on("reservation", handleReservationUpdate);

		return () => {
			socket.off("reservation", handleReservationUpdate);
		};
	}, [socket, updateReservation]);

	return {
		reservations,
		tables,
		theme,
		loading,
		fetchReservations,
	};
};
