/**
 * ReservationAssistantModal.jsx - Assistant intelligent de réservations
 * Analyse les disponibilités et propose des créneaux alternatifs
 */

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
	Modal,
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	ScrollView,
	ActivityIndicator,
	Animated,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../hooks/useTheme";

const ReservationAssistantModal = ({
	visible,
	onClose,
	result,
	loading,
	onSelectAlternative,
}) => {
	const THEME = useTheme();
	const styles = useMemo(() => createStyles(THEME), [THEME]);

	// Animation pour l'apparition du modal
	const fadeAnim = useRef(new Animated.Value(0)).current;
	const scaleAnim = useRef(new Animated.Value(0.9)).current;

	console.log(
		"🎨 [MODAL ASSISTANT] visible:",
		visible,
		"loading:",
		loading,
		"result:",
		result
	);

	useEffect(() => {
		if (visible) {
			// Animer l'entrée
			Animated.parallel([
				Animated.timing(fadeAnim, {
					toValue: 1,
					duration: 300,
					useNativeDriver: true,
				}),
				Animated.spring(scaleAnim, {
					toValue: 1,
					tension: 50,
					friction: 7,
					useNativeDriver: true,
				}),
			]).start();
		} else {
			fadeAnim.setValue(0);
			scaleAnim.setValue(0.9);
		}
	}, [visible]);

	if (!visible) return null;

	// Icône et couleur selon le statut
	const getStatusConfig = () => {
		if (loading) {
			return {
				icon: "sparkles",
				color: THEME.colors.primary.amber,
				title: "Analyse en cours...",
			};
		}

		switch (result?.status) {
			case "ok":
				return {
					icon: "checkmark-circle",
					color: "#10B981",
					title: "Créneau disponible",
				};
			case "warning":
				return {
					icon: "warning",
					color: "#F59E0B",
					title: "Créneau risqué",
				};
			case "refused":
				return {
					icon: "close-circle",
					color: "#EF4444",
					title: "Créneau impossible",
				};
			default:
				return {
					icon: "help-circle",
					color: THEME.colors.text.muted,
					title: "Analyse",
				};
		}
	};

	const statusConfig = getStatusConfig();

	return (
		<Modal visible={visible} transparent animationType="none">
			<View
				style={{
					position: "absolute",
					top: 100,
					left: 50,
					width: 300,
					height: 200,
					backgroundColor: "red",
					zIndex: 99999,
				}}
			>
				<Text style={{ color: "white", fontSize: 24 }}>MODAL VISIBLE TEST</Text>
			</View>
			<BlurView intensity={40} style={styles.overlay}>
				<TouchableOpacity
					style={styles.backdrop}
					activeOpacity={1}
					onPress={onClose}
				>
					<Animated.View
						style={{
							opacity: fadeAnim,
							transform: [{ scale: scaleAnim }],
						}}
					>
						<TouchableOpacity
							activeOpacity={1}
							style={styles.modalContainer}
							onPress={(e) => e.stopPropagation()}
						>
							<LinearGradient
								colors={[
									`${THEME.colors.background.elevated}E6`,
									`${THEME.colors.background.elevated}F2`,
								]}
								style={styles.modalContent}
							>
								{/* Header */}
								<View style={styles.header}>
									<View style={styles.headerLeft}>
										<View
											style={[
												styles.iconCircle,
												{ backgroundColor: statusConfig.color + "20" },
											]}
										>
											<Ionicons
												name={statusConfig.icon}
												size={24}
												color={statusConfig.color}
											/>
										</View>
										<Text style={styles.title}>{statusConfig.title}</Text>
									</View>
									<TouchableOpacity
										onPress={onClose}
										style={styles.closeButton}
									>
										<Ionicons
											name="close"
											size={24}
											color={THEME.colors.text.muted}
										/>
									</TouchableOpacity>
								</View>

								<ScrollView
									style={styles.scrollContent}
									showsVerticalScrollIndicator={false}
								>
									{loading ? (
										<View style={styles.loadingContainer}>
											<ActivityIndicator
												size="large"
												color={THEME.colors.primary.amber}
											/>
											<Text style={styles.loadingText}>
												Analyse des disponibilités...
											</Text>
										</View>
									) : result ? (
										<>
											{/* Message principal clair */}
											<View
												style={[
													styles.mainMessageCard,
													{
														backgroundColor: statusConfig.color + "15",
														borderLeftColor: statusConfig.color,
													},
												]}
											>
												<View style={styles.mainMessageHeader}>
													<Ionicons
														name={statusConfig.icon}
														size={32}
														color={statusConfig.color}
													/>
													<Text
														style={[
															styles.mainMessageTitle,
															{ color: statusConfig.color },
														]}
													>
														{result.status === "ok"
															? "✅ Créneau disponible"
															: result.status === "warning"
															? "⚠️ Créneau risqué"
															: "❌ Pas de disponibilité pour cet horaire"}
													</Text>
												</View>
												<Text style={styles.mainMessageReason}>
													{result.reason}
												</Text>
											</View>

											{/* Détails complémentaires */}
											{(result.availableSeats !== undefined ||
												(result.conflicts && result.conflicts.length > 0)) && (
												<View style={styles.detailsCard}>
													{result.availableSeats !== undefined && (
														<View style={styles.capacityInfo}>
															<Ionicons
																name="people"
																size={16}
																color={THEME.colors.text.muted}
															/>
															<Text style={styles.capacityText}>
																{result.availableSeats} / {result.totalCapacity}{" "}
																places disponibles
															</Text>
														</View>
													)}

													{result.conflicts && result.conflicts.length > 0 && (
														<View style={styles.conflictsSection}>
															<Text style={styles.sectionTitle}>
																Réservations proches :
															</Text>
															{result.conflicts.map((conflict, idx) => (
																<View key={idx} style={styles.conflictItem}>
																	<View style={styles.conflictDot} />
																	<Text style={styles.conflictText}>
																		{conflict.time} - {conflict.people} pers.
																		{conflict.overlapType === "full" &&
																			" (chevauchement)"}
																	</Text>
																</View>
															))}
														</View>
													)}
												</View>
											)}

											{/* Alternatives */}
											{result.alternatives &&
												result.alternatives.length > 0 && (
													<View style={styles.alternativesSection}>
														<View style={styles.alternativesHeader}>
															<Ionicons
																name="time"
																size={20}
																color={THEME.colors.primary.amber}
															/>
															<Text style={styles.alternativesTitle}>
																Choisissez parmi ces autres horaires
															</Text>
														</View>
														<Text style={styles.alternativesSubtitle}>
															Cliquez sur un horaire pour le sélectionner
															automatiquement
														</Text>

														{result.alternatives.map((alt, idx) => (
															<TouchableOpacity
																key={idx}
																style={[
																	styles.alternativeCard,
																	{
																		borderColor:
																			alt.risk === "low"
																				? "#10B98140"
																				: alt.risk === "medium"
																				? "#F59E0B40"
																				: "#EF444440",
																	},
																]}
																onPress={() => {
																	onSelectAlternative(alt.time);
																	onClose();
																}}
															>
																<View style={styles.alternativeLeft}>
																	<View
																		style={[
																			styles.riskDot,
																			{
																				backgroundColor:
																					alt.risk === "low"
																						? "#10B981"
																						: alt.risk === "medium"
																						? "#F59E0B"
																						: "#EF4444",
																			},
																		]}
																	/>
																	<View>
																		<Text style={styles.alternativeTime}>
																			{alt.time}
																		</Text>
																		<Text style={styles.alternativeDetails}>
																			{alt.availableSeats} places
																			{alt.distanceMinutes && (
																				<>
																					{" "}
																					·{" "}
																					{alt.distanceMinutes < 60
																						? `${alt.distanceMinutes} min`
																						: `${Math.floor(
																								alt.distanceMinutes / 60
																						  )}h`}
																				</>
																			)}
																		</Text>
																	</View>
																</View>
																<Ionicons
																	name="chevron-forward"
																	size={20}
																	color={THEME.colors.text.muted}
																/>
															</TouchableOpacity>
														))}
													</View>
												)}
										</>
									) : (
										<View style={styles.emptyContainer}>
											<Ionicons
												name="alert-circle-outline"
												size={48}
												color={THEME.colors.text.muted}
											/>
											<Text style={styles.emptyText}>
												Aucun résultat disponible
											</Text>
										</View>
									)}
								</ScrollView>

								{/* Footer info */}
								{result && result.turnoverTime && (
									<View style={styles.footer}>
										<Ionicons
											name="information-circle"
											size={14}
											color={THEME.colors.text.muted}
										/>
										<Text style={styles.footerText}>
											Durée estimée : {result.turnoverTime} minutes
										</Text>
									</View>
								)}
							</LinearGradient>
						</TouchableOpacity>
					</Animated.View>
				</TouchableOpacity>
			</BlurView>
		</Modal>
	);
};

const createStyles = (THEME) =>
	StyleSheet.create({
		overlay: {
			flex: 1,
			backgroundColor: "rgba(0,0,0,0.5)",
		},
		backdrop: {
			flex: 1,
			justifyContent: "center",
			alignItems: "center",
			padding: 20,
		},
		modalContainer: {
			width: "100%",
			maxWidth: 500,
			maxHeight: "80%",
			borderRadius: 24,
			overflow: "hidden",
			shadowColor: "#000",
			shadowOffset: { width: 0, height: 8 },
			shadowOpacity: 0.3,
			shadowRadius: 16,
		},
		modalContent: {
			flex: 1,
			padding: 24,
		},
		header: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			marginBottom: 20,
		},
		headerLeft: {
			flexDirection: "row",
			alignItems: "center",
			flex: 1,
		},
		iconCircle: {
			width: 48,
			height: 48,
			borderRadius: 24,
			justifyContent: "center",
			alignItems: "center",
			marginRight: 12,
		},
		title: {
			fontSize: 20,
			fontWeight: "700",
			color: THEME.colors.text.primary,
			flex: 1,
		},
		closeButton: {
			padding: 8,
		},
		scrollContent: {
			flex: 1,
		},
		loadingContainer: {
			alignItems: "center",
			paddingVertical: 40,
		},
		loadingText: {
			marginTop: 16,
			fontSize: 14,
			color: THEME.colors.text.muted,
		},
		mainMessageCard: {
			borderRadius: 16,
			padding: 20,
			marginBottom: 20,
			borderLeftWidth: 4,
		},
		mainMessageHeader: {
			flexDirection: "row",
			alignItems: "center",
			marginBottom: 12,
			gap: 12,
		},
		mainMessageTitle: {
			fontSize: 18,
			fontWeight: "700",
			flex: 1,
		},
		mainMessageReason: {
			fontSize: 14,
			color: THEME.colors.text.secondary,
			lineHeight: 20,
		},
		detailsCard: {
			backgroundColor: `${THEME.colors.background.card}80`,
			borderRadius: 16,
			padding: 16,
			marginBottom: 20,
		},
		resultCard: {
			backgroundColor: `${THEME.colors.background.card}80`,
			borderRadius: 16,
			padding: 20,
			marginBottom: 20,
		},
		reasonText: {
			fontSize: 16,
			fontWeight: "600",
			color: THEME.colors.text.primary,
			marginBottom: 12,
			lineHeight: 22,
		},
		capacityInfo: {
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
			paddingTop: 12,
			borderTopWidth: 1,
			borderTopColor: `${THEME.colors.text.muted}20`,
		},
		capacityText: {
			fontSize: 14,
			color: THEME.colors.text.muted,
		},
		conflictsSection: {
			marginTop: 16,
			paddingTop: 16,
			borderTopWidth: 1,
			borderTopColor: `${THEME.colors.text.muted}20`,
		},
		sectionTitle: {
			fontSize: 14,
			fontWeight: "600",
			color: THEME.colors.text.primary,
			marginBottom: 8,
		},
		conflictItem: {
			flexDirection: "row",
			alignItems: "center",
			marginTop: 6,
		},
		conflictDot: {
			width: 6,
			height: 6,
			borderRadius: 3,
			backgroundColor: THEME.colors.text.muted,
			marginRight: 8,
		},
		conflictText: {
			fontSize: 13,
			color: THEME.colors.text.muted,
		},
		alternativesSection: {
			marginBottom: 20,
		},
		alternativesHeader: {
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
			marginBottom: 8,
		},
		alternativesTitle: {
			fontSize: 17,
			fontWeight: "700",
			color: THEME.colors.text.primary,
			flex: 1,
		},
		alternativesSubtitle: {
			fontSize: 13,
			color: THEME.colors.text.muted,
			marginBottom: 16,
		},
		alternativeCard: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			backgroundColor: `${THEME.colors.background.card}80`,
			borderRadius: 12,
			padding: 16,
			marginBottom: 12,
			borderWidth: 2,
		},
		alternativeLeft: {
			flexDirection: "row",
			alignItems: "center",
			flex: 1,
		},
		riskDot: {
			width: 10,
			height: 10,
			borderRadius: 5,
			marginRight: 12,
		},
		alternativeTime: {
			fontSize: 18,
			fontWeight: "700",
			color: THEME.colors.text.primary,
			marginBottom: 2,
		},
		alternativeDetails: {
			fontSize: 12,
			color: THEME.colors.text.muted,
		},
		emptyContainer: {
			alignItems: "center",
			paddingVertical: 40,
		},
		emptyText: {
			marginTop: 12,
			fontSize: 14,
			color: THEME.colors.text.muted,
			textAlign: "center",
		},
		footer: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			gap: 6,
			marginTop: 12,
			paddingTop: 12,
			borderTopWidth: 1,
			borderTopColor: `${THEME.colors.text.muted}20`,
		},
		footerText: {
			fontSize: 12,
			color: THEME.colors.text.muted,
		},
	});

export default ReservationAssistantModal;
