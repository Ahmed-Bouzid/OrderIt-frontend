/**
 * Settings.jsx - Écran Réglages Premium
 * Design spatial cohérent avec le reste de l'application
 * Support Mode Clair / Mode Sombre / Mode Ocean
 */
import React, { useEffect, useState, useMemo } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	Alert,
	StyleSheet,
	ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import useThemeStore, {
	THEME_MODES,
	FONT_SIZES,
} from "../../src/stores/useThemeStore";
import { useTheme } from "../../hooks/useTheme";
import useUserStore from "../../src/stores/useUserStore";
import useDeveloperStore from "../../src/stores/useDeveloperStore";
import { clearAllUserData } from "../../utils/storageHelper";
import {
	ServerManagement,
	MenuManagement,
	SecuritySettings,
	TableManagement,
} from "./manager";
import FeedbackModal from "../modals/FeedbackModal";
import feedbackService from "../../services/feedbackService";

export default function Settings() {
	const router = useRouter();
	const { themeMode, initTheme, setThemeMode, fontSize, setFontSize } =
		useThemeStore();
	const {
		isManager,
		email,
		role,
		userType,
		init: initUser,
		clear: logoutUser,
	} = useUserStore();
	const { isDeveloper, selectedRestaurant } = useDeveloperStore();

	// État pour la section active du menu
	const [activeSection, setActiveSection] = useState("account");

	// État pour la modale feedback
	const [showFeedbackModal, setShowFeedbackModal] = useState(false);

	// ⭐ Utiliser useTheme() pour avoir le thème complet avec typography scalée
	const THEME = useTheme();

	// ⭐ Styles dynamiques selon le thème
	const settingsStyles = useMemo(() => createStyles(THEME), [THEME]);

	// Vérifier si l'utilisateur est manager ou admin
	// isManager est un booléen calculé dans le store (role === 'admin' || userType === 'admin')
	const canAccessManagerPortal =
		isManager || role === "admin" || userType === "admin";

	// Initialiser le thème et l'utilisateur au montage
	useEffect(() => {
		initTheme();
		initUser();
	}, [initTheme, initUser]);

	const handleLogout = async () => {
		Alert.alert("Déconnexion", "Es-tu sûr de vouloir te déconnecter ?", [
			{
				text: "Annuler",
				onPress: () => {},
				style: "cancel",
			},
			{
				text: "Déconnecter",
				onPress: async () => {
					try {
					// ⭐ Nettoyage centralisé
					await clearAllUserData();

						// 🧭 Redirection vers la connexion
						router.replace("/login");
					} catch (error) {
						console.error("❌ Erreur lors de la déconnexion:", error);
						Alert.alert("Erreur", "Impossible de se déconnecter");
					}
				},
				style: "destructive",
			},
		]);
	};

	const handleFeedbackSubmit = async (feedbackData) => {
		try {
			await feedbackService.sendFeedback(feedbackData);
			Alert.alert(
				"Merci !",
				"Votre feedback a bien été envoyé à l'équipe OrderIt.",
				[{ text: "OK" }]
			);
		} catch (error) {
			console.error("[Settings] Erreur envoi feedback:", error);
			Alert.alert(
				"Erreur",
				"Impossible d'envoyer le feedback. Réessayez plus tard.",
				[{ text: "OK" }]
			);
		}
	};

	// Rendu de la section active
	const renderActiveSection = () => {
		switch (activeSection) {
			case "appearance":
				return (
					<>
						<Text style={settingsStyles.sectionHeaderText}>Apparence</Text>

						{/* Sélecteur de thème */}
						<View style={settingsStyles.themeSection}>
							<View style={settingsStyles.themeLabelRow}>
								<Ionicons
									name="color-palette-outline"
									size={24}
									color={THEME.colors.primary.amber}
								/>
								<View style={{ flex: 1, marginLeft: THEME.spacing.lg }}>
									<Text style={settingsStyles.settingLabel}>Thème</Text>
									<Text style={settingsStyles.settingDescription}>
										Choisissez l&apos;apparence de l&apos;application
									</Text>
								</View>
							</View>

							{/* Boutons de sélection du thème */}
							<View style={settingsStyles.themeSelector}>
								{/* Dark Mode */}
								<TouchableOpacity
									style={[
										settingsStyles.themeOption,
										themeMode === THEME_MODES.DARK &&
											settingsStyles.themeOptionActive,
									]}
									onPress={() => setThemeMode(THEME_MODES.DARK)}
								>
									<View
										style={[
											settingsStyles.themePreview,
											{ backgroundColor: "#0C0F17" },
										]}
									>
										<Ionicons name="moon" size={20} color="#F59E0B" />
									</View>
									<Text
										style={[
											settingsStyles.themeOptionLabel,
											themeMode === THEME_MODES.DARK &&
												settingsStyles.themeOptionLabelActive,
										]}
									>
										Sombre
									</Text>
								</TouchableOpacity>

								{/* Light Mode */}
								<TouchableOpacity
									style={[
										settingsStyles.themeOption,
										themeMode === THEME_MODES.LIGHT &&
											settingsStyles.themeOptionActive,
									]}
									onPress={() => setThemeMode(THEME_MODES.LIGHT)}
								>
									<View
										style={[
											settingsStyles.themePreview,
											{ backgroundColor: "#F8FAFC" },
										]}
									>
										<Ionicons name="sunny" size={20} color="#D97706" />
									</View>
									<Text
										style={[
											settingsStyles.themeOptionLabel,
											themeMode === THEME_MODES.LIGHT &&
												settingsStyles.themeOptionLabelActive,
										]}
									>
										Clair
									</Text>
								</TouchableOpacity>

								{/* Ocean Mode */}
								<TouchableOpacity
									style={[
										settingsStyles.themeOption,
										themeMode === THEME_MODES.OCEAN &&
											settingsStyles.themeOptionActive,
									]}
									onPress={() => setThemeMode(THEME_MODES.OCEAN)}
								>
									<View
										style={[
											settingsStyles.themePreview,
											{ backgroundColor: "#0A1628" },
										]}
									>
										<Ionicons name="water" size={20} color="#06B6D4" />
									</View>
									<Text
										style={[
											settingsStyles.themeOptionLabel,
											themeMode === THEME_MODES.OCEAN &&
												settingsStyles.themeOptionLabelActive,
										]}
									>
										Ocean
									</Text>
								</TouchableOpacity>

								{/* Cloud Mode */}
								<TouchableOpacity
									style={[
										settingsStyles.themeOption,
										themeMode === THEME_MODES.CLOUD &&
											settingsStyles.themeOptionActive,
									]}
									onPress={() => setThemeMode(THEME_MODES.CLOUD)}
								>
									<View
										style={[
											settingsStyles.themePreview,
											{ backgroundColor: "#EFF6FF" },
										]}
									>
										<Ionicons name="cloud" size={20} color="#38BDF8" />
									</View>
									<Text
										style={[
											settingsStyles.themeOptionLabel,
											themeMode === THEME_MODES.CLOUD &&
												settingsStyles.themeOptionLabelActive,
										]}
									>
										Cloud
									</Text>
								</TouchableOpacity>
							</View>
						</View>

						{/* Sélecteur de taille de police */}
						<View style={settingsStyles.themeSection}>
							<View style={settingsStyles.themeLabelRow}>
								<Ionicons
									name="text-outline"
									size={24}
									color={THEME.colors.primary.amber}
								/>
								<View style={{ flex: 1, marginLeft: THEME.spacing.lg }}>
									<Text style={settingsStyles.settingLabel}>
										Taille de police
									</Text>
									<Text style={settingsStyles.settingDescription}>
										Ajustez la taille du texte
									</Text>
								</View>
							</View>

							{/* Boutons de sélection de la taille */}
							<View style={settingsStyles.themeSelector}>
								{/* Small */}
								<TouchableOpacity
									style={[
										settingsStyles.themeOption,
										fontSize === FONT_SIZES.SMALL &&
											settingsStyles.themeOptionActive,
									]}
									onPress={() => {
										console.log("🔤 Setting font size to SMALL");
										setFontSize(FONT_SIZES.SMALL);
									}}
									activeOpacity={0.7}
								>
									<View style={settingsStyles.fontSizePreview}>
										<Text
											style={[
												settingsStyles.fontSizePreviewText,
												{
													fontSize: 14,
													color:
														fontSize === FONT_SIZES.SMALL
															? THEME.colors.primary.amber
															: THEME.colors.text.muted,
												},
											]}
										>
											Aa
										</Text>
									</View>
									<Text
										style={[
											settingsStyles.themeOptionLabel,
											fontSize === FONT_SIZES.SMALL &&
												settingsStyles.themeOptionLabelActive,
										]}
									>
										S
									</Text>
								</TouchableOpacity>

								{/* Medium */}
								<TouchableOpacity
									style={[
										settingsStyles.themeOption,
										fontSize === FONT_SIZES.MEDIUM &&
											settingsStyles.themeOptionActive,
									]}
									onPress={() => {
										console.log("🔤 Setting font size to MEDIUM");
										setFontSize(FONT_SIZES.MEDIUM);
									}}
									activeOpacity={0.7}
								>
									<View style={settingsStyles.fontSizePreview}>
										<Text
											style={[
												settingsStyles.fontSizePreviewText,
												{
													fontSize: 18,
													color:
														fontSize === FONT_SIZES.MEDIUM
															? THEME.colors.primary.amber
															: THEME.colors.text.muted,
												},
											]}
										>
											Aa
										</Text>
									</View>
									<Text
										style={[
											settingsStyles.themeOptionLabel,
											fontSize === FONT_SIZES.MEDIUM &&
												settingsStyles.themeOptionLabelActive,
										]}
									>
										M
									</Text>
								</TouchableOpacity>

								{/* Large */}
								<TouchableOpacity
									style={[
										settingsStyles.themeOption,
										fontSize === FONT_SIZES.LARGE &&
											settingsStyles.themeOptionActive,
									]}
									onPress={() => {
										console.log("🔤 Setting font size to LARGE");
										setFontSize(FONT_SIZES.LARGE);
									}}
									activeOpacity={0.7}
								>
									<View style={settingsStyles.fontSizePreview}>
										<Text
											style={[
												settingsStyles.fontSizePreviewText,
												{
													fontSize: 22,
													color:
														fontSize === FONT_SIZES.LARGE
															? THEME.colors.primary.amber
															: THEME.colors.text.muted,
												},
											]}
										>
											Aa
										</Text>
									</View>
									<Text
										style={[
											settingsStyles.themeOptionLabel,
											fontSize === FONT_SIZES.LARGE &&
												settingsStyles.themeOptionLabelActive,
										]}
									>
										L
									</Text>
								</TouchableOpacity>
							</View>
						</View>
					</>
				);

			case "account":
				return (
					<>
						{/* ⭐ Section développeur */}
						{isDeveloper && (
							<View style={settingsStyles.developerCard}>
								<View style={settingsStyles.developerHeader}>
									<Ionicons name="code-slash" size={24} color="#f59e0b" />
									<Text style={settingsStyles.developerTitle}>
										Mode Développeur
									</Text>
								</View>
								<Text style={settingsStyles.developerSubtitle}>
									Restaurant actuel :{" "}
									{selectedRestaurant?.name || "Non sélectionné"}
								</Text>
								<TouchableOpacity
									style={settingsStyles.developerButton}
									onPress={() => router.push("/developer-selector")}
								>
									<Ionicons name="swap-horizontal" size={18} color="#fff" />
									<Text style={settingsStyles.developerButtonText}>
										Changer de restaurant
									</Text>
								</TouchableOpacity>
							</View>
						)}

						{/* Infos utilisateur */}
						<View style={settingsStyles.infoCard}>
							<View style={settingsStyles.infoRow}>
								<Ionicons
									name="mail-outline"
									size={18}
									color={THEME.colors.text.muted}
								/>
								<Text style={settingsStyles.infoLabel}>Email</Text>
								<Text style={settingsStyles.infoValue}>
									{email || "Non défini"}
								</Text>
							</View>
							<View style={settingsStyles.infoDivider} />
							<View style={settingsStyles.infoRow}>
								<Ionicons
									name="shield-outline"
									size={18}
									color={THEME.colors.text.muted}
								/>
								<Text style={settingsStyles.infoLabel}>Rôle</Text>
								<Text style={settingsStyles.infoValue}>
									{role || userType || "Serveur"}
								</Text>
							</View>
						</View>

						{/* Bouton de déconnexion */}
						<TouchableOpacity
							style={settingsStyles.logoutButton}
							onPress={handleLogout}
						>
							<LinearGradient
								colors={["#F43F5E", "#E11D48"]}
								start={{ x: 0, y: 0 }}
								end={{ x: 1, y: 0 }}
								style={settingsStyles.logoutGradient}
							>
								<Ionicons name="log-out-outline" size={20} color="#FFF" />
								<Text style={settingsStyles.logoutText}>Déconnexion</Text>
							</LinearGradient>
						</TouchableOpacity>
					</>
				);

			case "servers":
				return <ServerManagement />;

			case "tables":
				return <TableManagement />;

			case "menu":
				return <MenuManagement />;

			case "security":
				return <SecuritySettings />;

			default:
				return null;
		}
	};

	// Menu Item Component
	const MenuItem = ({ icon, label, section }) => {
		const isActive = activeSection === section;
		return (
			<TouchableOpacity
				style={[
					settingsStyles.menuItem,
					isActive && settingsStyles.menuItemActive,
				]}
				onPress={() => setActiveSection(section)}
				activeOpacity={0.7}
			>
				{isActive && (
					<LinearGradient
						colors={[`${THEME.colors.primary.amber}15`, "transparent"]}
						style={StyleSheet.absoluteFill}
						start={{ x: 0, y: 0 }}
						end={{ x: 1, y: 0 }}
					/>
				)}
				<Ionicons
					name={icon}
					size={18}
					color={
						isActive ? THEME.colors.primary.amber : THEME.colors.text.muted
					}
				/>
				<Text
					style={[
						settingsStyles.menuItemText,
						isActive && settingsStyles.menuItemTextActive,
					]}
				>
					{label}
				</Text>
				{isActive && <View style={settingsStyles.menuActiveIndicator} />}
			</TouchableOpacity>
		);
	};

	return (
		<View style={settingsStyles.container}>
			{/* Background */}
			<LinearGradient
				colors={[THEME.colors.background.dark, THEME.colors.background.card]}
				style={StyleSheet.absoluteFill}
			/>
			{/* Container des colonnes */}
			<View style={{ flexDirection: "row", flex: 1 }}>
				{/* Sidebar - Menu des options */}
				<View style={settingsStyles.sidebar}>
					{/* Header */}
					<View style={settingsStyles.sidebarHeader}>
						<Ionicons
							name="settings-outline"
							size={22}
							color={THEME.colors.primary.amber}
						/>
						<Text style={settingsStyles.sidebarTitle}>Réglages</Text>
					</View>

					<ScrollView showsVerticalScrollIndicator={false}>
						{/* Menu items de base */}
						<MenuItem icon="person-outline" label="Compte" section="account" />

						{/* Section Manager - visible uniquement pour managers/admins */}
						{canAccessManagerPortal && (
							<>
								<View style={settingsStyles.sectionDivider}>
									<LinearGradient
										colors={[
											"transparent",
											THEME.colors.border.subtle,
											"transparent",
										]}
										start={{ x: 0, y: 0 }}
										end={{ x: 1, y: 0 }}
										style={{ height: 1 }}
									/>
									<Text style={settingsStyles.sectionLabel}>
										Portail Manager
									</Text>
								</View>

								<MenuItem
									icon="people-outline"
									label="Serveurs"
									section="servers"
								/>
								<MenuItem icon="grid-outline" label="Tables" section="tables" />
								<MenuItem
									icon="restaurant-outline"
									label="Menu"
									section="menu"
								/>
								<MenuItem
									icon="lock-closed-outline"
									label="Sécurité"
									section="security"
								/>
							</>
						)}

						{/* Thème en dernier - moins prioritaire */}
						<MenuItem
							icon="color-palette-outline"
							label="Thème"
							section="appearance"
						/>
						{/* Feedback */}
						<TouchableOpacity
							style={settingsStyles.menuItem}
							onPress={() => setShowFeedbackModal(true)}
						>
							<Ionicons
								name="chatbox-ellipses-outline"
								size={20}
								color={THEME.colors.text.secondary}
							/>
							<Text style={settingsStyles.menuItemText}>Feedback</Text>
							<Text> </Text>
							<Ionicons
								name="chevron-forward"
								size={18}
								color={THEME.colors.text.secondary}
							/>
						</TouchableOpacity>
					</ScrollView>
				</View>

				{/* Séparateur vertical */}
				<LinearGradient
					colors={["transparent", THEME.colors.border.subtle, "transparent"]}
					style={{ width: 1 }}
				/>

				{/* Colonne principale - Contenu */}
				<View style={settingsStyles.mainContent}>
					{/* Scroll uniquement pour les sections sans FlatList */}
					{["appearance", "account", "security"].includes(activeSection) ? (
						<ScrollView
							showsVerticalScrollIndicator={false}
							contentContainerStyle={{ paddingBottom: 40 }}
						>
							{renderActiveSection()}
						</ScrollView>
					) : (
						<View style={{ flex: 1 }}>{renderActiveSection()}</View>
					)}

					{/* Version app */}
					{(activeSection === "appearance" || activeSection === "account") && (
						<Text style={settingsStyles.versionText}>OrderIt v1.0.0</Text>
					)}
				</View>
			</View>

			{/* Modale Feedback */}
			<FeedbackModal
				visible={showFeedbackModal}
				onClose={() => setShowFeedbackModal(false)}
				onSubmit={handleFeedbackSubmit}
				userContext={{
					email,
					role,
					userType,
				}}
			/>
		</View>
	);
}

// Styles Premium (générés dynamiquement)
const createStyles = (THEME) =>
	StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: THEME.colors.background.dark,
		},
		sidebar: {
			width: 220,
			backgroundColor: THEME.colors.background.card,
			padding: THEME.spacing.lg,
		},
		sidebarHeader: {
			flexDirection: "row",
			alignItems: "center",
			marginBottom: THEME.spacing.xl,
			paddingBottom: THEME.spacing.lg,
			borderBottomWidth: 1,
			borderBottomColor: THEME.colors.border.subtle,
		},
		sidebarTitle: {
			fontSize: THEME.typography.sizes.md,
			fontWeight: "700",
			color: THEME.colors.text.primary,
			marginLeft: THEME.spacing.md,
		},
		menuItem: {
			flexDirection: "row",
			alignItems: "center",
			paddingVertical: THEME.spacing.md,
			paddingHorizontal: THEME.spacing.md,
			marginVertical: THEME.spacing.xs,
			borderRadius: THEME.radius.md,
			overflow: "hidden",
			position: "relative",
		},
		menuItemActive: {
			borderLeftWidth: 3,
			borderLeftColor: THEME.colors.primary.amber,
		},
		menuItemText: {
			fontSize: THEME.typography.sizes.sm,
			fontWeight: "500",
			color: THEME.colors.text.secondary,
			marginLeft: THEME.spacing.md,
		},
		menuItemTextActive: {
			color: THEME.colors.primary.amber,
			fontWeight: "600",
		},
		menuActiveIndicator: {
			position: "absolute",
			left: 0,
			top: 0,
			bottom: 0,
			width: 3,
			backgroundColor: THEME.colors.primary.amber,
		},
		sectionDivider: {
			marginTop: THEME.spacing.xl,
			marginBottom: THEME.spacing.md,
		},
		sectionLabel: {
			fontSize: THEME.typography.sizes.xs,
			fontWeight: "600",
			color: THEME.colors.text.muted,
			marginTop: THEME.spacing.sm,
			textTransform: "uppercase",
			letterSpacing: 0.5,
		},
		mainContent: {
			flex: 1,
			backgroundColor: THEME.colors.background.dark,
			padding: THEME.spacing["2xl"],
		},
		sectionHeaderText: {
			fontSize: THEME.typography.sizes.xl,
			fontWeight: "700",
			color: THEME.colors.text.primary,
			marginBottom: THEME.spacing.xl,
		},
		settingRow: {
			flexDirection: "row",
			alignItems: "center",
			padding: THEME.spacing.lg,
			backgroundColor: THEME.colors.background.elevated,
			borderRadius: THEME.radius.lg,
			marginBottom: THEME.spacing.lg,
			borderWidth: 1,
			borderColor: THEME.colors.border.subtle,
		},
		settingLabel: {
			fontSize: THEME.typography.sizes.base,
			fontWeight: "600",
			color: THEME.colors.text.primary,
			marginBottom: 4,
		},
		settingDescription: {
			fontSize: THEME.typography.sizes.sm,
			color: THEME.colors.text.muted,
			lineHeight: 18,
		},
		infoCard: {
			backgroundColor: THEME.colors.background.elevated,
			borderRadius: THEME.radius.lg,
			padding: THEME.spacing.lg,
			borderWidth: 1,
			borderColor: THEME.colors.border.subtle,
		},
		infoRow: {
			flexDirection: "row",
			alignItems: "center",
			paddingVertical: THEME.spacing.md,
		},
		infoLabel: {
			fontSize: THEME.typography.sizes.sm,
			color: THEME.colors.text.muted,
			marginLeft: THEME.spacing.md,
			flex: 1,
		},
		infoValue: {
			fontSize: THEME.typography.sizes.sm,
			fontWeight: "600",
			color: THEME.colors.text.primary,
		},
		infoDivider: {
			height: 1,
			backgroundColor: THEME.colors.border.subtle,
			marginVertical: THEME.spacing.xs,
		},
		logoutButton: {
			marginTop: THEME.spacing.xl,
			borderRadius: THEME.radius.lg,
			overflow: "hidden",
		},
		logoutGradient: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			paddingVertical: THEME.spacing.md,
			paddingHorizontal: THEME.spacing.xl,
		},
		logoutText: {
			fontSize: THEME.typography.sizes.base,
			fontWeight: "600",
			color: "#FFF",
			marginLeft: THEME.spacing.sm,
		},
		versionText: {
			fontSize: THEME.typography.sizes.xs,
			color: THEME.colors.text.muted,
			textAlign: "center",
			position: "absolute",
			bottom: THEME.spacing.lg,
			left: 0,
			right: 0,
		},
		// ⭐ Styles pour le sélecteur de thème
		themeSection: {
			backgroundColor: THEME.colors.background.elevated,
			borderRadius: THEME.radius.lg,
			padding: THEME.spacing.lg,
			marginBottom: THEME.spacing.lg,
			borderWidth: 1,
			borderColor: THEME.colors.border.subtle,
		},
		themeLabelRow: {
			flexDirection: "row",
			alignItems: "center",
			marginBottom: THEME.spacing.lg,
		},
		themeSelector: {
			flexDirection: "row",
			justifyContent: "space-between",
			gap: THEME.spacing.sm,
		},
		themeOption: {
			flex: 1,
			alignItems: "center",
			paddingVertical: THEME.spacing.md,
			paddingHorizontal: THEME.spacing.sm,
			borderRadius: THEME.radius.lg,
			backgroundColor: "transparent",
		},
		themeOptionActive: {
			backgroundColor: `${THEME.colors.primary.amber}10`,
		},
		themePreview: {
			width: 48,
			height: 48,
			borderRadius: THEME.radius.md,
			alignItems: "center",
			justifyContent: "center",
			marginBottom: THEME.spacing.sm,
		},
		fontSizePreview: {
			width: 48,
			height: 48,
			borderRadius: THEME.radius.md,
			alignItems: "center",
			justifyContent: "center",
			marginBottom: THEME.spacing.sm,
			backgroundColor: THEME.colors.background.dark,
		},
		fontSizePreviewText: {
			fontWeight: "700",
			color: THEME.colors.text.secondary,
		},
		themeOptionLabel: {
			fontSize: THEME.typography.sizes.xs,
			fontWeight: "500",
			color: THEME.colors.text.muted,
		},
		themeOptionLabelActive: {
			color: THEME.colors.primary.amber,
			fontWeight: "600",
		},
		// Style spécifique pour le bouton feedback
		feedbackButton: {
			borderWidth: 1,
			borderColor: THEME.colors.primary.amber,
			backgroundColor: `${THEME.colors.primary.amber}15`,
		},
		// ⭐ Styles développeur
		developerCard: {
			backgroundColor: "#0a0e1a",
			borderRadius: THEME.radius.lg,
			padding: THEME.spacing.lg,
			marginBottom: THEME.spacing.lg,
			borderWidth: 2,
			borderColor: "#f59e0b",
		},
		developerHeader: {
			flexDirection: "row",
			alignItems: "center",
			gap: THEME.spacing.md,
			marginBottom: THEME.spacing.sm,
		},
		developerTitle: {
			fontSize: THEME.typography.sizes.md,
			fontWeight: "700",
			color: "#f59e0b",
		},
		developerSubtitle: {
			fontSize: THEME.typography.sizes.sm,
			color: THEME.colors.text.muted,
			marginBottom: THEME.spacing.md,
		},
		developerButton: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			gap: THEME.spacing.sm,
			backgroundColor: "#f59e0b",
			paddingVertical: THEME.spacing.md,
			borderRadius: THEME.radius.md,
		},
		developerButtonText: {
			fontSize: THEME.typography.sizes.sm,
			fontWeight: "600",
			color: "#fff",
		},
	});
