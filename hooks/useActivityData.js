// hooks/useActivityData.js
import { useState, useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { getToken } from "../utils/token";
import useReservationStore from "../src/stores/useReservationStore";
import { useServerStore } from "../src/stores/useRestaurantStaffStore";
import useTableStore from "../src/stores/useRestaurantTableStore";
import useProductStore from "../src/stores/useProductStore";

/**
 * Hook custom pour gérer le chargement initial des données
 */
export const useActivityData = () => {
	const router = useRouter();
	const [token, setToken] = useState(null);
	const [isTokenLoading, setIsTokenLoading] = useState(true);
	const [restaurantId, setRestaurantId] = useState(null);
	const [tableId, setTableId] = useState(null);
	const [serverId, setServerId] = useState(null);
	const [isLoading, setIsLoading] = useState(false);

	const hasInitialLoadRef = useRef(false);
	const hasLoadedReservationsRef = useRef(false);

	// Stores Zustand
	const reservations = useReservationStore((state) => state.reservations);
	const fetchReservations = useReservationStore(
		(state) => state.fetchReservations
	);
	const fetchTables = useTableStore((state) => state.fetchTables);
	const tables = useTableStore((state) => state.tables);
	const fetchServers = useServerStore((state) => state.fetchServers);
	const products = useProductStore((state) => state.products);
	const fetchProducts = useProductStore((state) => state.fetchProducts);
	const servers = useServerStore((state) => state.servers);

	// Charger le restaurantId depuis AsyncStorage
	useEffect(() => {
		const fetchRestaurantId = async () => {
			try {
				const id = await AsyncStorage.getItem("restaurantId");
				setRestaurantId(id);
			} catch (err) {
				console.error("❌ Erreur récupération restaurantId:", err);
			}
		};
		fetchRestaurantId();
	}, []);

	// Charger le token JWT
	useEffect(() => {
		const initToken = async () => {
			setIsTokenLoading(true);
			const t = await getToken();
			setToken(t);
			setIsTokenLoading(false);
		};
		initToken();
	}, []);

	// Charger tables, serveurs et produits
	useEffect(() => {
		if (!restaurantId || hasInitialLoadRef.current) return;
		hasInitialLoadRef.current = true;

		const loadData = async () => {
			try {
				// Vérifier si les données sont déjà en cache
				const cachedTables = useTableStore.getState().tables;
				const cachedServers = useServerStore.getState().servers;
				const cachedProducts = useProductStore.getState().products;

				// Ne montrer le loader que si les données ne sont pas en cache
				const needsLoading =
					cachedTables.length === 0 ||
					cachedServers.length === 0 ||
					cachedProducts.length === 0;

				if (needsLoading) {
					setIsLoading(true);
				}

				const adminToken = await AsyncStorage.getItem("token");

				// Charger uniquement si nécessaire
				if (cachedTables.length === 0) {
					await fetchTables(restaurantId);
				}
				const allTables = useTableStore.getState().tables;
				if (allTables.length > 0 && !tableId) setTableId(allTables[0]._id);

				if (cachedServers.length === 0) {
					await fetchServers(restaurantId);
				}
				const allServers = useServerStore.getState().servers;
				if (allServers.length > 0 && !serverId) setServerId(allServers[0]._id);

				if (cachedProducts.length === 0) {
					await fetchProducts(adminToken);
				}

				setIsLoading(false);
			} catch (error) {
				console.error("❌ Erreur chargement initial:", error);
				hasInitialLoadRef.current = false;
				setIsLoading(false);
			}
		};

		loadData();
		return () => {
			hasInitialLoadRef.current = false;
		};
	}, [
		restaurantId,
		fetchTables,
		fetchServers,
		fetchProducts,
		tableId,
		serverId,
	]);

	// Charger réservations
	useEffect(() => {
		if (hasLoadedReservationsRef.current) return;
		hasLoadedReservationsRef.current = true;

		const loadReservations = async () => {
			const result = await fetchReservations();

			if (!result.success) {
				console.log("Erreur fetch réservations:", result.error);
				if (result.error === "NO_TOKEN" || result.error === "INVALID_TOKEN") {
					router.push("/login");
				}
			}
		};
		loadReservations();

		return () => {
			hasLoadedReservationsRef.current = false;
		};
	}, [fetchReservations, router]);

	return {
		token,
		isTokenLoading,
		restaurantId,
		tableId,
		setTableId,
		serverId,
		setServerId,
		isLoading,
		reservations,
		fetchReservations,
		products,
		servers,
	};
};
