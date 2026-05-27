/**
 * TableDetailModal.jsx — Détail table Comptoir
 *
 * Layout redesigné :
 *   Header fixe  : ← retour | Table X (N pers.) | ● Xmin
 *   Status pill  : pill colorée + "Ouverte à HH:MM"
 *   ScrollView   : envoyés cuisine → panier → total
 *   Actions 2×2  : Ajouter | Envoyer | Addition | Encaisser
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
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../hooks/useTheme";
import useCounterTable from "../../../hooks/useCounterTable";
import MenuPickerModal from "./MenuPickerModal";
import EncaisserModal from "./EncaisserModal";

const IS_PHONE = Dimensions.get("window").width < 600;

// ─── Demo sent items (pas d'API pour items individuels pour l'instant) ──────
const DEMO_SENT = [
	{ id: "1", qty: 2, name: "Burger Maison", price: 11.0, status: "En préparation" },
	{ id: "2", qty: 1, name: "Frites Maison", price: 5.0, status: "Prêt" },
	{ id: "3", qty: 2, name: "Coca 33cl", price: 5.0, status: "Servi" },
];

// ─── Colors par statut d'item ─────────────────────────────────────────────
const ITEM_STATUS_COLORS = {
	"En préparation": { bg: "#E6F1FB", text: "#0C447C" },
	Prêt: { bg: "#EAF3DE", text: "#27500A" },
	Servi: { bg: "#F1EFE8", text: "#5F5E5A" },
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

	const { session, cart, cartTotal, cartItemsCount, isOpening, actions, isTableFree } =
		useCounterTable(tableId, restaurantId);

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

	const handleEncaisser = async (paymentMethod) => {
		setIsClosing(true);
		try {
			await actions.closeTable(paymentMethod);
			onClose();
		} catch (err) {
			Alert.alert("Erreur", err.message);
		} finally {
			setIsClosing(false);
		}
	};

	if (!visible) return null;

	// ─── Render : Table libre ─────────────────────────────────────────────
	if (isTableFree || isOpening) {
		return (
			<Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
				<BlurView intensity={90} style={styles.blur}>
					<View style={styles.freeSheet}>
						<TouchableOpacity onPress={onClose} style={styles.freeCloseBtn}>
							<Ionicons name="close" size={24} color={THEME.colors.text.muted} />
						</TouchableOpacity>
						<Text style={styles.freeEmoji}>🪑</Text>
						<Text style={styles.freeTitle}>Table {table?.number ?? "—"}</Text>
						<Text style={styles.freeHint}>Table libre — prête pour le service</Text>
						<TouchableOpacity
							onPress={async () => {
								try {
									await actions.openTable();
								} catch {
									Alert.alert("Erreur", "Impossible d'ouvrir la table. Vérifiez la connexion.");
								}
							}}
							disabled={isOpening}
							style={styles.openBtn}
						>
							{isOpening ? (
								<ActivityIndicator size="small" color={THEME.colors.background.dark} />
							) : (
								<Text style={styles.openBtnText}>🟢 OUVRIR LA TABLE</Text>
							)}
						</TouchableOpacity>
					</View>
				</BlurView>
			</Modal>
		);
	}

	// ─── Render : Session active ──────────────────────────────────────────
	const statusConfig = getStatusConfig(session?.billStatus);
	const elapsedMin = getElapsedMin(session?.openedAt);
	const openedAtStr = formatHHMM(session?.openedAt);
	const tableLabel = table?.number ?? "—";
	const tableCapacity = table?.capacity ?? "?";

	return (
		<Modal
			visible={visible}
			transparent
			animationType="slide"
			onRequestClose={onClose}
			presentationStyle={!IS_PHONE ? "pageSheet" : undefined}
		>
			<View style={styles.overlay}>
				<View style={styles.sheet}>

					{/* ── HEADER (fixe) ────────────────────────────────────── */}
					<View style={styles.header}>
						<TouchableOpacity onPress={onClose} style={styles.headerBtn}>
							<Ionicons name="chevron-back" size={26} color={THEME.colors.primary.amber} />
						</TouchableOpacity>
						<Text style={styles.headerTitle} numberOfLines={1}>
							Table {tableLabel} ({tableCapacity} pers.)
						</Text>
						<View style={styles.headerRight}>
							<View style={[styles.headerDot, { backgroundColor: statusConfig.dotColor }]} />
							<Text style={styles.headerTime}>{elapsedMin} min</Text>
						</View>
					</View>

					{/* ── STATUS BADGE (fixe) ──────────────────────────────── */}
					<View style={styles.statusSection}>
						<Text style={styles.statusLabel}>{statusConfig.label}</Text>
						<Text style={styles.statusMeta}>Ouverte par tablette comptoir · {openedAtStr}</Text>
					</View>

					{/* ── SCROLLABLE CONTENT ────────────────────────────────── */}
					<ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

						{/* Label total */}
						<View style={styles.sectionLabelRow}>
							<Text style={styles.sectionLabel}>PLATS COMMANDÉS</Text>
							<Text style={styles.totalBadge}>{cartTotal.toFixed(2)} €</Text>
						</View>

						{/* Envoyés en cuisine */}
						<Text style={styles.subsectionLabel}>ENVOYÉS EN CUISINE ✓ {formatHHMM(session?.openedAt)}</Text>
						{DEMO_SENT.map((item) => {
							const colors = ITEM_STATUS_COLORS[item.status] || ITEM_STATUS_COLORS["Servi"];
							return (
								<View key={item.id} style={styles.sentRow}>
									<Text style={styles.sentName}>
										{item.qty}× {item.name}
									</Text>
									<Text style={styles.sentPrice}>{item.price.toFixed(2)} €</Text>
									<View style={[styles.statusPill, { backgroundColor: colors.bg }]}>
										<Text style={[styles.statusPillText, { color: colors.text }]}>
											{item.status}
										</Text>
									</View>
								</View>
							);
						})}

						{/* Separator */}
						<View style={styles.divider} />

						{/* En attente d'envoi */}
						<Text style={styles.subsectionLabel}>EN ATTENTE D'ENVOI</Text>
						{cart.length === 0 ? (
							<Text style={styles.emptyHint}>Panier vide</Text>
						) : (
							cart.map((item) => (
								<View key={item.tempId} style={styles.cartRow}>
									<Text style={styles.cartName} numberOfLines={1}>
										{item.name}
									</Text>
									<Text style={styles.cartPrice}>
										{(item.price * item.quantity).toFixed(2)} €
									</Text>
									<View style={styles.qtyControls}>
										<TouchableOpacity
											onPress={() =>
												actions.setQty(item.tempId, item.quantity - 1)
											}
											style={styles.qtyBtn}
										>
											<Text style={styles.qtyBtnText}>−</Text>
										</TouchableOpacity>
										<Text style={styles.qtyValue}>{item.quantity}</Text>
										<TouchableOpacity
											onPress={() =>
												actions.setQty(item.tempId, item.quantity + 1)
											}
											style={styles.qtyBtn}
										>
											<Text style={styles.qtyBtnText}>+</Text>
										</TouchableOpacity>
										<TouchableOpacity
											onPress={() => actions.removeItem(item.tempId)}
											style={styles.trashBtn}
										>
											<Ionicons
												name="trash-outline"
												size={16}
												color="#EF4444"
											/>
										</TouchableOpacity>
									</View>
								</View>
							))
						)}

						{/* Divider before total */}
						<View style={styles.divider} />

						{/* Total line */}
						<View style={styles.totalRow}>
							<Text style={styles.totalLabel}>Total</Text>
							<Text style={styles.totalValue}>
								{cartTotal.toFixed(2)} €
							</Text>
						</View>
					</ScrollView>

					{/* ── ACTIONS GRID (fixe en bas) ────────────────────────── */}
					<View style={styles.actionsGrid}>
						<TouchableOpacity
							onPress={() => setShowMenuPicker(true)}
							style={styles.actionOutlined}
						>
							<Text style={styles.actionOutlinedText}>+ Ajouter des plats</Text>
						</TouchableOpacity>

						<TouchableOpacity
							onPress={handleSendToCook}
							disabled={isSending || cart.length === 0}
							style={[
								styles.actionPrimary,
								(isSending || cart.length === 0) && styles.actionDisabled,
							]}
						>
							{isSending ? (
								<ActivityIndicator size="small" color={THEME.colors.background.dark} />
							) : (
								<Text style={styles.actionPrimaryText}>
									📤 Envoyer ({cartItemsCount})
								</Text>
							)}
						</TouchableOpacity>

						<TouchableOpacity
							onPress={handleRequestBill}
							style={styles.actionOutlined}
						>
							<Text style={styles.actionOutlinedText}>💶 Demander addition</Text>
						</TouchableOpacity>

						<TouchableOpacity
							onPress={() => setShowEncaisser(true)}
							disabled={isClosing}
							style={[styles.actionSuccess, isClosing && styles.actionDisabled]}
						>
							{isClosing ? (
								<ActivityIndicator size="small" color="#fff" />
							) : (
								<Text style={styles.actionSuccessText}>✅ Encaisser & libérer</Text>
							)}
						</TouchableOpacity>
					</View>

					{/* ── SUB-MODALS ────────────────────────────────────────── */}
					{showMenuPicker && (
						<MenuPickerModal
							visible={showMenuPicker}
							onClose={() => setShowMenuPicker(false)}
							tableId={tableId}
						/>
					)}
					{showEncaisser && (
						<EncaisserModal
							visible={showEncaisser}
							onClose={() => setShowEncaisser(false)}
							total={cartTotal}
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
		// ── Table libre ──────────────────────────────────────────
		blur: { flex: 1 },
		freeSheet: {
			flex: 1,
			justifyContent: "center",
			alignItems: "center",
		},
		freeCloseBtn: {
			position: "absolute",
			top: 56,
			right: 20,
			padding: 8,
		},
		freeEmoji: { fontSize: 48, marginBottom: 12 },
		freeTitle: {
			fontSize: 22,
			fontWeight: "700",
			color: THEME.colors.text.primary,
			marginBottom: 6,
		},
		freeHint: {
			fontSize: 14,
			color: THEME.colors.text.muted,
			marginBottom: 36,
		},
		openBtn: {
			backgroundColor: THEME.colors.primary.amber,
			paddingHorizontal: 36,
			paddingVertical: 14,
			borderRadius: 12,
			minWidth: 220,
			alignItems: "center",
		},
		openBtnText: {
			color: THEME.colors.background.dark,
			fontWeight: "700",
			fontSize: 15,
		},

		// ── Session active ───────────────────────────────────────
		overlay: {
			flex: 1,
			backgroundColor: "rgba(0,0,0,0.55)",
			justifyContent: "flex-end",
		},
		sheet: {
			maxHeight: "92%",
			backgroundColor: THEME.colors.background.dark,
			borderTopLeftRadius: 20,
			borderTopRightRadius: 20,
			overflow: "hidden",
			flexDirection: "column",
		},

		// ── Header ───────────────────────────────────────────────
		header: {
			flexDirection: "row",
			alignItems: "center",
			paddingHorizontal: 12,
			paddingVertical: 14,
			borderBottomWidth: 1,
			borderBottomColor: THEME.colors.border.subtle,
			gap: 8,
		},
		headerBtn: { padding: 4 },
		headerTitle: {
			flex: 1,
			fontSize: 16,
			fontWeight: "700",
			color: THEME.colors.text.primary,
			textAlign: "center",
		},
		headerRight: {
			flexDirection: "row",
			alignItems: "center",
			gap: 5,
			minWidth: 60,
			justifyContent: "flex-end",
		},
		headerDot: {
			width: 8,
			height: 8,
			borderRadius: 4,
		},
		headerTime: {
			fontSize: 13,
			fontWeight: "600",
			color: THEME.colors.text.secondary,
		},

		// ── Status badge ─────────────────────────────────────────
		statusSection: {
			paddingHorizontal: 16,
			paddingVertical: 10,
			borderBottomWidth: 1,
			borderBottomColor: THEME.colors.border.subtle,
		},
		statusLabel: {
			fontSize: 13,
			fontWeight: "700",
			color: THEME.colors.text.primary,
			marginBottom: 4,
		},
		statusMeta: {
			fontSize: 12,
			color: THEME.colors.text.muted,
		},

		// ── Scroll ───────────────────────────────────────────────
		scroll: { flex: 1 },
		scrollContent: {
			paddingHorizontal: 16,
			paddingTop: 12,
			paddingBottom: 8,
		},

		// ── Section headers ──────────────────────────────────────
		sectionLabelRow: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			marginBottom: 6,
		},
		sectionLabel: {
			fontSize: 13,
			fontWeight: "700",
			color: THEME.colors.text.primary,
		},
		totalBadge: {
			fontSize: 13,
			fontWeight: "700",
			color: THEME.colors.primary.amber,
		},
		subsectionLabel: {
			fontSize: 11,
			fontWeight: "700",
			letterSpacing: 0.6,
			color: THEME.colors.text.muted,
			marginTop: 12,
			marginBottom: 6,
		},

		// ── Sent items ───────────────────────────────────────────
		sentRow: {
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
			paddingVertical: 9,
			borderBottomWidth: 1,
			borderBottomColor: THEME.colors.border.subtle,
		},
		sentName: {
			flex: 1,
			fontSize: 13,
			fontWeight: "600",
			color: THEME.colors.text.primary,
		},
		sentPrice: {
			fontSize: 13,
			fontWeight: "600",
			color: THEME.colors.text.secondary,
		},
		statusPill: {
			borderRadius: 12,
			paddingHorizontal: 8,
			paddingVertical: 3,
		},
		statusPillText: {
			fontSize: 10,
			fontWeight: "700",
		},

		// ── Divider ──────────────────────────────────────────────
		divider: {
			height: 1,
			backgroundColor: THEME.colors.border.subtle,
			marginVertical: 10,
		},

		// ── Cart items ───────────────────────────────────────────
		emptyHint: {
			fontSize: 13,
			color: THEME.colors.text.muted,
			textAlign: "center",
			paddingVertical: 16,
			fontStyle: "italic",
		},
		cartRow: {
			flexDirection: "row",
			alignItems: "center",
			gap: 6,
			paddingVertical: 9,
			borderBottomWidth: 1,
			borderBottomColor: THEME.colors.border.subtle,
		},
		cartName: {
			flex: 1,
			fontSize: 13,
			fontWeight: "600",
			color: THEME.colors.text.primary,
		},
		cartPrice: {
			fontSize: 13,
			fontWeight: "600",
			color: THEME.colors.text.secondary,
			minWidth: 42,
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
			borderColor: THEME.colors.border.subtle,
			alignItems: "center",
			justifyContent: "center",
			backgroundColor: THEME.colors.background.card,
		},
		qtyBtnText: {
			fontSize: 16,
			fontWeight: "700",
			color: THEME.colors.text.primary,
			lineHeight: 20,
		},
		qtyValue: {
			minWidth: 22,
			textAlign: "center",
			fontSize: 13,
			fontWeight: "700",
			color: THEME.colors.text.primary,
		},
		trashBtn: {
			padding: 4,
			marginLeft: 2,
		},

		// ── Total ────────────────────────────────────────────────
		totalRow: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			marginTop: 4,
			paddingTop: 14,
			borderTopWidth: 1,
			borderTopColor: THEME.colors.border.subtle,
			marginBottom: 4,
		},
		totalLabel: {
			fontSize: 15,
			fontWeight: "700",
			color: THEME.colors.text.primary,
		},
		totalValue: {
			fontSize: 16,
			fontWeight: "700",
			color: THEME.colors.text.primary,
		},

		// ── Actions grid ─────────────────────────────────────────
		actionsGrid: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: 7,
			padding: 12,
			borderTopWidth: 1,
			borderTopColor: THEME.colors.border.subtle,
		},
		actionOutlined: {
			width: "48%",
			height: 48,
			borderRadius: 8,
			borderWidth: 1,
			borderColor: THEME.colors.border.subtle,
			backgroundColor: THEME.colors.background.card,
			alignItems: "center",
			justifyContent: "center",
			paddingHorizontal: 6,
		},
		actionOutlinedText: {
			fontSize: 12,
			fontWeight: "700",
			color: THEME.colors.text.primary,
			textAlign: "center",
		},
		actionPrimary: {
			width: "48%",
			height: 48,
			borderRadius: 8,
			backgroundColor: THEME.colors.primary.amber,
			alignItems: "center",
			justifyContent: "center",
			paddingHorizontal: 6,
		},
		actionPrimaryText: {
			fontSize: 12,
			fontWeight: "700",
			color: THEME.colors.background.dark,
			textAlign: "center",
		},
		actionSuccess: {
			width: "48%",
			height: 48,
			borderRadius: 8,
			backgroundColor: "#22C55E",
			alignItems: "center",
			justifyContent: "center",
			paddingHorizontal: 6,
		},
		actionSuccessText: {
			fontSize: 12,
			fontWeight: "700",
			color: "#fff",
			textAlign: "center",
		},
		actionDisabled: {
			opacity: 0.4,
		},
	});

export default TableDetailModal;
