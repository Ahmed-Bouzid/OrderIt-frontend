/**
 * CashShiftScreen.jsx — Gestion des shifts de caisse (Event Sourcing)
 * 
 * Phase 2 de la migration Event Sourcing : Interface de gestion des shifts
 * Modale centrée (même pattern que TableDetailModal)
 * 
 * Fonctionnalités :
 * - Ouvrir un shift (fond de caisse initial)
 * - Voir le shift actif en cours
 * - Fermer le shift + générer Z de caisse (event-sourced)
 * - Historique des shifts récents
 * 
 * Accessible uniquement aux managers/admins
 */

import React, { useState, useCallback, useEffect } from "react";
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	TextInput,
	ScrollView,
	ActivityIndicator,
	Alert,
	Modal,
	Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import cashShiftService from "../../services/cashShiftService";

export default function CashShiftScreen({ visible = true, onClose }) {
	// État du shift actif
	const [activeShift, setActiveShift] = useState(null);
	const [loading, setLoading] = useState(true);

	// Formulaire ouverture shift
	const [openingFloat, setOpeningFloat] = useState("100.00");
	const [deviceId, setDeviceId] = useState("");

	// Formulaire fermeture shift
	const [closingCount, setClosingCount] = useState("100.00");

	// État opérations
	const [isOpening, setIsOpening] = useState(false);
	const [isClosing, setIsClosing] = useState(false);

	// Historique des shifts
	const [shiftsHistory, setShiftsHistory] = useState([]);

	// Charger les données initiales
	useEffect(() => {
		if (visible) loadData();
	}, [visible]);

	const loadData = useCallback(async () => {
		setLoading(true);
		try {
			// Charger shift actif
			const activeRes = await cashShiftService.getActiveShift();
			setActiveShift(activeRes.shift);

			// Si shift actif, pré-remplir le compte caisse avec le fond initial
			if (activeRes.shift) {
				setClosingCount(((activeRes.shift.openingFloatCents || 10000) / 100).toFixed(2));
			}

			// Charger historique (5 derniers shifts)
			const historyRes = await cashShiftService.listShifts({ page: 1, limit: 5 });
			setShiftsHistory(historyRes.data || []);
		} catch (err) {
			console.error("[CashShift] Erreur chargement:", err);
			Alert.alert("Erreur", err.message || "Impossible de charger les données");
		} finally {
			setLoading(false);
		}
	}, []);

	const handleOpenShift = useCallback(async () => {
		const floatCents = Math.round(parseFloat(openingFloat || "0") * 100);

		if (floatCents < 0) {
			Alert.alert("Erreur", "Le fond de caisse ne peut pas être négatif");
			return;
		}

		Alert.alert(
			"Confirmer l'ouverture",
			`Ouvrir un shift avec un fond de caisse de ${(floatCents / 100).toFixed(2)}€ ?`,
			[
				{ text: "Annuler", style: "cancel" },
				{
					text: "Ouvrir",
					style: "default",
					onPress: async () => {
						setIsOpening(true);
						try {
							const res = await cashShiftService.openShift({
								openingFloatCents: floatCents,
								deviceId: deviceId || null,
							});

							Alert.alert("✅ Shift ouvert", `Shift n°${res.shift.sequenceNumber} créé avec succès`);
							await loadData();
						} catch (err) {
							console.error("[CashShift] Erreur ouverture:", err);
							Alert.alert("Erreur", err.message || "Impossible d'ouvrir le shift");
						} finally {
							setIsOpening(false);
						}
					},
				},
			]
		);
	}, [openingFloat, deviceId, loadData]);

	const handleCloseShift = useCallback(async () => {
		if (!activeShift) return;

		const countCents = Math.round(parseFloat(closingCount || "0") * 100);

		if (countCents < 0) {
			Alert.alert("Erreur", "Le compte caisse ne peut pas être négatif");
			return;
		}

		const expectedCashCents = activeShift.openingFloatCents || 0;
		const varianceCents = countCents - expectedCashCents;
		const variance = (varianceCents / 100).toFixed(2);

		Alert.alert(
			"⚠️ Confirmer la fermeture",
			`Fermer le shift n°${activeShift.sequenceNumber} ?\n\nCompte caisse : ${(countCents / 100).toFixed(2)}€\nÉcart : ${variance}€\n\n⚠️ Cette action va générer le Z de caisse et est irréversible.`,
			[
				{ text: "Annuler", style: "cancel" },
				{
					text: "Fermer & Générer Z",
					style: "destructive",
					onPress: async () => {
						setIsClosing(true);
						try {
							const res = await cashShiftService.closeShift(activeShift._id, {
								closingCountCents: countCents,
							});

							const zReport = res.zReport;
							Alert.alert(
								"✅ Shift fermé",
								`Z n°${zReport.sequenceNumber} généré avec succès\n\nCA net : ${(zReport.netSalesCents / 100).toFixed(2)}€\nTickets : ${zReport.ticketCount}\nÉcart caisse : ${(zReport.cashVarianceCents / 100).toFixed(2)}€`,
								[{ text: "OK", onPress: () => loadData() }]
							);
						} catch (err) {
							console.error("[CashShift] Erreur fermeture:", err);
							Alert.alert("Erreur", err.message || "Impossible de fermer le shift");
						} finally {
							setIsClosing(false);
						}
					},
				},
			]
		);
	}, [activeShift, closingCount, loadData]);

	const formatDate = (isoString) => {
		return new Date(isoString).toLocaleString("fr-FR", {
			day: "2-digit",
			month: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	// ─── Render : Loading ─────────────────────────────────────────────────
	if (loading) {
		return (
			<Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
				<Pressable style={styles.overlay} onPress={onClose}>
					<Pressable onPress={() => {}} style={[styles.sheet, styles.loadingSheet]}>
						<ActivityIndicator size="large" color="#FBBF24" />
						<Text style={styles.loadingText}>Chargement...</Text>
					</Pressable>
				</Pressable>
			</Modal>
		);
	}

	// ─── Render : Main ─────────────────────────────────────────────────────
	return (
		<Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
			<Pressable style={styles.overlay} onPress={onClose}>
				<Pressable onPress={() => {}} style={styles.sheet}>
					{/* ── HEADER ────────────────────────────────────── */}
					<View style={styles.header}>
						<Text style={styles.headerTitle}>💰 Gestion de Caisse</Text>
						<TouchableOpacity onPress={onClose} style={styles.closeBtn}>
							<Ionicons name="close" size={24} color="#94A3B8" />
						</TouchableOpacity>
					</View>

					{/* ── CONTENT ───────────────────────────────────── */}
					<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
						{/* Section : Shift actif */}
						{activeShift ? (
							<View style={styles.card}>
								<View style={styles.cardHeader}>
									<Text style={styles.cardTitle}>✅ Shift actif</Text>
									<View style={styles.badge}>
										<Text style={styles.badgeText}>#{activeShift.sequenceNumber}</Text>
									</View>
								</View>

								<View style={styles.row}>
									<Text style={styles.label}>Ouvert le</Text>
									<Text style={styles.value}>{formatDate(activeShift.openedAt)}</Text>
								</View>

								<View style={styles.row}>
									<Text style={styles.label}>Fond de caisse</Text>
									<Text style={styles.value}>
										{((activeShift.openingFloatCents || 0) / 100).toFixed(2)}€
									</Text>
								</View>

								{/* Formulaire fermeture */}
								<View style={styles.separator} />
								<Text style={styles.sectionTitle}>Fermeture du shift</Text>

								<View style={styles.inputGroup}>
									<Text style={styles.inputLabel}>Compte caisse (€)</Text>
									<TextInput
										style={styles.input}
										placeholder="250.00"
										placeholderTextColor="#64748B"
										value={closingCount}
										onChangeText={setClosingCount}
										keyboardType="decimal-pad"
									/>
								</View>

								<TouchableOpacity
									style={[styles.button, styles.buttonDanger]}
									onPress={handleCloseShift}
									disabled={isClosing}
								>
									{isClosing ? (
										<ActivityIndicator color="#fff" />
									) : (
										<>
											<Ionicons name="lock-closed" size={20} color="#fff" />
											<Text style={styles.buttonText}>Fermer & Générer Z</Text>
										</>
									)}
								</TouchableOpacity>
							</View>
						) : (
							/* Section : Aucun shift actif */
							<View style={styles.card}>
								<View style={styles.cardHeader}>
									<Text style={styles.cardTitle}>📊 Aucun shift actif</Text>
								</View>

								<Text style={styles.hint}>
									Ouvrez un shift pour commencer à enregistrer les opérations de caisse.
								</Text>

								{/* Formulaire ouverture */}
								<View style={styles.inputGroup}>
									<Text style={styles.inputLabel}>Fond de caisse initial (€)</Text>
									<TextInput
										style={styles.input}
										placeholder="100.00"
										placeholderTextColor="#64748B"
										value={openingFloat}
										onChangeText={setOpeningFloat}
										keyboardType="decimal-pad"
									/>
								</View>

								<View style={styles.inputGroup}>
									<Text style={styles.inputLabel}>Identifiant caisse (optionnel)</Text>
									<TextInput
										style={styles.input}
										placeholder="CAISSE_01"
										placeholderTextColor="#64748B"
										value={deviceId}
										onChangeText={setDeviceId}
									/>
								</View>

								<TouchableOpacity
									style={[styles.button, styles.buttonPrimary]}
									onPress={handleOpenShift}
									disabled={isOpening}
								>
									{isOpening ? (
										<ActivityIndicator color="#fff" />
									) : (
										<>
											<Ionicons name="lock-open" size={20} color="#fff" />
											<Text style={styles.buttonText}>Ouvrir le shift</Text>
										</>
									)}
								</TouchableOpacity>
							</View>
						)}

						{/* Section : Historique */}
						{shiftsHistory.length > 0 && (
							<View style={styles.card}>
								<Text style={styles.cardTitle}>📋 Shifts récents</Text>

								{shiftsHistory.map((shift) => (
									<View key={shift._id} style={styles.historyItem}>
										<View style={styles.historyHeader}>
											<View style={[styles.badge, shift.status === "closed" && styles.badgeClosed]}>
												<Text style={[styles.badgeText, shift.status === "closed" && styles.badgeTextClosed]}>
													#{shift.sequenceNumber}
												</Text>
											</View>
											<Text style={[styles.historyStatus, shift.status === "closed" && styles.historyStatusClosed]}>
												{shift.status === "closed" ? "Fermé" : shift.status === "closing" ? "En fermeture" : "Ouvert"}
											</Text>
										</View>

										<View style={styles.row}>
											<Text style={styles.label}>Période</Text>
											<Text style={styles.value}>
												{formatDate(shift.openedAt)} → {shift.closedAt ? formatDate(shift.closedAt) : "En cours"}
											</Text>
										</View>

										{shift.zReportId && (
											<View style={styles.row}>
												<Text style={styles.label}>Z généré</Text>
												<Text style={[styles.value, { color: "#10b981" }]}>
													✓ Z n°{shift.zReportId.sequenceNumber || "—"}
												</Text>
											</View>
										)}
									</View>
								))}
							</View>
						)}

						{/* Footer info Phase 2 */}
						<View style={styles.footer}>
							<Ionicons name="information-circle" size={18} color="#3B82F6" />
							<Text style={styles.footerText}>
								Mode Event Sourcing actif — Les tickets générés pendant un shift créent automatiquement des events immuables pour le Z de caisse.
							</Text>
						</View>
					</ScrollView>
				</Pressable>
			</Pressable>
		</Modal>
	);
}

// ──────────────────────────────────────────────────────────────
// Styles
// ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
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
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 20,
		paddingVertical: 18,
		borderBottomWidth: 1,
		borderBottomColor: "rgba(255,255,255,0.07)",
	},
	headerTitle: {
		fontSize: 20,
		fontWeight: "700",
		color: "#F1F5F9",
	},
	closeBtn: {
		padding: 4,
	},

	// ── Content ──────────────────────────────────────────────
	content: {
		flex: 1,
		paddingHorizontal: 20,
		paddingVertical: 16,
	},
	card: {
		backgroundColor: "#0F172A",
		borderRadius: 16,
		padding: 18,
		marginBottom: 16,
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.05)",
	},
	cardHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 16,
	},
	cardTitle: {
		fontSize: 16,
		fontWeight: "600",
		color: "#F1F5F9",
	},
	badge: {
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 10,
		backgroundColor: "rgba(16,185,129,0.15)",
	},
	badgeText: {
		fontSize: 13,
		fontWeight: "600",
		color: "#10b981",
	},
	badgeClosed: {
		backgroundColor: "rgba(148,163,184,0.15)",
	},
	badgeTextClosed: {
		color: "#94A3B8",
	},
	row: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingVertical: 8,
	},
	label: {
		fontSize: 14,
		color: "#94A3B8",
	},
	value: {
		fontSize: 14,
		fontWeight: "600",
		color: "#E2E8F0",
	},
	separator: {
		height: 1,
		backgroundColor: "rgba(255,255,255,0.07)",
		marginVertical: 16,
	},
	sectionTitle: {
		fontSize: 15,
		fontWeight: "600",
		color: "#F1F5F9",
		marginBottom: 12,
	},
	inputGroup: {
		marginBottom: 14,
	},
	inputLabel: {
		fontSize: 13,
		color: "#94A3B8",
		marginBottom: 6,
	},
	input: {
		backgroundColor: "#0F172A",
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.10)",
		borderRadius: 10,
		paddingHorizontal: 14,
		paddingVertical: 12,
		fontSize: 15,
		color: "#F1F5F9",
	},
	hint: {
		fontSize: 14,
		color: "#94A3B8",
		lineHeight: 20,
		marginBottom: 16,
	},
	button: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 14,
		borderRadius: 12,
		gap: 8,
		marginTop: 8,
	},
	buttonPrimary: {
		backgroundColor: "#FBBF24",
	},
	buttonDanger: {
		backgroundColor: "#EF4444",
	},
	buttonText: {
		color: "#fff",
		fontSize: 15,
		fontWeight: "600",
	},
	historyItem: {
		borderTopWidth: 1,
		borderTopColor: "rgba(255,255,255,0.05)",
		paddingTop: 14,
		marginTop: 14,
	},
	historyHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 10,
	},
	historyStatus: {
		fontSize: 12,
		fontWeight: "600",
		color: "#10b981",
	},
	historyStatusClosed: {
		color: "#94A3B8",
	},
	footer: {
		flexDirection: "row",
		padding: 14,
		borderRadius: 12,
		backgroundColor: "rgba(59,130,246,0.10)",
		marginTop: 8,
		marginBottom: 16,
		gap: 10,
		alignItems: "flex-start",
	},
	footerText: {
		flex: 1,
		fontSize: 12,
		lineHeight: 17,
		color: "#93C5FD",
	},
});
