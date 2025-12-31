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
	DARK_THEME,
	LIGHT_THEME,
	OCEAN_THEME,
	THEME_MODES,
} from "../../src/stores/useThemeStore";
import useUserStore from "../../src/stores/useUserStore";
import {
	ServerManagement,
	MenuManagement,
	SecuritySettings,
	TableManagement,
} from "./manager";

// Design tokens constants (non-color)
const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, "2xl": 24 };
const RADIUS = { sm: 6, md: 10, lg: 14, xl: 18 };

// Fonction pour obtenir les couleurs selon le mode
const getThemeColors = (themeMode) => {
	let colors;
	switch (themeMode) {
		case THEME_MODES.LIGHT:
			colors = LIGHT_THEME.colors;
			break;
		case THEME_MODES.OCEAN:
			colors = OCEAN_THEME.colors;
			break;
		case THEME_MODES.DARK:
		default:
			colors = DARK_THEME.colors;
			break;
	}
	return {
		background: {
			dark: colors.background,
			card: colors.card,
			elevated: colors.cardAlt,
		},
		primary: { amber: colors.primary },
		text: {
			primary: colors.text.primary,
			secondary: colors.text.secondary,
			muted: colors.text.muted,
		},
		border: {
			default: colors.border,
			subtle: colors.borderLight,
		},
		status: {
			success: colors.status.success,
			error: colors.status.error,
		},
	};
};

export default function Settings() {
	const router = useRouter();
	const { isDarkMode, themeMode, theme, initTheme, setThemeMode } =
		useThemeStore();
	const {
		isManager,
		email,
		role,
		userType,
		init: initUser,
		clear: logoutUser,
	} = useUserStore();

	// État pour la section active du menu
	const [activeSection, setActiveSection] = useState("appearance");

	// ⭐ Couleurs dynamiques selon le mode
	const THEME = useMemo(
		() => ({
			colors: getThemeColors(themeMode),
			spacing: SPACING,
			radius: RADIUS,
		}),
		[themeMode]
	);

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
						// ⭐ Supprimer les tokens et données
						await AsyncStorage.removeItem("@access_token");
						await AsyncStorage.removeItem("refreshToken");
						await AsyncStorage.removeItem("restaurantId");
						await AsyncStorage.removeItem("activeReservationId");

						// 🧹 Vider le store utilisateur
						logoutUser();

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
										Choisissez l'apparence de l'application
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
							</View>
						</View>
					</>
				);

			case "account":
				return (
					<>
						<Text style={settingsStyles.sectionHeaderText}>Compte</Text>

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
						<MenuItem
							icon="color-palette-outline"
							label="Thème"
							section="appearance"
						/>
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
			fontSize: 18,
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
			fontSize: 14,
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
			fontSize: 11,
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
			fontSize: 22,
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
			fontSize: 16,
			fontWeight: "600",
			color: THEME.colors.text.primary,
			marginBottom: 4,
		},
		settingDescription: {
			fontSize: 13,
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
			fontSize: 14,
			color: THEME.colors.text.muted,
			marginLeft: THEME.spacing.md,
			flex: 1,
		},
		infoValue: {
			fontSize: 14,
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
			fontSize: 16,
			fontWeight: "600",
			color: "#FFF",
			marginLeft: THEME.spacing.sm,
		},
		versionText: {
			fontSize: 12,
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
			gap: THEME.spacing.md,
		},
		themeOption: {
			flex: 1,
			alignItems: "center",
			padding: THEME.spacing.md,
			borderRadius: THEME.radius.lg,
			backgroundColor: THEME.colors.background.dark,
			borderWidth: 2,
			borderColor: "transparent",
		},
		themeOptionActive: {
			borderColor: THEME.colors.primary.amber,
			backgroundColor: `${THEME.colors.primary.amber}15`,
		},
		themePreview: {
			width: 48,
			height: 48,
			borderRadius: THEME.radius.md,
			alignItems: "center",
			justifyContent: "center",
			marginBottom: THEME.spacing.sm,
			borderWidth: 1,
			borderColor: THEME.colors.border.subtle,
		},
		themeOptionLabel: {
			fontSize: 13,
			fontWeight: "500",
			color: THEME.colors.text.muted,
		},
		themeOptionLabelActive: {
			color: THEME.colors.primary.amber,
			fontWeight: "600",
		},
	});
