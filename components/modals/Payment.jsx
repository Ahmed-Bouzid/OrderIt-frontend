import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	Alert,
	ActivityIndicator,
	ScrollView,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import useReservationStore from "../../src/stores/useReservationStore";
import { useAuthFetch } from "../../hooks/useAuthFetch";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";

export default function Payment({
	reservation,
	orders,
	onSuccess,
	onBack,
	theme,
}) {
	const [loading, setLoading] = useState(false);
	const [selectedItems, setSelectedItems] = useState(new Set());
	const [paidItems, setPaidItems] = useState(new Set());
	const authFetch = useAuthFetch();
	const { fetchReservations } = useReservationStore();

	// ⭐ Aplatir tous les items de toutes les commandes
	const allOrders = useMemo(() => {
		if (!orders || orders.length === 0) return [];

		// Aplatir: prendre tous les items de toutes les commandes
		const flattenedItems = orders.flatMap((order) =>
			(order.items || []).map((item) => ({
				...item,
				orderId: order._id, // Garder trace de la commande d'origine
			}))
		);

		console.log("🔍 Items aplatis:", flattenedItems.length);
		return flattenedItems;
	}, [orders]);

	const reservationId = reservation?._id;

	// 🐛 DEBUG: Log pour comprendre le problème
	useEffect(() => {
		console.log("🔍 DEBUG Payment:");
		console.log("- Réservation:", reservationId);
		console.log("- Nombre de commandes:", orders?.length || 0);
		console.log("- Nombre total d'articles:", allOrders.length);
	}, [reservationId, orders, allOrders]);

	// 🔧 Fonction pour générer un ID unique pour chaque article
	const getItemId = useCallback((item) => {
		if (!item) return `unknown-${Date.now()}`;
		const id = item.productId || item._id || item.id;
		const name = item.name || "unnamed";
		const price = item.price || 0;
		const quantity = item.quantity || 1;
		return `${id}-${name}-${price}-${quantity}`;
	}, []);

	// 🔧 Clé de stockage unique basée sur reservationId
	const getStorageKey = useCallback(() => {
		if (reservationId) return `paidItems_res_${reservationId}`;
		return null;
	}, [reservationId]);

	// 📂 Charger les articles payés depuis AsyncStorage
	useEffect(() => {
		const loadPaidItems = async () => {
			const storageKey = getStorageKey();
			if (!storageKey) return;

			try {
				const saved = await AsyncStorage.getItem(storageKey);
				if (saved) {
					const parsed = JSON.parse(saved);
					console.log("📂 Articles déjà payés chargés:", parsed.length);
					setPaidItems(new Set(parsed));
				} else {
					console.log("📂 Aucun article payé précédemment");
				}
			} catch (error) {
				console.error("❌ Erreur chargement paidItems:", error);
			}
		};

		loadPaidItems();
	}, [reservationId, getStorageKey]);

	// 💾 Sauvegarder les articles payés dans AsyncStorage
	useEffect(() => {
		const savePaidItems = async () => {
			const storageKey = getStorageKey();
			if (!storageKey) return;

			try {
				const itemsArray = Array.from(paidItems);
				await AsyncStorage.setItem(storageKey, JSON.stringify(itemsArray));
			} catch (error) {
				console.error("❌ Erreur sauvegarde paidItems:", error);
			}
		};

		savePaidItems();
	}, [paidItems, reservationId, getStorageKey]);

	// ✅ Initialiser la sélection avec les articles non payés
	useEffect(() => {
		if (allOrders && allOrders.length > 0) {
			const nonPaidItems = allOrders.filter(
				(item) => !paidItems.has(getItemId(item))
			);
			const nonPaidIds = new Set(nonPaidItems.map((item) => getItemId(item)));
			setSelectedItems(nonPaidIds);
		}
	}, [allOrders, paidItems, getItemId]);

	// 📊 Calculs pour l'affichage (AVANT le return conditionnel)
	const availableItems =
		allOrders?.filter((item) => !paidItems.has(getItemId(item))) || [];
	const allSelected =
		selectedItems.size === availableItems.length && availableItems.length > 0;
	const selectedOrders = availableItems.filter((item) =>
		selectedItems.has(getItemId(item))
	);
	const total = selectedOrders.reduce(
		(sum, item) => sum + (item?.price || 0) * (item?.quantity || 1),
		0
	);
	// ✅ Compter le nombre total d'articles avec quantités
	const totalSelectedQuantity = selectedOrders.reduce(
		(sum, item) => sum + (item?.quantity || 1),
		0
	);
	const totalPaidQuantity = Array.from(paidItems).reduce((sum, itemId) => {
		const item = allOrders.find((order) => getItemId(order) === itemId);
		return sum + (item?.quantity || 1);
	}, 0);
	const totalAllQuantity = allOrders.reduce(
		(sum, item) => sum + (item?.quantity || 1),
		0
	);

	// 🐛 DEBUG: Log des items disponibles
	useEffect(() => {
		console.log(
			"📊 Articles disponibles pour paiement:",
			availableItems.length
		);
		console.log("💳 Articles déjà payés:", paidItems.size);
	}, [availableItems.length, paidItems.size]);

	// 🎯 Sélectionner/désélectionner un article
	const toggleItem = (item) => {
		const itemId = getItemId(item);
		const newSelected = new Set(selectedItems);
		if (newSelected.has(itemId)) {
			newSelected.delete(itemId);
		} else {
			newSelected.add(itemId);
		}
		setSelectedItems(newSelected);
	};

	// 🎯 Tout sélectionner/désélectionner
	const toggleAll = () => {
		const nonPaidItems =
			allOrders?.filter((item) => !paidItems.has(getItemId(item))) || [];
		if (nonPaidItems.length === 0) return;

		const allNonPaidIds = new Set(nonPaidItems.map((item) => getItemId(item)));
		if (selectedItems.size === allNonPaidIds.size) {
			setSelectedItems(new Set());
		} else {
			setSelectedItems(allNonPaidIds);
		}
	};

	// 💳 Traitement du paiement (FAKE)
	const handlePay = async () => {
		if (selectedItems.size === 0) {
			Alert.alert(
				"Erreur",
				"Veuillez sélectionner au moins un article à payer"
			);
			return;
		}

		setLoading(true);

		try {
			// 1. Filtrer les articles sélectionnés
			const selectedOrders = allOrders.filter((item) =>
				selectedItems.has(getItemId(item))
			);

			// 2. Calculer le montant payé
			const amountPaid = selectedOrders.reduce(
				(sum, item) => sum + (item?.price || 0) * (item?.quantity || 1),
				0
			);

			// 3. Ajouter les articles aux paidItems
			const newPaidItems = new Set(paidItems);
			selectedOrders.forEach((item) => {
				newPaidItems.add(getItemId(item));
			});
			setPaidItems(newPaidItems);

			// 4. Vérifier si paiement complet
			const remainingItems = allOrders.filter(
				(item) => !newPaidItems.has(getItemId(item))
			);
			const isFullPayment = remainingItems.length === 0;

			// 5. Calculer le reste à payer
			const remainingAmount = remainingItems.reduce(
				(sum, item) => sum + (item?.price || 0) * (item?.quantity || 1),
				0
			);

			// 6. Marquer les commandes comme payées (CRITIQUE pour éviter les doublons)
			console.log("💳 Marquage des commandes comme payées...");
			try {
				// Récupérer les IDs uniques des commandes à marquer comme payées
				const orderIdsToMarkPaid = new Set();
				selectedOrders.forEach((item) => {
					if (item.orderId) {
						orderIdsToMarkPaid.add(item.orderId);
					}
				});

				// Marquer chaque commande comme payée
				for (const orderId of orderIdsToMarkPaid) {
					try {
						await authFetch(
							`http://192.168.1.185:3000/orders/${orderId}/mark-as-paid`,
							{
								method: "POST",
							}
						);
						console.log(`✅ Commande ${orderId} marquée comme payée`);
					} catch (error) {
						console.error(`❌ Erreur marquage commande ${orderId}:`, error);
					}
				}
			} catch (error) {
				console.error("❌ Erreur marquage commandes:", error);
			}

			// 7. Mise à jour de la réservation via route dédiée
			console.log("💳 Mise à jour de la réservation après paiement");
			try {
				const newPaidAmount = Number(reservation.paidAmount || 0) + amountPaid;

				await authFetch(
					`http://192.168.1.185:3000/reservations/${reservationId}/payment`,
					{
						method: "PUT",
						body: {
							status: isFullPayment ? "fermee" : "ouverte",
							paidAmount: newPaidAmount,
							remainingAmount: remainingAmount,
							paymentMethod: "Carte",
						},
					}
				);
				console.log("✅ Réservation mise à jour avec paiement");

				// Rafraîchir le store
				await fetchReservations(true);
			} catch (error) {
				console.error("❌ Erreur mise à jour réservation:", error);
				// Continuer quand même pour afficher le message
			}

			// 7. Afficher l'alerte de confirmation
			const message =
				`${selectedOrders.length} article(s) payé(s).\n\n` +
				`💳 Montant payé: ${amountPaid.toFixed(2)}€\n` +
				(remainingAmount > 0
					? `📋 Reste à payer: ${remainingAmount.toFixed(2)}€ (${
							remainingItems.length
					  } article${remainingItems.length > 1 ? "s" : ""})`
					: "✅ Tous les articles sont payés !");

			Alert.alert(
				isFullPayment ? "✅ Paiement complet" : "⚠️ Paiement partiel",
				message,
				[
					{
						text: "OK",
						onPress: () => {
							// Désélectionner tout
							setSelectedItems(new Set());

							// Si paiement complet, retour
							if (isFullPayment) {
								// Nettoyer le stockage
								const storageKey = getStorageKey();
								if (storageKey) {
									AsyncStorage.removeItem(storageKey);
								}
								// Délai pour laisser la modale se fermer, puis suppression de la réservation active côté parent
								setTimeout(() => {
									onSuccess?.();
									setTimeout(() => {
										if (typeof window !== "undefined" && window.setActiveId) {
											window.setActiveId(null);
										}
									}, 400);
								}, 0);
							}
						},
					},
				]
			);
		} catch (error) {
			console.error("❌ Erreur paiement:", error);
			Alert.alert("Erreur", "Échec du paiement. Veuillez réessayer.");
		} finally {
			setLoading(false);
		}
	};

	// ⭐ Safe theme pour éviter les erreurs
	const safeTheme = theme || {
		backgroundColor: "#fff",
		textColor: "#000",
		borderColor: "#ddd",
	};
	const safeOnBack = onBack || (() => {});

	// 🚨 Si pas de réservation
	if (!reservation) {
		return (
			<View
				style={{
					flex: 1,
					backgroundColor: "rgba(10,18,36,0.55)",
					justifyContent: "center",
					alignItems: "center",
				}}
			>
				<BlurView
					intensity={60}
					tint="dark"
					style={{ borderRadius: 24, overflow: "hidden" }}
				>
					<LinearGradient
						colors={["#232B3B", "#1A1F29", "#232B3B"]}
						start={{ x: 0, y: 0 }}
						end={{ x: 1, y: 1 }}
						style={{
							width: 360,
							minHeight: 220,
							padding: 32,
							borderRadius: 24,
							justifyContent: "center",
							alignItems: "center",
							shadowColor: "#000",
							shadowOpacity: 0.25,
							shadowOffset: { width: 0, height: 8 },
							shadowRadius: 24,
							elevation: 16,
						}}
					>
						<Text
							style={{
								fontSize: 24,
								fontWeight: "bold",
								color: "#fff",
								marginBottom: 12,
							}}
						>
							Erreur
						</Text>
						<Text
							style={{
								fontSize: 18,
								color: "#fff",
								marginBottom: 24,
								textAlign: "center",
							}}
						>
							❌ Aucune réservation sélectionnée
						</Text>
						<TouchableOpacity
							style={{
								backgroundColor: "#4CAF50",
								paddingHorizontal: 32,
								paddingVertical: 14,
								borderRadius: 12,
								shadowColor: "#000",
								shadowOpacity: 0.18,
								shadowOffset: { width: 0, height: 2 },
								shadowRadius: 6,
								elevation: 6,
							}}
							onPress={safeOnBack}
						>
							<Text style={{ color: "#fff", fontWeight: "bold", fontSize: 18 }}>
								Retour
							</Text>
						</TouchableOpacity>
					</LinearGradient>
				</BlurView>
			</View>
		);
	}

	// ⭐ Safe clientName formatting
	const clientNameDisplay = reservation?.clientName
		? reservation.clientName.charAt(0).toUpperCase() +
		  reservation.clientName.slice(1).toLowerCase()
		: "Client";

	return (
		<View
			style={[styles.container, { backgroundColor: safeTheme.backgroundColor }]}
		>
			{/* Informations de réservation */}
			<View
				style={[styles.infoContainer, { borderColor: safeTheme.borderColor }]}
			>
				<Text style={[styles.clientName, { color: safeTheme.textColor }]}>
					{clientNameDisplay}
				</Text>
				<Text style={[styles.infoText, { color: safeTheme.textColor }]}>
					Total initial: {Number(reservation?.totalAmount || 0).toFixed(2)}€
				</Text>
				<Text style={[styles.infoText, { color: safeTheme.textColor }]}>
					Articles payés: {totalPaidQuantity} / {totalAllQuantity}
				</Text>
			</View>

			<View style={styles.orderDetails}>
				<View className="headerRow" style={styles.headerRow}>
					<Text style={[styles.detailTitle, { color: safeTheme.textColor }]}>
						Articles à payer ({availableItems.length}):
					</Text>
					{availableItems.length > 0 && (
						<TouchableOpacity
							onPress={toggleAll}
							style={styles.selectAllButton}
						>
							<Text style={styles.selectAllText}>
								{allSelected ? "Tout désélectionner" : "Tout sélectionner"}
							</Text>
						</TouchableOpacity>
					)}
				</View>

				{availableItems.length === 0 ? (
					<View style={styles.emptyState}>
						<Text style={styles.emptyText}>
							✅ Tous les articles sont payés !
						</Text>
						<Text style={[styles.emptySubtext, { color: safeTheme.textColor }]}>
							Vous pouvez fermer la réservation.
						</Text>
						<TouchableOpacity
							style={styles.returnButton}
							onPress={() => {
								const storageKey = getStorageKey();
								if (storageKey) {
									AsyncStorage.removeItem(storageKey);
								}
								onSuccess?.();
							}}
						>
							<Text style={styles.returnButtonText}>Retour</Text>
						</TouchableOpacity>
					</View>
				) : (
					<ScrollView style={styles.itemsList}>
						{availableItems.map((item) => {
							if (!item) return null;
							const itemId = getItemId(item);
							const isSelected = selectedItems.has(itemId);
							return (
								<TouchableOpacity
									key={itemId}
									style={[
										styles.orderItem,
										isSelected && styles.orderItemSelected,
									]}
									onPress={() => toggleItem(item)}
								>
									<View style={styles.checkboxContainer}>
										<View
											style={[
												styles.checkbox,
												isSelected && styles.checkboxChecked,
											]}
										>
											{isSelected && (
												<MaterialIcons name="check" size={18} color="#fff" />
											)}
										</View>
									</View>
									<View style={styles.itemInfo}>
										<Text style={styles.itemName}>
											{item.name || "Article"} x {item.quantity || 1}
										</Text>
										<Text style={styles.itemPrice}>
											{((item.price || 0) * (item.quantity || 1)).toFixed(2)}€
										</Text>
									</View>
								</TouchableOpacity>
							);
						})}
					</ScrollView>
				)}
			</View>

			{availableItems.length > 0 && (
				<View style={styles.totalContainer}>
					<Text style={[styles.totalLabel, { color: safeTheme.textColor }]}>
						Total sélectionné ({totalSelectedQuantity} article
						{totalSelectedQuantity > 1 ? "s" : ""}):
					</Text>
					<Text style={styles.total}> {total.toFixed(2)}€</Text>
				</View>
			)}

			{reservationId && (
				<View style={styles.reservationNote}>
					<Text style={styles.reservationNoteText}>
						ℹ️ Les articles payés sont sauvegardés. Vous pouvez quitter et
						revenir.
					</Text>
					<Text style={styles.reservationNoteDetail}>
						{paidItems.size > 0
							? `✅ ${paidItems.size} article(s) déjà payé(s)`
							: "Aucun article payé"}
					</Text>
				</View>
			)}

			<View style={styles.buttonsContainer}>
				{availableItems.length > 0 ? (
					<TouchableOpacity
						style={[
							styles.payButton,
							(loading || selectedItems.size === 0) && styles.payButtonDisabled,
						]}
						onPress={handlePay}
						disabled={loading || selectedItems.size === 0}
					>
						{loading ? (
							<ActivityIndicator color="#fff" />
						) : (
							<Text style={styles.buttonText}>
								Payer {selectedOrders.length} article
								{selectedOrders.length > 1 ? "s" : ""}
							</Text>
						)}
					</TouchableOpacity>
				) : null}

				<TouchableOpacity
					style={styles.backButton}
					onPress={safeOnBack}
					disabled={loading}
				>
					<Text style={styles.buttonText}>Retour</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 20,
		backgroundColor: "#f8f9fa",
	},
	title: {
		fontSize: 28,
		fontWeight: "bold",
		marginBottom: 10,
		color: "#333",
		textAlign: "center",
	},
	infoContainer: {
		marginBottom: 15,
		backgroundColor: "#f5f5f5",
		padding: 15,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: "#e0e0e0",
	},
	clientName: {
		fontSize: 20,
		fontWeight: "bold",
		marginBottom: 8,
	},
	infoText: {
		fontSize: 14,
		marginBottom: 4,
	},
	orderDetails: {
		flex: 1,
		backgroundColor: "#fff",
		borderRadius: 12,
		padding: 15,
		marginBottom: 15,
	},
	headerRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 15,
	},
	detailTitle: {
		fontSize: 18,
		fontWeight: "bold",
		color: "#333",
	},
	selectAllButton: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		backgroundColor: "#E3F2FD",
		borderRadius: 6,
	},
	selectAllText: {
		color: "#1976D2",
		fontSize: 13,
		fontWeight: "600",
	},
	itemsList: {
		maxHeight: 300,
	},
	orderItem: {
		flexDirection: "row",
		alignItems: "center",
		padding: 12,
		marginBottom: 8,
		backgroundColor: "#f9f9f9",
		borderRadius: 8,
		borderWidth: 1,
		borderColor: "#e0e0e0",
	},
	orderItemSelected: {
		backgroundColor: "#E3F2FD",
		borderColor: "#2196F3",
	},
	checkboxContainer: {
		marginRight: 12,
	},
	checkbox: {
		width: 24,
		height: 24,
		borderRadius: 6,
		borderWidth: 2,
		borderColor: "#bbb",
		justifyContent: "center",
		alignItems: "center",
	},
	checkboxChecked: {
		backgroundColor: "#4CAF50",
		borderColor: "#4CAF50",
	},
	itemInfo: {
		flex: 1,
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	itemName: {
		fontSize: 16,
		color: "#555",
		flex: 1,
	},
	itemPrice: {
		fontSize: 16,
		fontWeight: "600",
		color: "#333",
		marginLeft: 10,
	},
	emptyState: {
		alignItems: "center",
		padding: 30,
	},
	emptyText: {
		color: "#4CAF50",
		fontSize: 18,
		fontWeight: "bold",
		marginBottom: 8,
		textAlign: "center",
	},
	emptySubtext: {
		color: "#666",
		fontSize: 14,
		textAlign: "center",
		marginBottom: 20,
	},
	returnButton: {
		backgroundColor: "#4CAF50",
		paddingVertical: 12,
		paddingHorizontal: 24,
		borderRadius: 8,
	},
	returnButtonText: {
		color: "#fff",
		fontWeight: "600",
		fontSize: 16,
	},
	totalContainer: {
		flexDirection: "row",
		justifyContent: "center",
		alignItems: "center",
		marginBottom: 20,
		paddingVertical: 15,
		backgroundColor: "#fff",
		borderRadius: 12,
	},
	totalLabel: {
		fontSize: 18,
		fontWeight: "600",
		color: "#333",
	},
	total: {
		fontSize: 24,
		fontWeight: "bold",
		color: "#4CAF50",
		marginLeft: 10,
	},
	reservationNote: {
		backgroundColor: "#E3F2FD",
		padding: 12,
		borderRadius: 8,
		marginBottom: 15,
		borderLeftWidth: 4,
		borderLeftColor: "#2196F3",
	},
	reservationNoteText: {
		fontSize: 12,
		color: "#1565C0",
		marginBottom: 4,
	},
	reservationNoteDetail: {
		fontSize: 11,
		color: "#0D47A1",
		fontWeight: "500",
	},
	buttonsContainer: {
		width: "100%",
		gap: 15,
	},
	payButton: {
		backgroundColor: "#4CAF50",
		paddingVertical: 18,
		borderRadius: 12,
		alignItems: "center",
	},
	payButtonDisabled: {
		backgroundColor: "#81C784",
		opacity: 0.6,
	},
	backButton: {
		backgroundColor: "#757575",
		paddingVertical: 18,
		borderRadius: 12,
		alignItems: "center",
	},
	buttonText: {
		color: "#fff",
		fontWeight: "bold",
		fontSize: 18,
	},
	errorText: {
		fontSize: 16,
		textAlign: "center",
		marginBottom: 20,
	},
});
