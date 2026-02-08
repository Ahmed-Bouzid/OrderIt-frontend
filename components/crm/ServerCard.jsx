/**
 * 👥 ServerCard - Composant pour afficher les performances d'un serveur
 * Card avec photo, métriques, status et actions de coaching
 */

import React, { useMemo, useState } from "react";
import { View, Text, TouchableOpacity, Image, Alert, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	withSpring,
	withTiming,
} from "react-native-reanimated";

const ServerCard = ({
	server,
	onPress = null,
	onCoachingPress = null,
	onContactPress = null,
	showActions = true,
	compact = false,
	animationDelay = 0,
}) => {
	const [imageError, setImageError] = useState(false);

	// ─────────────── Animations ───────────────
	const scale = useSharedValue(0.9);
	const opacity = useSharedValue(0);

	const animatedStyle = useAnimatedStyle(() => {
		return {
			transform: [{ scale: scale.value }],
			opacity: opacity.value,
		};
	});

	React.useEffect(() => {
		scale.value = withSpring(1, {
			damping: 15,
			stiffness: 100,
			delay: animationDelay,
		});
		opacity.value = withTiming(1, {
			duration: 500,
			delay: animationDelay,
		});
	}, [animationDelay, scale, opacity]);

	// ─────────────── Données calculées ───────────────
	const performanceData = useMemo(() => {
		if (!server) return null;

		const {
			totalOrders = 0,
			totalRevenue = 0,
			averageServiceTime = 0,
			customerRating = 0,
			upsellRate = 0,
			performanceScore = 0,
		} = server;

		// Score de performance avec couleur
		let scoreColor = "#EF4444"; // Rouge
		if (performanceScore >= 80)
			scoreColor = "#10B981"; // Vert
		else if (performanceScore >= 60) scoreColor = "#F59E0B"; // Orange

		// Status basé sur les métriques récentes
		let status = "offline";
		let statusColor = "#6B7280";

		if (server.isOnline) {
			if (performanceScore >= 80) {
				status = "excellent";
				statusColor = "#10B981";
			} else if (performanceScore >= 60) {
				status = "good";
				statusColor = "#F59E0B";
			} else {
				status = "needs-coaching";
				statusColor = "#EF4444";
			}
		}

		return {
			totalOrders,
			totalRevenue,
			averageServiceTime,
			customerRating,
			upsellRate,
			performanceScore,
			scoreColor,
			status,
			statusColor,
		};
	}, [server]);

	// ─────────────── Format helpers ───────────────
	const formatTime = (minutes) => {
		if (minutes < 60) return `${Math.round(minutes)}min`;
		const hours = Math.floor(minutes / 60);
		const mins = Math.round(minutes % 60);
		return `${hours}h${mins.toString().padStart(2, "0")}`;
	};

	const formatRevenue = (amount) => {
		if (amount >= 1000) return `${(amount / 1000).toFixed(1)}k€`;
		return `${Math.round(amount)}€`;
	};

	// ─────────────── Status Badge ───────────────
	const renderStatusBadge = () => {
		const statusLabels = {
			offline: "Hors ligne",
			excellent: "Excellent",
			good: "Bon",
			"needs-coaching": "À coacher",
		};

		const statusIcons = {
			offline: "radio-button-off",
			excellent: "checkmark-circle",
			good: "thumbs-up",
			"needs-coaching": "alert-circle",
		};

		return (
			<View
				style={[
					styles.statusBadge,
					{ backgroundColor: performanceData.statusColor },
				]}
			>
				<Ionicons
					name={statusIcons[performanceData.status]}
					size={12}
					color="white"
				/>
				<Text style={styles.statusText}>
					{statusLabels[performanceData.status]}
				</Text>
			</View>
		);
	};

	// ─────────────── Avatar ───────────────
	const renderAvatar = () => {
		const avatarUri = server?.avatar || server?.profileImage;

		if (avatarUri && !imageError) {
			return (
				<Image
					source={{ uri: avatarUri }}
					style={styles.avatar}
					onError={() => setImageError(true)}
				/>
			);
		}

		// Fallback avec initiales
		const initials =
			server?.name
				?.split(" ")
				.map((word) => word[0])
				.join("")
				.toUpperCase()
				.substr(0, 2) || "??";

		return (
			<View style={[styles.avatar, styles.avatarFallback]}>
				<Text style={styles.avatarText}>{initials}</Text>
			</View>
		);
	};

	// ─────────────── Actions ───────────────
	const handleCoachingPress = () => {
		if (onCoachingPress) {
			onCoachingPress(server);
		} else {
			Alert.alert(
				"Coaching",
				`Ouvrir les suggestions de coaching pour ${server?.name}?`,
				[
					{ text: "Annuler", style: "cancel" },
					{ text: "Ouvrir", onPress: () => {} },
				],
			);
		}
	};

	const handleContactPress = () => {
		if (onContactPress) {
			onContactPress(server);
		} else {
			Alert.alert("Contact", `Contacter ${server?.name}?`, [
				{ text: "Annuler", style: "cancel" },
				{ text: "Message", onPress: () => {} },
			]);
		}
	};

	// ─────────────── Compact Mode ───────────────
	if (compact) {
		return (
			<Animated.View style={[styles.compactContainer, animatedStyle]}>
				<TouchableOpacity
					activeOpacity={0.8}
					onPress={onPress}
					style={styles.compactTouchable}
				>
					<LinearGradient
						colors={["#FFFFFF", "#F9FAFB"]}
						style={styles.compactGradient}
					>
						{renderAvatar()}
						<View style={styles.compactInfo}>
							<Text style={styles.compactName}>{server?.name}</Text>
							<Text style={styles.compactScore}>
								{performanceData?.performanceScore || 0}%
							</Text>
						</View>
						{renderStatusBadge()}
					</LinearGradient>
				</TouchableOpacity>
			</Animated.View>
		);
	}

	// ─────────────── Rendu Principal ───────────────
	const CardContent = () => (
		<LinearGradient colors={["#FFFFFF", "#F8FAFC"]} style={styles.gradient}>
			{/* Header avec avatar et status */}
			<View style={styles.header}>
				{renderAvatar()}
				<View style={styles.headerInfo}>
					<Text style={styles.name}>{server?.name || "Serveur"}</Text>
					<Text style={styles.role}>{server?.role || "Serveur"}</Text>
				</View>
				{renderStatusBadge()}
			</View>

			{/* Score de performance */}
			<View style={styles.scoreContainer}>
				<Text style={styles.scoreLabel}>Performance</Text>
				<View style={styles.scoreBar}>
					<View
						style={[
							styles.scoreProgress,
							{
								width: `${performanceData?.performanceScore || 0}%`,
								backgroundColor: performanceData?.scoreColor,
							},
						]}
					/>
				</View>
				<Text
					style={[styles.scoreValue, { color: performanceData?.scoreColor }]}
				>
					{performanceData?.performanceScore || 0}%
				</Text>
			</View>

			{/* Métriques */}
			<View style={styles.metricsContainer}>
				<View style={styles.metric}>
					<Ionicons name="restaurant" size={16} color="#6B7280" />
					<Text style={styles.metricLabel}>Commandes</Text>
					<Text style={styles.metricValue}>
						{performanceData?.totalOrders || 0}
					</Text>
				</View>

				<View style={styles.metric}>
					<Ionicons name="cash" size={16} color="#6B7280" />
					<Text style={styles.metricLabel}>CA</Text>
					<Text style={styles.metricValue}>
						{formatRevenue(performanceData?.totalRevenue || 0)}
					</Text>
				</View>

				<View style={styles.metric}>
					<Ionicons name="time" size={16} color="#6B7280" />
					<Text style={styles.metricLabel}>Temps</Text>
					<Text style={styles.metricValue}>
						{formatTime(performanceData?.averageServiceTime || 0)}
					</Text>
				</View>

				<View style={styles.metric}>
					<Ionicons name="star" size={16} color="#6B7280" />
					<Text style={styles.metricLabel}>Note</Text>
					<Text style={styles.metricValue}>
						{(performanceData?.customerRating || 0).toFixed(1)}
					</Text>
				</View>
			</View>

			{/* Actions */}
			{showActions && (
				<View style={styles.actions}>
					<TouchableOpacity
						style={styles.actionButton}
						onPress={handleContactPress}
					>
						<Ionicons name="chatbubble" size={16} color="#3B82F6" />
						<Text style={styles.actionText}>Message</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={[styles.actionButton, styles.actionButtonPrimary]}
						onPress={handleCoachingPress}
					>
						<Ionicons name="school" size={16} color="white" />
						<Text style={[styles.actionText, styles.actionTextPrimary]}>
							Coaching
						</Text>
					</TouchableOpacity>
				</View>
			)}
		</LinearGradient>
	);

	if (onPress) {
		return (
			<Animated.View style={[styles.container, animatedStyle]}>
				<TouchableOpacity
					activeOpacity={0.8}
					onPress={onPress}
					style={styles.touchable}
				>
					<CardContent />
				</TouchableOpacity>
			</Animated.View>
		);
	}

	return (
		<Animated.View style={[styles.container, animatedStyle]}>
			<CardContent />
		</Animated.View>
	);
};

// ─────────────── Styles ───────────────
const styles = StyleSheet.create({
	// Main container
	container: {
		backgroundColor: "transparent",
		marginBottom: 12,
	},
	touchable: {
		flex: 1,
	},
	gradient: {
		borderRadius: 16,
		padding: 16,
		// Shadow iOS
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		// Shadow Android
		elevation: 3,
		borderWidth: 1,
		borderColor: "rgba(0,0,0,0.05)",
	},

	// Header
	header: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 16,
	},
	avatar: {
		width: 50,
		height: 50,
		borderRadius: 25,
		marginRight: 12,
	},
	avatarFallback: {
		backgroundColor: "#F59E0B",
		justifyContent: "center",
		alignItems: "center",
	},
	avatarText: {
		color: "white",
		fontWeight: "600",
		fontSize: 16,
	},
	headerInfo: {
		flex: 1,
	},
	name: {
		fontSize: 16,
		fontWeight: "600",
		color: "#1F2937",
		marginBottom: 2,
	},
	role: {
		fontSize: 12,
		color: "#6B7280",
		textTransform: "capitalize",
	},

	// Status badge
	statusBadge: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 12,
	},
	statusText: {
		color: "white",
		fontSize: 10,
		fontWeight: "600",
		marginLeft: 4,
	},

	// Score
	scoreContainer: {
		marginBottom: 16,
	},
	scoreLabel: {
		fontSize: 12,
		color: "#6B7280",
		marginBottom: 4,
	},
	scoreBar: {
		height: 6,
		backgroundColor: "#E5E7EB",
		borderRadius: 3,
		overflow: "hidden",
		marginBottom: 4,
	},
	scoreProgress: {
		height: "100%",
		borderRadius: 3,
	},
	scoreValue: {
		fontSize: 12,
		fontWeight: "600",
		textAlign: "right",
	},

	// Métriques
	metricsContainer: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginBottom: 16,
	},
	metric: {
		alignItems: "center",
		flex: 1,
	},
	metricLabel: {
		fontSize: 10,
		color: "#6B7280",
		marginTop: 2,
		marginBottom: 2,
	},
	metricValue: {
		fontSize: 12,
		fontWeight: "600",
		color: "#1F2937",
	},

	// Actions
	actions: {
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
		backgroundColor: "#F3F4F6",
		borderWidth: 1,
		borderColor: "#E5E7EB",
	},
	actionButtonPrimary: {
		backgroundColor: "#F59E0B",
		borderColor: "#F59E0B",
	},
	actionText: {
		fontSize: 12,
		fontWeight: "500",
		color: "#6B7280",
		marginLeft: 4,
	},
	actionTextPrimary: {
		color: "white",
	},

	// Compact mode
	compactContainer: {
		marginBottom: 8,
	},
	compactTouchable: {
		flex: 1,
	},
	compactGradient: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: "rgba(0,0,0,0.05)",
	},
	compactInfo: {
		flex: 1,
		marginLeft: 8,
	},
	compactName: {
		fontSize: 14,
		fontWeight: "500",
		color: "#1F2937",
	},
	compactScore: {
		fontSize: 12,
		color: "#6B7280",
	},
});

export default React.memo(ServerCard);
