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
		{ key: "quarter", label: "Ce trimestre", icon: "calendar-number-outline" },
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
			// Pour l'instant, on utilise juste les données dailyRevenues
		} catch (error) {
			console.error(
				"❌ [AccountingScreen] Erreur chargement graphiques:",
				error,
			);
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
			padding: 16,
			backgroundColor: THEME.colors.background.card,
			borderBottomWidth: 1,
			borderBottomColor: THEME.colors.border.subtle,
		},
		title: {
			fontSize: 22,
			fontWeight: "700",
			color: THEME.colors.text.primary,
		},
		closeButton: {
			padding: 8,
		},
		content: {
			flex: 1,
		},
		periodSelector: {
			flexDirection: "row",
			backgroundColor: THEME.colors.background.card,
			padding: 12,
			justifyContent: "space-around",
			borderBottomWidth: 1,
			borderBottomColor: THEME.colors.border.subtle,
		},
		periodButton: {
			paddingVertical: 8,
			paddingHorizontal: 12,
			borderRadius: 8,
			backgroundColor: THEME.colors.background.subtle,
		},
		periodButtonActive: {
			backgroundColor: THEME.colors.primary.amber,
		},
		periodButtonText: {
			fontSize: 12,
			color: THEME.colors.text.secondary,
			textAlign: "center",
			fontWeight: "600",
		},
		periodButtonTextActive: {
			color: "#fff",
			fontWeight: "600",
		},
		tabSelector: {
			flexDirection: "row",
			backgroundColor: THEME.colors.background.card,
			paddingHorizontal: 12,
			paddingVertical: 12,
			borderBottomWidth: 1,
			borderBottomColor: THEME.colors.border.subtle,
		},
		tabButton: {
			flex: 1,
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			paddingVertical: 8,
			paddingHorizontal: 12,
			borderRadius: 8,
			marginHorizontal: 4,
		},
		tabButtonActive: {
			backgroundColor: THEME.colors.primary.amber + "20",
		},
		tabButtonText: {
			fontSize: 12,
			color: THEME.colors.text.secondary,
			marginLeft: 4,
		},
		tabButtonTextActive: {
			color: THEME.colors.primary.amber,
			fontWeight: "600",
		},
		scrollContent: {
			padding: 12,
		},
		// Cartes métriques
		metricsGrid: {
			flexDirection: "row",
			flexWrap: "wrap",
			justifyContent: "space-between",
			marginBottom: 12,
		},
		metricCard: {
			width: "48%",
			backgroundColor: THEME.colors.background.card,
			padding: 12,
			borderRadius: 12,
			marginBottom: 12,
		},
		metricCardLarge: {
			width: "100%",
		},
		metricValue: {
			fontSize: 18,
			fontWeight: "700",
			color: THEME.colors.text.primary,
			marginBottom: 4,
		},
		metricLabel: {
			fontSize: 12,
			color: THEME.colors.text.secondary,
		},
		metricChange: {
			flexDirection: "row",
			alignItems: "center",
			marginTop: 4,
		},
		metricChangeText: {
			fontSize: 11,
			marginLeft: 4,
		},
		metricChangePositive: {
			color: "#22C55E",
		},
		metricChangeNegative: {
			color: "#EF4444",
		},
		// Sections
		section: {
			marginBottom: 12,
		},
		sectionTitle: {
			fontSize: 16,
			fontWeight: "600",
			color: THEME.colors.text.primary,
			marginBottom: 12,
		},
		// Graphiques
		chartContainer: {
			backgroundColor: THEME.colors.background.card,
			borderRadius: 12,
			padding: 12,
			marginBottom: 12,
			overflow: "hidden",
		},
		chartTitle: {
			fontSize: 14,
			fontWeight: "600",
			color: THEME.colors.text.primary,
			marginBottom: 12,
			textAlign: "center",
		},
		// Liste produits
		productsList: {
			backgroundColor: THEME.colors.background.card,
			borderRadius: 12,
			overflow: "hidden",
		},
		productItem: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			padding: 12,
			borderBottomWidth: 1,
			borderBottomColor: THEME.colors.border.subtle,
		},
		productName: {
			fontSize: 13,
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
			decimalPlaces: 0,
			color: () => "#F59E0B",
			labelColor: () => THEME.colors.text.secondary,
			style: { borderRadius: THEME.radius.lg },
			propsForDots: { r: "5", strokeWidth: "2", stroke: "#F59E0B" },
		};

		// Adapter les données selon la période
		// Pour year/quarter : grouper par mois. Sinon : 7 derniers jours.
		const MOIS = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];
		const isLongPeriod = selectedPeriod === "year" || selectedPeriod === "quarter";

		let chartPoints = [];
		if (isLongPeriod && data.dailyRevenues?.length > 0) {
			// Grouper par mois
			const byMonth = {};
			data.dailyRevenues.forEach((d) => {
				const dt = new Date(d.date);
				const key = `${dt.getFullYear()}-${dt.getMonth()}`;
				if (!byMonth[key]) byMonth[key] = { label: MOIS[dt.getMonth()], revenue: 0, orders: 0 };
				byMonth[key].revenue += d.revenue;
				byMonth[key].orders += d.orders;
			});
			chartPoints = Object.values(byMonth);
		} else if (data.dailyRevenues?.length > 0) {
			// 7 derniers jours avec label JJ/MM
			chartPoints = data.dailyRevenues.slice(-7).map((d) => {
				const dt = new Date(d.date);
				return {
					label: `${dt.getDate()}/${dt.getMonth() + 1}`,
					revenue: d.revenue,
					orders: d.orders,
				};
			});
		}

		const hasChartData = chartPoints.length > 0;
		const revenueData = chartPoints.map((p) => p.revenue || 0);
		const ordersData = chartPoints.map((p) => p.orders || 0);
		const chartLabels = chartPoints.map((p) => p.label);

		return (
			<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
				<View style={styles.scrollContent}>
					{/* Évolution du CA */}
					{hasChartData && (
						<View style={styles.chartContainer}>
							<Text style={styles.chartTitle}>📈 Évolution du Chiffre d&apos;Affaires (€)</Text>
							<Text style={{ color: THEME.colors.text.muted, fontSize: 12, marginBottom: 4 }}>
								{isLongPeriod ? "Par mois · en euros TTC" : "7 derniers jours · en euros TTC"}
							</Text>
							<LineChart
								data={{ labels: chartLabels, datasets: [{ data: revenueData }] }}
							width={screenWidth - 96}
							height={200}
							chartConfig={chartConfig}
								style={{ marginVertical: 8, borderRadius: THEME.radius.lg }}
							/>
						</View>
					)}

					{/* Nombre de commandes */}
					{hasChartData && (
						<View style={styles.chartContainer}>
							<Text style={styles.chartTitle}>📦 Nombre de Commandes</Text>
							<Text style={{ color: THEME.colors.text.muted, fontSize: 12, marginBottom: 4 }}>
								{isLongPeriod ? "Par mois · nombre de commandes" : "7 derniers jours · nombre de commandes"}
							</Text>
							<BarChart
								data={{ labels: chartLabels, datasets: [{ data: ordersData }] }}
							width={screenWidth - 96}
							height={200}
								chartConfig={chartConfig}
								showValuesOnTopOfBars
								style={{ marginVertical: 8, borderRadius: THEME.radius.lg }}
							/>
						</View>
					)}

					{/* Répartition CA/Coûts/Marge */}
					{data.revenueHT > 0 && (
						<View style={styles.chartContainer}>
							<Text style={styles.chartTitle}>💰 Répartition du CA HT</Text>
							<Text style={{ color: THEME.colors.text.muted, fontSize: 12, marginBottom: 4 }}>
								Estimation : marge brute vs coûts opérationnels (base 30%)
							</Text>
							<PieChart
								data={[
									{
										name: `Marge brute  ${data.marginPercent?.toFixed(0) ?? 70}%`,
										population: Math.max(data.grossMargin, 0.01),
										color: "#22C55E",
										legendFontColor: THEME.colors.text.primary,
										legendFontSize: 12,
									},
									{
										name: `Coûts estimés  ${(100 - (data.marginPercent ?? 70)).toFixed(0)}%`,
										population: Math.max(data.costs, 0.01),
										color: "#EF4444",
										legendFontColor: THEME.colors.text.primary,
										legendFontSize: 12,
									},
								]}
								width={screenWidth - 96}
								height={200}
								chartConfig={chartConfig}
								accessor="population"
								backgroundColor="transparent"
								paddingLeft="10"
								absolute
								style={{ marginVertical: 8, borderRadius: THEME.radius.lg }}
							/>
							<View style={{ flexDirection: "row", justifyContent: "space-around", marginTop: 8 }}>
								<Text style={{ color: "#22C55E", fontSize: 13, fontWeight: "600" }}>
									✅ Marge : {data.grossMargin?.toFixed(2)}€
								</Text>
								<Text style={{ color: "#EF4444", fontSize: 13, fontWeight: "600" }}>
									📉 Coûts : {data.costs?.toFixed(2)}€
								</Text>
							</View>
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
