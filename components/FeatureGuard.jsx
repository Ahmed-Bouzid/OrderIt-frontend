/**
 * 🛡️ FeatureGuard - Protection des fonctionnalités premium (Frontend Admin)
 *
 * Composant pour protéger l'accès aux fonctionnalités payantes dans l'interface admin
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFeatureLevel } from "../src/stores/useFeatureLevelStore";

/**
 * Mapping des anciens noms API vers les clés du store useFeatureLevelStore.
 * Les noms non mappés passent directement (ex: "comptabilite" ajouté via override).
 */
const FEATURE_NAME_MAP = {
	analytics: "statistiques",
	accounting: "comptabilite",
	messaging: "chat_client",
	tableAssistant: "auto_tables",
	// null = pas d'équivalent dans le store → accès autorisé par défaut
	feedback: null,
	advancedNotifications: null,
	customization: null,
};

/**
 * Guard générique pour protéger une fonctionnalité
 */
export const FeatureGuard = ({
	featureName,
	children,
	fallback = null,
	showUpgradeMessage = true,
}) => {
	const { isInitialized, hasFeature } = useFeatureLevel();

	// Pendant l'initialisation du store
	if (!isInitialized) {
		return fallback || <FeatureLoadingSkeleton />;
	}

	// Résoudre le nom de feature dans le store
	const mappedKey = Object.prototype.hasOwnProperty.call(
		FEATURE_NAME_MAP,
		featureName,
	)
		? FEATURE_NAME_MAP[featureName]
		: featureName;

	// Pas d'équivalent store → accès autorisé par défaut
	if (mappedKey === null) {
		return children;
	}

	// Si la fonctionnalité est activée, afficher le contenu
	if (hasFeature(mappedKey)) {
		return children;
	}

	// Si pas d'accès, afficher le message d'upgrade ou le fallback
	if (showUpgradeMessage) {
		return <UpgradeMessage featureName={featureName} />;
	}

	return fallback;
};

/**
 * Guard spécifique pour la comptabilité
 */
export const AccountingGuard = ({ children, fallback = null }) => {
	return (
		<FeatureGuard featureName="accounting" fallback={fallback}>
			{children}
		</FeatureGuard>
	);
};

/**
 * Guard spécifique pour le feedback
 */
export const FeedbackGuard = ({ children, fallback = null }) => {
	return (
		<FeatureGuard featureName="feedback" fallback={fallback}>
			{children}
		</FeatureGuard>
	);
};

/**
 * Guard spécifique pour la messagerie
 */
export const MessagingGuard = ({ children, fallback = null }) => {
	return (
		<FeatureGuard featureName="messaging" fallback={fallback}>
			{children}
		</FeatureGuard>
	);
};

/**
 * Guard spécifique pour l'assistant de tables
 */
export const TableAssistantGuard = ({ children, fallback = null }) => {
	return (
		<FeatureGuard featureName="tableAssistant" fallback={fallback}>
			{children}
		</FeatureGuard>
	);
};

/**
 * Guard spécifique pour les analytics
 */
export const AnalyticsGuard = ({ children, fallback = null }) => {
	return (
		<FeatureGuard featureName="analytics" fallback={fallback}>
			{children}
		</FeatureGuard>
	);
};

/**
 * Guard spécifique pour les notifications avancées
 */
export const NotificationsGuard = ({ children, fallback = null }) => {
	return (
		<FeatureGuard featureName="advancedNotifications" fallback={fallback}>
			{children}
		</FeatureGuard>
	);
};

/**
 * Guard spécifique pour la personnalisation
 */
export const CustomizationGuard = ({ children, fallback = null }) => {
	return (
		<FeatureGuard featureName="customization" fallback={fallback}>
			{children}
		</FeatureGuard>
	);
};

/**
 * Message d'upgrade pour fonctionnalité premium
 */
const UpgradeMessage = ({ featureName }) => (
	<View style={styles.upgradeContainer}>
		<LinearGradient colors={["#FEF3C7", "#FDE68A"]} style={styles.upgradeCard}>
			<Ionicons name="star" size={24} color="#F59E0B" />
			<Text style={styles.upgradeTitle}>Fonctionnalité Premium</Text>
			<Text style={styles.upgradeText}>
				{getFeatureDisplayName(featureName)} n&apos;est pas activé pour votre
				restaurant.
			</Text>
			<Text style={styles.upgradeHint}>
				Contactez votre développeur pour l&apos;activer.
			</Text>
		</LinearGradient>
	</View>
);

/**
 * Skeleton de chargement
 */
const FeatureLoadingSkeleton = () => (
	<View style={styles.skeletonContainer}>
		<View style={styles.skeletonBox} />
		<View style={styles.skeletonLine} />
		<View style={styles.skeletonLine} />
	</View>
);

/**
 * Obtenir le nom d'affichage d'une fonctionnalité
 */
const getFeatureDisplayName = (featureName) => {
	const names = {
		accounting: "Comptabilité avancée",
		feedback: "Système de feedback",
		messaging: "Messagerie client-serveur",
		tableAssistant: "Assistant de tables",
		analytics: "Analytics avancés",
		advancedNotifications: "Notifications avancées",
		customization: "Personnalisation",
	};
	return names[featureName] || featureName;
};

const styles = StyleSheet.create({
	upgradeContainer: {
		margin: 16,
	},
	upgradeCard: {
		padding: 20,
		borderRadius: 12,
		alignItems: "center",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
	},
	upgradeTitle: {
		fontSize: 18,
		fontWeight: "bold",
		color: "#92400E",
		marginTop: 8,
		marginBottom: 4,
	},
	upgradeText: {
		fontSize: 14,
		color: "#92400E",
		textAlign: "center",
		marginBottom: 8,
	},
	upgradeHint: {
		fontSize: 12,
		color: "#A16207",
		textAlign: "center",
		fontStyle: "italic",
	},
	skeletonContainer: {
		padding: 16,
	},
	skeletonBox: {
		height: 80,
		backgroundColor: "#E5E5E5",
		borderRadius: 8,
		marginBottom: 12,
	},
	skeletonLine: {
		height: 12,
		backgroundColor: "#E5E5E5",
		borderRadius: 6,
		marginBottom: 8,
		width: "80%",
	},
});
