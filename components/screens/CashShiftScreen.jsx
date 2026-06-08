/**
 * CashShiftScreen.jsx — Gestion des shifts de caisse (Event Sourcing)
 * 
 * Phase 2 de la migration Event Sourcing : Interface de gestion des shifts
 * 
 * Fonctionnalités :
 * - Ouvrir un shift (fond de caisse initial)
 * - Voir le shift actif en cours
 * - Fermer le shift + générer Z de caisse (event-sourced)
 * - Historique des shifts récents
 * 
 * Accessible uniquement aux managers/admins
 */

import React, { useState, useCallback, useEffect, useMemo } from "react";
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
	RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../hooks/useTheme";
import cashShiftService from "../../services/cashShiftService";

export default function CashShiftScreen({ onClose }) {
	const THEME = useTheme();
	const styles = useMemo(() => createStyles(THEME), [THEME]);

	// État du shift actif
	const [activeShift, setActiveShift] = useState(null);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);

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
		loadData();
	}, []);

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

	const handleRefresh = useCallback(async () => {
		setRefreshing(true);
		await loadData();
		setRefreshing(false);
	}, [loadData]);

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
							await loadData(); // Recharger
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

		const expectedCashCents = activeShift.openingFloatCents || 0; // Simplifié, le backend calculera le vrai expected
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

	if (loading) {
		return (
			<SafeAreaView style={[styles.container, { backgroundColor: THEME.colors.background }]}>
				<View style={styles.header}>
					<TouchableOpacity onPress={onClose} style={styles.closeButton}>
						<Ionicons name="close" size={28} color={THEME.colors.text} />
					</TouchableOpacity>
					<Text style={[styles.title, { color: THEME.colors.text }]}>💰 Gestion de Caisse</Text>
					<View style={{ width: 28 }} />
				</View>
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color={THEME.colors.primary} />
					<Text style={[styles.loadingText, { color: THEME.colors.textSecondary }]}>
						Chargement...
					</Text>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={[styles.container, { backgroundColor: THEME.colors.background }]}>
			{/* Header */}
			<View style={styles.header}>
				<TouchableOpacity onPress={onClose} style={styles.closeButton}>
					<Ionicons name="close" size={28} color={THEME.colors.text} />
				</TouchableOpacity>
				<Text style={[styles.title, { color: THEME.colors.text }]}>💰 Gestion de Caisse</Text>
				<TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
					<Ionicons name="refresh" size={24} color={THEME.colors.primary} />
				</TouchableOpacity>
			</View>

			<ScrollView
				style={styles.content}
				refreshControl={
					<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={THEME.colors.primary} />
				}
			>
				{/* Section : Shift actif */}
				{activeShift ? (
					<View style={[styles.card, { backgroundColor: THEME.colors.surface }]}>
						<View style={styles.cardHeader}>
							<Text style={[styles.cardTitle, { color: THEME.colors.text }]}>
								✅ Shift actif
							</Text>
							<View style={[styles.badge, { backgroundColor: THEME.colors.success + "20" }]}>
								<Text style={[styles.badgeText, { color: THEME.colors.success }]}>
									#{activeShift.sequenceNumber}
								</Text>
							</View>
						</View>

						<View style={styles.row}>
							<Text style={[styles.label, { color: THEME.colors.textSecondary }]}>Ouvert le</Text>
							<Text style={[styles.value, { color: THEME.colors.text }]}>
								{formatDate(activeShift.openedAt)}
							</Text>
						</View>

						<View style={styles.row}>
							<Text style={[styles.label, { color: THEME.colors.textSecondary }]}>Fond de caisse</Text>
							<Text style={[styles.value, { color: THEME.colors.text }]}>
								{((activeShift.openingFloatCents || 0) / 100).toFixed(2)}€
							</Text>
						</View>

						{/* Formulaire fermeture */}
						<View style={styles.separator} />
						<Text style={[styles.sectionTitle, { color: THEME.colors.text }]}>Fermeture du shift</Text>

						<View style={styles.inputGroup}>
							<Text style={[styles.inputLabel, { color: THEME.colors.textSecondary }]}>
								Compte caisse (€)
							</Text>
							<TextInput
								style={[styles.input, { backgroundColor: THEME.colors.background, color: THEME.colors.text, borderColor: THEME.colors.border }]}
								placeholder="250.00"
								placeholderTextColor={THEME.colors.textSecondary}
								value={closingCount}
								onChangeText={setClosingCount}
								keyboardType="decimal-pad"
							/>
						</View>

						<TouchableOpacity
							style={[styles.buttonDanger, { backgroundColor: THEME.colors.error }]}
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
					<View style={[styles.card, { backgroundColor: THEME.colors.surface }]}>
						<View style={styles.cardHeader}>
							<Text style={[styles.cardTitle, { color: THEME.colors.text }]}>
								📊 Aucun shift actif
							</Text>
						</View>

						<Text style={[styles.hint, { color: THEME.colors.textSecondary }]}>
							Ouvrez un shift pour commencer à enregistrer les opérations de caisse.
						</Text>

						{/* Formulaire ouverture */}
						<View style={styles.inputGroup}>
							<Text style={[styles.inputLabel, { color: THEME.colors.textSecondary }]}>
								Fond de caisse initial (€)
							</Text>
							<TextInput
								style={[styles.input, { backgroundColor: THEME.colors.background, color: THEME.colors.text, borderColor: THEME.colors.border }]}
								placeholder="100.00"
								placeholderTextColor={THEME.colors.textSecondary}
								value={openingFloat}
								onChangeText={setOpeningFloat}
								keyboardType="decimal-pad"
							/>
						</View>

						<View style={styles.inputGroup}>
							<Text style={[styles.inputLabel, { color: THEME.colors.textSecondary }]}>
								Identifiant caisse (optionnel)
							</Text>
							<TextInput
								style={[styles.input, { backgroundColor: THEME.colors.background, color: THEME.colors.text, borderColor: THEME.colors.border }]}
								placeholder="CAISSE_01"
								placeholderTextColor={THEME.colors.textSecondary}
								value={deviceId}
								onChangeText={setDeviceId}
							/>
						</View>

						<TouchableOpacity
							style={[styles.buttonPrimary, { backgroundColor: THEME.colors.primary }]}
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
					<View style={[styles.card, { backgroundColor: THEME.colors.surface }]}>
						<Text style={[styles.cardTitle, { color: THEME.colors.text }]}>📋 Shifts récents</Text>

						{shiftsHistory.map((shift) => (
							<View key={shift._id} style={[styles.historyItem, { borderBottomColor: THEME.colors.border }]}>
								<View style={styles.historyHeader}>
									<View style={[styles.badge, { backgroundColor: shift.status === "closed" ? THEME.colors.textSecondary + "20" : THEME.colors.success + "20" }]}>
										<Text style={[styles.badgeText, { color: shift.status === "closed" ? THEME.colors.textSecondary : THEME.colors.success }]}>
											#{shift.sequenceNumber}
										</Text>
									</View>
									<Text style={[styles.historyStatus, { color: shift.status === "closed" ? THEME.colors.textSecondary : THEME.colors.success }]}>
										{shift.status === "closed" ? "Fermé" : shift.status === "closing" ? "En fermeture" : "Ouvert"}
									</Text>
								</View>

								<View style={styles.row}>
									<Text style={[styles.label, { color: THEME.colors.textSecondary }]}>Période</Text>
									<Text style={[styles.value, { color: THEME.colors.text }]}>
										{formatDate(shift.openedAt)} → {shift.closedAt ? formatDate(shift.closedAt) : "En cours"}
									</Text>
								</View>

								{shift.zReportId && (
									<View style={styles.row}>
										<Text style={[styles.label, { color: THEME.colors.textSecondary }]}>Z généré</Text>
										<Text style={[styles.value, { color: THEME.colors.success }]}>
											✓ Z n°{shift.zReportId.sequenceNumber || "—"}
										</Text>
									</View>
								)}
							</View>
						))}
					</View>
				)}

				{/* Footer info Phase 2 */}
				<View style={[styles.footer, { backgroundColor: THEME.colors.info + "10" }]}>
					<Ionicons name="information-circle" size={20} color={THEME.colors.info} />
					<Text style={[styles.footerText, { color: THEME.colors.info }]}>
						Mode Event Sourcing actif — Les tickets générés pendant un shift créent automatiquement des events immuables pour le Z de caisse.
					</Text>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}

// ──────────────────────────────────────────────────────────────
// Styles
// ──────────────────────────────────────────────────────────────
const createStyles = (THEME) =>
	StyleSheet.create({
		container: {
			flex: 1,
		},
		header: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			paddingHorizontal: 20,
			paddingVertical: 16,
			borderBottomWidth: 1,
			borderBottomColor: THEME.colors.border,
		},
		closeButton: {
			padding: 4,
		},
		refreshButton: {
			padding: 4,
		},
		title: {
			fontSize: THEME.typography.sizes.h2,
			fontWeight: THEME.typography.weights.bold,
		},
		loadingContainer: {
			flex: 1,
			justifyContent: "center",
			alignItems: "center",
		},
		loadingText: {
			marginTop: 12,
			fontSize: THEME.typography.sizes.body,
		},
		content: {
			flex: 1,
			padding: 20,
		},
		card: {
			borderRadius: 16,
			padding: 20,
			marginBottom: 16,
			...THEME.shadows.medium,
		},
		cardHeader: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			marginBottom: 16,
		},
		cardTitle: {
			fontSize: THEME.typography.sizes.h3,
			fontWeight: THEME.typography.weights.semibold,
		},
		badge: {
			paddingHorizontal: 12,
			paddingVertical: 4,
			borderRadius: 12,
		},
		badgeText: {
			fontSize: THEME.typography.sizes.small,
			fontWeight: THEME.typography.weights.semibold,
		},
		row: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			paddingVertical: 8,
		},
		label: {
			fontSize: THEME.typography.sizes.body,
		},
		value: {
			fontSize: THEME.typography.sizes.body,
			fontWeight: THEME.typography.weights.semibold,
		},
		separator: {
			height: 1,
			backgroundColor: THEME.colors.border,
			marginVertical: 16,
		},
		sectionTitle: {
			fontSize: THEME.typography.sizes.h4,
			fontWeight: THEME.typography.weights.semibold,
			marginBottom: 12,
		},
		inputGroup: {
			marginBottom: 16,
		},
		inputLabel: {
			fontSize: THEME.typography.sizes.body,
			marginBottom: 8,
		},
		input: {
			borderWidth: 1,
			borderRadius: 12,
			paddingHorizontal: 16,
			paddingVertical: 12,
			fontSize: THEME.typography.sizes.body,
		},
		hint: {
			fontSize: THEME.typography.sizes.body,
			lineHeight: 22,
			marginBottom: 16,
		},
		buttonPrimary: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			paddingVertical: 14,
			borderRadius: 12,
			gap: 8,
			marginTop: 8,
		},
		buttonDanger: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			paddingVertical: 14,
			borderRadius: 12,
			gap: 8,
			marginTop: 8,
		},
		buttonText: {
			color: "#fff",
			fontSize: THEME.typography.sizes.body,
			fontWeight: THEME.typography.weights.semibold,
		},
		historyItem: {
			borderBottomWidth: 1,
			paddingVertical: 12,
			marginTop: 12,
		},
		historyHeader: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			marginBottom: 8,
		},
		historyStatus: {
			fontSize: THEME.typography.sizes.small,
			fontWeight: THEME.typography.weights.semibold,
		},
		footer: {
			flexDirection: "row",
			padding: 16,
			borderRadius: 12,
			marginTop: 8,
			marginBottom: 24,
			gap: 12,
		},
		footerText: {
			flex: 1,
			fontSize: THEME.typography.sizes.small,
			lineHeight: 18,
		},
	});
