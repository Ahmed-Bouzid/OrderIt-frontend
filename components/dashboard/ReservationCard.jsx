import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import styles from "../styles";
import usePresentStore from "../../src/stores/usePresentStore";

const ReservationCard = React.memo(
	({ reservation, onSettingsPress, onAssignTablePress, theme }) => {
		const { getEffectiveStatus } = usePresentStore();

		// ⭐ Garde-fou : vérifier que reservation existe
		if (!reservation) {
			return null;
		}

		const effectiveStatus = getEffectiveStatus(reservation) || "en attente";

		const formatDate = (date) => {
			if (!date) return "-";
			try {
				const d = new Date(date);
				if (isNaN(d.getTime())) return "-";
				return d.toLocaleDateString();
			} catch {
				return "-";
			}
		};

		const getStatusColor = (status) => {
			switch (status) {
				case "present":
					return "#4CAF50"; // Vert
				case "ouverte":
					return "#2196F3"; // Bleu
				case "annulee":
					return "#F44336"; // Rouge
				case "termine":
					return "#9E9E9E"; // Gris
				default:
					return "#FFC107"; // Jaune (actives)
			}
		};

		return (
			<View
				style={[
					styles.reservationCardContainer,
					{
						backgroundColor:
							effectiveStatus === "present" || effectiveStatus === "ouverte"
								? "rgba(46, 139, 87, 0.2)"
								: theme.cardColor,
						borderColor: theme.borderColor,
					},
				]}
			>
				{(effectiveStatus === "present" || effectiveStatus === "ouverte") && (
					<View style={styles.greenStripe} />
				)}

				{/* Header avec nom + molette */}
				<View style={styles.reservationCardHeader}>
					<Text
						style={[
							styles.reservationCardName,
							{ color: theme?.textColor || "#000" },
						]}
					>
						{String(reservation?.clientName || "Client").toUpperCase()}
					</Text>
					<TouchableOpacity onPress={() => onSettingsPress?.(reservation)}>
						<Text style={styles.reservationCardSettingsIcon}>⚙️</Text>
					</TouchableOpacity>
				</View>

				{/* Contenu : 2 colonnes */}
				<View style={styles.reservationCardContent}>
					{/* Colonne gauche - Infos personne */}
					<View style={styles.reservationCardLeftCol}>
						{/* Téléphone */}
						<View style={styles.reservationCardInfoRow}>
							<Text style={styles.reservationCardIcon}>📱</Text>
							<Text
								style={[
									styles.reservationCardInfoText,
									{ color: theme.textColor },
								]}
							>
								{String(reservation.phone || "-")}
							</Text>
						</View>

						{/* Personnes */}
						<View style={styles.reservationCardInfoRow}>
							<Text style={styles.reservationCardIcon}>👥</Text>
							<Text
								style={[
									styles.reservationCardInfoText,
									{ color: theme.textColor },
								]}
							>
								{String(reservation.nbPersonnes || 0)}
							</Text>
						</View>

						{/* Date */}
						<View style={styles.reservationCardInfoRow}>
							<Text style={styles.reservationCardIcon}>📅</Text>
							<Text
								style={[
									styles.reservationCardInfoText,
									{ color: theme.textColor },
								]}
							>
								{formatDate(reservation.reservationDate)}
							</Text>
						</View>

						{/* Heure */}
						<View style={styles.reservationCardInfoRow}>
							<Text style={styles.reservationCardIcon}>🕐</Text>
							<Text
								style={[
									styles.reservationCardInfoText,
									{ color: theme.textColor },
								]}
							>
								{String(reservation.reservationTime || "N/A")}
							</Text>
						</View>
					</View>

					{/* Colonne droite - Infos réservation */}
					<View style={styles.reservationCardRightCol}>
						{/* Table avec chaise cliquable */}
						<View style={styles.reservationCardInfoRow}>
							{effectiveStatus !== "fermee" && effectiveStatus !== "annulee" ? (
								<TouchableOpacity
									onPress={() => onAssignTablePress(reservation)}
									style={styles.reservationCardChairTouchable}
								>
									<Text style={styles.reservationCardIcon}>🪑</Text>
								</TouchableOpacity>
							) : (
								<Text style={[styles.reservationCardIcon, { opacity: 0.5 }]}>
									🪑
								</Text>
							)}
							<Text
								style={[
									styles.reservationCardInfoText,
									{ color: theme.textColor },
								]}
							>
								Table {String(reservation.tableId?.number || "-")}
							</Text>
						</View>

						{/* Montant */}
						<View style={styles.reservationCardInfoRow}>
							<Text style={styles.reservationCardIcon}>💰</Text>
							<Text
								style={[
									styles.reservationCardInfoText,
									{ color: theme?.textColor || "#000", fontWeight: "700" },
								]}
							>
								{typeof reservation?.totalAmount === "number"
									? `${Number(reservation.totalAmount).toFixed(2)}€`
									: "0.00€"}
							</Text>
						</View>

						{/* Statut avec pastille */}
						<View style={styles.reservationCardInfoRow}>
							<View
								style={[
									styles.reservationCardStatusDot,
									{ backgroundColor: getStatusColor(effectiveStatus) },
								]}
							/>
							<Text
								style={[
									styles.reservationCardInfoText,
									{ color: theme.textColor },
								]}
							>
								{String(effectiveStatus || "-")}
							</Text>
						</View>
					</View>
				</View>
			</View>
		);
	}
);

ReservationCard.displayName = "ReservationCard";

export default ReservationCard;
