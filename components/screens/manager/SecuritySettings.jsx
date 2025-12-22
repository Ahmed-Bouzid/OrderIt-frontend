// components/screens/manager/SecuritySettings.jsx
import React, { useState, useEffect } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	TextInput,
	Alert,
	StyleSheet,
	ActivityIndicator,
	ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import useThemeStore from "../../../src/stores/useThemeStore";
import { useAuthFetch } from "../../../hooks/useAuthFetch";

export default function SecuritySettings() {
	const { theme, isDarkMode } = useThemeStore();
	const authFetch = useAuthFetch();

	const [hasPin, setHasPin] = useState(false);
	const [loading, setLoading] = useState(true);
	const [showPinForm, setShowPinForm] = useState(false);
	const [pin, setPin] = useState("");
	const [confirmPin, setConfirmPin] = useState("");
	const [currentPin, setCurrentPin] = useState("");

	// États pour le mot de passe
	const [showPasswordForm, setShowPasswordForm] = useState(false);
	const [passwordData, setPasswordData] = useState({
		currentPassword: "",
		newPassword: "",
		confirmPassword: "",
	});
	const [savingPassword, setSavingPassword] = useState(false);

	// Vérifier si un PIN existe déjà
	useEffect(() => {
		checkExistingPin();
	}, []);

	const checkExistingPin = async () => {
		try {
			// Pour l'instant, on stocke en local (à migrer vers backend plus tard)
			const savedPin = await AsyncStorage.getItem("managerPin");
			setHasPin(!!savedPin);
		} catch (error) {
			console.error("❌ Erreur vérification PIN:", error);
		} finally {
			setLoading(false);
		}
	};

	// Créer ou modifier le PIN
	const handleSavePin = async () => {
		// Validation
		if (pin.length < 4 || pin.length > 6) {
			Alert.alert("Erreur", "Le PIN doit contenir entre 4 et 6 chiffres");
			return;
		}

		if (!/^\d+$/.test(pin)) {
			Alert.alert("Erreur", "Le PIN ne doit contenir que des chiffres");
			return;
		}

		if (pin !== confirmPin) {
			Alert.alert("Erreur", "Les PINs ne correspondent pas");
			return;
		}

		// Si modification, vérifier l'ancien PIN
		if (hasPin) {
			const savedPin = await AsyncStorage.getItem("managerPin");
			if (currentPin !== savedPin) {
				Alert.alert("Erreur", "PIN actuel incorrect");
				return;
			}
		}

		try {
			// Stocker le PIN (hashé côté backend dans une version future)
			await AsyncStorage.setItem("managerPin", pin);

			Alert.alert(
				"Succès",
				hasPin ? "PIN modifié avec succès" : "PIN créé avec succès"
			);

			// Reset form
			setPin("");
			setConfirmPin("");
			setCurrentPin("");
			setShowPinForm(false);
			setHasPin(true);
		} catch (error) {
			console.error("❌ Erreur sauvegarde PIN:", error);
			Alert.alert("Erreur", "Impossible de sauvegarder le PIN");
		}
	};

	// Supprimer le PIN
	const handleDeletePin = () => {
		Alert.alert(
			"Supprimer le PIN",
			"Êtes-vous sûr de vouloir supprimer le PIN manager ? Les actions sensibles ne seront plus protégées.",
			[
				{ text: "Annuler", style: "cancel" },
				{
					text: "Supprimer",
					style: "destructive",
					onPress: async () => {
						try {
							await AsyncStorage.removeItem("managerPin");
							setHasPin(false);
							Alert.alert("Succès", "PIN supprimé");
						} catch (error) {
							console.error("❌ Erreur suppression PIN:", error);
							Alert.alert("Erreur", "Impossible de supprimer le PIN");
						}
					},
				},
			]
		);
	};

	// Modifier le mot de passe
	const handleChangePassword = async () => {
		const { currentPassword, newPassword, confirmPassword } = passwordData;

		// Validations
		if (!currentPassword || !newPassword || !confirmPassword) {
			Alert.alert("Erreur", "Tous les champs sont requis");
			return;
		}

		if (newPassword.length < 6) {
			Alert.alert(
				"Erreur",
				"Le nouveau mot de passe doit contenir au moins 6 caractères"
			);
			return;
		}

		if (newPassword !== confirmPassword) {
			Alert.alert("Erreur", "Les mots de passe ne correspondent pas");
			return;
		}

		if (currentPassword === newPassword) {
			Alert.alert(
				"Erreur",
				"Le nouveau mot de passe doit être différent de l'ancien"
			);
			return;
		}

		setSavingPassword(true);
		try {
			await authFetch("/auth/change-password", {
				method: "POST",
				body: JSON.stringify({
					currentPassword,
					newPassword,
				}),
			});

			Alert.alert("Succès", "Mot de passe modifié avec succès");
			setPasswordData({
				currentPassword: "",
				newPassword: "",
				confirmPassword: "",
			});
			setShowPasswordForm(false);
		} catch (error) {
			console.error("❌ Erreur changement mot de passe:", error);
			Alert.alert(
				"Erreur",
				error.message || "Impossible de modifier le mot de passe"
			);
		} finally {
			setSavingPassword(false);
		}
	};

	if (loading) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color="#007AFF" />
			</View>
		);
	}

	return (
		<ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
			{/* ===== SECTION MOT DE PASSE ===== */}
			<View style={styles.section}>
				<Text style={[styles.title, { color: theme.textColor }]}>
					🔑 Mot de passe
				</Text>

				<Text
					style={[styles.description, { color: theme.textColor, opacity: 0.7 }]}
				>
					Modifiez votre mot de passe de connexion pour sécuriser votre compte.
				</Text>

				{!showPasswordForm ? (
					<TouchableOpacity
						style={[styles.actionButton, styles.primaryButton]}
						onPress={() => setShowPasswordForm(true)}
					>
						<Text style={styles.primaryButtonText}>
							🔐 Modifier mon mot de passe
						</Text>
					</TouchableOpacity>
				) : (
					<View
						style={[
							styles.pinForm,
							{ backgroundColor: isDarkMode ? "#1C1C1E" : "#F5F5F5" },
						]}
					>
						<Text style={[styles.formTitle, { color: theme.textColor }]}>
							Modifier le mot de passe
						</Text>

						<View style={styles.inputGroup}>
							<Text style={[styles.inputLabel, { color: theme.textColor }]}>
								Mot de passe actuel:
							</Text>
							<TextInput
								style={[
									styles.passwordInput,
									{ color: theme.textColor, borderColor: theme.separatorColor },
								]}
								value={passwordData.currentPassword}
								onChangeText={(text) =>
									setPasswordData({ ...passwordData, currentPassword: text })
								}
								secureTextEntry
								placeholder="••••••••"
								placeholderTextColor={theme.textColor + "50"}
							/>
						</View>

						<View style={styles.inputGroup}>
							<Text style={[styles.inputLabel, { color: theme.textColor }]}>
								Nouveau mot de passe:
							</Text>
							<TextInput
								style={[
									styles.passwordInput,
									{ color: theme.textColor, borderColor: theme.separatorColor },
								]}
								value={passwordData.newPassword}
								onChangeText={(text) =>
									setPasswordData({ ...passwordData, newPassword: text })
								}
								secureTextEntry
								placeholder="Minimum 6 caractères"
								placeholderTextColor={theme.textColor + "50"}
							/>
						</View>

						<View style={styles.inputGroup}>
							<Text style={[styles.inputLabel, { color: theme.textColor }]}>
								Confirmer le nouveau mot de passe:
							</Text>
							<TextInput
								style={[
									styles.passwordInput,
									{ color: theme.textColor, borderColor: theme.separatorColor },
								]}
								value={passwordData.confirmPassword}
								onChangeText={(text) =>
									setPasswordData({ ...passwordData, confirmPassword: text })
								}
								secureTextEntry
								placeholder="Confirmer le mot de passe"
								placeholderTextColor={theme.textColor + "50"}
							/>
						</View>

						<View style={styles.formButtons}>
							<TouchableOpacity
								style={[styles.formButton, styles.cancelFormButton]}
								onPress={() => {
									setShowPasswordForm(false);
									setPasswordData({
										currentPassword: "",
										newPassword: "",
										confirmPassword: "",
									});
								}}
							>
								<Text style={styles.cancelFormButtonText}>Annuler</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[styles.formButton, styles.saveFormButton]}
								onPress={handleChangePassword}
								disabled={savingPassword}
							>
								{savingPassword ? (
									<ActivityIndicator size="small" color="#fff" />
								) : (
									<Text style={styles.saveFormButtonText}>Enregistrer</Text>
								)}
							</TouchableOpacity>
						</View>
					</View>
				)}
			</View>

			{/* ===== SÉPARATEUR ===== */}
			<View
				style={[styles.separator, { backgroundColor: theme.separatorColor }]}
			/>

			{/* ===== SECTION PIN ===== */}
			<View style={styles.section}>
				<Text style={[styles.title, { color: theme.textColor }]}>
					🔐 PIN Manager
				</Text>

				<Text
					style={[styles.description, { color: theme.textColor, opacity: 0.7 }]}
				>
					Le PIN manager protège les actions sensibles comme la suppression de
					serveurs, les modifications de commandes, etc.
				</Text>

				{/* État actuel du PIN */}
				<View
					style={[
						styles.statusCard,
						{ backgroundColor: theme.cardBackground },
						hasPin ? styles.statusActive : styles.statusInactive,
					]}
				>
					<Text style={[styles.statusIcon]}>{hasPin ? "🔒" : "🔓"}</Text>
					<View style={styles.statusInfo}>
						<Text style={[styles.statusTitle, { color: theme.textColor }]}>
							{hasPin ? "PIN activé" : "PIN non configuré"}
						</Text>
						<Text
							style={[
								styles.statusSubtitle,
								{ color: theme.textColor, opacity: 0.6 },
							]}
						>
							{hasPin
								? "Les actions sensibles sont protégées"
								: "Les actions sensibles ne sont pas protégées"}
						</Text>
					</View>
				</View>

				{/* Boutons d'action */}
				{!showPinForm ? (
					<View style={styles.actionsContainer}>
						<TouchableOpacity
							style={[styles.actionButton, styles.primaryButton]}
							onPress={() => setShowPinForm(true)}
						>
							<Text style={styles.primaryButtonText}>
								{hasPin ? "🔑 Modifier le PIN" : "➕ Créer un PIN"}
							</Text>
						</TouchableOpacity>

						{hasPin && (
							<TouchableOpacity
								style={[styles.actionButton, styles.dangerButton]}
								onPress={handleDeletePin}
							>
								<Text style={styles.dangerButtonText}>🗑️ Supprimer le PIN</Text>
							</TouchableOpacity>
						)}
					</View>
				) : (
					/* Formulaire PIN */
					<View
						style={[styles.pinForm, { backgroundColor: theme.cardBackground }]}
					>
						<Text style={[styles.formTitle, { color: theme.textColor }]}>
							{hasPin ? "Modifier le PIN" : "Créer un nouveau PIN"}
						</Text>

						{/* PIN actuel (si modification) */}
						{hasPin && (
							<View style={styles.inputGroup}>
								<Text style={[styles.inputLabel, { color: theme.textColor }]}>
									PIN actuel:
								</Text>
								<TextInput
									style={[
										styles.pinInput,
										{
											color: theme.textColor,
											borderColor: theme.separatorColor,
										},
									]}
									value={currentPin}
									onChangeText={setCurrentPin}
									keyboardType="number-pad"
									secureTextEntry
									maxLength={6}
									placeholder="••••••"
									placeholderTextColor={theme.textColor + "50"}
								/>
							</View>
						)}

						{/* Nouveau PIN */}
						<View style={styles.inputGroup}>
							<Text style={[styles.inputLabel, { color: theme.textColor }]}>
								{hasPin ? "Nouveau PIN:" : "PIN (4-6 chiffres):"}
							</Text>
							<TextInput
								style={[
									styles.pinInput,
									{ color: theme.textColor, borderColor: theme.separatorColor },
								]}
								value={pin}
								onChangeText={setPin}
								keyboardType="number-pad"
								secureTextEntry
								maxLength={6}
								placeholder="••••••"
								placeholderTextColor={theme.textColor + "50"}
							/>
						</View>

						{/* Confirmation */}
						<View style={styles.inputGroup}>
							<Text style={[styles.inputLabel, { color: theme.textColor }]}>
								Confirmer le PIN:
							</Text>
							<TextInput
								style={[
									styles.pinInput,
									{ color: theme.textColor, borderColor: theme.separatorColor },
								]}
								value={confirmPin}
								onChangeText={setConfirmPin}
								keyboardType="number-pad"
								secureTextEntry
								maxLength={6}
								placeholder="••••••"
								placeholderTextColor={theme.textColor + "50"}
							/>
						</View>

						{/* Boutons */}
						<View style={styles.formButtons}>
							<TouchableOpacity
								style={[styles.formButton, styles.cancelFormButton]}
								onPress={() => {
									setShowPinForm(false);
									setPin("");
									setConfirmPin("");
									setCurrentPin("");
								}}
							>
								<Text style={styles.cancelFormButtonText}>Annuler</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[styles.formButton, styles.saveFormButton]}
								onPress={handleSavePin}
							>
								<Text style={styles.saveFormButtonText}>Enregistrer</Text>
							</TouchableOpacity>
						</View>
					</View>
				)}

				{/* Info sur les actions protégées */}
				<View
					style={[styles.infoCard, { backgroundColor: theme.cardBackground }]}
				>
					<Text style={[styles.infoTitle, { color: theme.textColor }]}>
						📋 Actions protégées par le PIN:
					</Text>
					<Text
						style={[styles.infoItem, { color: theme.textColor, opacity: 0.7 }]}
					>
						• Supprimer un serveur
					</Text>
					<Text
						style={[styles.infoItem, { color: theme.textColor, opacity: 0.7 }]}
					>
						• Modifier les prix du menu
					</Text>
					<Text
						style={[styles.infoItem, { color: theme.textColor, opacity: 0.7 }]}
					>
						• Annuler une commande envoyée
					</Text>
					<Text
						style={[styles.infoItem, { color: theme.textColor, opacity: 0.7 }]}
					>
						• Appliquer une remise
					</Text>
					<Text
						style={[styles.infoItem, { color: theme.textColor, opacity: 0.7 }]}
					>
						• Accéder aux statistiques
					</Text>
				</View>
			</View>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	section: {
		marginBottom: 10,
	},
	separator: {
		height: 1,
		marginVertical: 20,
	},
	title: {
		fontSize: 20,
		fontWeight: "bold",
		marginBottom: 10,
	},
	passwordInput: {
		borderWidth: 1,
		borderRadius: 8,
		padding: 15,
		fontSize: 16,
	},
	description: {
		fontSize: 14,
		lineHeight: 20,
		marginBottom: 20,
	},
	statusCard: {
		flexDirection: "row",
		alignItems: "center",
		padding: 15,
		borderRadius: 12,
		marginBottom: 20,
		borderLeftWidth: 4,
	},
	statusActive: {
		borderLeftColor: "#4CAF50",
	},
	statusInactive: {
		borderLeftColor: "#FF9800",
	},
	statusIcon: {
		fontSize: 30,
		marginRight: 15,
	},
	statusInfo: {
		flex: 1,
	},
	statusTitle: {
		fontSize: 16,
		fontWeight: "600",
	},
	statusSubtitle: {
		fontSize: 12,
		marginTop: 2,
	},
	actionsContainer: {
		gap: 10,
		marginBottom: 20,
	},
	actionButton: {
		padding: 15,
		borderRadius: 10,
		alignItems: "center",
	},
	primaryButton: {
		backgroundColor: "#4CAF50",
	},
	dangerButton: {
		backgroundColor: "#f44336",
	},
	primaryButtonText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "600",
	},
	dangerButtonText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "600",
	},
	pinForm: {
		padding: 20,
		borderRadius: 12,
		marginBottom: 20,
	},
	formTitle: {
		fontSize: 18,
		fontWeight: "600",
		marginBottom: 20,
		textAlign: "center",
	},
	inputGroup: {
		marginBottom: 15,
	},
	inputLabel: {
		fontSize: 14,
		fontWeight: "500",
		marginBottom: 8,
	},
	pinInput: {
		borderWidth: 1,
		borderRadius: 8,
		padding: 15,
		fontSize: 24,
		textAlign: "center",
		letterSpacing: 10,
	},
	formButtons: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginTop: 20,
	},
	formButton: {
		flex: 1,
		padding: 12,
		borderRadius: 8,
		alignItems: "center",
	},
	cancelFormButton: {
		backgroundColor: "#9E9E9E",
		marginRight: 10,
	},
	saveFormButton: {
		backgroundColor: "#4CAF50",
		marginLeft: 10,
	},
	cancelFormButtonText: {
		color: "#fff",
		fontWeight: "600",
	},
	saveFormButtonText: {
		color: "#fff",
		fontWeight: "600",
	},
	infoCard: {
		padding: 15,
		borderRadius: 12,
	},
	infoTitle: {
		fontSize: 14,
		fontWeight: "600",
		marginBottom: 10,
	},
	infoItem: {
		fontSize: 13,
		marginBottom: 5,
		paddingLeft: 10,
	},
});
