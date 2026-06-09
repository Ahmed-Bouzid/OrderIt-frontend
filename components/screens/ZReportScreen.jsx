/**
 * ZReportScreen.jsx — Gestion complète du Z de caisse
 *
 * UN SEUL ÉCRAN pour :
 *  1. Ouvrir la caisse (début de journée)
 *  2. Voir le shift actif
 *  3. Clôturer la caisse (fin de journée → génère le Z automatiquement)
 *  4. Voir l'historique des Z + export
 *
 * Workflow simple :
 *  - Pas de shift → Bouton "Ouvrir la caisse" → saisie fond de caisse
 *  - Shift actif → Affichage infos + Bouton "Clôturer la caisse" → saisie espèces comptées → Z généré
 *  - Historique en bas avec export
 */

import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	TextInput,
	ScrollView,
	FlatList,
	ActivityIndicator,
	Alert,
	Modal,
	Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useTheme } from "../../hooks/useTheme";
import zReportService from "../../services/zReportService";
import cashShiftService from "../../services/cashShiftService";
import counterService from "../../services/counterService";

// ────────────────────────────────────────────────────────────────────────────
// Formateur Z de caisse en texte ASCII exportable
// ────────────────────────────────────────────────────────────────────────────
function buildZText(z) {
	const SEP  = "═".repeat(40);
	const sep2 = "─".repeat(40);
	const pad  = (l, r, w = 40) => {
		const gap = w - l.length - r.length;
		return l + " ".repeat(Math.max(1, gap)) + r;
	};
	const fmt  = (cents) => zReportService.formatCents(cents);
	const dt   = (iso)   => new Date(iso).toLocaleString("fr-FR", {
		weekday: "long", day: "numeric", month: "long", year: "numeric",
		hour: "2-digit", minute: "2-digit",
	});

	const lines = [
		SEP,
		"          Z DE CAISSE — CLÔTURE JOURNÉE",
		SEP,
		"",
		pad("  Z n°", `#${z.sequenceNumber}  `),
		`  Généré le : ${dt(z.createdAt)}`,
		"",
		sep2,
		"  PÉRIODE COUVERTE",
		sep2,
		`  Du  : ${dt(z.periodStart)}`,
		`  Au  : ${dt(z.periodEnd)}`,
		"",
		sep2,
		"  CHIFFRE D'AFFAIRES",
		sep2,
		pad("  CA brut",  fmt(z.grossSalesCents)),
		z.totalRefundsCents > 0 ? pad("  Remboursements", `- ${fmt(z.totalRefundsCents)}`) : null,
		z.totalVoidsCents   > 0 ? pad("  Annulations (voids)", `- ${fmt(z.totalVoidsCents)}`) : null,
		"  " + "·".repeat(36),
		pad("  CA NET",   fmt(z.netSalesCents)),
		"",
		sep2,
		"  VENTILATION PAR MOYEN DE PAIEMENT",
		sep2,
		...(z.paymentBreakdown ?? []).map((p) =>
			pad(
				`  ${METHOD_LABEL[p.method] || p.method} (${p.ticketCount} ticket${p.ticketCount > 1 ? "s" : ""})`,
				fmt(p.amountCents),
			)
		),
		"",
		sep2,
		"  STATISTIQUES TICKETS",
		sep2,
		pad("  Nombre de tickets",  String(z.ticketCount)),
		pad("  Panier moyen",       fmt(z.avgBasketCents)),
		z.maxTicketCents > 0 ? pad("  Ticket max", fmt(z.maxTicketCents)) : null,
		"",
	];

	if (z.openingFloatCents > 0 || z.closingCountCents > 0) {
		const cashSales = (z.paymentBreakdown ?? []).find((p) => p.method === "cash")?.amountCents ?? 0;
		const expected  = z.openingFloatCents + cashSales;
		lines.push(
			sep2,
			"  GESTION CAISSE ESPÈCES",
			sep2,
			pad("  Fond de caisse initial",  fmt(z.openingFloatCents)),
			pad("  Ventes espèces",          fmt(cashSales)),
			pad("  Espèces attendues",        fmt(expected)),
			pad("  Espèces comptées",         fmt(z.closingCountCents)),
			"  " + "·".repeat(36),
			pad("  ÉCART CAISSE", zReportService.formatVariance(z.cashVarianceCents)),
			"",
		);
	}

	// Section TOP PRODUITS pour les Z event-sourced
	if (z.topProducts && z.topProducts.length > 0) {
		lines.push(
			sep2,
			"  TOP PRODUITS VENDUS",
			sep2,
		);
		for (const p of z.topProducts) {
			const total = fmt(p.totalRevenueCents);
			lines.push(pad(`  ${p.quantity}x ${p.name}`, total));
		}
		lines.push("");
	}

	if (z.notes) {
		lines.push(sep2, "  NOTES", sep2, `  ${z.notes}`, "");
	}

	lines.push(
		SEP,
		`  Document généré le ${new Date().toLocaleString("fr-FR")}`,
		SEP,
	);

	return lines.filter((l) => l !== null).join("\n");
}

const METHOD_LABEL = {
	card:       "Carte bancaire",
	cash:       "Espèces",
	check:      "Chèque",
	voucher:    "Ticket restaurant",
	other:      "Autre",
};

// ────────────────────────────────────────────────────────────────────────────
// Composant principal
// ────────────────────────────────────────────────────────────────────────────
export default function ZReportScreen({ restaurantId, onClose }) {
	const THEME = useTheme();
	const styles = useMemo(() => createStyles(THEME), [THEME]);

	console.log("[ZReportScreen] Rendu avec restaurantId:", restaurantId);

	// ── État ─────────────────────────────────────────────────────────────
	const [activeShift, setActiveShift] = useState(null);
	const [loadingShift, setLoadingShift] = useState(true);
	const [openingFloat, setOpeningFloat] = useState("");
	const [closingCount, setClosingCount] = useState("");
	const [deviceId, setDeviceId] = useState("");
	const [notes, setNotes] = useState("");
	const [loading, setLoading] = useState(false);
	const [history, setHistory] = useState([]);
	const [loadingHistory, setLoadingHistory] = useState(false);
	const [selectedZ, setSelectedZ] = useState(null);

	// ── Fonctions de chargement ──────────────────────────────────────────
	const loadShift = async () => {
		console.log("[ZReportScreen] loadShift() appelé");
		try {
			const response = await cashShiftService.getActiveShift();
			console.log("[ZReportScreen] Response complète:", response);
			const shift = response?.shift || null;
			console.log("[ZReportScreen] Shift extrait:", shift);
			setActiveShift(shift);
			if (shift) {
				setOpeningFloat((shift.openingFloatCents / 100).toFixed(2));
			}
		} catch (e) {
			console.warn("[ZReportScreen] Pas de shift actif:", e);
			setActiveShift(null);
		} finally {
			console.log("[ZReportScreen] loadShift terminé, loadingShift -> false");
			setLoadingShift(false);
		}
	};

	const loadHistory = async () => {
		if (!restaurantId) {
			console.warn("[ZReportScreen] Pas de restaurantId pour charger l'historique");
			setLoadingHistory(false);
			return;
		}
		setLoadingHistory(true);
		try {
			const { data } = await zReportService.list(restaurantId, 1, 20);
			setHistory(data);
		} catch (e) {
			console.warn("[ZReportScreen] Erreur historique:", e);
		} finally {
			setLoadingHistory(false);
		}
	};

	// ── Charger le shift actif + historique au montage ───────────────────
	useEffect(() => {
		console.log("[ZReportScreen] useEffect monté");
		loadShift();
		loadHistory();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// ── Ouvrir la caisse ─────────────────────────────────────────────────
	const handleOpenShift = async () => {
		const opening = parseFloat((openingFloat || "0").replace(",", ".")) || 0;
		if (opening <= 0) {
			Alert.alert("Fond de caisse requis", "Veuillez saisir le montant du fond de caisse initial.");
			return;
		}

		Alert.alert(
			"Ouvrir la caisse",
			`Fond de caisse : ${opening.toFixed(2)} €\n\nConfirmer l'ouverture ?`,
			[
				{ text: "Annuler", style: "cancel" },
				{
					text: "Ouvrir",
					onPress: async () => {
						setLoading(true);
						try {
							const response = await cashShiftService.openShift({
								openingFloatCents: Math.round(opening * 100),
								deviceId: deviceId.trim() || undefined,
								notes: notes.trim() || undefined,
							});
							const shift = response?.shift;
							setActiveShift(shift);
							setDeviceId("");
							setNotes("");
							Alert.alert("Caisse ouverte", `Shift #${shift.sequenceNumber} démarré.`);
						} catch (e) {
							Alert.alert("Erreur", e.message || "Impossible d'ouvrir la caisse.");
						} finally {
							setLoading(false);
						}
					},
				},
			]
		);
	};

	// ── Clôturer la caisse ───────────────────────────────────────────────
	const handleCloseShift = async () => {
		if (!activeShift) return;

		// 🚫 Bloquer si des tables sont encore ouvertes
		try {
			const tables = await counterService.getTablesState(restaurantId);
			const openTables = tables.filter((t) => t.isAvailable === false);
			if (openTables.length > 0) {
				const names = openTables.map((t) => t.number || t._id).join(", ");
				Alert.alert(
					"Tables encore ouvertes",
					`Impossible de clôturer la caisse : ${openTables.length} table(s) sont encore en service.\n\nTables : ${names}\n\nClôturez toutes les tables avant de générer le Z.`,
					[{ text: "OK" }]
				);
				return;
			}
		} catch (e) {
			console.warn("[ZReportScreen] Impossible de vérifier les tables ouvertes:", e);
			// Ne pas bloquer si la vérification échoue (fail-open)
		}

		const closing = parseFloat((closingCount || "0").replace(",", ".")) || 0;

		Alert.alert(
			"Clôturer la caisse",
			`Espèces comptées : ${closing.toFixed(2)} €\n\nCette opération génère le Z de caisse est IRRÉVERSIBLE.\n\nConfirmer ?`,
			[
				{ text: "Annuler", style: "cancel" },
				{
					text: "Clôturer",
					style: "destructive",
					onPress: async () => {
						setLoading(true);
						try {
							const result = await cashShiftService.closeShift(activeShift._id, {
								closingCountCents: Math.round(closing * 100),
								notes: notes.trim() || undefined,
							});
							setActiveShift(null);
							setClosingCount("");
							setNotes("");
							loadHistory(); // Recharger l'historique
							Alert.alert(
								"Caisse clôturée",
								`Z #${result.zReport.sequenceNumber} généré avec succès.`,
								[{ text: "OK" }]
							);
						} catch (e) {
							Alert.alert("Erreur", e.message || "Impossible de clôturer la caisse.");
						} finally {
							setLoading(false);
						}
					},
				},
			]
		);
	};

	// ── Export Z ─────────────────────────────────────────────────────────
	const handleExport = async (zData) => {
		const canShare = await Sharing.isAvailableAsync();
		if (!canShare) {
			Alert.alert("Export non disponible", "Le partage de fichiers n'est pas disponible sur cet appareil.");
			return;
		}

		try {
			const text     = buildZText(zData);
			const fileName = `Z-caisse-${zData.sequenceNumber ?? "export"}-${new Date().toISOString().slice(0,10)}.txt`;
			const fileUri  = FileSystem.cacheDirectory + fileName;
			await FileSystem.writeAsStringAsync(fileUri, text, { encoding: FileSystem.EncodingType.UTF8 });
			await Sharing.shareAsync(fileUri, {
				mimeType: "text/plain",
				dialogTitle: `Z de caisse #${zData.sequenceNumber}`,
				UTI: "public.plain-text",
			});
		} catch (e) {
			Alert.alert("Erreur export", e.message || "Impossible d'exporter le Z.");
		}
	};

	// ── Rendu ────────────────────────────────────────────────────────────
	return (
		<Modal
			visible={true}
			transparent={true}
			animationType="fade"
			onRequestClose={onClose}
		>
			<View style={styles.modalOverlay}>
				<View style={styles.modalContainer}>
					{/* Header */}
					<View style={styles.header}>
						<Text style={styles.title}>💰 Z de caisse</Text>
						<TouchableOpacity onPress={onClose} style={styles.closeBtn}>
							<Ionicons name="close" size={24} color="#E2E8F0" />
						</TouchableOpacity>
					</View>

					<ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
						{/* ── DÉTAIL D'UN Z SÉLECTIONNÉ ──────────────────────── */}
						{selectedZ ? (
							<View>
								<TouchableOpacity
									style={[styles.btn, styles.btnSecondary]}
									onPress={() => setSelectedZ(null)}
								>
									<Ionicons name="arrow-back" size={18} color="#E2E8F0" style={{ marginRight: 8 }} />
									<Text style={styles.btnText}>Retour</Text>
								</TouchableOpacity>

								{/* En-tête */}
								<View style={styles.card}>
									<View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
										<Ionicons name="receipt-outline" size={28} color="#F59E0B" style={{ marginRight: 12 }} />
										<View style={{ flex: 1 }}>
											<Text style={styles.cardTitle}>Z de caisse #{selectedZ.sequenceNumber}</Text>
											<Text style={styles.cardSubtitle}>
												{new Date(selectedZ.createdAt).toLocaleDateString("fr-FR", {
													weekday: "long", day: "numeric", month: "long", year: "numeric"
												})} • {new Date(selectedZ.createdAt).toLocaleTimeString("fr-FR", {
													hour: "2-digit", minute: "2-digit"
												})}
											</Text>
										</View>
									</View>

									{selectedZ.generationMode === "event_sourced" && (
										<View style={[styles.badge, { backgroundColor: "#10B98120" }]}>
											<Ionicons name="shield-checkmark" size={14} color="#10B981" style={{ marginRight: 6 }} />
											<Text style={[styles.badgeText, { color: "#10B981" }]}>
												Event sourced • {selectedZ.eventsLocked || 0} événements verrouillés
											</Text>
										</View>
									)}
								</View>

								{/* Chiffres clés */}
								<View style={styles.card}>
									<Text style={styles.sectionTitle}>💰 Chiffres clés</Text>
									<View style={styles.row}>
										<Text style={styles.rowLabel}>CA brut</Text>
										<Text style={styles.rowValue}>{zReportService.formatCents(selectedZ.grossSalesCents || 0)}</Text>
									</View>
									<View style={styles.row}>
										<Text style={styles.rowLabel}>Remises totales</Text>
										<Text style={[styles.rowValue, { color: "#F59E0B" }]}>
											-{zReportService.formatCents(selectedZ.totalDiscountsCents || 0)}
										</Text>
									</View>
									<View style={styles.divider} />
									<View style={styles.row}>
										<Text style={[styles.rowLabel, { fontWeight: "700", fontSize: 16 }]}>CA net</Text>
										<Text style={[styles.rowValue, styles.highlight, { fontSize: 20 }]}>
											{zReportService.formatCents(selectedZ.netSalesCents)}
										</Text>
									</View>
									<View style={styles.divider} />
									<View style={styles.row}>
										<Text style={styles.rowLabel}>Nombre de tickets</Text>
										<Text style={styles.rowValue}>{selectedZ.ticketCount}</Text>
									</View>
									<View style={styles.row}>
										<Text style={styles.rowLabel}>Panier moyen</Text>
										<Text style={styles.rowValue}>{zReportService.formatCents(selectedZ.avgBasketCents)}</Text>
									</View>
								</View>

								{/* Répartition paiements */}
							{selectedZ.paymentBreakdown && selectedZ.paymentBreakdown.length > 0 && (
								<View style={styles.card}>
									<Text style={styles.sectionTitle}>💳 Répartition des paiements</Text>
									{selectedZ.paymentBreakdown.map((payment) => (
										<View key={payment.method} style={styles.row}>
											<Text style={styles.rowLabel}>{METHOD_LABEL[payment.method] || payment.method}</Text>
											<Text style={styles.rowValue}>{zReportService.formatCents(payment.amountCents)}</Text>
										</View>
									))}
								</View>
							)}

								{/* Contrôle caisse */}
								{selectedZ.cashVarianceCents !== undefined && (
									<View style={styles.card}>
										<Text style={styles.sectionTitle}>💵 Contrôle caisse</Text>
										<View style={styles.row}>
											<Text style={styles.rowLabel}>Espèces théoriques</Text>
											<Text style={styles.rowValue}>
												{zReportService.formatCents(selectedZ.expectedCashCents || 0)}
											</Text>
										</View>
										<View style={styles.row}>
											<Text style={styles.rowLabel}>Espèces comptées</Text>
											<Text style={styles.rowValue}>
												{zReportService.formatCents(selectedZ.closingCountCents || 0)}
											</Text>
										</View>
										<View style={styles.divider} />
										<View style={styles.row}>
											<Text style={[styles.rowLabel, { fontWeight: "700" }]}>Écart caisse</Text>
											<Text style={[
												styles.rowValue,
												{ fontWeight: "700" },
												selectedZ.cashVarianceCents === 0 ? styles.success :
												selectedZ.cashVarianceCents > 0 ? styles.warning :
												styles.error
											]}>
												{zReportService.formatVariance(selectedZ.cashVarianceCents)}
											</Text>
										</View>
									</View>
								)}

								{/* Top produits */}
								{selectedZ.topProducts && selectedZ.topProducts.length > 0 && (
									<View style={styles.card}>
										<Text style={styles.sectionTitle}>🏆 Top 3 produits</Text>
										{selectedZ.topProducts.slice(0, 3).map((p, i) => (
											<View key={i} style={styles.row}>
												<Text style={styles.rowLabel}>
													{i + 1}. {p.name} (×{p.quantity})
												</Text>
												<Text style={styles.rowValue}>{zReportService.formatCents(p.totalCents)}</Text>
											</View>
										))}
									</View>
								)}
								{/* Tous les articles */}
								{selectedZ.allProducts && selectedZ.allProducts.length > 0 && (() => {
									console.log("🔍 [ZReportScreen] selectedZ complet :", JSON.stringify(selectedZ, null, 2));
									console.log("🔍 [ZReportScreen] allProducts :", JSON.stringify(selectedZ.allProducts, null, 2));
									return (
										<View style={styles.card}>
											<Text style={styles.sectionTitle}>📋 Tous les articles vendus ({selectedZ.allProducts.length})</Text>
											<FlatList
												data={selectedZ.allProducts}
												keyExtractor={(item, idx) => `product-${idx}`}
												scrollEnabled={false}
												renderItem={({ item, index }) => (
													<View style={styles.productItem}>
														<View style={{ flex: 1 }}>
															<Text style={styles.productName}>{item.name}</Text>
															<Text style={styles.productQty}>Quantité : {item.quantity}</Text>
														</View>
														<Text style={styles.productRevenue}>
															{zReportService.formatCents(item.revenueCents)}
														</Text>
													</View>
												)}
												ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: "#334155", marginVertical: 8 }} />}
											/>
										</View>
									);
								})()}
								{/* Période */}
								<View style={styles.card}>
									<Text style={styles.sectionTitle}>📅 Période</Text>
									<View style={styles.row}>
										<Text style={styles.rowLabel}>Début</Text>
										<Text style={styles.rowValue}>
											{new Date(selectedZ.periodStart).toLocaleString("fr-FR", {
												day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
											})}
										</Text>
									</View>
									<View style={styles.row}>
										<Text style={styles.rowLabel}>Fin</Text>
										<Text style={styles.rowValue}>
											{new Date(selectedZ.periodEnd).toLocaleString("fr-FR", {
												day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
											})}
										</Text>
									</View>
								</View>

								{/* Notes */}
								{selectedZ.notes && (
									<View style={styles.card}>
										<Text style={styles.sectionTitle}>📝 Notes</Text>
										<Text style={styles.rowValue}>{selectedZ.notes}</Text>
									</View>
								)}

								<TouchableOpacity
									style={[styles.btn, styles.btnPrimary]}
									onPress={() => handleExport(selectedZ)}
								>
									<Ionicons name="share-outline" size={18} color="#0F172A" style={{ marginRight: 8 }} />
									<Text style={[styles.btnText, { color: "#0F172A" }]}>Exporter ce Z</Text>
								</TouchableOpacity>
							</View>
						) : (
							<>
								{/* ── SECTION SHIFT ────────────────────────────────── */}
								{loadingShift ? (
									<View style={styles.centerLoader}>
										<ActivityIndicator size="large" color="#F59E0B" />
									</View>
								) : activeShift ? (
									/* Shift actif → Clôture */
									<View style={styles.section}>
										<View style={styles.badge}>
											<Ionicons name="checkmark-circle" size={16} color="#10B981" style={{ marginRight: 6 }} />
											<Text style={styles.badgeText}>Shift #{activeShift.sequenceNumber} ouvert</Text>
										</View>

										<View style={styles.card}>
											<Text style={styles.cardTitle}>Caisse ouverte</Text>
											<View style={styles.row}>
												<Text style={styles.rowLabel}>Fond de caisse initial</Text>
												<Text style={styles.rowValue}>{(activeShift.openingFloatCents / 100).toFixed(2)} €</Text>
											</View>
											<View style={styles.row}>
												<Text style={styles.rowLabel}>Ouvert le</Text>
												<Text style={styles.rowValue}>
													{new Date(activeShift.openedAt).toLocaleString("fr-FR", {
														day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
													})}
												</Text>
											</View>
										</View>

										<Text style={styles.sectionLabel}>Espèces comptées à la clôture (€)</Text>
										<TextInput
											style={styles.input}
											placeholder="ex : 247.50"
											placeholderTextColor="#64748B"
											keyboardType="decimal-pad"
											value={closingCount}
											onChangeText={setClosingCount}
										/>

										<Text style={styles.sectionLabel}>Notes (optionnel)</Text>
										<TextInput
											style={[styles.input, { height: 60 }]}
											placeholder="Remarques sur la journée..."
											placeholderTextColor="#64748B"
											multiline
											value={notes}
											onChangeText={setNotes}
										/>

										<TouchableOpacity
											style={[styles.btn, styles.btnPrimary]}
											onPress={handleCloseShift}
											disabled={loading}
										>
											{loading ? (
												<ActivityIndicator size="small" color="#0F172A" />
											) : (
												<>
													<Ionicons name="lock-closed" size={18} color="#0F172A" style={{ marginRight: 8 }} />
													<Text style={[styles.btnText, { color: "#0F172A" }]}>Clôturer la caisse</Text>
												</>
											)}
										</TouchableOpacity>
									</View>
								) : (
									/* Pas de shift → Ouverture */
									<View style={styles.section}>
										<View style={[styles.badge, { backgroundColor: "#F59E0B" }]}>
											<Ionicons name="warning" size={16} color="#FFF" style={{ marginRight: 6 }} />
											<Text style={[styles.badgeText, { color: "#FFF" }]}>Aucun shift actif</Text>
										</View>

										<View style={styles.card}>
											<Text style={styles.cardTitle}>Ouvrir la caisse</Text>
											<Text style={styles.cardSubtitle}>
												Démarrez un nouveau shift pour commencer la journée
											</Text>
										</View>

										<Text style={styles.sectionLabel}>Fond de caisse initial (€) *</Text>
										<TextInput
											style={styles.input}
											placeholder="ex : 100.00"
											placeholderTextColor="#64748B"
											keyboardType="decimal-pad"
											value={openingFloat}
											onChangeText={setOpeningFloat}
										/>

										<Text style={styles.sectionLabel}>ID appareil (optionnel)</Text>
										<TextInput
											style={styles.input}
											placeholder="ex : Caisse 1"
											placeholderTextColor="#64748B"
											value={deviceId}
											onChangeText={setDeviceId}
										/>

										<Text style={styles.sectionLabel}>Notes (optionnel)</Text>
										<TextInput
											style={[styles.input, { height: 60 }]}
											placeholder="Remarques..."
											placeholderTextColor="#64748B"
											multiline
											value={notes}
											onChangeText={setNotes}
										/>

										<TouchableOpacity
											style={[styles.btn, styles.btnPrimary]}
											onPress={handleOpenShift}
											disabled={loading}
										>
											{loading ? (
												<ActivityIndicator size="small" color="#0F172A" />
											) : (
												<>
													<Ionicons name="log-in-outline" size={18} color="#0F172A" style={{ marginRight: 8 }} />
													<Text style={[styles.btnText, { color: "#0F172A" }]}>Ouvrir la caisse</Text>
												</>
											)}
										</TouchableOpacity>
									</View>
								)}

								{/* ── HISTORIQUE DES Z ──────────────────────────────── */}
								<View style={[styles.section, { marginTop: 32 }]}>
									<Text style={styles.sectionTitle}>📋 Historique des Z</Text>

									{loadingHistory ? (
										<View style={styles.centerLoader}>
											<ActivityIndicator size="small" color="#F59E0B" />
										</View>
									) : history.length === 0 ? (
										<View style={styles.emptyState}>
											<Ionicons name="document-outline" size={48} color="#475569" />
											<Text style={styles.emptyText}>Aucun Z de caisse généré</Text>
										</View>
									) : (
										history.map((z) => (
											<TouchableOpacity
												key={z._id}
												style={styles.historyItem}
												onPress={() => setSelectedZ(z)}
											>
												<View style={styles.historyLeft}>
													<Text style={styles.historyTitle}>Z #{z.sequenceNumber}</Text>
													<Text style={styles.historyDate}>
														{new Date(z.createdAt).toLocaleDateString("fr-FR", {
															day: "numeric", month: "short", year: "numeric"
														})}
													</Text>
												</View>
												<View style={styles.historyRight}>
													<Text style={styles.historyAmount}>
														{zReportService.formatCents(z.netSalesCents)}
													</Text>
													<Ionicons name="chevron-forward" size={20} color="#64748B" />
												</View>
											</TouchableOpacity>
										))
									)}
								</View>
							</>
						)}
					</ScrollView>
				</View>
			</View>
		</Modal>
	);
}

// ────────────────────────────────────────────────────────────────────────────
// Styles
// ────────────────────────────────────────────────────────────────────────────
function createStyles(THEME) {
	return StyleSheet.create({
		modalOverlay: {
			flex: 1,
			backgroundColor: "rgba(0,0,0,0.70)",
			justifyContent: "center",
			alignItems: "center",
		},
		modalContainer: {
			backgroundColor: "#1E293B",
			borderRadius: 20,
			width: "90%",
			maxWidth: 600,
			height: "80%",
			overflow: "hidden",
			shadowColor: "#000",
			shadowOffset: { width: 0, height: 4 },
			shadowOpacity: 0.3,
			shadowRadius: 8,
			elevation: 10,
		},
		header: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			paddingHorizontal: 20,
			paddingVertical: 16,
			borderBottomWidth: 1,
			borderBottomColor: "#334155",
		},
		title: {
			fontSize: 20,
			fontWeight: "700",
			color: "#E2E8F0",
		},
		closeBtn: {
			padding: 8,
		},
		scroll: {
			flex: 1,
		},
		scrollContent: {
			padding: 20,
			paddingBottom: 40,
		},
		centerLoader: {
			flex: 1,
			justifyContent: "center",
			alignItems: "center",
			minHeight: 300,
		},
		section: {
			marginBottom: 24,
		},
		sectionTitle: {
			fontSize: 16,
			fontWeight: "700",
			color: "#E2E8F0",
			marginBottom: 12,
		},
		sectionLabel: {
			fontSize: 13,
			fontWeight: "600",
			color: "#94A3B8",
			marginBottom: 8,
			marginTop: 12,
		},
		badge: {
			flexDirection: "row",
			alignItems: "center",
			alignSelf: "flex-start",
			paddingHorizontal: 12,
			paddingVertical: 6,
			borderRadius: 20,
			backgroundColor: "#334155",
			marginBottom: 16,
		},
		badgeText: {
			fontSize: 12,
			fontWeight: "600",
			color: "#E2E8F0",
		},
		card: {
			backgroundColor: "#0F172A",
			borderRadius: 12,
			padding: 16,
			marginBottom: 16,
		},
		cardTitle: {
			fontSize: 16,
			fontWeight: "700",
			color: "#E2E8F0",
			marginBottom: 4,
		},
		cardSubtitle: {
			fontSize: 13,
			color: "#94A3B8",
			marginBottom: 12,
		},
		row: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			paddingVertical: 8,
		},
		rowLabel: {
			fontSize: 14,
			color: "#94A3B8",
		},
		rowValue: {
			fontSize: 14,
			fontWeight: "600",
			color: "#E2E8F0",
		},
		highlight: {
			color: "#F59E0B",
			fontSize: 16,
			fontWeight: "700",
		},
		success: { color: "#10B981" },
		warning: { color: "#F59E0B" },
		error: { color: "#EF4444" },
		divider: {
			height: 1,
			backgroundColor: "#334155",
			marginVertical: 12,
		},
		input: {
			backgroundColor: "#0F172A",
			borderWidth: 1,
			borderColor: "#334155",
			borderRadius: 8,
			paddingHorizontal: 16,
			paddingVertical: 12,
			fontSize: 15,
			color: "#E2E8F0",
		},
		btn: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			paddingVertical: 14,
			paddingHorizontal: 20,
			borderRadius: 10,
			marginTop: 12,
		},
		btnPrimary: {
			backgroundColor: "#F59E0B",
		},
		btnSecondary: {
			backgroundColor: "#334155",
		},
		btnText: {
			fontSize: 15,
			fontWeight: "600",
			color: "#E2E8F0",
		},
		historyItem: {
			backgroundColor: "#0F172A",
			borderRadius: 12,
			padding: 16,
			marginBottom: 12,
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
		},
		historyLeft: {
			flex: 1,
		},
		historyTitle: {
			fontSize: 15,
			fontWeight: "700",
			color: "#E2E8F0",
			marginBottom: 4,
		},
		historyDate: {
			fontSize: 12,
			color: "#64748B",
		},
		historyRight: {
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
		},
		historyAmount: {
			fontSize: 15,
			fontWeight: "600",
			color: "#F59E0B",
		},
		emptyState: {
			alignItems: "center",
			paddingVertical: 40,
		},
		emptyText: {
			fontSize: 14,
			color: "#64748B",
			marginTop: 12,
		},
		productItem: {
			flexDirection: "row",
			alignItems: "center",
			paddingVertical: 8,
		},
		productName: {
			fontSize: 14,
			fontWeight: "600",
			color: "#E2E8F0",
			marginBottom: 4,
		},
		productQty: {
			fontSize: 12,
			color: "#94A3B8",
		},
		productRevenue: {
			fontSize: 14,
			fontWeight: "700",
			color: "#F59E0B",
			marginLeft: 12,
		},
	});
}
