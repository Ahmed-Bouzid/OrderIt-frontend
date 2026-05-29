/**
 * 🏪 EncaisserModal.jsx — Modal d'encaissement avec réductions
 *
 * Flow :
 * 1. Discounts (optionnel) — ajouter des réductions
 * 2. Payment — choisir le mode de paiement
 * 3. Reason (si total = 0€) — justifier
 */

import React, { useState, useMemo } from "react";
import {
	Modal,
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ActivityIndicator,
	ScrollView,
	TextInput,
	Alert,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../hooks/useTheme";

const DISCOUNT_REASONS = [
	{ id: "geste_commercial", label: "Geste commercial", emoji: "🤝" },
	{ id: "erreur_cuisine", label: "Erreur cuisine", emoji: "👨‍🍳" },
	{ id: "erreur_service", label: "Erreur de service", emoji: "🔄" },
	{ id: "anniversaire", label: "Anniversaire", emoji: "🎂" },
	{ id: "client_fidele", label: "Client fidèle", emoji: "⭐" },
	{ id: "compensation", label: "Compensation", emoji: "💝" },
	{ id: "autre", label: "Autre", emoji: "📝" },
];

const ZERO_REASONS = [
	{ id: "offert", label: "Offert par la maison", emoji: "🎁" },
	{ id: "geste", label: "Geste commercial", emoji: "🤝" },
	{ id: "erreur", label: "Erreur de commande", emoji: "🔄" },
	{ id: "test", label: "Test / Formation interne", emoji: "🧪" },
];

const EncaisserModal = ({
	visible,
	onClose,
	total,
	orders = [], // Les commandes de la session (pour item_removal)
	onEncaisser,
}) => {
	const THEME = useTheme();

	// Steps : "discounts" | "payment" | "reason"
	const [step, setStep] = useState("discounts");
	const [discounts, setDiscounts] = useState([]);
	const [selectedMethod, setSelectedMethod] = useState(null);
	const [selectedReason, setSelectedReason] = useState(null);
	const [isProcessing, setIsProcessing] = useState(false);

	// Pour ajouter une nouvelle réduction
	const [addingDiscount, setAddingDiscount] = useState(false);
	const [discountType, setDiscountType] = useState(null); // "percentage" | "fixed_amount" | "item_removal"
	const [discountValue, setDiscountValue] = useState("");
	const [discountReason, setDiscountReason] = useState(null);
	const [discountDescription, setDiscountDescription] = useState("");
	const [selectedOrder, setSelectedOrder] = useState(null);
	const [selectedItemIndex, setSelectedItemIndex] = useState(null);

	const dynamicStyles = useMemo(() => createStyles(THEME), [THEME]);

	// Calculer le total après réductions
	const finalTotal = useMemo(() => {
		let subtotal = total;

		for (const discount of discounts) {
			if (discount.type === "percentage") {
				const amount = (subtotal * discount.value) / 100;
				subtotal -= amount;
			} else if (discount.type === "fixed_amount") {
				subtotal -= Math.min(discount.value, subtotal);
			} else if (discount.type === "item_removal") {
				// Récupérer le prix de l'item
				const order = orders.find((o) => o._id === discount.orderId);
				if (order && order.items[discount.itemIndex]) {
					const item = order.items[discount.itemIndex];
					subtotal -= item.price * item.quantity;
				}
			}
		}

		return Math.max(0, subtotal);
	}, [total, discounts, orders]);

	const handleReset = () => {
		setStep("discounts");
		setDiscounts([]);
		setSelectedMethod(null);
		setSelectedReason(null);
		setIsProcessing(false);
		setAddingDiscount(false);
		setDiscountType(null);
		setDiscountValue("");
		setDiscountReason(null);
		setDiscountDescription("");
		setSelectedOrder(null);
		setSelectedItemIndex(null);
	};

	const handleClose = () => {
		handleReset();
		onClose();
	};

	// Ajouter une réduction
	const handleAddDiscount = () => {
		if (!discountType || !discountReason) {
			Alert.alert("Erreur", "Sélectionnez un type et une raison");
			return;
		}

		// Validation selon le type
		if (discountType === "percentage") {
			const val = parseFloat(discountValue);
			if (isNaN(val) || val <= 0 || val > 100) {
				Alert.alert("Erreur", "Pourcentage invalide (1-100)");
				return;
			}
		} else if (discountType === "fixed_amount") {
			const val = parseFloat(discountValue);
			if (isNaN(val) || val <= 0) {
				Alert.alert("Erreur", "Montant invalide");
				return;
			}
		} else if (discountType === "item_removal") {
			if (!selectedOrder || selectedItemIndex === null) {
				Alert.alert("Erreur", "Sélectionnez un plat");
				return;
			}
		}

		// Construire l'objet discount
		const newDiscount = {
			type: discountType,
			value:
				discountType === "item_removal"
					? 0
					: parseFloat(discountValue),
			reason: discountReason,
			description:
				discountReason === "autre" ? discountDescription : "",
			...(discountType === "item_removal" && {
				orderId: selectedOrder,
				itemIndex: selectedItemIndex,
			}),
		};

		setDiscounts([...discounts, newDiscount]);
		setAddingDiscount(false);
		setDiscountType(null);
		setDiscountValue("");
		setDiscountReason(null);
		setDiscountDescription("");
		setSelectedOrder(null);
		setSelectedItemIndex(null);
	};

	// Retirer une réduction
	const handleRemoveDiscount = (index) => {
		setDiscounts(discounts.filter((_, i) => i !== index));
	};

	// Continuer vers l'étape paiement
	const handleContinueToPayment = () => {
		setStep("payment");
	};

	// Confirmer l'encaissement
	const handleConfirm = async () => {
		const isZero = finalTotal === 0;

		if (!isZero && !selectedMethod) return;

		// Pour 0€ → passer au step raison avant de confirmer
		if (isZero && step === "payment") {
			setStep("reason");
			return;
		}

		setIsProcessing(true);
		try {
			const method = isZero ? "cash" : selectedMethod;
			await onEncaisser(method, selectedReason, discounts);
			handleReset();
			onClose();
		} catch (err) {
			console.error("[EncaisserModal] Erreur:", err);
		} finally {
			setIsProcessing(false);
		}
	};

	if (!visible) return null;

	// ─── Step 3 : Raison 0€ ───────────────────────────────────────────────
	const renderReasonStep = () => (
		<View style={dynamicStyles.card}>
			<Text style={dynamicStyles.title}>⚠️ Total à 0,00 €</Text>
			<Text style={dynamicStyles.subtitle}>
				Pourquoi ? (optionnel)
			</Text>

			<ScrollView
				style={{ maxHeight: 300 }}
				showsVerticalScrollIndicator={false}
			>
				{ZERO_REASONS.map((r) => (
					<TouchableOpacity
						key={r.id}
						onPress={() =>
							setSelectedReason(
								selectedReason === r.id ? null : r.id,
							)
						}
						style={[
							dynamicStyles.optionButton,
							selectedReason === r.id &&
								dynamicStyles.optionButtonActive,
						]}
					>
						<Text style={dynamicStyles.optionEmoji}>
							{r.emoji}
						</Text>
						<Text
							style={[
								dynamicStyles.optionLabel,
								selectedReason === r.id &&
									dynamicStyles.optionLabelActive,
							]}
						>
							{r.label}
						</Text>
						{selectedReason === r.id && (
							<Ionicons
								name="checkmark-circle"
								size={18}
								color={THEME.colors.background.dark}
							/>
						)}
					</TouchableOpacity>
				))}
			</ScrollView>

			<View style={dynamicStyles.buttonsRow}>
				<TouchableOpacity
					onPress={() => setStep("payment")}
					disabled={isProcessing}
					style={dynamicStyles.cancelButton}
				>
					<Text style={dynamicStyles.cancelButtonText}>
						Retour
					</Text>
				</TouchableOpacity>

				<TouchableOpacity
					onPress={handleConfirm}
					disabled={isProcessing}
					style={dynamicStyles.confirmButton}
				>
					{isProcessing ? (
						<ActivityIndicator
							color={THEME.colors.background.dark}
							size="small"
						/>
					) : (
						<Text style={dynamicStyles.confirmButtonText}>
							Confirmer & Libérer
						</Text>
					)}
				</TouchableOpacity>
			</View>
		</View>
	);

	// ─── Step 2 : Paiement ────────────────────────────────────────────────
	const renderPaymentStep = () => {
		const isZero = finalTotal === 0;

		return (
			<View style={dynamicStyles.card}>
				<Text style={dynamicStyles.title}>💳 Encaissement</Text>

				{/* Total */}
				<View style={dynamicStyles.totalBox}>
					{total !== finalTotal && (
						<View style={dynamicStyles.totalRow}>
							<Text style={dynamicStyles.totalLabelSmall}>
								Sous-total :
							</Text>
							<Text style={dynamicStyles.totalAmountSmall}>
								{total.toFixed(2)}€
							</Text>
						</View>
					)}

					{discounts.length > 0 && (
						<View style={dynamicStyles.totalRow}>
							<Text
								style={[
									dynamicStyles.totalLabelSmall,
									dynamicStyles.totalLabelDiscount,
								]}
							>
								Réductions ({discounts.length}) :
							</Text>
							<Text style={dynamicStyles.totalAmountDiscount}>
								-
								{(total - finalTotal).toFixed(2)}€
							</Text>
						</View>
					)}

					<View style={dynamicStyles.separator} />

					<View style={dynamicStyles.totalRow}>
						<Text style={dynamicStyles.totalLabel}>
							Total final :
						</Text>
						<Text
							style={[
								dynamicStyles.totalAmount,
								isZero && dynamicStyles.totalAmountZero,
							]}
						>
							{finalTotal.toFixed(2)}€
						</Text>
					</View>
				</View>

				{/* Mode selection — masqué si 0€ */}
				{!isZero && (
					<>
						<Text style={dynamicStyles.sectionLabel}>
							Mode de paiement :
						</Text>

						<TouchableOpacity
							onPress={() => setSelectedMethod("cash")}
							style={[
								dynamicStyles.methodButton,
								selectedMethod === "cash" &&
									dynamicStyles.methodButtonActive,
							]}
						>
							<Ionicons
								name="cash-outline"
								size={24}
								color={
									selectedMethod === "cash"
										? THEME.colors.background.dark
										: THEME.colors.primary.amber
								}
							/>
							<Text
								style={[
									dynamicStyles.methodButtonText,
									selectedMethod === "cash" &&
										dynamicStyles.methodButtonTextActive,
								]}
							>
								Espèces
							</Text>
						</TouchableOpacity>

						<TouchableOpacity
							onPress={() =>
								setSelectedMethod("card_offline")
							}
							style={[
								dynamicStyles.methodButton,
								selectedMethod === "card_offline" &&
									dynamicStyles.methodButtonActive,
							]}
						>
							<Ionicons
								name="card-outline"
								size={24}
								color={
									selectedMethod === "card_offline"
										? THEME.colors.background.dark
										: THEME.colors.primary.amber
								}
							/>
							<Text
								style={[
									dynamicStyles.methodButtonText,
									selectedMethod === "card_offline" &&
										dynamicStyles.methodButtonTextActive,
								]}
							>
								Carte (physique)
							</Text>
						</TouchableOpacity>
					</>
				)}

				{/* Buttons */}
				<View style={dynamicStyles.buttonsRow}>
					<TouchableOpacity
						onPress={() => setStep("discounts")}
						disabled={isProcessing}
						style={dynamicStyles.cancelButton}
					>
						<Text style={dynamicStyles.cancelButtonText}>
							Retour
						</Text>
					</TouchableOpacity>

					<TouchableOpacity
						onPress={handleConfirm}
						disabled={
							(!isZero && !selectedMethod) || isProcessing
						}
						style={[
							dynamicStyles.confirmButton,
							((!isZero && !selectedMethod) ||
								isProcessing) &&
								dynamicStyles.confirmButtonDisabled,
						]}
					>
						{isProcessing ? (
							<ActivityIndicator
								color={THEME.colors.background.dark}
								size="small"
							/>
						) : (
							<Text style={dynamicStyles.confirmButtonText}>
								Confirmer & Libérer
							</Text>
						)}
					</TouchableOpacity>
				</View>
			</View>
		);
	};

	// ─── Step 1 : Réductions ──────────────────────────────────────────────
	const renderDiscountsStep = () => (
		<View style={dynamicStyles.card}>
			<Text style={dynamicStyles.title}>💸 Réductions</Text>

			<View style={dynamicStyles.totalBox}>
				<View style={dynamicStyles.totalRow}>
					<Text style={dynamicStyles.totalLabelSmall}>
						Sous-total :
					</Text>
					<Text style={dynamicStyles.totalAmountSmall}>
						{total.toFixed(2)}€
					</Text>
				</View>

				{discounts.length > 0 && (
					<>
						<View style={dynamicStyles.separator} />
						<View style={dynamicStyles.totalRow}>
							<Text
								style={[
									dynamicStyles.totalLabelSmall,
									dynamicStyles.totalLabelDiscount,
								]}
							>
								Réductions :
							</Text>
							<Text style={dynamicStyles.totalAmountDiscount}>
								-{(total - finalTotal).toFixed(2)}€
							</Text>
						</View>
					</>
				)}

				<View style={dynamicStyles.separator} />

				<View style={dynamicStyles.totalRow}>
					<Text style={dynamicStyles.totalLabel}>
						Total final :
					</Text>
					<Text style={dynamicStyles.totalAmount}>
						{finalTotal.toFixed(2)}€
					</Text>
				</View>
			</View>

			{/* Liste des réductions */}
			{discounts.length > 0 && (
				<ScrollView
					style={{ maxHeight: 200, marginBottom: 12 }}
					showsVerticalScrollIndicator={false}
				>
					{discounts.map((d, idx) => (
						<View
							key={idx}
							style={dynamicStyles.discountItem}
						>
							<View style={{ flex: 1 }}>
								<Text
									style={dynamicStyles.discountItemType}
								>
									{d.type === "percentage"
										? `${d.value}% de réduction`
										: d.type === "fixed_amount"
											? `${d.value.toFixed(2)}€ de réduction`
											: "Plat supprimé"}
								</Text>
								<Text
									style={dynamicStyles.discountItemReason}
								>
									{DISCOUNT_REASONS.find(
										(r) => r.id === d.reason,
									)?.label || d.reason}
								</Text>
							</View>
							<TouchableOpacity
								onPress={() => handleRemoveDiscount(idx)}
							>
								<Ionicons
									name="close-circle"
									size={22}
									color="#EF4444"
								/>
							</TouchableOpacity>
						</View>
					))}
				</ScrollView>
			)}

			{/* Formulaire d'ajout si actif */}
			{addingDiscount ? (
				<View style={dynamicStyles.addDiscountForm}>
					{/* Type */}
					<Text style={dynamicStyles.formLabel}>Type :</Text>
					<View style={dynamicStyles.typeButtons}>
						<TouchableOpacity
							onPress={() =>
								setDiscountType("percentage")
							}
							style={[
								dynamicStyles.typeButton,
								discountType === "percentage" &&
									dynamicStyles.typeButtonActive,
							]}
						>
							<Text
								style={[
									dynamicStyles.typeButtonText,
									discountType === "percentage" &&
										dynamicStyles.typeButtonTextActive,
								]}
							>
								%
							</Text>
						</TouchableOpacity>
						<TouchableOpacity
							onPress={() =>
								setDiscountType("fixed_amount")
							}
							style={[
								dynamicStyles.typeButton,
								discountType === "fixed_amount" &&
									dynamicStyles.typeButtonActive,
							]}
						>
							<Text
								style={[
									dynamicStyles.typeButtonText,
									discountType === "fixed_amount" &&
										dynamicStyles.typeButtonTextActive,
								]}
							>
								€
							</Text>
						</TouchableOpacity>
						<TouchableOpacity
							onPress={() =>
								setDiscountType("item_removal")
							}
							style={[
								dynamicStyles.typeButton,
								discountType === "item_removal" &&
									dynamicStyles.typeButtonActive,
							]}
						>
							<Text
								style={[
									dynamicStyles.typeButtonText,
									discountType === "item_removal" &&
										dynamicStyles.typeButtonTextActive,
								]}
							>
								Plat
							</Text>
						</TouchableOpacity>
					</View>

					{/* Valeur (si % ou €) */}
					{(discountType === "percentage" ||
						discountType === "fixed_amount") && (
						<>
							<Text style={dynamicStyles.formLabel}>
								Valeur :
							</Text>
							<TextInput
								value={discountValue}
								onChangeText={setDiscountValue}
								placeholder={
									discountType === "percentage"
										? "10"
										: "5.50"
								}
								keyboardType="numeric"
								style={dynamicStyles.input}
								placeholderTextColor={
									THEME.colors.text.muted
								}
							/>
						</>
					)}

					{/* Sélection plat (si item_removal) */}
					{discountType === "item_removal" &&
						orders.length > 0 && (
							<>
								<Text style={dynamicStyles.formLabel}>
									Plat :
								</Text>
								<ScrollView
									style={{ maxHeight: 120 }}
									showsVerticalScrollIndicator={false}
								>
									{orders.map((order) =>
										order.items.map((item, idx) => (
											<TouchableOpacity
												key={`${order._id}-${idx}`}
												onPress={() => {
													setSelectedOrder(
														order._id,
													);
													setSelectedItemIndex(
														idx,
													);
												}}
												style={[
													dynamicStyles.itemButton,
													selectedOrder ===
														order._id &&
														selectedItemIndex ===
															idx &&
														dynamicStyles.itemButtonActive,
												]}
											>
												<Text
													style={
														dynamicStyles.itemButtonText
													}
												>
													{item.name} (
													{item.quantity}
													× {item.price.toFixed(2)}
													€)
												</Text>
											</TouchableOpacity>
										)),
									)}
								</ScrollView>
							</>
						)}

					{/* Raison */}
					<Text style={dynamicStyles.formLabel}>Raison :</Text>
					<ScrollView
						style={{ maxHeight: 150 }}
						showsVerticalScrollIndicator={false}
					>
						{DISCOUNT_REASONS.map((r) => (
							<TouchableOpacity
								key={r.id}
								onPress={() =>
									setDiscountReason(r.id)
								}
								style={[
									dynamicStyles.reasonButtonSmall,
									discountReason === r.id &&
										dynamicStyles.reasonButtonSmallActive,
								]}
							>
								<Text
									style={dynamicStyles.reasonEmoji}
								>
									{r.emoji}
								</Text>
								<Text
									style={[
										dynamicStyles.reasonLabelSmall,
										discountReason === r.id &&
											dynamicStyles.reasonLabelSmallActive,
									]}
								>
									{r.label}
								</Text>
							</TouchableOpacity>
						))}
					</ScrollView>

					{/* Description (si autre) */}
					{discountReason === "autre" && (
						<>
							<Text style={dynamicStyles.formLabel}>
								Description :
							</Text>
							<TextInput
								value={discountDescription}
								onChangeText={setDiscountDescription}
								placeholder="Précisez..."
								style={dynamicStyles.input}
								placeholderTextColor={
									THEME.colors.text.muted
								}
							/>
						</>
					)}

					{/* Buttons */}
					<View style={dynamicStyles.buttonsRow}>
						<TouchableOpacity
							onPress={() => setAddingDiscount(false)}
							style={dynamicStyles.cancelButton}
						>
							<Text
								style={dynamicStyles.cancelButtonText}
							>
								Annuler
							</Text>
						</TouchableOpacity>

						<TouchableOpacity
							onPress={handleAddDiscount}
							style={dynamicStyles.confirmButton}
						>
							<Text
								style={dynamicStyles.confirmButtonText}
							>
								Ajouter
							</Text>
						</TouchableOpacity>
					</View>
				</View>
			) : (
				<TouchableOpacity
					onPress={() => setAddingDiscount(true)}
					style={dynamicStyles.addButton}
				>
					<Ionicons
						name="add-circle-outline"
						size={20}
						color={THEME.colors.primary.amber}
					/>
					<Text style={dynamicStyles.addButtonText}>
						Ajouter une réduction
					</Text>
				</TouchableOpacity>
			)}

			{/* Buttons navigation */}
			{!addingDiscount && (
				<View style={dynamicStyles.buttonsRow}>
					<TouchableOpacity
						onPress={handleClose}
						style={dynamicStyles.cancelButton}
					>
						<Text style={dynamicStyles.cancelButtonText}>
							Annuler
						</Text>
					</TouchableOpacity>

					<TouchableOpacity
						onPress={handleContinueToPayment}
						style={dynamicStyles.confirmButton}
					>
						<Text style={dynamicStyles.confirmButtonText}>
							Continuer →
						</Text>
					</TouchableOpacity>
				</View>
			)}
		</View>
	);

	return (
		<Modal
			visible={visible}
			transparent
			animationType="fade"
			onRequestClose={handleClose}
		>
			<BlurView intensity={95} style={dynamicStyles.blur}>
				<ScrollView
					contentContainerStyle={dynamicStyles.container}
					showsVerticalScrollIndicator={false}
				>
					{step === "reason"
						? renderReasonStep()
						: step === "payment"
							? renderPaymentStep()
							: renderDiscountsStep()}
				</ScrollView>
			</BlurView>
		</Modal>
	);
};

const createStyles = (THEME) =>
	StyleSheet.create({
		blur: {
			flex: 1,
			justifyContent: "center",
			alignItems: "center",
		},

		container: {
			width: "90%",
			maxWidth: 400,
			alignSelf: "center",
			paddingVertical: 40,
		},

		card: {
			backgroundColor: THEME.colors.background.dark,
			borderRadius: 16,
			padding: 20,
			borderWidth: 1,
			borderColor: THEME.colors.border.subtle,
		},

		title: {
			fontSize: 18,
			fontWeight: "700",
			color: THEME.colors.text.primary,
			marginBottom: 16,
			textAlign: "center",
		},

		subtitle: {
			fontSize: 13,
			color: THEME.colors.text.muted,
			marginBottom: 16,
			textAlign: "center",
		},

		totalBox: {
			backgroundColor: THEME.colors.background.card,
			borderRadius: 12,
			padding: 14,
			marginBottom: 16,
			borderWidth: 2,
			borderColor: THEME.colors.primary.amber,
		},

		totalRow: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			marginVertical: 4,
		},

		totalLabelSmall: {
			fontSize: 12,
			color: THEME.colors.text.muted,
		},

		totalAmountSmall: {
			fontSize: 14,
			fontWeight: "600",
			color: THEME.colors.text.primary,
		},

		totalLabelDiscount: {
			color: "#10B981",
		},

		totalAmountDiscount: {
			fontSize: 14,
			fontWeight: "600",
			color: "#10B981",
		},

		separator: {
			height: 1,
			backgroundColor: THEME.colors.border.subtle,
			marginVertical: 8,
		},

		totalLabel: {
			fontSize: 13,
			fontWeight: "600",
			color: THEME.colors.text.secondary,
		},

		totalAmount: {
			fontSize: 24,
			fontWeight: "700",
			color: THEME.colors.primary.amber,
		},

		totalAmountZero: {
			color: "#94A3B8",
		},

		sectionLabel: {
			fontSize: 13,
			fontWeight: "600",
			color: THEME.colors.text.secondary,
			marginBottom: 12,
		},

		methodButton: {
			flexDirection: "row",
			alignItems: "center",
			paddingVertical: 12,
			paddingHorizontal: 16,
			backgroundColor: THEME.colors.background.card,
			borderRadius: 8,
			borderWidth: 2,
			borderColor: THEME.colors.border.subtle,
			marginBottom: 10,
			gap: 12,
		},

		methodButtonActive: {
			backgroundColor: THEME.colors.primary.amber,
			borderColor: THEME.colors.primary.amber,
		},

		methodButtonText: {
			fontSize: 14,
			fontWeight: "600",
			color: THEME.colors.text.primary,
		},

		methodButtonTextActive: {
			color: THEME.colors.background.dark,
		},

		buttonsRow: {
			flexDirection: "row",
			gap: 10,
			marginTop: 16,
		},

		cancelButton: {
			flex: 1,
			paddingVertical: 12,
			paddingHorizontal: 16,
			borderRadius: 8,
			borderWidth: 1,
			borderColor: THEME.colors.border.subtle,
			alignItems: "center",
			justifyContent: "center",
		},

		cancelButtonText: {
			fontSize: 13,
			fontWeight: "700",
			color: THEME.colors.text.secondary,
			textAlign: "center",
		},

		confirmButton: {
			flex: 1,
			paddingVertical: 12,
			paddingHorizontal: 16,
			borderRadius: 8,
			backgroundColor: THEME.colors.primary.amber,
			alignItems: "center",
			justifyContent: "center",
		},

		confirmButtonDisabled: {
			opacity: 0.5,
		},

		confirmButtonText: {
			fontSize: 13,
			fontWeight: "700",
			color: THEME.colors.background.dark,
			textAlign: "center",
		},

		// ── Discounts step ────────────────────────────────────────
		discountItem: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: THEME.colors.background.card,
			borderRadius: 8,
			padding: 10,
			marginBottom: 8,
		},

		discountItemType: {
			fontSize: 13,
			fontWeight: "600",
			color: THEME.colors.text.primary,
			marginBottom: 2,
		},

		discountItemReason: {
			fontSize: 11,
			color: THEME.colors.text.muted,
		},

		addButton: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			paddingVertical: 12,
			paddingHorizontal: 16,
			borderRadius: 8,
			borderWidth: 2,
			borderStyle: "dashed",
			borderColor: THEME.colors.primary.amber,
			gap: 8,
			marginBottom: 16,
		},

		addButtonText: {
			fontSize: 13,
			fontWeight: "600",
			color: THEME.colors.primary.amber,
		},

		// ── Add discount form ─────────────────────────────────────
		addDiscountForm: {
			backgroundColor: THEME.colors.background.card,
			borderRadius: 8,
			padding: 12,
			marginBottom: 12,
		},

		formLabel: {
			fontSize: 12,
			fontWeight: "600",
			color: THEME.colors.text.secondary,
			marginBottom: 8,
			marginTop: 8,
		},

		typeButtons: {
			flexDirection: "row",
			gap: 8,
			marginBottom: 8,
		},

		typeButton: {
			flex: 1,
			paddingVertical: 10,
			borderRadius: 6,
			borderWidth: 2,
			borderColor: THEME.colors.border.subtle,
			alignItems: "center",
			justifyContent: "center",
			backgroundColor: THEME.colors.background.dark,
		},

		typeButtonActive: {
			backgroundColor: THEME.colors.primary.amber,
			borderColor: THEME.colors.primary.amber,
		},

		typeButtonText: {
			fontSize: 12,
			fontWeight: "600",
			color: THEME.colors.text.primary,
		},

		typeButtonTextActive: {
			color: THEME.colors.background.dark,
		},

		input: {
			backgroundColor: THEME.colors.background.dark,
			borderRadius: 6,
			paddingVertical: 10,
			paddingHorizontal: 12,
			borderWidth: 1,
			borderColor: THEME.colors.border.subtle,
			fontSize: 14,
			color: THEME.colors.text.primary,
			marginBottom: 8,
		},

		itemButton: {
			paddingVertical: 10,
			paddingHorizontal: 12,
			backgroundColor: THEME.colors.background.dark,
			borderRadius: 6,
			borderWidth: 1,
			borderColor: THEME.colors.border.subtle,
			marginBottom: 6,
		},

		itemButtonActive: {
			backgroundColor: THEME.colors.primary.amber,
			borderColor: THEME.colors.primary.amber,
		},

		itemButtonText: {
			fontSize: 12,
			color: THEME.colors.text.primary,
		},

		reasonButtonSmall: {
			flexDirection: "row",
			alignItems: "center",
			paddingVertical: 10,
			paddingHorizontal: 12,
			backgroundColor: THEME.colors.background.dark,
			borderRadius: 6,
			borderWidth: 1,
			borderColor: THEME.colors.border.subtle,
			marginBottom: 6,
		},

		reasonButtonSmallActive: {
			backgroundColor: THEME.colors.primary.amber,
			borderColor: THEME.colors.primary.amber,
		},

		reasonEmoji: {
			fontSize: 16,
			marginRight: 10,
		},

		reasonLabelSmall: {
			fontSize: 12,
			fontWeight: "600",
			color: THEME.colors.text.primary,
			flex: 1,
		},

		reasonLabelSmallActive: {
			color: THEME.colors.background.dark,
		},

		// ── Reason step (0€) ──────────────────────────────────────
		optionButton: {
			flexDirection: "row",
			alignItems: "center",
			paddingVertical: 13,
			paddingHorizontal: 16,
			backgroundColor: THEME.colors.background.card,
			borderRadius: 10,
			borderWidth: 2,
			borderColor: THEME.colors.border.subtle,
			marginBottom: 8,
		},

		optionButtonActive: {
			backgroundColor: THEME.colors.primary.amber,
			borderColor: THEME.colors.primary.amber,
		},

		optionEmoji: {
			fontSize: 18,
			marginRight: 12,
		},

		optionLabel: {
			fontSize: 14,
			fontWeight: "600",
			color: THEME.colors.text.primary,
			flex: 1,
		},

		optionLabelActive: {
			color: THEME.colors.background.dark,
		},
	});

export default EncaisserModal;
