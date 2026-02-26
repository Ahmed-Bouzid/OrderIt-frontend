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
import {
	setItem as setSecureItem,
	getItem as getSecureItem,
} from "../utils/secureStorage";
import { useRouter } from "expo-router";
import { create } from "zustand";
import useUserStore from "../src/stores/useUserStore";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import * as AuthSession from "expo-auth-session";

WebBrowser.maybeCompleteAuthSession();

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

	// 🔐 Configuration Google OAuth avec scheme natif (pour dev build)
	const redirectUri = AuthSession.makeRedirectUri({
		scheme: "sunnygo",
		useProxy: false,
	});

	console.log("🔐 Redirect URI:", redirectUri);

	const [request, response, promptAsync] = Google.useAuthRequest({
		iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
		androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
		scopes: ["openid", "profile", "email"],
	});

	// Gérer réponse OAuth Google
	useEffect(() => {
		console.log("🔍 OAuth response:", response);
		if (response?.type === "success") {
			console.log("✅ OAuth success! Params:", response.params);
			const { id_token, code } = response.params;
			if (id_token) {
				handleGoogleLogin(id_token);
			} else if (code) {
				handleGoogleLogin(code);
			}
		} else if (response?.type === "error") {
			console.log("❌ OAuth error:", response.error);
		}
	}, [response]);

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
			]),
		).start();
	}, [glowAnim]);

	// 🔐 Forgot Password - Étape 1: Demander l'email
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
						},
					);
					const data = await res.json();
					if (res.ok) {
						// Succès - demander le code
						Alert.alert(
							"📧 Code envoyé",
							"Si cet email existe, un code à 6 chiffres a été envoyé.\n\nVérifiez votre boîte mail (et les spams).",
							[
								{ text: "Annuler", style: "cancel" },
								{
									text: "Entrer le code",
									onPress: () => handleEnterResetCode(emailInput),
								},
							],
						);
					} else {
						Alert.alert("Erreur", data.message || "Une erreur est survenue");
					}
				} catch {
					Alert.alert("Erreur", "Impossible de contacter le serveur");
				}
			},
			"plain-text",
			"",
			"email-address",
		);
	};

	// 🔐 Forgot Password - Étape 2: Entrer le code
	const handleEnterResetCode = (emailForReset) => {
		Alert.prompt(
			"Code de vérification",
			"Entrez le code à 6 chiffres reçu par email",
			async (codeInput) => {
				if (!codeInput || codeInput.length !== 6) {
					Alert.alert("Erreur", "Le code doit contenir 6 chiffres");
					return;
				}
				// Vérifier le code avant de demander le nouveau mot de passe
				try {
					const res = await fetch(
						`${API_CONFIG.baseURL}/auth/verify-reset-token`,
						{
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({ email: emailForReset, token: codeInput }),
						},
					);
					const data = await res.json();
					if (res.ok && data.valid) {
						// Code valide - demander le nouveau mot de passe
						handleEnterNewPassword(emailForReset, codeInput);
					} else {
						Alert.alert(
							"Code invalide",
							data.message || "Code incorrect ou expiré",
						);
					}
				} catch {
					Alert.alert("Erreur", "Impossible de vérifier le code");
				}
			},
			"plain-text",
			"",
			"number-pad",
		);
	};

	// 🔐 Forgot Password - Étape 3: Nouveau mot de passe
	const handleEnterNewPassword = (emailForReset, codeForReset) => {
		Alert.prompt(
			"Nouveau mot de passe",
			"Entrez votre nouveau mot de passe\n(min. 8 caractères, 1 majuscule, 1 chiffre)",
			async (newPasswordInput) => {
				if (!newPasswordInput || newPasswordInput.length < 8) {
					Alert.alert(
						"Erreur",
						"Le mot de passe doit contenir au moins 8 caractères",
					);
					return;
				}
				try {
					const res = await fetch(`${API_CONFIG.baseURL}/auth/reset-password`, {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							email: emailForReset,
							token: codeForReset,
							newPassword: newPasswordInput,
						}),
					});
					const data = await res.json();
					if (res.ok) {
						Alert.alert(
							"✅ Succès",
							"Votre mot de passe a été réinitialisé. Vous pouvez maintenant vous connecter.",
						);
					} else {
						Alert.alert(
							"Erreur",
							data.message || "Impossible de réinitialiser le mot de passe",
						);
					}
				} catch {
					Alert.alert("Erreur", "Impossible de contacter le serveur");
				}
			},
			"secure-text",
		);
	};

	// 🔐 Connexion Google OAuth
	const handleGoogleLogin = async (idToken) => {
		setLoading(true);
		try {
			const res = await fetch(`${API_CONFIG.baseURL}/auth/google-login`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ idToken }),
			});

			const data = await res.json();

			if (res.ok) {
				// Stocker tokens et infos (même logique que handleLogin)
				await setSecureItem("@access_token", data.accessToken);
				if (data.refreshToken) {
					await setSecureItem("refreshToken", data.refreshToken);
				}

				const restaurantId = data.user.restaurantId;
				if (restaurantId) {
					await AsyncStorage.setItem("restaurantId", restaurantId);
					setRestaurantId(restaurantId);
				}

				if (data.user.category) {
					await AsyncStorage.setItem("category", data.user.category);
				}

				// 🔧 Stocker les feature overrides (developer mode)
				if (
					data.user.featureOverrides &&
					Object.keys(data.user.featureOverrides).length > 0
				) {
					await AsyncStorage.setItem(
						"featureOverrides",
						JSON.stringify(data.user.featureOverrides),
					);
				} else {
					await AsyncStorage.removeItem("featureOverrides");
				}

				await setUser({
					userId: data.user.id,
					email: data.user.email,
					role: data.user.role,
					restaurantId: restaurantId,
					category: data.user.category || "restaurant",
				});

				console.log("✅ [GOOGLE] Connexion réussie:", data.user.email);
				router.replace("/");
			} else {
				Alert.alert("Erreur", data.message || "Connexion Google échouée");
			}
		} catch (err) {
			console.error("❌ [GOOGLE] Erreur:", err);
			Alert.alert("Erreur", "Impossible de se connecter avec Google");
		} finally {
			setLoading(false);
		}
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
					contentType,
				);
				const bodyText = await res.text();
				console.error("❌ Body brut:", bodyText);
				Alert.alert(
					"Erreur",
					"Erreur serveur - réponse non-JSON. Vérifiez les logs.",
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
				// ✅ Stocker le token d'accès (SecureStore)
				await setSecureItem("@access_token", data.accessToken);
				// ✅ Stocker le refresh token (SecureStore - TRÈS IMPORTANT pour la continuité de session)
				if (data.refreshToken) {
					await setSecureItem("refreshToken", data.refreshToken);
					console.log("✅ RefreshToken sauvegardé en SecureStore");

					// ⭐ Vérifier immédiatement que c'est bien sauvegardé
					const saved = await getSecureItem("refreshToken");
					if (saved) {
						console.log(
							"✅✅ Vérification: RefreshToken présent en SecureStore",
						);
					} else {
						console.error(
							"❌ ERREUR: RefreshToken n'a pas pu être sauvegardé!",
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
						data,
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

				// 🍔 Stocker la catégorie du restaurant (foodtruck, restaurant, etc.)
				if (data.category) {
					await AsyncStorage.setItem("category", data.category);
					console.log("✅ category sauvegardée:", data.category);
				} else {
					await AsyncStorage.removeItem("category");
				}

				// 🔧 Stocker les feature overrides (developer mode)
				if (
					data.featureOverrides &&
					Object.keys(data.featureOverrides).length > 0
				) {
					await AsyncStorage.setItem(
						"featureOverrides",
						JSON.stringify(data.featureOverrides),
					);
					console.log("✅ featureOverrides sauvegardés");
				} else {
					await AsyncStorage.removeItem("featureOverrides");
				}

				// ✅ Stocker les infos utilisateur (role, userType)
				await setUser({
					userId: data.userId,
					email: data.email,
					role: data.role,
					userType: data.userType,
					restaurantId: restaurantId,
					category: data.category || "restaurant",
				});
				console.log("✅ User info stocké:", {
					role: data.role,
					userType: data.userType,
					category: data.category,
				});
				// ⏳ Attendre que TOUS les tokens soient bien écrits avant de naviguer
				const verifyToken = await getSecureItem("@access_token");
				if (!verifyToken) {
					console.error("❌ CRITICAL: Token non sauvegardé après login !");
					Alert.alert("Erreur", "Problème de sauvegarde des identifiants");
					return;
				}
				console.log("✅ Token vérifié présent, navigation...");
				// 🧭 Redirection vers index qui gérera la vraie navigation
				router.replace("/");
			} else {
				Alert.alert("Erreur", data.message || "Identifiants invalides");
			}
		} catch (err) {
			clearTimeout(timeoutId);

			if (err.name === "AbortError") {
				Alert.alert("Erreur", "Le serveur ne répond pas (timeout). Réessayez.");
			} else {
				Alert.alert("Erreur", "Impossible de contacter le serveur");
			}
			console.error(err);
		} finally {
			setLoading(false);
		}
	};

	const glowInterpolation = glowAnim.interpolate({
		inputRange: [0, 1],
		outputRange: ["rgba(255,120,0,0.3)", "rgba(255,200,0,0.7)"],
	});

	return (
		<KeyboardAvoidingView
			style={styles.container}
			behavior={Platform.OS === "ios" ? "padding" : undefined}
		>
			<View style={styles.card}>
				{/* Logo */}
				<View style={styles.logo}>
					<Text style={styles.logoText}>S</Text>
				</View>

				{/* Titre et sous-titre */}
				<Text style={styles.title}>Welcome Back</Text>
				<Text style={styles.subtitle}>Sign in to continue to SunnyGo</Text>

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

					{/* 🔐 Google Sign In - DÉSACTIVÉ (nécessite Apple Developer Account pour iOS)
					    TODO: Réactiver quand compte Apple Developer disponible
					    Pour réactiver: 
					    1. Décommenter les blocs ci-dessous
					    2. Lancer: npx eas build --platform ios --profile development
					    3. Installer l'app buildée sur iPhone
					*/}
					{/* Séparateur OR
					<View style={styles.separator}>
						<View style={styles.separatorLine} />
						<Text style={styles.separatorText}>OR</Text>
						<View style={styles.separatorLine} />
					</View>
					*/}
					{/* 
					<TouchableOpacity
						style={styles.googleButton}
						onPress={() => promptAsync()}
						disabled={loading || !request}
					>
						<Text style={styles.googleIcon}>🔐</Text>
						<Text style={styles.googleText}>Sign in with Google</Text>
					</TouchableOpacity>
					*/}
				</View>
			</View>
		</KeyboardAvoidingView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "rgba(242, 5, 5, 0.69)",
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
		backgroundColor: "rgb(228, 239, 78)",
		justifyContent: "center",
		alignItems: "center",
		marginBottom: 20,
		shadowColor: "rgb(171, 171, 5)",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.6,
		shadowRadius: 12,
		elevation: 8,
	},
	logoText: {
		fontSize: 36,
		fontWeight: "bold",
		color: "#ef1a1a93",
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
		color: "rgb(239, 78, 78)",
		marginBottom: 24,
		fontSize: 13,
		fontWeight: "600",
	},
	signInButton: {
		height: 52,
		borderRadius: 14,
		backgroundColor: "rgb(239, 78, 78)",
		justifyContent: "center",
		alignItems: "center",
		overflow: "hidden",
		shadowColor: "rgb(211, 31, 31)",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.4,
		shadowRadius: 8,
		elevation: 6,
	},
	separator: {
		flexDirection: "row",
		alignItems: "center",
		marginVertical: 20,
	},
	separatorLine: {
		flex: 1,
		height: 1,
		backgroundColor: "rgba(0,0,0,0.1)",
	},
	separatorText: {
		marginHorizontal: 10,
		color: "#aaa",
		fontSize: 12,
		fontWeight: "600",
	},
	googleButton: {
		height: 50,
		borderRadius: 14,
		backgroundColor: "#fff",
		borderWidth: 2,
		borderColor: "rgba(0,0,0,0.1)",
		flexDirection: "row",
		justifyContent: "center",
		alignItems: "center",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
	},
	googleIcon: {
		fontSize: 20,
		marginRight: 10,
	},
	googleText: {
		fontSize: 15,
		fontWeight: "600",
		color: "#333",
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
