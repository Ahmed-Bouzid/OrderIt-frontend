import { API_CONFIG } from "../../src/config/apiConfig";
// components/screens/Activity.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import styles from "../styles";
import Login from "../../app/login";
import {
	View,
	Text,
	TouchableOpacity,
	ScrollView,
	Button,
	Alert,
	FlatList,
} from "react-native";
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
	const { theme, initTheme } = useThemeStore();
	const authFetch = useAuthFetch();

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

	// Render miniatures avec FlatList
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
				let diff = Math.max(0, now - arriveDate.getTime()); // en ms
				const hours = String(Math.floor(diff / 3600000)).padStart(2, "0");
				diff = diff % 3600000;
				const mins = String(Math.floor(diff / 60000)).padStart(2, "0");
				diff = diff % 60000;
				const secs = String(Math.floor(diff / 1000)).padStart(2, "0");
				arriveDisplay = `${hours}:${mins}:${secs}`;
			}

			return (
				<TouchableOpacity
					style={styles.popupMini}
					onPress={() => setActiveId(r._id)}
				>
					<Text style={styles.miniTitle}>
						{r.clientName && typeof r.clientName === "string"
							? r.clientName.charAt(0).toUpperCase() +
								r.clientName.slice(1).toLowerCase()
							: String(r.clientName)}
					</Text>
					<Text style={styles.miniSub}>{`Table ${tableNumber}`}</Text>
					<Text style={styles.miniArrive}>{`🕐 ${arriveDisplay}`}</Text>
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
			<View
				style={[styles.container, { backgroundColor: theme.backgroundColor }]}
			>
				{/* Bouton Commencer - on garde la condition stricte sur isReservationsLoaded */}
				{isReservationsLoaded &&
					openedReservations.length === 0 &&
					!activeId && (
						<>
							<TouchableOpacity
								style={styles.button}
								onPress={async () => {
									const nextResa = await openNextReservation();
									if (!nextResa) return;
									setStarted(true);
								}}
							>
								<Text style={styles.buttonText}>Commencer</Text>
							</TouchableOpacity>
						</>
					)}

				{/* Popup principal - ⭐ Ne pas afficher si réservation fermée/annulée */}
				{activeReservation && activeReservation.status === "ouverte" && (
					<View style={styles.popupMainWrapper}>
						<View
							style={[styles.popupMain, { backgroundColor: theme.cardColor }]}
						>
							{/* Header unifié : Table info + Badge Occupée + Infos réservation + Molette */}
							<View
								style={[styles.headerRow, { backgroundColor: theme.cardColor }]}
							>
								<View>
									<Text
										style={[styles.realTableText, { color: theme.textColor }]}
									>
										{activeReservation.realTable || ""}
									</Text>
									<Text
										style={[styles.internalText, { color: theme.textColor }]}
									>
										{activeReservation.internal || ""}
									</Text>
								</View>
								<View
									style={[
										styles.badge,
										styles.badgeOccupied,
										{ marginLeft: 8 },
									]}
								>
									<Text style={[styles.badgeText, { color: theme.textColor }]}>
										Occupée
									</Text>
								</View>
								<View
									style={{ flex: 1, marginLeft: 10, justifyContent: "center" }}
								>
									<Text style={[styles.smallText, { color: theme.textColor }]}>
										Réservée: {activeReservation.reservationTime || "N/A"} (
										{new Date(
											activeReservation.reservationDate
										).toLocaleDateString("fr-FR")}
										) • {activeReservation.nbPersonnes || 0} pers.
									</Text>
								</View>
								<TouchableOpacity
									style={styles.settingsButton}
									onPress={() => setShowSettings(true)}
								>
									<Text style={{ fontSize: 24 }}>⚙️</Text>
								</TouchableOpacity>
							</View>
							{/* Conteneur colonnes */}
							<View style={{ flexDirection: "row", flex: 1, marginTop: 10 }}>
								{/* Colonne gauche */}
								<ScrollView style={{ maxWidth: "50%", paddingRight: 10 }}>
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
						</View>
					</View>
				)}

				{/* Miniatures - seulement si activeId existe */}
				{activeId && (
					<View style={styles.miniWrapper}>
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
											style={[styles.popupMini, styles.addButton]}
											onPress={async () => {
												const nextResa = await openNextReservation();
												if (nextResa) {
													setStarted(true);
												}
											}}
										>
											<Text style={styles.addText}>+</Text>
										</TouchableOpacity>
									);
								}
								return renderMiniature({ item });
							}}
							keyExtractor={(item) => item._id}
							horizontal
							showsHorizontalScrollIndicator={false}
							contentContainerStyle={{
								flexGrow: 1, // ⭐ ESSENTIEL pour centrer
								justifyContent: "center",
								alignItems: "center",
								gap: 8,
							}}
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
