/**
 * 📥 NotificationInbox - Centre de notifications du serveur
 *
 * Affiche toutes les notifications (messages clients, paiements, etc.)
 * avec onglets "Tous" / "Non lus" et temps écoulé en temps réel.
 *
 * Design moderne avec bottom sheet et animations fluides.
 */

import React, {
	useState,
	useEffect,
	useCallback,
	useMemo,
	useRef,
} from "react";
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	Modal,
	Animated,
	Dimensions,
	FlatList,
	StatusBar,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useNotificationStore, {
	NOTIFICATION_TYPES,
	getElapsedTime,
} from "../../src/stores/useNotificationStore";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.75;

// 🎨 Configuration des types de notification
const TYPE_CONFIG = {
	[NOTIFICATION_TYPES.MESSAGE]: {
		icon: "chatbubble-ellipses",
		gradient: ["#667eea", "#764ba2"],
		label: "Message",
	},
	[NOTIFICATION_TYPES.PAYMENT]: {
		icon: "card",
		gradient: ["#22c55e", "#16a34a"],
		label: "Paiement",
	},
	[NOTIFICATION_TYPES.ORDER]: {
		icon: "receipt",
		gradient: ["#f59e0b", "#d97706"],
		label: "Commande",
	},
	[NOTIFICATION_TYPES.SYSTEM]: {
		icon: "information-circle",
		gradient: ["#6b7280", "#4b5563"],
		label: "Système",
	},
};

// 📦 Composant d'une notification
const NotificationItem = React.memo(({ item, onPress }) => {
	const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.MESSAGE;
	const [elapsedTime, setElapsedTime] = useState(
		getElapsedTime(item.timestamp),
	);

	// Mise à jour du temps écoulé chaque seconde
	useEffect(() => {
		const interval = setInterval(() => {
			setElapsedTime(getElapsedTime(item.timestamp));
		}, 1000);

		return () => clearInterval(interval);
	}, [item.timestamp]);

	return (
		<TouchableOpacity
			style={[styles.notificationItem, !item.read && styles.unreadItem]}
			onPress={() => onPress(item)}
			activeOpacity={0.7}
		>
			{/* Indicateur non lu */}
			{!item.read && <View style={styles.unreadIndicator} />}

			{/* Icône */}
			<LinearGradient colors={config.gradient} style={styles.itemIcon}>
				<Ionicons name={config.icon} size={18} color="#fff" />
			</LinearGradient>

			{/* Contenu */}
			<View style={styles.itemContent}>
				<View style={styles.itemHeader}>
					<Text style={styles.itemTitle} numberOfLines={1}>
						{item.title || config.label}
					</Text>
					<Text style={styles.itemTime}>{elapsedTime}</Text>
				</View>

				{/* Info table */}
				{item.tableNumber && (
					<View style={styles.tableInfo}>
						<Ionicons name="restaurant" size={12} color="#667eea" />
						<Text style={styles.tableText}>Table {item.tableNumber}</Text>
						{item.guestName && (
							<>
								<Text style={styles.dotSeparator}>•</Text>
								<Text style={styles.guestName}>{item.guestName}</Text>
							</>
						)}
					</View>
				)}

				<Text style={styles.itemMessage} numberOfLines={2}>
					{item.message}
				</Text>
			</View>
		</TouchableOpacity>
	);
});

NotificationItem.displayName = "NotificationItem";

// 📭 Écran vide
const EmptyState = ({ isFiltered }) => (
	<View style={styles.emptyContainer}>
		<LinearGradient
			colors={["rgba(102, 126, 234, 0.15)", "rgba(118, 75, 162, 0.15)"]}
			style={styles.emptyIconContainer}
		>
			<Ionicons name="notifications-off-outline" size={48} color="#667eea" />
		</LinearGradient>
		<Text style={styles.emptyTitle}>
			{isFiltered ? "Aucune notification non lue" : "Aucune notification"}
		</Text>
		<Text style={styles.emptySubtitle}>
			{isFiltered
				? "Vous avez lu toutes vos notifications"
				: "Les notifications apparaîtront ici"}
		</Text>
	</View>
);

// 🔔 Composant principal
const NotificationInbox = () => {
	const insets = useSafeAreaInsets();
	const {
		isInboxOpen,
		closeInbox,
		notifications,
		unreadCount,
		markAsRead,
		markAllAsRead,
	} = useNotificationStore();

	// Onglet actif
	const [activeTab, setActiveTab] = useState("all");

	// Animations
	const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
	const backdropOpacity = useRef(new Animated.Value(0)).current;

	// Filtrage des notifications
	const filteredNotifications = useMemo(() => {
		if (activeTab === "unread") {
			return notifications.filter((n) => !n.read);
		}
		return notifications;
	}, [notifications, activeTab]);

	// Animation d'ouverture/fermeture
	useEffect(() => {
		if (isInboxOpen) {
			Animated.parallel([
				Animated.spring(slideAnim, {
					toValue: 0,
					friction: 10,
					tension: 65,
					useNativeDriver: true,
				}),
				Animated.timing(backdropOpacity, {
					toValue: 1,
					duration: 300,
					useNativeDriver: true,
				}),
			]).start();
		} else {
			Animated.parallel([
				Animated.spring(slideAnim, {
					toValue: SHEET_HEIGHT,
					friction: 10,
					useNativeDriver: true,
				}),
				Animated.timing(backdropOpacity, {
					toValue: 0,
					duration: 200,
					useNativeDriver: true,
				}),
			]).start();
		}
	}, [isInboxOpen, slideAnim, backdropOpacity]);

	// Gestion du clic sur une notification
	const handleNotificationPress = useCallback(
		(notification) => {
			if (!notification.read) {
				markAsRead(notification.id);
			}
			// TODO: Ouvrir le détail ou naviguer vers la table
			console.log("📬 Notification clicked:", notification.id);
		},
		[markAsRead],
	);

	// Rendu d'une notification
	const renderNotification = useCallback(
		({ item }) => (
			<NotificationItem item={item} onPress={handleNotificationPress} />
		),
		[handleNotificationPress],
	);

	// Key extractor
	const keyExtractor = useCallback((item) => item.id, []);

	if (!isInboxOpen) return null;

	return (
		<Modal
			visible={isInboxOpen}
			transparent
			animationType="none"
			statusBarTranslucent
			onRequestClose={closeInbox}
		>
			<StatusBar barStyle="light-content" />

			{/* Backdrop */}
			<Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
				<TouchableOpacity
					style={StyleSheet.absoluteFill}
					onPress={closeInbox}
					activeOpacity={1}
				/>
			</Animated.View>

			{/* Bottom Sheet */}
			<Animated.View
				style={[
					styles.sheet,
					{
						transform: [{ translateY: slideAnim }],
						paddingBottom: insets.bottom,
					},
				]}
			>
				<BlurView intensity={95} tint="dark" style={styles.sheetBlur}>
					{/* Handle */}
					<View style={styles.handleContainer}>
						<View style={styles.handle} />
					</View>

					{/* Header */}
					<View style={styles.header}>
						<View style={styles.headerLeft}>
							<Text style={styles.headerTitle}>Notifications</Text>
							{unreadCount > 0 && (
								<View style={styles.badgeContainer}>
									<Text style={styles.badgeText}>{unreadCount}</Text>
								</View>
							)}
						</View>

						<View style={styles.headerActions}>
							{unreadCount > 0 && (
								<TouchableOpacity
									style={styles.markAllButton}
									onPress={markAllAsRead}
									activeOpacity={0.7}
								>
									<Text style={styles.markAllText}>Tout marquer lu</Text>
								</TouchableOpacity>
							)}
							<TouchableOpacity
								style={styles.closeHeaderButton}
								onPress={closeInbox}
								activeOpacity={0.7}
							>
								<Ionicons name="close" size={24} color="#fff" />
							</TouchableOpacity>
						</View>
					</View>

					{/* Tabs */}
					<View style={styles.tabsContainer}>
						<TouchableOpacity
							style={[styles.tab, activeTab === "all" && styles.activeTab]}
							onPress={() => setActiveTab("all")}
							activeOpacity={0.7}
						>
							<Text
								style={[
									styles.tabText,
									activeTab === "all" && styles.activeTabText,
								]}
							>
								Tous
							</Text>
							<Text style={styles.tabCount}>{notifications.length}</Text>
						</TouchableOpacity>

						<TouchableOpacity
							style={[styles.tab, activeTab === "unread" && styles.activeTab]}
							onPress={() => setActiveTab("unread")}
							activeOpacity={0.7}
						>
							<Text
								style={[
									styles.tabText,
									activeTab === "unread" && styles.activeTabText,
								]}
							>
								Non lus
							</Text>
							{unreadCount > 0 && (
								<View style={styles.tabBadge}>
									<Text style={styles.tabBadgeText}>{unreadCount}</Text>
								</View>
							)}
						</TouchableOpacity>
					</View>

					{/* Liste des notifications */}
					<FlatList
						data={filteredNotifications}
						renderItem={renderNotification}
						keyExtractor={keyExtractor}
						contentContainerStyle={[
							styles.listContent,
							filteredNotifications.length === 0 && styles.emptyList,
						]}
						showsVerticalScrollIndicator={false}
						ListEmptyComponent={
							<EmptyState isFiltered={activeTab === "unread"} />
						}
						initialNumToRender={10}
						maxToRenderPerBatch={10}
						windowSize={5}
					/>

					{/* Footer */}
					<View style={styles.footer}>
						<TouchableOpacity
							style={styles.viewAllButton}
							onPress={() => {
								// TODO: Naviguer vers l'historique complet
								console.log("📜 View all messages");
							}}
							activeOpacity={0.7}
						>
							<Ionicons name="chatbubbles-outline" size={18} color="#667eea" />
							<Text style={styles.viewAllText}>Voir tous les messages</Text>
							<Ionicons name="chevron-forward" size={18} color="#667eea" />
						</TouchableOpacity>
					</View>
				</BlurView>
			</Animated.View>
		</Modal>
	);
};

const styles = StyleSheet.create({
	backdrop: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: "rgba(0, 0, 0, 0.6)",
	},
	sheet: {
		position: "absolute",
		bottom: 0,
		left: 0,
		right: 0,
		height: SHEET_HEIGHT,
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		overflow: "hidden",
	},
	sheetBlur: {
		flex: 1,
		backgroundColor: "rgba(20, 20, 35, 0.95)",
	},
	handleContainer: {
		alignItems: "center",
		paddingVertical: 12,
	},
	handle: {
		width: 40,
		height: 4,
		backgroundColor: "rgba(255, 255, 255, 0.3)",
		borderRadius: 2,
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 20,
		paddingBottom: 16,
		borderBottomWidth: 1,
		borderBottomColor: "rgba(255, 255, 255, 0.1)",
	},
	headerLeft: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
	},
	headerTitle: {
		fontSize: 22,
		fontWeight: "700",
		color: "#fff",
	},
	badgeContainer: {
		backgroundColor: "#ef4444",
		minWidth: 24,
		height: 24,
		borderRadius: 12,
		justifyContent: "center",
		alignItems: "center",
		paddingHorizontal: 8,
	},
	badgeText: {
		fontSize: 12,
		fontWeight: "700",
		color: "#fff",
	},
	headerActions: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
	},
	markAllButton: {
		paddingVertical: 6,
		paddingHorizontal: 12,
		backgroundColor: "rgba(102, 126, 234, 0.2)",
		borderRadius: 8,
		borderWidth: 1,
		borderColor: "rgba(102, 126, 234, 0.3)",
	},
	markAllText: {
		fontSize: 12,
		fontWeight: "600",
		color: "#667eea",
	},
	closeHeaderButton: {
		padding: 4,
	},
	tabsContainer: {
		flexDirection: "row",
		paddingHorizontal: 20,
		paddingVertical: 12,
		gap: 8,
	},
	tab: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 8,
		paddingHorizontal: 16,
		borderRadius: 20,
		backgroundColor: "rgba(255, 255, 255, 0.08)",
		gap: 6,
	},
	activeTab: {
		backgroundColor: "rgba(102, 126, 234, 0.25)",
		borderWidth: 1,
		borderColor: "rgba(102, 126, 234, 0.4)",
	},
	tabText: {
		fontSize: 14,
		fontWeight: "500",
		color: "rgba(255, 255, 255, 0.6)",
	},
	activeTabText: {
		color: "#fff",
		fontWeight: "600",
	},
	tabCount: {
		fontSize: 12,
		color: "rgba(255, 255, 255, 0.4)",
	},
	tabBadge: {
		backgroundColor: "#ef4444",
		minWidth: 18,
		height: 18,
		borderRadius: 9,
		justifyContent: "center",
		alignItems: "center",
		paddingHorizontal: 5,
	},
	tabBadgeText: {
		fontSize: 10,
		fontWeight: "700",
		color: "#fff",
	},
	listContent: {
		paddingHorizontal: 16,
		paddingTop: 8,
		paddingBottom: 16,
	},
	emptyList: {
		flex: 1,
		justifyContent: "center",
	},
	notificationItem: {
		flexDirection: "row",
		alignItems: "flex-start",
		padding: 14,
		marginBottom: 8,
		backgroundColor: "rgba(255, 255, 255, 0.05)",
		borderRadius: 14,
		borderWidth: 1,
		borderColor: "rgba(255, 255, 255, 0.08)",
		gap: 12,
	},
	unreadItem: {
		backgroundColor: "rgba(102, 126, 234, 0.1)",
		borderColor: "rgba(102, 126, 234, 0.2)",
	},
	unreadIndicator: {
		position: "absolute",
		top: 14,
		left: 8,
		width: 6,
		height: 6,
		borderRadius: 3,
		backgroundColor: "#667eea",
	},
	itemIcon: {
		width: 36,
		height: 36,
		borderRadius: 10,
		justifyContent: "center",
		alignItems: "center",
	},
	itemContent: {
		flex: 1,
	},
	itemHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 4,
	},
	itemTitle: {
		fontSize: 14,
		fontWeight: "600",
		color: "#fff",
		flex: 1,
		marginRight: 8,
	},
	itemTime: {
		fontSize: 12,
		color: "rgba(255, 255, 255, 0.5)",
		fontFeatureSettings: "'tnum'",
	},
	tableInfo: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 4,
		gap: 4,
	},
	tableText: {
		fontSize: 12,
		fontWeight: "600",
		color: "#667eea",
	},
	dotSeparator: {
		fontSize: 10,
		color: "rgba(255, 255, 255, 0.3)",
	},
	guestName: {
		fontSize: 12,
		color: "rgba(255, 255, 255, 0.6)",
	},
	itemMessage: {
		fontSize: 13,
		color: "rgba(255, 255, 255, 0.7)",
		lineHeight: 18,
	},
	emptyContainer: {
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 40,
	},
	emptyIconContainer: {
		width: 80,
		height: 80,
		borderRadius: 40,
		justifyContent: "center",
		alignItems: "center",
		marginBottom: 16,
	},
	emptyTitle: {
		fontSize: 17,
		fontWeight: "600",
		color: "#fff",
		marginBottom: 6,
	},
	emptySubtitle: {
		fontSize: 14,
		color: "rgba(255, 255, 255, 0.5)",
		textAlign: "center",
	},
	footer: {
		paddingHorizontal: 20,
		paddingVertical: 16,
		borderTopWidth: 1,
		borderTopColor: "rgba(255, 255, 255, 0.1)",
	},
	viewAllButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 14,
		backgroundColor: "rgba(102, 126, 234, 0.15)",
		borderRadius: 12,
		borderWidth: 1,
		borderColor: "rgba(102, 126, 234, 0.25)",
		gap: 8,
	},
	viewAllText: {
		fontSize: 15,
		fontWeight: "600",
		color: "#667eea",
	},
});

export default NotificationInbox;
