// components/payments-command-center/LiveFeed.jsx
import React, { memo, useRef, useEffect } from "react";
import {
	View,
	Text,
	FlatList,
	StyleSheet,
	Platform,
	Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import T from "./theme";

// ── Status config ─────────────────────────────────────────────────
const STATUS_MAP = {
	success: {
		label: "Payé",
		color: T.accent.green,
		bg: T.accent.greenDim,
		icon: "checkmark-circle",
	},
	pending: {
		label: "Attente",
		color: T.accent.amber,
		bg: T.accent.amberDim,
		icon: "time",
	},
	failed: {
		label: "Refusé",
		color: T.accent.red,
		bg: T.accent.redDim,
		icon: "close-circle",
	},
};

const MODE_MAP = {
	card: { label: "CB", icon: "card-outline" },
	cash: { label: "Espèces", icon: "cash-outline" },
	apple_pay: { label: "Apple Pay", icon: "logo-apple" },
	google_pay: { label: "G Pay", icon: "logo-google" },
};

// ── Row animée ────────────────────────────────────────────────────
const PaymentRow = memo(({ item, index }) => {
	const fadeAnim = useRef(new Animated.Value(index === 0 ? 0 : 1)).current;
	const slideAnim = useRef(new Animated.Value(index === 0 ? -8 : 0)).current;

	useEffect(() => {
		if (index === 0) {
			Animated.parallel([
				Animated.timing(fadeAnim, {
					toValue: 1,
					duration: 400,
					useNativeDriver: true,
				}),
				Animated.timing(slideAnim, {
					toValue: 0,
					duration: 300,
					useNativeDriver: true,
				}),
			]).start();
		}
	}, [index, fadeAnim, slideAnim]);

	const st = STATUS_MAP[item.status] || STATUS_MAP.pending;
	const mode = MODE_MAP[item.mode] || MODE_MAP.card;

	return (
		<Animated.View
			style={[
				s.row,
				{
					opacity: fadeAnim,
					transform: [{ translateY: slideAnim }],
				},
			]}
		>
			{/* Heure */}
			<Text style={s.time}>{item.timeLabel}</Text>

			{/* Montant */}
			<Text style={s.amount}>
				{item.amount.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€
			</Text>

			{/* Client */}
			<Text style={s.client} numberOfLines={1}>
				{item.client}
			</Text>

			{/* Commande */}
			<Text style={s.orderId}>{item.orderId}</Text>

			{/* Mode */}
			<View style={s.modeWrap}>
				<Ionicons name={mode.icon} size={12} color={T.text.secondary} />
				<Text style={s.modeText}>{mode.label}</Text>
			</View>

			{/* Statut */}
			<View style={[s.badge, { backgroundColor: st.bg }]}>
				<Ionicons name={st.icon} size={12} color={st.color} />
				<Text style={[s.badgeText, { color: st.color }]}>{st.label}</Text>
			</View>
		</Animated.View>
	);
});

PaymentRow.displayName = "PaymentRow";

// ── Header colonne ────────────────────────────────────────────────
const ListHeader = memo(() => (
	<View style={s.header}>
		<Text style={[s.headerText, { width: 44 }]}>Heure</Text>
		<Text style={[s.headerText, { width: 72 }]}>Montant</Text>
		<Text style={[s.headerText, { flex: 1 }]}>Client</Text>
		<Text style={[s.headerText, { width: 58 }]}>Cmd</Text>
		<Text style={[s.headerText, { width: 72 }]}>Mode</Text>
		<Text style={[s.headerText, { width: 76 }]}>Statut</Text>
	</View>
));

ListHeader.displayName = "ListHeader";

// ── Composant principal ───────────────────────────────────────────
const LiveFeed = memo(({ payments, isCompact, maxItems = 20 }) => {
	const data = isCompact ? payments.slice(0, 5) : payments.slice(0, maxItems);

	const renderItem = ({ item, index }) => (
		<PaymentRow item={item} index={index} />
	);

	const renderEmpty = () => (
		<View style={s.emptyWrap}>
			<Ionicons name="card-outline" size={20} color={T.text.muted} />
			<Text style={s.emptyText}>Aucun paiement pour le moment</Text>
		</View>
	);

	return (
		<View style={s.container}>
			<View style={s.titleRow}>
				<View style={s.liveIndicator}>
					<View style={s.liveDot} />
					<Text style={s.liveText}>LIVE</Text>
				</View>
				<Text style={s.title}>Flux paiements</Text>
				<Text style={s.countText}>{payments.length} transactions</Text>
			</View>
			<ListHeader />
			<FlatList
				data={data}
				renderItem={renderItem}
				keyExtractor={(item) => item.id}
				ListEmptyComponent={renderEmpty}
				showsVerticalScrollIndicator={false}
				style={s.list}
				contentContainerStyle={s.listContent}
				initialNumToRender={10}
				maxToRenderPerBatch={5}
				windowSize={5}
			/>
		</View>
	);
});

LiveFeed.displayName = "LiveFeed";

const s = StyleSheet.create({
	container: {
		flex: 1,
		marginTop: T.spacing.sm,
	},
	titleRow: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: T.spacing.lg,
		paddingBottom: T.spacing.sm,
		gap: 8,
	},
	liveIndicator: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: T.accent.redDim,
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: T.radius.pill,
		gap: 4,
	},
	liveDot: {
		width: 6,
		height: 6,
		borderRadius: 3,
		backgroundColor: T.accent.red,
	},
	liveText: {
		fontSize: 9,
		fontWeight: "800",
		color: T.accent.red,
		letterSpacing: 1,
	},
	title: {
		fontSize: 14,
		fontWeight: "700",
		color: T.text.primary,
		flex: 1,
	},
	countText: {
		fontSize: 11,
		color: T.text.muted,
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: T.spacing.lg,
		paddingVertical: T.spacing.xs,
		borderBottomWidth: 1,
		borderBottomColor: T.border.subtle,
		gap: 8,
	},
	headerText: {
		fontSize: 9,
		fontWeight: "600",
		color: T.text.muted,
		textTransform: "uppercase",
		letterSpacing: 0.8,
	},
	list: {
		flex: 1,
	},
	listContent: {
		paddingBottom: T.spacing.md,
	},
	emptyWrap: {
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: T.spacing.xl,
		gap: 8,
	},
	emptyText: {
		fontSize: 12,
		color: T.text.muted,
	},
	row: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: T.spacing.lg,
		paddingVertical: T.spacing.sm,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: T.border.subtle,
		gap: 8,
	},
	time: {
		width: 44,
		fontSize: 12,
		fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
		color: T.text.muted,
	},
	amount: {
		width: 72,
		fontSize: 14,
		fontWeight: "700",
		fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
		color: T.text.primary,
	},
	client: {
		flex: 1,
		fontSize: 12,
		fontWeight: "500",
		color: T.text.secondary,
	},
	orderId: {
		width: 58,
		fontSize: 11,
		fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
		color: T.accent.cyan,
	},
	modeWrap: {
		width: 72,
		flexDirection: "row",
		alignItems: "center",
		gap: 3,
	},
	modeText: {
		fontSize: 10,
		color: T.text.secondary,
	},
	badge: {
		width: 76,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 3,
		paddingHorizontal: 6,
		paddingVertical: 3,
		borderRadius: T.radius.pill,
	},
	badgeText: {
		fontSize: 10,
		fontWeight: "700",
	},
});

export default LiveFeed;
