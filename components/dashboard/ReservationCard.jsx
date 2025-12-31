/**
 * 🎨 ReservationCard - Design Premium Spatial
 * Card animée avec effets de profondeur et gradient glow
 * Support Mode Clair/Sombre
 */
import React, { useRef, useEffect, useMemo } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	Animated,
	StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import useThemeStore from "../../src/stores/useThemeStore";
import { getTheme, getThemeGradients } from "../../utils/themeUtils";

// Configuration des statuts (les couleurs restent les mêmes pour clarté visuelle)
const getStatusConfig = (status, gradients) => {
	const statusMap = {
		"en attente": {
			color: "#FBBF24",
			bg: "rgba(251, 191, 36, 0.15)",
			gradient: gradients?.primary || ["#FBBF24", "#F59E0B"],
		},
		actives: {
			color: "#FBBF24",
			bg: "rgba(251, 191, 36, 0.15)",
			gradient: gradients?.primary || ["#FBBF24", "#F59E0B"],
		},
		present: {
			color: "#10B981",
			bg: "rgba(16, 185, 129, 0.15)",
			gradient: gradients?.success || ["#10B981", "#059669"],
		},
		ouverte: {
			color: "#0EA5E9",
			bg: "rgba(14, 165, 233, 0.15)",
			gradient: gradients?.info || ["#0EA5E9", "#0284C7"],
		},
		terminée: {
			color: "#64748B",
			bg: "rgba(100, 116, 139, 0.15)",
			gradient: ["#64748B", "#475569"],
		},
		termine: {
			color: "#64748B",
			bg: "rgba(100, 116, 139, 0.15)",
			gradient: ["#64748B", "#475569"],
		},
		annulée: {
			color: "#F43F5E",
			bg: "rgba(244, 63, 94, 0.15)",
			gradient: gradients?.danger || ["#F43F5E", "#E11D48"],
		},
		annulee: {
			color: "#F43F5E",
			bg: "rgba(244, 63, 94, 0.15)",
			gradient: gradients?.danger || ["#F43F5E", "#E11D48"],
		},
	};
	return statusMap[status?.toLowerCase()] || statusMap["en attente"];
};

const ReservationCard = React.memo(
	({ reservation, onSettingsPress, onAssignTablePress }) => {
		// Thème dynamique (avant tout)
		const { themeMode } = useThemeStore();
		const THEME = useMemo(() => getTheme(themeMode), [themeMode]);
		const gradients = useMemo(() => getThemeGradients(themeMode), [themeMode]);
		const styles = useMemo(() => createStyles(THEME), [THEME]);

		// Animation refs
		const scaleAnim = useRef(new Animated.Value(1)).current;
		const glowAnim = useRef(new Animated.Value(0)).current;

		// Statut effectif
		const effectiveStatus = reservation
			? reservation.isPresent && reservation.status === "en attente"
				? "present"
				: reservation.status || "en attente"
			: "en attente";

		const statusConfig = getStatusConfig(effectiveStatus, gradients);
		const isActive =
			effectiveStatus === "present" || effectiveStatus === "ouverte";

		// Animation de pulsation pour les cartes actives
		useEffect(() => {
			if (isActive && reservation) {
				Animated.loop(
					Animated.sequence([
						Animated.timing(glowAnim, {
							toValue: 1,
							duration: 2000,
							useNativeDriver: true,
						}),
						Animated.timing(glowAnim, {
							toValue: 0,
							duration: 2000,
							useNativeDriver: true,
						}),
					])
				).start();
			}
		}, [isActive, glowAnim, reservation]);

		if (!reservation) return null;
		// Handlers
		const handlePressIn = () => {
			Animated.spring(scaleAnim, {
				toValue: 0.97,
				friction: 8,
				useNativeDriver: true,
			}).start();
		};

		const handlePressOut = () => {
			Animated.spring(scaleAnim, {
				toValue: 1,
				friction: 5,
				useNativeDriver: true,
			}).start();
		};

		// Formatters
		const formatDate = (date) => {
			if (!date) return "-";
			try {
				const d = new Date(date);
				if (isNaN(d.getTime())) return "-";
				return d.toLocaleDateString("fr-FR", {
					day: "2-digit",
					month: "2-digit",
				});
			} catch {
				return "-";
			}
		};

		const glowOpacity = glowAnim.interpolate({
			inputRange: [0, 1],
			outputRange: [0.3, 0.7],
		});

		return (
			<Animated.View
				style={[styles.container, { transform: [{ scale: scaleAnim }] }]}
			>
				<View style={styles.touchable}>
					{/* Glow effect pour les cartes actives */}
					{isActive && (
						<Animated.View
							style={[styles.glowOverlay, { opacity: glowOpacity }]}
						>
							<LinearGradient
								colors={[statusConfig.color, "transparent"]}
								style={styles.glowGradient}
								start={{ x: 0.5, y: 0 }}
								end={{ x: 0.5, y: 1 }}
							/>
						</Animated.View>
					)}

					{/* Card content */}
					<View
						style={[
							styles.card,
							isActive && { borderColor: statusConfig.color },
						]}
					>
						{/* Status indicator bar */}
						<LinearGradient
							colors={statusConfig.gradient}
							style={styles.statusBar}
							start={{ x: 0, y: 0 }}
							end={{ x: 1, y: 0 }}
						/>

						{/* Header */}
						<View style={styles.header}>
							<View style={styles.headerLeft}>
								<Text style={styles.clientName} numberOfLines={1}>
									{String(reservation?.clientName || "Client").toUpperCase()}
								</Text>
								<View
									style={[
										styles.statusBadge,
										{ backgroundColor: statusConfig.bg },
									]}
								>
									<View
										style={[
											styles.statusDot,
											{ backgroundColor: statusConfig.color },
										]}
									/>
									<Text
										style={[styles.statusText, { color: statusConfig.color }]}
									>
										{effectiveStatus}
									</Text>
								</View>
							</View>
							<TouchableOpacity
								onPress={() => onSettingsPress?.(reservation)}
								style={styles.settingsButton}
								activeOpacity={0.7}
							>
								<Ionicons
									name="ellipsis-vertical"
									size={20}
									color={THEME.colors.text.muted}
								/>
							</TouchableOpacity>
						</View>

						{/* Info grid */}
						<View style={styles.infoGrid}>
							{/* Left column */}
							<View style={styles.infoCol}>
								<InfoRow
									icon="people"
									value={`${reservation.nbPersonnes || 0} pers.`}
									styles={styles}
									THEME={THEME}
								/>
								<InfoRow
									icon="call"
									value={reservation.phone || "-"}
									styles={styles}
									THEME={THEME}
								/>
								<InfoRow
									icon="calendar"
									value={formatDate(reservation.reservationDate)}
									styles={styles}
									THEME={THEME}
								/>
							</View>

							{/* Right column */}
							<View style={styles.infoCol}>
								<InfoRow
									icon="time"
									value={reservation.reservationTime || "N/A"}
									styles={styles}
									THEME={THEME}
								/>
								<TouchableOpacity
									onPress={() =>
										effectiveStatus !== "fermee" &&
										effectiveStatus !== "annulee" &&
										onAssignTablePress?.(reservation)
									}
									disabled={
										effectiveStatus === "fermee" ||
										effectiveStatus === "annulee"
									}
								>
									<InfoRow
										icon="restaurant"
										value={`Table ${reservation.tableId?.number || "-"}`}
										highlight={isActive}
										styles={styles}
										THEME={THEME}
									/>
								</TouchableOpacity>
								<InfoRow
									icon="wallet"
									value={
										typeof reservation?.totalAmount === "number"
											? `${reservation.totalAmount.toFixed(2)}€`
											: "0.00€"
									}
									highlight
									styles={styles}
									THEME={THEME}
								/>
							</View>
						</View>
					</View>
				</View>
			</Animated.View>
		);
	}
);

// Info row component
const InfoRow = ({ icon, value, highlight, styles, THEME }) => (
	<View style={styles.infoRow}>
		<Ionicons
			name={icon}
			size={14}
			color={highlight ? "#F59E0B" : THEME.colors.text.muted}
			style={styles.infoIcon}
		/>
		<Text
			style={[styles.infoText, highlight && styles.infoTextHighlight]}
			numberOfLines={1}
		>
			{value}
		</Text>
	</View>
);

// Fonction pour créer les styles dynamiquement
const createStyles = (THEME) =>
	StyleSheet.create({
		container: {
			width: "48%",
			margin: "1%",
		},
		touchable: {
			borderRadius: 20,
			overflow: "hidden",
		},
		glowOverlay: {
			position: "absolute",
			top: -20,
			left: -20,
			right: -20,
			height: 80,
			zIndex: 0,
		},
		glowGradient: {
			flex: 1,
			borderRadius: 40,
		},
		card: {
			backgroundColor: THEME.colors.background.card,
			borderRadius: 20,
			borderWidth: 1,
			borderColor: THEME.colors.border.default,
			overflow: "hidden",
			shadowColor: "#000",
			shadowOffset: { width: 0, height: 8 },
			shadowOpacity: 0.25,
			shadowRadius: 16,
			elevation: 8,
		},
		statusBar: {
			height: 3,
			width: "100%",
		},
		header: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "flex-start",
			padding: 16,
			paddingBottom: 12,
			borderBottomWidth: 1,
			borderBottomColor: THEME.colors.border.light,
		},
		headerLeft: {
			flex: 1,
		},
		clientName: {
			fontSize: 16,
			fontWeight: "700",
			color: THEME.colors.text.primary,
			letterSpacing: 0.5,
			marginBottom: 8,
		},
		statusBadge: {
			flexDirection: "row",
			alignItems: "center",
			paddingHorizontal: 10,
			paddingVertical: 4,
			borderRadius: 20,
			alignSelf: "flex-start",
		},
		statusDot: {
			width: 6,
			height: 6,
			borderRadius: 3,
			marginRight: 6,
		},
		statusText: {
			fontSize: 11,
			fontWeight: "600",
			textTransform: "uppercase",
			letterSpacing: 0.5,
		},
		settingsButton: {
			padding: 4,
			marginLeft: 8,
		},
		infoGrid: {
			flexDirection: "row",
			padding: 16,
			paddingTop: 12,
			gap: 16,
		},
		infoCol: {
			flex: 1,
			gap: 10,
		},
		infoRow: {
			flexDirection: "row",
			alignItems: "center",
		},
		infoIcon: {
			marginRight: 8,
			width: 16,
		},
		infoText: {
			fontSize: 13,
			color: THEME.colors.text.secondary,
			fontWeight: "500",
			flex: 1,
		},
		infoTextHighlight: {
			color: "#F59E0B",
			fontWeight: "600",
		},
	});

ReservationCard.displayName = "ReservationCard";

export default ReservationCard;
