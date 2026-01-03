// components/elements/ActivityComponents/ServiceSection.jsx
import React, { useMemo } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	Modal,
	ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../hooks/useTheme";

export const ServiceSection = React.memo(
	({
		activeReservation,
		theme,
		servers,
		activeServer,
		showServerOptions,
		setShowServerOptions,
		editField,
		setActiveServer,
	}) => {
		const THEME = useTheme(); // Utilise le hook avec multiplicateur de police
		const localStyles = useMemo(() => createStyles(THEME), [THEME]);

		const safeServers = useMemo(
			() => (Array.isArray(servers) ? servers : []),
			[servers]
		);

		const serverDisplayName = useMemo(() => {
			if (activeServer?.name) {
				return activeServer.name;
			}
			if (activeReservation?.serverId?.name) {
				return activeReservation.serverId.name;
			}
			return "Non assigné";
		}, [activeServer, activeReservation?.serverId]);

		if (!activeReservation) {
			return null;
		}

		return (
			<View style={localStyles.block}>
				{/* Header Section */}
				<View style={localStyles.sectionHeader}>
					<Ionicons
						name="people"
						size={18}
						color={THEME.colors.primary.amber}
					/>
					<Text style={localStyles.sectionTitle}>Service</Text>
				</View>

				{/* Serveur */}
				<View style={localStyles.row}>
					<Text style={localStyles.label}>Serveur</Text>
					<TouchableOpacity
						style={localStyles.editableField}
						onPress={() => setShowServerOptions?.(true)}
					>
						<View style={localStyles.serverBadge}>
							<Ionicons
								name="person"
								size={14}
								color={THEME.colors.primary.amber}
							/>
							<Text style={localStyles.value}>{serverDisplayName}</Text>
						</View>
						<Ionicons
							name="chevron-down"
							size={16}
							color={THEME.colors.text.muted}
						/>
					</TouchableOpacity>
				</View>

				{/* Modal pour sélection serveur */}
				<Modal
					visible={showServerOptions}
					transparent
					animationType="fade"
					onRequestClose={() => setShowServerOptions?.(false)}
				>
					<TouchableOpacity
						style={localStyles.modalOverlay}
						activeOpacity={1}
						onPress={() => setShowServerOptions?.(false)}
					>
						<View
							style={localStyles.modalCard}
							onStartShouldSetResponder={() => true}
						>
							{/* Header */}
							<View style={localStyles.modalHeader}>
								<Text style={localStyles.modalTitle}>
									Sélectionner un serveur
								</Text>
								<TouchableOpacity
									onPress={() => setShowServerOptions?.(false)}
									style={localStyles.modalCloseButton}
								>
									<Ionicons
										name="close"
										size={24}
										color={THEME.colors.text.muted}
									/>
								</TouchableOpacity>
							</View>

							<ScrollView
								style={localStyles.modalScrollView}
								contentContainerStyle={localStyles.modalScrollContent}
							>
								{safeServers.length === 0 ? (
									<View style={localStyles.emptyState}>
										<Ionicons
											name="people-outline"
											size={48}
											color={THEME.colors.text.muted}
										/>
										<Text style={localStyles.emptyText}>
											Aucun serveur disponible
										</Text>
										<Text style={localStyles.emptySubtext}>
											Ajoutez des serveurs dans les paramètres
										</Text>
									</View>
								) : (
									safeServers.map((srv, index) => {
										if (!srv) return null;
										// ⭐ Priorité à activeServer si défini, sinon fallback sur serverId de la réservation
										const isSelected = activeServer
											? activeServer._id === srv._id
											: activeReservation?.serverId?._id === srv._id;
										// 🔮 Fake status - à remplacer par srv.isActive quand dispo en BDD
										const isActive = srv.isActive ?? index % 3 !== 2;
										return (
											<TouchableOpacity
												key={srv._id || Math.random().toString()}
												style={[
													localStyles.modalItem,
													isSelected && localStyles.modalItemSelected,
												]}
												onPress={() => {
													console.log(
														"🎯 Serveur sélectionné:",
														srv.name,
														srv._id
													);
													editField?.("serverId", srv._id, true);
													setActiveServer?.(srv);
													setShowServerOptions?.(false);
												}}
											>
												<View style={localStyles.modalItemLeft}>
													<View
														style={[
															localStyles.modalAvatar,
															isSelected && localStyles.modalAvatarSelected,
														]}
													>
														<Ionicons
															name="person"
															size={18}
															color={
																isSelected
																	? THEME.colors.primary.amber
																	: THEME.colors.text.secondary
															}
														/>
													</View>
													<View>
														<Text
															style={[
																localStyles.modalName,
																isSelected && localStyles.modalNameSelected,
															]}
														>
															{srv.name || "Serveur"}
														</Text>
														{srv.email && (
															<Text style={localStyles.modalEmail}>
																{srv.email}
															</Text>
														)}
														<View
															style={[
																localStyles.statusTag,
																isActive
																	? localStyles.statusTagActive
																	: localStyles.statusTagInactive,
															]}
														>
															<View
																style={[
																	localStyles.statusDotSmall,
																	{
																		backgroundColor: isActive
																			? "#22C55E"
																			: THEME.colors.text.muted,
																	},
																]}
															/>
															<Text
																style={[
																	localStyles.statusTagText,
																	{
																		color: isActive
																			? "#22C55E"
																			: THEME.colors.text.muted,
																	},
																]}
															>
																{isActive ? "Actif" : "Inactif"}
															</Text>
														</View>
													</View>
												</View>
												{isSelected && (
													<View style={localStyles.modalBadge}>
														<Ionicons
															name="checkmark-circle"
															size={18}
															color={THEME.colors.primary.amber}
														/>
													</View>
												)}
											</TouchableOpacity>
										);
									})
								)}
							</ScrollView>
						</View>
					</TouchableOpacity>
				</Modal>

				{/* Statut plat */}
				<View style={localStyles.row}>
					<Text style={localStyles.label}>Statut de plats</Text>
					<View style={localStyles.statusBadge}>
						<View
							style={[
								localStyles.statusDot,
								{
									backgroundColor:
										activeReservation?.dishStatus === "En attente"
											? THEME.colors.status.warning
											: THEME.colors.status.success,
								},
							]}
						/>
						<Text style={localStyles.statusText}>
							{activeReservation?.dishStatus || "En attente"}
						</Text>
					</View>
				</View>
			</View>
		);
	}
);

ServiceSection.displayName = "ServiceSection";

// ═══════════════════════════════════════════════════════════════════════
// 🎨 Premium Dark Styles
// ═══════════════════════════════════════════════════════════════════════
const createStyles = (THEME) =>
	StyleSheet.create({
		block: {
			backgroundColor: THEME.colors.background.card,
			borderRadius: THEME.radius.lg,
			padding: THEME.spacing.lg,
			borderWidth: 1,
			borderColor: THEME.colors.border.default,
			marginTop: THEME.spacing.md,
		},
		sectionHeader: {
			flexDirection: "row",
			alignItems: "center",
			marginBottom: THEME.spacing.md,
			gap: THEME.spacing.sm,
		},
		sectionTitle: {
			fontSize: THEME.typography.sizes.sm,
			fontWeight: "700",
			color: THEME.colors.text.primary,
			textTransform: "uppercase",
			letterSpacing: 0.5,
		},
		row: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			paddingVertical: THEME.spacing.sm,
			borderBottomWidth: 1,
			borderBottomColor: THEME.colors.border.subtle,
		},
		label: {
			fontSize: THEME.typography.sizes.sm,
			fontWeight: "500",
			color: THEME.colors.text.secondary,
			flex: 1,
		},
		value: {
			fontSize: THEME.typography.sizes.sm,
			fontWeight: "600",
			color: THEME.colors.text.primary,
		},
		placeholder: {
			color: THEME.colors.text.muted,
			fontStyle: "italic",
		},
		editableField: {
			flexDirection: "row",
			alignItems: "center",
			gap: THEME.spacing.sm,
			backgroundColor: THEME.colors.background.elevated,
			paddingHorizontal: THEME.spacing.md,
			paddingVertical: THEME.spacing.sm,
			borderRadius: THEME.radius.sm,
			flex: 1,
			marginLeft: THEME.spacing.md,
			justifyContent: "space-between",
		},
		serverBadge: {
			flexDirection: "row",
			alignItems: "center",
			gap: THEME.spacing.xs,
		},
		dropdown: {
			flex: 1,
			marginLeft: THEME.spacing.md,
			backgroundColor: THEME.colors.background.elevated,
			borderRadius: THEME.radius.md,
			borderWidth: 1,
			borderColor: THEME.colors.border.default,
			overflow: "hidden",
		},
		dropdownItem: {
			flexDirection: "row",
			alignItems: "center",
			gap: THEME.spacing.sm,
			paddingHorizontal: THEME.spacing.md,
			paddingVertical: THEME.spacing.sm,
			borderBottomWidth: 1,
			borderBottomColor: THEME.colors.border.subtle,
		},
		dropdownItemSelected: {
			backgroundColor: "rgba(245, 158, 11, 0.1)",
		},
		dropdownText: {
			flex: 1,
			fontSize: THEME.typography.sizes.sm,
			color: THEME.colors.text.primary,
			fontWeight: "500",
		},
		dropdownTextSelected: {
			color: THEME.colors.primary.amber,
			fontWeight: "600",
		},
		statusBadge: {
			flexDirection: "row",
			alignItems: "center",
			gap: THEME.spacing.xs,
			backgroundColor: THEME.colors.background.elevated,
			paddingHorizontal: THEME.spacing.md,
			paddingVertical: THEME.spacing.xs,
			borderRadius: THEME.radius.full || 100,
		},
		statusDot: {
			width: 8,
			height: 8,
			borderRadius: 4,
		},
		statusText: {
			fontSize: THEME.typography.sizes.sm,
			fontWeight: "600",
			color: THEME.colors.text.primary,
		},
		// Modal styles
		modalOverlay: {
			flex: 1,
			backgroundColor: "rgba(0, 0, 0, 0.5)",
			justifyContent: "center",
			alignItems: "center",
			padding: THEME.spacing.lg,
		},
		modalCard: {
			width: "100%",
			maxWidth: 400,
			maxHeight: 500,
			backgroundColor: THEME.colors.background.card,
			borderRadius: THEME.radius.lg,
			borderWidth: 1,
			borderColor: THEME.colors.border.default,
			overflow: "hidden",
			shadowColor: "#000",
			shadowOffset: { width: 0, height: 8 },
			shadowOpacity: 0.3,
			shadowRadius: 16,
			elevation: 8,
		},
		modalHeader: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			paddingHorizontal: THEME.spacing.lg,
			paddingVertical: THEME.spacing.md,
			borderBottomWidth: 1,
			borderBottomColor: THEME.colors.border.subtle,
		},
		modalTitle: {
			fontSize: THEME.typography.sizes.base,
			fontWeight: "700",
			color: THEME.colors.text.primary,
		},
		modalCloseButton: {
			padding: THEME.spacing.xs,
		},
		modalScrollView: {
			maxHeight: 400,
		},
		modalScrollContent: {
			padding: THEME.spacing.sm,
		},
		emptyState: {
			alignItems: "center",
			justifyContent: "center",
			paddingVertical: THEME.spacing.xl * 2,
			paddingHorizontal: THEME.spacing.lg,
		},
		emptyText: {
			fontSize: THEME.typography.sizes.base,
			fontWeight: "600",
			color: THEME.colors.text.primary,
			marginTop: THEME.spacing.md,
		},
		emptySubtext: {
			fontSize: THEME.typography.sizes.sm,
			color: THEME.colors.text.muted,
			marginTop: THEME.spacing.xs,
			textAlign: "center",
		},
		modalItem: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			paddingVertical: THEME.spacing.md,
			paddingHorizontal: THEME.spacing.md,
			borderBottomWidth: 1,
			borderBottomColor: THEME.colors.border.subtle,
			borderStyle: "dashed",
		},
		modalItemSelected: {
			backgroundColor: `${THEME.colors.primary.amber}10`,
		},
		modalItemLeft: {
			flexDirection: "row",
			alignItems: "center",
			gap: THEME.spacing.md,
			flex: 1,
		},
		modalAvatar: {
			width: 36,
			height: 36,
			borderRadius: 18,
			backgroundColor: THEME.colors.background.elevated,
			justifyContent: "center",
			alignItems: "center",
			borderWidth: 1,
			borderColor: THEME.colors.border.subtle,
		},
		modalAvatarSelected: {
			backgroundColor: `${THEME.colors.primary.amber}15`,
			borderColor: THEME.colors.primary.amber,
		},
		modalName: {
			fontSize: THEME.typography.sizes.sm,
			fontWeight: "600",
			color: THEME.colors.text.primary,
		},
		modalNameSelected: {
			color: THEME.colors.primary.amber,
		},
		modalEmail: {
			fontSize: THEME.typography.sizes.xs,
			fontWeight: "400",
			color: THEME.colors.text.muted,
			marginTop: 2,
		},
		modalBadge: {
			marginLeft: THEME.spacing.sm,
		},
		statusTag: {
			flexDirection: "row",
			alignItems: "center",
			paddingHorizontal: THEME.spacing.sm,
			paddingVertical: 2,
			borderRadius: THEME.radius.md,
			marginTop: THEME.spacing.xs,
			alignSelf: "flex-start",
		},
		statusTagActive: {
			backgroundColor: "rgba(34, 197, 94, 0.1)",
		},
		statusTagInactive: {
			backgroundColor: "rgba(100, 116, 139, 0.1)",
		},
		statusDotSmall: {
			width: 6,
			height: 6,
			borderRadius: 3,
			marginRight: THEME.spacing.xs,
		},
		statusTagText: {
			fontSize: THEME.typography.sizes.xs,
			fontWeight: "500",
		},
	});
