/**
 * 📨 MessagingScreen - Écran principal de messagerie interne
 * Affiche tous les messages reçus par le serveur
 */
import React, { useCallback, useMemo, useState, useEffect } from "react";
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	FlatList,
	RefreshControl,
	Alert,
	Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../hooks/useTheme";
import { useMessages } from "../../hooks/useMessages";
import MessageCard from "../../components/messaging/MessageCard";
import LoadingSkeleton from "../../components/dashboard/LoadingSkeleton";

export default function MessagingScreen({ onClose }) {
	const THEME = useTheme();
	const {
		messages,
		unreadCount,
		isLoading,
		error,
		featureAvailable,
		fetchMessages,
		respondToMessage,
		deleteMessage,
		markAsRead,
		fetchUnreadCount,
		retryConnection,
	} = useMessages();

	const [refreshing, setRefreshing] = useState(false);
	const [statusFilter, setStatusFilter] = useState("pending"); // pending, accepted, rejected, all
	const [sortOrder, setSortOrder] = useState("newest"); // newest, oldest
	const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false); // ⭐ Évite les recharges infinies

	const wrapInModal = (body) => {
		if (!onClose) return body;
		return (
			<Modal visible={true} animationType="slide" presentationStyle="pageSheet">
				<View
					style={[
						styles.modalContainer,
						{ backgroundColor: THEME.colors.background.dark },
					]}
				>
					<View
						style={[
							styles.modalHeader,
							{
								backgroundColor: THEME.colors.background.card,
								borderBottomColor: THEME.colors.border.subtle,
							},
						]}
					>
						<Text
							style={[styles.modalTitle, { color: THEME.colors.text.primary }]}
						>
							📨 Messagerie Interne
						</Text>
						<TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
							<Ionicons
								name="close"
								size={22}
								color={THEME.colors.text.primary}
							/>
						</TouchableOpacity>
					</View>
					{body}
				</View>
			</Modal>
		);
	};

	// Charger les messages au montage (UNE SEULE FOIS)
	const loadMessages = useCallback(async () => {
		if (!featureAvailable || hasAttemptedLoad) return; // ⛔ BLOQUER SI DÉJÀ ESSAYÉ
		setHasAttemptedLoad(true);
		await fetchMessages(statusFilter);
	}, [fetchMessages, statusFilter, featureAvailable, hasAttemptedLoad]);

	// ⚠️ useEffect se déclenche UNE SEULE FOIS au montage (pas de deps featureAvailable)
	useEffect(() => {
		loadMessages();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []); // ⭐ Array vide = UNE SEULE FOIS au montage

	const handleRefresh = useCallback(async () => {
		setRefreshing(true);
		// ⭐ Si feature indisponible, réinitialiser pour réessayer
		if (!featureAvailable) {
			retryConnection();
			setHasAttemptedLoad(false); // Permet de recharger
		}
		await Promise.all([loadMessages(), fetchUnreadCount()]);
		setRefreshing(false);
	}, [loadMessages, fetchUnreadCount, featureAvailable, retryConnection]);

	// Handlers
	const handleAccept = useCallback(
		async (messageId) => {
			const success = await respondToMessage(messageId, "accepted");
			if (success) {
				Alert.alert("Succès", "Message accepté ✅");
			} else {
				Alert.alert("Erreur", "Impossible d'accepter le message");
			}
		},
		[respondToMessage],
	);

	const handleReject = useCallback(
		async (messageId) => {
			const success = await respondToMessage(messageId, "rejected");
			if (success) {
				Alert.alert("Succès", "Message refusé ❌");
			} else {
				Alert.alert("Erreur", "Impossible de refuser le message");
			}
		},
		[respondToMessage],
	);

	const handleDelete = useCallback(
		async (messageId) => {
			const success = await deleteMessage(messageId);
			if (success) {
				Alert.alert("Succès", "Message supprimé 🗑️");
			} else {
				Alert.alert("Erreur", "Impossible de supprimer le message");
			}
		},
		[deleteMessage],
	);

	// Messages triés
	const sortedMessages = useMemo(() => {
		const sorted = [...messages];
		if (sortOrder === "newest") {
			sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
		} else {
			sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
		}
		return sorted;
	}, [messages, sortOrder]);

	// Statistiques
	const stats = useMemo(() => {
		return {
			total: messages.length,
			pending: messages.filter((m) => m.status === "pending").length,
			accepted: messages.filter((m) => m.status === "accepted").length,
			rejected: messages.filter((m) => m.status === "rejected").length,
		};
	}, [messages]);

	// ⛔ Fonctionnalité non disponible (backend non déployé)
	if (!featureAvailable) {
		return wrapInModal(
			<View
				style={[
					styles.container,
					{
						backgroundColor: THEME.colors.background,
						justifyContent: "center",
						alignItems: "center",
						padding: THEME.spacing["2xl"],
					},
				]}
			>
				<Ionicons
					name="server-outline"
					size={64}
					color={THEME.colors.text.muted}
					style={{ marginBottom: THEME.spacing.lg }}
				/>
				<Text
					style={[
						styles.emptyText,
						{
							fontSize: THEME.typography.sizes.lg,
							color: THEME.colors.text.primary,
							marginBottom: THEME.spacing.md,
						},
					]}
				>
					Messagerie interne indisponible
				</Text>
				<Text
					style={[
						styles.emptySubtext,
						{
							textAlign: "center",
							fontSize: THEME.typography.sizes.sm,
							color: THEME.colors.text.muted,
							marginBottom: THEME.spacing.xl,
						},
					]}
				>
					Les routes backend doivent être déployées sur Render.{"\n"}
					Effectue un git commit + push pour activer cette fonctionnalité.
				</Text>

				{/* Bouton Réessayer */}
				<TouchableOpacity
					onPress={() => {
						retryConnection();
						setHasAttemptedLoad(false);
						loadMessages();
					}}
					style={{
						backgroundColor: THEME.colors.primary.amber,
						paddingVertical: THEME.spacing.md,
						paddingHorizontal: THEME.spacing.xl,
						borderRadius: THEME.radius.lg,
						flexDirection: "row",
						alignItems: "center",
						gap: THEME.spacing.sm,
					}}
				>
					<Ionicons name="reload" size={20} color="#fff" />
					<Text
						style={{
							color: "#fff",
							fontSize: THEME.typography.sizes.base,
							fontWeight: "600",
						}}
					>
						Réessayer
					</Text>
				</TouchableOpacity>
			</View>,
		);
	}

	// Chargement
	if (isLoading && !messages.length) {
		return wrapInModal(
			<View
				style={[styles.container, { backgroundColor: THEME.colors.background }]}
			>
				<LoadingSkeleton theme={THEME} />
			</View>,
		);
	}

	// Rendu vide
	if (!isLoading && !messages.length) {
		return wrapInModal(
			<View
				style={[styles.container, { backgroundColor: THEME.colors.background }]}
			>
				{/* Header */}
				<LinearGradient
					colors={THEME.gradients?.primary || ["#F59E0B", "#FBBF24"]}
					style={styles.header}
				>
					<Text style={styles.headerTitle}>📨 Messages</Text>
					<Text style={styles.headerSubtitle}>
						Aucun message pour le moment
					</Text>
				</LinearGradient>

				{/* Empty state */}
				<View style={styles.emptyContainer}>
					<Ionicons
						name="mail-outline"
						size={64}
						color={THEME.colors.text.secondary}
					/>
					<Text
						style={[styles.emptyTitle, { color: THEME.colors.text.primary }]}
					>
						Boîte vide
					</Text>
					<Text
						style={[styles.emptyText, { color: THEME.colors.text.secondary }]}
					>
						Vous recevrez les messages de coaching, les changements de planning
						et les réunions ici.
					</Text>
				</View>
			</View>,
		);
	}

	return wrapInModal(
		<View
			style={[styles.container, { backgroundColor: THEME.colors.background }]}
		>
			{/* Header avec stats */}
			<LinearGradient
				colors={THEME.gradients?.primary || ["#F59E0B", "#FBBF24"]}
				style={styles.header}
			>
				<View style={styles.headerTop}>
					<View>
						<Text style={styles.headerTitle}>📨 Messages</Text>
						<Text style={styles.headerSubtitle}>
							{stats.total} message{stats.total > 1 ? "s" : ""}
						</Text>
					</View>
					{unreadCount > 0 && (
						<View style={styles.badge}>
							<Text style={styles.badgeText}>{unreadCount}</Text>
						</View>
					)}
				</View>

				{/* Stats cards */}
				<View style={styles.statsRow}>
					<View
						style={[
							styles.statCard,
							{ backgroundColor: "rgba(255,255,255,0.15)" },
						]}
					>
						<Ionicons name="time" size={16} color=`THEME.colors.text.primary` />
						<Text style={styles.statValue}>{stats.pending}</Text>
						<Text style={styles.statLabel}>En attente</Text>
					</View>
					<View
						style={[
							styles.statCard,
							{ backgroundColor: "rgba(255,255,255,0.15)" },
						]}
					>
						<Ionicons name="checkmark-circle" size={16} color=`THEME.colors.text.primary` />
						<Text style={styles.statValue}>{stats.accepted}</Text>
						<Text style={styles.statLabel}>Acceptés</Text>
					</View>
					<View
						style={[
							styles.statCard,
							{ backgroundColor: "rgba(255,255,255,0.15)" },
						]}
					>
						<Ionicons name="close-circle" size={16} color=`THEME.colors.text.primary` />
						<Text style={styles.statValue}>{stats.rejected}</Text>
						<Text style={styles.statLabel}>Refusés</Text>
					</View>
				</View>
			</LinearGradient>

			{/* Filtres et tri */}
			<View style={styles.controls}>
				{/* Filtre status */}
				<View style={styles.filterRow}>
					<Text
						style={[styles.filterLabel, { color: THEME.colors.text.secondary }]}
					>
						Status:
					</Text>
					{["pending", "accepted", "rejected", "all"].map((status) => (
						<TouchableOpacity
							key={status}
							onPress={() => setStatusFilter(status)}
							style={[
								styles.filterButton,
								statusFilter === status && styles.filterButtonActive,
								{
									backgroundColor:
										statusFilter === status
											? THEME.colors.primary.amber
											: THEME.colors.background.elevated,
									borderColor:
										statusFilter === status
											? THEME.colors.primary.amber
											: "transparent",
								},
							]}
						>
							<Text
								style={[
									styles.filterButtonText,
									statusFilter === status && styles.filterButtonTextActive,
									{
										color:
											statusFilter === status
												? `THEME.colors.text.primary`
												: THEME.colors.text.secondary,
									},
								]}
							>
								{status === "all"
									? "Tous"
									: status === "pending"
										? "En attente"
										: status === "accepted"
											? "Acceptés"
											: "Refusés"}
							</Text>
						</TouchableOpacity>
					))}
				</View>

				{/* Tri */}
				<View style={styles.sortRow}>
					<TouchableOpacity
						onPress={() =>
							setSortOrder(sortOrder === "newest" ? "oldest" : "newest")
						}
						style={[
							styles.sortButton,
							{ backgroundColor: THEME.colors.background.elevated },
						]}
					>
						<Ionicons
							name={
								sortOrder === "newest"
									? "arrow-down-outline"
									: "arrow-up-outline"
							}
							size={16}
							color={THEME.colors.primary.amber}
						/>
						<Text
							style={[
								styles.sortButtonText,
								{ color: THEME.colors.text.secondary },
							]}
						>
							{sortOrder === "newest" ? "Plus récents" : "Plus anciens"}
						</Text>
					</TouchableOpacity>
				</View>
			</View>

			{/* Error banner */}
			{error && (
				<View style={styles.errorBanner}>
					<Ionicons name="warning-outline" size={18} color=`THEME.colors.danger` />
					<Text style={styles.errorText}>{error}</Text>
				</View>
			)}

			{/* Messages list */}
			<FlatList
				data={sortedMessages}
				keyExtractor={(item) => item._id}
				renderItem={({ item, index }) => (
					<MessageCard
						message={item}
						onAccept={handleAccept}
						onReject={handleReject}
						onDelete={handleDelete}
						onMarkRead={markAsRead}
						compact={true}
						animationDelay={index * 50}
					/>
				)}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={handleRefresh}
						colors={[THEME.colors.primary.amber]}
						tintColor={THEME.colors.primary.amber}
					/>
				}
				contentContainerStyle={styles.listContent}
				showsVerticalScrollIndicator={false}
			/>
		</View>,
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	modalContainer: {
		flex: 1,
	},
	modalHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		padding: 16,
		borderBottomWidth: 1,
	},
	modalTitle: {
		fontSize: 22,
		fontWeight: "700",
	},
	modalCloseButton: {
		padding: 8,
	},
	header: {
		paddingTop: 60,
		paddingBottom: 20,
		paddingHorizontal: 16,
	},
	headerTop: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "flex-start",
		marginBottom: 16,
	},
	headerTitle: {
		fontSize: 28,
		fontWeight: "bold",
		color: `THEME.colors.text.primary`,
		marginBottom: 4,
	},
	headerSubtitle: {
		fontSize: 14,
		color: `THEME.colors.text.secondary + "80"`,
	},
	badge: {
		backgroundColor: `THEME.colors.danger`,
		width: 28,
		height: 28,
		borderRadius: 14,
		alignItems: "center",
		justifyContent: "center",
	},
	badgeText: {
		color: `THEME.colors.text.primary`,
		fontSize: 12,
		fontWeight: "bold",
	},
	statsRow: {
		flexDirection: "row",
		gap: 8,
	},
	statCard: {
		flex: 1,
		alignItems: "center",
		paddingVertical: 10,
		borderRadius: 12,
	},
	statValue: {
		fontSize: 16,
		fontWeight: "bold",
		color: `THEME.colors.text.primary`,
		marginTop: 2,
	},
	statLabel: {
		fontSize: 10,
		color: `THEME.colors.text.secondary + "80"`,
		marginTop: 2,
	},
	controls: {
		paddingHorizontal: 16,
		paddingVertical: 12,
		gap: 10,
	},
	filterRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		flexWrap: "wrap",
	},
	filterLabel: {
		fontSize: 13,
		fontWeight: "600",
	},
	filterButton: {
		paddingVertical: 6,
		paddingHorizontal: 10,
		borderRadius: 8,
		borderWidth: 1,
	},
	filterButtonActive: {
		borderColor: "transparent",
	},
	filterButtonText: {
		fontSize: 11,
		fontWeight: "600",
	},
	filterButtonTextActive: {
		color: `THEME.colors.text.primary`,
	},
	sortRow: {
		flexDirection: "row",
		justifyContent: "flex-end",
	},
	sortButton: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 6,
		paddingHorizontal: 10,
		borderRadius: 8,
		gap: 6,
	},
	sortButtonText: {
		fontSize: 12,
		fontWeight: "500",
	},
	errorBanner: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		marginHorizontal: 16,
		marginVertical: 8,
		paddingHorizontal: 12,
		paddingVertical: 10,
		backgroundColor: "rgba(239, 68, 68, 0.1)",
		borderLeftColor: `THEME.colors.danger`,
		borderLeftWidth: 3,
		borderRadius: 8,
	},
	errorText: {
		flex: 1,
		fontSize: 12,
		color: `THEME.colors.danger`,
	},
	emptyContainer: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 32,
	},
	emptyTitle: {
		fontSize: 20,
		fontWeight: "bold",
		marginTop: 16,
		marginBottom: 8,
	},
	emptyText: {
		fontSize: 14,
		textAlign: "center",
		lineHeight: 20,
	},
	listContent: {
		paddingVertical: 12,
	},
});
