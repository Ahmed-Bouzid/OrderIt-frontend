/**
 * 📊 CRM Performance - Module de gestion d'équipe
 * Interface complète pour analyser les performances des serveurs,
 * optimiser le service et coacher les équipes
 *
 * Accessible uniquement aux admins et managers
 */
import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
	View,
	Text,
	StyleSheet,
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
	DonutChart,
} from "../../crm";
import ServerPerformanceDetail from "./ServerPerformanceDetail";
import { MessageForm } from "../../messaging";

export default function CRMPerformance({ onClose }) {
	// ─────────────── États et données (AVANT tout contrôle conditionnel) ───────────────
	const [selectedPeriod, setSelectedPeriod] = useState("week");
	const [selectedTab, setSelectedTab] = useState("dashboard");
	const [refreshing, setRefreshing] = useState(false);

	// État pour le profil individuel
	const [selectedServer, setSelectedServer] = useState(null);

	// État pour le formulaire de message
	const [showMessageForm, setShowMessageForm] = useState(false);
	const [messageFormServer, setMessageFormServer] = useState(null);

	// Hooks personnalisés CRM
	const { dashboard, servers, isLoading, error, refreshData } =
		useCRMData(selectedPeriod);

	const { sendCoachingAlert } = useCRMActions();

	// Hooks de thème et autorisation
	const THEME = useTheme();
	const isManager = useUserStore((state) => state.checkIsManager());

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

	const handleCoachingActionPress = useCallback((server) => {
		// Ouvrir le formulaire de message
		setMessageFormServer(server);
		setShowMessageForm(true);
	}, []);

	const handleServerPress = useCallback((server) => {
		// Ouvrir le profil détaillé du serveur
		setSelectedServer(server);
	}, []);

	const handleContactPress = useCallback((server) => {
		// Options de contact disponibles
		const contactOptions = [
			{
				text: "Appel",
				onPress: () => {
					// Copier le numéro de téléphone
					console.log("📱 Appel:", server.phone);
					Alert.alert(
						"Contact",
						`Appelez ${server?.name} au ${server?.phone || "N/A"}`,
					);
				},
			},
			{
				text: "SMS",
				onPress: () => {
					console.log("💬 SMS:", server.phone);
					Alert.alert("Message", `Envoyer un SMS à ${server?.name}`);
				},
			},
			{
				text: "Email",
				onPress: () => {
					console.log("📧 Email:", server.email);
					Alert.alert("Email", `Envoyer un email à ${server?.email || "N/A"}`);
				},
			},
			{
				text: "Annuler",
				style: "cancel",
			},
		];

		Alert.alert(
			"Contacter le Serveur",
			`Choose une méthode de contact pour ${server?.name}:`,
			contactOptions,
		);
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

				{/* Nouvelles métriques */}
				<View style={styles.kpiRow}>
					<KPICard
						title="Temps Attente Tampon"
						value={Math.round(dashboard?.kpi?.averageWaitTime || 0)}
						unit="min"
						icon="timer-outline"
						color="warning"
						animationDelay={350}
						loading={isLoading}
					/>
					<KPICard
						title="Satisfaction Client"
						value={(dashboard?.kpi?.customerSatisfaction || 0).toFixed(1)}
						unit="/5"
						icon="star-outline"
						color="success"
						animationDelay={400}
						loading={isLoading}
					/>
				</View>
			</View>

			{/* Graphiques Donut - Nouvelles métriques */}
			<View style={styles.donutSection}>
				<Text
					style={[styles.sectionTitle, { color: THEME.colors.text.primary }]}
				>
					📊 Analyse Détaillée
				</Text>

				{/* Répartition Réservations */}
				<View
					style={[
						styles.donutCard,
						{ backgroundColor: THEME.colors.background.elevated },
					]}
				>
					<DonutChart
						data={[
							{
								label: "Ouvertes",
								value: dashboard?.reservations?.open || 0,
								color: "#10B981",
							},
							{
								label: "Fermées",
								value: dashboard?.reservations?.closed || 0,
								color: "#6B7280",
							},
						]}
						size={180}
						strokeWidth={25}
						title="Réservations"
						centerLabel="Total"
						showLegend={true}
						animationDelay={500}
					/>
				</View>

				{/* Méthodes de Paiement */}
				<View
					style={[
						styles.donutCard,
						{ backgroundColor: THEME.colors.background.elevated },
					]}
				>
					<DonutChart
						data={[
							{
								label: "Espèces",
								value: dashboard?.payments?.cash || 0,
								color: "#F59E0B",
							},
							{
								label: "Carte Bancaire",
								value: dashboard?.payments?.card || 0,
								color: "#3B82F6",
							},
						]}
						size={180}
						strokeWidth={25}
						title="Méthodes de Paiement"
						centerValue={`${((dashboard?.payments?.cash || 0) + (dashboard?.payments?.card || 0)).toLocaleString()}€`}
						centerLabel="CA Total"
						showLegend={true}
						animationDelay={600}
					/>
				</View>

				{/* Produits Add-ons */}
				<View
					style={[
						styles.donutCard,
						{ backgroundColor: THEME.colors.background.elevated },
					]}
				>
					<DonutChart
						data={
							dashboard?.addOns || [
								{ label: "Add-ons", value: 0, color: "#8B5CF6" },
							]
						}
						size={180}
						strokeWidth={25}
						title="Produits Add-ons Vendus"
						centerLabel="Upsell"
						showLegend={true}
						animationDelay={700}
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
			<View
				style={[
					styles.container,
					{
						backgroundColor: THEME.colors.background,
					},
				]}
			>
					{/* Header - Identique à Messagerie/Compta */}
					<View style={[styles.header, { backgroundColor: THEME.colors.background.card, borderBottomColor: THEME.colors.border.subtle }]}>
						<Text style={[styles.headerTitle, { color: THEME.colors.text.primary }]}>📊 CRM Performance</Text>
						<TouchableOpacity onPress={onClose} style={styles.closeButton}>
							<Ionicons
								name="close"
								size={22}
								color={THEME.colors.text.primary}
							/>
						</TouchableOpacity>
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
							label="Tendances"
							isActive={selectedTab === "trends"}
						/>
					</View>
				</View>

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
			</View>

			{/* Profil détaillé d'un serveur */}
			{selectedServer && (
				<ServerPerformanceDetail
					server={selectedServer}
					onClose={() => setSelectedServer(null)}
				/>
			)}

			{/* Formulaire de message */}
			{showMessageForm && messageFormServer && (
				<MessageForm
					serverId={messageFormServer._id}
					serverName={messageFormServer.name}
					onClose={() => {
						setShowMessageForm(false);
						setMessageFormServer(null);
					}}
					onSuccess={() => {
						setShowMessageForm(false);
						setMessageFormServer(null);
						refreshData();
					}}
				/>
			)}
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
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			padding: 16,
			borderBottomWidth: 1,
		},
		headerTitle: {
			fontSize: 22,
			fontWeight: "700",
		},
		closeButton: {
			padding: 8,
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
			alignItems: "center",
		},
		periodButtonActive: {
			backgroundColor: THEME.colors.primary.amber,
		},
		periodButtonText: {
			fontSize: 12,
			fontWeight: "600",
			color: THEME.colors.text.secondary,
		},
		periodButtonTextActive: {
			color: "#FFFFFF",
		},
		tabNavigation: {
			flexDirection: "row",
			backgroundColor: THEME.colors.background.elevated,
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
			backgroundColor: THEME.colors.primary.amber,
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
			padding: 12,
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
		donutSection: {
			marginBottom: 20,
		},
		donutCard: {
			borderRadius: 16,
			padding: 20,
			marginBottom: 16,
			shadowColor: "#000",
			shadowOffset: { width: 0, height: 2 },
			shadowOpacity: 0.1,
			shadowRadius: 8,
			elevation: 3,
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
		}
		accessDenied: {
			flex: 1,
			alignItems: "center",
			justifyContent: "center",
			padding: 32,
		},
		accessTitle: {
			fontSize: 22,
			fontWeight: "700",
			marginTop: 16,
			marginBottom: 8,
		},
		accessText: {
			fontSize: 14,
			textAlign: "center",
			lineHeight: 20,
		},
		donutSection: {
			marginVertical: 12,
			paddingHorizontal: 0,
		},
		donutCard: {
			paddingVertical: 16,
			paddingHorizontal: 12,
			borderRadius: 12,
			marginBottom: 12,
			marginHorizontal: 12,
			alignItems: "center",
			justifyContent: "center",
			shadowColor: "#000",
			shadowOffset: { width: 0, height: 2 },
			shadowOpacity: 0.08,
			shadowRadius: 8,
			elevation: 3,
		},
	});
