import React, { useState, useEffect } from "react";
import styles from "./styles"; // adapte le chemin si tu l'as mis dans un sous-dossier
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
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
// import {
// 	GestureHandlerRootView,
// 	PanGestureHandler,
// } from "react-native-gesture-handler";
// import Animated, {
// 	useSharedValue,
// 	useAnimatedStyle,
// 	useAnimatedGestureHandler,
// 	withSpring,
// 	withDecay,
// 	runOnJS,
// } from "react-native-reanimated";

const SCREEN_WIDTH = Dimensions.get("window").width;
// eslint-disable-next-line no-unused-vars
const THRESHOLD = SCREEN_WIDTH * 0.2;

// Carte individuelle swipeable avec roue de réglages
function SwipeableReservationCard({ reservation, onSettingsPress }) {
	return (
		<View style={[styles.card, { flexDirection: "row", width: "100%" }]}>
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
				<Text style={styles.subText}>
					Serveur : {reservation.server || "-"}
				</Text>
				<Text style={styles.subText}>
					Paiement : {reservation.paymentMethod || "-"}
				</Text>
				<Text style={styles.subText}>
					Montant :{" "}
					{reservation.totalAmount ? `${reservation.totalAmount}€` : "-"}
				</Text>
				<Text style={styles.subText}>
					Statut : {reservation.dishStatus || "-"}
				</Text>
				<TouchableOpacity onPress={() => onSettingsPress(reservation)}>
					<Text style={{ fontSize: 20, marginTop: 4 }}>⚙️</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
}

export default function Dashboard() {
	const fetchReservations = async () => {
		try {
			const token = await AsyncStorage.getItem("token");
			if (!token) return alert("Pas de token, rediriger vers login");

			const response = await fetch(`http://192.168.1.122:3000/reservations`, {
				headers: { Authorization: `Bearer ${token}` },
			});

			if (!response.ok) {
				console.error("Erreur fetch réservations", response.status);
				return;
			}

			const data = await response.json();
			setReservations(data); // stocke toutes les réservations récupérées
		} catch (err) {
			console.error("Erreur récupération réservations:", err);
		}
	};
	const [modalVisible, setModalVisible] = useState(false);
	const [selectedReservation, setSelectedReservation] = useState(null);
	const [newResaModal, setNewResaModal] = useState(false);
	const [step, setStep] = useState(1);
	const [clientName, setClientName] = useState(""); // Nom du client
	const [phone, setPhone] = useState(""); // Numéro de téléphone
	const [reservationTime, setReservationTime] = useState(""); // Heure de la réservation
	const [nbPersonnes, setNbPersonnes] = useState(1); // Nombre de personnes (par défaut 1)
	const [allergies, setAllergies] = useState(""); // Allergies
	const [restrictions, setRestrictions] = useState(""); // Restrictions alimentaires
	const [notes, setNotes] = useState(""); // Observations de la réservation
	// eslint-disable-next-line no-unused-vars
	const [restaurantId, setRestaurantId] = useState("686af511bb4cba684ff3b72e"); // met l'ID réel
	const [reservationDate, setReservationDate] = useState(""); // format "YYYY-MM-DD"
	const [reservations, setReservations] = useState([]);
	const [reservationFilter, setReservationFilter] = useState("actives"); // "actives" ou "annulees"

	const createReservation = async () => {
		try {
			const token = await AsyncStorage.getItem("token");
			console.log("Token:", token);
			if (!token) return alert("Pas de token, rediriger vers login");

			const [hours, minutes] = reservationTime.split(":");
			const today = new Date(); // ou la date choisie par le client
			today.setHours(parseInt(hours), parseInt(minutes), 0, 0); // heures et minutes
			const isoDate = today.toISOString();

			const body = {
				clientName,
				phone,
				nbPersonnes,
				allergies,
				restrictions,
				notes,
				restaurantId,
				reservationDate: isoDate, // ✅ Mongoose accepte ça comme Date
				reservationTime, // optionnel
			};

			const response = await fetch("http://192.168.1.122:3000/reservations", {
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
				alert("Erreur serveur: réponse inattendue");
				return;
			}

			if (!response.ok) {
				console.error(data);
				alert("Erreur: " + (data.message || "Vérifie les champs"));
				return;
			}

			console.log("Réservation créée:", data);
			alert("Réservation créée avec succès !");
			resetResa();
			fetchReservations();
		} catch (err) {
			console.error(err);
			alert("Impossible de créer la réservation, vérifie ta connexion.");
		}
	};
	console.log("reservationTime:", reservationTime);
	const deleteReservation = async (id) => {
		try {
			const token = await AsyncStorage.getItem("token");
			if (!token) {
				alert("Pas de token, rediriger vers login");
				return false;
			}

			const response = await fetch(
				`http://192.168.1.122:3000/reservations/${id}`,
				{
					method: "DELETE",
					headers: {
						Authorization: `Bearer ${token}`,
					},
				}
			);

			const data = await response.json();

			if (!response.ok) {
				alert("Erreur: " + (data.message || "Impossible de supprimer"));
				return false;
			}

			alert("Réservation supprimée ✅");
			fetchReservations();
			return true; // ✅ succès
		} catch (err) {
			console.error(err);
			alert("Erreur de connexion");
			return false;
		}
	};
	const cancelReservation = async (reservation) => {
		// Si reservation est un objet, prends son _id
		const reservationId = reservation._id ? reservation._id : reservation;
		console.log("ID utilisé :", reservationId);

		try {
			const token = await AsyncStorage.getItem("token");
			if (!token) {
				alert("Pas de token, rediriger vers login");
				return false;
			}

			const response = await fetch(
				`http://192.168.1.122:3000/reservations/${reservationId}/cancel`,
				{
					method: "PUT",
					headers: { Authorization: `Bearer ${token}` },
				}
			);

			const data = await response.json();

			if (!response.ok) {
				alert("Erreur: " + (data.message || "Impossible de modifier"));
				return false;
			}

			alert("Réservation annulée ✅");
			fetchReservations();
			return true;
		} catch (err) {
			console.error(err);
			alert("Erreur de connexion");
			return false;
		}
	};

	const toggleReservationStatus = async (reservation) => {
		const reservationId = reservation._id ? reservation._id : reservation;
		console.log("ID utilisé :", reservationId);

		try {
			const token = await AsyncStorage.getItem("token");
			if (!token) {
				alert("Pas de token, rediriger vers login");
				return false;
			}

			const response = await fetch(
				`http://192.168.1.122:3000/reservations/${reservationId}/toggle`,
				{
					method: "PUT",
					headers: { Authorization: `Bearer ${token}` },
				}
			);

			const data = await response.json();

			if (!response.ok) {
				alert("Erreur: " + (data.message || "Impossible de modifier"));
				return false;
			}

			alert(
				`Réservation mise à jour : ${
					data.dishStatus === "Annulé" ? "Annulée ✅" : "En attente ♻️"
				}`
			);

			fetchReservations(); // recharge la liste
			return true;
		} catch (err) {
			console.error(err);
			alert("Erreur de connexion");
			return false;
		}
	};

	const nextStep = () => setStep((s) => s + 1);
	const prevStep = () => setStep((s) => Math.max(1, s - 1));
	const resetResa = () => {
		// Fermer la modale
		setNewResaModal(false);
		// Réinitialiser tous les champs du formulaire
		setClientName("");
		setPhone("");
		setReservationTime("");
		setAllergies("");
		setRestrictions("");
		setNotes("");
		setNbPersonnes(1);
		setReservationDate("");
		setStep(1);
	};
	const openSettings = (reservation) => {
		setSelectedReservation(reservation);
		setModalVisible(true);
	};
	const closeModal = () => {
		setModalVisible(false);
		setSelectedReservation(null);
	};
	const handleAction = (action) => {
		if (!selectedReservation) return;
		if (action === "terminer") selectedReservation.status = "fermée";
		if (action === "annuler") selectedReservation.status = "annulée";
		closeModal();
	};

	useEffect(() => {
		fetchReservations();
	}, []);

	return (
		<View style={{ flex: 1 }}>
			<View style={{ flexDirection: "row", marginVertical: 10 }}>
				<TouchableOpacity
					style={{
						backgroundColor:
							reservationFilter === "actives" ? "#4285F4" : "#ccc",
						padding: 10,
						borderRadius: 5,
						marginRight: 5,
					}}
					onPress={() => setReservationFilter("actives")}
				>
					<Text style={{ color: "#fff" }}>Actives</Text>
				</TouchableOpacity>

				<TouchableOpacity
					style={{
						backgroundColor:
							reservationFilter === "annulees" ? "#EA4335" : "#ccc",
						padding: 10,
						borderRadius: 5,
					}}
					onPress={() => setReservationFilter("annulees")}
				>
					<Text style={{ color: "#fff" }}>Annulées</Text>
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
						{reservations
							.filter((res) => {
								if (reservationFilter === "actives")
									return res.dishStatus !== "Annulé";
								if (reservationFilter === "annulees")
									return res.dishStatus === "Annulé";
								return true; // au cas où d'autres filtres viendront
							})
							.map((res) => (
								<SwipeableReservationCard
									key={res._id}
									reservation={res}
									onSettingsPress={openSettings}
								/>
							))}
					</ScrollView>
				</ScrollView>
			</ScrollView>
			<TouchableOpacity
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

								{selectedReservation?.dishStatus !== "Annulé" ? (
									<>
										{/* Réservation active */}
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
															onPress: () => handleAction("terminer"),
														},
													]
												)
											}
										>
											<Text style={styles.buttonTextSettings}>
												✅ Terminer la réservation
											</Text>
										</TouchableOpacity>

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
															onPress: async () => {
																const success = await toggleReservationStatus(
																	selectedReservation._id
																);
																if (success) closeModal();
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
									</>
								) : (
									<>
										{/* Réservation annulée */}
										<TouchableOpacity
											style={[
												styles.modalButtonSettings,
												{ backgroundColor: "#34A853" },
											]}
											onPress={() =>
												Alert.alert(
													"Confirmation",
													"Rétablir cette réservation ?",
													[
														{ text: "Non", style: "cancel" },
														{
															text: "Oui",
															onPress: async () => {
																const success = await toggleReservationStatus(
																	selectedReservation._id
																);
																if (success) closeModal();
															},
														},
													]
												)
											}
										>
											<Text style={styles.buttonTextSettings}>
												♻️ Rétablir la réservation
											</Text>
										</TouchableOpacity>

										<TouchableOpacity
											style={[
												styles.modalButtonSettings,
												{ backgroundColor: "#EA4335" },
											]}
											onPress={() =>
												Alert.alert(
													"Confirmation",
													"Supprimer définitivement cette réservation ?",
													[
														{ text: "Non", style: "cancel" },
														{
															text: "Oui",
															onPress: async () => {
																const success = await deleteReservation(
																	selectedReservation._id
																);
																if (success) closeModal();
															},
														},
													]
												)
											}
										>
											<Text style={styles.buttonTextSettings}>
												🗑 Supprimer la réservation
											</Text>
										</TouchableOpacity>
									</>
								)}

								<TouchableOpacity
									style={styles.modalButtonCancel}
									onPress={closeModal}
								>
									<Text style={styles.buttonTextCancel}>Fermer</Text>
								</TouchableOpacity>
							</View>
						</TouchableWithoutFeedback>
					</View>
				</TouchableWithoutFeedback>
			</Modal>

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
