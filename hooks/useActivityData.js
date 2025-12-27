// hooks/useActivityData.js
import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_CONFIG } from "../src/config/apiConfig";

/**
 * Hook custom pour gérer le chargement initial des données
 */
export const useActivityData = () => {
	const [token, setToken] = useState(null);
	const [restaurantId, setRestaurantId] = useState(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const loadAllData = async () => {
			setIsLoading(true);
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
			} catch (error) {
				console.error("❌ Erreur chargement données:", error);
			} finally {
				// 🧩 attendre que React ait appliqué le setToken avant d’autoriser le rendu
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
	};
};
