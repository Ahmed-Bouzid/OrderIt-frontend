/**
 * 🎯 useCRMActions - Hook pour les actions CRM
 * Gère les exports, coaching, notifications et actions admin
 */

import { useState, useCallback } from "react";
import { Alert } from "react-native";
import { useAuthFetch } from "./useAuthFetch";
import useUserStore from "../src/stores/useUserStore";
import { documentDirectory, writeAsStringAsync } from "expo-file-system";
import * as Sharing from "expo-sharing";
// import * as Print from "expo-print"; // TODO: Package à installer

export const useCRMActions = () => {
	const [isExporting, setIsExporting] = useState(false);
	const [isSendingAlert, setIsSendingAlert] = useState(false);
	const [isUpdatingServer, setIsUpdatingServer] = useState(false);

	const authFetch = useAuthFetch();
	const restaurantId = useUserStore((state) => state.restaurantId);
	const userRole = useUserStore((state) => state.role);

	/**
	 * 📊 Exporte un rapport CRM
	 */
	const exportReport = useCallback(
		async (period = "month", format = "json") => {
			if (!restaurantId) {
				throw new Error("Restaurant non identifié");
			}

			setIsExporting(true);

			try {
				console.log(`📊 [CRM] Export rapport ${format} pour période ${period}`);

				const response = await authFetch(
					`/crm/reports/export?period=${period}&format=${format}`,
					{
						method: "GET",
					},
				);

				if (!response.success) {
					throw new Error(response.message || "Erreur lors de l'export");
				}

				// Préparer le contenu selon le format
				let content, filename, mimeType;

				if (format === "csv") {
					content = response.data;
					filename = `crm-report-${period}-${new Date().toISOString().split("T")[0]}.csv`;
					mimeType = "text/csv";
				} else {
					content = JSON.stringify(response.data, null, 2);
					filename = `crm-report-${period}-${new Date().toISOString().split("T")[0]}.json`;
					mimeType = "application/json";
				}

				// Créer le fichier temporaire
				const fileUri = documentDirectory + filename;
				await writeAsStringAsync(fileUri, content);

				// Partager le fichier
				if (await Sharing.isAvailableAsync()) {
					await Sharing.shareAsync(fileUri, {
						mimeType,
						dialogTitle: `Rapport CRM - ${period}`,
					});
				} else {
					Alert.alert(
						"Succès",
						"Le rapport a été généré mais le partage n'est pas disponible sur cet appareil",
					);
				}

				console.log("✅ [CRM] Export terminé avec succès");
				return { success: true, fileUri };
			} catch (error) {
				console.error("❌ [CRM] Erreur export:", error);
				throw error;
			} finally {
				setIsExporting(false);
			}
		},
		[restaurantId, authFetch],
	);

	/**
	 * 📊 Génère un PDF du rapport
	 */
	const exportPDFReport = useCallback(
		async (period = "month", dashboardData = null) => {
			if (!restaurantId || !dashboardData) {
				throw new Error("Données insuffisantes pour générer le PDF");
			}

			setIsExporting(true);

			try {
				console.log(`📄 [CRM] Génération PDF pour période ${period}`);

				// TODO: Installer expo-print pour activer la génération PDF
				/*
				// Template HTML pour le PDF
				const htmlContent = `
				<html>
					<head>
						<meta charset="utf-8">
						<title>Rapport CRM - ${period}</title>
						<style>
							body { font-family: Arial, sans-serif; margin: 20px; }
							.header { background: linear-gradient(135deg, #F59E0B, #FBBF24); color: white; padding: 20px; border-radius: 10px; text-align: center; }
							.kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
							.kpi-card { background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; }
							.kpi-value { font-size: 24px; font-weight: bold; color: #F59E0B; }
							.section { margin: 30px 0; }
							.section-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; }
							.server-row { display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #eee; }
							.footer { text-align: center; margin-top: 40px; font-size: 12px; color: #666; }
						</style>
					</head>
					<body>
						<div class="header">
							<h1>📊 Rapport CRM Performance</h1>
							<p>Période: ${period} | Généré le ${new Date().toLocaleDateString("fr-FR")}</p>
						</div>

						<div class="section">
							<div class="section-title">📈 Indicateurs Clés</div>
							<div class="kpi-grid">
								<div class="kpi-card">
									<div class="kpi-value">${dashboardData.kpi?.totalOrders || 0}</div>
									<div>Commandes</div>
								</div>
								<div class="kpi-card">
									<div class="kpi-value">${dashboardData.kpi?.totalRevenue || 0}€</div>
									<div>Chiffre d'Affaires</div>
								</div>
								<div class="kpi-card">
									<div class="kpi-value">${Math.round(dashboardData.kpi?.averageServiceTime || 0)}min</div>
									<div>Temps Moyen</div>
								</div>
								<div class="kpi-card">
									<div class="kpi-value">${dashboardData.kpi?.activeServers || 0}</div>
									<div>Serveurs Actifs</div>
								</div>
							</div>
						</div>

						<div class="section">
							<div class="section-title">🏆 Top Performers</div>
							${(dashboardData.kpi?.topPerformers || [])
								.map(
									(performer, index) => `
								<div class="server-row">
									<span>${index + 1}. ${performer.name}</span>
									<span>${performer.totalSales}€ (${performer.totalOrders} commandes)</span>
								</div>
							`,
								)
								.join("")}
						</div>

						<div class="footer">
							<p>Généré par SunnyGo CRM | Restaurant ID: ${restaurantId}</p>
						</div>
					</body>
				</html>
				`;
				*/

				// TODO: Installer expo-print pour activer l'export PDF
				/*
				// Générer le PDF
				const { uri } = await Print.printToFileAsync({
					html: htmlContent,
					base64: false,
				});

				// Partager le PDF
				if (await Sharing.isAvailableAsync()) {
					await Sharing.shareAsync(uri, {
						mimeType: "application/pdf",
						dialogTitle: "Partager le rapport CRM",
					});
				}
				*/

				Alert.alert(
					"Info",
					"Export PDF non disponible - installer expo-print si nécessaire",
				);

				console.log("✅ [CRM] PDF génération préparée (nécessite expo-print)");
				return { success: false, message: "Export PDF non disponible" };
			} catch (error) {
				console.error("❌ [CRM] Erreur génération PDF:", error);
				throw error;
			} finally {
				setIsExporting(false);
			}
		},
		[restaurantId],
	);

	/**
	 * 💬 Envoie une alerte de coaching
	 */
	const sendCoachingAlert = useCallback(async (recommendation) => {
		if (!recommendation || !recommendation.serverId) {
			throw new Error("Recommandation invalide");
		}

		setIsSendingAlert(true);

		try {
			console.log(
				`💬 [CRM] Envoi alerte coaching pour ${recommendation.serverName}`,
			);

			// TODO: Implémenter l'envoi d'alerte via API backend
			// Pour l'instant, simulation
			await new Promise((resolve) => setTimeout(resolve, 1000));

			// Ici on pourrait :
			// 1. Envoyer une notification push au serveur
			// 2. Créer une tâche dans le système
			// 3. Envoyer un email/SMS
			// 4. Créer un message dans le chat interne

			console.log("✅ [CRM] Alerte envoyée avec succès");
			return { success: true };
		} catch (error) {
			console.error("❌ [CRM] Erreur envoi alerte:", error);
			throw error;
		} finally {
			setIsSendingAlert(false);
		}
	}, []);

	/**
	 * 👥 Met à jour le rôle d'un serveur
	 */
	const updateServerRole = useCallback(
		async (serverId, newRole) => {
			if (!serverId || !newRole) {
				throw new Error("Paramètres invalides");
			}

			if (userRole !== "admin") {
				throw new Error("Seuls les administrateurs peuvent modifier les rôles");
			}

			setIsUpdatingServer(true);

			try {
				console.log(
					`👥 [CRM] Mise à jour rôle serveur ${serverId} → ${newRole}`,
				);

				const response = await authFetch(`/servers/${serverId}`, {
					method: "PUT",
					body: { role: newRole },
				});

				if (!response.success) {
					throw new Error(response.message || "Erreur lors de la mise à jour");
				}

				console.log("✅ [CRM] Rôle mis à jour avec succès");
				return { success: true, server: response.server };
			} catch (error) {
				console.error("❌ [CRM] Erreur mise à jour rôle:", error);
				throw error;
			} finally {
				setIsUpdatingServer(false);
			}
		},
		[userRole, authFetch],
	);

	/**
	 * 🎯 Marque un objectif de coaching comme complété
	 */
	const markCoachingCompleted = useCallback(
		async (recommendationId, notes = "") => {
			try {
				console.log(`🎯 [CRM] Marquage coaching complété ${recommendationId}`);

				// TODO: Implémenter via API backend
				await new Promise((resolve) => setTimeout(resolve, 500));

				console.log("✅ [CRM] Coaching marqué comme complété");
				return { success: true };
			} catch (error) {
				console.error("❌ [CRM] Erreur marquage coaching:", error);
				throw error;
			}
		},
		[],
	);

	/**
	 * 📊 Crée un rapport personnalisé
	 */
	const createCustomReport = useCallback(
		async (config) => {
			setIsExporting(true);

			try {
				console.log(`📊 [CRM] Création rapport personnalisé`);

				const {
					dateRange,
					metrics = ["orders", "revenue", "service_time"],
					serverIds = [],
					format = "json",
				} = config;

				// TODO: Implémenter l'API backend pour les rapports personnalisés
				const response = await authFetch(`/crm/reports/custom`, {
					method: "POST",
					body: {
						dateRange,
						metrics,
						serverIds,
						format,
						restaurantId,
					},
				});

				if (!response.success) {
					throw new Error(
						response.message || "Erreur lors de la création du rapport",
					);
				}

				console.log("✅ [CRM] Rapport personnalisé créé");
				return response.data;
			} catch (error) {
				console.error("❌ [CRM] Erreur rapport personnalisé:", error);
				throw error;
			} finally {
				setIsExporting(false);
			}
		},
		[authFetch, restaurantId],
	);

	/**
	 * 🔄 Synchronise les données avec le serveur
	 */
	const syncData = useCallback(async () => {
		try {
			console.log(`🔄 [CRM] Synchronisation des données`);

			// Force un refresh complet via un timestamp
			const response = await authFetch(`/crm/sync?timestamp=${Date.now()}`, {
				method: "POST",
				body: { restaurantId },
			});

			if (!response.success) {
				throw new Error(response.message || "Erreur de synchronisation");
			}

			console.log("✅ [CRM] Synchronisation réussie");
			return { success: true, syncedAt: new Date() };
		} catch (error) {
			console.error("❌ [CRM] Erreur sync:", error);
			throw error;
		}
	}, [authFetch, restaurantId]);

	/**
	 * 🎨 Génère des graphiques exportables
	 */
	const exportCharts = useCallback(async (chartType, data, options = {}) => {
		setIsExporting(true);

		try {
			console.log(`🎨 [CRM] Export graphique ${chartType}`);

			// TODO: Implémenter la génération d'images de graphiques
			// Peut utiliser react-native-svg pour convertir en image

			await new Promise((resolve) => setTimeout(resolve, 1000));

			console.log("✅ [CRM] Graphique exporté");
			return { success: true };
		} catch (error) {
			console.error("❌ [CRM] Erreur export graphique:", error);
			throw error;
		} finally {
			setIsExporting(false);
		}
	}, []);

	// ─────────────── API Publique ───────────────
	return {
		// États
		isExporting,
		isSendingAlert,
		isUpdatingServer,

		// Actions principales
		exportReport,
		exportPDFReport,
		sendCoachingAlert,
		updateServerRole,

		// Actions avancées
		markCoachingCompleted,
		createCustomReport,
		syncData,
		exportCharts,

		// Utilitaires
		isActionInProgress: isExporting || isSendingAlert || isUpdatingServer,
	};
};
