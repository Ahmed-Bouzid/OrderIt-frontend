import React, { useState, useEffect } from "react";
import styles from "./styles"; // adapte le chemin si tu l'as mis dans un sous-dossier
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import useReservationStore from "../src/stores/useReservationStore";
import DraggableButton from "../components/ui/draggableButton";
// import { getToken } from "../app/utils/token";

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
function SwipeableReservationCard({ reservation, onSettingsPress }) {
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
			</View>
		</View>
	);
}

export default function Dashboard(navigation) {
	const { reservations, fetchReservations } = useReservationStore();

	//recupere toutes les reservations
	useEffect(() => {
		if (!reservations.length) {
			fetchReservations();
		}
		//fetchReservations vient d’un store stable.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [reservations]);

	//USESTATES
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
	const [restaurantId, setRestaurantId] = useState(null); // met l'ID réel
	const [reservationDate, setReservationDate] = useState(""); // format "YYYY-MM-DD"
	const [reservationFilter, setReservationFilter] = useState("actives"); // "actives" ou "annulees"
	const [tables, setTables] = useState([]);
	const [showTablesOptions, setShowTablesOptions] = useState(false);
	const [selectedTable, setSelectedTable] = useState(null);

	const [newReservation, setNewReservation] = useState({
		clientName: "",
		nbPersonnes: 1,
		allergies: "",
		restrictions: "",
		notes: "",
		reservationDate: null,
		reservationTime: null,
		tableId: null, // 👈 nouveau
	});

	//cree une reservation
	const createReservation = async () => {
		const reservationData = {
			...newReservation,
			tableId: selectedTable ? selectedTable._id : null,
		};
		try {
			const token = await AsyncStorage.getItem("token");
			if (!token) return alert("Pas de token, rediriger vers login");

			let isoDate;
			try {
				const [hours, minutes] = reservationTime.split(":");
				const today = new Date(reservationDate || new Date());
				today.setHours(parseInt(hours), parseInt(minutes), 0, 0);
				isoDate = today.toISOString();
			} catch {
				Alert.alert(
					"Erreur",
					"La date ou l'heure choisie n'est pas valide. Veuillez vérifier vos saisies.",
					[{ text: "OK" }]
				);
				return; // stop la création
			}

			const body = {
				clientName,
				phone,
				nbPersonnes,
				allergies,
				restrictions,
				notes,
				restaurantId,
				reservationDate: isoDate,
				reservationTime,
			};

			const response = await fetch("http://192.168.1.165:3000/reservations", {
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

	//changer pages modale
	const nextStep = () => setStep((s) => s + 1);
	const prevStep = () => setStep((s) => Math.max(1, s - 1));
	//reset la modale
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

	//ouvre la modale reglages
	const openSettings = (reservation) => {
		setSelectedReservation(reservation);
		setModalVisible(true);
	};
	//ferme la modale reglages
	const closeModal = () => {
		setModalVisible(false);
		setSelectedReservation(null);
	};

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

	// Toggle Présent / Absent
	const togglePresent = async (id) => {
		try {
			const token = await AsyncStorage.getItem("token");
			if (!token) {
				alert("Pas de token, rediriger vers login");
				return false;
			}

			const response = await fetch(
				`http://192.168.1.165:3000/reservations/${id}/togglePresent`,
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
			fetchReservations(); // rafraîchir la liste
			return true;
		} catch (err) {
			console.error(err);
			alert("Erreur de connexion");
			return false;
		}
	};

	// Mettre à jour le statut (en attente, annulé, fermee, ouverte)
	const updateStatus = async (id, newStatus) => {
		try {
			const token = await AsyncStorage.getItem("token");
			if (!token) return alert("Pas de token, rediriger vers login");

			// Normaliser le statut avant envoi
			const normalizedStatus = newStatus.toLowerCase(); // "annulee", "en attente", "fermee", "ouverte"

			const response = await fetch(
				`http://192.168.1.165:3000/reservations/${id}/status`,
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
			fetchReservations(); // rafraîchir la liste
			return true;
		} catch (err) {
			console.error(err);
			alert("Erreur de connexion");
			return false;
		}
	};

	useEffect(() => {
		const fetchTables = async () => {
			const token = await AsyncStorage.getItem("token");
			const restaurantId = await AsyncStorage.getItem("restaurantId");
			const res = await fetch(
				`http://192.168.1.165:3000/tables/restaurant/${restaurantId}`,
				{
					headers: { Authorization: `Bearer ${token}` },
				}
			);
			const data = await res.json();
			setTables(data);
		};
		fetchTables();
	}, []);

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
			</TouchableOpacity> */}

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
											minimumDate={new Date()} // Empêche de sélectionner une date antérieure à aujourd'hui
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
