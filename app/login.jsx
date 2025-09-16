// app/login.jsx
import React, { useState } from "react";
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	StyleSheet,
	Alert,
	ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";

export default function Login() {
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);

	const handleLogin = async () => {
		setLoading(true);
		try {
			// Ajuste l'URL si ton backend est sur /auth/login ou /api/auth/login
			const res = await fetch("http://192.168.1.122:3000/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, password }),
			});
			const data = await res.json();
			if (res.ok) {
				await AsyncStorage.setItem("token", data.accessToken);
				// redirige vers la zone onglets
				router.replace("/tabs/activity");
			} else {
				Alert.alert("Erreur", data.message || "Identifiants invalides");
			}
		} catch (err) {
			console.error(err);
			Alert.alert("Erreur", "Impossible de contacter le serveur");
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
