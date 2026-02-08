/**
 * 💡 RecommendationsPanel - Composant pour les suggestions de coaching CRM
 * Panel avec recommandations automatiques et actions de coaching
 */

import React, { useMemo, useState } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	Alert,
	ScrollView,
	StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	withSpring,
	withTiming,
	runOnJS,
} from "react-native-reanimated";

const RecommendationsPanel = ({
	recommendations = [],
	onSendAlert = null,
	onMarkCompleted = null,
	loading = false,
	animationDelay = 0,
}) => {
	const [expandedItems, setExpandedItems] = useState(new Set());
	const [processingItems, setProcessingItems] = useState(new Set());

	// ─────────────── Animations ───────────────
	const opacity = useSharedValue(0);
	const slideY = useSharedValue(20);

	const animatedStyle = useAnimatedStyle(() => {
		return {
			opacity: opacity.value,
			transform: [{ translateY: slideY.value }],
		};
	});

	React.useEffect(() => {
		opacity.value = withTiming(1, {
			duration: 500,
			delay: animationDelay,
		});
		slideY.value = withTiming(0, {
			duration: 400,
			delay: animationDelay + 100,
		});
	}, [animationDelay, opacity, slideY]);

	// ─────────────── Grouped Recommendations ───────────────
	const groupedRecommendations = useMemo(() => {
		const groups = {
			urgent: {
				label: "Urgent",
				icon: "alert-circle",
				color: "#EF4444",
				items: [],
			},
			training: {
				label: "Formation",
				icon: "school",
				color: "#F59E0B",
				items: [],
			},
			performance: {
				label: "Performance",
				icon: "trending-up",
				color: "#3B82F6",
				items: [],
			},
			motivation: {
				label: "Motivation",
				icon: "heart",
				color: "#10B981",
				items: [],
			},
		};

		recommendations.forEach((rec) => {
			const category = rec.category || "performance";
			if (groups[category]) {
				groups[category].items.push(rec);
			}
		});

		return Object.entries(groups).filter(
			([_, group]) => group.items.length > 0,
		);
	}, [recommendations]);

	// ─────────────── Priority Icons ───────────────
	const getPriorityConfig = (priority) => {
		const configs = {
			high: { icon: "alert-circle", color: "#EF4444", label: "Haute" },
			medium: { icon: "alert", color: "#F59E0B", label: "Moyenne" },
			low: { icon: "information-circle", color: "#3B82F6", label: "Basse" },
		};
		return configs[priority] || configs.medium;
	};

	// ─────────────── Actions ───────────────
	const handleExpandToggle = (recommendationId) => {
		setExpandedItems((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(recommendationId)) {
				newSet.delete(recommendationId);
			} else {
				newSet.add(recommendationId);
			}
			return newSet;
		});
	};

	const handleSendAlert = async (recommendation) => {
		if (processingItems.has(recommendation.id)) return;

		try {
			setProcessingItems((prev) => new Set(prev).add(recommendation.id));

			if (onSendAlert) {
				await onSendAlert(recommendation);
			}

			Alert.alert(
				"✅ Alerte envoyée",
				`La recommandation a été envoyée à ${recommendation.serverName}`,
				[{ text: "OK" }],
			);
		} catch (_error) {
			Alert.alert(
				"❌ Erreur",
				"Impossible d'envoyer l'alerte. Veuillez réessayer.",
				[{ text: "OK" }],
			);
			console.error("Erreur envoi alerte:", _error);
		} finally {
			setProcessingItems((prev) => {
				const newSet = new Set(prev);
				newSet.delete(recommendation.id);
				return newSet;
			});
		}
	};

	const handleMarkCompleted = async (recommendation) => {
		try {
			setProcessingItems((prev) => new Set(prev).add(recommendation.id));

			if (onMarkCompleted) {
				await onMarkCompleted(recommendation.id);
			}

			Alert.alert(
				"✅ Marqué comme traité",
				"Cette recommandation a été marquée comme complétée.",
				[{ text: "OK" }],
			);
		} catch (_error) {
			Alert.alert(
				"❌ Erreur",
				"Impossible de marquer comme complété. Veuillez réessayer.",
				[{ text: "OK" }],
			);
		} finally {
			setProcessingItems((prev) => {
				const newSet = new Set(prev);
				newSet.delete(recommendation.id);
				return newSet;
			});
		}
	};

	// ─────────────── Recommendation Item ───────────────
	const RecommendationItem = ({ recommendation, groupColor }) => {
		const isExpanded = expandedItems.has(recommendation.id);
		const isProcessing = processingItems.has(recommendation.id);
		const priorityConfig = getPriorityConfig(recommendation.priority);

		const itemScale = useSharedValue(1);

		const itemAnimatedStyle = useAnimatedStyle(() => {
			return {
				transform: [{ scale: itemScale.value }],
			};
		});

		const handlePress = () => {
			itemScale.value = withSpring(0.98, { damping: 10 }, () => {
				itemScale.value = withSpring(1);
				runOnJS(handleExpandToggle)(recommendation.id);
			});
		};

		return (
			<Animated.View style={[styles.recommendationItem, itemAnimatedStyle]}>
				<TouchableOpacity
					onPress={handlePress}
					activeOpacity={0.8}
					style={styles.recommendationHeader}
				>
					<View style={styles.recommendationLeft}>
						<View
							style={[
								styles.priorityBadge,
								{ backgroundColor: priorityConfig.color },
							]}
						>
							<Ionicons name={priorityConfig.icon} size={12} color="white" />
						</View>

						<View style={styles.recommendationInfo}>
							<Text
								style={styles.recommendationTitle}
								numberOfLines={isExpanded ? 0 : 1}
							>
								{recommendation.title || "Recommandation"}
							</Text>
							<Text style={styles.recommendationServer}>
								{recommendation.serverName || "Serveur"}
							</Text>
						</View>
					</View>

					<View style={styles.recommendationRight}>
						<Ionicons
							name={isExpanded ? "chevron-up" : "chevron-down"}
							size={20}
							color="#6B7280"
						/>
					</View>
				</TouchableOpacity>

				{isExpanded && (
					<View style={styles.recommendationContent}>
						{/* Description */}
						{recommendation.description && (
							<Text style={styles.recommendationDescription}>
								{recommendation.description}
							</Text>
						)}

						{/* Métriques */}
						{recommendation.metrics && (
							<View style={styles.metricsContainer}>
								{Object.entries(recommendation.metrics).map(([key, value]) => (
									<View key={key} style={styles.metricItem}>
										<Text style={styles.metricLabel}>{key}:</Text>
										<Text style={styles.metricValue}>{value}</Text>
									</View>
								))}
							</View>
						)}

						{/* Actions suggérées */}
						{recommendation.suggestedActions &&
							recommendation.suggestedActions.length > 0 && (
								<View style={styles.actionsContainer}>
									<Text style={styles.actionsTitle}>Actions suggérées:</Text>
									{recommendation.suggestedActions.map((action, index) => (
										<View key={index} style={styles.actionItem}>
											<Ionicons
												name="checkmark-circle-outline"
												size={16}
												color="green"
											/>
											<Text style={styles.actionText}>{action}</Text>
										</View>
									))}
								</View>
							)}

						{/* Boutons d'action */}
						<View style={styles.recommendationActions}>
							<TouchableOpacity
								style={[styles.actionButton, styles.actionButtonSecondary]}
								onPress={() => handleMarkCompleted(recommendation)}
								disabled={isProcessing}
							>
								{isProcessing ? (
									<Ionicons name="hourglass" size={16} color="#6B7280" />
								) : (
									<Ionicons name="checkmark" size={16} color="#6B7280" />
								)}
								<Text
									style={[
										styles.actionButtonText,
										styles.actionButtonTextSecondary,
									]}
								>
									Traité
								</Text>
							</TouchableOpacity>

							<TouchableOpacity
								style={[
									styles.actionButton,
									styles.actionButtonPrimary,
									{ backgroundColor: groupColor },
								]}
								onPress={() => handleSendAlert(recommendation)}
								disabled={isProcessing}
							>
								{isProcessing ? (
									<Ionicons name="hourglass" size={16} color="white" />
								) : (
									<Ionicons name="send" size={16} color="white" />
								)}
								<Text
									style={[
										styles.actionButtonText,
										styles.actionButtonTextPrimary,
									]}
								>
									Envoyer
								</Text>
							</TouchableOpacity>
						</View>
					</View>
				)}
			</Animated.View>
		);
	};

	// ─────────────── Group Header ───────────────
	const GroupHeader = ({ group, itemCount }) => (
		<View style={styles.groupHeader}>
			<View style={styles.groupHeaderLeft}>
				<View style={[styles.groupIcon, { backgroundColor: group.color }]}>
					<Ionicons name={group.icon} size={16} color="white" />
				</View>
				<Text style={styles.groupTitle}>{group.label}</Text>
				<View style={[styles.countBadge, { backgroundColor: group.color }]}>
					<Text style={styles.countText}>{itemCount}</Text>
				</View>
			</View>
		</View>
	);

	// ─────────────── Loading State ───────────────
	if (loading) {
		return (
			<Animated.View style={[styles.container, animatedStyle]}>
				<LinearGradient
					colors={["#F3F4F6", "#E5E7EB"]}
					style={styles.loadingContainer}
				>
					<View style={styles.loadingHeader}>
						<View style={styles.loadingTitle} />
					</View>
					{Array.from({ length: 3 }).map((_, index) => (
						<View key={index} style={styles.loadingItem} />
					))}
				</LinearGradient>
			</Animated.View>
		);
	}

	// ─────────────── Empty State ───────────────
	if (!recommendations || recommendations.length === 0) {
		return (
			<Animated.View style={[styles.container, animatedStyle]}>
				<LinearGradient
					colors={["#FFFFFF", "#F8FAFC"]}
					style={styles.emptyContainer}
				>
					<Ionicons name="bulb-outline" size={40} color="#D1D5DB" />
					<Text style={styles.emptyText}>Aucune recommandation</Text>
					<Text style={styles.emptySubtext}>Votre équipe performe bien!</Text>
				</LinearGradient>
			</Animated.View>
		);
	}

	// ─────────────── Rendu Principal ───────────────
	return (
		<Animated.View style={[styles.container, animatedStyle]}>
			<LinearGradient colors={["#FFFFFF", "#F8FAFC"]} style={styles.gradient}>
				{/* Header */}
				<View style={styles.header}>
					<Text style={styles.title}>💡 Recommandations</Text>
					<Text style={styles.subtitle}>
						{recommendations.length} suggestion
						{recommendations.length > 1 ? "s" : ""}
					</Text>
				</View>

				{/* Grouped Recommendations */}
				<ScrollView showsVerticalScrollIndicator={false}>
					{groupedRecommendations.map(([categoryKey, group]) => (
						<View key={categoryKey} style={styles.group}>
							<GroupHeader group={group} itemCount={group.items.length} />

							{group.items.map((recommendation) => (
								<RecommendationItem
									key={recommendation.id}
									recommendation={recommendation}
									groupColor={group.color}
								/>
							))}
						</View>
					))}
				</ScrollView>
			</LinearGradient>
		</Animated.View>
	);
};

// ─────────────── Styles ───────────────
const styles = StyleSheet.create({
	container: {
		marginBottom: 16,
	},
	gradient: {
		borderRadius: 16,
		padding: 16,
		maxHeight: 500,
		// Shadow
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 6,
		elevation: 4,
		borderWidth: 1,
		borderColor: "rgba(0,0,0,0.05)",
	},

	// Header
	header: {
		marginBottom: 16,
	},
	title: {
		fontSize: 16,
		fontWeight: "600",
		color: "#1F2937",
		marginBottom: 4,
	},
	subtitle: {
		fontSize: 12,
		color: "#6B7280",
	},

	// Groups
	group: {
		marginBottom: 16,
	},
	groupHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 8,
	},
	groupHeaderLeft: {
		flexDirection: "row",
		alignItems: "center",
	},
	groupIcon: {
		width: 24,
		height: 24,
		borderRadius: 12,
		justifyContent: "center",
		alignItems: "center",
		marginRight: 8,
	},
	groupTitle: {
		fontSize: 14,
		fontWeight: "500",
		color: "#1F2937",
	},
	countBadge: {
		marginLeft: 8,
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 8,
	},
	countText: {
		fontSize: 10,
		fontWeight: "600",
		color: "white",
	},

	// Recommendations
	recommendationItem: {
		backgroundColor: "#FFFFFF",
		borderRadius: 12,
		marginBottom: 8,
		borderWidth: 1,
		borderColor: "rgba(0,0,0,0.05)",
	},
	recommendationHeader: {
		flexDirection: "row",
		alignItems: "center",
		padding: 12,
	},
	recommendationLeft: {
		flexDirection: "row",
		alignItems: "center",
		flex: 1,
	},
	priorityBadge: {
		width: 20,
		height: 20,
		borderRadius: 10,
		justifyContent: "center",
		alignItems: "center",
		marginRight: 12,
	},
	recommendationInfo: {
		flex: 1,
	},
	recommendationTitle: {
		fontSize: 14,
		fontWeight: "500",
		color: "#1F2937",
		marginBottom: 2,
	},
	recommendationServer: {
		fontSize: 12,
		color: "#6B7280",
	},
	recommendationRight: {
		marginLeft: 8,
	},

	// Expanded content
	recommendationContent: {
		padding: 12,
		paddingTop: 0,
		borderTopWidth: 1,
		borderTopColor: "#F3F4F6",
	},
	recommendationDescription: {
		fontSize: 13,
		color: "#4B5563",
		marginBottom: 12,
		lineHeight: 18,
	},

	// Metrics
	metricsContainer: {
		backgroundColor: "#F9FAFB",
		borderRadius: 8,
		padding: 8,
		marginBottom: 12,
	},
	metricItem: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginBottom: 4,
	},
	metricLabel: {
		fontSize: 12,
		color: "#6B7280",
		textTransform: "capitalize",
	},
	metricValue: {
		fontSize: 12,
		fontWeight: "500",
		color: "#1F2937",
	},

	// Actions suggested
	actionsContainer: {
		marginBottom: 12,
	},
	actionsTitle: {
		fontSize: 12,
		fontWeight: "500",
		color: "#1F2937",
		marginBottom: 6,
	},
	actionItem: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 4,
	},
	actionText: {
		fontSize: 12,
		color: "#4B5563",
		marginLeft: 8,
		flex: 1,
	},

	// Action buttons
	recommendationActions: {
		flexDirection: "row",
		gap: 8,
	},
	actionButton: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderRadius: 8,
	},
	actionButtonSecondary: {
		backgroundColor: "#F3F4F6",
		borderWidth: 1,
		borderColor: "#E5E7EB",
	},
	actionButtonPrimary: {
		// backgroundColor sera défini dynamiquement
	},
	actionButtonText: {
		fontSize: 12,
		fontWeight: "500",
		marginLeft: 4,
	},
	actionButtonTextSecondary: {
		color: "#6B7280",
	},
	actionButtonTextPrimary: {
		color: "#FFFFFF",
	},

	// Loading
	loadingContainer: {
		borderRadius: 16,
		padding: 16,
		opacity: 0.6,
	},
	loadingHeader: {
		marginBottom: 16,
	},
	loadingTitle: {
		width: "50%",
		height: 16,
		backgroundColor: "rgba(255, 255, 255, 0.7)",
		borderRadius: 8,
	},
	loadingItem: {
		height: 60,
		backgroundColor: "rgba(255, 255, 255, 0.5)",
		borderRadius: 12,
		marginBottom: 8,
	},

	// Empty
	emptyContainer: {
		borderRadius: 16,
		padding: 32,
		alignItems: "center",
		justifyContent: "center",
	},
	emptyText: {
		fontSize: 14,
		fontWeight: "500",
		color: "#6B7280",
		marginTop: 12,
	},
	emptySubtext: {
		fontSize: 12,
		color: "#9CA3AF",
		marginTop: 4,
	},
});

export default React.memo(RecommendationsPanel);
