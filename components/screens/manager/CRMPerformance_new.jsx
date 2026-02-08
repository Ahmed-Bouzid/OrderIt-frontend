/**
 * 📊 CRM Performance - Module de gestion d'équipe
 * Interface complète pour analyser les performances des serveurs,
 * optimiser le service et coacher les équipes
 *
 * Accessible uniquement aux admins et managers
 */
import React, {
	useState,
	useCallback,
	useRef,
	useMemo,
	useEffect,
} from "react";
import {
	View,
	Text,
	StyleSheet,
	Animated,
	TouchableOpacity,
	Alert,
	ScrollView,
	RefreshControl,
	Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

// Hooks et stores
import useUserStore from "../../../src/stores/useUserStore";
import useThemeStore from "../../../src/stores/useThemeStore";
import { useTheme } from "../../../hooks/useTheme";
import { useCRMData } from "../../../hooks/useCRMData";
import { useCRMActions } from "../../../hooks/useCRMActions";

// Composants CRM spécialisés
import {
	KPICard,
	ServerCard,
	PerformanceChart,
	LeaderboardSection,
	RecommendationsPanel,
} from "../../crm";

export default function CRMPerformance({ onClose }) {
	// ─────────────── Hooks (toujours appelés en premier) ───────────────
	const THEME = useTheme();
	const isManager = useUserStore((state) => state.checkIsManager());

	// États et données
	const [selectedPeriod, setSelectedPeriod] = useState("week");
	const [selectedTab, setSelectedTab] = useState("dashboard");
	const [refreshing, setRefreshing] = useState(false);

	// Animation
	const fadeAnim = useRef(new Animated.Value(0)).current;
	const slideAnim = useRef(new Animated.Value(100)).current;

	// Hooks CRM personnalisés
	const { dashboard, servers, leaderboard, isLoading, error, refreshData } =
		useCRMData(selectedPeriod);

	const { sendCoachingAlert } = useCRMActions();

	// Styles
	const styles = useMemo(() => createStyles(THEME), [THEME]);

	// ─────────────── Effets ───────────────
	useEffect(() => {
		// Animation d'entrée
		Animated.parallel([
			Animated.timing(fadeAnim, {
				toValue: 1,
				duration: 300,
				useNativeDriver: true,
			}),
			Animated.timing(slideAnim, {
				toValue: 0,
				duration: 400,
				useNativeDriver: true,
			}),
		]).start();
	}, [fadeAnim, slideAnim]);

	// ─────────────── Handlers ───────────────
	const handleRefresh = useCallback(async () => {
		setRefreshing(true);
		await refreshData();
		setRefreshing(false);
	}, [refreshData]);

	const handlePeriodChange = useCallback((period) => {
		setSelectedPeriod(period);
	}, []);

	const handleTabChange = useCallback((tab) => {
		setSelectedTab(tab);
	}, []);

	const handleCoachingActionPress = useCallback(
		(recommendation) => {
			Alert.alert(
				"Action de Coaching",
				`Voulez-vous envoyer une recommandation de coaching à ${recommendation.serverName} ?`,
				[
					{ text: "Annuler" },
					{
						text: "Envoyer",
						onPress: async () => {
							try {
								await sendCoachingAlert(recommendation);
								Alert.alert("Envoyé", "La recommandation a été envoyée");
							} catch (_error) {
								Alert.alert("Erreur", "Impossible d'envoyer la recommandation");
							}
						},
					},
				],
			);
		},
		[sendCoachingAlert],
	);

	const handleServerPress = useCallback((server) => {
		// Navigation vers les détails du serveur
		console.log("Afficher détails serveur:", server.name);
	}, []);

	const handleContactPress = useCallback((server) => {
		Alert.alert("Contact", `Contacter ${server.name}?`, [
			{ text: "Annuler", style: "cancel" },
			{
				text: "Message",
				onPress: () => console.log("Envoyer message à", server.name),
			},
		]);
	}, []);

	const markCoachingCompleted = useCallback(
		async (recommendationId, notes = "") => {
			try {
				console.log("Marqué comme complété:", recommendationId, notes);
				Alert.alert("Succès", "Coaching marqué comme complété");
			} catch (_error) {
				Alert.alert("Erreur", "Impossible de marquer comme complété");
			}
		},
		[],
	);

	// ─────────────── Validation d'accès ───────────────
	if (!isManager) {
		return (
			<Modal visible={true} animationType="slide" presentationStyle="pageSheet">
				<View
					style={[
						styles.container,
						{ backgroundColor: THEME.colors.background },
					]}
				>
					<View style={styles.header}>
						<Text
							style={[styles.headerTitle, { color: THEME.colors.text.primary }]}
						>
							📊 CRM Performance
						</Text>
						<TouchableOpacity onPress={onClose} style={styles.closeButton}>
							<Ionicons
								name="close"
								size={24}
								color={THEME.colors.text.primary}
							/>
						</TouchableOpacity>
					</View>
					<View style={styles.accessDenied}>
						<Ionicons
							name="lock-closed"
							size={64}
							color={THEME.colors.text.secondary}
						/>
						<Text
							style={[styles.accessTitle, { color: THEME.colors.text.primary }]}
						>
							Accès Réservé
						</Text>
						<Text
							style={[
								styles.accessText,
								{ color: THEME.colors.text.secondary },
							]}
						>
							Ce module est réservé aux administrateurs et managers.
						</Text>
					</View>
				</View>
			</Modal>
		);
	}

	// ─────────────── Composants utilitaires ───────────────
	const TabButton = ({ id, icon, label, isActive }) => (
		<TouchableOpacity
			style={[styles.tabButton, isActive && styles.tabButtonActive]}
			onPress={() => handleTabChange(id)}
		>
			<Ionicons
				name={icon}
				size={20}
				color={isActive ? "#FFFFFF" : "#6B7280"}
			/>
			<Text
				style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}
			>
				{label}
			</Text>
		</TouchableOpacity>
	);

	const PeriodSelector = () => (
		<View style={styles.periodSelector}>
			{["today", "week", "month", "quarter"].map((period) => (
				<TouchableOpacity
					key={period}
					style={[
						styles.periodButton,
						selectedPeriod === period && styles.periodButtonActive,
					]}
					onPress={() => handlePeriodChange(period)}
				>
					<Text
						style={[
							styles.periodButtonText,
							selectedPeriod === period && styles.periodButtonTextActive,
						]}
					>
						{getPeriodLabel(period)}
					</Text>
				</TouchableOpacity>
			))}
		</View>
	);

	// ─────────────── Rendu des onglets ───────────────
	const renderDashboard = () => (
		<ScrollView
			style={styles.tabContent}
			refreshControl={
				<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
			}
		>
			{/* KPI Principales */}
			<View style={styles.kpiSection}>
				<Text
					style={[styles.sectionTitle, { color: THEME.colors.text.primary }]}
				>
					📈 Indicateurs Clés
				</Text>
				<View style={styles.kpiRow}>
					<KPICard
						title="Commandes"
						value={dashboard?.kpi?.totalOrders || 0}
						trend={dashboard?.trends?.ordersGrowth || 0}
						icon="receipt-outline"
						color="primary"
						animationDelay={0}
						loading={isLoading}
					/>
					<KPICard
						title="Chiffre d'Affaires"
						value={dashboard?.kpi?.totalRevenue || 0}
						unit="€"
						trend={dashboard?.trends?.revenueGrowth || 0}
						icon="cash-outline"
						color="success"
						animationDelay={100}
						loading={isLoading}
					/>
				</View>
				<View style={styles.kpiRow}>
					<KPICard
						title="Temps Moyen"
						value={Math.round(dashboard?.kpi?.averageServiceTime || 0)}
						unit="min"
						trend={dashboard?.trends?.serviceTimeGrowth || 0}
						icon="time-outline"
						color="warning"
						animationDelay={200}
						loading={isLoading}
					/>
					<KPICard
						title="Serveurs Actifs"
						value={dashboard?.kpi?.activeServers || 0}
						icon="people-outline"
						color="info"
						animationDelay={300}
						loading={isLoading}
					/>
				</View>
			</View>

			{/* Graphique principal */}
			<View style={styles.chartSection}>
				<Text
					style={[styles.sectionTitle, { color: THEME.colors.text.primary }]}
				>
					📊 Performance Globale
				</Text>
				<PerformanceChart
					data={dashboard?.charts?.ordersTimeline || []}
					type="line"
					title="Évolution des Commandes"
					subtitle={`Période: ${getPeriodLabel(selectedPeriod)}`}
					color="#F59E0B"
					height={220}
					showLegend={true}
					loading={isLoading}
					animationDelay={400}
				/>
			</View>

			{/* Top Performers */}
			<View style={styles.performersSection}>
				<Text
					style={[styles.sectionTitle, { color: THEME.colors.text.primary }]}
				>
					🏆 Meilleurs Performers
				</Text>
				{(dashboard?.kpi?.topPerformers || []).map((performer, index) => (
					<ServerCard
						key={performer.serverId}
						server={performer}
						compact={true}
						showActions={false}
						animationDelay={500 + index * 100}
						onPress={() => handleServerPress?.(performer)}
					/>
				))}
			</View>
		</ScrollView>
	);

	const renderServers = () => (
		<ScrollView
			style={styles.tabContent}
			refreshControl={
				<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
			}
		>
			<View style={styles.serversSection}>
				<Text
					style={[styles.sectionTitle, { color: THEME.colors.text.primary }]}
				>
					👥 Analyse par Serveur
				</Text>
				{(servers?.servers || []).map((server, index) => (
					<ServerCard
						key={server._id}
						server={server}
						showActions={true}
						compact={false}
						animationDelay={index * 100}
						onPress={() => handleServerPress?.(server)}
						onCoachingPress={() => handleCoachingActionPress?.(server)}
						onContactPress={() => handleContactPress?.(server)}
					/>
				))}
			</View>

			{/* Recommandations */}
			{servers?.recommendations && servers.recommendations.length > 0 && (
				<RecommendationsPanel
					recommendations={servers.recommendations}
					onSendAlert={sendCoachingAlert}
					onMarkCompleted={markCoachingCompleted}
					loading={isLoading}
					animationDelay={500}
				/>
			)}
		</ScrollView>
	);

	const renderLeaderboard = () => (
		<ScrollView
			style={styles.tabContent}
			refreshControl={
				<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
			}
		>
			<LeaderboardSection
				servers={leaderboard?.leaderboard || []}
				period={selectedPeriod}
				metric="totalRevenue"
				onServerPress={handleServerPress}
				loading={isLoading}
				animationDelay={0}
			/>
		</ScrollView>
	);

	const renderTrends = () => (
		<ScrollView
			style={styles.tabContent}
			refreshControl={
				<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
			}
		>
			<View style={styles.trendsSection}>
				<Text
					style={[styles.sectionTitle, { color: THEME.colors.text.primary }]}
				>
					📈 Tendances & Évolutions
				</Text>
				{/* TODO: Implémenter graphiques de tendances */}
				<View style={styles.comingSoon}>
					<Ionicons name="construct-outline" size={40} color="#9CA3AF" />
					<Text style={styles.comingSoonText}>
						Graphiques de tendances à venir
					</Text>
				</View>
			</View>
		</ScrollView>
	);

	// ─────────────── Rendu principal ───────────────
	return (
		<Modal visible={true} animationType="slide" presentationStyle="pageSheet">
			<Animated.View
				style={[
					styles.container,
					{ backgroundColor: THEME.colors.background, opacity: fadeAnim },
				]}
			>
				{/* Header avec gradient */}
				<LinearGradient
					colors={["#F59E0B", "#FBBF24"]}
					style={styles.header}
					start={{ x: 0, y: 0 }}
					end={{ x: 1, y: 1 }}
				>
					<View style={styles.headerContent}>
						<View>
							<Text style={styles.headerTitle}>📊 CRM Performance</Text>
							<Text style={styles.headerSubtitle}>Analyse des équipes</Text>
						</View>
						<View style={styles.headerActions}>
							<TouchableOpacity
								onPress={handleRefresh}
								style={styles.headerButton}
							>
								<Ionicons name="refresh-outline" size={20} color="#FFFFFF" />
							</TouchableOpacity>
							<TouchableOpacity onPress={onClose} style={styles.closeButton}>
								<Ionicons name="close" size={24} color="#FFFFFF" />
							</TouchableOpacity>
						</View>
					</View>

					{/* Sélecteur de période */}
					<PeriodSelector />

					{/* Navigation par onglets */}
					<View style={styles.tabNavigation}>
						<TabButton
							id="dashboard"
							icon="analytics-outline"
							label="Dashboard"
							isActive={selectedTab === "dashboard"}
						/>
						<TabButton
							id="servers"
							icon="people-outline"
							label="Serveurs"
							isActive={selectedTab === "servers"}
						/>
						<TabButton
							id="leaderboard"
							icon="trophy-outline"
							label="Classement"
							isActive={selectedTab === "leaderboard"}
						/>
						<TabButton
							id="trends"
							icon="trending-up-outline"
							label="Tendances"
							isActive={selectedTab === "trends"}
						/>
					</View>
				</LinearGradient>

				{/* Contenu */}
				<View style={styles.content}>
					{error && (
						<View style={styles.errorBanner}>
							<Ionicons name="warning-outline" size={20} color="#F59E0B" />
							<Text style={styles.errorText}>{error}</Text>
						</View>
					)}

					{isLoading && (
						<View style={styles.loadingContainer}>
							<Ionicons name="hourglass-outline" size={32} color="#F59E0B" />
							<Text style={styles.loadingText}>Chargement des données...</Text>
						</View>
					)}

					{!isLoading && selectedTab === "dashboard" && renderDashboard()}
					{!isLoading && selectedTab === "servers" && renderServers()}
					{!isLoading && selectedTab === "leaderboard" && renderLeaderboard()}
					{!isLoading && selectedTab === "trends" && renderTrends()}
				</View>
			</Animated.View>
		</Modal>
	);
}

// ─────────────── Utilitaires ───────────────
function getPeriodLabel(period) {
	const labels = {
		today: "Aujourd'hui",
		week: "Semaine",
		month: "Mois",
		quarter: "Trimestre",
	};
	return labels[period] || "Semaine";
}

// ─────────────── Styles ───────────────
const createStyles = (THEME) =>
	StyleSheet.create({
		container: {
			flex: 1,
		},
		header: {
			paddingTop: 60,
			paddingBottom: 20,
			paddingHorizontal: 20,
		},
		headerContent: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			marginBottom: 20,
		},
		headerTitle: {
			fontSize: 24,
			fontWeight: "700",
			color: "#FFFFFF",
			marginBottom: 4,
		},
		headerSubtitle: {
			fontSize: 14,
			color: "rgba(255, 255, 255, 0.8)",
		},
		headerActions: {
			flexDirection: "row",
			alignItems: "center",
		},
		headerButton: {
			width: 40,
			height: 40,
			borderRadius: 20,
			backgroundColor: "rgba(255, 255, 255, 0.2)",
			justifyContent: "center",
			alignItems: "center",
			marginRight: 12,
		},
		closeButton: {
			width: 40,
			height: 40,
			borderRadius: 20,
			backgroundColor: "rgba(255, 255, 255, 0.2)",
			justifyContent: "center",
			alignItems: "center",
		},

		// Period Selector
		periodSelector: {
			flexDirection: "row",
			backgroundColor: "rgba(255, 255, 255, 0.15)",
			borderRadius: 25,
			padding: 4,
			marginBottom: 20,
		},
		periodButton: {
			flex: 1,
			paddingVertical: 8,
			paddingHorizontal: 12,
			borderRadius: 20,
			alignItems: "center",
		},
		periodButtonActive: {
			backgroundColor: "rgba(255, 255, 255, 0.3)",
		},
		periodButtonText: {
			fontSize: 12,
			fontWeight: "500",
			color: "rgba(255, 255, 255, 0.7)",
		},
		periodButtonTextActive: {
			color: "#FFFFFF",
			fontWeight: "600",
		},

		// Tab Navigation
		tabNavigation: {
			flexDirection: "row",
			backgroundColor: "rgba(255, 255, 255, 0.15)",
			borderRadius: 16,
			padding: 4,
		},
		tabButton: {
			flex: 1,
			flexDirection: "column",
			alignItems: "center",
			paddingVertical: 8,
			borderRadius: 12,
		},
		tabButtonActive: {
			backgroundColor: "rgba(255, 255, 255, 0.3)",
		},
		tabButtonText: {
			fontSize: 10,
			fontWeight: "500",
			color: "#6B7280",
			marginTop: 4,
		},
		tabButtonTextActive: {
			color: "#FFFFFF",
			fontWeight: "600",
		},

		// Content
		content: {
			flex: 1,
			backgroundColor: THEME.colors.background,
		},
		tabContent: {
			flex: 1,
		},

		// Error
		errorBanner: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: "#FEF3C7",
			paddingHorizontal: 16,
			paddingVertical: 12,
			margin: 16,
			borderRadius: 8,
		},
		errorText: {
			fontSize: 14,
			color: "#92400E",
			marginLeft: 8,
			flex: 1,
		},

		// Loading
		loadingContainer: {
			flex: 1,
			justifyContent: "center",
			alignItems: "center",
			padding: 40,
		},
		loadingText: {
			fontSize: 16,
			color: THEME.colors.text.secondary,
			marginTop: 16,
		},

		// Sections
		kpiSection: {
			padding: 16,
		},
		sectionTitle: {
			fontSize: 18,
			fontWeight: "600",
			marginBottom: 16,
		},
		kpiRow: {
			flexDirection: "row",
			marginBottom: 12,
		},
		chartSection: {
			padding: 16,
			paddingTop: 0,
		},
		performersSection: {
			padding: 16,
			paddingTop: 0,
		},
		serversSection: {
			padding: 16,
		},
		trendsSection: {
			padding: 16,
		},
		comingSoon: {
			alignItems: "center",
			justifyContent: "center",
			padding: 40,
		},
		comingSoonText: {
			fontSize: 16,
			color: "#9CA3AF",
			marginTop: 12,
		},

		// Access Denied
		accessDenied: {
			flex: 1,
			justifyContent: "center",
			alignItems: "center",
			padding: 40,
		},
		accessTitle: {
			fontSize: 20,
			fontWeight: "600",
			marginTop: 16,
			marginBottom: 8,
		},
		accessText: {
			fontSize: 14,
			textAlign: "center",
		},
	});
