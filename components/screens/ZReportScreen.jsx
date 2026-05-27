/**
 * ZReportScreen.jsx — Clôture de caisse (Z de caisse)
 *
 * Accessible uniquement aux managers (role admin).
 * Reçoit restaurantId + onClose depuis ActivityFloor via Modal.
 *
 * Flux :
 *  1. Saisie fond de caisse initial (openingFloat) + espèces comptées (closingCount)
 *  2. Bouton "Aperçu" → preview (lecture seule, pas de sauvegarde)
 *  3. Affichage du récapitulatif : CA brut, net, ventilation par moyen de paiement, écart caisse
 *  4. Bouton "Clôturer la caisse" → Alert de confirmation → generateZ → succès
 *  5. Historique des Z (scroll vers le bas)
 */

import React, { useState, useCallback, useMemo } from "react";
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	TextInput,
	ScrollView,
	ActivityIndicator,
	Alert,
	SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../hooks/useTheme";
import zReportService from "../../services/zReportService";

// ────────────────────────────────────────────────────────────────────────────
// Sous-composant : ligne de détail (label / valeur)
// ────────────────────────────────────────────────────────────────────────────
const Row = ({ label, value, bold, color, styles }) => (
	<View style={styles.row}>
		<Text style={[styles.rowLabel, bold && styles.bold]}>{label}</Text>
		<Text style={[styles.rowValue, bold && styles.bold, color ? { color } : null]}>
			{value}
		</Text>
	</View>
);

// ────────────────────────────────────────────────────────────────────────────
// Label humain par méthode de paiement
// ────────────────────────────────────────────────────────────────────────────
const METHOD_LABEL = {
	card:       "Carte bancaire",
	apple_pay:  "Apple Pay",
	tap_to_pay: "Tap to Pay",
	cash:       "Espèces",
	fake:       "Simulation",
	other:      "Autre",
};

// ────────────────────────────────────────────────────────────────────────────
// ZReportScreen
// ────────────────────────────────────────────────────────────────────────────
export default function ZReportScreen({ restaurantId, onClose }) {
	const THEME = useTheme();
	const styles = useMemo(() => createStyles(THEME), [THEME]);

	// ── État ─────────────────────────────────────────────────────────────
	const [openingFloat, setOpeningFloat] = useState("");   // fond initial (€)
	const [closingCount, setClosingCount] = useState("");   // espèces comptées (€)
	const [preview,  setPreview]  = useState(null);         // données prévisualisées
	const [loading,  setLoading]  = useState(false);
	const [generated, setGenerated] = useState(null);       // Z généré (succès)
	const [history,  setHistory]  = useState([]);
	const [historyMeta, setHistoryMeta] = useState(null);
	const [loadingHistory, setLoadingHistory] = useState(false);
	const [historyVisible, setHistoryVisible] = useState(false);
	const [error, setError] = useState("");

	// ── Période par défaut : aujourd'hui 00h00 → maintenant ───────────────
	const { start: periodStart, end: periodEnd } = useMemo(
		() => zReportService.getTodayPeriod(),
		[],
	);

	// ── Prévisualisation ─────────────────────────────────────────────────
	const handlePreview = useCallback(async () => {
		setError("");
		if (!restaurantId) {
			setError("Restaurant introuvable.");
			return;
		}
		setLoading(true);
		try {
			const data = await zReportService.preview(restaurantId, periodStart, periodEnd);
			setPreview(data);
		} catch (e) {
			setError(e.message || "Erreur lors du calcul.");
		} finally {
			setLoading(false);
		}
	}, [restaurantId, periodStart, periodEnd]);

	// ── Génération (clôture définitive) ──────────────────────────────────
	const handleGenerate = useCallback(() => {
		if (!preview) {
			Alert.alert("Aperçu requis", "Veuillez d'abord lancer l'aperçu.");
			return;
		}

		const opening = parseFloat((openingFloat || "0").replace(",", ".")) || 0;
		const closing = parseFloat((closingCount || "0").replace(",", ".")) || 0;

		Alert.alert(
			"Clôturer la caisse",
			`Vous allez sceller le Z de caisse.\nCette opération est IRRÉVERSIBLE.\n\nCA net : ${zReportService.formatCents(preview.netSalesCents)}\n\nConfirmer ?`,
			[
				{ text: "Annuler", style: "cancel" },
				{
					text: "Clôturer",
					style: "destructive",
					onPress: async () => {
						setLoading(true);
						setError("");
						try {
							const z = await zReportService.generate({
								restaurantId,
								periodStart,
								periodEnd,
								openingFloatCents: Math.round(opening * 100),
								closingCountCents: Math.round(closing * 100),
							});
							setGenerated(z);
							setPreview(null);
						} catch (e) {
							setError(e.message || "Erreur lors de la clôture.");
						} finally {
							setLoading(false);
						}
					},
				},
			],
		);
	}, [preview, openingFloat, closingCount, restaurantId, periodStart, periodEnd]);

	// ── Historique ───────────────────────────────────────────────────────
	const handleShowHistory = useCallback(async () => {
		if (historyVisible) {
			setHistoryVisible(false);
			return;
		}
		setLoadingHistory(true);
		try {
			const { data, meta } = await zReportService.list(restaurantId, 1, 10);
			setHistory(data);
			setHistoryMeta(meta);
			setHistoryVisible(true);
		} catch (e) {
			setError(e.message || "Erreur historique.");
		} finally {
			setLoadingHistory(false);
		}
	}, [historyVisible, restaurantId]);

	// ── Rendu ─────────────────────────────────────────────────────────────
	return (
		<SafeAreaView style={styles.safeArea}>
			{/* ── Header ──────────────────────────────────────────────── */}
			<View style={styles.header}>
				<Text style={styles.title}>Z de caisse</Text>
				<TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel="Fermer">
					<Ionicons name="close" size={22} color={THEME.colors.text.primary} />
				</TouchableOpacity>
			</View>

			<ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
				{/* ── Période ─────────────────────────────────────────── */}
				<View style={styles.section}>
					<Text style={styles.sectionLabel}>Période</Text>
					<Text style={styles.periodText}>
						{periodStart.toLocaleDateString("fr-FR", {
							weekday: "long", day: "numeric", month: "long",
						})}
						{" · "}
						{periodStart.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
						{" → "}
						{periodEnd.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
					</Text>
				</View>

				{/* ── Saisie fond de caisse ────────────────────────────── */}
				<View style={styles.section}>
					<Text style={styles.sectionLabel}>Fond de caisse initial (€)</Text>
					<TextInput
						style={styles.input}
						placeholder="ex : 100.00"
						placeholderTextColor={THEME.colors.text.muted}
						keyboardType="decimal-pad"
						value={openingFloat}
						onChangeText={(v) => { setOpeningFloat(v); setPreview(null); }}
					/>
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionLabel}>Espèces comptées à la clôture (€)</Text>
					<TextInput
						style={styles.input}
						placeholder="ex : 247.50"
						placeholderTextColor={THEME.colors.text.muted}
						keyboardType="decimal-pad"
						value={closingCount}
						onChangeText={(v) => { setClosingCount(v); setPreview(null); }}
					/>
				</View>

				{/* ── Bouton aperçu ────────────────────────────────────── */}
				{!generated && (
					<TouchableOpacity
						style={[styles.btn, styles.btnSecondary]}
						onPress={handlePreview}
						disabled={loading}
					>
						{loading && !preview ? (
							<ActivityIndicator size="small" color={THEME.colors.text.primary} />
						) : (
							<>
								<Ionicons name="eye-outline" size={16} color={THEME.colors.text.primary} style={{ marginRight: 6 }} />
								<Text style={[styles.btnText, { color: THEME.colors.text.primary }]}>
									Calculer l'aperçu
								</Text>
							</>
						)}
					</TouchableOpacity>
				)}

				{/* ── Erreur ───────────────────────────────────────────── */}
				{!!error && (
					<View style={styles.errorBox}>
						<Ionicons name="alert-circle-outline" size={16} color="#FF4D4D" style={{ marginRight: 6 }} />
						<Text style={styles.errorText}>{error}</Text>
					</View>
				)}

				{/* ── Aperçu / Preview ─────────────────────────────────── */}
				{preview && !generated && (
					<View style={styles.card}>
						<Text style={styles.cardTitle}>Récapitulatif</Text>

						<Row label="CA brut"               value={zReportService.formatCents(preview.grossSalesCents)}     styles={styles} />
						<Row label="Remboursements"         value={`− ${zReportService.formatCents(preview.totalRefundsCents)}`} styles={styles} />
						<Row label="Annulations (voids)"    value={`− ${zReportService.formatCents(preview.totalVoidsCents)}`}   styles={styles} />
						<View style={styles.divider} />
						<Row
							label="CA net"
							value={zReportService.formatCents(preview.netSalesCents)}
							bold
							color={THEME.colors.primary?.amber || "#F59E0B"}
							styles={styles}
						/>

						<View style={styles.divider} />

						{/* Ventilation par moyen de paiement */}
						{(preview.paymentBreakdown || []).map((p) => (
							<Row
								key={p.method}
								label={`${METHOD_LABEL[p.method] ?? p.method} (${p.ticketCount} ticket${p.ticketCount > 1 ? "s" : ""})`}
								value={zReportService.formatCents(p.amountCents)}
								styles={styles}
							/>
						))}

						<View style={styles.divider} />

						<Row label="Nombre de tickets"  value={String(preview.ticketCount)}  styles={styles} />
						<Row label="Panier moyen"        value={zReportService.formatCents(preview.avgBasketCents)} styles={styles} />
						<Row label="Ticket max"          value={zReportService.formatCents(preview.maxTicketCents)} styles={styles} />
						<Row label="Annulations"         value={String(preview.voidCount)}   styles={styles} />
						<Row label="Remboursements"      value={String(preview.refundCount)} styles={styles} />

						{/* Écart caisse (si données saisies) */}
						{(closingCount || openingFloat) && (() => {
							const opening = Math.round((parseFloat((openingFloat || "0").replace(",", ".")) || 0) * 100);
							const closing = Math.round((parseFloat((closingCount || "0").replace(",", ".")) || 0) * 100);
							const cashEntry = (preview.paymentBreakdown || []).find((p) => p.method === "cash");
							const cashSales = cashEntry?.amountCents ?? 0;
							const expected  = opening + cashSales;
							const variance  = closing - expected;
							return (
								<>
									<View style={styles.divider} />
									<Row label="Espèces attendues"    value={zReportService.formatCents(expected)} styles={styles} />
									<Row
										label="Écart caisse"
										value={zReportService.formatVariance(variance)}
										bold
										color={variance === 0 ? "#22C55E" : variance > 0 ? "#F59E0B" : "#EF4444"}
										styles={styles}
									/>
								</>
							);
						})()}

						{/* Bouton clôturer */}
						<TouchableOpacity
							style={[styles.btn, styles.btnDanger, { marginTop: 20 }]}
							onPress={handleGenerate}
							disabled={loading}
						>
							{loading ? (
								<ActivityIndicator size="small" color="#fff" />
							) : (
								<>
									<Ionicons name="lock-closed-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
									<Text style={[styles.btnText, { color: "#fff" }]}>
										Clôturer la caisse (définitif)
									</Text>
								</>
							)}
						</TouchableOpacity>
					</View>
				)}

				{/* ── Succès ─────────────────────────────────────────── */}
				{generated && (
					<View style={styles.successCard}>
						<Ionicons name="checkmark-circle" size={40} color="#22C55E" style={{ marginBottom: 12 }} />
						<Text style={styles.successTitle}>Z de caisse généré !</Text>
						<Text style={styles.successSubtitle}>
							N° {generated.sequenceNumber} · {zReportService.formatCents(generated.netSalesCents)}
						</Text>
						<TouchableOpacity style={[styles.btn, styles.btnSecondary, { marginTop: 16 }]} onPress={onClose}>
							<Text style={[styles.btnText, { color: THEME.colors.text.primary }]}>Fermer</Text>
						</TouchableOpacity>
					</View>
				)}

				{/* ── Historique ────────────────────────────────────── */}
				<TouchableOpacity
					style={[styles.btn, styles.btnGhost, { marginTop: 8 }]}
					onPress={handleShowHistory}
					disabled={loadingHistory}
				>
					{loadingHistory ? (
						<ActivityIndicator size="small" color={THEME.colors.text.muted} />
					) : (
						<>
							<Ionicons
								name={historyVisible ? "chevron-up-outline" : "time-outline"}
								size={16}
								color={THEME.colors.text.muted}
								style={{ marginRight: 6 }}
							/>
							<Text style={[styles.btnText, { color: THEME.colors.text.muted }]}>
								{historyVisible ? "Masquer l'historique" : "Historique des Z"}
							</Text>
						</>
					)}
				</TouchableOpacity>

				{historyVisible && (
					<View style={{ marginTop: 8 }}>
						{history.length === 0 ? (
							<Text style={styles.emptyText}>Aucun Z généré pour ce restaurant.</Text>
						) : (
							history.map((z) => (
								<View key={z._id} style={styles.historyItem}>
									<View style={{ flex: 1 }}>
										<Text style={styles.historyTitle}>Z #{z.sequenceNumber}</Text>
										<Text style={styles.historyMeta}>
											{new Date(z.periodStart).toLocaleDateString("fr-FR")}
											{" · "}
											{z.generatedBy?.name ?? "—"}
										</Text>
									</View>
									<Text style={styles.historyAmount}>
										{zReportService.formatCents(z.netSalesCents)}
									</Text>
								</View>
							))
						)}
						{historyMeta?.hasMore && (
							<Text style={styles.emptyText}>+ voir plus dans les archives</Text>
						)}
					</View>
				)}

				{/* Espace bas de page */}
				<View style={{ height: 40 }} />
			</ScrollView>
		</SafeAreaView>
	);
}

// ────────────────────────────────────────────────────────────────────────────
// Styles
// ────────────────────────────────────────────────────────────────────────────
const createStyles = (THEME) =>
	StyleSheet.create({
		safeArea: {
			flex: 1,
			backgroundColor: THEME.colors.background.dark,
		},

		// ─── Header ────────────────────────────────────────────────
		header: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			paddingHorizontal: 20,
			paddingVertical: 16,
			borderBottomWidth: 1,
			borderBottomColor: THEME.colors.border.subtle,
		},
		title: {
			fontSize: 18,
			fontWeight: "700",
			color: THEME.colors.text.primary,
		},
		closeBtn: {
			padding: 4,
		},

		// ─── Scroll ────────────────────────────────────────────────
		scroll: {
			flex: 1,
		},
		scrollContent: {
			paddingHorizontal: 20,
			paddingTop: 20,
		},

		// ─── Sections ──────────────────────────────────────────────
		section: {
			marginBottom: 16,
		},
		sectionLabel: {
			fontSize: 12,
			fontWeight: "600",
			color: THEME.colors.text.muted,
			textTransform: "uppercase",
			letterSpacing: 0.8,
			marginBottom: 8,
		},
		periodText: {
			fontSize: 14,
			color: THEME.colors.text.secondary,
		},

		// ─── Input ─────────────────────────────────────────────────
		input: {
			backgroundColor: THEME.colors.background.elevated,
			borderWidth: 1,
			borderColor: THEME.colors.border.subtle,
			borderRadius: 10,
			paddingHorizontal: 14,
			paddingVertical: 12,
			fontSize: 15,
			color: THEME.colors.text.primary,
		},

		// ─── Card ──────────────────────────────────────────────────
		card: {
			backgroundColor: THEME.colors.background.elevated,
			borderWidth: 1,
			borderColor: THEME.colors.border.subtle,
			borderRadius: 12,
			padding: 16,
			marginBottom: 16,
		},
		cardTitle: {
			fontSize: 15,
			fontWeight: "700",
			color: THEME.colors.text.primary,
			marginBottom: 16,
		},
		row: {
			flexDirection: "row",
			justifyContent: "space-between",
			paddingVertical: 6,
		},
		rowLabel: {
			fontSize: 14,
			color: THEME.colors.text.secondary,
			flex: 1,
		},
		rowValue: {
			fontSize: 14,
			color: THEME.colors.text.primary,
			textAlign: "right",
		},
		bold: {
			fontWeight: "700",
			fontSize: 15,
		},
		divider: {
			height: 1,
			backgroundColor: THEME.colors.border.subtle,
			marginVertical: 10,
		},

		// ─── Boutons ───────────────────────────────────────────────
		btn: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			paddingVertical: 13,
			paddingHorizontal: 20,
			borderRadius: 10,
			marginBottom: 10,
		},
		btnSecondary: {
			backgroundColor: THEME.colors.background.elevated,
			borderWidth: 1,
			borderColor: THEME.colors.border.subtle,
		},
		btnDanger: {
			backgroundColor: "#EF4444",
		},
		btnGhost: {
			backgroundColor: "transparent",
		},
		btnText: {
			fontSize: 14,
			fontWeight: "600",
		},

		// ─── Succès ────────────────────────────────────────────────
		successCard: {
			backgroundColor: THEME.colors.background.elevated,
			borderWidth: 1,
			borderColor: "#22C55E44",
			borderRadius: 12,
			padding: 24,
			alignItems: "center",
			marginBottom: 16,
		},
		successTitle: {
			fontSize: 18,
			fontWeight: "700",
			color: "#22C55E",
			marginBottom: 4,
		},
		successSubtitle: {
			fontSize: 14,
			color: THEME.colors.text.secondary,
		},

		// ─── Erreur ────────────────────────────────────────────────
		errorBox: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: "#FF4D4D18",
			borderRadius: 8,
			padding: 12,
			marginBottom: 12,
		},
		errorText: {
			color: "#FF4D4D",
			fontSize: 13,
			flex: 1,
		},

		// ─── Historique ────────────────────────────────────────────
		historyItem: {
			flexDirection: "row",
			alignItems: "center",
			paddingVertical: 12,
			borderBottomWidth: 1,
			borderBottomColor: THEME.colors.border.subtle,
		},
		historyTitle: {
			fontSize: 14,
			fontWeight: "600",
			color: THEME.colors.text.primary,
		},
		historyMeta: {
			fontSize: 12,
			color: THEME.colors.text.muted,
			marginTop: 2,
		},
		historyAmount: {
			fontSize: 15,
			fontWeight: "700",
			color: THEME.colors.text.primary,
		},
		emptyText: {
			fontSize: 13,
			color: THEME.colors.text.muted,
			textAlign: "center",
			paddingVertical: 16,
		},
	});
