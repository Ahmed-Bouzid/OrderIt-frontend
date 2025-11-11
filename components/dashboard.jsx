import React, { useState, useEffect, useCallback } from "react";
import styles from "./styles"; // adapte le chemin si tu l'as mis dans un sous-dossier
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import useReservationStore from "../src/stores/useReservationStore";
import DraggableButton from "../components/ui/draggableButton";

import {
	View,
	Text,
	ScrollView,
	TouchableOpacity,
	Dimensions,
	Modal,
	TextInput,
	KeyboardAvoidingView,
	Platform,
	TouchableWithoutFeedback,
	Alert,
} from "react-native";

const SCREEN_WIDTH = Dimensions.get("window").width;
// eslint-disable-next-line no-unused-vars
const THRESHOLD = SCREEN_WIDTH * 0.2;

// Carte individuelle swipeable avec roue de réglages
function SwipeableReservationCard({
	reservation,
	onSettingsPress,
	onAssignTablePress,
	// ⭐ RETIREZ refreshActiveReservation des props puisqu'on ne l'utilise plus ici
}) {
	return (
		<View
			style={[
				styles.card,
				{
					flexDirection: "row",
					width: "100%",
					backgroundColor: reservation.isPresent
						? "rgba(46, 139, 87, 0.2)"
						: "#fff",
					borderRadius: 8,
					padding: 10,
				},
			]}
		>
			{reservation.isPresent && <View style={styles.greenStripe} />}

			{/* Colonne gauche */}
			<View style={styles.leftCol}>
				<Text style={styles.infoText}>{reservation.clientName}</Text>
				<Text style={styles.subText}>
					Personnes : {reservation.nbPersonnes}
				</Text>
				<Text style={styles.subText}>
					Date : {new Date(reservation.reservationDate).toLocaleDateString()}
				</Text>
				<Text style={styles.subText}>
					Heure : {reservation.reservationTime}
				</Text>
				<Text style={styles.subText}>
					Allergies : {reservation.allergies || "Aucune"}
				</Text>
				<Text style={styles.subText}>
					Restrictions : {reservation.restrictions || "Aucune"}
				</Text>
				<Text style={styles.subText}>Notes : {reservation.notes || "-"}</Text>
			</View>

			{/* Colonne droite */}
			<View style={styles.rightCol}>
				<Text style={styles.subText}>server : {reservation.server || "-"}</Text>
				<Text style={styles.subText}>
					Paiement : {reservation.paymentMethod || "-"}
				</Text>
				<Text style={styles.subText}>
					Montant :{" "}
					{reservation.totalAmount ? `${reservation.totalAmount}€` : "-"}
				</Text>
				<Text style={styles.subText}>Statut : {reservation.status || "-"}</Text>

				<TouchableOpacity onPress={() => onSettingsPress(reservation)}>
					<Text style={{ fontSize: 20, marginTop: 4 }}>⚙️</Text>
				</TouchableOpacity>

				{reservation.status === "en attente" ? (
					<TouchableOpacity
						onPress={() => {
							// ⭐ APPEL SIMPLE - le rafraîchissement se fait dans onAssignTablePress
							onAssignTablePress(reservation);
						}}
					>
						<Text style={{ fontSize: 20, marginTop: 4 }}>🪑</Text>
					</TouchableOpacity>
				) : (
					<View style={{ width: 30 }} /> // espace réservé
				)}
			</View>
		</View>
	);
}

export default function Dashboard(navigation) {
	// ─────────────── États ───────────────
	// ─────────────── Imports & Store ───────────────
	const { reservations, fetchReservations } = useReservationStore();

	// ─────────────── États ───────────────
	const [modalVisible, setModalVisible] = useState(false);
	const [selectedReservation, setSelectedReservation] = useState(null);
	const [newResaModal, setNewResaModal] = useState(false);
	const [step, setStep] = useState(1);

	// Formulaire réservation
	const [clientName, setClientName] = useState("");
	const [phone, setPhone] = useState("");
	const [reservationTime, setReservationTime] = useState("");
	const [reservationDate, setReservationDate] = useState("");
	const [nbPersonnes, setNbPersonnes] = useState(1);
	const [allergies, setAllergies] = useState("");
	const [restrictions, setRestrictions] = useState("");
	const [notes, setNotes] = useState("");

	// Tables
	const [tables, setTables] = useState([]);
	const [selectedTable, setSelectedTable] = useState(null);

	// Modales et réservations ouvertes
	const [showAssignTableModal, setShowAssignTableModal] = useState(false);
	const [activeReservation, setActiveReservation] = useState(null);
	const [showTablesOptions, setShowTablesOptions] = useState(false);

	// Nouvelle réservation
	const [newReservation, setNewReservation] = useState({
		clientName: "",
		nbPersonnes: 1,
		allergies: "",
		restrictions: "",
		notes: "",
		reservationDate: null,
		reservationTime: null,
	});
	const currentTable = activeReservation?.tableId
		? tables.find((t) => t._id === activeReservation.tableId)
		: null;

	console.log(
		"🔍 Active Reservation:",
		activeReservation?._id,
		"Table:",
		currentTable?.number || "Aucune"
	);
	// Filtre réservation
	const [reservationFilter, setReservationFilter] = useState("actives");

	// ─────────────── Fonctions de gestion modales ───────────────
	const nextStep = () => setStep((s) => s + 1);
	const prevStep = () => setStep((s) => Math.max(1, s - 1));

	const resetResa = () => {
		setNewResaModal(false);
		setClientName("");
		setPhone("");
		setReservationTime("");
		setAllergies("");
		setRestrictions("");
		setNotes("");
		setNbPersonnes(1);
		setReservationDate("");
		setStep(1);
		setSelectedTable(tables[0] || null);
	};

	const openSettings = (reservation) => {
		setSelectedReservation(reservation);
		setModalVisible(true);
	};

	const closeModal = () => {
		setModalVisible(false);
		setSelectedReservation(null);
	};

	// ─────────────── Filtrage des réservations ───────────────
	const filteredReservations = reservations.filter((res) => {
		switch (reservationFilter) {
			case "en_attente":
				return res.status === "en attente";
			case "present":
				return res.status === "en attente" && res.isPresent === true;
			case "ouverte":
				return res.status === "ouverte";
			case "termine":
				return res.status === "fermee";
			case "annulee":
				return res.status === "annulee";
			default:
				return true;
		}
	});

	// ─────────────── Gestion tables ───────────────
	const fetchTables = useCallback(async () => {
		try {
			const token = await AsyncStorage.getItem("token");
			const storedRestaurantId = await AsyncStorage.getItem("restaurantId");
			if (!token || !storedRestaurantId) return;

			const res = await fetch(
				`http://192.168.1.185:3000/tables/restaurant/${storedRestaurantId}`,
				{ headers: { Authorization: `Bearer ${token}` } }
			);

			if (!res.ok) {
				console.error("Erreur fetch tables :", res.status);
				return;
			}

			const data = await res.json();
			setTables(data);

			if (data.length > 0) setSelectedTable(data[0]);
		} catch (err) {
			console.error("Erreur récupération tables :", err);
		}
	}, []);

	// ✅ CORRECTION - s'exécute une seule fois au montage
	useEffect(() => {
		fetchReservations();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []); // ⭐ Tableau de dépendances VIDE

	useEffect(() => {
		fetchTables();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []); // ⭐ Tableau de dépendances VIDE

	// Ajoutez cette fonction dans votre composant
	const refreshActiveReservation = async (reservationId) => {
		try {
			await new Promise((resolve) => setTimeout(resolve, 300));

			const token = await AsyncStorage.getItem("token");
			const res = await fetch(
				`http://192.168.1.185:3000/reservations/${reservationId}`,
				{
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
				}
			);

			if (res.ok) {
				const updatedReservation = await res.json();
				setActiveReservation(updatedReservation);
				console.log(
					"🔄 Réservation rafraîchie:",
					updatedReservation?.clientName,
					"Table:",
					updatedReservation?.tableId
						? tables.find((t) => t._id === updatedReservation.tableId)?.number
						: "Aucune"
				);
			} else {
				// ⭐ NE PAS JETER D'ERREUR POUR LES 429, JUSTE LOGGER
				if (res.status === 429) {
					console.warn("⚠️ Rate limiting sur refreshActiveReservation");
					return;
				}
				throw new Error("Erreur rafraîchissement réservation");
			}
		} catch (error) {
			console.error("❌ Erreur rafraîchissement réservation:", error);
		}
	};

	const assignTable = async (reservationId, chosenTableId) => {
		try {
			await new Promise((resolve) => setTimeout(resolve, 500));

			const token = await AsyncStorage.getItem("token");
			if (!token) throw new Error("Token manquant");

			const oldTableId = activeReservation?.tableId;
			const chosenTableNumber = tables.find(
				(t) => t._id === chosenTableId
			)?.number;
			const oldTableNumber = tables.find((t) => t._id === oldTableId)?.number;

			console.log("🔄 assignTable:");
			console.log("📋 Reservation:", reservationId);
			console.log("🪑 Table choisie:", chosenTableNumber || chosenTableId);
			console.log(
				"🪑 Table actuelle:",
				oldTableNumber || oldTableId || "Aucune"
			);

			// Mise à jour optimiste
			setActiveReservation((prev) => ({
				...prev,
				tableId: chosenTableId,
				tableNumber: chosenTableNumber,
			}));

			const res = await fetch(
				`http://192.168.1.185:3000/reservations/assignTable/${reservationId}`,
				{
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({
						tableId: chosenTableId,
						oldTableId: oldTableId,
					}),
				}
			);

			if (!res.ok) {
				const text = await res.text();
				// ⭐ GESTION SPÉCIFIQUE PLE RATE LIMITING
				if (res.status === 429) {
					throw new Error(
						"Trop de requêtes. Veuillez patienter quelques secondes."
					);
				}
				throw new Error(text || "Erreur assignation table");
			}

			const data = await res.json();
			console.log("✅ Réponse backend:", data);

			// Rafraîchissement avec délai
			await new Promise((resolve) => setTimeout(resolve, 300));
			await fetchTables();
			await refreshActiveReservation(reservationId);

			setShowAssignTableModal(false);
		} catch (err) {
			console.error("❌ assignTable failed:", err);
			Alert.alert("Erreur", err.message);

			// Re-fetch en cas d'erreur
			await new Promise((resolve) => setTimeout(resolve, 1000));
			await fetchTables();
			if (reservationId) {
				await refreshActiveReservation(reservationId);
			}
		}
	};

	// ─────────────── Création réservation ───────────────
	const createReservation = async () => {
		try {
			const token = await AsyncStorage.getItem("token");
			if (!token) return alert("Pas de token, rediriger vers login");

			// Calcul date ISO
			let isoDate;
			try {
				const [hours, minutes] = reservationTime.split(":");
				const today = new Date(reservationDate || new Date());
				today.setHours(parseInt(hours), parseInt(minutes), 0, 0);
				isoDate = today.toISOString();
			} catch {
				Alert.alert("Erreur", "La date ou l'heure choisie n'est pas valide.", [
					{ text: "OK" },
				]);
				return;
			}

			const storedRestaurantId = await AsyncStorage.getItem("restaurantId");
			if (!storedRestaurantId) {
				return Alert.alert(
					"Erreur",
					"Restaurant non défini, attend le chargement"
				);
			}

			const body = {
				clientName,
				phone,
				nbPersonnes,
				allergies,
				restrictions,
				notes,
				restaurantId: storedRestaurantId,
				reservationDate: isoDate,
				reservationTime,
				...(selectedTable && { tableId: selectedTable._id }),
			};

			console.log("Envoi body :", body);

			const response = await fetch("http://192.168.1.185:3000/reservations", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify(body),
			});

			const text = await response.text();
			let data;
			try {
				data = JSON.parse(text);
			} catch {
				console.error("Réponse non JSON:", text);
				Alert.alert("Erreur", "Erreur serveur : réponse inattendue");
				return;
			}

			if (!response.ok) {
				console.error(data);
				Alert.alert("Erreur", data.message || "Vérifie les champs");
				return;
			}

			Alert.alert("Succès", "Réservation créée avec succès !");
			resetResa();
			fetchReservations();
		} catch (err) {
			console.error(err);
			Alert.alert(
				"Erreur",
				"Impossible de créer la réservation, vérifie ta connexion."
			);
		}
	};

	// ─────────────── Toggle Présent / Absent ───────────────
	const togglePresent = async (id) => {
		try {
			const token = await AsyncStorage.getItem("token");
			if (!token) {
				alert("Pas de token, rediriger vers login");
				return false;
			}

			const response = await fetch(
				`http://192.168.1.185:3000/reservations/${id}/togglePresent`,
				{
					method: "PUT",
					headers: { Authorization: `Bearer ${token}` },
				}
			);

			const data = await response.json();
			if (!response.ok) {
				alert("Erreur: " + (data.message || "Impossible de mettre présent"));
				return false;
			}

			alert(
				`Réservation mise à jour : ${
					data.isPresent ? "Présent ✅" : "Absent ⚠️"
				}`
			);
			fetchReservations();
			return true;
		} catch (err) {
			console.error(err);
			alert("Erreur de connexion");
			return false;
		}
	};

	// ─────────────── Mettre à jour le statut ───────────────
	const updateStatus = async (id, newStatus) => {
		try {
			const token = await AsyncStorage.getItem("token");
			if (!token) return alert("Pas de token, rediriger vers login");

			const normalizedStatus = newStatus.toLowerCase();

			const response = await fetch(
				`http://192.168.1.185:3000/reservations/${id}/status`,
				{
					method: "PUT",
					headers: {
						Authorization: `Bearer ${token}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ status: normalizedStatus }),
				}
			);

			const data = await response.json();
			if (!response.ok) {
				alert("Erreur: " + (data.message || "Impossible de changer le statut"));
				return false;
			}

			alert(`Réservation mise à jour : ${normalizedStatus} ✅`);
			fetchReservations();
			return true;
		} catch (err) {
			console.error(err);
			alert("Erreur de connexion");
			return false;
		}
	};

	return (
		<View style={{ flex: 1 }}>
			<View style={{ flexDirection: "row", marginBottom: 10 }}>
				<TouchableOpacity
					style={{
						backgroundColor:
							reservationFilter === "en_attente" ? "#FFA500" : "#ccc",
						padding: 10,
						borderRadius: 5,
						marginRight: 5,
					}}
					onPress={() => setReservationFilter("en_attente")}
				>
					<Text style={{ color: "#fff" }}>En Attente</Text>
				</TouchableOpacity>

				<TouchableOpacity
					style={{
						backgroundColor:
							reservationFilter === "present" ? "#4285F4" : "#ccc",
						padding: 10,
						borderRadius: 5,
						marginRight: 5,
					}}
					onPress={() => setReservationFilter("present")}
				>
					<Text style={{ color: "#fff" }}>Présent</Text>
				</TouchableOpacity>
				<TouchableOpacity
					style={{
						backgroundColor:
							reservationFilter === "ouverte" ? "#FFD700" : "#ccc",
						padding: 10,
						borderRadius: 5,
						marginRight: 5,
					}}
					onPress={() => setReservationFilter("ouverte")}
				>
					<Text style={{ color: "#fff" }}>Ouverte</Text>
				</TouchableOpacity>
				<TouchableOpacity
					style={{
						backgroundColor:
							reservationFilter === "termine" ? "#34A853" : "#ccc",
						padding: 10,
						borderRadius: 5,
						marginRight: 5,
					}}
					onPress={() => setReservationFilter("termine")}
				>
					<Text style={{ color: "#fff" }}>Terminée</Text>
				</TouchableOpacity>
				<TouchableOpacity
					style={{
						backgroundColor:
							reservationFilter === "annulee" ? "#EA4335" : "#ccc",
						padding: 10,
						borderRadius: 5,
						marginRight: 5,
					}}
					onPress={() => setReservationFilter("annulee")}
				>
					<Text style={{ color: "#fff" }}>Annulée</Text>
				</TouchableOpacity>
			</View>

			<ScrollView
				style={{ flex: 1, backgroundColor: "#f9f9f9" }}
				contentContainerStyle={{
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<ScrollView
					style={{ flex: 1, backgroundColor: "#f9f9f9" }}
					contentContainerStyle={{
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					<ScrollView contentContainerStyle={{ paddingVertical: 10 }}>
						{filteredReservations.map((res) => (
							<SwipeableReservationCard
								key={res._id}
								reservation={res}
								onSettingsPress={openSettings}
								onAssignTablePress={async (reservation) => {
									// ⭐ RAFRAÎCHIR la réservation avant d'ouvrir la modal
									await refreshActiveReservation(reservation._id);
									setShowAssignTableModal(true);
								}}
							/>
						))}
					</ScrollView>
				</ScrollView>
			</ScrollView>

			<DraggableButton
				onPress={() => setNewResaModal(true)}
				color="#b87a23ff"
				initialPosition={{ bottom: 10, right: 530 }}
			/>

			{/* <TouchableOpacity
				style={styles.newReservationButton}
				onPress={() => setNewResaModal(true)}
			>
				<Text style={{ fontSize: 26, color: "#fff" }}>＋</Text>
			</TouchableOpacity>

			{/* Modal Réglages */}
			<Modal
				visible={modalVisible}
				transparent
				animationType="fade"
				onRequestClose={closeModal}
			>
				<TouchableWithoutFeedback onPress={closeModal}>
					<View style={styles.overlaySettings}>
						<TouchableWithoutFeedback>
							<View style={styles.modalSettings}>
								<Text style={styles.modalTitleSettings}>
									Réglages pour {selectedReservation?.clientName}
								</Text>

								{selectedReservation && (
									<>
										{/* Si réservation en attente */}
										{selectedReservation.status === "en attente" && (
											<>
												{/* Présent / Absent */}
												{!selectedReservation.isPresent ? (
													<TouchableOpacity
														style={[
															styles.modalButtonSettings,
															{ backgroundColor: "#34A853" },
														]}
														onPress={async () => {
															const success = await togglePresent(
																selectedReservation._id
															);
															if (success) closeModal();
														}}
													>
														<Text style={styles.buttonTextSettings}>
															✅ Mettre présent
														</Text>
													</TouchableOpacity>
												) : (
													<TouchableOpacity
														style={[
															styles.modalButtonSettings,
															{ backgroundColor: "#FFA500" },
														]}
														onPress={async () => {
															const success = await togglePresent(
																selectedReservation._id
															);
															if (success) closeModal();
														}}
													>
														<Text style={styles.buttonTextSettings}>
															⚠️ Mettre absent
														</Text>
													</TouchableOpacity>
												)}

												{/* Terminer uniquement si présent */}
												{selectedReservation.isPresent && (
													<TouchableOpacity
														style={[
															styles.modalButtonSettings,
															{ backgroundColor: "#34A853" },
														]}
														onPress={async () => {
															const success = await updateStatus(
																selectedReservation._id,
																"fermee"
															);
															if (success) closeModal();
														}}
													>
														<Text style={styles.buttonTextSettings}>
															✅ Terminer la réservation
														</Text>
													</TouchableOpacity>
												)}
											</>
										)}

										{/* Si réservation ouverte */}
										{selectedReservation.status === "ouverte" && (
											<>
												<TouchableOpacity
													style={[
														styles.modalButtonSettings,
														{ backgroundColor: "#34A853" },
													]}
													onPress={async () => {
														// ici tu peux proposer Terminer
														const success = await updateStatus(
															selectedReservation._id,
															"fermee"
														);
														if (success) closeModal();
													}}
												>
													<Text style={styles.buttonTextSettings}>
														✅ Terminer la réservation
													</Text>
												</TouchableOpacity>
											</>
										)}
										{selectedReservation.status !== "fermee" &&
											selectedReservation.status !== "annulee" && (
												<TouchableOpacity
													style={[
														styles.modalButtonSettings,
														{ backgroundColor: "#EA4335" },
													]}
													onPress={async () => {
														const success = await updateStatus(
															selectedReservation._id,
															"annulee"
														);
														if (success) closeModal();
													}}
												>
													<Text style={styles.buttonTextSettings}>
														❌ Annuler la réservation
													</Text>
												</TouchableOpacity>
											)}

										{/* Si réservation annulée */}
										{selectedReservation.status === "annulee" && (
											<>
												<TouchableOpacity
													style={[
														styles.modalButtonSettings,
														{ backgroundColor: "#34A853" },
													]}
													onPress={async () => {
														const success = await updateStatus(
															selectedReservation._id,
															"en attente"
														);
														if (success) closeModal();
													}}
												>
													<Text style={styles.buttonTextSettings}>
														♻️ Rétablir la réservation
													</Text>
												</TouchableOpacity>
											</>
										)}

										{/* Si réservation terminée */}
										{/* Si réservation terminée */}
										{selectedReservation.status === "fermee" && (
											<>
												<Text style={{ margin: 10, color: "#555" }}>
													Cette réservation est terminée.
												</Text>

												<TouchableOpacity
													style={[
														styles.modalButtonSettings,
														{ backgroundColor: "#34A853" },
													]}
													onPress={() => {
														// Remplir directement les champs du formulaire
														setClientName(selectedReservation.clientName);
														setNbPersonnes(selectedReservation.nbPersonnes);
														setAllergies(selectedReservation.allergies);
														setRestrictions(selectedReservation.restrictions);
														setNotes(selectedReservation.notes);
														setReservationDate(""); // date future à sélectionner
														setReservationTime(""); // heure future à sélectionner

														// Afficher le formulaire
														setNewResaModal(true);
														closeModal(); // fermer la modale des réglages
													}}
												>
													<Text style={styles.buttonTextSettings}>
														♻️ Recréer la réservation
													</Text>
												</TouchableOpacity>
											</>
										)}

										{/* Toujours proposer un bouton fermer */}
										<TouchableOpacity
											style={styles.modalButtonCancel}
											onPress={closeModal}
										>
											<Text style={styles.buttonTextCancel}>Fermer</Text>
										</TouchableOpacity>
									</>
								)}
							</View>
						</TouchableWithoutFeedback>
					</View>
				</TouchableWithoutFeedback>
			</Modal>
			{showAssignTableModal && (
				<Modal
					visible={showAssignTableModal}
					transparent
					animationType="fade"
					onRequestClose={() => setShowAssignTableModal(false)}
				>
					<View style={styles.overlaySettings}>
						{/* Zone clicable pour fermer la modal */}
						<TouchableWithoutFeedback
							onPress={() => setShowAssignTableModal(false)}
						>
							<View style={{ flex: 1 }} />
						</TouchableWithoutFeedback>

						{/* Carte blanche centrée */}
						<View
							style={{
								width: 300,
								padding: 20,
								backgroundColor: "#fff",
								borderRadius: 10,
								position: "absolute",
								top: "50%",
								left: "50%",
								transform: [{ translateX: -150 }, { translateY: -150 / 2 }],
							}}
						>
							<Text style={{ textAlign: "center", marginBottom: 10 }}>
								Choisir une table :
							</Text>

							{/* Conteneur des boutons en grille */}
							<View
								style={{
									flexDirection: "row",
									flexWrap: "wrap",
									justifyContent: "center",
									gap: 10,
								}}
							>
								{tables.map((table) => {
									const isAssignedToCurrent =
										table._id === activeReservation?.tableId;
									const isAvailableForSelection =
										table.isAvailable || isAssignedToCurrent;

									return (
										<TouchableOpacity
											key={table._id}
											onPress={async () => {
												if (!isAvailableForSelection) return;
												await assignTable(activeReservation._id, table._id);
											}}
											disabled={!isAvailableForSelection}
											style={{
												padding: 10,
												backgroundColor: isAssignedToCurrent
													? "#000000" // ⭐ NOIR si assignée à cette résa
													: table.isAvailable
													? "#b3ff00ff" // ⭐ VERT si disponible
													: "#2b10a2ff", // ⭐ ROUGE si occupée par autre résa
												borderRadius: 5,
												width: 60,
												alignItems: "center",
												marginBottom: 10,
												opacity: isAvailableForSelection ? 1 : 0.6, // ⭐ Désaturer si non sélectionnable
											}}
										>
											<Text
												style={{
													color: isAssignedToCurrent ? "#fff" : "#fff", // ⭐ Texte blanc pour meilleur contraste
													fontWeight: isAssignedToCurrent ? "bold" : "normal",
												}}
											>
												{table.number}
											</Text>
										</TouchableOpacity>
									);
								})}
							</View>

							<TouchableOpacity
								onPress={() => setShowAssignTableModal(false)}
								style={{ marginTop: 10 }}
							>
								<Text style={{ color: "black", textAlign: "center" }}>
									Annuler
								</Text>
							</TouchableOpacity>
							<TouchableOpacity
								onPress={() => setShowAssignTableModal(false)}
								style={{ marginTop: 10 }}
							>
								<Text style={{ color: "black", textAlign: "center" }}>Ok</Text>
							</TouchableOpacity>
						</View>
					</View>
				</Modal>
			)}

			<Modal
				visible={newResaModal}
				transparent
				animationType="fade"
				onRequestClose={resetResa}
			>
				<KeyboardAvoidingView
					behavior={Platform.OS === "ios" ? "padding" : "height"}
					style={{ flex: 1 }}
				>
					{/* Overlay */}
					<View style={styles.modalOverlay}>
						{/* Modale */}
						<View style={styles.modalForm}>
							<Text style={styles.modalTitle}>Nouvelle réservation</Text>

							<ScrollView contentContainerStyle={{ paddingVertical: 10 }}>
								{/* Page 1 */}
								{step === 1 && (
									<>
										<Text style={styles.label}>Nom du client</Text>
										<TextInput
											placeholder="Nom complet"
											value={clientName}
											onChangeText={setClientName}
											style={styles.input}
											placeholderTextColor="#555"
										/>

										<Text style={styles.label}>Téléphone</Text>
										<TextInput
											placeholder="Téléphone"
											value={phone}
											onChangeText={setPhone}
											keyboardType="number-pad"
											textContentType="telephoneNumber"
											style={styles.input}
											placeholderTextColor="#555"
										/>

										<View style={styles.buttonRow}>
											<TouchableOpacity
												onPress={resetResa} // ferme la modale
												style={styles.prevButton} // couleur rouge ou autre
											>
												<Text style={styles.buttonText}>❌ Annuler</Text>
											</TouchableOpacity>

											<TouchableOpacity
												onPress={nextStep}
												style={styles.nextButton}
											>
												<Text style={styles.buttonText}>➡️ Suivant</Text>
											</TouchableOpacity>
										</View>
									</>
								)}

								{/* Page 2 */}
								{step === 2 && (
									<>
										<Text style={styles.label}>Date de réservation</Text>
										<DateTimePicker
											mode="date"
											value={
												reservationDate ? new Date(reservationDate) : new Date()
											}
											minimumDate={new Date()}
											onChange={(event, selectedDate) => {
												if (selectedDate) {
													const yyyy = selectedDate.getFullYear();
													const mm = String(
														selectedDate.getMonth() + 1
													).padStart(2, "0");
													const dd = String(selectedDate.getDate()).padStart(
														2,
														"0"
													);
													setReservationDate(`${yyyy}-${mm}-${dd}`);
												}
											}}
										/>

										<Text style={styles.label}>Heure de réservation</Text>
										<DateTimePicker
											mode="time"
											value={
												reservationTime
													? new Date(`1970-01-01T${reservationTime}:00`)
													: new Date()
											}
											is24Hour={true}
											display="compact"
											onChange={(event, selectedTime) => {
												if (selectedTime) {
													let hh = selectedTime.getHours();
													let mm = selectedTime.getMinutes();

													// Arrondir aux 00 ou 30
													mm = mm < 30 ? 0 : 30;

													// Formatage
													const hhStr = String(hh).padStart(2, "0");
													const mmStr = String(mm).padStart(2, "0");

													setReservationTime(`${hhStr}:${mmStr}`);
												}
											}}
										/>
										<Text style={styles.label}>Table</Text>

										<TouchableOpacity
											onPress={() => setShowTablesOptions((prev) => !prev)}
											style={styles.dropdownButton}
										>
											<Text style={styles.dropdownButtonText}>
												{newReservation.tableId
													? tables.find((t) => t._id === newReservation.tableId)
															?.number
													: "Aucune table"}
											</Text>
										</TouchableOpacity>

										{showTablesOptions && (
											<View style={styles.simpleDropdown}>
												<TouchableOpacity
													style={styles.simpleDropdownItem}
													onPress={() => {
														setNewReservation({
															...newReservation,
															tableId: null,
														});
														setShowTablesOptions(false);
													}}
												>
													<Text style={styles.dropdownOptionText}>
														Aucune table
													</Text>
												</TouchableOpacity>

												{tables.map((table) => (
													<TouchableOpacity
														key={table._id}
														style={styles.simpleDropdownItem}
														onPress={() => {
															setNewReservation({
																...newReservation,
																tableId: table._id,
															});
															setShowTablesOptions(false);
														}}
													>
														<Text style={styles.dropdownOptionText}>
															{table.number}
														</Text>
													</TouchableOpacity>
												))}
											</View>
										)}

										<Text style={styles.label}>Allergies</Text>
										<TextInput
											placeholder="Allergies éventuelles"
											value={allergies}
											onChangeText={setAllergies}
											style={styles.input}
											placeholderTextColor="#555"
										/>

										<Text style={styles.label}>Restrictions</Text>
										<TextInput
											placeholder="Restrictions alimentaires"
											value={restrictions}
											onChangeText={setRestrictions}
											style={styles.input}
											placeholderTextColor="#555"
										/>

										<Text style={styles.label}>Observations</Text>
										<TextInput
											placeholder="Observations"
											value={notes}
											onChangeText={setNotes}
											style={styles.input}
											placeholderTextColor="#555"
										/>

										<View style={styles.buttonRow}>
											<TouchableOpacity
												onPress={prevStep}
												style={styles.prevButton}
											>
												<Text style={styles.buttonText}>⬅️ Retour</Text>
											</TouchableOpacity>
											<TouchableOpacity
												onPress={createReservation}
												style={styles.nextButton}
											>
												<Text style={styles.buttonText}>✅ Créer</Text>
											</TouchableOpacity>
										</View>
									</>
								)}
							</ScrollView>
						</View>
					</View>
				</KeyboardAvoidingView>
			</Modal>
		</View>
	);
}
