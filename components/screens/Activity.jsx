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
import { useTheme } from "../../hooks/useTheme";
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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import useThemeStore from "../../src/stores/useThemeStore";
import { reservationService } from "../../shared-api/services/reservationService";
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

// 🔔 Notifications
import Toast from "../ui/Toast";

export default function Activity() {
	// Rafraîchissement global pour le temps écoulé (mini popups dynamiques)
	const [now, setNow] = useState(Date.now());
	useEffect(() => {
		const interval = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(interval);
	}, []);
	const { themeMode, theme, initTheme } = useThemeStore();
	const THEME = useTheme(); // Utilise le hook avec multiplicateur de police
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
		(state) => state.fetchReservations,
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
				")",
			);
			Alert.alert(
				"Erreur configuration",
				"Aucun restaurantId trouvé. Veuillez vérifier la configuration ou relancer l'application.",
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

	// 🔔 Notifications

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

	// Initialiser thème
	useEffect(() => {
		initTheme();
	}, [initTheme]);

	// Fetch orders quand activeReservation change
	useEffect(() => {
		if (!activeReservation?._id) return;
		// ⭐ Force=true pour toujours refetch quand la réservation change
		// Note: tableId n'est pas utilisé par l'API /orders/reservation/:id
		const resaTableId =
			activeReservation.tableId?._id || activeReservation.tableId || tableId;
		console.log("🔄 Fetching orders for reservation:", activeReservation._id);
		fetchOrders(resaTableId, activeReservation._id, true);
	}, [activeReservation?._id, tableId, fetchOrders]);

	// ✅ Réinitialiser started quand il n'y a plus de réservation active
	useEffect(() => {
		if (!activeId && started) {
			console.log(
				"🔄 Réinitialisation: activeId null, reset de started et orders",
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
				activeReservation.orderItems.map((i) => ({ ...i, quantity: 0 })),
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
					{ method: "PUT" },
				);
				await fetchReservations();
				return true;
			} catch (error) {
				console.error("❌ Erreur toggle présent:", error);
				Alert.alert("Erreur", "Impossible de modifier le statut");
				return false;
			}
		},
		[authFetch, fetchReservations],
	);

	const handleUpdateStatus = useCallback(
		async (reservationId, newStatus) => {
			try {
				await authFetch(
					`${API_CONFIG.baseURL}/reservations/${reservationId}/status`,
					{
						method: "PUT",
						body: { status: newStatus },
					},
				);
				await fetchReservations();
				return true;
			} catch (error) {
				console.error("❌ Erreur mise à jour statut:", error);
				Alert.alert("Erreur", "Impossible de mettre à jour le statut");
				return false;
			}
		},
		[authFetch, fetchReservations],
	);

	// ⭐ Helper pour finaliser les items d'une réservation
	const finalizeReservationItems = useCallback(
		async (reservationId, status) => {
			try {
				await authFetch(
					`${API_CONFIG.baseURL}/orders/reservation/${reservationId}/finalize-items`,
					{
						method: "PUT",
						body: JSON.stringify({ status }),
					},
				);
				console.log(
					`✅ Items de la réservation ${reservationId} mis en "${status}"`,
				);
			} catch (error) {
				console.warn(`⚠️ Impossible de finaliser les items:`, error.message);
			}
		},
		[authFetch],
	);

	// ⭐ Vérifier si une réservation a des commandes non finalisées
	const hasUnfinalizedOrders = useCallback(
		async (reservationId) => {
			try {
				const ordersData = await authFetch(
					`${API_CONFIG.baseURL}/orders/reservation/${reservationId}`,
				);
				const orders = ordersData.orders || ordersData || [];

				for (const order of orders) {
					for (const item of order.items || []) {
						if (
							item.itemStatus !== "served" &&
							item.itemStatus !== "cancelled"
						) {
							return true;
						}
					}
				}
				return false;
			} catch (error) {
				console.warn("⚠️ Erreur vérification commandes:", error.message);
				return false;
			}
		},
		[authFetch],
	);

	const handleCancelReservation = useCallback(
		async (reservationId) => {
			// ⭐ Vérifier s'il y a des commandes non finalisées
			const hasUnfinalized = await hasUnfinalizedOrders(reservationId);

			const performCancel = async () => {
				try {
					// ⭐ D'abord, mettre tous les items non finalisés en "cancelled"
					await finalizeReservationItems(reservationId, "cancelled");

					// Puis supprimer la réservation
					await authFetch(
						`${API_CONFIG.baseURL}/reservations/${reservationId}`,
						{
							method: "DELETE",
						},
					);
					await fetchReservations();
					if (activeId === reservationId) {
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
			};

			// ⭐ Si des commandes non finalisées, afficher une alerte
			if (hasUnfinalized) {
				return new Promise((resolve) => {
					Alert.alert(
						"Commandes en cours",
						"Des commandes de cette réservation ne sont pas encore servies ou annulées. Elles seront automatiquement annulées.\n\nVoulez-vous continuer ?",
						[
							{
								text: "Non",
								style: "cancel",
								onPress: () => resolve(false),
							},
							{
								text: "Oui, annuler",
								style: "destructive",
								onPress: async () => {
									const result = await performCancel();
									resolve(result);
								},
							},
						],
					);
				});
			}

			return performCancel();
		},
		[
			authFetch,
			fetchReservations,
			activeId,
			setActiveId,
			clearCachedActiveId,
			finalizeReservationItems,
			hasUnfinalizedOrders,
		],
	);

	const handleFinishReservation = useCallback(
		async (reservationId) => {
			try {
				// ⭐ Récupérer les données fraîches via API directement
				const freshResa = await authFetch(
					`${API_CONFIG.baseURL}/reservations/${reservationId}`,
				);

				// ⭐ Vérifier si la réservation est payée
				const totalAmount = parseFloat(freshResa?.totalAmount || 0);
				const paidAmount = parseFloat(freshResa?.paidAmount || 0);

				// ⭐ Si montant > 0 ET pas encore payé, bloquer
				if (totalAmount > 0 && paidAmount < totalAmount) {
					Alert.alert(
						"Paiement requis",
						`Cette réservation a un montant de ${totalAmount.toFixed(
							2,
						)}€. Veuillez procéder au paiement avant de terminer.`,
						[{ text: "OK" }],
					);
					return;
				}

				// ⭐ Si montant = 0 OU déjà payé, on peut fermer
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
						prev.filter((r) => r._id !== reservationId),
					);

					setActiveId(null);

					await fetchReservations();
				} else {
					Alert.alert(
						"Erreur",
						"Impossible de terminer la réservation. Statut non mis à jour.",
					);
				}
			} catch (error) {
				console.error("❌ Erreur terminaison:", error);
				Alert.alert(
					"Erreur",
					"Erreur lors de la terminaison: " + error.message,
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
		],
	);

	// ⭐ Helpers pour ouvrir/fermer le paiement
	const closePayment = useCallback(() => {
		setShowPayment(false);
	}, []);

	const handlePaymentSuccess = useCallback(
		async (receiptData = null) => {
			closePayment();

			const reservationId = activeReservation?._id;
			if (!reservationId) return;

			try {
				// ⭐ D'abord, marquer tous les items non finalisés comme "served"
				await finalizeReservationItems(reservationId, "served");

				await reservationService.closeReservation(reservationId);

				// ⭐ Fermer la modale principale en mettant activeId à null
				setActiveId(null);

				// Nettoyer le cache
				await AsyncStorage.removeItem("activeReservationId");
				clearCachedActiveId();

				// ⭐ Rafraîchir les réservations pour avoir le nouveau status
				await fetchReservations();
			} catch (error) {
				Alert.alert(
					"Erreur",
					"Impossible de fermer la réservation après paiement: " +
						error.message,
				);
			}
		},
		[
			activeReservation,
			clearCachedActiveId,
			closePayment,
			setActiveId,
			fetchReservations,
			finalizeReservationItems,
		],
	);

	// Render miniatures Premium avec FlatList
	const renderMiniature = useCallback(
		({ item: r }) => {
			const allTables = useTableStore.getState().tables || [];
			const table = allTables.find(
				(t) =>
					t._id === (typeof r.tableId === "object" ? r.tableId._id : r.tableId),
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
					onPress={() => {
						setActiveId(r._id);
						// ⭐ Forcer le refresh des orders quand on clique sur une réservation
						if (tableId) {
							fetchOrders(tableId, r._id, true);
						}
					}}
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
		[setActiveId, now, tableId, fetchOrders],
	);

	const filteredReservations = useMemo(
		() => openedReservations.filter((r) => r._id !== activeId),
		[openedReservations, activeId],
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

				{/* Popup principal Premium */}
				{activeReservation && activeReservation.status === "ouverte" && (
					<View style={activityStyles.popupMainWrapper}>

						{/* Carte principale */}
						<View
							style={[
								activityStyles.popupMain,
								{
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
										/>
										{activeReservation.reservationTime || "N/A"}
										{new Date(
											activeReservation.reservationDate,
										).toLocaleDateString("fr-FR")}
									</Text>
									<Text style={activityStyles.headerInfoText}>
										<Ionicons
											name="people-outline"
											size={14}
											color={THEME.colors.text.muted}
										/>
										{activeReservation.nbPersonnes || 0} personnes
									</Text>
								</View>

								{/* Header Actions */}
								<View style={activityStyles.headerActions}>
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
								</View>
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
											orders={orders}
											onPayClick={() => setShowPayment(true)}
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
									<View style={activityStyles.validationContainer}>
										{/* Header */}
										<View style={activityStyles.validationHeader}>
											<Ionicons
												name="checkmark-circle-outline"
												size={24}
												color="#fff"
											/>
											<Text style={activityStyles.validationTitle}>
												Validation
											</Text>
										</View>

										<ScrollView
											style={activityStyles.validationScroll}
											showsVerticalScrollIndicator={false}
										>
											{activeReservation?.orderItems
												?.filter((i) => i.quantity > 0)
												.map((i, index) => {
													const product = products.find(
														(p) => p._id === i.productId,
													);
													const displayName = i.name || product?.name;
													return (
														<View
															key={`${i.productId}-${index}`}
															style={activityStyles.validationItem}
														>
															<View style={activityStyles.validationItemLeft}>
																<Text style={activityStyles.validationItemQty}>
																	{i.quantity}×
																</Text>
																<Text style={activityStyles.validationItemName}>
																	{displayName}
																</Text>
															</View>
															<View style={activityStyles.validationItemRight}>
																<Text
																	style={activityStyles.validationItemPrice}
																>
																	{product?.price}€
																</Text>
																<TouchableOpacity
																	onPress={() => {
																		// Retirer ce produit des orderItems
																		const updatedItems =
																			activeReservation.orderItems.map(
																				(item) =>
																					item.productId === i.productId
																						? { ...item, quantity: 0 }
																						: item,
																			);
																		editField("orderItems", updatedItems);
																	}}
																	style={activityStyles.validationItemDelete}
																>
																	<Ionicons
																		name="trash-outline"
																		size={18}
																		color="#EF4444"
																	/>
																</TouchableOpacity>
															</View>
														</View>
													);
												})}
										</ScrollView>

										{/* Boutons */}
										<View style={activityStyles.validationButtons}>
											<TouchableOpacity
												onPress={() => setStep(step - 1)}
												style={activityStyles.validationBtnSecondary}
											>
												<Ionicons
													name="arrow-back-outline"
													size={20}
													color="#fff"
												/>
												<Text style={activityStyles.validationBtnSecondaryText}>
													Précédent
												</Text>
											</TouchableOpacity>
											<TouchableOpacity
												onPress={submitOrder}
												style={activityStyles.validationBtnPrimary}
											>
												<Ionicons
													name="checkmark-outline"
													size={20}
													color="#fff"
												/>
												<Text style={activityStyles.validationBtnPrimaryText}>
													Valider
												</Text>
											</TouchableOpacity>
										</View>
									</View>
								)}

								{step === 3 && (
									<View style={activityStyles.recapContainer}>
										{Array.isArray(orders) && orders.length > 0 ? (
											<>
												{/* Header */}
												<View style={activityStyles.recapHeader}>
													<Ionicons
														name="receipt-outline"
														size={24}
														color="#fff"
													/>
													<Text style={activityStyles.recapTitle}>
														Récapitulatif
													</Text>
												</View>
												<ScrollView
													style={activityStyles.recapScroll}
													showsVerticalScrollIndicator={false}
												>
													{orders
														.filter(
															(order) =>
																Array.isArray(order.items) &&
																order.items.length > 0,
														)
														.map((order, orderIndex, array) => {
															const isLatest = orderIndex === array.length - 1;
															return (
																<View
																	key={order._id}
																	style={[
																		activityStyles.recapOrderCard,
																		isLatest &&
																			activityStyles.recapOrderCardLatest,
																	]}
																>
																	{/* Order Header - juste l'heure */}
																	<View
																		style={[
																			activityStyles.recapOrderHeader,
																			isLatest &&
																				activityStyles.recapOrderHeaderLatest,
																		]}
																	>
																		<Text
																			style={[
																				activityStyles.recapOrderTime,
																				isLatest &&
																					activityStyles.recapOrderTimeLatest,
																			]}
																		>
																			{isLatest ? "✨ " : ""}
																			{new Date(
																				order.createdAt,
																			).toLocaleTimeString([], {
																				hour: "2-digit",
																				minute: "2-digit",
																			})}
																		</Text>
																		{isLatest && (
																			<Text
																				style={activityStyles.recapLatestBadge}
																			>
																				DERNIÈRE
																			</Text>
																		)}
																	</View>

																	{/* Items */}
																	{order.items.map((i, itemIndex) => (
																		<View
																			key={`${order._id}-${i.productId}-${itemIndex}`}
																			style={activityStyles.recapItem}
																		>
																			<View
																				style={activityStyles.recapItemLeft}
																			>
																				<Text
																					style={activityStyles.recapItemQty}
																				>
																					{i.quantity}×
																				</Text>
																				<Text
																					style={activityStyles.recapItemName}
																				>
																					{i.name}
																				</Text>
																			</View>
																			<Text
																				style={activityStyles.recapItemPrice}
																			>
																				{(i.price * i.quantity).toFixed(2)}€
																			</Text>
																		</View>
																	))}

																	{/* Order Total */}
																	<View style={activityStyles.recapOrderTotal}>
																		<Text
																			style={
																				activityStyles.recapOrderTotalLabel
																			}
																		>
																			Sous-total
																		</Text>
																		<Text
																			style={
																				activityStyles.recapOrderTotalValue
																			}
																		>
																			{order.items
																				.reduce(
																					(sum, i) =>
																						sum + i.price * i.quantity,
																					0,
																				)
																				.toFixed(2)}
																			€
																		</Text>
																	</View>
																</View>
															);
														})}
												</ScrollView>
												<View style={activityStyles.recapGrandTotal}>
													<Text style={activityStyles.recapGrandTotalLabel}>
														TOTAL
													</Text>
													<Text style={activityStyles.recapGrandTotalValue}>
														{Number(
															activeReservation?.totalAmount || 0,
														).toFixed(2)}
														€
													</Text>
												</View>

												{/* Bouton Nouvelle commande */}
												<TouchableOpacity
													onPress={() => {
														setStep(1);
														editField(
															"orderItems",
															products.map((p) => ({
																productId: p._id,
																quantity: 0,
															})),
														);
													}}
													style={activityStyles.recapNewOrderBtn}
												>
													<Ionicons
														name="add-circle-outline"
														size={20}
														color="#fff"
													/>
													<Text style={activityStyles.recapNewOrderBtnText}>
														Nouvelle commande
													</Text>
												</TouchableOpacity>
											</>
										) : (
											<View style={activityStyles.recapEmpty}>
												<Ionicons
													name="cart-outline"
													size={48}
													color="rgba(255,255,255,0.2)"
												/>
												<Text style={activityStyles.recapEmptyText}>
													Aucune commande
												</Text>
												{/* Bouton Nouvelle commande - état vide */}
												<TouchableOpacity
													onPress={() => {
														setStep(1);
														editField(
															"orderItems",
															products.map((p) => ({
																productId: p._id,
																quantity: 0,
															})),
														);
													}}
													style={activityStyles.recapNewOrderBtn}
												>
													<Ionicons
														name="add-circle-outline"
														size={20}
														color="#fff"
													/>
													<Text style={activityStyles.recapNewOrderBtnText}>
														Nouvelle commande
													</Text>
												</TouchableOpacity>
											</View>
										)}
									</View>
								)}
							</View>
						</View>
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
				onClose={closePayment}
				activeReservation={activeReservation}
				orders={orders}
				onSuccess={handlePaymentSuccess}
				theme={theme}
			/>

			{/* 🔔 Notifications */}
			<Toast />
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
		headerActions: {
			flexDirection: "row",
			alignItems: "center",
			gap: THEME.spacing.sm,
		},
		notificationButton: {
			width: 44,
			height: 44,
			borderRadius: THEME.radius.md,
			backgroundColor: THEME.colors.background.elevated,
			alignItems: "center",
			justifyContent: "center",
			borderWidth: 1,
			borderColor: THEME.colors.border.subtle,
			position: "relative",
		},
		notificationBadge: {
			position: "absolute",
			top: -4,
			right: -4,
			minWidth: 20,
			height: 20,
			borderRadius: 10,
			backgroundColor: "#ef4444",
			alignItems: "center",
			justifyContent: "center",
			paddingHorizontal: 6,
			borderWidth: 2,
			borderColor: THEME.colors.background.dark,
		},
		notificationBadgeText: {
			fontSize: 10,
			fontWeight: "700",
			color: "#fff",
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

		// 📋 Styles pour le Récapitulatif (step 3)
		recapContainer: {
			flex: 1,
			backgroundColor: THEME.colors.background.primary,
			paddingBottom: 140,
		},
		recapHeader: {
			flexDirection: "row",
			alignItems: "center",
			paddingVertical: THEME.spacing.md,
			paddingHorizontal: THEME.spacing.md,
			borderBottomWidth: 1,
			borderBottomColor: THEME.colors.border.subtle,
		},
		recapTitle: {
			fontSize: THEME.typography.sizes.md,
			fontWeight: THEME.typography.weights.semibold,
			color: "rgba(255,255,255,0.8)",
			marginLeft: THEME.spacing.sm,
		},
		recapScroll: {
			flex: 1,
			padding: THEME.spacing.md,
		},
		// Carte ancienne commande (gris)
		recapOrderCard: {
			backgroundColor: "rgba(255,255,255,0.03)",
			borderRadius: THEME.radius.md,
			marginBottom: THEME.spacing.sm,
			borderWidth: 1,
			borderColor: "rgba(255,255,255,0.08)",
			overflow: "hidden",
			opacity: 0.7,
		},
		// Carte dernière commande (mise en avant)
		recapOrderCardLatest: {
			backgroundColor: "rgba(34, 197, 94, 0.08)",
			borderColor: "rgba(34, 197, 94, 0.3)",
			opacity: 1,
		},
		recapOrderHeader: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			paddingVertical: THEME.spacing.xs,
			paddingHorizontal: THEME.spacing.md,
			borderBottomWidth: 1,
			borderBottomColor: "rgba(255,255,255,0.05)",
		},
		recapOrderHeaderLatest: {
			borderBottomColor: "rgba(34, 197, 94, 0.2)",
		},
		recapOrderTime: {
			fontSize: THEME.typography.sizes.sm,
			color: "rgba(255,255,255,0.5)",
		},
		recapOrderTimeLatest: {
			color: "#22C55E",
			fontWeight: THEME.typography.weights.semibold,
		},
		recapLatestBadge: {
			fontSize: THEME.typography.sizes.xs,
			color: "#22C55E",
			fontWeight: THEME.typography.weights.bold,
			backgroundColor: "rgba(34, 197, 94, 0.15)",
			paddingHorizontal: THEME.spacing.sm,
			paddingVertical: 2,
			borderRadius: THEME.radius.full,
		},
		recapItem: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			paddingVertical: THEME.spacing.sm,
			paddingHorizontal: THEME.spacing.md,
		},
		recapItemLeft: {
			flexDirection: "row",
			alignItems: "center",
			flex: 1,
		},
		recapItemQty: {
			fontSize: THEME.typography.sizes.sm,
			fontWeight: THEME.typography.weights.bold,
			color: "rgba(255,255,255,0.6)",
			width: 32,
		},
		recapItemName: {
			fontSize: THEME.typography.sizes.sm,
			color: "rgba(255,255,255,0.85)",
			flex: 1,
		},
		recapItemPrice: {
			fontSize: THEME.typography.sizes.sm,
			fontWeight: THEME.typography.weights.medium,
			color: "rgba(255,255,255,0.6)",
		},
		recapOrderTotal: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			paddingVertical: THEME.spacing.sm,
			paddingHorizontal: THEME.spacing.md,
			backgroundColor: "rgba(255,255,255,0.02)",
		},
		recapOrderTotalLabel: {
			fontSize: THEME.typography.sizes.sm,
			color: "rgba(255,255,255,0.4)",
		},
		recapOrderTotalValue: {
			fontSize: THEME.typography.sizes.sm,
			fontWeight: THEME.typography.weights.semibold,
			color: "rgba(255,255,255,0.7)",
		},
		recapGrandTotal: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			backgroundColor: "rgba(255,255,255,0.05)",
			marginTop: THEME.spacing.sm,
			marginHorizontal: THEME.spacing.md,
			paddingVertical: THEME.spacing.md,
			paddingHorizontal: THEME.spacing.lg,
			borderRadius: THEME.radius.md,
			borderWidth: 1,
			borderColor: "rgba(255,255,255,0.1)",
		},
		recapGrandTotalLabel: {
			fontSize: THEME.typography.sizes.md,
			fontWeight: THEME.typography.weights.semibold,
			color: "rgba(255,255,255,0.7)",
		},
		recapGrandTotalValue: {
			fontSize: THEME.typography.sizes.xl,
			fontWeight: THEME.typography.weights.bold,
			color: "#fff",
		},
		recapEmpty: {
			flex: 1,
			alignItems: "center",
			justifyContent: "center",
			paddingVertical: THEME.spacing.xxl || 48,
		},
		recapEmptyText: {
			fontSize: THEME.typography.sizes.md,
			color: THEME.colors.text.tertiary,
			marginTop: THEME.spacing.md,
			marginBottom: THEME.spacing.lg,
		},
		recapNewOrderBtn: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			gap: THEME.spacing.sm,
			backgroundColor: "rgba(34, 197, 94, 0.15)",
			paddingVertical: THEME.spacing.md,
			paddingHorizontal: THEME.spacing.xl,
			borderRadius: THEME.radius.md,
			marginTop: THEME.spacing.md,
			marginBottom: -36,
			marginHorizontal: THEME.spacing.md,
			borderWidth: 1,
			borderColor: "rgba(34, 197, 94, 0.3)",
		},
		recapNewOrderBtnText: {
			fontSize: THEME.typography.sizes.md,
			fontWeight: THEME.typography.weights.semibold,
			color: "#22C55E",
		},

		// 📋 Styles pour la Validation (step 2)
		validationContainer: {
			flex: 1,
			backgroundColor: THEME.colors.background.primary,
		},
		validationHeader: {
			flexDirection: "row",
			alignItems: "center",
			paddingVertical: THEME.spacing.md,
			paddingHorizontal: THEME.spacing.md,
			borderBottomWidth: 1,
			borderBottomColor: THEME.colors.border.subtle,
		},
		validationTitle: {
			fontSize: THEME.typography.sizes.md,
			fontWeight: THEME.typography.weights.semibold,
			color: "rgba(255,255,255,0.8)",
			marginLeft: THEME.spacing.sm,
		},
		validationScroll: {
			flex: 1,
			padding: THEME.spacing.md,
		},
		validationItem: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			backgroundColor: "rgba(255,255,255,0.04)",
			paddingVertical: THEME.spacing.md,
			paddingHorizontal: THEME.spacing.md,
			borderRadius: THEME.radius.md,
			marginBottom: THEME.spacing.sm,
			borderWidth: 1,
			borderColor: "rgba(255,255,255,0.08)",
		},
		validationItemLeft: {
			flexDirection: "row",
			alignItems: "center",
			flex: 1,
		},
		validationItemQty: {
			fontSize: THEME.typography.sizes.md,
			fontWeight: THEME.typography.weights.bold,
			color: "rgba(255,255,255,0.6)",
			width: 40,
		},
		validationItemName: {
			fontSize: THEME.typography.sizes.sm,
			color: "rgba(255,255,255,0.85)",
			flex: 1,
		},
		validationItemPrice: {
			fontSize: THEME.typography.sizes.md,
			fontWeight: THEME.typography.weights.semibold,
			color: "rgba(255,255,255,0.8)",
			marginRight: THEME.spacing.sm,
		},
		validationItemRight: {
			flexDirection: "row",
			alignItems: "center",
			gap: THEME.spacing.sm,
		},
		validationItemDelete: {
			padding: THEME.spacing.xs,
			borderRadius: THEME.radius.sm,
			backgroundColor: "rgba(239, 68, 68, 0.1)",
			borderWidth: 1,
			borderColor: "rgba(239, 68, 68, 0.3)",
		},
		validationButtons: {
			flexDirection: "row",
			gap: THEME.spacing.md,
			paddingHorizontal: THEME.spacing.md,
			paddingVertical: THEME.spacing.lg,
			borderTopWidth: 1,
			borderTopColor: THEME.colors.border.subtle,
			marginBottom: 90,
		},
		validationBtnSecondary: {
			flex: 1,
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			backgroundColor: "rgba(255,255,255,0.08)",
			paddingVertical: THEME.spacing.md,
			borderRadius: THEME.radius.md,
			borderWidth: 1,
			borderColor: "rgba(255,255,255,0.15)",
		},
		validationBtnSecondaryText: {
			fontSize: THEME.typography.sizes.sm,
			fontWeight: THEME.typography.weights.semibold,
			color: "rgba(255,255,255,0.8)",
			marginLeft: THEME.spacing.xs,
		},
		validationBtnPrimary: {
			flex: 1,
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			backgroundColor: "rgba(34, 197, 94, 0.2)",
			paddingVertical: THEME.spacing.md,
			borderRadius: THEME.radius.md,
			borderWidth: 1,
			borderColor: "rgba(34, 197, 94, 0.4)",
		},
		validationBtnPrimaryText: {
			fontSize: THEME.typography.sizes.sm,
			fontWeight: THEME.typography.weights.semibold,
			color: "#22C55E",
			marginLeft: THEME.spacing.xs,
		},
	});
