// hooks/useActivityData.js
import { useState, useEffect } from "react";
import { useAuthFetch } from "./useAuthFetch";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_CONFIG } from "../src/config/apiConfig";
import useReservationStore from "../src/stores/useReservationStore";

/**
 * Hook custom pour gérer le chargement initial des données
 * ⭐ IMPORTANT: Les réservations viennent maintenant du store Zustand
 *    pour être synchronisées avec les WebSocket
 */

export const useActivityData = () => {
	const [token, setToken] = useState(null);
	const [restaurantId, setRestaurantId] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const [reservationsError, setReservationsError] = useState(null);
	const [products, setProducts] = useState([]); // Ajout produits
	const [productsError, setProductsError] = useState(null);
	const [servers, setServers] = useState([]); // ⭐ Ajout serveurs
	const [tableId, setTableId] = useState(null); // ⭐ Ajout tableId
	const [serverId, setServerId] = useState(null); // ⭐ Ajout serverId
	const authFetch = useAuthFetch();

	// ⭐ Utiliser le store Zustand pour les réservations (synchro WebSocket)
	const reservations = useReservationStore((state) => state.reservations);
	const fetchReservationsFromStore = useReservationStore(
		(state) => state.fetchReservations
	);

	useEffect(() => {
		const loadAllData = async () => {
			setIsLoading(true);
			setReservationsError(null);
			setProducts([]);
			setProductsError(null);
			try {
				const [tokenValue, ridValue] = await Promise.all([
					AsyncStorage.getItem("@access_token"),
					AsyncStorage.getItem("restaurantId"),
				]);
				const finalRestaurantId = ridValue || API_CONFIG.RESTAURANT_ID;
				setToken(tokenValue);
				setRestaurantId(finalRestaurantId);

				// ⭐ Fetch des réservations via le store Zustand (force refresh au chargement)
				if (tokenValue && finalRestaurantId) {
					try {
						const result = await fetchReservationsFromStore(true); // force = true
						if (!result.success) {
							setReservationsError(result.message);
							console.error("❌ Erreur fetch réservations:", result.message);
						}
					} catch (resaErr) {
						setReservationsError(resaErr?.message || String(resaErr));
						console.error("❌ Erreur fetch réservations:", resaErr);
					}
					// Fetch des produits (menu)
					try {
						const urlProducts = `${API_CONFIG.baseURL}/products/restaurant/${finalRestaurantId}`;
						const responseProducts = await authFetch(urlProducts);
						// On accepte response.products ou response (array direct)
						let prods = Array.isArray(responseProducts)
							? responseProducts
							: Array.isArray(responseProducts?.products)
							? responseProducts.products
							: [];
						setProducts(prods);
						setProductsError(null);
					} catch (prodErr) {
						setProducts([]);
						setProductsError(prodErr?.message || String(prodErr));
						console.error("❌ Erreur fetch produits:", prodErr);
					}
				}
			} catch (error) {
				console.error("❌ Erreur chargement données:", error);
				setReservationsError(error?.message || String(error));
				setProducts([]);
				setProductsError(error?.message || String(error));
			} finally {
				setIsLoading(false);
			}
		};
		loadAllData();
	}, []);

	return {
		token,
		restaurantId,
		isLoading,
		isTokenLoading: isLoading, // pour compatibilité
		reservations, // ⭐ Maintenant depuis le store Zustand (synchro WebSocket)
		reservationsError,
		products,
		productsError,
		servers, // ⭐ Ajout serveurs
		tableId, // ⭐ Ajout tableId
		serverId, // ⭐ Ajout serverId
	};
};
