/**
 * 🛠️ Hook useFeatures - Vérification des fonctionnalités premium (Frontend Admin)
 *
 * Permet de vérifier si un restaurant a accès aux fonctionnalités payantes
 */

import { useState, useEffect, useCallback } from "react";
import { fetchWithAuth } from "../utils/tokenManager";
import { getRestaurantId } from "../utils/getRestaurantId";

// Configuration des fonctionnalités
const FEATURES_LIST = [
	"accounting",
	"feedback",
	"messaging",
	"tableAssistant",
	"analytics",
	"advancedNotifications",
	"customization",
];

export const useFeatures = () => {
	const [features, setFeatures] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [restaurantId, setRestaurantId] = useState(null);

	// Charger les fonctionnalités du restaurant
	const loadFeatures = useCallback(async () => {
		if (!restaurantId) {
			setLoading(false);
			return;
		}

		try {
			setLoading(true);
			setError(null);

			const API_URL =
				process.env.EXPO_PUBLIC_API_URL ||
				"https://orderit-backend-6y1m.onrender.com";

			const response = await fetchWithAuth(
				`${API_URL}/api/developer/features/${restaurantId}`,
			);

			if (response.ok) {
				const data = await response.json();

				setFeatures(data.data.features || {});
			} else {
				// Si pas de fonctionnalités configurées, toutes désactivées par défaut
				const defaultFeatures = {};
				FEATURES_LIST.forEach((feature) => {
					defaultFeatures[feature] = { enabled: false, activatedAt: null };
				});
				setFeatures(defaultFeatures);
			}
		} catch (err) {
			setError(err.message);

			// Fallback : toutes les fonctionnalités désactivées
			const fallbackFeatures = {};
			FEATURES_LIST.forEach((feature) => {
				fallbackFeatures[feature] = { enabled: false, activatedAt: null };
			});
			setFeatures(fallbackFeatures);
		} finally {
			setLoading(false);
		}
	}, [restaurantId]);

	// Charger au montage et quand le restaurant change
	useEffect(() => {
		const initRestaurantId = async () => {
			const id = await getRestaurantId();
			setRestaurantId(id);
		};
		initRestaurantId();
	}, []);

	useEffect(() => {
		if (restaurantId) {
			loadFeatures();
		}
	}, [loadFeatures, restaurantId]);

	// Vérifier si une fonctionnalité est activée
	const hasFeature = useCallback(
		(featureName) => {
			return features?.[featureName]?.enabled === true;
		},
		[features],
	);

	// Vérifier plusieurs fonctionnalités (toutes requises)
	const hasFeatures = useCallback(
		(featureNames) => {
			return featureNames.every((featureName) => hasFeature(featureName));
		},
		[hasFeature],
	);

	// Obtenir la date d'activation d'une fonctionnalité
	const getFeatureActivationDate = useCallback(
		(featureName) => {
			return features?.[featureName]?.activatedAt;
		},
		[features],
	);

	// Obtenir la liste des fonctionnalités activées
	const getEnabledFeatures = useCallback(() => {
		if (!features) return [];
		return FEATURES_LIST.filter((feature) => hasFeature(feature));
	}, [features, hasFeature]);

	// Obtenir le nombre de fonctionnalités activées
	const getEnabledFeaturesCount = useCallback(() => {
		return getEnabledFeatures().length;
	}, [getEnabledFeatures]);

	// Vérifier si le restaurant a des fonctionnalités premium
	const hasPremiumFeatures = useCallback(() => {
		return getEnabledFeaturesCount() > 0;
	}, [getEnabledFeaturesCount]);

	return {
		// État
		features,
		loading,
		error,

		// Méthodes de vérification
		hasFeature,
		hasFeatures,
		getFeatureActivationDate,
		getEnabledFeatures,
		getEnabledFeaturesCount,
		hasPremiumFeatures,

		// Méthodes utilitaires
		reload: loadFeatures,

		// Shortcuts pour les fonctionnalités courantes
		hasAccounting: hasFeature("accounting"),
		hasFeedback: hasFeature("feedback"),
		hasMessaging: hasFeature("messaging"),
		hasTableAssistant: hasFeature("tableAssistant"),
		hasAnalytics: hasFeature("analytics"),
		hasAdvancedNotifications: hasFeature("advancedNotifications"),
		hasCustomization: hasFeature("customization"),
	};
};
