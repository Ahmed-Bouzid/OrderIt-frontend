import React, { useState, useRef, useEffect } from "react";
import { API_CONFIG } from "../src/config/apiConfig";
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	Alert,
	ActivityIndicator,
	StyleSheet,
	Animated,
	Easing,
	KeyboardAvoidingView,
	Platform,
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
	const [showPassword, setShowPassword] = useState(false);
	const { setRestaurantId } = useRestaurantStore();
	const setUser = useUserStore((state) => state.setUser);

	// Animation glow pulsant
	const glowAnim = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		Animated.loop(
			Animated.sequence([
				Animated.timing(glowAnim, {
					toValue: 1,
					duration: 1500,
					easing: Easing.inOut(Easing.ease),
					useNativeDriver: false,
				}),
				Animated.timing(glowAnim, {
					toValue: 0,
					duration: 1500,
					easing: Easing.inOut(Easing.ease),
					useNativeDriver: false,
				}),
			])
		).start();
	}, [glowAnim]);

	const handleForgotPassword = () => {
		Alert.prompt(
			"Réinitialiser le mot de passe",
			"Entrez votre email",
			async (emailInput) => {
				if (!emailInput) return;
				try {
					const res = await fetch(
						`${API_CONFIG.baseURL}/auth/forgot-password`,
						{
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({ email: emailInput }),
						}
					);
					const data = await res.json();
					if (res.ok) {
						Alert.alert("Succès", "Un email de réinitialisation a été envoyé.");
					} else {
						Alert.alert("Erreur", data.message || "Une erreur est survenue");
					}
				} catch {
					Alert.alert("Erreur", "Impossible de contacter le serveur");
				}
			},
			"plain-text"
		);
	};

	const handleLogin = async () => {
		setLoading(true);

		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 15000); // ✅ 15s timeout

		try {
			const res = await fetch(`${API_CONFIG.baseURL}/auth/login`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, password }),
				signal: controller.signal,
			});

			clearTimeout(timeoutId);

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
					// Nettoyer l'ancien restaurantId (important pour mode développeur)
					await AsyncStorage.removeItem("restaurantId");
				} else {
					await AsyncStorage.setItem("restaurantId", restaurantId);
					setRestaurantId(restaurantId); // 🔹 assignation immédiate dans le store
				}

				// ✅ Stocker serverId et tableId si présents (serveur uniquement)
				if (data.serverId) {
					await AsyncStorage.setItem("serverId", data.serverId);
					console.log("✅ serverId sauvegardé:", data.serverId);
				} else {
					await AsyncStorage.removeItem("serverId");
				}

				if (data.tableId) {
					await AsyncStorage.setItem("tableId", data.tableId);
					console.log("✅ tableId sauvegardé:", data.tableId);
				} else {
					await AsyncStorage.removeItem("tableId");
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
				router.replace("/");
			} else {
				Alert.alert("Erreur", data.message || "Identifiants invalides");
			}
		} catch (err) {
		clearTimeout(timeoutId);

		if (err.name === "AbortError") {
			Alert.alert(
				"Erreur",
				"Le serveur ne répond pas (timeout). Réessayez."
			);
		} else {
			Alert.alert("Erreur", "Impossible de contacter le serveur");
		}
		console.error(err);
	} finally {
		setLoading(false);
	}
};

const glowInterpolation = glowAnim.interpolate({	inputRange: [0, 1],
	outputRange: ["rgba(255,120,0,0.3)", "rgba(255,200,0,0.7)"],
});

return (
	<KeyboardAvoidingView			style={styles.container}
			behavior={Platform.OS === "ios" ? "padding" : undefined}
		>
			<View style={styles.card}>
				{/* Logo */}
				<View style={styles.logo}>
					<Text style={styles.logoText}>O</Text>
				</View>

				{/* Titre et sous-titre */}
				<Text style={styles.title}>Welcome Back</Text>
				<Text style={styles.subtitle}>Sign in to continue to OrderIt</Text>

				{/* Formulaire */}
				<View style={styles.form}>
					{/* Email */}
					<View style={styles.inputWrapper}>
						<TextInput
							placeholder="Email"
							placeholderTextColor="#aaa"
							style={styles.input}
							value={email}
							onChangeText={setEmail}
							keyboardType="email-address"
							autoCapitalize="none"
						/>
					</View>

					{/* Password */}
					<View style={styles.inputWrapper}>
						<TextInput
							placeholder="Password"
							placeholderTextColor="#aaa"
							style={styles.input}
							value={password}
							onChangeText={setPassword}
							secureTextEntry={!showPassword}
						/>
						<TouchableOpacity
							style={styles.eyeButton}
							onPress={() => setShowPassword(!showPassword)}
						>
							<Text style={styles.eyeIcon}>{showPassword ? "👁️" : "🙈"}</Text>
						</TouchableOpacity>
					</View>

					{/* Forgot password */}
					<TouchableOpacity onPress={handleForgotPassword}>
						<Text style={styles.forgot}>Forgot password?</Text>
					</TouchableOpacity>

					{/* Sign In Button */}
					<TouchableOpacity
						style={styles.signInButton}
						onPress={handleLogin}
						disabled={loading}
					>
						<Animated.View
							style={[styles.glow, { backgroundColor: glowInterpolation }]}
						/>
						<Text style={styles.signInText}>
							{loading ? "Loading..." : "Sign In"}
						</Text>
					</TouchableOpacity>
				</View>
			</View>
		</KeyboardAvoidingView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#083db0ff",
		justifyContent: "center",
		alignItems: "center",
	},
	card: {
		width: "90%",
		maxWidth: 400,
		backgroundColor: "rgba(255, 255, 255, 0.95)",
		borderRadius: 24,
		padding: 32,
		alignItems: "center",
		shadowColor: "#ff7800",
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.3,
		shadowRadius: 20,
		elevation: 10,
	},
	logo: {
		width: 70,
		height: 70,
		borderRadius: 35,
		backgroundColor: "#4e56efff",
		justifyContent: "center",
		alignItems: "center",
		marginBottom: 20,
		shadowColor: "#002fa7ff",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.6,
		shadowRadius: 12,
		elevation: 8,
	},
	logoText: {
		fontSize: 36,
		fontWeight: "bold",
		color: "#fff",
	},
	title: {
		fontSize: 28,
		fontWeight: "bold",
		color: "#000000ff",
		marginBottom: 8,
	},
	subtitle: {
		fontSize: 14,
		color: "#bbb",
		marginBottom: 30,
	},
	form: {
		width: "100%",
	},
	inputWrapper: {
		position: "relative",
		marginBottom: 16,
	},
	input: {
		width: "100%",
		height: 50,
		borderRadius: 12,
		backgroundColor: "rgba(255,255,255,0.08)",
		paddingLeft: 16,
		paddingRight: 50,
		color: "#000000ff",
		fontSize: 15,
		borderWidth: 1,
		borderColor: "rgba(255,120,0,0.2)",
	},
	eyeButton: {
		position: "absolute",
		right: 15,
		top: 15,
	},
	eyeIcon: {
		fontSize: 20,
	},
	forgot: {
		alignSelf: "flex-end",
		color: "#4e56efff",
		marginBottom: 24,
		fontSize: 13,
		fontWeight: "600",
	},
	signInButton: {
		height: 52,
		borderRadius: 14,
		backgroundColor: "#4e56efff",
		justifyContent: "center",
		alignItems: "center",
		overflow: "hidden",
		shadowColor: "#4e56efff",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.5,
		shadowRadius: 10,
		elevation: 8,
	},
	signInText: {
		color: "#fff",
		fontWeight: "bold",
		fontSize: 17,
		zIndex: 10,
	},
	glow: {
		...StyleSheet.absoluteFillObject,
		opacity: 0.6,
		borderRadius: 14,
	},
});
