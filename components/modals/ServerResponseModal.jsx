/**
 * 💬 ServerResponseModal - Modal pour répondre aux messages clients
 *
 * Permet aux serveurs/managers de :
 * - Voir le message client original
 * - Sélectionner une réponse prédéfinie
 * - Envoyer la réponse (temps réel via WebSocket)
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
	View,
	Text,
	Modal,
	TouchableOpacity,
	FlatList,
	StyleSheet,
	ActivityIndicator,
	Vibration,
	Platform,
	Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import useUserStore from "../../src/stores/useUserStore";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// 🎨 Design cohérent OrderIt
const COLORS = {
	primary: ["#667eea", "#764ba2"],
	accent: "#667eea",
	success: "#22c55e",
	glass: "rgba(30, 30, 50, 0.95)",
	text: "#ffffff",
	textMuted: "rgba(255, 255, 255, 0.7)",
	danger: "#ef4444",
};

// Catégories réponses avec couleurs
const CATEGORY_COLORS = {
	confirmation: { color: "#22c55e", icon: "checkmark-circle-outline" },
	delai: { color: "#f59e0b", icon: "time-outline" },
	remerciement: { color: "#667eea", icon: "heart-outline" },
	autre: { color: "#8b5cf6", icon: "ellipsis-horizontal-outline" },
};

const ServerResponseModal = ({
	visible,
	clientMessage,
	onClose,
	onResponseSent,
	restaurantId,
}) => {
	const { serverId, serverName, username } = useUserStore();

	// États
	const [responses, setResponses] = useState([]);
	const [selectedResponse, setSelectedResponse] = useState(null);
	const [sending, setSending] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	// Charger réponses prédéfinies
	const loadPredefinedResponses = useCallback(async () => {
		setLoading(true);
		setError(null);

		try {
			const token = await useUserStore.getState().getToken();
			const url = `${process.env.EXPO_PUBLIC_API_URL}/client-messages/server-responses/predefined/${restaurantId}`;

			console.log("📥 Chargement réponses prédéfinies...");

			const response = await fetch(url, {
				method: "GET",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
			});

			if (!response.ok) {
				throw new Error(`Erreur ${response.status}`);
			}

			const data = await response.json();
			console.log(`✅ ${data.responses?.length || 0} réponses chargées`);
			setResponses(data.responses || []);
		} catch (err) {
			console.error("❌ Erreur chargement réponses:", err);
			setError("Impossible de charger les réponses");
		} finally {
			setLoading(false);
		}
	}, [restaurantId]);

	// Charger réponses prédéfinies au montage
	useEffect(() => {
		if (visible && restaurantId) {
			loadPredefinedResponses();
		}
	}, [visible, restaurantId, loadPredefinedResponses]);

	// Envoyer réponse
	const sendResponse = async () => {
		if (!selectedResponse || !clientMessage) return;

		setSending(true);
		setError(null);

		try {
			const token = await useUserStore.getState().getToken();
			const url = `${process.env.EXPO_PUBLIC_API_URL}/client-messages/server-responses/send`;

			console.log("📤 Envoi réponse:", selectedResponse.text);

			const response = await fetch(url, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					clientMessageId: clientMessage.id,
					responseText: selectedResponse.text,
					reservationId: clientMessage.reservationId,
					serverId: serverId || "unknown",
					serverName: serverName || username || "Serveur",
				}),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || `Erreur ${response.status}`);
			}

			const data = await response.json();
			console.log("✅ Réponse envoyée:", data);

			// Vibration succès
			if (Platform.OS !== "web") {
				Vibration.vibrate([0, 50, 50, 50]);
			}

			// Callback succès
			if (onResponseSent) {
				onResponseSent(clientMessage);
			}

			// Fermer modal
			onClose();
		} catch (err) {
			console.error("❌ Erreur envoi réponse:", err);
			setError(err.message || "Impossible d'envoyer la réponse");
		} finally {
			setSending(false);
		}
	};

	// Sélectionner réponse
	const selectResponse = useCallback((response) => {
		setSelectedResponse(response);
		if (Platform.OS !== "web") {
			Vibration.vibrate(10);
		}
	}, []);

	// Annuler sélection
	const cancelSelection = useCallback(() => {
		setSelectedResponse(null);
	}, []);

	// Grouper réponses par catégorie
	const groupedResponses = useMemo(() => {
		const groups = {};
		responses.forEach((resp) => {
			const cat = resp.category || "autre";
			if (!groups[cat]) groups[cat] = [];
			groups[cat].push(resp);
		});
		return Object.entries(groups);
	}, [responses]);

	if (!visible || !clientMessage) return null;

	return (
		<Modal
			visible={visible}
			transparent
			animationType="fade"
			onRequestClose={onClose}
		>
			<View style={styles.overlay}>
				<TouchableOpacity
					style={styles.overlayTouchable}
					activeOpacity={1}
					onPress={onClose}
				/>

				<View style={styles.modalContainer}>
					<BlurView intensity={100} style={styles.modalBlur}>
						{/* Header */}
						<LinearGradient
							colors={COLORS.primary}
							start={{ x: 0, y: 0 }}
							end={{ x: 1, y: 1 }}
							style={styles.header}
						>
							<View style={styles.headerLeft}>
								<Ionicons name="chatbubbles" size={26} color={COLORS.text} />
								<Text style={styles.headerTitle}>Répondre au client</Text>
							</View>
							<TouchableOpacity onPress={onClose} style={styles.closeButton}>
								<Ionicons name="close" size={26} color={COLORS.text} />
							</TouchableOpacity>
						</LinearGradient>

						{/* Message client original */}
						<View style={styles.clientMessageSection}>
							<View style={styles.clientMessageHeader}>
								<Ionicons
									name="person-circle-outline"
									size={20}
									color={COLORS.accent}
								/>
								<Text style={styles.clientMessageLabel}>
									{clientMessage.clientName || "Client"} - Table{" "}
									{clientMessage.tableNumber}
								</Text>
							</View>
							<View style={styles.clientMessageBubble}>
								<Text style={styles.clientMessageText}>
									{clientMessage.text}
								</Text>
								<Text style={styles.clientMessageTime}>
									{new Date(clientMessage.timestamp).toLocaleTimeString(
										"fr-FR",
										{
											hour: "2-digit",
											minute: "2-digit",
										},
									)}
								</Text>
							</View>
						</View>

						{/* Réponses prédéfinies */}
						<View style={styles.responsesSection}>
							<Text style={styles.sectionTitle}>💬 Choisissez une réponse</Text>

							{loading ? (
								<View style={styles.loadingContainer}>
									<ActivityIndicator size="large" color={COLORS.accent} />
									<Text style={styles.loadingText}>Chargement...</Text>
								</View>
							) : error ? (
								<View style={styles.errorContainer}>
									<Ionicons
										name="alert-circle-outline"
										size={48}
										color={COLORS.danger}
									/>
									<Text style={styles.errorText}>{error}</Text>
									<TouchableOpacity
										style={styles.retryButton}
										onPress={loadPredefinedResponses}
									>
										<Text style={styles.retryButtonText}>Réessayer</Text>
									</TouchableOpacity>
								</View>
							) : (
								<FlatList
									data={groupedResponses}
									keyExtractor={([category]) => category}
									showsVerticalScrollIndicator={false}
									style={styles.responsesList}
									contentContainerStyle={styles.responsesListContent}
									renderItem={({ item: [category, resps] }) => (
										<View style={styles.categorySection}>
											{/* Header catégorie */}
											<View style={styles.categoryHeader}>
												<Ionicons
													name={
														CATEGORY_COLORS[category]?.icon ||
														"ellipsis-horizontal"
													}
													size={16}
													color={
														CATEGORY_COLORS[category]?.color || COLORS.accent
													}
												/>
												<Text style={styles.categoryTitle}>
													{category.charAt(0).toUpperCase() + category.slice(1)}
												</Text>
											</View>

											{/* Réponses de la catégorie */}
											{resps.map((resp) => {
												const isSelected = selectedResponse?._id === resp._id;
												return (
													<TouchableOpacity
														key={resp._id}
														style={[
															styles.responseItem,
															isSelected && styles.responseItemSelected,
														]}
														onPress={() => selectResponse(resp)}
														activeOpacity={0.7}
													>
														<View style={styles.responseContent}>
															<Ionicons
																name={resp.icon || "chatbubble-outline"}
																size={18}
																color={
																	isSelected ? COLORS.accent : COLORS.textMuted
																}
															/>
															<Text
																style={[
																	styles.responseText,
																	isSelected && styles.responseTextSelected,
																]}
															>
																{resp.text}
															</Text>
														</View>

														{isSelected && (
															<View style={styles.selectedBadge}>
																<Ionicons
																	name="checkmark"
																	size={16}
																	color="#fff"
																/>
															</View>
														)}
													</TouchableOpacity>
												);
											})}
										</View>
									)}
									ListEmptyComponent={
										<View style={styles.emptyContainer}>
											<Ionicons
												name="chatbubbles-outline"
												size={48}
												color={COLORS.textMuted}
											/>
											<Text style={styles.emptyText}>
												Aucune réponse disponible
											</Text>
										</View>
									}
								/>
							)}
						</View>

						{/* Footer : Actions */}
						<View style={styles.footer}>
							{selectedResponse ? (
								<View style={styles.actionButtons}>
									<TouchableOpacity
										style={styles.cancelButton}
										onPress={cancelSelection}
									>
										<Text style={styles.cancelButtonText}>Annuler</Text>
									</TouchableOpacity>

									<TouchableOpacity
										style={[
											styles.sendButton,
											sending && styles.sendButtonDisabled,
										]}
										onPress={sendResponse}
										disabled={sending}
									>
										<LinearGradient
											colors={COLORS.primary}
											start={{ x: 0, y: 0 }}
											end={{ x: 1, y: 1 }}
											style={styles.sendButtonGradient}
										>
											{sending ? (
												<ActivityIndicator size="small" color="#fff" />
											) : (
												<>
													<Ionicons name="send" size={18} color="#fff" />
													<Text style={styles.sendButtonText}>Envoyer</Text>
												</>
											)}
										</LinearGradient>
									</TouchableOpacity>
								</View>
							) : (
								<View style={styles.footerInfo}>
									<Ionicons
										name="information-circle-outline"
										size={16}
										color={COLORS.textMuted}
									/>
									<Text style={styles.footerInfoText}>
										Sélectionnez une réponse puis confirmez l&apos;envoi
									</Text>
								</View>
							)}
						</View>
					</BlurView>
				</View>
			</View>
		</Modal>
	);
};

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: "rgba(0, 0, 0, 0.7)",
		justifyContent: "center",
		alignItems: "center",
	},
	overlayTouchable: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
	},
	modalContainer: {
		width: SCREEN_WIDTH - 32,
		maxHeight: SCREEN_HEIGHT * 0.85,
		borderRadius: 20,
		overflow: "hidden",
		backgroundColor: "#fff",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 10 },
		shadowOpacity: 0.25,
		shadowRadius: 20,
		elevation: 10,
	},
	modalBlur: {
		flex: 1,
	},

	// Header
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingHorizontal: 20,
		paddingVertical: 18,
	},
	headerLeft: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
	},
	headerTitle: {
		fontSize: 18,
		fontWeight: "700",
		color: COLORS.text,
	},
	closeButton: {
		padding: 4,
	},

	// Message client
	clientMessageSection: {
		paddingHorizontal: 20,
		paddingVertical: 16,
		backgroundColor: "rgba(102, 126, 234, 0.05)",
		borderBottomWidth: 1,
		borderBottomColor: "rgba(0, 0, 0, 0.05)",
	},
	clientMessageHeader: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		marginBottom: 10,
	},
	clientMessageLabel: {
		fontSize: 13,
		fontWeight: "600",
		color: COLORS.accent,
	},
	clientMessageBubble: {
		backgroundColor: "#fff",
		padding: 14,
		borderRadius: 12,
		borderLeftWidth: 3,
		borderLeftColor: COLORS.accent,
	},
	clientMessageText: {
		fontSize: 15,
		color: "#222",
		lineHeight: 20,
		marginBottom: 6,
	},
	clientMessageTime: {
		fontSize: 11,
		color: "#999",
	},

	// Réponses
	responsesSection: {
		flex: 1,
		paddingHorizontal: 20,
		paddingTop: 16,
	},
	sectionTitle: {
		fontSize: 16,
		fontWeight: "700",
		color: "#222",
		marginBottom: 14,
	},
	responsesList: {
		flex: 1,
	},
	responsesListContent: {
		paddingBottom: 16,
	},

	// Catégorie
	categorySection: {
		marginBottom: 20,
	},
	categoryHeader: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		marginBottom: 10,
		paddingLeft: 4,
	},
	categoryTitle: {
		fontSize: 12,
		fontWeight: "600",
		color: "#666",
		textTransform: "uppercase",
		letterSpacing: 0.5,
	},

	// Item réponse
	responseItem: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		backgroundColor: "rgba(0, 0, 0, 0.02)",
		borderRadius: 12,
		padding: 14,
		marginBottom: 8,
		borderWidth: 1,
		borderColor: "transparent",
	},
	responseItemSelected: {
		backgroundColor: "rgba(102, 126, 234, 0.1)",
		borderColor: COLORS.accent,
	},
	responseContent: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		flex: 1,
	},
	responseText: {
		flex: 1,
		fontSize: 15,
		color: "#444",
		lineHeight: 20,
	},
	responseTextSelected: {
		color: "#222",
		fontWeight: "500",
	},
	selectedBadge: {
		backgroundColor: COLORS.accent,
		width: 24,
		height: 24,
		borderRadius: 12,
		justifyContent: "center",
		alignItems: "center",
	},

	// États
	loadingContainer: {
		paddingVertical: 60,
		alignItems: "center",
		gap: 12,
	},
	loadingText: {
		color: "#666",
		fontSize: 14,
	},
	errorContainer: {
		paddingVertical: 60,
		alignItems: "center",
		gap: 16,
	},
	errorText: {
		color: COLORS.danger,
		fontSize: 15,
		textAlign: "center",
	},
	retryButton: {
		backgroundColor: COLORS.danger,
		paddingHorizontal: 24,
		paddingVertical: 10,
		borderRadius: 10,
	},
	retryButtonText: {
		color: "#fff",
		fontSize: 14,
		fontWeight: "600",
	},
	emptyContainer: {
		paddingVertical: 60,
		alignItems: "center",
		gap: 12,
	},
	emptyText: {
		color: "#666",
		fontSize: 15,
	},

	// Footer
	footer: {
		paddingHorizontal: 20,
		paddingVertical: 16,
		borderTopWidth: 1,
		borderTopColor: "rgba(0, 0, 0, 0.05)",
		backgroundColor: "#fff",
	},
	actionButtons: {
		flexDirection: "row",
		gap: 12,
	},
	cancelButton: {
		flex: 1,
		backgroundColor: "rgba(239, 68, 68, 0.1)",
		paddingVertical: 14,
		borderRadius: 12,
		alignItems: "center",
	},
	cancelButtonText: {
		color: COLORS.danger,
		fontSize: 15,
		fontWeight: "600",
	},
	sendButton: {
		flex: 2,
		borderRadius: 12,
		overflow: "hidden",
	},
	sendButtonDisabled: {
		opacity: 0.6,
	},
	sendButtonGradient: {
		flexDirection: "row",
		justifyContent: "center",
		alignItems: "center",
		gap: 8,
		paddingVertical: 14,
	},
	sendButtonText: {
		color: "#fff",
		fontSize: 15,
		fontWeight: "700",
	},
	footerInfo: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
	},
	footerInfoText: {
		color: "#666",
		fontSize: 12,
	},
});

export default ServerResponseModal;
