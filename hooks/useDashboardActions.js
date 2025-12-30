import { useState, useCallback } from "react";
import { API_CONFIG } from "../src/config/apiConfig";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuthFetch } from "./useAuthFetch";
import usePresentStore from "../src/stores/usePresentStore";

export const useDashboardActions = (fetchReservations) => {
	const authFetch = useAuthFetch();
	const [activeReservation, setActiveReservation] = useState(null);
	const { markAsPresent, removePresent, cleanup } = usePresentStore();

	// Rafraîchir une réservation spécifique
	const refreshActiveReservation = useCallback(
		async (reservationId) => {
			try {
				const data = await authFetch(
					`${API_CONFIG.baseURL}/reservations/${reservationId}`
				);
				if (data && !Array.isArray(data)) {
					setActiveReservation(data);
				}
			} catch (error) {
				console.error("❌ Erreur rafraîchissement réservation:", error);
			}
		},
		[authFetch]
	);

	// Marquer comme présent (utilise la route togglePresent du backend)
	const togglePresent = useCallback(
		async (id) => {
			try {
				const data = await authFetch(
					`${API_CONFIG.baseURL}/reservations/${id}/togglePresent`,
					{
						method: "PUT",
					}
				);

				if (data && !Array.isArray(data)) {
					markAsPresent(id);
					Alert.alert("Succès", "Client marqué comme présent");
					await fetchReservations();
					return true;
				}
			} catch (error) {
				console.error("❌ Erreur toggle présent:", error);
				Alert.alert("Erreur", "Impossible de marquer comme présent");
			}
			return false;
		},
		[markAsPresent, fetchReservations, authFetch]
	);

	// Mettre à jour le statut
	const updateStatus = useCallback(
		async (id, newStatus, reservation) => {
			// Validation avant fermeture : vérifier le paiement
			if (newStatus === "terminée") {
				const totalAmount = reservation?.totalAmount || 0;
				const paidAmount = reservation?.paidAmount || 0;
				const isPaid = paidAmount >= totalAmount;

				// Si pas payé
				if (!isPaid) {
					// Si montant = 0€, proposer fermeture exceptionnelle
					if (totalAmount === 0) {
						return new Promise((resolve) => {
							Alert.alert(
								"Fermeture exceptionnelle",
								"Le montant est de 0€. Voulez-vous fermer cette réservation ?",
								[
									{
										text: "Annuler",
										style: "cancel",
										onPress: () => resolve(false),
									},
									{
										text: "Fermer à 0€",
										onPress: async () => {
											const success = await proceedWithStatusUpdate(
												id,
												newStatus
											);
											resolve(success);
										},
									},
								]
							);
						});
					} else {
						// Montant > 0 et pas payé
						Alert.alert(
							"Paiement requis",
							"Procédez au paiement avant la fermeture de cette réservation.",
							[{ text: "OK" }]
						);
						return false;
					}
				}
			}

			// Procéder normalement
			return await proceedWithStatusUpdate(id, newStatus);
		},
		[authFetch, fetchReservations, cleanup]
	);

	// Fonction interne pour effectuer la mise à jour
	const proceedWithStatusUpdate = async (id, newStatus) => {
		try {
			const data = await authFetch(
				`${API_CONFIG.baseURL}/reservations/${id}/status`,
				{
					method: "PUT",
					body: { status: newStatus },
				}
			);

			if (data && !Array.isArray(data)) {
				// Si terminée, nettoyer l'état présent
				if (newStatus === "terminée") {
					cleanup(id);
				}
				Alert.alert("Succès", "Statut mis à jour");
				await fetchReservations();
				return true;
			}
		} catch (error) {
			console.error("❌ Erreur update status:", error);
			Alert.alert("Erreur", "Impossible de mettre à jour le statut");
		}
		return false;
	};

	// Annuler une réservation
	const cancelReservation = useCallback(
		async (id) => {
			Alert.alert(
				"Confirmation",
				"Voulez-vous vraiment annuler cette réservation ?",
				[
					{ text: "Non", style: "cancel" },
					{
						text: "Oui",
						onPress: async () => {
							try {
								const data = await authFetch(
									`${API_CONFIG.baseURL}/reservations/${id}/status`,
									{
										method: "PUT",
										body: { status: "annulée" },
									}
								);

								if (data && !Array.isArray(data)) {
									cleanup(id); // Nettoyer l'état présent
									Alert.alert("Succès", "Réservation annulée");
									await fetchReservations();
									return true;
								}
							} catch (error) {
								console.error("❌ Erreur annulation:", error);
								Alert.alert("Erreur", "Impossible d'annuler la réservation");
							}
							return false;
						},
					},
				]
			);
		},
		[authFetch, fetchReservations]
	);

	// Assigner une table
	const assignTable = useCallback(
		async (reservationId, tableId) => {
			try {
				const data = await authFetch(
					`${API_CONFIG.baseURL}/reservations/${reservationId}`,
					{
						method: "PUT",
						body: { tableId },
					}
				);

				if (data && !Array.isArray(data)) {
					Alert.alert("Succès", "Table assignée avec succès");
					await fetchReservations();
					await refreshActiveReservation(reservationId);
					return true;
				}
			} catch (error) {
				console.error("❌ Erreur assignation table:", error);
				Alert.alert("Erreur", "Impossible d'assigner la table");
			}
			return false;
		},
		[authFetch, fetchReservations, refreshActiveReservation]
	);

	// Créer une réservation
	const createReservation = useCallback(
		async (formData) => {
			try {
				// Calcul date ISO
				let isoDate;
				try {
					const [hours, minutes] = formData.reservationTime.split(":");
					const today = new Date(formData.reservationDate || new Date());
					today.setHours(parseInt(hours), parseInt(minutes), 0, 0);
					isoDate = today.toISOString();
				} catch {
					Alert.alert("Erreur", "La date ou l'heure choisie n'est pas valide.");
					return false;
				}

				const storedRestaurantId = await AsyncStorage.getItem("restaurantId");
				if (!storedRestaurantId) {
					Alert.alert("Erreur", "Restaurant non défini, attend le chargement");
					return false;
				}

				// Récupérer l'ID du serveur depuis le token JWT
				const token = await AsyncStorage.getItem("token");
				let serverId = null;
				if (token) {
					try {
						const parts = token.split(".");
						if (parts.length === 3) {
							const decoded = JSON.parse(atob(parts[1]));
							serverId = decoded.id;
						}
					} catch (e) {
						console.warn("Impossible de décoder le token:", e);
					}
				}

				const body = {
					clientName: formData.clientName,
					phone: formData.phone,
					nbPersonnes: formData.nbPersonnes,
					allergies: formData.allergies,
					restrictions: formData.restrictions,
					notes: formData.notes,
					restaurantId: storedRestaurantId,
					reservationDate: isoDate,
					reservationTime: formData.reservationTime,
					...(serverId && { serverId }),
					...(formData.tableId && { tableId: formData.tableId }),
				};

				const data = await authFetch(`${API_CONFIG.baseURL}/reservations`, {
					method: "POST",
					body,
				});

				if (data && !Array.isArray(data)) {
					Alert.alert("Succès", "Réservation créée avec succès !");
					await fetchReservations();
					return true;
				} else {
					throw new Error("Erreur création réservation");
				}
			} catch (err) {
				console.error(err);
				Alert.alert(
					"Erreur",
					"Impossible de créer la réservation, vérifie ta connexion."
				);
				return false;
			}
		},
		[authFetch, fetchReservations]
	);

	return {
		activeReservation,
		setActiveReservation,
		refreshActiveReservation,
		togglePresent,
		updateStatus,
		cancelReservation,
		assignTable,
		createReservation,
	};
};
