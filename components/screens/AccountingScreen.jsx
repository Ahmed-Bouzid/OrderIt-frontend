/**
 * AccountingScreen.jsx - Module Comptabilité Avancé
 * Interface de gestion financière complète avec graphiques et analyses
 */
import React, { useState, useEffect } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	ScrollView,
	ActivityIndicator,
	Modal,
	Dimensions,
	Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../hooks/useTheme";
import useUserStore from "../../src/stores/useUserStore";
import * as SecureStore from "expo-secure-store";
import { API_CONFIG } from "../../src/config/apiConfig";
import { LineChart, BarChart, PieChart } from "react-native-chart-kit";
import * as Clipboard from "expo-clipboard";

const { width: screenWidth } = Dimensions.get("window");

export default function AccountingScreen({ onClose }) {
	const THEME = useTheme();
	const { role } = useUserStore();

	// ═══════════════════════════════════════════════════════════════════════
	// 🔧 ÉTATS
	// ═══════════════════════════════════════════════════════════════════════
	const [token, setToken] = useState(null);
	const [isLoading, setIsLoading] = useState(false);
	const [dataLoaded, setDataLoaded] = useState(false);
	const [selectedPeriod, setSelectedPeriod] = useState("today");
	const [selectedTab, setSelectedTab] = useState("overview");
	const [isExporting, setIsExporting] = useState(false);

	// Données principales
	const [data, setData] = useState({
		// Métriques de base
		totalRevenue: 0,
		totalOrders: 0,
		averageOrderValue: 0,

		// Comptabilité avancée
		revenueHT: 0,
		revenueTTC: 0,
		tvaCollected: 0,
		costs: 0,
		grossMargin: 0,
		marginPercent: 0,
		netResult: 0,

		// Évolution
		previousPeriodRevenue: 0,
		growthRate: 0,

		// Produits
		topProduct: "N/A",
		topProducts: [],

		// Graphiques
		dailyRevenues: [],

		// Meta
		period: "today",
		startDate: "",
		endDate: "",
	});

	// ═══════════════════════════════════════════════════════════════════════
	// 🔧 CONFIGURATION
	// ═══════════════════════════════════════════════════════════════════════
	const PERIODS = [
		{ key: "today", label: "Aujourd'hui", icon: "today" },
		{ key: "week", label: "Cette semaine", icon: "calendar" },
		{ key: "month", label: "Ce mois", icon: "calendar-outline" },
		{ key: "year", label: "Cette année", icon: "calendar-sharp" },
	];

	const TABS = [
		{ key: "overview", label: "Vue d'ensemble", icon: "analytics" },
		{ key: "charts", label: "Graphiques", icon: "bar-chart" },
		{ key: "details", label: "Détails", icon: "list" },
	];

	// ═══════════════════════════════════════════════════════════════════════
	// 🔧 HOOKS
	// ═══════════════════════════════════════════════════════════════════════
	useEffect(() => {
		const getToken = async () => {
			try {
				const storedToken = await SecureStore.getItemAsync("access_token");
				console.log(
					"🔐 [AccountingScreen] Token depuis SecureStore:",
					!!storedToken,
				);
				setToken(storedToken);
			} catch (error) {
				console.error(
					"❌ [AccountingScreen] Erreur récupération token:",
					error,
				);
			}
		};
		getToken();
	}, []);

	useEffect(() => {
		if (token && !dataLoaded) {
			console.log(
				"🔑 [AccountingScreen] Token disponible, chargement des données...",
			);
			setDataLoaded(true);
			loadData();
			if (selectedTab === "charts") {
				loadChartData();
			}
		}
	}, [token, dataLoaded, selectedPeriod]); // eslint-disable-line

	useEffect(() => {
		if (token && dataLoaded && selectedTab === "charts") {
			loadChartData();
		}
	}, [selectedTab, selectedPeriod]); // eslint-disable-line

	// ═══════════════════════════════════════════════════════════════════════
	// 📡 API CALLS
	// ═══════════════════════════════════════════════════════════════════════
	const loadData = async () => {
		setIsLoading(true);
		try {
			console.log(
				`💰 [AccountingScreen] Chargement données période: ${selectedPeriod}`,
			);

			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 10000);

			const response = await fetch(
				`${API_CONFIG.baseURL}/accounting/summary?period=${selectedPeriod}`,
				{
					method: "GET",
					headers: {
						Authorization: `Bearer ${token}`,
						"Content-Type": "application/json",
					},
					signal: controller.signal,
				},
			);

			clearTimeout(timeoutId);

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`Erreur API: ${response.status} - ${errorText}`);
			}

			const apiData = await response.json();
			console.log("✅ [AccountingScreen] Données reçues:", apiData.data);

			if (apiData.success && apiData.data) {
				setData(apiData.data);
			}
		} catch (error) {
			console.error("❌ [AccountingScreen] Erreur:", error.message);
			Alert.alert("Erreur", "Impossible de charger les données comptables");
		} finally {
			setIsLoading(false);
		}
	};

	const loadChartData = async () => {
		try {
			console.log("📊 [AccountingScreen] Chargement des données graphiques...");
			// Pour l'instant, on utilise juste les données dailyRevenues
		} catch (error) {
			console.error(
				"❌ [AccountingScreen] Erreur chargement graphiques:",
				error,
			);
		}
	};

	// ═══════════════════════════════════════════════════════════════════════
	// 📥 FONCTION D'EXPORT
	// ═══════════════════════════════════════════════════════════════════════
	const exportAccountingData = async () => {
		setIsExporting(true);
		try {
			console.log(
				`📥 [AccountingScreen] Démarrage export pour période: ${selectedPeriod}`,
			);

			const response = await fetch(
				`${API_CONFIG.baseURL}/accounting/export?period=${selectedPeriod}&format=csv`,
				{
					method: "GET",
					headers: {
						Authorization: `Bearer ${token}`,
						"Content-Type": "application/json",
					},
				},
			);

			if (!response.ok) {
				throw new Error(`Erreur export: ${response.status}`);
			}

			// Récupérer le contenu CSV
			const csvContent = await response.text();

			// Créer le nom de fichier
			const periodLabels = {
				today: "aujourd-hui",
				week: "cette-semaine",
				month: "ce-mois",
				year: "cette-annee",
			};

			const fileName = `comptabilite-${periodLabels[selectedPeriod] || selectedPeriod}-${new Date().toISOString().split("T")[0]}.csv`;
			
			// Copier les données CSV dans le presse-papier
			await Clipboard.setStringAsync(csvContent);

			console.log("✅ [AccountingScreen] Données copiées dans le presse-papier");

			Alert.alert(
				"📊 Export réussi !",
				`Les données comptables ont été copiées dans le presse-papier au format CSV.\n\n• Ouvrez Excel, Numbers ou Google Sheets\n• Collez les données (Ctrl+V ou Cmd+V)\n• Sauvegardez sous: ${fileName}\n\n💡 Le format CSV sera automatiquement reconnu !`,
				[{ text: "Compris !" }],
			);
		} catch (error) {
			console.error("❌ [AccountingScreen] Erreur export:", error);
			Alert.alert(
				"Erreur d'export",
				"Impossible d'exporter les données. Vérifiez votre connexion et réessayez.",
				[{ text: "OK" }],
			);
		} finally {
			setIsExporting(false);
		}
	};

	// ═══════════════════════════════════════════════════════════════════════
	// 🎨 STYLES
	// ═══════════════════════════════════════════════════════════════════════
	const styles = {
		modalContainer: {
			flex: 1,
			backgroundColor: THEME.colors.background.dark,
		},
		header: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			padding: THEME.spacing.lg,
			backgroundColor: THEME.colors.background.card,
			borderBottomWidth: 1,
			borderBottomColor: THEME.colors.border.subtle,
		},
		title: {
			fontSize: 24,
			fontWeight: "bold",
			color: THEME.colors.text.primary,
		},
		closeButton: {
			padding: THEME.spacing.sm,
		},
		content: {
			flex: 1,
		},
		periodSelector: {
			flexDirection: "row",
			backgroundColor: THEME.colors.background.card,
			padding: THEME.spacing.md,
			justifyContent: "space-around",
		},
		periodButton: {
			paddingVertical: THEME.spacing.sm,
			paddingHorizontal: THEME.spacing.md,
			borderRadius: THEME.radius.md,
			backgroundColor: THEME.colors.background.subtle,
		},
		periodButtonActive: {
			backgroundColor: THEME.colors.primary.amber,
		},
		periodButtonText: {
			fontSize: 12,
			color: THEME.colors.text.secondary,
			textAlign: "center",
		},
		periodButtonTextActive: {
			color: "#fff",
			fontWeight: "600",
		},
		tabSelector: {
			flexDirection: "row",
			backgroundColor: THEME.colors.background.card,
			paddingHorizontal: THEME.spacing.lg,
			paddingVertical: THEME.spacing.md,
		},
		tabButton: {
			flex: 1,
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			paddingVertical: THEME.spacing.sm,
			paddingHorizontal: THEME.spacing.md,
			borderRadius: THEME.radius.md,
			marginHorizontal: THEME.spacing.xs,
		},
		tabButtonActive: {
			backgroundColor: THEME.colors.primary.amber + "20",
		},
		tabButtonText: {
			fontSize: 14,
			color: THEME.colors.text.secondary,
			marginLeft: THEME.spacing.xs,
		},
		tabButtonTextActive: {
			color: THEME.colors.primary.amber,
			fontWeight: "600",
		},
		scrollContent: {
			padding: THEME.spacing.lg,
		},
		// Cartes métriques
		metricsGrid: {
			flexDirection: "row",
			flexWrap: "wrap",
			justifyContent: "space-between",
			marginBottom: THEME.spacing.lg,
		},
		metricCard: {
			width: "48%",
			backgroundColor: THEME.colors.background.card,
			padding: THEME.spacing.md,
			borderRadius: THEME.radius.lg,
			marginBottom: THEME.spacing.md,
		},
		metricCardLarge: {
			width: "100%",
		},
		metricValue: {
			fontSize: 20,
			fontWeight: "bold",
			color: THEME.colors.text.primary,
			marginBottom: THEME.spacing.xs,
		},
		metricLabel: {
			fontSize: 14,
			color: THEME.colors.text.secondary,
		},
		metricChange: {
			flexDirection: "row",
			alignItems: "center",
			marginTop: THEME.spacing.xs,
		},
		metricChangeText: {
			fontSize: 12,
			marginLeft: THEME.spacing.xs,
		},
		metricChangePositive: {
			color: "#22C55E",
		},
		metricChangeNegative: {
			color: "#EF4444",
		},
		// Sections
		section: {
			marginBottom: THEME.spacing.lg,
		},
		sectionTitle: {
			fontSize: 18,
			fontWeight: "600",
			color: THEME.colors.text.primary,
			marginBottom: THEME.spacing.md,
		},
		// Graphiques
		chartContainer: {
			backgroundColor: THEME.colors.background.card,
			borderRadius: THEME.radius.lg,
			padding: THEME.spacing.md,
			marginBottom: THEME.spacing.md,
		},
		chartTitle: {
			fontSize: 16,
			fontWeight: "600",
			color: THEME.colors.text.primary,
			marginBottom: THEME.spacing.md,
			textAlign: "center",
		},
		// Liste produits
		productsList: {
			backgroundColor: THEME.colors.background.card,
			borderRadius: THEME.radius.lg,
			overflow: "hidden",
		},
		productItem: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			padding: THEME.spacing.md,
			borderBottomWidth: 1,
			borderBottomColor: THEME.colors.border.subtle,
		},
		productName: {
			fontSize: 14,
			color: THEME.colors.text.primary,
			flex: 1,
		},
		productStats: {
			flexDirection: "row",
			alignItems: "center",
		},
		productQuantity: {
			fontSize: 12,
			color: THEME.colors.text.secondary,
			marginRight: THEME.spacing.sm,
		},
		productRevenue: {
			fontSize: 14,
			fontWeight: "600",
			color: THEME.colors.primary.amber,
		},
		// Loading
		loadingContainer: {
			flex: 1,
			justifyContent: "center",
			alignItems: "center",
			padding: THEME.spacing.xl,
		},
		loadingText: {
			fontSize: 16,
			color: THEME.colors.text.secondary,
			marginTop: THEME.spacing.md,
		},
		// Boutons d'export
		exportButton: {
			backgroundColor: "#22C55E",
			borderRadius: THEME.radius.lg,
			padding: THEME.spacing.md,
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			marginTop: THEME.spacing.lg,
		},
		exportButtonDisabled: {
			backgroundColor: THEME.colors.text.muted,
			opacity: 0.6,
		},
		exportButtonText: {
			color: "#fff",
			fontWeight: "600",
			fontSize: 16,
			marginLeft: THEME.spacing.sm,
		},
	};

	// ═══════════════════════════════════════════════════════════════════════
	// 🔐 VÉRIFICATIONS ACCÈS
	// ═══════════════════════════════════════════════════════════════════════
	const hasAccess = token && ["admin", "developer", "manager"].includes(role);

	if (!hasAccess) {
		return (
			<Modal visible={true} animationType="slide" presentationStyle="pageSheet">
				<View style={styles.modalContainer}>
					<View style={styles.header}>
						<Text style={styles.title}>💰 Comptabilité</Text>
						{onClose && (
							<TouchableOpacity onPress={onClose} style={styles.closeButton}>
								<Ionicons
									name="close"
									size={24}
									color={THEME.colors.text.primary}
								/>
							</TouchableOpacity>
						)}
					</View>
					<View style={styles.loadingContainer}>
						<Ionicons
							name="lock-closed"
							size={48}
							color={THEME.colors.text.secondary}
						/>
						<Text style={styles.loadingText}>
							Accès restreint aux administrateurs
						</Text>
					</View>
				</View>
			</Modal>
		);
	}

	// ═══════════════════════════════════════════════════════════════════════
	// 🎨 RENDU CONTENU
	// ═══════════════════════════════════════════════════════════════════════

	const renderOverviewTab = () => (
		<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
			<View style={styles.scrollContent}>
				{/* Métriques principales */}
				<View style={styles.metricsGrid}>
					<View style={styles.metricCard}>
						<Text style={styles.metricValue}>
							€{data.totalRevenue?.toFixed(2) || "0.00"}
						</Text>
						<Text style={styles.metricLabel}>Chiffre d&apos;Affaires</Text>
						{data.growthRate !== undefined && (
							<View style={styles.metricChange}>
								<Ionicons
									name={data.growthRate >= 0 ? "trending-up" : "trending-down"}
									size={16}
									color={data.growthRate >= 0 ? "#22C55E" : "#EF4444"}
								/>
								<Text
									style={[
										styles.metricChangeText,
										data.growthRate >= 0
											? styles.metricChangePositive
											: styles.metricChangeNegative,
									]}
								>
									{data.growthRate > 0 ? "+" : ""}
									{data.growthRate?.toFixed(1) || "0.0"}%
								</Text>
							</View>
						)}
					</View>

					<View style={styles.metricCard}>
						<Text style={styles.metricValue}>{data.totalOrders || 0}</Text>
						<Text style={styles.metricLabel}>Commandes</Text>
					</View>

					<View style={styles.metricCard}>
						<Text style={styles.metricValue}>
							€{data.averageOrderValue?.toFixed(2) || "0.00"}
						</Text>
						<Text style={styles.metricLabel}>Panier Moyen</Text>
					</View>

					<View style={styles.metricCard}>
						<Text style={styles.metricValue}>
							{data.marginPercent?.toFixed(1) || "0.0"}%
						</Text>
						<Text style={styles.metricLabel}>Marge Brute</Text>
					</View>
				</View>

				{/* Comptabilité avancée */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>📊 Analyse Comptable</Text>

					<View style={styles.metricsGrid}>
						<View style={styles.metricCard}>
							<Text style={styles.metricValue}>
								€{data.revenueHT?.toFixed(2) || "0.00"}
							</Text>
							<Text style={styles.metricLabel}>CA Hors Taxes</Text>
						</View>

						<View style={styles.metricCard}>
							<Text style={styles.metricValue}>
								€{data.tvaCollected?.toFixed(2) || "0.00"}
							</Text>
							<Text style={styles.metricLabel}>TVA Collectée</Text>
						</View>

						<View style={styles.metricCard}>
							<Text style={styles.metricValue}>
								€{data.costs?.toFixed(2) || "0.00"}
							</Text>
							<Text style={styles.metricLabel}>Coûts Estimés</Text>
						</View>

						<View style={styles.metricCard}>
							<Text style={styles.metricValue}>
								€{data.netResult?.toFixed(2) || "0.00"}
							</Text>
							<Text style={styles.metricLabel}>Résultat Net</Text>
						</View>
					</View>
				</View>

				{/* Top produits */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>🏆 Produits Populaires</Text>
					<View style={styles.productsList}>
						{data.topProducts?.length > 0 ? (
							data.topProducts.map((product, index) => (
								<View key={index} style={styles.productItem}>
									<Text style={styles.productName}>{product.name}</Text>
									<View style={styles.productStats}>
										<Text style={styles.productQuantity}>
											{product.quantity}x
										</Text>
										<Text style={styles.productRevenue}>
											€{product.revenue?.toFixed(2)}
										</Text>
									</View>
								</View>
							))
						) : (
							<View style={styles.productItem}>
								<Text style={styles.productName}>Aucun produit vendu</Text>
							</View>
						)}
					</View>
				</View>
			</View>
		</ScrollView>
	);

	const renderChartsTab = () => {
		const chartConfig = {
			backgroundColor: THEME.colors.background.card,
			backgroundGradientFrom: THEME.colors.background.card,
			backgroundGradientTo: THEME.colors.background.card,
			decimalPlaces: 2,
			color: (opacity = 1) =>
				THEME.colors.primary.amber +
				Math.floor(opacity * 255)
					.toString(16)
					.padStart(2, "0"),
			labelColor: (opacity = 1) =>
				THEME.colors.text.secondary +
				Math.floor(opacity * 255)
					.toString(16)
					.padStart(2, "0"),
			style: {
				borderRadius: THEME.radius.lg,
			},
			propsForDots: {
				r: "6",
				strokeWidth: "2",
				stroke: THEME.colors.primary.amber,
			},
		};

		return (
			<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
				<View style={styles.scrollContent}>
					{/* Évolution du CA */}
					{data.dailyRevenues?.length > 0 && (
						<View style={styles.chartContainer}>
							<Text style={styles.chartTitle}>
								📈 Évolution du Chiffre d&apos;Affaires
							</Text>
							<LineChart
								data={{
									labels: data.dailyRevenues
										.slice(-7)
										.map((d) => new Date(d.date).getDate().toString()),
									datasets: [
										{
											data: data.dailyRevenues.slice(-7).map((d) => d.revenue),
										},
									],
								}}
								width={screenWidth - 64}
								height={220}
								chartConfig={chartConfig}
								bezier
								style={{
									marginVertical: 8,
									borderRadius: THEME.radius.lg,
								}}
							/>
						</View>
					)}

					{/* Nombre de commandes */}
					{data.dailyRevenues?.length > 0 && (
						<View style={styles.chartContainer}>
							<Text style={styles.chartTitle}>📦 Nombre de Commandes</Text>
							<BarChart
								data={{
									labels: data.dailyRevenues
										.slice(-7)
										.map((d) => new Date(d.date).getDate().toString()),
									datasets: [
										{
											data: data.dailyRevenues.slice(-7).map((d) => d.orders),
										},
									],
								}}
								width={screenWidth - 64}
								height={220}
								chartConfig={chartConfig}
								style={{
									marginVertical: 8,
									borderRadius: THEME.radius.lg,
								}}
							/>
						</View>
					)}

					{/* Répartition CA/Coûts/Marge */}
					{data.revenueHT > 0 && (
						<View style={styles.chartContainer}>
							<Text style={styles.chartTitle}>💰 Répartition Financière</Text>
							<PieChart
								data={[
									{
										name: "Marge",
										population: data.grossMargin,
										color: "#22C55E",
										legendFontColor: THEME.colors.text.primary,
										legendFontSize: 12,
									},
									{
										name: "Coûts",
										population: data.costs,
										color: "#EF4444",
										legendFontColor: THEME.colors.text.primary,
										legendFontSize: 12,
									},
								]}
								width={screenWidth - 64}
								height={220}
								chartConfig={chartConfig}
								accessor="population"
								backgroundColor="transparent"
								paddingLeft="15"
								style={{
									marginVertical: 8,
									borderRadius: THEME.radius.lg,
								}}
							/>
						</View>
					)}
				</View>
			</ScrollView>
		);
	};

	const renderDetailsTab = () => (
		<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
			<View style={styles.scrollContent}>
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>📋 Détails de la Période</Text>

					<View style={styles.metricCard}>
						<Text style={styles.metricLabel}>Période sélectionnée</Text>
						<Text style={styles.metricValue}>
							{PERIODS.find((p) => p.key === selectedPeriod)?.label}
						</Text>
						<Text style={styles.metricLabel}>
							Du {data.startDate} au {data.endDate}
						</Text>
					</View>

					<View style={styles.metricsGrid}>
						<View style={styles.metricCard}>
							<Text style={styles.metricValue}>
								€{data.revenueTTC?.toFixed(2) || "0.00"}
							</Text>
							<Text style={styles.metricLabel}>CA Toutes Taxes</Text>
						</View>

						<View style={styles.metricCard}>
							<Text style={styles.metricValue}>
								€{data.previousPeriodRevenue?.toFixed(2) || "0.00"}
							</Text>
							<Text style={styles.metricLabel}>Période Précédente</Text>
						</View>
					</View>

					<TouchableOpacity
						style={{
							backgroundColor: THEME.colors.primary.amber,
							borderRadius: THEME.radius.lg,
							padding: THEME.spacing.md,
							alignItems: "center",
							marginTop: THEME.spacing.lg,
						}}
						onPress={loadData}
					>
						<Text
							style={{
								color: "#fff",
								fontWeight: "600",
								fontSize: 16,
							}}
						>
							🔄 Actualiser les données
						</Text>
					</TouchableOpacity>

					{/* Bouton d'export CSV */}
					<TouchableOpacity
						style={[
							styles.exportButton,
							isExporting && styles.exportButtonDisabled,
						]}
						onPress={exportAccountingData}
						disabled={isExporting}
					>
						{isExporting ? (
							<>
								<ActivityIndicator size="small" color="#fff" />
								<Text style={styles.exportButtonText}>Export en cours...</Text>
							</>
						) : (
							<>
								<Ionicons name="copy" size={20} color="#fff" />
								<Text style={styles.exportButtonText}>
									Copier données CSV
								</Text>
							</>
						)}
					</TouchableOpacity>

					{/* Info sur l'export */}
					<View
						style={{
							backgroundColor: THEME.colors.background.card,
							borderRadius: THEME.radius.md,
							padding: THEME.spacing.md,
							marginTop: THEME.spacing.md,
							borderLeftWidth: 4,
							borderLeftColor: "#22C55E",
						}}
					>
						<Text
							style={{
								fontSize: 14,
								color: THEME.colors.text.primary,
								fontWeight: "600",
								marginBottom: THEME.spacing.xs,
							}}
						>
							� Export via presse-papier :
						</Text>
						<Text
							style={{
								fontSize: 12,
								color: THEME.colors.text.secondary,
								lineHeight: 18,
							}}
						>
							• Résumé financier complet (CA, TVA, marges){"\n"}• Détail de
							toutes les commandes{"\n"}• Analyse des produits populaires{"\n"}•
							Évolution quotidienne{"\n"}• Format CSV prêt pour Excel/Numbers
						</Text>
					</View>
				</View>
			</View>
		</ScrollView>
	);

	if (isLoading && !data.totalRevenue) {
		return (
			<Modal visible={true} animationType="slide" presentationStyle="pageSheet">
				<View style={styles.modalContainer}>
					<View style={styles.header}>
						<Text style={styles.title}>💰 Comptabilité</Text>
						{onClose && (
							<TouchableOpacity onPress={onClose} style={styles.closeButton}>
								<Ionicons
									name="close"
									size={24}
									color={THEME.colors.text.primary}
								/>
							</TouchableOpacity>
						)}
					</View>
					<View style={styles.loadingContainer}>
						<ActivityIndicator
							size="large"
							color={THEME.colors.primary.amber}
						/>
						<Text style={styles.loadingText}>
							Chargement des données comptables...
						</Text>
					</View>
				</View>
			</Modal>
		);
	}

	// ═══════════════════════════════════════════════════════════════════════
	// 🎨 RENDU PRINCIPAL
	// ═══════════════════════════════════════════════════════════════════════
	return (
		<Modal visible={true} animationType="slide" presentationStyle="pageSheet">
			<View style={styles.modalContainer}>
				{/* Header */}
				<View style={styles.header}>
					<Text style={styles.title}>💰 Comptabilité</Text>
					{onClose && (
						<TouchableOpacity onPress={onClose} style={styles.closeButton}>
							<Ionicons
								name="close"
								size={24}
								color={THEME.colors.text.primary}
							/>
						</TouchableOpacity>
					)}
				</View>

				{/* Sélecteur de période */}
				<View style={styles.periodSelector}>
					{PERIODS.map((period) => (
						<TouchableOpacity
							key={period.key}
							style={[
								styles.periodButton,
								selectedPeriod === period.key && styles.periodButtonActive,
							]}
							onPress={() => {
								setSelectedPeriod(period.key);
								setDataLoaded(false); // Forcer le rechargement
							}}
						>
							<Ionicons
								name={period.icon}
								size={16}
								color={
									selectedPeriod === period.key
										? "#fff"
										: THEME.colors.text.secondary
								}
							/>
							<Text
								style={[
									styles.periodButtonText,
									selectedPeriod === period.key &&
										styles.periodButtonTextActive,
								]}
							>
								{period.label}
							</Text>
						</TouchableOpacity>
					))}
				</View>

				{/* Sélecteur d'onglets */}
				<View style={styles.tabSelector}>
					{TABS.map((tab) => (
						<TouchableOpacity
							key={tab.key}
							style={[
								styles.tabButton,
								selectedTab === tab.key && styles.tabButtonActive,
							]}
							onPress={() => setSelectedTab(tab.key)}
						>
							<Ionicons
								name={tab.icon}
								size={18}
								color={
									selectedTab === tab.key
										? THEME.colors.primary.amber
										: THEME.colors.text.secondary
								}
							/>
							<Text
								style={[
									styles.tabButtonText,
									selectedTab === tab.key && styles.tabButtonTextActive,
								]}
							>
								{tab.label}
							</Text>
						</TouchableOpacity>
					))}
				</View>

				{/* Contenu des onglets */}
				{selectedTab === "overview" && renderOverviewTab()}
				{selectedTab === "charts" && renderChartsTab()}
				{selectedTab === "details" && renderDetailsTab()}
			</View>
		</Modal>
	);
}
