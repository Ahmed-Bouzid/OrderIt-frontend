import React from "react";
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ErrorLogger from "../../utils/ErrorLogger";

/**
 * ErrorBoundary - Composant pour capturer les erreurs React
 * Affiche une interface utilisateur de secours et propose d'envoyer un feedback
 */
class ErrorBoundary extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			hasError: false,
			error: null,
			errorInfo: null,
		};
	}

	static getDerivedStateFromError(error) {
		// Met à jour le state pour afficher l'UI de secours
		return { hasError: true };
	}

	async componentDidCatch(error, errorInfo) {
		// Log l'erreur dans notre système
		console.error("[ErrorBoundary] Erreur capturée:", error, errorInfo);

		// Sauvegarder l'erreur dans AsyncStorage
		await ErrorLogger.logError(error, {
			screen: this.props.screenName || "Unknown",
			action: "Component Error",
			componentStack: errorInfo.componentStack,
		});

		this.setState({
			error,
			errorInfo,
		});
	}

	handleReset = () => {
		this.setState({
			hasError: false,
			error: null,
			errorInfo: null,
		});
	};

	handleSendFeedback = () => {
		// Navigue vers la page de feedback
		if (this.props.onSendFeedback) {
			this.props.onSendFeedback();
		}
		this.handleReset();
	};

	render() {
		if (this.state.hasError) {
			return (
				<View style={styles.container}>
					<View style={styles.content}>
						<Ionicons
							name="warning-outline"
							size={64}
							color="#DC2626"
							style={styles.icon}
						/>
						<Text style={styles.title}>Une erreur est survenue</Text>
						<Text style={styles.message}>
							L&apos;application a rencontré un problème inattendu.
						</Text>

						{__DEV__ && this.state.error && (
							<ScrollView style={styles.debugContainer}>
								<Text style={styles.debugTitle}>
									Détails de l&apos;erreur :
								</Text>
								<Text style={styles.debugText}>
									{this.state.error.toString()}
								</Text>
								{this.state.errorInfo && (
									<Text style={styles.debugText}>
										{this.state.errorInfo.componentStack}
									</Text>
								)}
							</ScrollView>
						)}

						<View style={styles.buttonContainer}>
							<TouchableOpacity
								style={[styles.button, styles.primaryButton]}
								onPress={this.handleReset}
							>
								<Ionicons name="refresh-outline" size={20} color="#FFF" />
								<Text style={styles.primaryButtonText}>Réessayer</Text>
							</TouchableOpacity>

							<TouchableOpacity
								style={[styles.button, styles.secondaryButton]}
								onPress={this.handleSendFeedback}
							>
								<Ionicons name="chatbox-outline" size={20} color="#D97706" />
								<Text style={styles.secondaryButtonText}>
									Envoyer un rapport de bug
								</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			);
		}

		return this.props.children;
	}
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#1C1C1E",
		justifyContent: "center",
		alignItems: "center",
		padding: 20,
	},
	content: {
		maxWidth: 500,
		width: "100%",
		alignItems: "center",
	},
	icon: {
		marginBottom: 20,
	},
	title: {
		fontSize: 24,
		fontWeight: "bold",
		color: "#FFFFFF",
		marginBottom: 12,
		textAlign: "center",
	},
	message: {
		fontSize: 16,
		color: "#A0A0A0",
		marginBottom: 24,
		textAlign: "center",
		lineHeight: 24,
	},
	debugContainer: {
		maxHeight: 200,
		width: "100%",
		backgroundColor: "#2C2C2E",
		borderRadius: 8,
		padding: 12,
		marginBottom: 24,
	},
	debugTitle: {
		fontSize: 14,
		fontWeight: "bold",
		color: "#DC2626",
		marginBottom: 8,
	},
	debugText: {
		fontSize: 12,
		color: "#A0A0A0",
		fontFamily: "monospace",
	},
	buttonContainer: {
		width: "100%",
		gap: 12,
	},
	button: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 14,
		paddingHorizontal: 20,
		borderRadius: 8,
		gap: 8,
	},
	primaryButton: {
		backgroundColor: "#D97706",
	},
	primaryButtonText: {
		color: "#FFFFFF",
		fontSize: 16,
		fontWeight: "600",
	},
	secondaryButton: {
		backgroundColor: "transparent",
		borderWidth: 1,
		borderColor: "#D97706",
	},
	secondaryButtonText: {
		color: "#D97706",
		fontSize: 16,
		fontWeight: "600",
	},
});

export default ErrorBoundary;
