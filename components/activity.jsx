import React, { useState, useEffect, useCallback } from "react";
import styles from "./styles";
import Login from "../app/login";
import {
	View,
	Text,
	TouchableOpacity,
	ScrollView,
	TextInput,
	Modal,
	Button,
	Alert,
	TouchableWithoutFeedback,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { getToken } from "../app/utils/token";

// Dans frontend ou CLIENT-end
// ✅ IMPORT DIRECT DES STORES
import useReservationStore from "../../shared-store/stores/useReservationStore";
import useProductStore from "../../shared-store/stores/useProductStore";
import { useServerStore } from "../src/stores/useServerStore";
import useTableStore from "../src/stores/useTableStore";
export default function Activity() {
	// ─────────────── États UI / modaux ───────────────
	const [showRestrictionsOptions, setShowRestrictionsOptions] = useState(false);
	const [showSettings, setShowSettings] = useState(false);
	const [showServerOptions, setShowServerOptions] = useState(false);
	const [showProductModal, setShowProductModal] = useState(false);

	// ─────────────── États de sélection / formulaire ───────────────
	const [tableId, setTableId] = useState(null);
	const [serverId, setServerId] = useState(null);
	const [restaurantId, setRestaurantId] = useState(null);
	const [notesValue, setNotesValue] = useState("");
	const [allergiesValue, setAllergiesValue] = useState("");
	const [editingNotes, setEditingNotes] = useState(false);
	const [editingAllergies, setEditingAllergies] = useState(false);
	const [step, setStep] = useState(1);
	const [selectedProduct, setSelectedProduct] = useState(null);

	// ─────────────── Données principales ───────────────
	const [orders, setOrders] = useState([]);
	const { products, setProducts, fetchProducts } = useProductStore();

	const [openedReservations, setOpenedReservations] = useState([]);
	const [activeId, setActiveId] = useState(null);
	const [started, setStarted] = useState(false);

	// ─────────────── Données statiques / options ───────────────
	const restrictionsOptions = [
		{ label: "Aucune", value: "Aucune" },
		{ label: "Vegan", value: "Vegan" },
		{ label: "Sans gluten", value: "Sans gluten" },
		{ label: "Halal", value: "Halal" },
	];

	// ─────────────── Stores ───────────────
	const { servers, fetchServers, setActiveServer, activeServer } =
		useServerStore();
	const { reservations, fetchReservations } = useReservationStore();
	const { tables, fetchTables } = useTableStore();

	// ─────────────── useEffects réorganisés ───────────────

	// ─────────────── useEffects ───────────────

	// 1️⃣ Récupération initiale du restaurantId depuis AsyncStorage
	useEffect(() => {
		const fetchRestaurantId = async () => {
			try {
				const id = await AsyncStorage.getItem("restaurantId");
				setRestaurantId(id);
			} catch (err) {
				console.error(
					"❌ Erreur lors de la récupération du restaurantId :",
					err
				);
			}
		};
		fetchRestaurantId();
	}, []);

	// 2️⃣ Vérification du token au montage
	useEffect(() => {
		const checkToken = async () => {
			const token = await getToken();
			if (!token) console.log("⚠️ Pas de token, redirection login");
		};
		checkToken();
	}, []);

	// 3️⃣ Fetch tables, serveurs et produits dès que restaurantId est disponible
	useEffect(() => {
		if (!restaurantId) return;

		const loadData = async () => {
			try {
				console.log("🔄 Début chargement SÉQUENTIEL des données...");

				// ⭐ SÉQUENCER les appels pour éviter les 429

				// 1. Tables d'abord
				console.log("📋 Fetch tables...");
				await fetchTables(restaurantId);
				const allTables = useTableStore.getState().tables;
				if (allTables.length > 0) setTableId(allTables[0]._id);

				// 2. Serveurs ensuite (attendre que tables soit fini)
				console.log("👨‍💼 Fetch serveurs...");
				await fetchServers(restaurantId);
				const allServers = useServerStore.getState().servers;
				if (allServers.length > 0) setServerId(allServers[0]._id);

				// 3. Produits enfin (attendre que serveurs soit fini)
				console.log("🍕 Fetch produits...");
				await fetchProducts(restaurantId);

				console.log("✅ Toutes les données chargées avec succès");
			} catch (error) {
				console.error("❌ Erreur lors du chargement:", error);
			}
		};

		loadData();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [restaurantId]);

	// 4️⃣ Fetch de toutes les réservations au montage
	useEffect(() => {
		fetchReservations();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// 5️⃣ Fetch commandes dès que tableId change
	useEffect(() => {
		if (!tableId) return;
		fetchOrders();
	}, [tableId, fetchOrders]);

	// 6️⃣ Mise à jour de activeReservation quand openedReservations ou activeId changent
	useEffect(() => {
		const reservation =
			openedReservations.find((r) => r._id === activeId) || null;

		if (reservation) {
			setActiveReservation({
				...reservation,
				orderItems: reservation.orderItems || [],
				notes: reservation.notes || "",
				allergies: reservation.allergies || [],
				customerName: reservation.customerName || "",
				tableId: reservation.tableId || null,
				status: reservation.status || "pending",
				createdAt: reservation.createdAt || null,
				updatedAt: reservation.updatedAt || null,
				totalPrice: reservation.totalPrice || 0,
				paymentStatus: reservation.paymentStatus || "unpaid",
			});
		} else {
			setActiveReservation(null);
		}
	}, [openedReservations, activeId]);

	// 7️⃣ Calcul du total général à partir de orders
	useEffect(() => {
		if (!activeReservation) return;

		const total = orders
			.reduce(
				(total, order) =>
					total + order.items.reduce((sum, i) => sum + i.price * i.quantity, 0),
				0
			)
			.toFixed(2);

		setActiveReservation((prev) => ({
			...prev,
			totalAmount: total,
		}));
	}, [orders, activeReservation]);

	// ─────────────── Callbacks / fonctions utilitaires ───────────────

	const normalize = (str) =>
		(str || "")
			.toLowerCase()
			.normalize("NFD")
			.replace(/[\u0300-\u036f]/g, "");

	const fetchOrders = useCallback(async () => {
		try {
			const token = await getToken();
			const res = await fetch(
				`http://192.168.1.185:3000/orders/table/${tableId}`,
				{
					headers: { Authorization: `Bearer ${token}` },
				}
			);
			if (!res.ok) {
				console.error("Erreur fetch commandes :", res.status);
				return;
			}
			const data = await res.json();
			setOrders((prev) => {
				const existingIds = new Set(prev.map((o) => o._id));
				const newOrders = data.filter((o) => !existingIds.has(o._id));
				return [...prev, ...newOrders];
			});
		} catch (err) {
			console.error("Erreur fetch commandes :", err);
		}
	}, [tableId]);

	const markReservationAsOpened = async (reservationId) => {
		try {
			const token = await getToken();
			if (!token) return alert("⚠️ Pas de token, redirection vers login");

			const response = await fetch(
				`http://192.168.1.185:3000/reservations/${reservationId}/status`,
				{
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({ status: "ouverte" }),
				}
			);
			if (!response.ok) {
				const text = await response.text();
				console.error("Response non OK :", text);
				return null;
			}
			return await response.json();
		} catch (err) {
			console.error("markReservationAsOpened error :", err);
			return null;
		}
	};

	const [token, setToken] = useState(null);

	// Vérifie le token au montage
	useEffect(() => {
		const fetchToken = async () => {
			const t = await AsyncStorage.getItem("token");
			setToken(t); // ← mettre le token dans le state
		};
		fetchToken();
	}, []);

	// Fonction pour vider le storage et déclencher un re-render
	const clearStorage = async () => {
		try {
			await AsyncStorage.clear();
			setToken(null); // ← ça force le re-render vers le login
			alert("AsyncStorage vidé ✅");
		} catch (e) {
			console.error("Erreur lors du vidage:", e);
		}
	};

	// useEffect qui se déclenche après le re-render
	useEffect(() => {
		const checkToken = async () => {
			const token = await AsyncStorage.getItem("token");
			if (!token) {
				console.log("Pas de token, retour au login");
				// ici tu peux faire ta redirection vers le Login
			}
		};
		checkToken();
	}, [token]);

	const openNextReservation = async () => {
		const nextResa = reservations
			.filter(
				(r) =>
					r.isPresent &&
					r.status === "en attente" &&
					!openedReservations.some((o) => o._id === r._id)
			)
			.sort(
				(a, b) =>
					new Date(`${a.reservationDate} ${a.reservationTime}`) -
					new Date(`${b.reservationDate} ${b.reservationTime}`)
			)[0];

		if (!nextResa) {
			Alert.alert(
				"Aucune réservation",
				"Il n'y a plus de réservation disponible pour le moment.",
				[{ text: "OK" }]
			);
			return null;
		}

		setOpenedReservations((prev) => [...prev, nextResa]);
		const updatedResa = await markReservationAsOpened(nextResa._id);
		if (!updatedResa || updatedResa.status !== "ouverte") return null;
		setActiveId(updatedResa._id);
		return updatedResa;
	};

	const markReservationAsFinished = async (reservationId) => {
		try {
			const token = await getToken();
			if (!token) return alert("Pas de token, rediriger vers login");

			const response = await fetch(
				`http://192.168.1.185:3000/reservations/${reservationId}/status`,
				{
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({ status: "fermee" }),
				}
			);
			if (!response.ok) {
				const text = await response.text();
				console.error("Erreur mise à jour :", text);
				return null;
			}
			return await response.json();
		} catch (err) {
			console.error("markReservationAsFinished error :", err);
			return null;
		}
	};

	const submitOrder = async () => {
		if (!activeReservation) return; // on vérifie qu'il y a une réservation active

		// Filtrer les produits avec quantity > 0 et récupérer name + price depuis products
		const items =
			activeReservation.orderItems
				?.filter((i) => i.quantity > 0)
				.map((i) => ({
					productId: i.productId,
					name: products.find((p) => p._id === i.productId)?.name,
					quantity: i.quantity,
					price: products.find((p) => p._id === i.productId)?.price,
				})) || [];

		if (items.length === 0) {
			alert("Aucun produit sélectionné !");
			return;
		}

		// Calcul du total
		const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

		try {
			const token = await getToken();
			const res = await fetch("http://192.168.1.185:3000/orders/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					tableId,
					items,
					total,
					status: "in_progress",
					restaurantId,
					serverId,
				}),
			});

			const data = await res.json();

			if (!res.ok) {
				console.error("Erreur création commande :", data);
				alert(data.message || "Erreur création commande");
				return;
			}

			// Réinitialiser les quantités locales à 0
			editField(
				"orderItems",
				activeReservation.orderItems.map((i) => ({ ...i, quantity: 0 }))
			);

			// Passer à l'étape 3 (total / récap)
			setStep(3);

			// Récupérer les commandes mises à jour
			await fetchOrders();
		} catch (err) {
			console.error("Erreur fetch création commande :", err);
			alert("Erreur serveur, réessayez");
		}
	};

	const editField = (field, value) => {
		setOpenedReservations((prev) =>
			prev.map((r) =>
				r._id === activeId
					? {
							...r,
							[field]: typeof value === "function" ? value(r[field]) : value,
					  }
					: r
			)
		);
	};

	const getElapsed = (iso) => {
		if (!iso) return "-";
		const diffMs = Date.now() - new Date(iso).getTime();
		const diffMin = Math.floor(diffMs / 60000);
		if (diffMin < 60) return `${diffMin} min`;
		const hours = Math.floor(diffMin / 60);
		const minutes = diffMin % 60;
		return `${hours}h ${minutes}m`;
	};

	// ─────────────── Active Popup ───────────────
	const [activeReservation, setActiveReservation] = useState(null);

	// Ici viendra ton JSX rendu (View, ScrollView, Modals, etc.)

	return (
		<>
			{!token ? (
				<Login /> // ton écran de connexion
			) : (
				<View style={styles.container}>
					{/* Bouton Commencer si aucune popup */}
					{!started && (
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
					)}
					<View style={{ padding: 20 }}>
						<Button title="Vider AsyncStorage" onPress={clearStorage} />
					</View>
					{/* Header principal */}
					<View style={styles.headerRow}>
						<View>
							<Text style={styles.realTableText}>
								{activeReservation?.realTable || ""}
							</Text>
							<Text style={styles.internalText}>
								{activeReservation?.internal || ""}
							</Text>
						</View>
					</View>

					{/* Popup principal */}
					{activeReservation && (
						<View style={styles.popupMainWrapper}>
							<View style={styles.popupMain}>
								{/* Header du popup */}
								<View style={styles.headerRow}>
									<View>
										<Text style={styles.realTableText}>
											{activeReservation.realTable}
										</Text>
										<Text style={styles.internalText}>
											{activeReservation.internal}
										</Text>
									</View>
									<TouchableOpacity
										style={styles.settingsButton}
										onPress={() => setShowSettings(true)}
									>
										<Text style={{ fontSize: 24 }}>⚙️</Text>
									</TouchableOpacity>
								</View>

								{/* Statut */}
								<View style={styles.statusRow}>
									<View style={[styles.badge, styles.badgeOccupied]}>
										<Text style={styles.badgeText}>Occupée</Text>
									</View>
									<Text style={styles.smallText}>
										Réservée: {activeReservation.reservationTime} (
										{activeReservation.reservationDate})
									</Text>
									<Text style={styles.smallText}>
										• {activeReservation.nbPersonnes} pers.
									</Text>
									<Text style={styles.smallText}>
										• {activeReservation.reservationSource || "Sur place"}
									</Text>
								</View>

								{/* Conteneur principal des colonnes */}
								<View style={{ flexDirection: "row", flex: 1, marginTop: 10 }}>
									{/* Colonne gauche */}
									<ScrollView style={{ maxWidth: "50%", paddingRight: 10 }}>
										<View style={styles.block}>
											<Text style={styles.blockTitle}>Détails réservation</Text>
											<View style={styles.row}>
												<Text style={styles.label}>Nom :</Text>
												<Text style={styles.value}>
													{activeReservation.clientName}
												</Text>
											</View>
											<View style={styles.row}>
												<Text style={styles.label}>Arrivée :</Text>
												<Text style={styles.value}>
													{activeReservation.arrivalTime?.slice(11, 16)}
												</Text>
												<Text style={styles.hint}>
													({getElapsed(activeReservation.arrivalTime)})
												</Text>
											</View>
											<View style={styles.row}>
												<Text style={styles.label}>Date réservation :</Text>
												<Text style={styles.value}>
													{activeReservation.reservationDate}
												</Text>
											</View>

											<Text style={styles.blockTitle}>Spécificités</Text>
											{/* Allergies */}
											<View style={[styles.row, { marginBottom: 4 }]}>
												<Text style={styles.label}>Allergies :</Text>
												{editingAllergies ? (
													<TextInput
														style={[
															styles.value,
															{
																borderBottomWidth: 1,
																borderColor: "#ccc",
																minHeight: 40,
															},
														]}
														value={allergiesValue}
														onChangeText={setAllergiesValue}
														onBlur={() => {
															editField("allergies", allergiesValue);
															setEditingAllergies(false);
														}}
														autoFocus
														multiline
													/>
												) : (
													<TouchableOpacity
														onPress={() => {
															setAllergiesValue(
																activeReservation.allergies || ""
															);
															setEditingAllergies(true);
														}}
													>
														<Text style={styles.value}>
															{activeReservation.allergies || "Aucune"}
															{!activeReservation.allergies
																? " (toucher pour modifier)"
																: ""}
														</Text>
													</TouchableOpacity>
												)}
											</View>

											{/* Restrictions */}
											<View style={[styles.row, { marginBottom: 4 }]}>
												<Text style={styles.label}>Restrictions :</Text>
												<View style={{ flex: 1 }}>
													{showRestrictionsOptions ? (
														<View style={styles.simpleDropdown}>
															{restrictionsOptions.map((opt) => (
																<TouchableOpacity
																	key={opt.value}
																	style={styles.simpleDropdownItem}
																	onPress={() => {
																		editField("restrictions", opt.value);
																		setShowRestrictionsOptions(false);
																	}}
																>
																	<Text style={styles.dropdownOptionText}>
																		{opt.label}
																	</Text>
																</TouchableOpacity>
															))}
														</View>
													) : (
														<TouchableOpacity
															style={styles.valueButton}
															onPress={() => setShowRestrictionsOptions(true)}
														>
															<Text style={styles.value}>
																{activeReservation.restrictions || "Aucune"}
															</Text>
														</TouchableOpacity>
													)}
												</View>
											</View>

											{/* Observations */}
											<View style={[styles.row, { marginBottom: 0 }]}>
												<Text style={styles.label}>Observations :</Text>
												{editingNotes ? (
													<TextInput
														style={[
															styles.value,
															{
																borderBottomWidth: 1,
																borderColor: "#ccc",
																minHeight: 40,
															},
														]}
														value={notesValue}
														onChangeText={setNotesValue}
														onBlur={() => {
															editField("notes", notesValue);
															setEditingNotes(false);
														}}
														autoFocus
														multiline
													/>
												) : (
													<TouchableOpacity
														onPress={() => {
															setNotesValue(activeReservation.notes || "");
															setEditingNotes(true);
														}}
													>
														<Text style={styles.value}>
															{activeReservation.notes ||
																"Ajouter une observation..."}
														</Text>
													</TouchableOpacity>
												)}
											</View>
										</View>
										{/* Bloc Service */}
										<View style={styles.block}>
											<Text style={styles.blockTitle}>Service</Text>
											<View style={[styles.row, { marginBottom: 4 }]}>
												<Text style={styles.label}>server :</Text>
												<View style={{ flex: 1 }}>
													{showServerOptions ? (
														<View style={styles.simpleDropdown}>
															{servers.map((srv) => (
																<TouchableOpacity
																	key={srv}
																	style={styles.simpleDropdownItem}
																	onPress={() => {
																		editField("server", srv); // met à jour la réservation
																		setActiveServer(srv); // met à jour le store
																		setShowServerOptions(false);
																	}}
																>
																	<Text style={styles.dropdownOptionText}>
																		{srv}
																	</Text>
																</TouchableOpacity>
															))}
														</View>
													) : (
														<TouchableOpacity
															style={styles.valueButton}
															onPress={() => setShowServerOptions(true)}
														>
															<Text style={styles.value}>
																{activeServer ||
																	activeReservation.server ||
																	"Aucun"}
															</Text>
														</TouchableOpacity>
													)}
												</View>
											</View>

											<View style={styles.row}>
												<Text style={styles.label}>Commande :</Text>
												<Text style={styles.value}>
													{activeReservation.orderSummary}
												</Text>
											</View>
											<View style={styles.row}>
												<Text style={styles.label}>Statut plats :</Text>
												<Text style={styles.value}>
													{activeReservation.dishStatus}
												</Text>
											</View>
										</View>

										{/* Bloc Paiement */}
										<View style={styles.block}>
											<Text style={styles.blockTitle}>Paiement & notes</Text>
											<View style={styles.row}>
												<Text style={styles.label}>Total :</Text>
												<Text style={styles.value}>
													{activeReservation.totalAmount}
												</Text>
											</View>
											<View style={styles.row}>
												<Text style={styles.label}>Paiement :</Text>
												<Text style={styles.value}>
													{activeReservation.paymentMethod}
												</Text>
											</View>
											<View style={styles.row}>
												<Text style={styles.label}>Notes staff :</Text>
												<Text style={styles.value}>—</Text>
											</View>
										</View>
									</ScrollView>

									{/* Colonne droite */}
									{step === 1 && (
										<ScrollView style={{ width: "50%", paddingLeft: 10 }}>
											{["boisson", "Entrée", "plat", "dessert"].map(
												(category) => (
													<View key={category} style={{ marginBottom: 15 }}>
														<Text style={styles.categoryTitle}>
															{category.charAt(0).toUpperCase() +
																category.slice(1)}
															s
														</Text>

														{products
															.filter(
																(p) =>
																	normalize(p.category) === normalize(category)
															)
															.map((product) => {
																const item = activeReservation.orderItems?.find(
																	(i) => i.productId === product._id
																);
																const quantity = item?.quantity ?? 0;

																return (
																	<View
																		key={product._id}
																		style={[
																			styles.productRow,
																			quantity > 0 && {
																				backgroundColor: "#e0f7fa",
																			},
																		]}
																	>
																		{/* Nom du produit cliquable */}
																		<TouchableOpacity
																			onPress={() => {
																				setSelectedProduct(product);
																				setShowProductModal(true);
																			}}
																			style={{ flex: 1 }}
																		>
																			<Text style={styles.value}>
																				{product.name}
																			</Text>
																		</TouchableOpacity>

																		{/* Compteur */}
																		<View
																			style={{
																				flexDirection: "row",
																				alignItems: "center",
																			}}
																		>
																			<TouchableOpacity
																				style={styles.counterButton}
																				onPress={() =>
																					editField("orderItems", (prev = []) =>
																						prev.map((i) =>
																							i.productId === product._id
																								? {
																										...i,
																										quantity: Math.max(
																											0,
																											i.quantity - 1
																										),
																								  }
																								: i
																						)
																					)
																				}
																			>
																				<Text>-</Text>
																			</TouchableOpacity>
																			<Text style={styles.quantityText}>
																				{quantity}
																			</Text>
																			<TouchableOpacity
																				style={styles.counterButton}
																				onPress={() => {
																					editField(
																						"orderItems",
																						(prev = []) => {
																							const existing = prev.find(
																								(i) =>
																									i.productId === product._id
																							);
																							if (existing) {
																								return prev.map((i) =>
																									i.productId === product._id
																										? {
																												...i,
																												quantity: Math.min(
																													99,
																													i.quantity + 1
																												),
																										  }
																										: i
																								);
																							} else {
																								return [
																									...prev,
																									{
																										productId: product._id,
																										quantity: 1,
																									},
																								];
																							}
																						}
																					);
																				}}
																			>
																				<Text>+</Text>
																			</TouchableOpacity>
																		</View>
																	</View>
																);
															})}
													</View>
												)
											)}
											<TouchableOpacity
												onPress={() => {
													// Vérifie si aucun produit n'a été sélectionné
													const hasSelectedItems =
														activeReservation.orderItems?.some(
															(i) => i.quantity > 0
														);
													if (hasSelectedItems) {
														setStep(step + 1); // On va en step 2
													} else {
														setStep(3); // On va directement au total
													}
												}}
												style={[styles.nextButton, { marginTop: 20 }]}
											>
												<Text style={styles.buttonText}>
													{activeReservation.orderItems?.some(
														(i) => i.quantity > 0
													)
														? "➡️ Suivant"
														: "TOTAL"}
												</Text>
											</TouchableOpacity>
										</ScrollView>
									)}
									{step === 2 && (
										<ScrollView style={{ width: "50%", paddingLeft: 10 }}>
											{activeReservation.orderItems
												.filter((i) => i.quantity > 0)
												.map((i) => {
													const product = products.find(
														(p) => p._id === i.productId
													);
													return (
														<View key={i.productId} style={styles.productRow}>
															<Text style={{ flex: 1 }}>{product?.name}</Text>
															<Text style={{ width: 400, textAlign: "center" }}>
																{i.quantity}
															</Text>
															<Text style={{ width: 60, textAlign: "right" }}>
																{product.price}€
															</Text>
														</View>
													);
												})}

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
											<Text style={styles.modalTitle}>
												Total de la commande
											</Text>

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
																	<Text
																		style={{
																			fontWeight: "bold",
																			marginBottom: 5,
																		}}
																	>
																		Commande #{order._id.slice(-4)} - Table{" "}
																		{order.tableId?.number || "-"} -{" "}
																		{new Date(
																			order.createdAt
																		).toLocaleTimeString([], {
																			hour: "2-digit",
																			minute: "2-digit",
																		})}
																	</Text>

																	{order.items.map((i) => (
																		<View
																			key={i.productId}
																			style={{
																				flexDirection: "row",
																				alignItems: "center",
																				marginVertical: 4,
																			}}
																		>
																			<Text style={{ flex: 1 }}>{i.name}</Text>
																			<Text
																				style={{
																					width: 50,
																					textAlign: "center",
																				}}
																			>
																				{i.quantity}
																			</Text>
																			<Text
																				style={{
																					width: 60,
																					textAlign: "right",
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
																		Total commande :{" "}
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

													{/* Total général de toutes les commandes */}
													<Text
														style={{
															fontWeight: "bold",
															textAlign: "right",
															marginTop: 10,
														}}
													>
														Total général : {activeReservation.totalAmount} €
													</Text>
												</>
											) : (
												<Text>Aucune commande disponible</Text>
											)}

											<TouchableOpacity
												onPress={() => {
													setStep(1);
													// Crée un orderItems vide pour le nouveau formulaire
													editField(
														"orderItems",
														products.map((p) => ({
															productId: p._id,
															quantity: 0,
														}))
													);
													// Ne pas toucher à activeId ni orders
												}}
												style={[styles.nextButton, { marginTop: 20 }]}
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

					{/* Miniatures */}
					{started && (
						<View style={styles.miniWrapper}>
							{openedReservations
								.filter((r) => r._id !== activeId) // <-- on exclut la réservation ouverte dans la grande modal
								.map((r) => (
									<TouchableOpacity
										key={r._id}
										style={styles.popupMini}
										onPress={() => setActiveId(r._id)}
									>
										<Text style={styles.miniTitle}>{r.clientName}</Text>
										<Text style={styles.miniSub}>{`Table ${
											r.tableNumber || r.tableId
										}`}</Text>
									</TouchableOpacity>
								))}

							<TouchableOpacity
								style={[styles.popupMini, styles.addButton]}
								onPress={() => {
									Alert.alert(
										"Nouvelle réservation",
										"Voulez-vous vraiment ouvrir une nouvelle réservation ?",
										[
											{ text: "Annuler", style: "cancel" },
											{
												text: "Oui",
												onPress: async () => {
													const nextResa = await openNextReservation();
													if (nextResa) setStarted(true); // démarre l'UI si nécessaire
												},
											},
										]
									);
								}}
							>
								<Text style={styles.addText}>+</Text>
							</TouchableOpacity>
						</View>
					)}

					{/* Modal Paramètres */}
					<Modal
						visible={showSettings}
						transparent
						animationType="fade"
						onRequestClose={() => setShowSettings(false)}
					>
						<TouchableWithoutFeedback onPress={() => setShowSettings(false)}>
							<View style={styles.overlaySettings}>
								<TouchableWithoutFeedback>
									<View style={styles.modalSettings}>
										<Text style={styles.modalTitleSettings}>
											Options de réservation
										</Text>

										{/* Terminer réservation */}
										<TouchableOpacity
											style={[
												styles.modalButtonSettings,
												{ backgroundColor: "#4285F4" },
											]}
											onPress={() =>
												Alert.alert(
													"Confirmation",
													"Êtes-vous sûr de vouloir terminer cette réservation ?",
													[
														{ text: "Non", style: "cancel" },
														{
															text: "Oui",
															onPress: async () => {
																setShowSettings(false);
																if (activeReservation?._id) {
																	const updated =
																		await markReservationAsFinished(
																			activeReservation._id
																		);
																	if (updated) {
																		// Optionnel : mettre à jour le state local
																		setOpenedReservations((prev) =>
																			prev.filter(
																				(r) => r._id !== activeReservation._id
																			)
																		);
																		setActiveId(null);
																	} else {
																		alert(
																			"Erreur lors de la mise à jour de la réservation."
																		);
																	}
																}
															},
														},
													]
												)
											}
										>
											<Text style={styles.buttonTextSettings}>
												✅ Terminer la réservation
											</Text>
										</TouchableOpacity>

										{/* Annuler réservation */}
										<TouchableOpacity
											style={[
												styles.modalButtonSettings,
												{ backgroundColor: "#EA4335" },
											]}
											onPress={() =>
												Alert.alert(
													"Confirmation",
													"Êtes-vous sûr de vouloir annuler cette réservation ?",
													[
														{ text: "Non", style: "cancel" },
														{
															text: "Oui",
															onPress: () => {
																setShowSettings(false);
																console.log(
																	"❌ Annuler réservation",
																	activeReservation?.id
																);
															},
														},
													]
												)
											}
										>
											<Text style={styles.buttonTextSettings}>
												❌ Annuler la réservation
											</Text>
										</TouchableOpacity>

										{/* Fermer */}
										<TouchableOpacity
											style={styles.modalButtonCancel}
											onPress={() => setShowSettings(false)}
										>
											<Text style={styles.buttonTextCancel}>Fermer</Text>
										</TouchableOpacity>
									</View>
								</TouchableWithoutFeedback>
							</View>
						</TouchableWithoutFeedback>
					</Modal>
					<Modal
						visible={showProductModal}
						transparent
						animationType="fade"
						onRequestClose={() => setShowProductModal(false)}
					>
						<View
							style={{
								flex: 1,
								backgroundColor: "rgba(0,0,0,0.5)",
								justifyContent: "center",
								alignItems: "center",
							}}
						>
							<View
								style={{
									width: "30%",
									height: "30%",
									backgroundColor: "#fff",
									padding: 20,
									borderRadius: 10,
									flexDirection: "column",
									justifyContent: "space-between", // espace entre le haut et le bas
								}}
							>
								<Text
									style={{ fontWeight: "bold", fontSize: 18, marginBottom: 10 }}
								>
									{selectedProduct?.name}
								</Text>
								<Text>
									{selectedProduct?.description ||
										"Aucune description disponible."}
								</Text>
								<Text style={{ marginTop: 10, fontStyle: "italic" }}>
									Allergènes : {selectedProduct?.allergens || "—"}
								</Text>

								<TouchableOpacity
									onPress={() => setShowProductModal(false)}
									style={{ marginTop: 20, alignSelf: "center" }}
								>
									<Text style={{ color: "blue" }}>Fermer</Text>
								</TouchableOpacity>
							</View>
						</View>
					</Modal>
				</View>
			)}
		</>
	);
}
