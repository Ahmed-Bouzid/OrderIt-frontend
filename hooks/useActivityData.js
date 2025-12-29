// hooks/useActivityData.js
import { useState, useEffect } from "react";
import { useAuthFetch } from "./useAuthFetch";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_CONFIG } from "../src/config/apiConfig";

/**
 * Hook custom pour gérer le chargement initial des données
 */

export const useActivityData = () => {
	const [token, setToken] = useState(null);
	const [restaurantId, setRestaurantId] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const [reservations, setReservations] = useState(undefined); // undefined au début, [] si vide
	const [reservationsError, setReservationsError] = useState(null);
	const [products, setProducts] = useState([]); // Ajout produits
	const [productsError, setProductsError] = useState(null);
	const authFetch = useAuthFetch();

	useEffect(() => {
		const loadAllData = async () => {
			setIsLoading(true);
			setReservations(undefined);
			setReservationsError(null);
			setProducts([]);
			setProductsError(null);
			console.log("🔄 Début chargement données...");
			try {
				const [tokenValue, ridValue] = await Promise.all([
					AsyncStorage.getItem("@access_token"),
					AsyncStorage.getItem("restaurantId"),
				]);
				console.log("✅ Données chargées:");
				console.log(
					"   Token:",
					tokenValue ? `${tokenValue.substring(0, 20)}...` : "NULL"
				);
				console.log("   RestaurantId:", ridValue || "NULL");
				const finalRestaurantId = ridValue || API_CONFIG.RESTAURANT_ID;
				setToken(tokenValue);
				setRestaurantId(finalRestaurantId);

				// Fetch des réservations si token et restaurantId présents
				if (tokenValue && finalRestaurantId) {
					try {
						const url = `${API_CONFIG.baseURL}/reservations/restaurant/${finalRestaurantId}`;
						const response = await authFetch(url);
						// On accepte response.reservations ou response (array direct)
						let resas = Array.isArray(response)
							? response
							: Array.isArray(response?.reservations)
							? response.reservations
							: [];
						setReservations(resas);
						setReservationsError(null);
						console.log("📦 Réservations chargées:", resas.length);
					} catch (resaErr) {
						setReservations([]);
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
						console.log("📦 Produits chargés:", prods.length);
					} catch (prodErr) {
						setProducts([]);
						setProductsError(prodErr?.message || String(prodErr));
						console.error("❌ Erreur fetch produits:", prodErr);
					}
				} else {
					setReservations([]);
					setProducts([]);
				}
			} catch (error) {
				console.error("❌ Erreur chargement données:", error);
				setReservations([]);
				setReservationsError(error?.message || String(error));
				setProducts([]);
				setProductsError(error?.message || String(error));
			} finally {
				setTimeout(() => {
					setIsLoading(false);
					console.log("🏁 Fin chargement données (token prêt)");
				}, 100);
			}
		};
		loadAllData();
	}, []);

	return {
		token,
		restaurantId,
		isLoading,
		isTokenLoading: isLoading, // pour compatibilité
		reservations,
		reservationsError,
		products,
		productsError,
	};
};
