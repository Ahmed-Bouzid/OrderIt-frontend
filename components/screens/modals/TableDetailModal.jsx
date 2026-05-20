/**
 * 🏪 TableDetailModal.jsx — Détail table Comptoir
 *
 * Affiche :
 * - Bandeau statut table
 * - Items envoyés en cuisine (avec état)
 * - Panier local (en attente d'envoi)
 * - 4 actions : Ajouter, Envoyer, Demander addition, Encaisser
 */

import React, { useState, useMemo, useCallback } from "react";
import {
	Modal,
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ScrollView,
	ActivityIndicator,
	Alert,
	Dimensions,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../hooks/useTheme";
import useCounterTable from "../../../hooks/useCounterTable";
import useCounterCartStore from "../../../src/stores/useCounterCartStore";
import MenuPickerModal from "./MenuPickerModal";
import EncaisserModal from "./EncaisserModal";

const IS_PHONE = Dimensions.get("window").width < 600;

const TableDetailModal = ({
	visible,
	onClose,
	restaurantId,
	tableId,
}) => {
	const THEME = useTheme();
	const [showMenuPicker, setShowMenuPicker] = useState(false);
	const [showEncaisser, setShowEncaisser] = useState(false);
	const [isSending, setIsSending] = useState(false);
	const [isClosing, setIsClosing] = useState(false);

	// Hook composite
	const {
		session,
		cart,
		cartTotal,
		cartItemsCount,
		isOpening,
		actions,
	} = useCounterTable(tableId, restaurantId);

	const dynamicStyles = useMemo(
		() => createStyles(THEME),
		[THEME],
	);

	// Handler envoi en cuisine
	const handleSendToCook = async () => {
		if (cart.length === 0) {
			Alert.alert("Panier vide", "Ajoutez des plats avant d'envoyer");
			return;
		}

		setIsSending(true);
		try {
			await actions.sendToCook();
			Alert.alert("✅ Envoyé!", "Les plats sont en cuisine");
		} catch (err) {
			Alert.alert("❌ Erreur", err.message);
		} finally {
			setIsSending(false);
		}
	};

	// Handler demande addition
	const handleRequestBill = async () => {
		try {
			await actions.requestBill();
			Alert.alert("✅ Addition demandée", "Table marquée comme prête à payer");
		} catch (err) {
			Alert.alert("❌ Erreur", err.message);
		}
	};

	// Handler fermeture (encaissement)
	const handleEncaisser = async (paymentMethod) => {
		setIsClosing(true);
		try {
			await actions.closeTable(paymentMethod);
			Alert.alert("✅ Encaissé!", "Table libérée");
			onClose();
		} catch (err) {
			Alert.alert("❌ Erreur", err.message);
		} finally {
			setIsClosing(false);
		}
	};

	if (!visible) return null;

	// Affichage chargement
	if (isOpening || !session) {
		return (
			<Modal
				visible={visible}
				transparent
				animationType="fade"
				onRequestClose={onClose}
			>
				<BlurView intensity={90} style={dynamicStyles.blur}>
					<View style={dynamicStyles.centeredView}>
						<ActivityIndicator
							size="large"
							color={THEME.colors.primary.amber}
						/>
						<Text style={dynamicStyles.loadingText}>
							Ouverture de la table...
						</Text>
					</View>
				</BlurView>
			</Modal>
		);
	}

	return (
		<Modal
			visible={visible}
			transparent
			animationType="slide"
			onRequestClose={onClose}
		>
			<BlurView intensity={90} style={dynamicStyles.blur}>
				<View style={dynamicStyles.container}>
					{/* Header */}
					<LinearGradient
						colors={[
							THEME.colors.background.elevated,
							THEME.colors.background.dark,
						]}
						start={{ x: 0, y: 0 }}
						end={{ x: 1, y: 1 }}
						style={dynamicStyles.header}
					>
						<TouchableOpacity
							onPress={onClose}
							style={dynamicStyles.closeButton}
						>
							<Ionicons
								name="chevron-back"
								size={28}
								color={THEME.colors.primary.amber}
							/>
						</TouchableOpacity>
						<Text style={dynamicStyles.headerTitle}>
							Table {tableId.split("-")[1]} (4 pers.)
						</Text>
						<Text style={dynamicStyles.headerSubtitle}>
							🕐 {Math.floor((Date.now() - new Date(session.openedAt)) / 60000)} min
						</Text>
					</LinearGradient>

					{/* Status Badge */}
					<View style={dynamicStyles.statusBadge}>
						<Text style={dynamicStyles.statusLabel}>
							STATUT: 🟢 En service
						</Text>
						<Text style={dynamicStyles.statusTime}>
							Ouverte par tablette comptoir
						</Text>
					</View>

					<ScrollView style={dynamicStyles.content}>
						{/* Section Envoyés en cuisine */}
						<View style={dynamicStyles.section}>
							<Text style={dynamicStyles.sectionTitle}>
								📋 PLATS COMMANDÉS {cartTotal > 0 && <Text style={dynamicStyles.totalAmount}>{cartTotal.toFixed(2)}€</Text>}
							</Text>
							<View style={dynamicStyles.divider} />

							{/* Fake items pour démo */}
							<View style={dynamicStyles.sentItems}>
								<View style={dynamicStyles.itemRow}>
									<View style={dynamicStyles.itemInfo}>
										<Text style={dynamicStyles.itemName}>
											2× Burger Maison
										</Text>
										<Text style={dynamicStyles.itemStatus}>
											🟢 En préparation
										</Text>
									</View>
									<Text style={dynamicStyles.itemPrice}>
										22€
									</Text>
								</View>

								<View style={dynamicStyles.itemRow}>
									<View style={dynamicStyles.itemInfo}>
										<Text style={dynamicStyles.itemName}>
											1× Frites
										</Text>
										<Text style={dynamicStyles.itemStatusReady}>
											✅ Prêt
										</Text>
									</View>
									<Text style={dynamicStyles.itemPrice}>
										5€
									</Text>
								</View>
							</View>
						</View>

						{/* Section Panier */}
						<View style={dynamicStyles.section}>
							<Text style={dynamicStyles.sectionTitle}>
								EN ATTENTE D'ENVOI (Panier)
							</Text>
							<View style={dynamicStyles.divider} />

							{cart.length === 0 ? (
								<Text style={dynamicStyles.emptyCart}>
									Panier vide — Tap pour ajouter des plats
								</Text>
							) : (
								cart.map((item) => (
									<View
										key={item.tempId}
										style={dynamicStyles.cartItemRow}
									>
										<View style={dynamicStyles.cartItemInfo}>
											<Text
												style={dynamicStyles.cartItemName}
											>
												{item.quantity}×{" "}
												{item.name}
											</Text>
											<Text
												style={dynamicStyles.cartItemPrice}
											>
												{(
													item.price * item.quantity
												).toFixed(2)}
												€
											</Text>
										</View>

										<View
											style={dynamicStyles.qtyControls}
										>
											<TouchableOpacity
												onPress={() =>
													actions.setQty(
														item.tempId,
														item.quantity -
															1,
													)
												}
											>
												<Text
													style={
														dynamicStyles.qtyButton
													}
												>
													−
												</Text>
											</TouchableOpacity>
											<Text
												style={
													dynamicStyles.qtyDisplay
												}
											>
												{item.quantity}
											</Text>
											<TouchableOpacity
												onPress={() =>
													actions.setQty(
														item.tempId,
														item.quantity +
															1,
													)
												}
											>
												<Text
													style={
														dynamicStyles.qtyButton
													}
												>
													+
												</Text>
											</TouchableOpacity>

											<TouchableOpacity
												onPress={() =>
													actions.removeItem(
														item.tempId,
													)
												}
											>
												<Ionicons
													name="trash-outline"
													size={18}
													color={THEME.colors.text.muted}
												/>
											</TouchableOpacity>
										</View>
									</View>
								))
							)}
						</View>

						{/* Total */}
						<View style={dynamicStyles.totalSection}>
							<Text style={dynamicStyles.totalLabel}>
								Total commandé:
							</Text>
							<Text style={dynamicStyles.totalValue}>
								{cartTotal.toFixed(2)}€
							</Text>
						</View>
					</ScrollView>

					{/* Actions */}
					<View style={dynamicStyles.actionsGrid}>
						<TouchableOpacity
							onPress={() => setShowMenuPicker(true)}
							style={dynamicStyles.actionButton}
						>
							<Text style={dynamicStyles.actionButtonText}>
								+ AJOUTER DES PLATS
							</Text>
						</TouchableOpacity>

						<TouchableOpacity
							onPress={handleSendToCook}
							disabled={isSending || cart.length === 0}
							style={[
								dynamicStyles.actionButton,
								dynamicStyles.actionButtonPrimary,
							]}
						>
							{isSending ? (
								<ActivityIndicator
									color={THEME.colors.background.dark}
									size="small"
								/>
							) : (
								<Text
									style={[
										dynamicStyles.actionButtonText,
										dynamicStyles.actionButtonTextPrimary,
									]}
								>
									📤 ENVOYER ({cartItemsCount})
								</Text>
							)}
						</TouchableOpacity>

						<TouchableOpacity
							onPress={handleRequestBill}
							style={dynamicStyles.actionButton}
						>
							<Text style={dynamicStyles.actionButtonText}>
								💶 DEMANDER ADDITION
							</Text>
						</TouchableOpacity>

						<TouchableOpacity
							onPress={() => setShowEncaisser(true)}
							disabled={isClosing}
							style={[
								dynamicStyles.actionButton,
								dynamicStyles.actionButtonDanger,
							]}
						>
							{isClosing ? (
								<ActivityIndicator
									color={THEME.colors.background.dark}
									size="small"
								/>
							) : (
								<Text
									style={[
										dynamicStyles.actionButtonText,
										dynamicStyles.actionButtonTextDanger,
									]}
								>
									✅ ENCAISSER & LIBÉRER
								</Text>
							)}
						</TouchableOpacity>
					</View>

					{/* Modales */}
					{showMenuPicker && (
						<MenuPickerModal
							visible={showMenuPicker}
							onClose={() => setShowMenuPicker(false)}
							tableId={tableId}
						/>
					)}

					{showEncaisser && (
						<EncaisserModal
							visible={showEncaisser}
							onClose={() => setShowEncaisser(false)}
							total={cartTotal}
							onEncaisser={handleEncaisser}
						/>
					)}
				</View>
			</BlurView>
		</Modal>
	);
};

const createStyles = (THEME) =>
	StyleSheet.create({
		blur: {
			flex: 1,
			justifyContent: "flex-end",
		},

		container: {
			maxHeight: "90%",
			backgroundColor: THEME.colors.background.dark,
			borderTopLeftRadius: 20,
			borderTopRightRadius: 20,
			flexDirection: "column",
		},

		header: {
			flexDirection: "row",
			alignItems: "center",
			paddingHorizontal: 16,
			paddingVertical: 12,
			gap: 12,
		},

		closeButton: {
			padding: 8,
		},

		headerTitle: {
			flex: 1,
			fontSize: 18,
			fontWeight: "700",
			color: THEME.colors.text.primary,
		},

		headerSubtitle: {
			fontSize: 12,
			color: THEME.colors.text.muted,
		},

		centeredView: {
			flex: 1,
			justifyContent: "center",
			alignItems: "center",
		},

		loadingText: {
			marginTop: 12,
			fontSize: 14,
			color: THEME.colors.text.secondary,
		},

		statusBadge: {
			paddingHorizontal: 16,
			paddingVertical: 8,
			backgroundColor: `rgba(245, 158, 11, 0.05)`,
			borderBottomWidth: 1,
			borderBottomColor: THEME.colors.border.subtle,
		},

		statusLabel: {
			fontSize: 12,
			fontWeight: "700",
			color: THEME.colors.text.primary,
		},

		statusTime: {
			fontSize: 11,
			color: THEME.colors.text.muted,
			marginTop: 4,
		},

		content: {
			flex: 1,
			paddingHorizontal: 16,
			paddingVertical: 12,
		},

		section: {
			marginBottom: 20,
		},

		sectionTitle: {
			fontSize: 13,
			fontWeight: "700",
			color: THEME.colors.text.primary,
			flexDirection: "row",
			marginBottom: 8,
		},

		totalAmount: {
			marginLeft: "auto",
			color: THEME.colors.primary.amber,
		},

		divider: {
			height: 1,
			backgroundColor: THEME.colors.border.subtle,
			marginBottom: 12,
		},

		sentItems: {
			gap: 8,
		},

		itemRow: {
			flexDirection: "row",
			justifyContent: "space-between",
			paddingVertical: 8,
			paddingHorizontal: 8,
			backgroundColor: THEME.colors.background.card,
			borderRadius: 8,
		},

		itemInfo: {
			flex: 1,
		},

		itemName: {
			fontSize: 13,
			fontWeight: "600",
			color: THEME.colors.text.primary,
			marginBottom: 4,
		},

		itemStatus: {
			fontSize: 11,
			color: THEME.colors.text.muted,
		},

		itemStatusReady: {
			fontSize: 11,
			color: THEME.colors.primary.amber,
		},

		itemPrice: {
			fontSize: 13,
			fontWeight: "700",
			color: THEME.colors.text.secondary,
		},

		emptyCart: {
			fontSize: 12,
			color: THEME.colors.text.muted,
			textAlign: "center",
			paddingVertical: 20,
		},

		cartItemRow: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			paddingVertical: 8,
			paddingHorizontal: 8,
			backgroundColor: THEME.colors.background.card,
			borderRadius: 8,
			marginBottom: 8,
		},

		cartItemInfo: {
			flex: 1,
		},

		cartItemName: {
			fontSize: 12,
			fontWeight: "600",
			color: THEME.colors.text.primary,
		},

		cartItemPrice: {
			fontSize: 11,
			color: THEME.colors.text.muted,
			marginTop: 2,
		},

		qtyControls: {
			flexDirection: "row",
			alignItems: "center",
			gap: 6,
		},

		qtyButton: {
			fontSize: 16,
			fontWeight: "700",
			color: THEME.colors.primary.amber,
			paddingHorizontal: 8,
		},

		qtyDisplay: {
			fontSize: 12,
			fontWeight: "600",
			color: THEME.colors.text.primary,
			minWidth: 20,
			textAlign: "center",
		},

		totalSection: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			paddingVertical: 12,
			paddingHorizontal: 12,
			backgroundColor: `rgba(245, 158, 11, 0.1)`,
			borderRadius: 8,
			marginBottom: 12,
		},

		totalLabel: {
			fontSize: 13,
			fontWeight: "600",
			color: THEME.colors.text.secondary,
		},

		totalValue: {
			fontSize: 18,
			fontWeight: "700",
			color: THEME.colors.primary.amber,
		},

		actionsGrid: {
			paddingHorizontal: 16,
			paddingVertical: 12,
			gap: 8,
			borderTopWidth: 1,
			borderTopColor: THEME.colors.border.subtle,
		},

		actionButton: {
			paddingVertical: 12,
			paddingHorizontal: 16,
			borderRadius: 8,
			backgroundColor: THEME.colors.background.card,
			borderWidth: 1,
			borderColor: THEME.colors.border.subtle,
		},

		actionButtonPrimary: {
			backgroundColor: THEME.colors.primary.amber,
			borderColor: THEME.colors.primary.amber,
		},

		actionButtonDanger: {
			backgroundColor: "rgba(76, 175, 80, 0.2)",
			borderColor: "rgba(76, 175, 80, 0.5)",
		},

		actionButtonText: {
			fontSize: 13,
			fontWeight: "700",
			color: THEME.colors.text.primary,
			textAlign: "center",
		},

		actionButtonTextPrimary: {
			color: THEME.colors.background.dark,
		},

		actionButtonTextDanger: {
			color: "#4CAF50",
		},
	});

export default TableDetailModal;
