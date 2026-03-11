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
	Image,
	Animated,
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
import AuditLogModal from "../activity/modals/AuditLogModal";
import { DEFAULT_ALLERGENS } from "../activity/modals/ClientAllergenModal";

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

const HAND_IMAGE = require("../../assets/images/hand.png");

/** Composant BlurIn – animation blur-in (opacité + scale) inspirée de magicUI */
const BlurInText = ({ name, textStyle }) => {
	const opacity = React.useRef(new Animated.Value(0)).current;
	const scale = React.useRef(new Animated.Value(1.18)).current;

	React.useEffect(() => {
		Animated.parallel([
			Animated.timing(opacity, {
				toValue: 1,
				duration: 750,
				useNativeDriver: true,
			}),
			Animated.timing(scale, {
				toValue: 1,
				duration: 750,
				useNativeDriver: true,
			}),
		]).start();
	}, [name]);

	return (
		<Animated.View
			style={{
				flexDirection: "row",
				alignItems: "center",
				marginBottom: 20,
				opacity,
				transform: [{ scale }],
			}}
		>
			<Text style={[textStyle, { marginBottom: 0 }]}>Bonjour {name}</Text>
			<Image
				source={HAND_IMAGE}
				style={{ width: 28, height: 28, marginLeft: 8 }}
			/>
		</Animated.View>
	);
};

/**
 * 8 couleurs distinctes, cohérentes avec le thème sombre.
 * La sélection est déterministe par l'_id de la réservation
 * → jamais deux réservations adjacentes avec la même couleur.
 */
const RESA_COLORS = [
	["rgba(245, 158,  11, 0.22)", "rgba(245, 158,  11, 0.04)"], // amber
	["rgba( 20, 184, 166, 0.22)", "rgba( 20, 184, 166, 0.04)"], // teal
	["rgba( 99, 102, 241, 0.22)", "rgba( 99, 102, 241, 0.04)"], // indigo
	["rgba(244,  63,  94, 0.22)", "rgba(244,  63,  94, 0.04)"], // rose
	["rgba( 52, 211, 153, 0.22)", "rgba( 52, 211, 153, 0.04)"], // emerald
	["rgba(167, 139, 250, 0.22)", "rgba(167, 139, 250, 0.04)"], // violet
	["rgba( 56, 189, 248, 0.22)", "rgba( 56, 189, 248, 0.04)"], // sky
	["rgba(251, 146,  60, 0.22)", "rgba(251, 146,  60, 0.04)"], // orange
];

function getResaColors(id) {
	if (!id) return RESA_COLORS[0];
	const hash = [...String(id)].reduce((acc, c) => acc + c.charCodeAt(0), 0);
	return RESA_COLORS[hash % RESA_COLORS.length];
}

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

	const currentServerName =
		servers?.find((s) => s._id === serverId)?.name || null;

	// Nom de l'utilisateur connecté (depuis AsyncStorage, stocké au login)
	const [userName, setUserName] = useState(null);
	useEffect(() => {
		AsyncStorage.getItem("userName").then((n) => {
			if (n) setUserName(n);
		});
	}, []);

	const displayGreeting = userName || currentServerName;

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
	const [showAuditLog, setShowAuditLog] = useState(false);
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

	// ⭐ Restaurer les allergènes structurés depuis le champ texte de la réservation

	// ⭐ Numéro de table réactif (souscrit au store)
	const allTables = useTableStore((s) => s.tables) || [];
	const activeTableLabel = useMemo(() => {
		if (!activeReservation) return "Table";
		if (activeReservation.realTable) return activeReservation.realTable;
		const rid = activeReservation.tableId;
		const tidStr = typeof rid === "object" ? rid?._id : rid;
		const found = allTables.find((t) => t._id === tidStr);
		if (found?.number) return `Table ${found.number}`;
		if (typeof rid === "object" && rid?.number) return `Table ${rid.number}`;
		if (tidStr) return `Table ${tidStr.slice(-4)}`;
		return "Table";
	}, [activeReservation, allTables]);

	useEffect(() => {
		if (!activeReservation?.allergies) {
			setClientAllergens([]);
			return;
		}
		// Reconstruire les objets allergènes depuis le texte sauvegardé ("Gluten, Lait, ...")
		const allergyNames = activeReservation.allergies
			.split(",")
			.map((s) => s.trim().toLowerCase())
			.filter(Boolean);
		const restored = DEFAULT_ALLERGENS.filter((a) =>
			allergyNames.includes(a.name.toLowerCase()),
		);
		setClientAllergens(restored);
	}, [activeReservation?._id, activeReservation?.allergies]);

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
		fetchOrders(resaTableId, activeReservation._id, true);
	}, [activeReservation?._id, tableId, fetchOrders]);

	// ✅ Réinitialiser started quand il n'y a plus de réservation active
	useEffect(() => {
		if (!activeId && started) {
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

		// Numéro de table pour le ticket
		const tableNum =
			typeof activeReservation.tableId === "object"
				? (activeReservation.tableId?.number ?? "?")
				: (activeReservation.tableId ?? "?");

		const CHEZ_AHMED_ID = "686af511bb4cba684ff3b72e";
		const isChezAhmed = restaurantId === CHEZ_AHMED_ID;

		// ── Logique d'envoi (commande + impression éventuelle) ───────────────────
		const executeOrder = async () => {
			try {
				await authFetch(`${API_CONFIG.baseURL}/orders/`, {
					method: "POST",
					body: orderData,
				});

				// 🖨️ Impression ticket cuisine (Chez Ahmed uniquement, non bloquant)
				if (isChezAhmed) {
					authFetch(`${API_CONFIG.baseURL}/print/ticket`, {
						method: "POST",
						body: {
							restaurantId,
							tableNumber: tableNum,
							items,
							total,
						},
					}).catch((err) =>
						console.warn(
							"[PRINT] Erreur impression (non bloquant) :",
							err.message,
						),
					);
				}

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
		};

		// ── Popup de confirmation (Chez Ahmed uniquement) ────────────────────────
		if (isChezAhmed) {
			Alert.alert(
				"Envoi en cuisine",
				`Table ${tableNum} — ${items.length} article${items.length > 1 ? "s" : ""} · ${total.toFixed(2)} €\n\nConfirmer l'envoi ?`,
				[
					{ text: "Annuler", style: "cancel" },
					{ text: "Envoyer ✓", onPress: executeOrder },
				],
			);
		} else {
			await executeOrder();
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
			// ⭐ Bloquer l'ouverture d'une réservation qui n'est pas pour aujourd'hui
			if (newStatus === "ouverte" && activeReservation?.reservationDate) {
				const today = new Date();
				today.setHours(0, 0, 0, 0);
				const resaDate = new Date(activeReservation.reservationDate);
				resaDate.setHours(0, 0, 0, 0);

				if (resaDate.getTime() !== today.getTime()) {
					Alert.alert(
						"Réservation pas pour aujourd'hui",
						"Cette réservation n'est pas prévue pour aujourd'hui. Rendez-vous sur le Dashboard pour créer une réservation pour aujourd'hui.",
						[{ text: "OK" }],
					);
					return false;
				}
			}

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
		[authFetch, fetchReservations, activeReservation],
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

	// ⭐ Couleurs subtiles pour différencier les miniatures (fonds foncés compatibles dark theme)
	const MINI_COLORS = [
		{ bg: "#162033", border: "#63b3ed" }, // bleu ciel
		{ bg: "#14261a", border: "#68d391" }, // vert menthe
		{ bg: "#261e14", border: "#f6ad55" }, // orange doux
		{ bg: "#1f1629", border: "#b794f4" }, // violet lavande
		{ bg: "#261420", border: "#fc819b" }, // rose
		{ bg: "#132623", border: "#81e6d9" }, // turquoise
	];

	// Render miniatures Premium avec FlatList
	const renderMiniature = useCallback(
		({ item: r, index: miniIndex }) => {
			const colorSet = MINI_COLORS[miniIndex % MINI_COLORS.length];
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
					style={[
						activityStyles.popupMini,
						{
							backgroundColor: colorSet.bg,
							borderLeftWidth: 3,
							borderLeftColor: colorSet.border,
						},
					]}
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
							{displayGreeting ? (
								<BlurInText
									name={displayGreeting.split(" ")[0]}
									textStyle={activityStyles.greetingText}
								/>
							) : null}
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
								colors={getResaColors(activeReservation._id)}
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
								</View>

								{/* Infos réservation */}
								<View style={activityStyles.headerInfo}>
									<Text style={activityStyles.headerInfoText}>
										<Ionicons
											name="people-outline"
											size={14}
											color={THEME.colors.text.muted}
										/>{" "}
										{activeReservation.nbPersonnes || 0} pers.
									</Text>
									<Text style={activityStyles.headerInfoText}>
										<Ionicons
											name={
												activeReservation.reservationSource === "À distance"
													? "call-outline"
													: activeReservation.reservationSource ===
														  "Sans réservation"
														? "walk-outline"
														: "location-outline"
											}
											size={14}
											color={THEME.colors.text.muted}
										/>{" "}
										{activeReservation.reservationSource || "Sur place"}
									</Text>
								</View>

								{/* Table N° + Audit + Settings à droite */}
								<View style={activityStyles.headerActions}>
									<Text style={activityStyles.headerTableText}>
										{activeTableLabel}
									</Text>
									<TouchableOpacity
										style={activityStyles.settingsButton}
										onPress={() => {
											// ⭐ Rafraîchir la réservation pour avoir l'auditLog à jour
											if (activeId) refreshReservation(activeId);
											setShowAuditLog(true);
										}}
									>
										<Ionicons
											name="time-outline"
											size={20}
											color={THEME.colors.text.muted}
										/>
									</TouchableOpacity>
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
							style={{ overflow: "visible", backgroundColor: "transparent" }}
							data={[
								...filteredReservations,
								{ _id: "add-button", isAddButton: true },
							]}
							renderItem={({ item, index }) => {
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
								return renderMiniature({ item, index });
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

			<AuditLogModal
				visible={showAuditLog}
				onClose={() => setShowAuditLog(false)}
				reservation={activeReservation}
				theme={THEME}
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
		greetingText: {
			fontSize: 22,
			fontWeight: "600",
			color: THEME.colors.text.primary,
			letterSpacing: 0.3,
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
			paddingVertical: THEME.spacing.sm,
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
		headerTableText: {
			fontSize: THEME.typography.sizes.sm,
			color: THEME.colors.text.muted,
			marginRight: THEME.spacing.sm,
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
			paddingHorizontal: THEME.spacing.md,
			paddingVertical: THEME.spacing.xs,
			backgroundColor: "transparent",
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
