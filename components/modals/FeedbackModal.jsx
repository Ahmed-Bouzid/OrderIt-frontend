import React, { useState, useEffect } from "react";
import {
	View,
	Text,
	Modal,
	TouchableOpacity,
	TextInput,
	StyleSheet,
	ScrollView,
	Switch,
	Alert,
	ActivityIndicator,
	Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import ErrorLogger from "../../utils/ErrorLogger";
import { useTheme } from "../../hooks/useTheme";

const CATEGORIES = [
	{ id: "Bug technique", icon: "bug-outline", label: "Bug technique" },
	{
		id: "Problème d'affichage",
		icon: "eye-off-outline",
		label: "Problème d'affichage",
	},
	{
		id: "Problème de performance",
		icon: "speedometer-outline",
		label: "Problème de performance",
	},
	{
		id: "Suggestion d'amélioration",
		icon: "bulb-outline",
		label: "Suggestion d'amélioration",
	},
	{ id: "Autre", icon: "ellipsis-horizontal-outline", label: "Autre" },
];

export default function FeedbackModal({
	visible,
	onClose,
	onSubmit,
	userContext,
}) {
	const THEME = useTheme();
	const [category, setCategory] = useState("");
	const [message, setMessage] = useState("");
	const [includeLogs, setIncludeLogs] = useState(false);
	const [recentError, setRecentError] = useState(null);
	const [showErrorPrompt, setShowErrorPrompt] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);

	// Vérifier s'il y a une erreur récente au montage
	useEffect(() => {
		if (visible) {
			checkForRecentError();
		}
	}, [visible]);

	const checkForRecentError = async () => {
		try {
			const hasError = await ErrorLogger.hasRecentError();
			if (hasError) {
				const error = await ErrorLogger.getRecentError();
				setRecentError(error);
				setShowErrorPrompt(true);
			}
		} catch (error) {
			console.error(
				"[FeedbackModal] Erreur lors de la vérification des erreurs récentes:",
				error
			);
		}
	};

	const handleAcceptError = () => {
		setIncludeLogs(true);
		setShowErrorPrompt(false);
		if (!category) {
			setCategory("Bug technique");
		}
	};

	const handleDeclineError = async () => {
		setShowErrorPrompt(false);
		setRecentError(null);
		// Effacer l'erreur récente
		if (recentError) {
			await ErrorLogger.clearErrorByTimestamp(recentError.timestamp);
		}
	};

	const validateForm = () => {
		if (!category) {
			Alert.alert("Catégorie requise", "Veuillez sélectionner une catégorie.");
			return false;
		}

		if (!message || message.trim().length < 20) {
			Alert.alert(
				"Message trop court",
				"Veuillez décrire le problème avec au moins 20 caractères."
			);
			return false;
		}

		if (message.trim().length > 500) {
			Alert.alert(
				"Message trop long",
				"Veuillez limiter votre message à 500 caractères maximum."
			);
			return false;
		}

		return true;
	};

	const handleSubmit = async () => {
		if (!validateForm()) return;

		setIsSubmitting(true);

		try {
			const feedbackData = {
				category,
				message: message.trim(),
				includeLogs,
				logs: includeLogs && recentError ? recentError : null,
				userContext,
			};

			await onSubmit(feedbackData);

			// Effacer l'erreur si elle a été incluse
			if (includeLogs && recentError) {
				await ErrorLogger.clearErrorByTimestamp(recentError.timestamp);
			}

			// Réinitialiser le formulaire
			resetForm();
			onClose();
		} catch (error) {
			console.error(
				"[FeedbackModal] Erreur lors de l'envoi du feedback:",
				error
			);
			Alert.alert(
				"Erreur",
				"Impossible d'envoyer le feedback. Réessayez plus tard."
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	const resetForm = () => {
		setCategory("");
		setMessage("");
		setIncludeLogs(false);
		setRecentError(null);
		setShowErrorPrompt(false);
	};

	const handleClose = () => {
		resetForm();
		onClose();
	};

	const formatErrorTime = (timestamp) => {
		const date = new Date(timestamp);
		return date.toLocaleTimeString("fr-FR", {
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	return (
		<Modal
			visible={visible}
			transparent
			animationType="fade"
			onRequestClose={handleClose}
		>
			<TouchableOpacity
				activeOpacity={1}
				style={styles.overlay}
				onPress={handleClose}
			>
				<BlurView intensity={60} style={styles.blurOverlay}>
					<View style={styles.darkOverlay} />
				</BlurView>
				<TouchableOpacity
					activeOpacity={1}
					style={styles.modalContainer}
					onPress={(e) => e.stopPropagation()}
				>
					<LinearGradient
						colors={[
							THEME.colors.background.primary,
							THEME.colors.background.secondary,
						]}
						style={styles.modalContent}
					>
						{/* Header */}
						<View style={styles.header}>
							<View style={styles.headerIcon}>
								<Ionicons
									name="chatbox-outline"
									size={24}
									color={THEME.colors.primary.amber}
								/>
							</View>
							<Text
								style={[styles.title, { color: THEME.colors.text.primary }]}
							>
								Envoyer un feedback
							</Text>
							<TouchableOpacity
								onPress={handleClose}
								style={styles.closeButton}
							>
								<Ionicons
									name="close"
									size={24}
									color={THEME.colors.text.tertiary}
								/>
							</TouchableOpacity>
						</View>

						<ScrollView showsVerticalScrollIndicator={false}>
							{/* Description */}
							<Text
								style={[
									styles.description,
									{ color: THEME.colors.text.secondary },
								]}
							>
								Aidez-nous à améliorer OrderIt en partageant votre expérience ou
								un problème rencontré.
							</Text>

							{/* Prompt erreur récente */}
							{showErrorPrompt && recentError && (
								<View
									style={[
										styles.errorPrompt,
										{ backgroundColor: THEME.colors.background.tertiary },
									]}
								>
									<Ionicons name="warning-outline" size={20} color="#DC2626" />
									<View style={styles.errorPromptText}>
										<Text
											style={[
												styles.errorPromptTitle,
												{ color: THEME.colors.text.primary },
											]}
										>
											Une erreur a été détectée
										</Text>
										<Text
											style={[
												styles.errorPromptDesc,
												{ color: THEME.colors.text.secondary },
											]}
										>
											À {formatErrorTime(recentError.timestamp)}. Voulez-vous
											l&apos;ajouter à votre feedback ?
										</Text>
									</View>
									<View style={styles.errorPromptButtons}>
										<TouchableOpacity
											onPress={handleAcceptError}
											style={[
												styles.errorPromptButton,
												styles.errorPromptAccept,
											]}
										>
											<Text style={styles.errorPromptAcceptText}>Oui</Text>
										</TouchableOpacity>
										<TouchableOpacity
											onPress={handleDeclineError}
											style={[
												styles.errorPromptButton,
												styles.errorPromptDecline,
											]}
										>
											<Text
												style={[
													styles.errorPromptDeclineText,
													{ color: THEME.colors.text.tertiary },
												]}
											>
												Non
											</Text>
										</TouchableOpacity>
									</View>
								</View>
							)}

							{/* Catégories */}
							<Text
								style={[styles.label, { color: THEME.colors.text.primary }]}
							>
								Catégorie *
							</Text>
							<View style={styles.categoriesGrid}>
								{CATEGORIES.map((cat) => (
									<TouchableOpacity
										key={cat.id}
										style={[
											styles.categoryButton,
											{
												backgroundColor:
													category === cat.id
														? THEME.colors.primary.amber
														: THEME.colors.background.tertiary,
												borderColor:
													category === cat.id
														? THEME.colors.primary.amber
														: THEME.colors.border.subtle,
											},
										]}
										onPress={() => setCategory(cat.id)}
									>
										<Ionicons
											name={cat.icon}
											size={20}
											color={
												category === cat.id
													? "#000"
													: THEME.colors.text.secondary
											}
										/>
										<Text
											style={[
												styles.categoryText,
												{
													color:
														category === cat.id
															? "#000"
															: THEME.colors.text.secondary,
												},
											]}
											numberOfLines={2}
										>
											{cat.label}
										</Text>
									</TouchableOpacity>
								))}
							</View>

							{/* Message */}
							<Text
								style={[styles.label, { color: THEME.colors.text.primary }]}
							>
								Votre message * ({message.length}/500)
							</Text>
							<TextInput
								style={[
									styles.textInput,
									{
										backgroundColor: THEME.colors.background.tertiary,
										color: THEME.colors.text.primary,
										borderColor: THEME.colors.border.subtle,
									},
								]}
								placeholder="Décrivez ce qui s'est passé..."
								placeholderTextColor={THEME.colors.text.tertiary}
								value={message}
								onChangeText={setMessage}
								multiline
								maxLength={500}
								textAlignVertical="top"
							/>

							{/* Switch logs */}
							<View style={styles.switchContainer}>
								<View style={styles.switchLeft}>
									<Ionicons
										name="code-slash-outline"
										size={20}
										color={THEME.colors.text.secondary}
									/>
									<Text
										style={[
											styles.switchLabel,
											{ color: THEME.colors.text.primary },
										]}
									>
										Inclure les informations techniques
									</Text>
								</View>
								<Switch
									value={includeLogs}
									onValueChange={setIncludeLogs}
									trackColor={{
										false: THEME.colors.border.subtle,
										true: THEME.colors.primary.amber,
									}}
									thumbColor="#FFF"
								/>
							</View>
							<Text
								style={[
									styles.switchHint,
									{ color: THEME.colors.text.secondary },
								]}
							>
								Logs anonymisés pour faciliter l&apos;analyse
							</Text>

							{/* Boutons */}
							<View style={styles.buttonContainer}>
								<TouchableOpacity
									style={[
										styles.button,
										styles.cancelButton,
										{ borderColor: THEME.colors.border.subtle },
									]}
									onPress={handleClose}
									disabled={isSubmitting}
								>
									<Text
										style={[
											styles.cancelButtonText,
											{ color: THEME.colors.text.secondary },
										]}
									>
										Annuler
									</Text>
								</TouchableOpacity>

								<TouchableOpacity
									style={[
										styles.button,
										styles.submitButton,
										{ opacity: isSubmitting ? 0.6 : 1 },
									]}
									onPress={handleSubmit}
									disabled={isSubmitting}
								>
									{isSubmitting ? (
										<ActivityIndicator size="small" color="#000" />
									) : (
										<>
											<Ionicons name="send" size={18} color="#000" />
											<Text style={styles.submitButtonText}>Envoyer</Text>
										</>
									)}
								</TouchableOpacity>
							</View>
						</ScrollView>
					</LinearGradient>
				</TouchableOpacity>
			</TouchableOpacity>
		</Modal>
	);
}

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: 20,
	},
	blurOverlay: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
	},
	darkOverlay: {
		flex: 1,
		backgroundColor: "rgba(0, 0, 0, 0.75)",
	},
	modalContainer: {
		width: "100%",
		maxWidth: 600,
		maxHeight: "90%",
		borderRadius: 16,
		overflow: "hidden",
		...Platform.select({
			ios: {
				shadowColor: "#000",
				shadowOffset: { width: 0, height: 10 },
				shadowOpacity: 0.5,
				shadowRadius: 30,
			},
			android: {
				elevation: 15,
			},
		}),
	},
	modalContent: {
		padding: 24,
		backgroundColor: "rgba(28, 28, 30, 0.98)",
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 16,
	},
	headerIcon: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: "rgba(217, 119, 6, 0.1)",
		justifyContent: "center",
		alignItems: "center",
		marginRight: 12,
	},
	title: {
		fontSize: 20,
		fontWeight: "bold",
		flex: 1,
	},
	closeButton: {
		padding: 4,
	},
	description: {
		fontSize: 14,
		lineHeight: 20,
		marginBottom: 20,
	},
	errorPrompt: {
		flexDirection: "column",
		padding: 16,
		borderRadius: 12,
		marginBottom: 20,
		gap: 12,
	},
	errorPromptText: {
		flex: 1,
	},
	errorPromptTitle: {
		fontSize: 14,
		fontWeight: "600",
		marginBottom: 4,
	},
	errorPromptDesc: {
		fontSize: 13,
	},
	errorPromptButtons: {
		flexDirection: "row",
		gap: 8,
	},
	errorPromptButton: {
		paddingVertical: 8,
		paddingHorizontal: 16,
		borderRadius: 8,
		flex: 1,
		alignItems: "center",
	},
	errorPromptAccept: {
		backgroundColor: "#D97706",
	},
	errorPromptDecline: {
		backgroundColor: "transparent",
		borderWidth: 1,
		borderColor: "#3C3C3E",
	},
	errorPromptAcceptText: {
		color: "#000",
		fontWeight: "600",
		fontSize: 14,
	},
	errorPromptDeclineText: {
		fontWeight: "600",
		fontSize: 14,
	},
	label: {
		fontSize: 14,
		fontWeight: "600",
		marginBottom: 12,
	},
	categoriesGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 10,
		marginBottom: 24,
	},
	categoryButton: {
		flex: 1,
		minWidth: "45%",
		paddingVertical: 12,
		paddingHorizontal: 12,
		borderRadius: 10,
		borderWidth: 1,
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	categoryText: {
		fontSize: 13,
		fontWeight: "500",
		flex: 1,
	},
	textInput: {
		height: 120,
		borderRadius: 10,
		borderWidth: 1,
		padding: 12,
		fontSize: 14,
		marginBottom: 20,
	},
	switchContainer: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 8,
	},
	switchLeft: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		flex: 1,
	},
	switchLabel: {
		fontSize: 14,
		fontWeight: "500",
	},
	switchHint: {
		fontSize: 12,
		marginBottom: 24,
	},
	buttonContainer: {
		flexDirection: "row",
		gap: 12,
		marginTop: 8,
	},
	button: {
		flex: 1,
		paddingVertical: 14,
		borderRadius: 10,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 6,
	},
	cancelButton: {
		backgroundColor: "transparent",
		borderWidth: 1,
	},
	cancelButtonText: {
		fontSize: 16,
		fontWeight: "600",
	},
	submitButton: {
		backgroundColor: "#D97706",
	},
	submitButtonText: {
		color: "#000",
		fontSize: 16,
		fontWeight: "600",
	},
});
