/**
 * Activity.jsx - Écran Activité Premium
 * Interface de gestion des réservations actives avec design spatial
 */
import { API_CONFIG } from "../../src/config/apiConfig";
import React, {
	useState,
	useEffect,
	useMemo,
	useCallback,
	useRef,
} from "react";
import { getTheme } from "../../utils/themeUtils";
import styles from "../styles";
import Login from "../../app/login";
import {
	View,
	Text,
	TouchableOpacity,
	ScrollView,
	Alert,
	FlatList,
	StyleSheet,
	Dimensions,
	Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import useThemeStore from "../../src/stores/useThemeStore";
import useTableStore from "../../src/stores/useRestaurantTableStore";
import useReservationStore from "../../src/stores/useReservationStore";
import { useAuthFetch } from "../../hooks/useAuthFetch";

// Custom hooks
import { useActivityData } from "../../hooks/useActivityData";
import { useReservationManager } from "../../hooks/useReservationManager";

// Modales
import { SettingsModal, ProductModal, PaymentModal } from "../activity/modals";

// Composants
import {
	ReservationDetails,
	ServiceSection,
	PaymentSection,
	ProductSelection,
	LoadingSkeleton,
} from "../activity/components";

export default function Activity() {
	// Rafraîchissement global pour le temps écoulé (mini popups dynamiques)
	const [now, setNow] = useState(Date.now());
	useEffect(() => {
		const interval = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(interval);
	}, []);
	const { themeMode, theme, initTheme } = useThemeStore();
	const THEME = useMemo(() => getTheme(themeMode), [themeMode]);
	const authFetch = useAuthFetch();
	const activityStyles = useMemo(() => createStyles(THEME), [THEME]);

	// Custom hooks

	const {
		token,
		isTokenLoading,
		restaurantId,
		tableId,
		// setTableId, // Non utilisé actuellement
		serverId,
		// setServerId, // Non utilisé actuellement
		isLoading,
		reservations,
		products,
		servers,
	} = useActivityData();

	// ⭐ Utiliser fetchReservations du store Zustand (synchro avec WebSocket)
	const fetchReservationsFromStore = useReservationStore(
		(state) => state.fetchReservations
	);

	// On ne force plus le fetch ici, on laisse la logique du hook gérer le chargement via isReservationsLoaded

	// ⭐ MODIFIÉ: fetchReservations utilise maintenant le store Zustand avec force=true
	const fetchReservations = React.useCallback(async () => {
		if (!restaurantId) {
			console.error("❌ restaurantId manquant");
			throw new Error("RestaurantId manquant");
		}

		try {
			// ⭐ Utiliser le store Zustand avec force=true pour rafraîchir les données
			const result = await fetchReservationsFromStore(true);

			if (result?.success) {
				return { reservations: result.data };
			} else {
				throw new Error(result?.message || "Erreur fetch réservations");
			}
		} catch (error) {
			console.error("❌ Erreur fetchReservations:", error.message);
			throw error;
		}
	}, [restaurantId, fetchReservationsFromStore]);

	// Gestion explicite d'erreur si restaurantId manquant, mais seulement après chargement
	useEffect(() => {
		if (isLoading) return;
		if (!restaurantId) {
			console.error(
				"❌ restaurantId manquant dans Activity.jsx : fetchServers ne sera pas appelé ! (valeur:",
				restaurantId,
				")"
			);
			Alert.alert(
				"Erreur configuration",
				"Aucun restaurantId trouvé. Veuillez vérifier la configuration ou relancer l'application."
			);
		}
	}, [restaurantId, isLoading]);

	const {
		openedReservations,
		setOpenedReservations, // ⭐ Pour reset immédiat
		activeId,
		setActiveId,
		activeReservation,
		orders,
		setOrders,
		fetchOrders,
		refreshReservation,
		markReservationAsFinished,
		openNextReservation,
		editField,
		isReservationsLoaded,
		clearCachedActiveId, // ⭐ Pour nettoyer le cache lors de la fermeture
	} = useReservationManager(reservations, fetchReservations);

	// États locaux UI
	const [showRestrictionsOptions, setShowRestrictionsOptions] = useState(false);
	const [showSettings, setShowSettings] = useState(false);
	const [showServerOptions, setShowServerOptions] = useState(false);
	const [showProductModal, setShowProductModal] = useState(false);
	const [showPayment, setShowPayment] = useState(false);
	const [started, setStarted] = useState(false);
	const [step, setStep] = useState(1);

	// États formulaire
	const [notesValue, setNotesValue] = useState("");
	const [allergiesValue, setAllergiesValue] = useState("");
	const [editingNotes, setEditingNotes] = useState(false);
	const [editingAllergies, setEditingAllergies] = useState(false);
	const [staffNotesValue, setStaffNotesValue] = useState("");
	const [editingStaffNotes, setEditingStaffNotes] = useState(false);
	const [selectedProduct, setSelectedProduct] = useState(null);
	const [activeServer, setActiveServer] = useState(null);
	// ⭐ État pour les allergènes structurés du client
	const [clientAllergens, setClientAllergens] = useState([]);

	// ═══════════════════════════════════════════════════════════════════════
	// 🎬 Animation de transition Popup - Style Card Stack (React Native Animated)
	// ═══════════════════════════════════════════════════════════════════════
	const { height: SCREEN_HEIGHT } = Dimensions.get("window");

	// Animation principale de la popup active (entrée)
	const popupAnimY = useRef(new Animated.Value(0)).current;
	const popupAnimOpacity = useRef(new Animated.Value(1)).current;
	const popupAnimScale = useRef(new Animated.Value(1)).current;

	// Animation de l'ancienne popup (sortie)
	const exitAnimY = useRef(new Animated.Value(0)).current;
	const exitAnimOpacity = useRef(new Animated.Value(0)).current;
	const exitAnimScale = useRef(new Animated.Value(1)).current;

	// Tracking
	const previousActiveId = useRef(null);
	const [exitingReservation, setExitingReservation] = useState(null);
	const [showExitCard, setShowExitCard] = useState(false);
	const currentAnimation = useRef(null); // Pour annuler l'animation en cours

	// Fonction pour nettoyer après l'animation de sortie
	const clearExitingCard = useCallback(() => {
		setExitingReservation(null);
		setShowExitCard(false);
	}, []);

	// Déclencher l'animation quand activeId change
	useEffect(() => {
		// Ne pas animer si c'est la première apparition
		if (
			previousActiveId.current !== null &&
			activeId &&
			previousActiveId.current !== activeId
		) {
			// ⭐ Annuler l'animation en cours si elle existe
			if (currentAnimation.current) {
				currentAnimation.current.stop();
				clearExitingCard();
			}

			// Sauvegarder la réservation sortante pour l'afficher pendant l'animation
			const exitingResa = openedReservations.find(
				(r) => r._id === previousActiveId.current
			);
			if (exitingResa) {
				setExitingReservation(exitingResa);
				setShowExitCard(true);
			}

			// Reset des valeurs de sortie
			exitAnimY.setValue(0);
			exitAnimOpacity.setValue(1);
			exitAnimScale.setValue(1);

			// Reset des valeurs d'entrée (position de départ - PLUS BAS pour effet visible)
			popupAnimY.setValue(SCREEN_HEIGHT * 0.7); // 70% au lieu de 40%
			popupAnimOpacity.setValue(0);
			popupAnimScale.setValue(0.8); // Plus petit au départ

			// === ANIMATION PARALLÈLE : Sortie + Entrée ===
			currentAnimation.current = Animated.parallel([
				// SORTIE : ancienne popup glisse vers le bas (plus loin)
				Animated.timing(exitAnimY, {
					toValue: SCREEN_HEIGHT * 0.8, // Plus loin vers le bas
					duration: 400,
					useNativeDriver: true,
				}),
				Animated.timing(exitAnimOpacity, {
					toValue: 0,
					duration: 300,
					useNativeDriver: true,
				}),
				Animated.timing(exitAnimScale, {
					toValue: 0.85,
					duration: 350,
					useNativeDriver: true,
				}),
				// ENTRÉE : nouvelle popup monte depuis le bas
				Animated.sequence([
					Animated.delay(30),
					Animated.spring(popupAnimY, {
						toValue: 0,
						tension: 55, // Plus de tension = plus rapide
						friction: 6, // Moins de friction = plus de rebond visible
						useNativeDriver: true,
					}),
				]),
				Animated.sequence([
					Animated.delay(20),
					Animated.timing(popupAnimOpacity, {
						toValue: 1,
						duration: 200,
						useNativeDriver: true,
					}),
				]),
				Animated.sequence([
					Animated.delay(30),
					Animated.spring(popupAnimScale, {
						toValue: 1,
						tension: 60,
						friction: 5,
						useNativeDriver: true,
					}),
				]),
			]);

			currentAnimation.current.start(() => {
				currentAnimation.current = null;
				setTimeout(clearExitingCard, 20);
			});
		}
		previousActiveId.current = activeId;
	}, [
		activeId,
		openedReservations,
		clearExitingCard,
		SCREEN_HEIGHT,
		exitAnimY,
		exitAnimOpacity,
		exitAnimScale,
		popupAnimY,
		popupAnimOpacity,
		popupAnimScale,
	]);

	// Initialiser thème
	useEffect(() => {
		initTheme();
	}, [initTheme]);

	// Fetch orders quand tableId OU activeReservation change
	useEffect(() => {
		if (!tableId || !activeReservation?._id) return;
		fetchOrders(tableId, activeReservation._id);
	}, [tableId, activeReservation?._id, fetchOrders]);

	// ✅ Réinitialiser started quand il n'y a plus de réservation active
	useEffect(() => {
		if (!activeId && started) {
			console.log(
				"🔄 Réinitialisation: activeId null, reset de started et orders"
			);
			setStarted(false);
			setOrders([]); // ⭐ Nettoyer les commandes aussi
		}
	}, [activeId, started, setOrders]);

	// Fonctions utilitaires avec useCallback
	const clearStorage = useCallback(async () => {
		try {
			await AsyncStorage.clear();
			alert("AsyncStorage vidé ✅");
		} catch (e) {
			console.error("Erreur vidage:", e);
		}
	}, []);

	const getElapsed = useCallback((iso) => {
		if (!iso) return "-";
		const diffMs = Date.now() - new Date(iso).getTime();
		const diffMin = Math.floor(diffMs / 60000);
		if (diffMin < 60) return `${diffMin} min`;
		const hours = Math.floor(diffMin / 60);
		const minutes = diffMin % 60;
		return `${hours}h ${minutes}m`;
	}, []);

	const submitOrder = useCallback(async () => {
		if (!activeReservation) return;

		const items =
			activeReservation.orderItems
				?.filter((i) => i.quantity > 0)
				.map((i) => {
					const product = products.find((p) => p._id === i.productId);
					// Utiliser le nom enrichi avec options si présent, sinon le nom du produit
					const displayName = i.name || product?.name;
					return {
						productId: i.productId,
						name: displayName,
						quantity: i.quantity,
						price: product?.price,
					};
				}) || [];

		if (items.length === 0) {
			alert("Aucun produit sélectionné !");
			return;
		}

		const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

		// Utiliser le tableId de la réservation si disponible, sinon celui du store, sinon la table par défaut
		const finalTableId =
			activeReservation.tableId?._id ||
			activeReservation.tableId ||
			tableId ||
			API_CONFIG.DEFAULT_TABLE_ID;

		const orderData = {
			reservationId: activeReservation._id,
			tableId: finalTableId,
			items,
			total,
			status: "in_progress",
			restaurantId,
			serverId,
		};

		console.log("📤 Envoi commande:", JSON.stringify(orderData, null, 2));

		try {
			await authFetch(`${API_CONFIG.baseURL}/orders/`, {
				method: "POST",
				body: orderData,
			});

			editField(
				"orderItems",
				activeReservation.orderItems.map((i) => ({ ...i, quantity: 0 }))
			);

			setStep(3);

			// ⭐ Rafraîchir les commandes ET la réservation pour avoir le totalAmount mis à jour
			await fetchOrders(tableId, activeReservation._id, true);
			await refreshReservation(activeReservation._id);
		} catch (error) {
			console.error("Erreur création commande :", error);
			alert(error.message || "Erreur création commande");
		}
	}, [
		activeReservation,
		products,
		tableId,
		restaurantId,
		serverId,
		authFetch,
		editField,
		fetchOrders,
		refreshReservation,
	]);

	const handleTogglePresent = useCallback(
		async (reservationId) => {
			try {
				await authFetch(
					`${API_CONFIG.baseURL}/reservations/${reservationId}/togglePresent`,
					{ method: "PUT" }
				);
				await fetchReservations();
				return true;
			} catch (error) {
				console.error("❌ Erreur toggle présent:", error);
				Alert.alert("Erreur", "Impossible de modifier le statut");
				return false;
			}
		},
		[authFetch, fetchReservations]
	);

	const handleUpdateStatus = useCallback(
		async (reservationId, newStatus) => {
			try {
				await authFetch(
					`${API_CONFIG.baseURL}/reservations/${reservationId}/status`,
					{
						method: "PUT",
						body: { status: newStatus },
					}
				);
				await fetchReservations();
				return true;
			} catch (error) {
				console.error("❌ Erreur mise à jour statut:", error);
				Alert.alert("Erreur", "Impossible de mettre à jour le statut");
				return false;
			}
		},
		[authFetch, fetchReservations]
	);

	const handleCancelReservation = useCallback(
		async (reservationId) => {
			try {
				await authFetch(`${API_CONFIG.baseURL}/reservations/${reservationId}`, {
					method: "DELETE",
				});
				await fetchReservations();
				if (activeId === reservationId) {
					// ⭐ Nettoyer le cache et AsyncStorage
					clearCachedActiveId();
					await AsyncStorage.removeItem("activeReservationId");
					setActiveId(null);
				}
				return true;
			} catch (error) {
				console.error("❌ Erreur annulation:", error);
				Alert.alert("Erreur", "Impossible d'annuler la réservation");
				return false;
			}
		},
		[authFetch, fetchReservations, activeId, setActiveId, clearCachedActiveId]
	);

	const handleFinishReservation = useCallback(
		async (reservationId) => {
			try {
				// ⭐ Récupérer les données fraîches via API directement
				const freshResa = await authFetch(
					`${API_CONFIG.baseURL}/reservations/${reservationId}`
				);

				// ⭐ Vérifier si la réservation est payée
				const totalAmount = parseFloat(freshResa?.totalAmount || 0);

				if (totalAmount > 0) {
					Alert.alert(
						"Paiement requis",
						`Cette réservation a un montant de ${totalAmount.toFixed(
							2
						)}€. Veuillez procéder au paiement avant de terminer.`,
						[{ text: "OK" }]
					);
					return;
				}

				// ⭐ Si montant = 0, on peut fermer
				const updated = await markReservationAsFinished(reservationId);

				if (updated && updated.status === "terminée") {
					// ⭐ Nettoyer le cache et AsyncStorage AVANT de changer activeId
					clearCachedActiveId();
					await AsyncStorage.removeItem("activeReservationId");

					setShowSettings(false);
					setStarted(false);
					setStep(1);

					// ⭐ IMPORTANT: Retirer immédiatement la réservation terminée de openedReservations
					setOpenedReservations((prev) =>
						prev.filter((r) => r._id !== reservationId)
					);

					setActiveId(null);

					await fetchReservations();
				} else {
					Alert.alert(
						"Erreur",
						"Impossible de terminer la réservation. Statut non mis à jour."
					);
				}
			} catch (error) {
				console.error("❌ Erreur terminaison:", error);
				Alert.alert(
					"Erreur",
					"Erreur lors de la terminaison: " + error.message
				);
			}
		},
		[
			markReservationAsFinished,
			fetchReservations,
			setActiveId,
			setOpenedReservations,
			authFetch,
			clearCachedActiveId,
		]
	);

	const handlePaymentSuccess = useCallback(async () => {
		console.log("💳 Paiement réussi - Fermeture de la réservation...");
		setShowPayment(false);

		const reservationId = activeReservation?._id;
		if (!reservationId) {
			console.error("❌ Pas de reservationId");
			return;
		}

		try {
			// ⭐ Nettoyer AsyncStorage immédiatement
			await AsyncStorage.removeItem("activeReservationId");

			// ⭐ Nettoyer le cache global pour éviter le flash visuel
			clearCachedActiveId();
		} catch (error) {
			console.error("❌ Erreur lors de la fermeture:", error);
			Alert.alert(
				"Erreur",
				"Impossible de fermer la réservation après paiement"
			);
		}
	}, [activeReservation, clearCachedActiveId]);

	// Render miniatures Premium avec FlatList
	const renderMiniature = useCallback(
		({ item: r }) => {
			const allTables = useTableStore.getState().tables || [];
			const table = allTables.find(
				(t) =>
					t._id === (typeof r.tableId === "object" ? r.tableId._id : r.tableId)
			);
			let tableNumber = "N/A";
			if (table && table.number) {
				tableNumber = table.number;
			} else if (
				r.tableId &&
				typeof r.tableId === "object" &&
				r.tableId.number
			) {
				tableNumber = r.tableId.number;
			} else if (typeof r.tableId === "string") {
				tableNumber = r.tableId;
			}

			let arriveDisplay = "-";
			if (r.arrivalTime) {
				const arriveDate = new Date(r.arrivalTime);
				let diff = Math.max(0, now - arriveDate.getTime());
				const hours = String(Math.floor(diff / 3600000)).padStart(2, "0");
				diff = diff % 3600000;
				const mins = String(Math.floor(diff / 60000)).padStart(2, "0");
				diff = diff % 60000;
				const secs = String(Math.floor(diff / 1000)).padStart(2, "0");
				arriveDisplay = `${hours}:${mins}:${secs}`;
			}

			return (
				<TouchableOpacity
					style={activityStyles.popupMini}
					onPress={() => setActiveId(r._id)}
					activeOpacity={0.8}
				>
					<Text style={activityStyles.miniTitle}>
						{r.clientName && typeof r.clientName === "string"
							? r.clientName.charAt(0).toUpperCase() +
								r.clientName.slice(1).toLowerCase()
							: String(r.clientName)}
					</Text>
					<Text style={activityStyles.miniSub}>{`Table ${tableNumber}`}</Text>
					<View style={{ flexDirection: "row", alignItems: "center" }}>
						<Ionicons
							name="time-outline"
							size={12}
							color={THEME.colors.primary.amber}
							style={{ marginRight: 4 }}
						/>
						<Text style={activityStyles.miniArrive}>{arriveDisplay}</Text>
					</View>
				</TouchableOpacity>
			);
		},
		[setActiveId, now]
	);

	const filteredReservations = useMemo(
		() => openedReservations.filter((r) => r._id !== activeId),
		[openedReservations, activeId]
	);

	// Render step 2 (validation)
	const renderValidationItems = useMemo(() => {
		if (!activeReservation || step !== 2) return null;

		return activeReservation.orderItems
			.filter((i) => i.quantity > 0)
			.map((i, index) => {
				const product = products.find((p) => p._id === i.productId);
				// Utiliser i.name (nom enrichi avec options) si présent, sinon product?.name
				const displayName = i.name || product?.name;
				return (
					<View key={`${i.productId}-${index}`} style={styles.productRow}>
						<Text style={[{ flex: 1 }, { color: theme.textColor }]}>
							{displayName}
						</Text>
						<Text
							style={{
								width: 400,
								textAlign: "center",
								color: theme.textColor,
							}}
						>
							{i.quantity}
						</Text>
						<Text
							style={{
								width: 60,
								textAlign: "right",
								color: theme.textColor,
							}}
						>
							{product?.price}€
						</Text>
					</View>
				);
			});
	}, [activeReservation, step, products, theme]);

	// Afficher skeleton pendant chargement du token OU des données
	if (isTokenLoading || isLoading) {
		return <LoadingSkeleton theme={theme} />;
	}

	// Afficher login si pas de token (après le chargement)
	if (!token) {
		return <Login />;
	}

	return (
		<>
			<View style={activityStyles.container}>
				{/* Background ambient effects */}
				<View style={StyleSheet.absoluteFill}>
					<LinearGradient
						colors={["rgba(245, 158, 11, 0.06)", "transparent"]}
						style={activityStyles.ambientGlow1}
					/>
					<LinearGradient
						colors={["rgba(14, 165, 233, 0.04)", "transparent"]}
						style={activityStyles.ambientGlow2}
					/>
				</View>

				{/* Bouton Commencer Premium */}
				{isReservationsLoaded &&
					openedReservations.length === 0 &&
					!activeId && (
						<View style={activityStyles.startContainer}>
							<TouchableOpacity
								onPress={async () => {
									const nextResa = await openNextReservation();
									if (!nextResa) return;
									setStarted(true);
								}}
								activeOpacity={0.85}
							>
								<LinearGradient
									colors={["#F59E0B", "#D97706"]}
									style={activityStyles.startButton}
									start={{ x: 0, y: 0 }}
									end={{ x: 1, y: 1 }}
								>
									<Ionicons
										name="play"
										size={24}
										color="#FFFFFF"
										style={{ marginRight: 12 }}
									/>
									<Text style={activityStyles.startButtonText}>Commencer</Text>
								</LinearGradient>
							</TouchableOpacity>
						</View>
					)}

				{/* Popup principal Premium avec animation Card Stack */}
				{activeReservation && activeReservation.status === "ouverte" && (
					<View style={activityStyles.popupMainWrapper}>
						{/* 🎬 Carte sortante (exit animation) */}
						{showExitCard && exitingReservation && (
							<Animated.View
								style={[
									activityStyles.popupMain,
									activityStyles.exitCard,
									{
										transform: [
											{ translateY: exitAnimY },
											{ scale: exitAnimScale },
										],
										opacity: exitAnimOpacity,
									},
								]}
								pointerEvents="none"
							>
								<LinearGradient
									colors={[
										"rgba(245, 158, 11, 0.1)",
										"rgba(245, 158, 11, 0.02)",
									]}
									style={activityStyles.headerRow}
									start={{ x: 0, y: 0 }}
									end={{ x: 1, y: 0 }}
								>
									<View style={activityStyles.headerLeft}>
										<Text style={activityStyles.realTableText}>
											{(() => {
												const name = exitingReservation.clientName;
												if (!name) return "Table";
												const formattedName =
													name.charAt(0).toUpperCase() +
													name.slice(1).toLowerCase();
												const vowels = [
													"a",
													"e",
													"i",
													"o",
													"u",
													"é",
													"è",
													"ê",
													"à",
													"â",
													"î",
													"ô",
													"û",
													"h",
												];
												const firstLetter = name.charAt(0).toLowerCase();
												const prefix = vowels.includes(firstLetter)
													? "Table d'"
													: "Table de ";
												return `${prefix}${formattedName}`;
											})()}
										</Text>
										<Text style={activityStyles.internalText}>
											{exitingReservation.realTable ||
												`Table ${exitingReservation.tableId?.number || ""}`}
										</Text>
									</View>
									<View
										style={[
											activityStyles.badge,
											{ backgroundColor: "rgba(34, 197, 94, 0.1)" },
										]}
									>
										<View style={activityStyles.badgeDot} />
										<Text style={activityStyles.badgeText}>En cours</Text>
									</View>
								</LinearGradient>
								{/* Contenu simplifié pour la carte de sortie */}
								<View style={activityStyles.exitCardContent}>
									<Ionicons
										name="restaurant-outline"
										size={48}
										color="rgba(245, 158, 11, 0.3)"
									/>
								</View>
							</Animated.View>
						)}

						{/* 🎬 Carte principale (enter animation) */}
						<Animated.View
							style={[
								activityStyles.popupMain,
								{
									transform: [
										{ translateY: popupAnimY },
										{ scale: popupAnimScale },
									],
									opacity: popupAnimOpacity,
									// Bordure statique (borderColor ne supporte pas useNativeDriver)
									borderColor: "rgba(255, 255, 255, 0.15)",
									borderWidth: 2,
								},
							]}
						>
							{/* Header Premium */}
							<LinearGradient
								colors={["rgba(245, 158, 11, 0.1)", "rgba(245, 158, 11, 0.02)"]}
								style={activityStyles.headerRow}
								start={{ x: 0, y: 0 }}
								end={{ x: 1, y: 0 }}
							>
								<View style={activityStyles.headerLeft}>
									{/* ⭐ Afficher "Table de/d'[clientName]" avec élision française */}
									<Text style={activityStyles.realTableText}>
										{(() => {
											const name = activeReservation.clientName;
											if (!name) return "Table";
											const formattedName =
												name.charAt(0).toUpperCase() +
												name.slice(1).toLowerCase();
											// Élision devant voyelle ou h muet
											const vowels = [
												"a",
												"e",
												"i",
												"o",
												"u",
												"é",
												"è",
												"ê",
												"à",
												"â",
												"î",
												"ô",
												"û",
												"h",
											];
											const firstLetter = name.charAt(0).toLowerCase();
											const prefix = vowels.includes(firstLetter)
												? "Table d'"
												: "Table de ";
											return `${prefix}${formattedName}`;
										})()}
									</Text>
									<Text style={activityStyles.internalText}>
										{activeReservation.realTable ||
											`Table ${activeReservation.tableId?.number || ""}`}
									</Text>
								</View>

								{/* Badge Status Premium */}
								<LinearGradient
									colors={[
										"rgba(16, 185, 129, 0.2)",
										"rgba(16, 185, 129, 0.1)",
									]}
									style={activityStyles.badge}
								>
									<View style={activityStyles.badgeDot} />
									<Text style={activityStyles.badgeText}>Occupée</Text>
								</LinearGradient>

								{/* Infos réservation */}
								<View style={activityStyles.headerInfo}>
									<Text style={activityStyles.headerInfoText}>
										<Ionicons
											name="time-outline"
											size={14}
											color={THEME.colors.text.muted}
										/>{" "}
										{activeReservation.reservationTime || "N/A"} •{" "}
										{new Date(
											activeReservation.reservationDate
										).toLocaleDateString("fr-FR")}
									</Text>
									<Text style={activityStyles.headerInfoText}>
										<Ionicons
											name="people-outline"
											size={14}
											color={THEME.colors.text.muted}
										/>{" "}
										{activeReservation.nbPersonnes || 0} personnes
									</Text>
								</View>

								{/* Bouton Settings */}
								<TouchableOpacity
									style={activityStyles.settingsButton}
									onPress={() => setShowSettings(true)}
								>
									<Ionicons
										name="settings-outline"
										size={22}
										color={THEME.colors.text.secondary}
									/>
								</TouchableOpacity>
							</LinearGradient>

							{/* Conteneur colonnes */}
							<View
								style={{
									flexDirection: "row",
									flex: 1,
									marginTop: THEME.spacing.md,
								}}
							>
								{/* Colonne gauche - flex: 1 pour partage égal */}
								<View style={{ flex: 1, paddingRight: THEME.spacing.sm }}>
									<ScrollView
										style={{ flex: 1 }}
										contentContainerStyle={{ flexGrow: 1 }}
									>
										<ReservationDetails
											activeReservation={activeReservation}
											theme={theme}
											editingAllergies={editingAllergies}
											setEditingAllergies={setEditingAllergies}
											allergiesValue={allergiesValue}
											setAllergiesValue={setAllergiesValue}
											editingNotes={editingNotes}
											setEditingNotes={setEditingNotes}
											notesValue={notesValue}
											setNotesValue={setNotesValue}
											showRestrictionsOptions={showRestrictionsOptions}
											setShowRestrictionsOptions={setShowRestrictionsOptions}
											editField={editField}
											getElapsed={getElapsed}
											clientAllergens={clientAllergens}
											setClientAllergens={setClientAllergens}
										/>

										<ServiceSection
											activeReservation={activeReservation}
											theme={theme}
											servers={servers}
											activeServer={activeServer}
											showServerOptions={showServerOptions}
											setShowServerOptions={setShowServerOptions}
											editField={editField}
											setActiveServer={setActiveServer}
										/>

										<PaymentSection
											activeReservation={activeReservation}
											theme={theme}
											editingStaffNotes={editingStaffNotes}
											setEditingStaffNotes={setEditingStaffNotes}
											staffNotesValue={staffNotesValue}
											setStaffNotesValue={setStaffNotesValue}
											editField={editField}
										/>
									</ScrollView>
								</View>

								{/* Colonne droite */}
								{step === 1 && (
									<ProductSelection
										products={products}
										activeReservation={activeReservation}
										theme={theme}
										editField={editField}
										setSelectedProduct={setSelectedProduct}
										setShowProductModal={setShowProductModal}
										step={step}
										setStep={setStep}
										clientAllergens={clientAllergens}
									/>
								)}

								{step === 2 && (
									<ScrollView style={{ width: "50%", paddingLeft: 10 }}>
										{renderValidationItems}
										<TouchableOpacity
											onPress={() => setStep(step - 1)}
											style={[styles.nextButton, { marginTop: 20 }]}
										>
											<Text style={styles.buttonText}>⬅️ Précédent</Text>
										</TouchableOpacity>
										<TouchableOpacity
											onPress={submitOrder}
											style={[styles.nextButton, { marginTop: 20 }]}
										>
											<Text style={styles.buttonText}>✅ Valider</Text>
										</TouchableOpacity>
									</ScrollView>
								)}

								{step === 3 && (
									<View style={{ width: "50%", padding: 10, flex: 1 }}>
										<Text style={styles.modalTitle}>Total de la commande</Text>

										{Array.isArray(orders) && orders.length > 0 ? (
											<>
												<ScrollView style={{ maxHeight: 400 }}>
													{orders
														.filter(
															(order) =>
																Array.isArray(order.items) &&
																order.items.length > 0
														)
														.map((order) => (
															<View
																key={order._id}
																style={{ marginBottom: 15 }}
															>
																<Text style={{ fontWeight: "bold" }}>
																	Commande #{order._id.slice(-4)} - Table{" "}
																	{order.tableId?.number || "-"} -{" "}
																	{new Date(order.createdAt).toLocaleTimeString(
																		[],
																		{
																			hour: "2-digit",
																			minute: "2-digit",
																		}
																	)}
																</Text>
																{order.items.map((i, itemIndex) => (
																	<View
																		key={`${order._id}-${i.productId}-${itemIndex}`}
																		style={{
																			flexDirection: "row",
																			marginVertical: 4,
																		}}
																	>
																		<Text
																			style={[
																				{ flex: 1 },
																				{ color: theme.textColor },
																			]}
																		>
																			{i.name}
																		</Text>
																		<Text
																			style={{
																				width: 50,
																				textAlign: "center",
																				color: theme.textColor,
																			}}
																		>
																			{i.quantity}
																		</Text>
																		<Text
																			style={{
																				width: 60,
																				textAlign: "right",
																				color: theme.textColor,
																			}}
																		>
																			{(i.price * i.quantity).toFixed(2)}€
																		</Text>
																	</View>
																))}
																<Text
																	style={{
																		fontWeight: "bold",
																		textAlign: "right",
																		marginTop: 5,
																	}}
																>
																	Total :{" "}
																	{order.items
																		.reduce(
																			(sum, i) => sum + i.price * i.quantity,
																			0
																		)
																		.toFixed(2)}
																	€
																</Text>
															</View>
														))}
												</ScrollView>

												<Text
													style={{
														fontWeight: "bold",
														textAlign: "right",
														marginTop: 10,
														color: theme.textColor,
													}}
												>
													{`Total général : ${Number(
														activeReservation?.totalAmount || 0
													).toFixed(2)} €`}
												</Text>
											</>
										) : (
											<Text>Aucune commande disponible</Text>
										)}

										<TouchableOpacity
											onPress={() => setShowPayment(true)}
											style={[
												styles.nextButton,
												{ marginTop: 20, backgroundColor: "#4CAF50" },
											]}
										>
											<Text style={styles.buttonText}>💳 Payer</Text>
										</TouchableOpacity>

										<TouchableOpacity
											onPress={() => {
												setStep(1);
												editField(
													"orderItems",
													products.map((p) => ({
														productId: p._id,
														quantity: 0,
													}))
												);
											}}
											style={[styles.nextButton, { marginTop: 10 }]}
										>
											<Text style={styles.buttonText}>
												🆕 Nouvelle commande
											</Text>
										</TouchableOpacity>
									</View>
								)}
							</View>
						</Animated.View>
					</View>
				)}

				{/* Miniatures Premium - seulement si activeId existe */}
				{activeId && (
					<View style={activityStyles.miniWrapper}>
						<FlatList
							style={{ overflow: "visible" }}
							data={[
								...filteredReservations,
								{ _id: "add-button", isAddButton: true },
							]}
							renderItem={({ item }) => {
								if (item.isAddButton) {
									return (
										<TouchableOpacity
											style={activityStyles.addButton}
											onPress={async () => {
												const nextResa = await openNextReservation();
												if (nextResa) {
													setStarted(true);
												}
											}}
											activeOpacity={0.8}
										>
											<LinearGradient
												colors={[
													"rgba(245, 158, 11, 0.2)",
													"rgba(245, 158, 11, 0.1)",
												]}
												style={activityStyles.addButtonInner}
											>
												<Ionicons
													name="add"
													size={24}
													color={THEME.colors.primary.amber}
												/>
											</LinearGradient>
										</TouchableOpacity>
									);
								}
								return renderMiniature({ item });
							}}
							keyExtractor={(item) => item._id}
							horizontal
							showsHorizontalScrollIndicator={false}
							contentContainerStyle={activityStyles.miniListContent}
						/>
					</View>
				)}
			</View>

			{/* Modales */}
			<SettingsModal
				visible={showSettings}
				onClose={() => setShowSettings(false)}
				activeReservation={activeReservation}
				onFinishReservation={handleFinishReservation}
				onTogglePresent={handleTogglePresent}
				onUpdateStatus={handleUpdateStatus}
				onCancel={handleCancelReservation}
				theme={theme}
			/>

			<ProductModal
				visible={showProductModal}
				onClose={() => setShowProductModal(false)}
				product={selectedProduct}
				theme={theme}
			/>

			<PaymentModal
				visible={showPayment}
				onClose={() => setShowPayment(false)}
				activeReservation={activeReservation}
				orders={orders}
				onSuccess={handlePaymentSuccess}
				theme={theme}
			/>
		</>
	);
}

// ─────────────── Styles Premium Activity ───────────────
const createStyles = (THEME) =>
	StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: THEME.colors.background.dark,
		},
		ambientGlow1: {
			position: "absolute",
			top: -100,
			left: -100,
			width: 400,
			height: 400,
			borderRadius: 200,
			opacity: 0.5,
		},
		ambientGlow2: {
			position: "absolute",
			bottom: -100,
			right: -100,
			width: 350,
			height: 350,
			borderRadius: 175,
			opacity: 0.5,
		},
		startContainer: {
			flex: 1,
			alignItems: "center",
			justifyContent: "center",
		},
		startButton: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			paddingVertical: THEME.spacing.md,
			paddingHorizontal: THEME.spacing.xl + THEME.spacing.lg,
			borderRadius: THEME.radius.xl,
			shadowColor: THEME.colors.primary.amber,
			shadowOffset: { width: 0, height: 4 },
			shadowOpacity: 0.4,
			shadowRadius: 12,
			elevation: 8,
		},
		startButtonText: {
			fontSize: THEME.typography.sizes.lg,
			fontWeight: THEME.typography.weights.semibold,
			color: "#FFFFFF",
		},
		popupMainWrapper: {
			flex: 1,
			padding: THEME.spacing.md,
		},
		popupMain: {
			flex: 1,
			backgroundColor: THEME.colors.background.card,
			borderRadius: THEME.radius.xl,
			borderWidth: 1,
			borderColor: THEME.colors.border.subtle,
			overflow: "hidden",
			shadowColor: "#000",
			shadowOffset: { width: 0, height: 8 },
			shadowOpacity: 0.15,
			shadowRadius: 24,
			elevation: 10,
		},
		headerRow: {
			flexDirection: "row",
			alignItems: "center",
			paddingVertical: THEME.spacing.md,
			paddingHorizontal: THEME.spacing.lg,
			borderBottomWidth: 1,
			borderBottomColor: THEME.colors.border.subtle,
		},
		headerLeft: {
			marginRight: THEME.spacing.md,
		},
		realTableText: {
			fontSize: THEME.typography.sizes.xl,
			fontWeight: THEME.typography.weights.bold,
			color: THEME.colors.text.primary,
		},
		internalText: {
			fontSize: THEME.typography.sizes.xs,
			color: THEME.colors.text.muted,
			marginTop: 2,
		},
		badge: {
			flexDirection: "row",
			alignItems: "center",
			paddingVertical: THEME.spacing.xs,
			paddingHorizontal: THEME.spacing.sm,
			borderRadius: THEME.radius.full,
			marginLeft: THEME.spacing.sm,
		},
		badgeDot: {
			width: 6,
			height: 6,
			borderRadius: 3,
			backgroundColor: THEME.colors.status.success,
			marginRight: THEME.spacing.xs,
		},
		badgeText: {
			fontSize: THEME.typography.sizes.xs,
			fontWeight: THEME.typography.weights.semibold,
			color: THEME.colors.status.success,
		},
		headerInfo: {
			flex: 1,
			marginLeft: THEME.spacing.lg,
		},
		headerInfoText: {
			fontSize: THEME.typography.sizes.sm,
			color: THEME.colors.text.secondary,
			marginBottom: 2,
		},
		settingsButton: {
			width: 44,
			height: 44,
			borderRadius: THEME.radius.md,
			backgroundColor: THEME.colors.background.elevated,
			alignItems: "center",
			justifyContent: "center",
			borderWidth: 1,
			borderColor: THEME.colors.border.subtle,
		},
		miniWrapper: {
			position: "absolute",
			bottom: THEME.spacing.lg,
			left: 0,
			right: 0,
			paddingHorizontal: THEME.spacing.md,
		},
		miniListContent: {
			flexGrow: 1,
			justifyContent: "center",
			alignItems: "center",
			gap: THEME.spacing.sm,
		},
		popupMini: {
			backgroundColor: THEME.colors.background.card,
			borderRadius: THEME.radius.lg,
			padding: THEME.spacing.md + 3, // +20% (12 → ~15)
			minWidth: 144, // +20% (120 → 144)
			borderWidth: 1,
			borderColor: THEME.colors.border.subtle,
			alignItems: "center",
		},
		miniTitle: {
			fontSize: THEME.typography.sizes.sm + 2, // +20% environ
			fontWeight: THEME.typography.weights.semibold,
			color: THEME.colors.text.primary,
			marginBottom: 5,
		},
		miniSub: {
			fontSize: THEME.typography.sizes.xs + 1, // +20% environ
			color: THEME.colors.text.secondary,
			marginBottom: 5,
		},
		miniArrive: {
			fontSize: THEME.typography.sizes.xs + 1, // +20% environ
			color: THEME.colors.primary.amber,
			fontWeight: THEME.typography.weights.medium,
		},
		addButton: {
			borderRadius: THEME.radius.lg,
			overflow: "hidden",
		},
		addButtonInner: {
			width: 52,
			height: 52,
			borderRadius: THEME.radius.lg,
			alignItems: "center",
			justifyContent: "center",
			borderWidth: 1,
			borderColor: "rgba(245, 158, 11, 0.3)",
			borderStyle: "dashed",
		},
		// 🎬 Styles pour l'animation Card Stack
		exitCard: {
			position: "absolute",
			top: 0,
			left: 0,
			right: 0,
			bottom: 0,
			zIndex: 10,
		},
		exitCardContent: {
			flex: 1,
			alignItems: "center",
			justifyContent: "center",
			backgroundColor: THEME.colors.background.card,
		},
	});
