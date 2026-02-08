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
import { useTheme } from "../../../hooks/useTheme";
import { useCRMData } from "../../../hooks/useCRMData";
import { useCRMActions } from "../../../hooks/useCRMActions";
// Composants UI
import LoadingSkeleton from "../../dashboard/LoadingSkeleton";
// Composants CRM spécialisés
import {
	KPICard,
	ServerCard,
	PerformanceChart,
	LeaderboardSection,
	RecommendationsPanel,
} from "../../crm";

export default function CRMPerformance({ onClose }) {
	// ─────────────── États et données (AVANT tout contrôle conditionnel) ───────────────
	const [selectedPeriod, setSelectedPeriod] = useState("week");
	const [selectedTab, setSelectedTab] = useState("dashboard");
	const [refreshing, setRefreshing] = useState(false);

	// Animation et hooks personnalisés
	const fadeAnim = useRef(new Animated.Value(0)).current;
	const slideAnim = useRef(new Animated.Value(100)).current;

	// Hooks personnalisés CRM
	const { dashboard, servers, isLoading, error, refreshData } =
		useCRMData(selectedPeriod);

	const { sendCoachingAlert } = useCRMActions();

	// Hooks de thème et autorisation
	const THEME = useTheme();
	const isManager = useUserStore((state) => state.checkIsManager());

	// Animation d'entrée
	useEffect(() => {
		Animated.parallel([
			Animated.timing(fadeAnim, {
				toValue: 1,
				duration: 300,
				useNativeDriver: true,
			}),
			Animated.timing(slideAnim, {
				toValue: 0,
				duration: 300,
				useNativeDriver: true,
			}),
		]).start();
	}, [fadeAnim, slideAnim]);

	// Callbacks
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
		async (recommendation) => {
			Alert.alert(
				"Action de Coaching",
				`Voulez-vous envoyer une alerte de coaching pour "${recommendation.title}" ?`,
				[
					{ text: "Annuler", style: "cancel" },
					{
						text: "Envoyer",
						onPress: async () => {
							try {
								await sendCoachingAlert(recommendation.serverId, {
									type: recommendation.type,
									message: recommendation.message,
									priority: recommendation.priority,
								});
							} catch (_error) {
								// Géré par le hook
							}
						},
					},
				],
			);
		},
		[sendCoachingAlert],
	);

	const handleServerPress = useCallback((server) => {
		// Navigation vers détails serveur
		console.log("📊 Navigation vers détails serveur:", server.id);
	}, []);

	const handleContactPress = useCallback((server) => {
		// Ouvrir modal de contact
		console.log("📨 Contact serveur:", server.name);
	}, []);

	const markCoachingCompleted = useCallback(
		async (recommendationId, notes = "") => {
			try {
				// Logic pour marquer as completed
				console.log("✅ Coaching terminé:", { recommendationId, notes });
			} catch (error) {
				console.error("Erreur coaching completion:", error);
			}
		},
		[],
	);

	const styles = useMemo(() => createStyles(THEME), [THEME]);

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
						<Text style={[styles.title, { color: THEME.colors.text.primary }]}>
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

	// ─────────────── Rendu du contenu principal ───────────────

	// ─────────────── Composants de navigation ───────────────
	const TabButton = ({ id, icon, label, isActive }) => (
		<TouchableOpacity
			style={[styles.tabButton, isActive && styles.tabButtonActive]}
			onPress={() => handleTabChange(id)}
		>
			<Ionicons
				name={icon}
				size={20}
				color={isActive ? "#FFFFFF" : THEME.colors.text.secondary}
			/>
			<Text
				style={[
					styles.tabButtonText,
					isActive && styles.tabButtonTextActive,
					{ color: isActive ? "#FFFFFF" : THEME.colors.text.secondary },
				]}
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
				servers={servers || []}
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
					<Ionicons
						name="trending-up"
						size={48}
						color={THEME.colors.text.secondary}
					/>
					<Text
						style={[
							styles.comingSoonText,
							{ color: THEME.colors.text.secondary },
						]}
					>
						Graphiques de tendances à venir
					</Text>
				</View>
			</View>
		</ScrollView>
	);

	// ─────────────── Rendu principal ───────────────
	if (isLoading && !dashboard) {
		return (
			<Modal visible={true} animationType="slide" presentationStyle="pageSheet">
				<View
					style={[
						styles.container,
						{ backgroundColor: THEME.colors.background },
					]}
				>
					<LoadingSkeleton theme={THEME} />
				</View>
			</Modal>
		);
	}

	return (
		<Modal visible={true} animationType="slide" presentationStyle="pageSheet">
			<Animated.View
				style={[
					styles.container,
					{
						backgroundColor: THEME.colors.background,
						opacity: fadeAnim,
						transform: [{ translateY: slideAnim }],
					},
				]}
			>
				{/* Header */}
				<LinearGradient
					colors={THEME.gradients?.primary || ["#F59E0B", "#FBBF24"]}
					style={styles.header}
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

					{selectedTab === "dashboard" && renderDashboard()}
					{selectedTab === "servers" && renderServers()}
					{selectedTab === "leaderboard" && renderLeaderboard()}
					{selectedTab === "trends" && renderTrends()}
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
			alignItems: "flex-start",
			marginBottom: 20,
		},
		headerTitle: {
			fontSize: 28,
			fontWeight: "bold",
			color: "#FFFFFF",
			marginBottom: 4,
		},
		headerSubtitle: {
			fontSize: 16,
			color: "rgba(255, 255, 255, 0.8)",
		},
		headerActions: {
			flexDirection: "row",
			alignItems: "center",
		},
		headerButton: {
			backgroundColor: "rgba(255, 255, 255, 0.2)",
			padding: 8,
			borderRadius: 12,
			marginRight: 12,
		},
		closeButton: {
			backgroundColor: "rgba(255, 255, 255, 0.2)",
			padding: 8,
			borderRadius: 12,
		},
		periodSelector: {
			flexDirection: "row",
			backgroundColor: "rgba(255, 255, 255, 0.1)",
			borderRadius: 16,
			padding: 4,
			marginBottom: 20,
		},
		periodButton: {
			flex: 1,
			paddingVertical: 10,
			paddingHorizontal: 16,
			borderRadius: 12,
			alignItems: "center",
		},
		periodButtonActive: {
			backgroundColor: "rgba(255, 255, 255, 0.2)",
		},
		periodButtonText: {
			fontSize: 14,
			fontWeight: "600",
			color: "rgba(255, 255, 255, 0.7)",
		},
		periodButtonTextActive: {
			color: "#FFFFFF",
		},
		tabNavigation: {
			flexDirection: "row",
			backgroundColor: "rgba(255, 255, 255, 0.1)",
			borderRadius: 16,
			padding: 4,
		},
		tabButton: {
			flex: 1,
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			paddingVertical: 12,
			paddingHorizontal: 8,
			borderRadius: 12,
		},
		tabButtonActive: {
			backgroundColor: "rgba(255, 255, 255, 0.2)",
		},
		tabButtonText: {
			fontSize: 12,
			fontWeight: "600",
			marginLeft: 4,
		},
		tabButtonTextActive: {
			color: "#FFFFFF",
		},
		content: {
			flex: 1,
		},
		tabContent: {
			flex: 1,
			paddingHorizontal: 20,
		},
		errorBanner: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: "#FEF3C7",
			paddingHorizontal: 16,
			paddingVertical: 12,
			marginHorizontal: 20,
			marginTop: 16,
			borderRadius: 12,
		},
		errorText: {
			fontSize: 14,
			color: "#92400E",
			marginLeft: 8,
			flex: 1,
		},
		sectionTitle: {
			fontSize: 20,
			fontWeight: "bold",
			marginBottom: 16,
			marginTop: 24,
		},
		kpiSection: {
			marginBottom: 20,
		},
		kpiRow: {
			flexDirection: "row",
			justifyContent: "space-between",
			marginBottom: 12,
		},
		chartSection: {
			marginBottom: 20,
		},
		performersSection: {
			marginBottom: 20,
		},
		serversSection: {
			marginBottom: 20,
		},
		trendsSection: {
			marginBottom: 20,
		},
		comingSoon: {
			alignItems: "center",
			paddingVertical: 40,
		},
		comingSoonText: {
			fontSize: 16,
			marginTop: 12,
		},
		accessDenied: {
			flex: 1,
			alignItems: "center",
			justifyContent: "center",
			paddingHorizontal: 40,
		},
		accessTitle: {
			fontSize: 24,
			fontWeight: "bold",
			marginTop: 20,
			marginBottom: 8,
		},
		accessText: {
			fontSize: 16,
			textAlign: "center",
			lineHeight: 24,
		},
	});
