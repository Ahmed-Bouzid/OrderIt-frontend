import React, { useState } from "react";
import { API_CONFIG } from "../src/config/apiConfig";
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	Alert,
	ActivityIndicator,
	StyleSheet,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { create } from "zustand";
import useUserStore from "../src/stores/useUserStore";

// ─────────────── Store restaurant ───────────────
export const useRestaurantStore = create((set) => ({
	restaurantId: null,
	setRestaurantId: (id) => set({ restaurantId: id }),
}));

// ─────────────── Composant Login ───────────────
export default function Login() {
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const { setRestaurantId } = useRestaurantStore();
	const setUser = useUserStore((state) => state.setUser);

	const handleLogin = async () => {
		setLoading(true);
		try {
			const res = await fetch(`${API_CONFIG.baseURL}/auth/login`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, password }),
			});

			// ⭐ Vérifier le content-type avant de parser JSON
			const contentType = res.headers.get("content-type");
			if (!contentType || !contentType.includes("application/json")) {
				console.error(
					"❌ Réponse non-JSON du serveur. Content-Type:",
					contentType
				);
				const bodyText = await res.text();
				console.error("❌ Body brut:", bodyText);
				Alert.alert(
					"Erreur",
					"Erreur serveur - réponse non-JSON. Vérifiez les logs."
				);
				setLoading(false);
				return;
			}

			let data;
			try {
				data = await res.json();
			} catch (parseErr) {
				console.error("❌ Erreur parsing JSON:", parseErr);
				Alert.alert("Erreur", "Impossible de parser la réponse du serveur");
				setLoading(false);
				return;
			}

			console.log("Réponse backend login :", data); // 🔹 debug

			if (res.ok) {
				// ✅ Stocker le token d'accès
				await AsyncStorage.setItem("@access_token", data.accessToken);

				// ✅ Stocker le refresh token (TRÈS IMPORTANT pour la continuité de session)
				if (data.refreshToken) {
					await AsyncStorage.setItem("refreshToken", data.refreshToken);
					console.log("✅ RefreshToken sauvegardé en AsyncStorage");

					// ⭐ Vérifier immédiatement que c'est bien sauvegardé
					const saved = await AsyncStorage.getItem("refreshToken");
					if (saved) {
						console.log(
							"✅✅ Vérification: RefreshToken présent en AsyncStorage"
						);
					} else {
						console.error(
							"❌ ERREUR: RefreshToken n'a pas pu être sauvegardé!"
						);
					}
				} else {
					console.warn("⚠️ ATTENTION: Pas de refreshToken reçu du backend!");
					console.warn("Réponse backend:", data);
				}

				// ✅ Stocker et assigner le restaurantId
				const restaurantId = data.restaurantId;
				if (!restaurantId) {
					console.warn(
						"⚠️ restaurantId non trouvé dans la réponse du backend",
						data
					);
				} else {
					await AsyncStorage.setItem("restaurantId", restaurantId);
					setRestaurantId(restaurantId); // 🔹 assignation immédiate dans le store
				}

				// ✅ Stocker les infos utilisateur (role, userType)
				await setUser({
					userId: data.userId,
					email: data.email,
					role: data.role,
					userType: data.userType,
					restaurantId: restaurantId,
				});
				console.log("✅ User info stocké:", {
					role: data.role,
					userType: data.userType,
				});

				// 🧭 Redirection vers l'écran principal
				router.replace("/tabs/activity");
			} else {
				Alert.alert("Erreur", data.message || "Identifiants invalides");
			}
		} catch (err) {
			console.error(err);
			Alert.alert("Erreur", "Impossible de contacter le server");
		} finally {
			setLoading(false);
		}
	};

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Connexion</Text>
			<TextInput
				placeholder="Email"
				value={email}
				onChangeText={setEmail}
				style={styles.input}
				autoCapitalize="none"
				keyboardType="email-address"
			/>
			<TextInput
				placeholder="Mot de passe"
				value={password}
				onChangeText={setPassword}
				style={styles.input}
				secureTextEntry
			/>
			<TouchableOpacity
				style={styles.button}
				onPress={handleLogin}
				disabled={loading}
			>
				{loading ? (
					<ActivityIndicator color="#fff" />
				) : (
					<Text style={styles.buttonText}>Se connecter</Text>
				)}
			</TouchableOpacity>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: "center",
		padding: 20,
		backgroundColor: "whitesmoke",
	},
	title: { fontSize: 28, marginBottom: 20, textAlign: "center" },
	input: {
		borderWidth: 1,
		borderColor: "#ccc",
		padding: 12,
		marginBottom: 12,
		borderRadius: 8,
		backgroundColor: "#fff",
	},
	button: {
		backgroundColor: "#007AFF",
		padding: 14,
		borderRadius: 8,
		alignItems: "center",
	},
	buttonText: { color: "#fff", fontWeight: "700" },
});
