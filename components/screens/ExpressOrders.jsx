/**
 * 🏃 ExpressOrders.jsx - Commandes Express pour Le Grillz
 * Interface spéciale pour afficher toutes les commandes avec interaction rapide
 * ⚡ WebSocket en temps réel pour les commandes CLIENT-end
 * ✅ Mode sélection multiple pour suppression groupée
 */
import React, { useEffect, useCallback, useState } from "react";
import {
	View,
	Text,
	StyleSheet,
	FlatList,
	TouchableOpacity,
	Alert,
	ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../hooks/useTheme";
import useSocket from "../../hooks/useSocket";
import useExpressOrdersStore from "../../src/stores/useExpressOrdersStore";

const ExpressOrderCard = React.memo(
	({
		order,
		onToggleStatus,
		onDeleteOrder,
		onMarkMade,
		THEME,
		selectionMode,
		isSelected,
		onToggleSelection,
	}) => {
		// ⚡ Utiliser le statut d'urgence de la commande directement
		const isUrgent = order.isUrgent || false;

		// ⏰ Temps écoulé depuis la création de la commande
		const [timeElapsed, setTimeElapsed] = useState("");

		useEffect(() => {
			const updateElapsedTime = () => {
				const now = new Date();
				const created = new Date(order.createdAt);
				const diffMs = now - created;
				const diffMins = Math.floor(diffMs / 60000);
				const diffHours = Math.floor(diffMins / 60);

				if (diffMins < 60) {
					setTimeElapsed(`${diffMins}min`);
				} else {
					const mins = diffMins % 60;
					setTimeElapsed(`${diffHours}h${mins > 0 ? ` ${mins}min` : ""}`);
				}
			};

			// Mise à jour initiale et interval de 30 secondes
			updateElapsedTime();
			const interval = setInterval(updateElapsedTime, 30000);

			return () => clearInterval(interval);
		}, [order.createdAt]);

		const handleDoublePress = useCallback(() => {
			if (selectionMode) {
				onToggleSelection(order._id);
			} else {
				onToggleStatus(order._id);
			}
		}, [order._id, onToggleStatus, selectionMode, onToggleSelection]);

		// ⭐⭐ Gestion du long press pour marquer comme préparé
		const handleLongPress = useCallback(() => {
			if (!selectionMode) {
				const clientName = order.clientName || "Client";
				onMarkMade(order._id, clientName);
			}
		}, [order._id, order.clientName, onMarkMade, selectionMode]);

		const totalAmount = order.items.reduce(
			(sum, item) => sum + item.price * item.quantity,
			0,
		);
		const creatorName =
			order.serverId?.name ||
			(order.origin === "client" && order.clientName
				? order.clientName
				: "Client");

		// 💰 Statut de paiement
		const isPaid = order.paid || order.paymentStatus === "paid";

		// 🧮 Calculer le nombre total d'articles
		const totalItems = order.items.reduce(
			(sum, item) => sum + item.quantity,
			0,
		);

		// 🕐 Format de l'heure de création
		const createdTime = new Date(order.createdAt).toLocaleTimeString("fr-FR", {
			hour: "2-digit",
			minute: "2-digit",
		});

		return (
			<TouchableOpacity
				onPress={handleDoublePress}
				onLongPress={handleLongPress}
				delayLongPress={800}
				style={[
					styles.orderCard,
					{
						backgroundColor: isSelected
							? THEME.mode === "dark"
								? "#1A3A1A" // Vert foncé pour sélection en dark
								: "#E8F5E9" // Vert clair pour sélection en light
							: isUrgent
								? THEME.mode === "dark"
									? "#0A0505" // Quasi-noir avec nuance rouge pour urgence en dark
									: "#FFE5E5" // Rouge clair pour urgence en light
								: THEME.mode === "dark"
									? "#050A12" // Quasi-noir avec nuance bleue pour normal en dark
									: "#E5F3FF", // Bleu clair pour normal en light
						borderColor: isSelected
							? "#4CAF50" // Vert pour sélection
							: isUrgent
								? "#FF4444" // Rouge vif
								: "#0066CC", // Bleu vif
						borderWidth: isSelected || isUrgent ? 3 : 2, // Bordure plus épaisse si sélectionné ou urgent
					},
				]}
				activeOpacity={0.8}
			>
				{/* Checkbox en mode sélection */}
				{selectionMode && (
					<View style={styles.checkboxContainer}>
						<Ionicons
							name={isSelected ? "checkbox" : "square-outline"}
							size={28}
							color={
								isSelected
									? "#4CAF50"
									: THEME.mode === "dark"
										? "#9E9E9E"
										: "#666666"
							}
						/>
					</View>
				)}
				{/* Header avec nom créateur */}
				<View style={styles.cardHeader}>
					<View style={styles.creatorSection}>
						<Text
							style={[
								styles.creatorName,
								{
									color: THEME.mode === "dark" ? "#FFFFFF" : "#1A1A1A",
								},
							]}
						>
							{creatorName}
						</Text>
						{isUrgent && <Text style={styles.urgentLabel}>🔥 URGENT</Text>}
					</View>
					<View style={styles.badgeGroup}>
						{/* Badge nombre d'articles */}
						<View
							style={[
								styles.itemCountBadge,
								{ backgroundColor: THEME.colors.primary.amber },
							]}
						>
							<Text style={styles.itemCountText}>{totalItems}</Text>
						</View>
						{/* Badge statut urgence */}
						<View
							style={[
								styles.urgentBadge,
								{ backgroundColor: isUrgent ? "#FF4444" : "#0066CC" },
							]}
						>
							<Ionicons
								name={isUrgent ? "flash" : "timer-outline"}
								size={12}
								color="#FFFFFF"
							/>
						</View>
					</View>
				</View>

				{/* Timestamps et statut de paiement */}
				<View style={styles.timeSection}>
					<View style={styles.timeInfo}>
						<Ionicons
							name="time-outline"
							size={14}
							color={THEME.mode === "dark" ? "#9E9E9E" : "#666666"}
						/>
						<Text
							style={[
								styles.timeText,
								{ color: THEME.mode === "dark" ? "#9E9E9E" : "#666666" },
							]}
						>
							{createdTime} • {timeElapsed}
						</Text>
					</View>
					<View style={styles.paymentStatus}>
						<Ionicons
							name={isPaid ? "checkmark-circle" : "time-outline"}
							size={14}
							color={isPaid ? "#4CAF50" : "#FF9800"}
						/>
						<Text
							style={[
								styles.paymentText,
								{ color: isPaid ? "#4CAF50" : "#FF9800" },
							]}
						>
							{isPaid ? "Payé" : "Non payé"}
						</Text>
					</View>
				</View>

				{/* Détails téléphone client */}
				<View style={styles.tableInfo}>
					<Ionicons
						name="call-outline"
						size={14}
						color={THEME.mode === "dark" ? "#9E9E9E" : "#666666"}
					/>
					<Text
						style={[
							styles.tableText,
							{ color: THEME.mode === "dark" ? "#9E9E9E" : "#666666" },
						]}
					>
						📱 {order.clientPhone || "N/A"}
					</Text>
				</View>

				{/* Liste des items */}
				<View style={styles.itemsList}>
					{order.items.map((item, index) => (
						<View key={index} style={styles.itemRow}>
							<Text
								style={[
									styles.itemQuantity,
									{
										color:
											THEME.mode === "dark"
												? "#FFA500"
												: THEME.colors.primary.amber,
									},
								]}
							>
								{item.quantity}x
							</Text>
							<Text
								style={[
									styles.itemName,
									{ color: THEME.mode === "dark" ? "#FFFFFF" : "#1A1A1A" },
								]}
								numberOfLines={1}
							>
								{item.name}
							</Text>
							<Text
								style={[
									styles.itemPrice,
									{ color: THEME.mode === "dark" ? "#E0E0E0" : "#333333" },
								]}
							>
								{item.price.toFixed(2)}€
							</Text>
						</View>
					))}
				</View>

				{/* Footer avec total */}
				<View style={styles.cardFooter}>
					<Text
						style={[
							styles.totalLabel,
							{ color: THEME.mode === "dark" ? "#9E9E9E" : "#666666" },
						]}
					>
						Total:
					</Text>
					<Text
						style={[
							styles.totalAmount,
							{
								color: isUrgent
									? "#FF4444"
									: THEME.mode === "dark"
										? "#FFA500"
										: "#FF6B35",
								fontWeight: isUrgent ? "900" : "700",
							},
						]}
					>
						{totalAmount.toFixed(2)}€
					</Text>
				</View>

				{/* Indicateur d'action */}
				{!selectionMode && (
					<View style={styles.actionHint}>
						<Text
							style={[
								styles.hintText,
								{ color: THEME.mode === "dark" ? "#757575" : "#999999" },
							]}
						>
							{isUrgent
								? "🔄 Tap pour marquer terminé"
								: "⚡ Tap pour marquer urgent"}
						</Text>
					</View>
				)}
			</TouchableOpacity>
		);
	},
);

ExpressOrderCard.displayName = "ExpressOrderCard";

export default function ExpressOrders() {
	const THEME = useTheme();
	const socket = useSocket(); // ⚡ WebSocket connection

	// 📋 État pour la sélection multiple
	const [selectionMode, setSelectionMode] = useState(false);
	const [selectedOrders, setSelectedOrders] = useState(new Set());

	// ⚡ Zustand store pour les commandes express
	const {
		expressOrders,
		isLoading,
		fetchExpressOrders,
		toggleOrderUrgency,
		dismissOrder,
		markOrderMade,
		markMultipleOrdersMade,
		attachSocketListener,
	} = useExpressOrdersStore();

	// ⚡ Attacher les listeners WebSocket au montage
	// ⚠️ Dépendances: [socket] uniquement - attachSocketListener est une fonction Zustand
	// qui change de référence à chaque update, ce qui causerait un render loop infini
	useEffect(() => {
		let cleanup = null;

		if (socket) {
			cleanup = attachSocketListener(socket);
		}

		return () => {
			if (cleanup) {
				cleanup();
			}
		};
	}, [socket]);

	// ⚡ Charger les commandes initiales au montage
	// ⚠️ Dépendances: [] (mount uniquement) - fetchExpressOrders est une fonction Zustand
	// qui change de référence à chaque update, ce qui causerait un render loop infini
	useEffect(() => {
		fetchExpressOrders();
	}, []);

	// Handler pour changer l'urgence d'une commande
	const handleToggleOrderStatus = useCallback(
		async (orderId) => {
			console.log("[TOGGLE] Urgence commande", orderId);
			const result = await toggleOrderUrgency(orderId);
			if (!result.success) {
				Alert.alert("Erreur", "Impossible de changer le statut");
			}
		},
		[toggleOrderUrgency],
	);

	// Suppression Handler pour supprimer une commande
	const handleDeleteOrder = useCallback(
		async (orderId) => {
			console.log("[DELETE] Suppression commande", orderId);
			const result = await dismissOrder(orderId);
			if (!result.success) {
				Alert.alert("Erreur", "Impossible de supprimer la commande");
			}
		},
		[dismissOrder],
	);

	// ⭐⭐ Handler pour marquer une commande comme préparée (long press)
	const handleMarkOrderMade = useCallback(
		(orderId, orderName) => {
			Alert.alert(
				"Commande préparée",
				`Marquer la commande de ${orderName} comme préparée ?`,
				[
					{
						text: "Annuler",
						style: "cancel",
					},
					{
						text: "Oui, elle est prête",
						onPress: async () => {
							const result = await markOrderMade(orderId);
							if (!result.success) {
								Alert.alert("Erreur", "Impossible de marquer la commande");
							}
						},
					},
				],
				{ cancelable: true },
			);
		},
		[markOrderMade],
	);

	// ⭐⭐ Handler pour marquer plusieurs commandes comme préparées
	const handleMarkSelectedOrdersMade = useCallback(async () => {
		if (selectedOrders.size === 0) return;

		Alert.alert(
			"Commandes préparées",
			`Marquer ${selectedOrders.size} commande(s) comme préparées ?`,
			[
				{
					text: "Annuler",
					style: "cancel",
				},
				{
					text: "Oui, elles sont prêtes",
					onPress: async () => {
						const orderIds = Array.from(selectedOrders);
						const result = await markMultipleOrdersMade(orderIds);
						if (result.success) {
							setSelectedOrders(new Set());
							setSelectionMode(false);
						} else {
							Alert.alert("Erreur", "Impossible de marquer les commandes");
						}
					},
				},
			],
			{ cancelable: true },
		);
	}, [selectedOrders, markMultipleOrdersMade]);

	// 📋 Handlers pour la sélection multiple
	const toggleSelectionMode = useCallback(() => {
		setSelectionMode((prev) => !prev);
		setSelectedOrders(new Set()); // Réinitialiser les sélections
	}, []);

	const toggleOrderSelection = useCallback((orderId) => {
		setSelectedOrders((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(orderId)) {
				newSet.delete(orderId);
			} else {
				newSet.add(orderId);
			}
			return newSet;
		});
	}, []);

	const handleDeleteSelected = useCallback(async () => {
		if (selectedOrders.size === 0) return;

		Alert.alert(
			"Supprimer les commandes",
			`Voulez-vous vraiment supprimer ${selectedOrders.size} commande(s) ?`,
			[
				{
					text: "Annuler",
					style: "cancel",
				},
				{
					text: "Supprimer",
					style: "destructive",
					onPress: async () => {
						const orderIds = Array.from(selectedOrders);
						for (const orderId of orderIds) {
							await dismissOrder(orderId);
						}
						setSelectedOrders(new Set());
						setSelectionMode(false);
					},
				},
			],
			{ cancelable: true },
		);
	}, [selectedOrders, dismissOrder]);

	const renderOrder = useCallback(
		({ item }) => (
			<ExpressOrderCard
				order={item}
				onToggleStatus={handleToggleOrderStatus}
				onDeleteOrder={handleDeleteOrder}
				onMarkMade={handleMarkOrderMade}
				THEME={THEME}
				selectionMode={selectionMode}
				isSelected={selectedOrders.has(item._id)}
				onToggleSelection={toggleOrderSelection}
			/>
		),
		[
			handleToggleOrderStatus,
			handleDeleteOrder,
			handleMarkOrderMade,
			THEME,
			selectionMode,
			selectedOrders,
			toggleOrderSelection,
		],
	);

	if (isLoading) {
		return (
			<View style={[styles.container, styles.loadingContainer]}>
				<ActivityIndicator size="large" color={THEME.colors.primary.amber} />
				<Text
					style={[
						styles.loadingText,
						{ color: THEME.mode === "dark" ? "#9E9E9E" : "#666666" },
					]}
				>
					Chargement des commandes express...
				</Text>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			{/* Header */}
			<LinearGradient
				colors={[THEME.colors.background.card, THEME.colors.background.dark]}
				style={styles.header}
			>
				<View style={styles.headerContent}>
					<View style={styles.headerLeft}>
						<Ionicons
							name="flash"
							size={24}
							color={THEME.colors.primary.amber}
						/>
						<Text style={[styles.headerTitle, { color: "#FFFFFF" }]}>
							{selectionMode
								? `${selectedOrders.size} sélectionnée(s)`
								: "Commandes Express"}
						</Text>
					</View>
					<View style={styles.headerActions}>
						<TouchableOpacity
							onPress={toggleSelectionMode}
							style={[
								styles.actionButton,
								selectionMode && styles.activeActionButton,
							]}
						>
							<Ionicons
								name={selectionMode ? "close" : "checkmark-circle-outline"}
								size={20}
								color={
									selectionMode
										? "#4CAF50"
										: THEME.mode === "dark"
											? "#9E9E9E"
											: "#666666"
								}
							/>
						</TouchableOpacity>
						<TouchableOpacity
							onPress={() => fetchExpressOrders(true)}
							style={styles.actionButton}
						>
							<Ionicons
								name="refresh"
								size={20}
								color={THEME.mode === "dark" ? "#9E9E9E" : "#666666"}
							/>
						</TouchableOpacity>
						{/* ⭐⭐ Bouton "Marquer comme préparé" en mode sélection */}
						{selectionMode && selectedOrders.size > 0 && (
							<TouchableOpacity
								onPress={handleMarkSelectedOrdersMade}
								style={[
									styles.actionButton,
									{
										backgroundColor: "#4CAF50",
										paddingHorizontal: 12,
										borderRadius: 8,
									},
								]}
							>
								<Ionicons name="checkmark-done" size={20} color="#FFFFFF" />
								<Text style={{ color: "#FFFFFF", fontSize: 12, marginLeft: 4 }}>
									Préparé
								</Text>
							</TouchableOpacity>
						)}
					</View>
				</View>
			</LinearGradient>

			{/* Liste des commandes */}
			{expressOrders.length === 0 ? (
				<View style={styles.emptyContainer}>
					<Ionicons
						name="flash-off-outline"
						size={48}
						color={THEME.mode === "dark" ? "#666666" : "#999999"}
					/>
					<Text
						style={[
							styles.emptyText,
							{ color: THEME.mode === "dark" ? "#9E9E9E" : "#666666" },
						]}
					>
						Aucune commande express
					</Text>
					<Text
						style={[
							styles.emptySubtext,
							{ color: THEME.mode === "dark" ? "#757575" : "#999999" },
						]}
					>
						Les commandes CLIENT-end apparaîtront ici
					</Text>
				</View>
			) : (
				<FlatList
					data={expressOrders}
					renderItem={renderOrder}
					keyExtractor={(item) => item._id}
					contentContainerStyle={styles.listContainer}
					showsVerticalScrollIndicator={false}
					refreshing={isLoading}
					onRefresh={() => fetchExpressOrders(true)}
					numColumns={2}
					columnWrapperStyle={styles.row}
				/>
			)}

			{/* Barre d'actions en mode sélection */}
			{selectionMode && selectedOrders.size > 0 && (
				<View
					style={[
						styles.selectionBar,
						{ backgroundColor: THEME.colors.background.card },
					]}
				>
					<TouchableOpacity
						onPress={handleDeleteSelected}
						style={styles.deleteButton}
					>
						<Ionicons name="trash" size={20} color="#FFFFFF" />
						<Text style={styles.deleteButtonText}>
							Supprimer ({selectedOrders.size})
						</Text>
					</TouchableOpacity>
				</View>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#FFFFFF",
	},
	loadingContainer: {
		justifyContent: "center",
		alignItems: "center",
	},
	loadingText: {
		marginTop: 12,
		fontSize: 14,
	},
	header: {
		paddingHorizontal: 20,
		paddingVertical: 16,
		borderBottomWidth: 1,
		borderBottomColor: "rgba(255, 255, 255, 0.1)",
	},
	headerContent: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	headerActions: {
		flexDirection: "row",
		gap: 12,
	},
	headerLeft: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	headerTitle: {
		fontSize: 18,
		fontWeight: "bold",
	},
	actionButton: {
		padding: 8,
		borderRadius: 8,
	},
	activeActionButton: {
		backgroundColor: "rgba(76, 175, 80, 0.1)",
	},
	emptyContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: 32,
	},
	emptyText: {
		fontSize: 16,
		fontWeight: "600",
		marginTop: 16,
	},
	emptySubtext: {
		fontSize: 14,
		marginTop: 8,
		textAlign: "center",
	},
	listContainer: {
		padding: 12,
		paddingBottom: 100,
	},
	row: {
		justifyContent: "space-between",
		gap: 12,
	},
	orderCard: {
		flex: 1,
		maxWidth: "48%",
		minWidth: "48%",
		borderRadius: 12,
		padding: 12,
		marginBottom: 12,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
	},
	checkboxContainer: {
		position: "absolute",
		top: 8,
		right: 8,
		zIndex: 10,
		backgroundColor: "rgba(255, 255, 255, 0.9)",
		borderRadius: 6,
		padding: 4,
	},
	cardHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "flex-start",
		marginBottom: 8,
	},
	creatorSection: {
		flex: 1,
	},
	creatorName: {
		fontSize: 16,
		fontWeight: "bold",
		marginBottom: 4,
	},
	urgentLabel: {
		fontSize: 12,
		color: "#FF4444",
		fontWeight: "bold",
	},
	badgeGroup: {
		flexDirection: "row",
		gap: 6,
	},
	itemCountBadge: {
		minWidth: 24,
		height: 24,
		borderRadius: 12,
		justifyContent: "center",
		alignItems: "center",
		paddingHorizontal: 6,
	},
	itemCountText: {
		fontSize: 12,
		color: "#FFFFFF",
		fontWeight: "bold",
	},
	urgentBadge: {
		width: 24,
		height: 24,
		borderRadius: 12,
		justifyContent: "center",
		alignItems: "center",
	},
	timeSection: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginBottom: 8,
	},
	timeInfo: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
	},
	timeText: {
		fontSize: 12,
	},
	paymentStatus: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
	},
	paymentText: {
		fontSize: 12,
		fontWeight: "600",
	},
	tableInfo: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
		marginBottom: 8,
	},
	tableText: {
		fontSize: 12,
	},
	itemsList: {
		marginVertical: 8,
	},
	itemRow: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 4,
		gap: 6,
	},
	itemQuantity: {
		fontSize: 14,
		fontWeight: "bold",
		minWidth: 30,
	},
	itemName: {
		flex: 1,
		fontSize: 14,
	},
	itemPrice: {
		fontSize: 14,
		fontWeight: "600",
	},
	cardFooter: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginTop: 8,
		paddingTop: 8,
		borderTopWidth: 1,
		borderTopColor: "rgba(0, 0, 0, 0.1)",
	},
	totalLabel: {
		fontSize: 14,
	},
	totalAmount: {
		fontSize: 18,
		fontWeight: "700",
	},
	actionHint: {
		marginTop: 6,
		alignItems: "center",
	},
	hintText: {
		fontSize: 11,
		fontStyle: "italic",
	},
	selectionBar: {
		position: "absolute",
		bottom: 0,
		left: 0,
		right: 0,
		paddingVertical: 16,
		paddingHorizontal: 20,
		borderTopWidth: 1,
		borderTopColor: "rgba(255, 255, 255, 0.1)",
		alignItems: "center",
	},
	deleteButton: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		backgroundColor: "#FF4444",
		paddingVertical: 12,
		paddingHorizontal: 32,
		borderRadius: 12,
	},
	deleteButtonText: {
		color: "#FFFFFF",
		fontSize: 16,
		fontWeight: "600",
	},
});
