/**
 * DailyStatsModal.jsx — Statistiques journalières
 *
 * Statistiques calculées côté frontend à partir des réservations + tables :
 *   - Total couverts prévus / effectifs
 *   - Taux de remplissage (couverts / capacité totale × créneaux)
 *   - Revenu estimé (totalAmount)
 *   - No-shows (annulées après confirmation / absents)
 *   - Réservations par statut
 *   - Table la plus sollicitée
 *
 * Usage :
 *   <DailyStatsModal
 *     visible={showStats}
 *     onClose={() => setShowStats(false)}
 *     reservations={filteredReservations}   // réservations du jour
 *     tables={tables}
 *     selectedDate={selectedDate}
 *   />
 */
import React, { useMemo } from "react";
import {
	View,
	Text,
	Modal,
	ScrollView,
	TouchableOpacity,
	StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../hooks/useTheme";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const formatDate = (d) => {
	if (!d) return "—";
	const date = d instanceof Date ? d : new Date(d);
	return date.toLocaleDateString("fr-FR", {
		weekday: "long",
		day: "numeric",
		month: "long",
	});
};

const pct = (n, total) => (total > 0 ? Math.round((n / total) * 100) : 0);

// ─── Sous-composant : carte statistique ──────────────────────────────────────
const StatCard = ({ icon, label, value, sub, color, gradient, wide }) => {
	const THEME = useTheme();
	return (
		<View
			style={[
				cardStyles.card,
				{
					backgroundColor: THEME.colors.background.elevated,
					borderColor: color + "30",
					width: wide ? "100%" : "48%",
				},
			]}
		>
			<LinearGradient
				colors={gradient || [color + "22", color + "08"]}
				style={cardStyles.gradient}
				start={{ x: 0, y: 0 }}
				end={{ x: 1, y: 1 }}
			/>
			<View style={cardStyles.iconWrap}>
				<Ionicons name={icon} size={18} color={color} />
			</View>
			<Text style={[cardStyles.value, { color: THEME.colors.text.primary }]}>
				{value}
			</Text>
			<Text style={[cardStyles.label, { color: THEME.colors.text.muted }]}>
				{label}
			</Text>
			{sub ? (
				<Text style={[cardStyles.sub, { color }]} numberOfLines={1}>
					{sub}
				</Text>
			) : null}
		</View>
	);
};

const cardStyles = StyleSheet.create({
	card: {
		borderRadius: 16,
		borderWidth: 1,
		padding: 14,
		marginBottom: 10,
		overflow: "hidden",
		position: "relative",
	},
	gradient: { ...StyleSheet.absoluteFillObject, borderRadius: 16 },
	iconWrap: { marginBottom: 6 },
	value: { fontSize: 24, fontWeight: "800", letterSpacing: -0.5 },
	label: {
		fontSize: 11,
		fontWeight: "600",
		marginTop: 2,
		textTransform: "uppercase",
		letterSpacing: 0.5,
	},
	sub: { fontSize: 11, fontWeight: "600", marginTop: 4 },
});

// ─── Sous-composant : barre de progression ───────────────────────────────────
const ProgressBar = ({ label, value, max, color, THEME }) => {
	const ratio = max > 0 ? Math.min(value / max, 1) : 0;
	return (
		<View style={{ marginBottom: 10 }}>
			<View
				style={{
					flexDirection: "row",
					justifyContent: "space-between",
					marginBottom: 4,
				}}
			>
				<Text
					style={{
						fontSize: 12,
						color: THEME.colors.text.secondary,
						fontWeight: "600",
					}}
				>
					{label}
				</Text>
				<Text style={{ fontSize: 12, color, fontWeight: "700" }}>
					{value} / {max}
				</Text>
			</View>
			<View
				style={{
					height: 6,
					backgroundColor: THEME.colors.border.subtle,
					borderRadius: 3,
				}}
			>
				<View
					style={{
						height: 6,
						width: `${Math.round(ratio * 100)}%`,
						backgroundColor: color,
						borderRadius: 3,
					}}
				/>
			</View>
		</View>
	);
};

// ─── Sous-composant : ligne de statut ────────────────────────────────────────
const StatusRow = ({ status, count, color, THEME }) => (
	<View
		style={{
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			paddingVertical: 6,
			borderBottomWidth: 1,
			borderBottomColor: THEME.colors.border.subtle,
		}}
	>
		<View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
			<View
				style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }}
			/>
			<Text
				style={{
					fontSize: 13,
					color: THEME.colors.text.secondary,
					fontWeight: "500",
					textTransform: "capitalize",
				}}
			>
				{status}
			</Text>
		</View>
		<Text
			style={{
				fontSize: 14,
				color: THEME.colors.text.primary,
				fontWeight: "700",
			}}
		>
			{count}
		</Text>
	</View>
);

// ─── Composant principal ──────────────────────────────────────────────────────
const DailyStatsModal = ({
	visible,
	onClose,
	reservations = [],
	tables = [],
	selectedDate,
}) => {
	const THEME = useTheme();
	const styles = useMemo(() => createStyles(THEME), [THEME]);

	// ─── Calcul des statistiques ───────────────────────────────────────────
	const stats = useMemo(() => {
		const all = reservations;
		const active = all.filter((r) =>
			["en attente", "actives", "present", "ouverte"].includes(
				(r.status || "").toLowerCase(),
			),
		);
		const done = all.filter((r) =>
			["terminée", "termine"].includes((r.status || "").toLowerCase()),
		);
		const cancelled = all.filter((r) =>
			["annulée", "annulee"].includes((r.status || "").toLowerCase()),
		);

		// Couverts
		const couverts_total = all.reduce((s, r) => s + (r.nbPersonnes || 0), 0);
		const couverts_effectifs = [...active, ...done].reduce(
			(s, r) => s + (r.nbPersonnes || 0),
			0,
		);
		const couverts_annules = cancelled.reduce(
			(s, r) => s + (r.nbPersonnes || 0),
			0,
		);

		// Capacité totale (somme des capacités tables × nombre de services estimé)
		const total_capacity = tables.reduce(
			(s, t) => s + (t.capacity || t.seats || 2),
			0,
		);
		const fill_rate = pct(couverts_effectifs, total_capacity);

		// Revenu
		const revenue = [...active, ...done].reduce(
			(s, r) => s + (r.totalAmount || 0),
			0,
		);
		const revenue_formatted = revenue.toFixed(2);

		// No-shows (annulés + présents manqués)
		const no_shows = cancelled.length;
		const no_shows_pct = pct(no_shows, all.length);

		// Sans table
		const sans_table = active.filter((r) => !r.tableId).length;

		// Par statut
		const by_status = {
			"En attente": all.filter((r) =>
				["en attente", "actives"].includes((r.status || "").toLowerCase()),
			).length,
			Présent: all.filter((r) => (r.status || "").toLowerCase() === "present")
				.length,
			Ouverte: all.filter((r) => (r.status || "").toLowerCase() === "ouverte")
				.length,
			Terminée: done.length,
			Annulée: cancelled.length,
		};

		const STATUS_PALETTE = {
			"En attente": "#FBBF24",
			Présent: "#10B981",
			Ouverte: "#0EA5E9",
			Terminée: "#64748B",
			Annulée: "#F43F5E",
		};

		// Table la + sollicitée
		const table_counts = {};
		all.forEach((r) => {
			const raw = r.tableId;
			const tid = typeof raw === "object" ? raw?._id : raw;
			if (tid) table_counts[tid] = (table_counts[tid] || 0) + 1;
		});
		const top_tid = Object.entries(table_counts).sort((a, b) => b[1] - a[1])[0];
		const top_table = top_tid ? tables.find((t) => t._id === top_tid[0]) : null;
		const top_table_label = top_table
			? top_table.number?.toString() ||
				top_table.name ||
				top_table._id?.slice(-3)
			: null;

		return {
			total: all.length,
			active: active.length,
			done: done.length,
			cancelled,
			couverts_total,
			couverts_effectifs,
			couverts_annules,
			total_capacity,
			fill_rate,
			revenue_formatted,
			no_shows,
			no_shows_pct,
			sans_table,
			by_status,
			STATUS_PALETTE,
			top_table_label,
			top_table_count: top_tid ? top_tid[1] : 0,
		};
	}, [reservations, tables]);

	return (
		<Modal
			visible={visible}
			transparent
			animationType="slide"
			onRequestClose={onClose}
		>
			<View style={styles.overlay}>
				<View style={styles.sheet}>
					{/* ── Poignée ── */}
					<View style={styles.handle} />

					{/* ── Header ── */}
					<View style={styles.header}>
						<View>
							<Text style={styles.title}>Statistiques du jour</Text>
							<Text style={styles.subtitle}>{formatDate(selectedDate)}</Text>
						</View>
						<TouchableOpacity onPress={onClose} style={styles.closeBtn}>
							<Ionicons
								name="close"
								size={22}
								color={THEME.colors.text.secondary}
							/>
						</TouchableOpacity>
					</View>

					<ScrollView
						showsVerticalScrollIndicator={false}
						contentContainerStyle={styles.content}
					>
						{/* ── Ligne 1 : Réservations + Couverts ── */}
						<View style={styles.cardRow}>
							<StatCard
								icon="calendar"
								label="Réservations"
								value={stats.total}
								sub={`${stats.active} actives · ${stats.done} terminées`}
								color="#F59E0B"
							/>
							<StatCard
								icon="people"
								label="Couverts prévus"
								value={stats.couverts_total}
								sub={`${stats.couverts_effectifs} effectifs`}
								color="#0EA5E9"
							/>
						</View>

						{/* ── Ligne 2 : Remplissage + Revenu ── */}
						<View style={styles.cardRow}>
							<StatCard
								icon="speedometer"
								label="Remplissage"
								value={`${stats.fill_rate}%`}
								sub={`${stats.couverts_effectifs} / ${stats.total_capacity} couverts`}
								color={
									stats.fill_rate >= 80
										? "#10B981"
										: stats.fill_rate >= 50
											? "#F59E0B"
											: "#F43F5E"
								}
							/>
							<StatCard
								icon="cash"
								label="Revenu estimé"
								value={`${stats.revenue_formatted}€`}
								sub={
									stats.done > 0
										? `${(parseFloat(stats.revenue_formatted) / stats.done).toFixed(0)}€/table`
										: null
								}
								color="#10B981"
							/>
						</View>

						{/* ── Ligne 3 : No-shows + Sans table ── */}
						<View style={styles.cardRow}>
							<StatCard
								icon="close-circle"
								label="Annulations"
								value={stats.no_shows}
								sub={
									stats.no_shows > 0
										? `${stats.no_shows_pct}% des résa`
										: "Aucune"
								}
								color="#F43F5E"
							/>
							<StatCard
								icon="warning"
								label="Sans table"
								value={stats.sans_table}
								sub={stats.sans_table > 0 ? "À assigner" : "Tout assigné ✓"}
								color={stats.sans_table > 0 ? "#F59E0B" : "#10B981"}
							/>
						</View>

						{/* ── Taux de remplissage visuel ── */}
						<View
							style={[
								styles.section,
								{ borderColor: THEME.colors.border.subtle },
							]}
						>
							<Text
								style={[
									styles.sectionTitle,
									{ color: THEME.colors.text.secondary },
								]}
							>
								Remplissage par couverts
							</Text>
							<ProgressBar
								label="Couverts effectifs"
								value={stats.couverts_effectifs}
								max={stats.couverts_total || 1}
								color="#0EA5E9"
								THEME={THEME}
							/>
							<ProgressBar
								label="Taux de remplissage"
								value={stats.fill_rate}
								max={100}
								color={stats.fill_rate >= 80 ? "#10B981" : "#F59E0B"}
								THEME={THEME}
							/>
						</View>

						{/* ── Répartition par statut ── */}
						<View
							style={[
								styles.section,
								{ borderColor: THEME.colors.border.subtle },
							]}
						>
							<Text
								style={[
									styles.sectionTitle,
									{ color: THEME.colors.text.secondary },
								]}
							>
								Répartition par statut
							</Text>
							{Object.entries(stats.by_status)
								.filter(([, count]) => count > 0)
								.map(([status, count]) => (
									<StatusRow
										key={status}
										status={status}
										count={count}
										color={stats.STATUS_PALETTE[status] || "#64748B"}
										THEME={THEME}
									/>
								))}
						</View>

						{/* ── Table la plus sollicitée ── */}
						{stats.top_table_label && (
							<View
								style={[
									styles.topTableCard,
									{
										backgroundColor: THEME.colors.background.elevated,
										borderColor: "#F59E0B30",
									},
								]}
							>
								<Ionicons name="trophy" size={20} color="#F59E0B" />
								<View style={{ marginLeft: 12 }}>
									<Text
										style={[
											styles.topTableTitle,
											{ color: THEME.colors.text.primary },
										]}
									>
										Table {stats.top_table_label}
									</Text>
									<Text
										style={[
											styles.topTableSub,
											{ color: THEME.colors.text.muted },
										]}
									>
										Table la plus sollicitée · {stats.top_table_count}{" "}
										réservation{stats.top_table_count > 1 ? "s" : ""}
									</Text>
								</View>
							</View>
						)}
					</ScrollView>
				</View>
			</View>
		</Modal>
	);
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const createStyles = (THEME) =>
	StyleSheet.create({
		overlay: {
			flex: 1,
			backgroundColor: "rgba(0,0,0,0.6)",
			justifyContent: "flex-end",
		},
		sheet: {
			backgroundColor: THEME.colors.background.dark,
			borderTopLeftRadius: 24,
			borderTopRightRadius: 24,
			maxHeight: "88%",
			paddingBottom: 32,
		},
		handle: {
			width: 40,
			height: 4,
			backgroundColor: THEME.colors.border.subtle,
			borderRadius: 2,
			alignSelf: "center",
			marginTop: 12,
			marginBottom: 4,
		},
		header: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			paddingHorizontal: 20,
			paddingVertical: 16,
			borderBottomWidth: 1,
			borderBottomColor: THEME.colors.border.subtle,
		},
		title: {
			fontSize: 18,
			fontWeight: "800",
			color: THEME.colors.text.primary,
		},
		subtitle: {
			fontSize: 12,
			color: THEME.colors.text.muted,
			marginTop: 2,
			textTransform: "capitalize",
		},
		closeBtn: {
			width: 36,
			height: 36,
			borderRadius: 18,
			backgroundColor: THEME.colors.background.elevated,
			alignItems: "center",
			justifyContent: "center",
		},
		content: {
			padding: 16,
		},
		cardRow: {
			flexDirection: "row",
			justifyContent: "space-between",
			gap: 10,
			marginBottom: 0,
		},
		section: {
			borderWidth: 1,
			borderRadius: 16,
			padding: 16,
			marginBottom: 12,
		},
		sectionTitle: {
			fontSize: 11,
			fontWeight: "700",
			textTransform: "uppercase",
			letterSpacing: 0.8,
			marginBottom: 12,
		},
		topTableCard: {
			flexDirection: "row",
			alignItems: "center",
			borderWidth: 1,
			borderRadius: 16,
			padding: 16,
			marginBottom: 12,
		},
		topTableTitle: {
			fontSize: 15,
			fontWeight: "700",
		},
		topTableSub: {
			fontSize: 12,
			marginTop: 2,
		},
	});

DailyStatsModal.displayName = "DailyStatsModal";
export default DailyStatsModal;
