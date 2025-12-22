import React, { useState, useCallback } from "react";
import {
	Modal,
	View,
	Text,
	TouchableOpacity,
	TextInput,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import styles from "../styles";

const NewReservationModal = React.memo(
	({ visible, onClose, onCreate, tables, theme }) => {
		const [step, setStep] = useState(1);
		const [clientName, setClientName] = useState("");
		const [phone, setPhone] = useState("");
		const [reservationTime, setReservationTime] = useState("");
		const [reservationDate, setReservationDate] = useState("");
		const [nbPersonnes, setNbPersonnes] = useState(1);
		const [allergies, setAllergies] = useState("");
		const [restrictions, setRestrictions] = useState("");
		const [notes, setNotes] = useState("");
		const [selectedTableId, setSelectedTableId] = useState(null);
		const [showTablesOptions, setShowTablesOptions] = useState(false);

		const resetForm = useCallback(() => {
			setStep(1);
			setClientName("");
			setPhone("");
			setReservationTime("");
			setReservationDate("");
			setNbPersonnes(1);
			setAllergies("");
			setRestrictions("");
			setNotes("");
			setSelectedTableId(null);
			setShowTablesOptions(false);
		}, []);

		const handleClose = useCallback(() => {
			resetForm();
			onClose?.();
		}, [resetForm, onClose]);

		const handleCreate = useCallback(async () => {
			// Validation des champs obligatoires
			if (
				!clientName.trim() ||
				!phone.trim() ||
				!reservationDate ||
				!reservationTime
			) {
				alert("Veuillez remplir tous les champs obligatoires");
				return;
			}

			// S'assurer que nbPersonnes est un nombre valide
			const finalNbPersonnes =
				typeof nbPersonnes === "number"
					? nbPersonnes
					: parseInt(nbPersonnes) || 1;

			try {
				const success = await onCreate({
					clientName: clientName.trim(),
					phone: phone.trim(),
					reservationTime,
					reservationDate,
					nbPersonnes: finalNbPersonnes,
					allergies: allergies.trim(),
					restrictions: restrictions.trim(),
					notes: notes.trim(),
					tableId: selectedTableId,
				});

				if (success) {
					resetForm();
					onClose?.();
				}
			} catch (error) {
				console.error("Erreur lors de la création de la réservation:", error);
				alert("Une erreur est survenue lors de la création de la réservation");
			}
		}, [
			clientName,
			phone,
			reservationDate,
			reservationTime,
			nbPersonnes,
			allergies,
			restrictions,
			notes,
			selectedTableId,
			onCreate,
			resetForm,
			onClose,
		]);

		const nextStep = useCallback(() => {
			// Validation des champs de l'étape 1
			if (
				!clientName.trim() ||
				!phone.trim() ||
				!nbPersonnes ||
				nbPersonnes < 1
			) {
				alert(
					"Veuillez remplir correctement tous les champs avant de continuer"
				);
				return;
			}
			setStep(2);
		}, [clientName, phone, nbPersonnes]);

		const prevStep = useCallback(() => setStep(1), []);

		return (
			<Modal
				visible={visible}
				transparent
				animationType="fade"
				onRequestClose={handleClose}
			>
				<KeyboardAvoidingView
					behavior={Platform.OS === "ios" ? "padding" : "height"}
					style={{ flex: 1 }}
				>
					<View
						style={[
							styles.modalOverlay,
							{ backgroundColor: theme.backgroundColor },
						]}
					>
						<View
							style={[styles.modalForm, { backgroundColor: theme.cardColor }]}
						>
							<Text style={[styles.modalTitle, { color: theme.textColor }]}>
								Nouvelle réservation
							</Text>

							<ScrollView>
								{/* Page 1 */}
								{step === 1 && (
									<>
										<Text style={styles.label}>Nom du client *</Text>
										<TextInput
											placeholder="Nom complet"
											value={clientName}
											onChangeText={setClientName}
											style={styles.input}
											placeholderTextColor="#555"
										/>

										<Text style={styles.label}>Téléphone *</Text>
										<TextInput
											placeholder="Téléphone"
											value={phone}
											onChangeText={setPhone}
											keyboardType="phone-pad"
											textContentType="telephoneNumber"
											style={styles.input}
											placeholderTextColor="#555"
										/>

										<Text style={styles.label}>Nombre de personnes *</Text>
										<TextInput
											placeholder="Nombre de personnes"
											value={String(nbPersonnes)}
											onChangeText={(text) => {
												if (text === "") {
													setNbPersonnes("");
												} else {
													const num = parseInt(text);
													setNbPersonnes(isNaN(num) ? 1 : Math.max(1, num));
												}
											}}
											onBlur={() => {
												if (nbPersonnes === "" || nbPersonnes < 1) {
													setNbPersonnes(1);
												}
											}}
											keyboardType="number-pad"
											style={styles.input}
											placeholderTextColor="#555"
										/>

										<View style={styles.buttonRow}>
											<TouchableOpacity
												onPress={handleClose}
												style={styles.prevButton}
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
										<Text style={styles.label}>Date de réservation *</Text>
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

										<Text style={styles.label}>Heure de réservation *</Text>
										<DateTimePicker
											mode="time"
											value={
												reservationTime
													? new Date(`1970-01-01T${reservationTime}:00`)
													: (() => {
															// Si date = aujourd'hui, heure min = maintenant + 15min
															const isToday = reservationDate
																? new Date(reservationDate).toDateString() ===
																  new Date().toDateString()
																: true;

															if (isToday) {
																const now = new Date();
																now.setMinutes(now.getMinutes() + 15);
																return now;
															}
															// Sinon, heure par défaut = 12:00
															return new Date(1970, 0, 1, 12, 0);
													  })()
											}
											is24Hour={true}
											display="compact"
											minimumDate={
												// Heure minimum uniquement si date = aujourd'hui
												reservationDate &&
												new Date(reservationDate).toDateString() ===
													new Date().toDateString()
													? (() => {
															const now = new Date();
															now.setMinutes(now.getMinutes() + 15);
															return now;
													  })()
													: undefined
											}
											onChange={(event, selectedTime) => {
												if (selectedTime) {
													let hh = selectedTime.getHours();
													let mm = selectedTime.getMinutes();

													// Arrondir aux 00 ou 30
													mm = mm < 30 ? 0 : 30;
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
												{selectedTableId
													? tables.find((t) => t._id === selectedTableId)
															?.number
													: "Aucune table"}
											</Text>
										</TouchableOpacity>

										{showTablesOptions && (
											<View style={styles.simpleDropdown}>
												<TouchableOpacity
													style={styles.simpleDropdownItem}
													onPress={() => {
														setSelectedTableId(null);
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
															setSelectedTableId(table._id);
															setShowTablesOptions(false);
														}}
													>
														<Text style={styles.dropdownOptionText}>
															{table.number || "?"}
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
											multiline
										/>

										<Text style={styles.label}>Restrictions</Text>
										<TextInput
											placeholder="Restrictions alimentaires"
											value={restrictions}
											onChangeText={setRestrictions}
											style={styles.input}
											placeholderTextColor="#555"
											multiline
										/>

										<Text style={styles.label}>Observations</Text>
										<TextInput
											placeholder="Observations"
											value={notes}
											onChangeText={setNotes}
											style={styles.input}
											placeholderTextColor="#555"
											multiline
										/>

										<View style={styles.buttonRow}>
											<TouchableOpacity
												onPress={prevStep}
												style={styles.prevButton}
											>
												<Text style={styles.buttonText}>⬅️ Retour</Text>
											</TouchableOpacity>
											<TouchableOpacity
												onPress={handleCreate}
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
		);
	}
);

NewReservationModal.displayName = "NewReservationModal";

export default NewReservationModal;
