/**
 * AccountingScreen.jsx - Module Comptabilité
 * Interface de gestion financière pour les administrateurs
 */
import React, { useState, useEffect } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	Alert,
	ScrollView,
	ActivityIndicator,
	Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../hooks/useTheme";
import useUserStore from "../../src/stores/useUserStore";
import * as SecureStore from "expo-secure-store";

export default function AccountingScreen({ onClose }) {
	const THEME = useTheme();
	const { role } = useUserStore();

	// États locaux
	const [token, setToken] = useState(null);
	const [isLoading, setIsLoading] = useState(false);
	const [data, setData] = useState({
		totalVentes: 0,
		totalCommandes: 0,
		produitPopulaire: "N/A",
		moyennePanier: 0,
	});

	// Charger le token depuis SecureStore au montage
	useEffect(() => {
		const getToken = async () => {
			try {
				const storedToken = await SecureStore.getItemAsync("access_token");
				console.log("🔐 [AccountingScreen] Token depuis SecureStore:", !!storedToken);
				setToken(storedToken);
			} catch (error) {
				console.error("❌ [AccountingScreen] Erreur récupération token:", error);
			}
		};
		getToken();
	}, []);

	// Charger les données
	const loadData = async () => {
		setIsLoading(true);
		try {
			console.log("💰 [AccountingScreen] Chargement données depuis l'API accounting/summary...");
			console.log("🔑 [AccountingScreen] Token utilisé:", token ? "✅ présent" : "❌ manquant");
			
			// Appel API real accounting endpoint
			const response = await fetch('https://orderit-backend.onrender.com/accounting/summary', {
				method: 'GET',
				headers: {
					'Authorization': `Bearer ${token}`,
					'Content-Type': 'application/json',
				},
			});

			console.log("📡 [AccountingScreen] Réponse API status:", response.status);
			console.log("📡 [AccountingScreen] Réponse API ok:", response.ok);

			if (!response.ok) {
				const errorText = await response.text();
				console.log("❌ [AccountingScreen] Erreur API text:", errorText);
				throw new Error(`Erreur API: ${response.status} - ${errorText}`);
			}

			const apiData = await response.json();
			console.log("✅ [AccountingScreen] Données reçues de l'API:", apiData);

			if (apiData.success && apiData.data) {
				setData({
					totalVentes: apiData.data.totalRevenue || 0,
					totalCommandes: apiData.data.totalOrders || 0,
					produitPopulaire: apiData.data.topProduct || "Aucun produit",
					moyennePanier: apiData.data.averageOrderValue || 0,
					revenusMensuel: apiData.data.monthlyRevenue || 0,
					periode: apiData.data.date || "Aujourd'hui"
				});
			} else {
				throw new Error("Format de réponse API invalide");
			}

		} catch (error) {
			console.error("❌ [AccountingScreen] Erreur complète:", error);
			console.error("❌ [AccountingScreen] Erreur message:", error.message);
			
			// En cas d'erreur, données nulles pour forcer la gestion d'erreur
			setData({
				totalVentes: 0,
				totalCommandes: 0,
				produitPopulaire: "Erreur de chargement",
				moyennePanier: 0,
				revenusMensuel: 0,
				periode: "Erreur"
			});
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		if (token) {
			console.log("🔑 [AccountingScreen] Token disponible, chargement des données...");
			loadData();
		}
	}, [token]); // Se déclenche quand le token est chargé

	// Styles
	const styles = {
		container: {
			flex: 1,
			padding: THEME.spacing.lg,
		},
		centerContent: {
			justifyContent: "center",
			alignItems: "center",
		},
		header: {
			marginBottom: THEME.spacing.xl,
		},
		title: {
			fontSize: 24,
			fontWeight: "bold",
			color: THEME.colors.text.primary,
			marginBottom: THEME.spacing.sm,
		},
		subtitle: {
			fontSize: 16,
			color: THEME.colors.text.secondary,
		},
		statsContainer: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: THEME.spacing.md,
			marginBottom: THEME.spacing.xl,
		},
		statCard: {
			flex: 1,
			minWidth: 150,
			backgroundColor: THEME.colors.background.elevated,
			borderRadius: THEME.radius.lg,
			padding: THEME.spacing.lg,
			alignItems: "center",
		},
		statValue: {
			fontSize: 20,
			fontWeight: "bold",
			color: THEME.colors.primary.amber,
			marginBottom: THEME.spacing.xs,
		},
		statLabel: {
			fontSize: 14,
			color: THEME.colors.text.secondary,
			textAlign: "center",
		},
		refreshButton: {
			backgroundColor: THEME.colors.primary.amber,
			borderRadius: THEME.radius.md,
			paddingVertical: THEME.spacing.md,
			paddingHorizontal: THEME.spacing.lg,
			alignItems: "center",
			flexDirection: "row",
			justifyContent: "center",
			gap: THEME.spacing.sm,
		},
		refreshButtonText: {
			color: "#fff",
			fontWeight: "600",
			fontSize: 16,
		},
		errorText: {
			fontSize: 16,
			textAlign: "center",
			marginTop: THEME.spacing.md,
		},
		modalContainer: {
			flex: 1,
			backgroundColor: THEME.colors.background.dark,
		},
		modalHeader: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			padding: THEME.spacing.lg,
			backgroundColor: THEME.colors.background.card,
			borderBottomWidth: 1,
			borderBottomColor: THEME.colors.border.subtle,
		},
		modalTitle: {
			fontSize: 20,
			fontWeight: "bold",
			color: THEME.colors.text.primary,
		},
		closeButton: {
			padding: THEME.spacing.sm,
		},
		scrollContainer: {
			flex: 1,
			padding: THEME.spacing.lg,
		},
	};

	// Vérifier les permissions - Accès restreint aux admins et développeurs
	const hasAccess = token && (
		["admin", "developer", "manager"].includes(role) || 
		role?.toLowerCase().includes("admin")
	);
	
	console.log("🔐 [AccountingScreen] Debug accès DÉTAILLÉ:", { 
		token: !!token, 
		tokenLength: token?.length || 0,
		role, 
		roleType: typeof role,
		hasAccess,
		isRoleInArray: ["admin", "developer", "manager"].includes(role),
		isRoleLowerCaseAdmin: role?.toLowerCase().includes("admin"),
		userStoreData: { token: !!token, role }
	});
	
	if (!hasAccess) {
		console.log("❌ [AccountingScreen] ACCÈS REFUSÉ - Raisons possibles:", {
			noToken: !token,
			tokenExists: !!token,
			role: role,
			roleIsString: typeof role === 'string',
			expectedRoles: ["admin", "developer", "manager"],
			actualRole: role
		});
		return (
			<Modal
				visible={true}
				animationType="slide"
				presentationStyle="pageSheet"
			>
				<View style={styles.modalContainer}>
					<View style={styles.modalHeader}>
						<Text style={styles.modalTitle}>💰 Comptabilité</Text>
						{onClose && (
							<TouchableOpacity onPress={onClose} style={styles.closeButton}>
								<Ionicons name="close" size={24} color={THEME.colors.text.primary} />
							</TouchableOpacity>
						)}
					</View>
					<View style={[styles.scrollContainer, styles.centerContent]}>
						<Ionicons
							name="lock-closed"
							size={64}
							color={THEME.colors.text.muted}
						/>
						<Text style={[styles.errorText, { color: THEME.colors.text.secondary }]}>
							Accès restreint aux administrateurs
						</Text>
						<Text style={[styles.errorText, { color: THEME.colors.text.muted, fontSize: 12, marginTop: 8 }]}>
							Debug: role='{role}' | token={!!token ? 'oui' : 'non'}
						</Text>
					</View>
				</View>
			</Modal>
		);
	}

	if (isLoading) {
		return (
			<Modal
				visible={true}
				animationType="slide"
				presentationStyle="pageSheet"
			>
				<View style={styles.modalContainer}>
					<View style={styles.modalHeader}>
						<Text style={styles.modalTitle}>💰 Comptabilité</Text>
						{onClose && (
							<TouchableOpacity onPress={onClose} style={styles.closeButton}>
								<Ionicons name="close" size={24} color={THEME.colors.text.primary} />
							</TouchableOpacity>
						)}
					</View>
					<View style={[styles.scrollContainer, styles.centerContent]}>
						<ActivityIndicator size="large" color={THEME.colors.primary.amber} />
						<Text style={[styles.errorText, { color: THEME.colors.text.secondary }]}>
							Chargement des données...
						</Text>
					</View>
				</View>
			</Modal>
		);
	}

	return (
		<Modal
			visible={true}
			animationType="slide"
			presentationStyle="pageSheet"
		>
			<View style={styles.modalContainer}>
				{/* Modal Header */}
				<View style={styles.modalHeader}>
					<Text style={styles.modalTitle}>💰 Comptabilité</Text>
					{onClose && (
						<TouchableOpacity onPress={onClose} style={styles.closeButton}>
							<Ionicons name="close" size={24} color={THEME.colors.text.primary} />
						</TouchableOpacity>
					)}
				</View>
				
				<ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
					{/* Header */}
					<View style={styles.header}>
						<Text style={styles.subtitle}>Aperçu des données financières</Text>
					</View>

					{/* Stats Cards */}
					<View style={styles.statsContainer}>
						<View style={styles.statCard}>
							<Text style={styles.statValue}>€{data.totalVentes.toFixed(2)}</Text>
							<Text style={styles.statLabel}>Total Ventes</Text>
						</View>

						<View style={styles.statCard}>
							<Text style={styles.statValue}>{data.totalCommandes}</Text>
							<Text style={styles.statLabel}>Commandes</Text>
						</View>

						<View style={styles.statCard}>
							<Text style={styles.statValue}>€{data.moyennePanier.toFixed(2)}</Text>
							<Text style={styles.statLabel}>Panier Moyen</Text>
						</View>
						
						<View style={styles.statCard}>
							<Text style={styles.statValue}>{data.produitPopulaire}</Text>
							<Text style={styles.statLabel}>Produit Populaire</Text>
						</View>
					</View>

					{/* Bouton actualiser */}
					<TouchableOpacity
						style={styles.refreshButton}
						onPress={loadData}
						disabled={isLoading}
					>
						<Ionicons name="refresh" size={20} color="#fff" />
						<Text style={styles.refreshButtonText}>Actualiser les données</Text>
					</TouchableOpacity>
				</ScrollView>
			</View>
		</Modal>
	);
}
