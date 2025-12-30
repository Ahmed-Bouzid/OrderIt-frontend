// components/elements/ActivityModals/SettingsModal.jsx
import React from "react";
import {
	View,
	Text,
	TouchableOpacity,
	Modal,
	Alert,
	TouchableWithoutFeedback,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import styles from "../../styles";

export const SettingsModal = ({
	visible,
	onClose,
	activeReservation,
	onFinishReservation,
	onTogglePresent,
	onUpdateStatus,
	onCancel,
	theme,
}) => {
	// ⭐ Guard clause
	if (!visible) return null;

	const safeOnClose = onClose || (() => {});

	const handleUpdateStatus = async (reservationId, newStatus) => {
		if (!reservationId || !onUpdateStatus) return;
		await onUpdateStatus(reservationId, newStatus);
		safeOnClose();
	};

	const handleTogglePresence = async () => {
		if (!activeReservation?._id || !onTogglePresent) return;
		await onTogglePresent(activeReservation._id);
		safeOnClose();
	};

	const handleFinish = () => {
		console.log("🔘 [SettingsModal] handleFinish appelé");
		console.log(
			"🔘 [SettingsModal] activeReservation:",
			activeReservation?._id?.slice(-6),
			"status:",
			activeReservation?.status
		);

		if (!activeReservation?._id || !onFinishReservation) {
			console.error(
				"❌ [SettingsModal] Pas de reservationId ou onFinishReservation"
			);
			return;
		}
		Alert.alert(
			"Confirmation",
			"Êtes-vous sûr de vouloir terminer cette réservation ?",
			[
				{ text: "Non", style: "cancel" },
				{
					text: "Oui",
					onPress: async () => {
						console.log(
							"🔘 [SettingsModal] Confirmation OK, appel onFinishReservation..."
						);
						safeOnClose();
						await onFinishReservation(activeReservation._id);
						console.log("🔘 [SettingsModal] onFinishReservation terminé");
					},
				},
			]
		);
	};

	const handleCancelReservation = async () => {
		if (!activeReservation?._id || !onCancel) return;
		Alert.alert(
			"Confirmation",
			"Êtes-vous sûr de vouloir annuler cette réservation ?",
			[
				{ text: "Non", style: "cancel" },
				{
					text: "Oui",
					onPress: async () => {
						await onCancel(activeReservation._id);
						safeOnClose();
					},
				},
			]
		);
	};

	const status = activeReservation?.status || "";

	return (
		<Modal
			visible={visible}
			transparent
			animationType="fade"
			onRequestClose={safeOnClose}
		>
			<TouchableWithoutFeedback onPress={safeOnClose}>
				<View
					style={[
						styles.overlaySettings,
						{ backgroundColor: "rgba(20,20,40,0.85)" },
					]}
				>
					<TouchableWithoutFeedback onPress={() => {}}>
						<BlurView
							intensity={40}
							tint="dark"
							style={{ borderRadius: 24, overflow: "hidden" }}
						>
							<LinearGradient
								colors={["#23243a", "#302b63", "#764ba2"]}
								start={{ x: 0, y: 0 }}
								end={{ x: 1, y: 1 }}
								style={{ borderRadius: 24, padding: 0 }}
							>
								<View
									style={[
										styles.modalSettings,
										{
											backgroundColor: "rgba(30,30,60,0.85)",
											borderRadius: 24,
										},
									]}
								>
									<Text style={[styles.modalTitleSettings, { color: "#fff" }]}>
										Options de réservation
									</Text>

									{/* Si réservation en attente */}
									{status === "en attente" && (
										<>
											{/* Présent / Absent toggle */}
											{!activeReservation?.isPresent ? (
												<TouchableOpacity
													style={[
														styles.modalButtonSettings,
														{ backgroundColor: "#38ef7d" },
													]}
													onPress={handleTogglePresence}
												>
													<Text
														style={[
															styles.buttonTextSettings,
															{ color: "#fff" },
														]}
													>
														✅ Mettre présent
													</Text>
												</TouchableOpacity>
											) : (
												<TouchableOpacity
													style={[
														styles.modalButtonSettings,
														{ backgroundColor: "#f2994a" },
													]}
													onPress={handleTogglePresence}
												>
													<Text
														style={[
															styles.buttonTextSettings,
															{ color: "#fff" },
														]}
													>
														⚠️ Mettre absent
													</Text>
												</TouchableOpacity>
											)}
											{/* Ouvrir la réservation si présent */}
											{activeReservation?.isPresent && (
												<TouchableOpacity
													style={[
														styles.modalButtonSettings,
														{ backgroundColor: "#4facfe" },
													]}
													onPress={() =>
														handleUpdateStatus(
															activeReservation?._id,
															"ouverte"
														)
													}
												>
													<Text
														style={[
															styles.buttonTextSettings,
															{ color: "#fff" },
														]}
													>
														🍽️ Ouvrir la réservation
													</Text>
												</TouchableOpacity>
											)}
											{/* Terminer si présent */}
											{activeReservation?.isPresent && (
												<TouchableOpacity
													style={[
														styles.modalButtonSettings,
														{ backgroundColor: "#38ef7d" },
													]}
													onPress={handleFinish}
												>
													<Text
														style={[
															styles.buttonTextSettings,
															{ color: "#fff" },
														]}
													>
														✅ Terminer la réservation
													</Text>
												</TouchableOpacity>
											)}
										</>
									)}

									{/* Si réservation ouverte */}
									{status === "ouverte" && (
										<>
											{/* Remettre en attente */}
											<TouchableOpacity
												style={[
													styles.modalButtonSettings,
													{ backgroundColor: "#f2994a" },
												]}
												onPress={() =>
													handleUpdateStatus(
														activeReservation?._id,
														"en attente"
													)
												}
											>
												<Text
													style={[styles.buttonTextSettings, { color: "#fff" }]}
												>
													⏸️ Mettre en attente
												</Text>
											</TouchableOpacity>
											{/* Terminer */}
											<TouchableOpacity
												style={[
													styles.modalButtonSettings,
													{ backgroundColor: "#38ef7d" },
												]}
												onPress={handleFinish}
											>
												<Text
													style={[styles.buttonTextSettings, { color: "#fff" }]}
												>
													✅ Terminer la réservation
												</Text>
											</TouchableOpacity>
										</>
									)}

									{/* Si réservation annulée */}
									{status === "annulée" && (
										<TouchableOpacity
											style={[
												styles.modalButtonSettings,
												{ backgroundColor: "#38ef7d" },
											]}
											onPress={() =>
												handleUpdateStatus(activeReservation?._id, "en attente")
											}
										>
											<Text
												style={[styles.buttonTextSettings, { color: "#fff" }]}
											>
												♻️ Rétablir la réservation
											</Text>
										</TouchableOpacity>
									)}

									{/* Si réservation terminée */}
									{status === "terminée" && (
										<View style={{ margin: 10 }}>
											<Text
												style={[
													styles.modalTitleSettings,
													{ fontSize: 14, marginBottom: 10, color: "#fff" },
												]}
											>
												Cette réservation est terminée.
											</Text>
										</View>
									)}

									{/* Annuler (sauf si terminée ou annulée) */}
									{status !== "terminée" && status !== "annulée" && (
										<TouchableOpacity
											style={[
												styles.modalButtonSettings,
												{ backgroundColor: "#ff416c" },
											]}
											onPress={handleCancelReservation}
										>
											<Text
												style={[styles.buttonTextSettings, { color: "#fff" }]}
											>
												❌ Annuler la réservation
											</Text>
										</TouchableOpacity>
									)}

									<TouchableOpacity
										style={[
											styles.modalButtonCancel,
											{ backgroundColor: "#764ba2" },
										]}
										onPress={safeOnClose}
									>
										<Text style={[styles.buttonTextCancel, { color: "#fff" }]}>
											Fermer
										</Text>
									</TouchableOpacity>
								</View>
							</LinearGradient>
						</BlurView>
					</TouchableWithoutFeedback>
				</View>
			</TouchableWithoutFeedback>
		</Modal>
	);
};

SettingsModal.displayName = "SettingsModal";
