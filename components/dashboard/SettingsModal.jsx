import React from "react";
import {
	Modal,
	View,
	Text,
	TouchableOpacity,
	TouchableWithoutFeedback,
} from "react-native";
import styles from "../styles";
import usePresentStore from "../../src/stores/usePresentStore";

const SettingsModal = React.memo(
	({
		visible,
		onClose,
		reservation,
		theme,
		onTogglePresent,
		onUpdateStatus,
		onCancel,
	}) => {
		if (!reservation || !visible) return null;

		// Nouvelle logique locale pour le statut effectif
		let effectiveStatus = reservation.status || "en attente";
		if (reservation.isPresent && reservation.status === "en attente") {
			effectiveStatus = "present";
		}

		return (
			<Modal
				visible={visible}
				transparent
				animationType="fade"
				onRequestClose={onClose}
			>
				<TouchableWithoutFeedback onPress={() => onClose?.()}>
					<View style={styles.overlaySettings}>
						<TouchableWithoutFeedback onPress={() => {}}>
							<View
								style={[
									styles.modalSettings,
									{ backgroundColor: theme.cardColor },
								]}
							>
								<Text
									style={[
										styles.modalTitleSettings,
										{ color: theme.textColor },
									]}
								>
									Réglages pour {String(reservation?.clientName || "Client")}
								</Text>

								{/* Si en attente → bouton "Marquer présent" */}
								{effectiveStatus === "en attente" && (
									<>
										<TouchableOpacity
											style={[
												styles.modalButtonSettings,
												{ backgroundColor: "#34A853" },
											]}
											onPress={() => onTogglePresent?.(reservation._id)}
										>
											<Text style={styles.buttonTextSettings}>
												✅ Marquer présent
											</Text>
										</TouchableOpacity>
									</>
								)}

								{/* Si présent → boutons "Ouvrir" et "Terminer" */}
								{effectiveStatus === "present" && (
									<>
										<TouchableOpacity
											style={[
												styles.modalButtonSettings,
												{ backgroundColor: "#2196F3" },
											]}
											onPress={() =>
												onUpdateStatus?.(
													reservation._id,
													"ouverte",
													reservation
												)
											}
										>
											<Text style={styles.buttonTextSettings}>
												🍽️ Ouvrir la réservation
											</Text>
										</TouchableOpacity>
										<TouchableOpacity
											style={[
												styles.modalButtonSettings,
												{ backgroundColor: "#34A853" },
											]}
											onPress={() =>
												onUpdateStatus?.(reservation._id, "fermee", reservation)
											}
										>
											<Text style={styles.buttonTextSettings}>
												✅ Terminer la réservation
											</Text>
										</TouchableOpacity>
									</>
								)}

								{/* Si réservation ouverte → boutons Remettre en présent et Terminer */}
								{effectiveStatus === "ouverte" && (
									<>
										<TouchableOpacity
											style={[
												styles.modalButtonSettings,
												{ backgroundColor: "#FFA500" },
											]}
											onPress={() =>
												onUpdateStatus?.(
													reservation._id,
													"present",
													reservation
												)
											}
										>
											<Text style={styles.buttonTextSettings}>
												⏸️ Remettre en présent
											</Text>
										</TouchableOpacity>
										<TouchableOpacity
											style={[
												styles.modalButtonSettings,
												{ backgroundColor: "#34A853" },
											]}
											onPress={() =>
												onUpdateStatus?.(reservation._id, "fermee", reservation)
											}
										>
											<Text style={styles.buttonTextSettings}>
												✅ Terminer la réservation
											</Text>
										</TouchableOpacity>
									</>
								)}
								{/* Si réservation annulée → bouton Rétablir */}
								{effectiveStatus === "annulee" && (
									<TouchableOpacity
										style={[
											styles.modalButtonSettings,
											{ backgroundColor: "#34A853" },
										]}
										onPress={() =>
											onUpdateStatus?.(
												reservation._id,
												"en attente",
												reservation
											)
										}
									>
										<Text style={styles.buttonTextSettings}>
											♻️ Rétablir la réservation
										</Text>
									</TouchableOpacity>
								)}

								{/* Si réservation fermée → message info */}
								{effectiveStatus === "fermee" && (
									<>
										<View style={{ margin: 10 }}>
											<Text
												style={[
													styles.modalTitleSettings,
													{
														fontSize: 14,
														marginBottom: 10,
														color: theme.textColor,
													},
												]}
											>
												Cette réservation est terminée.
											</Text>
										</View>

										<TouchableOpacity
											style={[
												styles.modalButtonSettings,
												{ backgroundColor: "#34A853" },
											]}
											onPress={() => {
												// Rétablir la réservation en "en attente" pour permettre une nouvelle utilisation
												onUpdateStatus?.(
													reservation._id,
													"en attente",
													reservation
												);
											}}
										>
											<Text style={styles.buttonTextSettings}>
												♻️ Recréer la réservation
											</Text>
										</TouchableOpacity>
									</>
								)}

								{/* Annuler (sauf si déjà fermée ou annulée) */}
								{effectiveStatus !== "fermee" &&
									effectiveStatus !== "annulee" && (
										<TouchableOpacity
											style={[
												styles.modalButtonSettings,
												{ backgroundColor: "#EA4335" },
											]}
											onPress={() => onCancel(reservation._id)}
										>
											<Text style={styles.buttonTextSettings}>
												❌ Annuler la réservation
											</Text>
										</TouchableOpacity>
									)}
								<TouchableOpacity
									style={[
										styles.modalButtonSettings,
										{ backgroundColor: "#666" },
									]}
									onPress={() => onClose?.()}
								>
									<Text style={styles.buttonTextSettings}>🔙 Fermer</Text>
								</TouchableOpacity>
							</View>
						</TouchableWithoutFeedback>
					</View>
				</TouchableWithoutFeedback>
			</Modal>
		);
	}
);

SettingsModal.displayName = "SettingsModal";

export default SettingsModal;
