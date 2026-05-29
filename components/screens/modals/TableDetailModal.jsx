/**
 * TableDetailModal.jsx — Détail table Comptoir
 *
 * Modal centrée (style ServerPickerModal) :
 *   Header : Table X · N pers. · Xmin  +  × fermer
 *   Status pill · Items envoyés · Cart · Total
 *   Actions 2×2
 */

import React, { useState, useMemo } from "react";
import {
	Modal,
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ScrollView,
	ActivityIndicator,
	Alert,
	Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../hooks/useTheme";
import useCounterTable from "../../../hooks/useCounterTable";
import MenuPickerModal from "./MenuPickerModal";
import EncaisserModal from "./EncaisserModal";

const IS_PHONE = Dimensions.get("window").width < 600;

// ─── Mapping statuts order → label affiché ───────────────────────────────
const ORDER_STATUS_LABEL = {
	confirmed: "En préparation",
	in_progress: "En préparation",
	ready: "Prêt",
	completed: "Servi",
	cancelled: "Annulé",
};

// ─── Colors par statut d'item ─────────────────────────────────────────────
const ITEM_STATUS_COLORS = {
	"En préparation": { bg: "#E6F1FB", text: "#0C447C" },
	Prêt: { bg: "#EAF3DE", text: "#27500A" },
	Servi: { bg: "#F1EFE8", text: "#5F5E5A" },
	Annulé: { bg: "#FEE2E2", text: "#991B1B" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────
function formatHHMM(dateStr) {
	if (!dateStr) return "--:--";
	return new Date(dateStr).toLocaleTimeString("fr-FR", {
		hour: "2-digit",
		minute: "2-digit",
	});
}

function getElapsedMin(dateStr) {
	if (!dateStr) return 0;
	return Math.max(0, Math.floor((Date.now() - new Date(dateStr)) / 60000));
}

function getStatusConfig(billStatus) {
	if (billStatus === "bill_requested") {
		return {
			label: "🟡 À encaisser",
			dotColor: "#F59E0B",
		};
	}
	if (billStatus === "open") {
		return {
			label: "🟢 En service",
			dotColor: "#22C55E",
		};
	}
	return {
		label: "⚪ Libre",
		dotColor: "#94A3B8",
	};
}

// ─── Main Component ──────────────────────────────────────────────────────
const TableDetailModal = ({ visible, onClose, restaurantId, tableId, table }) => {
	const THEME = useTheme();
	const [showMenuPicker, setShowMenuPicker] = useState(false);
	const [showEncaisser, setShowEncaisser] = useState(false);
	const [isSending, setIsSending] = useState(false);
	const [isClosing, setIsClosing] = useState(false);

	const { session, cart, cartTotal, cartItemsCount, isOpening, actions, isTableFree, sessionOrders, sentTotal } =
		useCounterTable(tableId, restaurantId);

	// Total global = envoyé en cuisine + panier en attente
	const grandTotal = sentTotal + cartTotal;

	// 🔍 Log de diagnostic pour tracer le décalage
	React.useEffect(() => {
		if (visible && session) {
			console.log(`[TableDetailModal] table=${tableId} session=${session._id} sentTotal=${sentTotal.toFixed(2)}€ cartTotal=${cartTotal.toFixed(2)}€ grandTotal=${grandTotal.toFixed(2)}€ orders=${sessionOrders.length}`);
			sessionOrders.forEach((o, i) => {
				console.log(`  [Order ${i+1}] id=${o._id} status=${o.orderStatus} total=${o.totalAmount?.toFixed(2) || 0}€`);
			});
		}
	}, [visible, session, sentTotal, cartTotal, grandTotal, sessionOrders, tableId]);

	const styles = useMemo(() => createStyles(THEME), [THEME]);

	// ─── Handlers ────────────────────────────────────────────────────────
	const handleSendToCook = async () => {
		if (cart.length === 0) {
			Alert.alert("Panier vide", "Ajoutez des plats avant d'envoyer");
			return;
		}
		setIsSending(true);
		try {
			await actions.sendToCook();
		} catch (err) {
			Alert.alert("Erreur", err.message);
		} finally {
			setIsSending(false);
		}
	};

	const handleRequestBill = async () => {
		try {
			await actions.requestBill();
		} catch (err) {
			Alert.alert("Erreur", err.message);
		}
	};

	const handleEncaisser = async (paymentMethod, zeroReason, discounts = []) => {
		setIsClosing(true);
		try {
			await actions.closeTable(paymentMethod, discounts);
			onClose();
		} catch (err) {
			Alert.alert("Erreur", err.message);
		} finally {
			setIsClosing(false);
		}
	};

	/**
	 * Annuler une commande individuelle déjà envoyée en cuisine.
	 * Guard : statut "cancelled" → skip silencieux.
	 * Pattern identique à handleCancelOrder dans Activity.jsx.
	 */
	const handleCancelOrder = (order) => {
		if (order.orderStatus === "cancelled") return;
		Alert.alert(
			"Annuler cette commande ?",
			"Cette action est irréversible.",
			[
				{ text: "Annuler", style: "cancel" },
				{
					text: "Confirmer",
					style: "destructive",
					onPress: async () => {
						try {
							await actions.cancelOrder(order._id);
						} catch (err) {
							Alert.alert("Erreur", err.message);
						}
					},
				},
			],
		);
	};

	if (!visible) return null;

	// ─── Render : Table en cours d'ouverture (transition) ────────────────
	if (isTableFree || isOpening) {
		return (
			<Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
				<View style={styles.overlay}>
					<View style={[styles.sheet, styles.loadingSheet]}>
						<ActivityIndicator size="large" color="#FBBF24" />
						<Text style={styles.loadingText}>Ouverture de la table…</Text>
					</View>
				</View>
			</Modal>
		);
	}

	// ─── Render : Session active ──────────────────────────────────────────
	const statusConfig = getStatusConfig(session?.billStatus);
	const elapsedMin = getElapsedMin(session?.openedAt);
	const tableLabel = table?.number ?? "—";
	const tableCapacity = table?.capacity ?? "?";

	return (
		<Modal
			visible={visible}
			transparent
			animationType="fade"
			onRequestClose={onClose}
		>
			<View style={styles.overlay}>
				<View style={styles.sheet}>

					{/* ── HEADER ────────────────────────────────────── */}
					<View style={styles.header}>
						<View style={styles.headerLeft}>
							<Text style={styles.headerTitle}>Table {tableLabel}</Text>
							<Text style={styles.headerSub}>
								{tableCapacity} pers. · ouverte depuis {elapsedMin} min
							</Text>
						</View>
						<TouchableOpacity onPress={onClose} style={styles.closeBtn}>
							<Ionicons name="close" size={20} color="#94A3B8" />
						</TouchableOpacity>
					</View>

					{/* ── STATUS PILL ──────────────────────────────────── */}
					<View style={styles.statusRow}>
						<View style={[
							styles.statusPillWrap,
							session?.billStatus === "bill_requested"
								? styles.statusPillBill
								: styles.statusPillOpen,
						]}>
							<View style={[
								styles.statusDot,
								{ backgroundColor: statusConfig.dotColor },
							]} />
							<Text style={[
								styles.statusPillLabel,
								{ color: statusConfig.dotColor },
							]}>
								{session?.billStatus === "bill_requested" ? "À encaisser" : "En service"}
							</Text>
						</View>
					</View>

					{/* ── SCROLLABLE CONTENT ────────────────────────────── */}
					<ScrollView
						style={styles.scroll}
						contentContainerStyle={styles.scrollContent}
						showsVerticalScrollIndicator={false}
					>
						{/* Envoyés en cuisine */}
						<Text style={styles.subsectionLabel}>ENVOYÉS EN CUISINE</Text>
					{sessionOrders.length === 0 ? (
						<Text style={styles.emptyHint}>Aucun plat encore envoyé</Text>
					) : (
						sessionOrders.map((order) =>
							(order.items || []).map((item, idx) => {
								const orderLabel = ORDER_STATUS_LABEL[order.orderStatus] ?? "En préparation";
								const colors = ITEM_STATUS_COLORS[orderLabel] || ITEM_STATUS_COLORS["Servi"];
								const isCancelled = order.orderStatus === "cancelled";
								return (
									<View key={`${order._id}-${idx}`} style={styles.sentRow}>
										<Text style={[styles.sentName, isCancelled && styles.sentNameCancelled]}>
											{item.quantity}× {item.name}
										</Text>
										<Text style={[styles.sentPrice, isCancelled && styles.sentNameCancelled]}>
											{(item.price * item.quantity).toFixed(2)} €
										</Text>
										<View style={[styles.statusPillItem, { backgroundColor: colors.bg }]}>
											<Text style={[styles.statusPillItemText, { color: colors.text }]}>
												{orderLabel}
											</Text>
										</View>
										{/* Bouton annuler (visible seulement sur le premier item de la commande) */}
										{idx === 0 && !isCancelled && (
											<TouchableOpacity
												onPress={() => handleCancelOrder(order)}
												style={styles.cancelOrderBtn}
												hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
											>
												<Ionicons name="close-circle-outline" size={18} color="#EF4444" />
											</TouchableOpacity>
										)}
									</View>
								);
							})
						)
					)}
						{cart.length > 0 && (
							<>
								<Text style={[styles.subsectionLabel, { marginTop: 12 }]}>EN ATTENTE D'ENVOI</Text>
								{cart.map((item) => (
									<View key={item.tempId} style={styles.cartRow}>
										<Text style={styles.sentName} numberOfLines={1}>
											{item.quantity}× {item.name}
										</Text>
										<Text style={styles.sentPrice}>
											{(item.price * item.quantity).toFixed(2)} €
										</Text>
										<View style={styles.qtyControls}>
											<TouchableOpacity
												onPress={() => actions.setQty(item.tempId, item.quantity - 1)}
												style={styles.qtyBtn}
											>
												<Text style={styles.qtyBtnText}>−</Text>
											</TouchableOpacity>
											<Text style={styles.qtyValue}>{item.quantity}</Text>
											<TouchableOpacity
												onPress={() => actions.setQty(item.tempId, item.quantity + 1)}
												style={styles.qtyBtn}
											>
												<Text style={styles.qtyBtnText}>+</Text>
											</TouchableOpacity>
											<TouchableOpacity
												onPress={() => actions.removeItem(item.tempId)}
												style={styles.trashBtn}
											>
												<Ionicons name="trash-outline" size={16} color="#EF4444" />
											</TouchableOpacity>
										</View>
									</View>
								))}
							</>
						)}

						{/* Divider + Total */}
						<View style={styles.divider} />
					{sentTotal > 0 && (
						<View style={styles.subTotalRow}>
							<Text style={styles.subTotalLabel}>Envoyé en cuisine</Text>
							<Text style={styles.subTotalValue}>{sentTotal.toFixed(2)} €</Text>
						</View>
					)}
					{cartTotal > 0 && (
						<View style={styles.subTotalRow}>
							<Text style={styles.subTotalLabel}>En attente d'envoi</Text>
							<Text style={styles.subTotalValue}>{cartTotal.toFixed(2)} €</Text>
						</View>
					)}
					<View style={styles.totalRow}>
						<Text style={styles.totalLabel}>Total</Text>
						<Text style={styles.totalValue}>{grandTotal.toFixed(2)} €</Text>
						</View>
					</ScrollView>

					{/* ── ACTIONS 2×2 ──────────────────────────────────── */}
					<View style={styles.actionsGrid}>
						<TouchableOpacity
							onPress={() => setShowMenuPicker(true)}
							style={styles.actionBtn}
						>
							<Text style={styles.actionBtnText}>+ Ajouter des plats</Text>
						</TouchableOpacity>

						<TouchableOpacity
							onPress={handleSendToCook}
							disabled={isSending || cart.length === 0}
							style={[styles.actionBtn, (isSending || cart.length === 0) && styles.actionDisabled]}
						>
							{isSending ? (
								<ActivityIndicator size="small" color="#F8FAFC" />
							) : (
								<Text style={styles.actionBtnText}>✈ Envoyer en cuisine</Text>
							)}
						</TouchableOpacity>

						<TouchableOpacity
							onPress={handleRequestBill}
							style={styles.actionBtn}
						>
							<Text style={styles.actionBtnText}>€ Demander addition</Text>
						</TouchableOpacity>

						<TouchableOpacity
							onPress={() => setShowEncaisser(true)}
							disabled={isClosing || cart.length > 0}
							style={[styles.actionBtn, styles.actionBtnEncaisser, (isClosing || cart.length > 0) && styles.actionDisabled]}
						>
							{isClosing ? (
								<ActivityIndicator size="small" color="#fff" />
							) : (
								<Text style={[styles.actionBtnText, styles.actionBtnEncaisserText]}>✓ Encaisser &amp; libérer</Text>
							)}
						</TouchableOpacity>
					</View>

					{/* ── SUB-MODALS ────────────────────────────────────── */}
					{showMenuPicker && (
						<MenuPickerModal
							visible={showMenuPicker}
							onClose={() => setShowMenuPicker(false)}
							tableId={tableId}
							restaurantId={restaurantId}
						/>
					)}
					{showEncaisser && (
						<EncaisserModal
							visible={showEncaisser}
							onClose={() => setShowEncaisser(false)}
							total={grandTotal}
							orders={sessionOrders}
							onEncaisser={handleEncaisser}
						/>
					)}
				</View>
			</View>
		</Modal>
	);
};

// ─── Styles ───────────────────────────────────────────────────────────────
const createStyles = (THEME) =>
	StyleSheet.create({
		// ── Overlay centré ───────────────────────────────────────
		overlay: {
			flex: 1,
			backgroundColor: "rgba(0,0,0,0.70)",
			justifyContent: "center",
			alignItems: "center",
			paddingHorizontal: 16,
			paddingVertical: 12,
		},
		sheet: {
			backgroundColor: "#1E293B",
			borderRadius: 20,
			width: "100%",
			maxWidth: 520,
			flex: 0,
			flexShrink: 1,
			minHeight: "78%",
			borderWidth: 1,
			borderColor: "rgba(255,255,255,0.08)",
			overflow: "hidden",
		},

		// ── Loading ───────────────────────────────────────────────
		loadingSheet: {
			paddingVertical: 48,
			alignItems: "center",
			justifyContent: "center",
			gap: 16,
		},
		loadingText: {
			color: "#94A3B8",
			fontSize: 14,
			fontWeight: "500",
		},

		// ── Header ───────────────────────────────────────────────
		header: {
			flexDirection: "row",
			alignItems: "flex-start",
			paddingHorizontal: 20,
			paddingTop: 20,
			paddingBottom: 14,
			borderBottomWidth: 1,
			borderBottomColor: "rgba(255,255,255,0.07)",
		},
		headerLeft: { flex: 1 },
		headerTitle: {
			fontSize: 20,
			fontWeight: "700",
			color: "#F8FAFC",
			marginBottom: 3,
		},
		headerSub: {
			fontSize: 13,
			color: "#64748B",
			fontWeight: "400",
		},
		closeBtn: {
			width: 32,
			height: 32,
			borderRadius: 16,
			backgroundColor: "rgba(255,255,255,0.07)",
			alignItems: "center",
			justifyContent: "center",
			marginLeft: 12,
		},

		// ── Status pill ───────────────────────────────────────────
		statusRow: {
			paddingHorizontal: 20,
			paddingVertical: 12,
			borderBottomWidth: 1,
			borderBottomColor: "rgba(255,255,255,0.07)",
		},
		statusPillWrap: {
			flexDirection: "row",
			alignItems: "center",
			alignSelf: "flex-start",
			borderRadius: 20,
			paddingHorizontal: 12,
			paddingVertical: 5,
			gap: 6,
			borderWidth: 1,
		},
		statusPillOpen: {
			backgroundColor: "rgba(34,197,94,0.12)",
			borderColor: "rgba(34,197,94,0.3)",
		},
		statusPillBill: {
			backgroundColor: "rgba(245,158,11,0.12)",
			borderColor: "rgba(245,158,11,0.3)",
		},
		statusDot: {
			width: 8,
			height: 8,
			borderRadius: 4,
		},
		statusPillLabel: {
			fontSize: 13,
			fontWeight: "600",
		},

		// ── Scroll ───────────────────────────────────────────────
		scroll: { flex: 1, minHeight: 80 },
		scrollContent: {
			paddingHorizontal: 20,
			paddingTop: 14,
			paddingBottom: 10,
		},

		// ── Section label ─────────────────────────────────────────
		subsectionLabel: {
			fontSize: 11,
			fontWeight: "700",
			letterSpacing: 0.8,
			color: "#475569",
			marginBottom: 8,
		},

		// ── Sent items ───────────────────────────────────────────
		sentRow: {
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
			paddingVertical: 10,
			borderBottomWidth: 1,
			borderBottomColor: "rgba(255,255,255,0.05)",
		},
		sentName: {
			flex: 1,
			fontSize: 14,
			fontWeight: "600",
			color: "#F8FAFC",
		},
		sentPrice: {
			fontSize: 13,
			fontWeight: "600",
			color: "#94A3B8",
			minWidth: 58,
			textAlign: "right",
		},
		statusPillItem: {
			borderRadius: 12,
			paddingHorizontal: 8,
			paddingVertical: 3,
		},
		statusPillItemText: {
			fontSize: 10,
			fontWeight: "700",
		},

		// ── Cart items ────────────────────────────────────────────
		cartRow: {
			flexDirection: "row",
			alignItems: "center",
			gap: 6,
			paddingVertical: 9,
			borderBottomWidth: 1,
			borderBottomColor: "rgba(255,255,255,0.05)",
		},
		qtyControls: {
			flexDirection: "row",
			alignItems: "center",
			gap: 4,
		},
		qtyBtn: {
			width: 28,
			height: 28,
			borderRadius: 6,
			borderWidth: 1,
			borderColor: "rgba(255,255,255,0.12)",
			alignItems: "center",
			justifyContent: "center",
			backgroundColor: "rgba(255,255,255,0.05)",
		},
		qtyBtnText: {
			fontSize: 16,
			fontWeight: "700",
			color: "#F8FAFC",
			lineHeight: 20,
		},
		qtyValue: {
			minWidth: 22,
			textAlign: "center",
			fontSize: 13,
			fontWeight: "700",
			color: "#F8FAFC",
		},
		trashBtn: { padding: 4, marginLeft: 2 },

		// ── Cancel order (envoyé en cuisine) ─────────────────────
		cancelOrderBtn: {
			padding: 2,
			marginLeft: 6,
		},
		sentNameCancelled: {
			opacity: 0.4,
			textDecorationLine: "line-through",
		},

		// ── Divider + Total ───────────────────────────────────────
		divider: {
			height: 1,
			backgroundColor: "rgba(255,255,255,0.07)",
			marginVertical: 12,
		},
		totalRow: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			paddingBottom: 4,
		},
		subTotalRow: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			paddingBottom: 6,
		},
		subTotalLabel: {
			fontSize: 13,
			color: "#94A3B8",
		},
		subTotalValue: {
			fontSize: 13,
			color: "#94A3B8",
		},
		emptyHint: {
			fontSize: 13,
			color: "#64748B",
			fontStyle: "italic",
			paddingVertical: 8,
		},
		totalLabel: {
			fontSize: 16,
			fontWeight: "700",
			color: "#F8FAFC",
		},
		totalValue: {
			fontSize: 18,
			fontWeight: "700",
			color: "#F8FAFC",
		},

		// ── Actions 2×2 ───────────────────────────────────────────
		actionsGrid: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: 8,
			padding: 16,
			borderTopWidth: 1,
			borderTopColor: "rgba(255,255,255,0.07)",
		},
		actionBtn: {
			width: "48%",
			height: 52,
			borderRadius: 10,
			borderWidth: 1,
			borderColor: "rgba(255,255,255,0.12)",
			backgroundColor: "rgba(255,255,255,0.05)",
			alignItems: "center",
			justifyContent: "center",
			paddingHorizontal: 8,
		},
		actionBtnText: {
			fontSize: 13,
			fontWeight: "600",
			color: "#F8FAFC",
			textAlign: "center",
		},
		actionBtnEncaisser: {
			backgroundColor: "rgba(34,197,94,0.15)",
			borderColor: "rgba(34,197,94,0.35)",
		},
		actionBtnEncaisserText: {
			color: "#4ADE80",
		},
		actionDisabled: {
			opacity: 0.4,
		},
	});

export default TableDetailModal;
