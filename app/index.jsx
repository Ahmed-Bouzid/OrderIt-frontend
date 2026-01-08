import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { getValidToken } from "../utils/tokenManager";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { clearAllUserData } from "../utils/storageHelper";

export default function Index() {
	const router = useRouter();
	const [checking, setChecking] = useState(true);

	useEffect(() => {
		let mounted = true;
		(async () => {
			try {
				// ✅ Récupérer les données depuis AsyncStorage
				const [token, userRole, restaurantId] = await Promise.all([
					AsyncStorage.getItem("@access_token"),
					AsyncStorage.getItem("userRole"),
					AsyncStorage.getItem("restaurantId"),
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
						// 🧹 Nettoyer TOUTES les données (AsyncStorage + UserStore)
						await clearAllUserData();
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
