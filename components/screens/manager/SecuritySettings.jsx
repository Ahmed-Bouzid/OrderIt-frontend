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
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import useThemeStore from "../../../src/stores/useThemeStore";
import { getTheme } from "../../../utils/themeUtils";
import { useAuthFetch } from "../../../hooks/useAuthFetch";

export default function SecuritySettings() {
	const { themeMode } = useThemeStore();
	const THEME = React.useMemo(() => getTheme(themeMode), [themeMode]);
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

	const styles = React.useMemo(() => createStyles(THEME), [THEME]);

	if (loading) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color={THEME.colors.primary.amber} />
			</View>
		);
	}

	return (
		<ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
			{/* ===== SECTION MOT DE PASSE ===== */}
			<View style={styles.section}>
				<View style={styles.sectionHeader}>
					<Ionicons name="key" size={24} color={THEME.colors.primary.amber} />
					<Text style={styles.title}>Mot de passe</Text>
				</View>

				<Text style={styles.description}>
					Modifiez votre mot de passe de connexion pour sécuriser votre compte.
				</Text>

				{!showPasswordForm ? (
					<TouchableOpacity
						style={styles.actionButton}
						onPress={() => setShowPasswordForm(true)}
					>
						<LinearGradient
							colors={[
								THEME.colors.primary.amber,
								THEME.colors.primary.amberDark,
							]}
							style={styles.actionButtonGradient}
						>
							<Ionicons name="lock-closed" size={20} color="#FFFFFF" />
							<Text style={styles.actionButtonText}>
								Modifier mon mot de passe
							</Text>
						</LinearGradient>
					</TouchableOpacity>
				) : (
					<View style={styles.formCard}>
						<View style={styles.formHeader}>
							<Ionicons
								name="key-outline"
								size={22}
								color={THEME.colors.primary.amber}
							/>
							<Text style={styles.formTitle}>Modifier le mot de passe</Text>
						</View>

						<View style={styles.inputGroup}>
							<Text style={styles.inputLabel}>Mot de passe actuel:</Text>
							<View style={styles.inputWrapper}>
								<Ionicons
									name="lock-closed-outline"
									size={18}
									color={THEME.colors.text.muted}
								/>
								<TextInput
									style={styles.input}
									value={passwordData.currentPassword}
									onChangeText={(text) =>
										setPasswordData({ ...passwordData, currentPassword: text })
									}
									secureTextEntry
									placeholder="••••••••"
									placeholderTextColor={THEME.colors.text.muted}
								/>
							</View>
						</View>

						<View style={styles.inputGroup}>
							<Text style={styles.inputLabel}>Nouveau mot de passe:</Text>
							<View style={styles.inputWrapper}>
								<Ionicons
									name="key-outline"
									size={18}
									color={THEME.colors.text.muted}
								/>
								<TextInput
									style={styles.input}
									value={passwordData.newPassword}
									onChangeText={(text) =>
										setPasswordData({ ...passwordData, newPassword: text })
									}
									secureTextEntry
									placeholder="Minimum 6 caractères"
									placeholderTextColor={THEME.colors.text.muted}
								/>
							</View>
						</View>

						<View style={styles.inputGroup}>
							<Text style={styles.inputLabel}>Confirmer:</Text>
							<View style={styles.inputWrapper}>
								<Ionicons
									name="checkmark-circle-outline"
									size={18}
									color={THEME.colors.text.muted}
								/>
								<TextInput
									style={styles.input}
									value={passwordData.confirmPassword}
									onChangeText={(text) =>
										setPasswordData({ ...passwordData, confirmPassword: text })
									}
									secureTextEntry
									placeholder="Confirmer le mot de passe"
									placeholderTextColor={THEME.colors.text.muted}
								/>
							</View>
						</View>

						<View style={styles.formButtons}>
							<TouchableOpacity
								style={styles.cancelButton}
								onPress={() => {
									setShowPasswordForm(false);
									setPasswordData({
										currentPassword: "",
										newPassword: "",
										confirmPassword: "",
									});
								}}
							>
								<Text style={styles.cancelButtonText}>Annuler</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={styles.saveButton}
								onPress={handleChangePassword}
								disabled={savingPassword}
							>
								<LinearGradient
									colors={[
										THEME.colors.primary.amber,
										THEME.colors.primary.amberDark,
									]}
									style={styles.saveButtonGradient}
								>
									{savingPassword ? (
										<ActivityIndicator size="small" color="#fff" />
									) : (
										<Text style={styles.saveButtonText}>Enregistrer</Text>
									)}
								</LinearGradient>
							</TouchableOpacity>
						</View>
					</View>
				)}
			</View>

			{/* ===== SÉPARATEUR ===== */}
			<View style={styles.separator} />

			{/* ===== SECTION PIN ===== */}
			<View style={styles.section}>
				<View style={styles.sectionHeader}>
					<Ionicons
						name="keypad"
						size={24}
						color={THEME.colors.primary.amber}
					/>
					<Text style={styles.title}>PIN Manager</Text>
				</View>

				<Text style={styles.description}>
					Le PIN manager protège les actions sensibles comme la suppression de
					serveurs, les modifications de commandes, etc.
				</Text>

				{/* État actuel du PIN */}
				<View
					style={[
						styles.statusCard,
						hasPin ? styles.statusActive : styles.statusInactive,
					]}
				>
					<View
						style={[
							styles.statusIconContainer,
							{
								backgroundColor: hasPin
									? "rgba(16, 185, 129, 0.15)"
									: "rgba(245, 158, 11, 0.15)",
							},
						]}
					>
						<Ionicons
							name={hasPin ? "lock-closed" : "lock-open"}
							size={24}
							color={
								hasPin
									? THEME.colors.status.success
									: THEME.colors.status.warning
							}
						/>
					</View>
					<View style={styles.statusInfo}>
						<Text style={styles.statusTitle}>
							{hasPin ? "PIN activé" : "PIN non configuré"}
						</Text>
						<Text style={styles.statusSubtitle}>
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
							style={styles.actionButton}
							onPress={() => setShowPinForm(true)}
						>
							<LinearGradient
								colors={[
									THEME.colors.primary.amber,
									THEME.colors.primary.amberDark,
								]}
								style={styles.actionButtonGradient}
							>
								<Ionicons
									name={hasPin ? "create" : "add-circle"}
									size={20}
									color="#FFFFFF"
								/>
								<Text style={styles.actionButtonText}>
									{hasPin ? "Modifier le PIN" : "Créer un PIN"}
								</Text>
							</LinearGradient>
						</TouchableOpacity>

						{hasPin && (
							<TouchableOpacity
								style={styles.dangerActionButton}
								onPress={handleDeletePin}
							>
								<Ionicons
									name="trash"
									size={20}
									color={THEME.colors.status.error}
								/>
								<Text style={styles.dangerActionButtonText}>
									Supprimer le PIN
								</Text>
							</TouchableOpacity>
						)}
					</View>
				) : (
					/* Formulaire PIN */
					<View style={styles.formCard}>
						<View style={styles.formHeader}>
							<Ionicons
								name="keypad-outline"
								size={22}
								color={THEME.colors.primary.amber}
							/>
							<Text style={styles.formTitle}>
								{hasPin ? "Modifier le PIN" : "Créer un nouveau PIN"}
							</Text>
						</View>

						{/* PIN actuel (si modification) */}
						{hasPin && (
							<View style={styles.inputGroup}>
								<Text style={styles.inputLabel}>PIN actuel:</Text>
								<View style={styles.inputWrapper}>
									<Ionicons
										name="keypad-outline"
										size={18}
										color={THEME.colors.text.muted}
									/>
									<TextInput
										style={[styles.input, styles.pinInput]}
										value={currentPin}
										onChangeText={setCurrentPin}
										keyboardType="number-pad"
										secureTextEntry
										maxLength={6}
										placeholder="••••••"
										placeholderTextColor={THEME.colors.text.muted}
									/>
								</View>
							</View>
						)}

						{/* Nouveau PIN */}
						<View style={styles.inputGroup}>
							<Text style={styles.inputLabel}>
								{hasPin ? "Nouveau PIN:" : "PIN (4-6 chiffres):"}
							</Text>
							<View style={styles.inputWrapper}>
								<Ionicons
									name="keypad-outline"
									size={18}
									color={THEME.colors.text.muted}
								/>
								<TextInput
									style={[styles.input, styles.pinInput]}
									value={pin}
									onChangeText={setPin}
									keyboardType="number-pad"
									secureTextEntry
									maxLength={6}
									placeholder="••••••"
									placeholderTextColor={THEME.colors.text.muted}
								/>
							</View>
						</View>

						{/* Confirmation */}
						<View style={styles.inputGroup}>
							<Text style={styles.inputLabel}>Confirmer le PIN:</Text>
							<View style={styles.inputWrapper}>
								<Ionicons
									name="checkmark-circle-outline"
									size={18}
									color={THEME.colors.text.muted}
								/>
								<TextInput
									style={[styles.input, styles.pinInput]}
									value={confirmPin}
									onChangeText={setConfirmPin}
									keyboardType="number-pad"
									secureTextEntry
									maxLength={6}
									placeholder="••••••"
									placeholderTextColor={THEME.colors.text.muted}
								/>
							</View>
						</View>

						{/* Boutons */}
						<View style={styles.formButtons}>
							<TouchableOpacity
								style={styles.cancelButton}
								onPress={() => {
									setShowPinForm(false);
									setPin("");
									setConfirmPin("");
									setCurrentPin("");
								}}
							>
								<Text style={styles.cancelButtonText}>Annuler</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={styles.saveButton}
								onPress={handleSavePin}
							>
								<LinearGradient
									colors={[
										THEME.colors.primary.amber,
										THEME.colors.primary.amberDark,
									]}
									style={styles.saveButtonGradient}
								>
									<Text style={styles.saveButtonText}>Enregistrer</Text>
								</LinearGradient>
							</TouchableOpacity>
						</View>
					</View>
				)}

				{/* Info sur les actions protégées */}
				<View style={styles.infoCard}>
					<View style={styles.infoHeader}>
						<Ionicons
							name="shield-checkmark"
							size={20}
							color={THEME.colors.primary.amber}
						/>
						<Text style={styles.infoTitle}>Actions protégées par le PIN:</Text>
					</View>
					{[
						"Supprimer un serveur",
						"Modifier les prix du menu",
						"Annuler une commande envoyée",
						"Appliquer une remise",
						"Accéder aux statistiques",
					].map((item, index) => (
						<View key={index} style={styles.infoItem}>
							<Ionicons
								name="checkmark"
								size={16}
								color={THEME.colors.status.success}
							/>
							<Text style={styles.infoItemText}>{item}</Text>
						</View>
					))}
				</View>
			</View>
		</ScrollView>
	);
}

// ═══════════════════════════════════════════════════════════════════════
// 🎨 Premium Dark Styles
// ═══════════════════════════════════════════════════════════════════════
const createStyles = (THEME) =>
	StyleSheet.create({
		container: {
			flex: 1,
		},
		loadingContainer: {
			flex: 1,
			justifyContent: "center",
			alignItems: "center",
		},
		section: {
			marginBottom: THEME.spacing.lg,
		},
		sectionHeader: {
			flexDirection: "row",
			alignItems: "center",
			gap: THEME.spacing.sm,
			marginBottom: THEME.spacing.md,
		},
		separator: {
			height: 1,
			backgroundColor: THEME.colors.border.default,
			marginVertical: THEME.spacing.xl,
		},
		title: {
			fontSize: 20,
			fontWeight: "700",
			color: THEME.colors.text.primary,
		},
		description: {
			fontSize: 14,
			lineHeight: 20,
			color: THEME.colors.text.secondary,
			marginBottom: THEME.spacing.xl,
		},
		// Status Card
		statusCard: {
			flexDirection: "row",
			alignItems: "center",
			padding: THEME.spacing.lg,
			backgroundColor: THEME.colors.background.card,
			borderRadius: THEME.radius.lg,
			borderWidth: 1,
			borderColor: THEME.colors.border.default,
			marginBottom: THEME.spacing.xl,
		},
		statusActive: {
			borderLeftWidth: 3,
			borderLeftColor: THEME.colors.status.success,
		},
		statusInactive: {
			borderLeftWidth: 3,
			borderLeftColor: THEME.colors.status.warning,
		},
		statusIconContainer: {
			width: 48,
			height: 48,
			borderRadius: THEME.radius.md,
			justifyContent: "center",
			alignItems: "center",
			marginRight: THEME.spacing.lg,
		},
		statusInfo: {
			flex: 1,
		},
		statusTitle: {
			fontSize: 16,
			fontWeight: "600",
			color: THEME.colors.text.primary,
			marginBottom: THEME.spacing.xs,
		},
		statusSubtitle: {
			fontSize: 13,
			color: THEME.colors.text.muted,
		},
		// Actions
		actionsContainer: {
			gap: THEME.spacing.md,
			marginBottom: THEME.spacing.xl,
		},
		actionButton: {
			borderRadius: THEME.radius.md,
			overflow: "hidden",
		},
		actionButtonGradient: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			paddingVertical: THEME.spacing.lg,
			gap: THEME.spacing.sm,
		},
		actionButtonText: {
			color: "#FFFFFF",
			fontSize: 16,
			fontWeight: "600",
		},
		dangerActionButton: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			paddingVertical: THEME.spacing.lg,
			borderRadius: THEME.radius.md,
			backgroundColor: "rgba(239, 68, 68, 0.1)",
			borderWidth: 1,
			borderColor: "rgba(239, 68, 68, 0.3)",
			gap: THEME.spacing.sm,
		},
		dangerActionButtonText: {
			color: THEME.colors.status.error,
			fontSize: 16,
			fontWeight: "600",
		},
		// Form
		formCard: {
			backgroundColor: THEME.colors.background.card,
			borderRadius: THEME.radius.lg,
			padding: THEME.spacing.xl,
			borderWidth: 1,
			borderColor: THEME.colors.border.default,
			marginBottom: THEME.spacing.xl,
		},
		formHeader: {
			flexDirection: "row",
			alignItems: "center",
			gap: THEME.spacing.md,
			marginBottom: THEME.spacing.xl,
		},
		formTitle: {
			fontSize: 18,
			fontWeight: "600",
			color: THEME.colors.text.primary,
		},
		inputGroup: {
			marginBottom: THEME.spacing.lg,
		},
		inputLabel: {
			fontSize: 13,
			fontWeight: "600",
			color: THEME.colors.text.secondary,
			marginBottom: THEME.spacing.sm,
		},
		inputWrapper: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: THEME.colors.background.elevated,
			borderRadius: THEME.radius.md,
			borderWidth: 1,
			borderColor: THEME.colors.border.default,
			paddingHorizontal: THEME.spacing.md,
		},
		input: {
			flex: 1,
			paddingVertical: THEME.spacing.md,
			paddingHorizontal: THEME.spacing.sm,
			fontSize: 15,
			color: THEME.colors.text.primary,
		},
		pinInput: {
			fontSize: 20,
			letterSpacing: 8,
			textAlign: "center",
		},
		formButtons: {
			flexDirection: "row",
			gap: THEME.spacing.md,
			marginTop: THEME.spacing.lg,
		},
		cancelButton: {
			flex: 1,
			paddingVertical: THEME.spacing.md,
			borderRadius: THEME.radius.md,
			backgroundColor: THEME.colors.background.elevated,
			alignItems: "center",
			borderWidth: 1,
			borderColor: THEME.colors.border.default,
		},
		cancelButtonText: {
			color: THEME.colors.text.secondary,
			fontWeight: "600",
			fontSize: 15,
		},
		saveButton: {
			flex: 1,
			borderRadius: THEME.radius.md,
			overflow: "hidden",
		},
		saveButtonGradient: {
			paddingVertical: THEME.spacing.md,
			alignItems: "center",
		},
		saveButtonText: {
			color: "#FFFFFF",
			fontWeight: "700",
			fontSize: 15,
		},
		// Info Card
		infoCard: {
			backgroundColor: THEME.colors.background.card,
			borderRadius: THEME.radius.lg,
			padding: THEME.spacing.lg,
			borderWidth: 1,
			borderColor: THEME.colors.border.default,
		},
		infoHeader: {
			flexDirection: "row",
			alignItems: "center",
			gap: THEME.spacing.sm,
			marginBottom: THEME.spacing.md,
		},
		infoTitle: {
			fontSize: 14,
			fontWeight: "600",
			color: THEME.colors.text.primary,
		},
		infoItem: {
			flexDirection: "row",
			alignItems: "center",
			gap: THEME.spacing.sm,
			paddingVertical: THEME.spacing.xs,
			marginLeft: THEME.spacing.sm,
		},
		infoItemText: {
			fontSize: 13,
			color: THEME.colors.text.secondary,
		},
	});
