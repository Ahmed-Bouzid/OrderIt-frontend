import React from "react";
import {
	View,
	Text,
	TouchableOpacity,
	Modal,
	TouchableWithoutFeedback,
	Alert,
} from "react-native";
import styles from "../styles";

export default function SettingsModal({
	showSettings,
	setShowSettings,
	activeReservation,
	setOpenedReservations,
	setActiveId,
	markReservationAsFinished,
}) {
	return (
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
														const updated = await markReservationAsFinished(
															activeReservation._id
														);
														if (updated) {
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
	);
}
