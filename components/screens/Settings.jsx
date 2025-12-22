import React, { useEffect, useState } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	Alert,
	StyleSheet,
	Switch,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import styles from "../styles";
import useThemeStore from "../../src/stores/useThemeStore";
import useUserStore from "../../src/stores/useUserStore";
import { ServerManagement, MenuManagement, SecuritySettings } from "./manager";

export default function Settings() {
	const router = useRouter();
	const { isDarkMode, theme, initTheme, toggleDarkMode } = useThemeStore();
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
						await AsyncStorage.removeItem("token");
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
						<Text
							style={[
								styles.title,
								{
									fontSize: 22,
									color: theme.textColor,
									marginBottom: 20,
								},
							]}
						>
							Apparence
						</Text>

						{/* ⭐ Switch Dark Mode */}
						<View style={settingsStyles.settingRow}>
							<View style={{ flex: 1 }}>
								<Text
									style={[
										settingsStyles.settingLabel,
										{ color: theme.textColor },
									]}
								>
									🌙 Mode sombre
								</Text>
								<Text
									style={[
										settingsStyles.settingDescription,
										{ color: theme.textColor, opacity: 0.7 },
									]}
								>
									Active le thème sombre pour réduire la fatigue oculaire
								</Text>
							</View>
							<Switch
								value={isDarkMode}
								onValueChange={toggleDarkMode}
								trackColor={{ false: "#767577", true: "#81c784" }}
								thumbColor={isDarkMode ? "#4caf50" : "#f4f3f4"}
								style={{ marginLeft: 10 }}
							/>
						</View>
					</>
				);

			case "account":
				return (
					<>
						<Text
							style={[
								styles.title,
								{
									fontSize: 22,
									color: theme.textColor,
									marginBottom: 20,
								},
							]}
						>
							Compte
						</Text>

						{/* Infos utilisateur */}
						<View
							style={[
								settingsStyles.settingRow,
								{ flexDirection: "column", alignItems: "flex-start" },
							]}
						>
							<Text
								style={[
									settingsStyles.settingLabel,
									{ color: theme.textColor, marginBottom: 10 },
								]}
							>
								👤 Informations
							</Text>
							<Text
								style={[
									settingsStyles.settingDescription,
									{ color: theme.textColor, opacity: 0.8 },
								]}
							>
								Email: {email || "Non défini"}
							</Text>
							<Text
								style={[
									settingsStyles.settingDescription,
									{ color: theme.textColor, opacity: 0.8, marginTop: 5 },
								]}
							>
								Rôle: {role || userType || "Serveur"}
							</Text>
						</View>

						{/* ⭐ Bouton de déconnexion */}
						<TouchableOpacity
							style={[
								settingsStyles.logoutButton,
								{
									backgroundColor:
										theme.mode === "dark" ? "#dc2626" : "#ef4444",
								},
							]}
							onPress={handleLogout}
						>
							<Text style={settingsStyles.logoutButtonText}>
								🔓 Déconnexion
							</Text>
						</TouchableOpacity>
					</>
				);

			case "servers":
				return <ServerManagement />;

			case "menu":
				return <MenuManagement />;

			case "security":
				return <SecuritySettings />;

			default:
				return null;
		}
	};

	return (
		<View
			style={[
				styles.container,
				{
					flexDirection: "column",
					flex: 1,
					backgroundColor: theme.backgroundColor,
				},
			]}
		>
			{/* Ligne horizontale pleine largeur */}
			<View style={[styles.separatorHorizontal, { marginVertical: 0 }]} />

			{/* Container des colonnes */}
			<View style={{ flexDirection: "row", flex: 1 }}>
				{/* Colonne 25% - Menu des options */}
				<View
					style={{
						flex: 1,
						backgroundColor: theme.cardBackground,
						padding: 10,
						borderRightColor: theme.separatorColor,
						borderRightWidth: 1,
					}}
				>
					<Text
						style={[
							styles.title,
							{
								fontSize: 20,
								marginBottom: 10,
								color: theme.textColor,
							},
						]}
					>
						Réglages
					</Text>

					{/* Menu items de base */}
					<TouchableOpacity
						style={[
							settingsStyles.menuItem,
							activeSection === "appearance" && settingsStyles.menuItemActive,
						]}
						onPress={() => setActiveSection("appearance")}
					>
						<Text
							style={[
								settingsStyles.menuItemText,
								{
									color:
										activeSection === "appearance"
											? "#007AFF"
											: theme.textColor,
								},
							]}
						>
							🎨 Thème
						</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={[
							settingsStyles.menuItem,
							activeSection === "account" && settingsStyles.menuItemActive,
						]}
						onPress={() => setActiveSection("account")}
					>
						<Text
							style={[
								settingsStyles.menuItemText,
								{
									color:
										activeSection === "account" ? "#007AFF" : theme.textColor,
								},
							]}
						>
							👤 Compte
						</Text>
					</TouchableOpacity>

					{/* Section Manager - visible uniquement pour managers/admins */}
					{canAccessManagerPortal && (
						<>
							<View
								style={[
									settingsStyles.sectionDivider,
									{ backgroundColor: theme.separatorColor },
								]}
							/>
							<Text
								style={[
									settingsStyles.sectionTitle,
									{ color: theme.textColor },
								]}
							>
								⚙️ Portail Manager
							</Text>

							<TouchableOpacity
								style={[
									settingsStyles.menuItem,
									activeSection === "servers" && settingsStyles.menuItemActive,
								]}
								onPress={() => setActiveSection("servers")}
							>
								<Text
									style={[
										settingsStyles.menuItemText,
										{
											color:
												activeSection === "servers"
													? "#007AFF"
													: theme.textColor,
										},
									]}
								>
									👥 Serveurs
								</Text>
							</TouchableOpacity>

							<TouchableOpacity
								style={[
									settingsStyles.menuItem,
									activeSection === "menu" && settingsStyles.menuItemActive,
								]}
								onPress={() => setActiveSection("menu")}
							>
								<Text
									style={[
										settingsStyles.menuItemText,
										{
											color:
												activeSection === "menu" ? "#007AFF" : theme.textColor,
										},
									]}
								>
									📋 Menu
								</Text>
							</TouchableOpacity>

							<TouchableOpacity
								style={[
									settingsStyles.menuItem,
									activeSection === "security" && settingsStyles.menuItemActive,
								]}
								onPress={() => setActiveSection("security")}
							>
								<Text
									style={[
										settingsStyles.menuItemText,
										{
											color:
												activeSection === "security"
													? "#007AFF"
													: theme.textColor,
										},
									]}
								>
									🔐 Sécurité
								</Text>
							</TouchableOpacity>
						</>
					)}
				</View>

				{/* Colonne 75% - Contenu principal */}
				<View
					style={{
						flex: 3,
						backgroundColor: theme.backgroundColor,
						padding: 20,
					}}
				>
					{renderActiveSection()}

					{/* Infos app - seulement pour les sections sans FlatList */}
					{(activeSection === "appearance" || activeSection === "account") && (
						<Text
							style={[
								settingsStyles.versionText,
								{ color: theme.textColor, opacity: 0.6, marginTop: 30 },
							]}
						>
							OrderIt v1.0.0
						</Text>
					)}
				</View>
			</View>
		</View>
	);
}

// ⭐ Styles pour les réglages
const settingsStyles = StyleSheet.create({
	// Menu items
	menuItem: {
		paddingVertical: 12,
		paddingHorizontal: 10,
		marginVertical: 5,
		borderRadius: 6,
		backgroundColor: "rgba(0, 122, 255, 0.1)",
	},
	menuItemActive: {
		backgroundColor: "rgba(0, 122, 255, 0.25)",
		borderLeftWidth: 3,
		borderLeftColor: "#007AFF",
	},
	menuItemText: {
		fontSize: 14,
		fontWeight: "500",
	},

	// Section divider pour le menu
	sectionDivider: {
		height: 1,
		marginVertical: 15,
	},
	sectionTitle: {
		fontSize: 12,
		fontWeight: "600",
		marginBottom: 10,
		opacity: 0.7,
		textTransform: "uppercase",
		letterSpacing: 0.5,
	},

	// Setting row avec switch
	settingRow: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 15,
		paddingHorizontal: 15,
		backgroundColor: "rgba(0, 122, 255, 0.05)",
		borderRadius: 10,
		marginBottom: 15,
	},
	settingLabel: {
		fontSize: 16,
		fontWeight: "600",
		marginBottom: 5,
	},
	settingDescription: {
		fontSize: 12,
		lineHeight: 16,
	},

	// Logout button
	logoutButton: {
		marginTop: 20,
		paddingVertical: 12,
		paddingHorizontal: 20,
		backgroundColor: "#ef4444",
		borderRadius: 8,
		alignItems: "center",
		justifyContent: "center",
	},
	logoutButtonText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "600",
	},

	// Version text
	versionText: {
		fontSize: 12,
		textAlign: "center",
	},
});
