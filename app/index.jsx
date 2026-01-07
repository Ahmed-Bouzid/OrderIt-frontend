import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { getValidToken } from "../utils/tokenManager";
import {
	getSecureItem,
	deleteSecureItem,
	SECURE_KEYS,
} from "../utils/secureStorage";

export default function Index() {
	const router = useRouter();
	const [checking, setChecking] = useState(true);

	useEffect(() => {
		let mounted = true;
		(async () => {
			try {
				// ✅ Récupérer les données depuis SecureStore (chiffré)
				const [token, userRole, restaurantId] = await Promise.all([
					getSecureItem(SECURE_KEYS.ACCESS_TOKEN),
					getSecureItem(SECURE_KEYS.USER_ROLE),
					getSecureItem(SECURE_KEYS.RESTAURANT_ID),
				]);

				if (!mounted) return;

				if (token) {
					// ⭐ Valider que le token est encore valide (refresh auto si besoin)
					try {
						await getValidToken();
						console.log("✅ Token valide, redirection...");
					} catch (error) {
						// Token invalide/expiré et refresh échoué → forcer login
						console.error(
							"❌ Token invalide, redirection login:",
							error.message
						);
						// ✅ Nettoyer SecureStore au lieu d'AsyncStorage
						await Promise.all([
							deleteSecureItem(SECURE_KEYS.ACCESS_TOKEN),
							deleteSecureItem(SECURE_KEYS.REFRESH_TOKEN),
							deleteSecureItem(SECURE_KEYS.RESTAURANT_ID),
							deleteSecureItem(SECURE_KEYS.USER_ROLE),
							deleteSecureItem(SECURE_KEYS.SERVER_ID),
							deleteSecureItem(SECURE_KEYS.TABLE_ID),
						]);
						router.replace("/login");
						return;
					}

					// ⭐ Si développeur sans restaurant sélectionné → developer-selector
					if (userRole === "developer" && !restaurantId) {
						router.replace("/developer-selector");
					} else {
						// Redirige vers l'onglet Activité
						router.replace("/tabs/activity");
					}
				} else {
					router.replace("/login");
				}
			} catch (e) {
				console.error("❌ Erreur index routing:", e);
				router.replace("/login");
			} finally {
				if (mounted) setChecking(false);
			}
		})();

		return () => {
			mounted = false;
		};
	}, [router]);

	if (checking) {
		return (
			<View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
				<ActivityIndicator size="large" />
			</View>
		);
	}

	return null;
}
