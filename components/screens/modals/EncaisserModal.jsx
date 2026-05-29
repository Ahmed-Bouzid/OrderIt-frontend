/**
 * 🏪 EncaisserModal.jsx — Modal d'encaissement avec réductions
 *
 * Page principale : Total + Mode paiement + Bouton "Réductions" (optionnel)
 * Page réductions : Formulaire pour ajouter/supprimer des réductions
 * Page reason : Si total = 0€, justification obligatoire
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
	{ id: "test", label: "Test / Formation", emoji: "🧪" },
];

const EncaisserModal = ({
	visible,
	onClose,
	total,
	orders = [],
	onEncaisser,
}) => {
	const THEME = useTheme();

	// Navigation : "main" | "discounts" | "reason"
	const [page, setPage] = useState("main");
	const [discounts, setDiscounts] = useState([]);
	const [selectedMethod, setSelectedMethod] = useState(null);
	const [selectedReason, setSelectedReason] = useState(null);
	const [isProcessing, setIsProcessing] = useState(false);

	// Formulaire de réduction
	const [addingDiscount, setAddingDiscount] = useState(false);
	const [discountType, setDiscountType] = useState(null);
	const [discountValue, setDiscountValue] = useState("");
	const [discountReason, setDiscountReason] = useState(null);
	const [discountDescription, setDiscountDescription] = useState("");
	const [selectedOrder, setSelectedOrder] = useState(null);
	const [selectedItemIndex, setSelectedItemIndex] = useState(null);

	const dynamicStyles = useMemo(() => createStyles(THEME), [THEME]);

	// Calculer le total final après réductions
	const finalTotal = useMemo(() => {
		let subtotal = total;

		for (const discount of discounts) {
			if (discount.type === "percentage") {
				const amount = (subtotal * discount.value) / 100;
				subtotal -= amount;
			} else if (discount.type === "fixed_amount") {
				subtotal -= Math.min(discount.value, subtotal);
			} else if (discount.type === "item_removal") {
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
		setPage("main");
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

	// Confirmer l'encaissement
	const handleConfirm = async () => {
		const isZero = finalTotal === 0;

		// Si 0€ → demander la raison
		if (isZero && !selectedReason) {
			setPage("reason");
			return;
		}

		// Si non-0€ → nécessite un mode de paiement
		if (!isZero && !selectedMethod) return;

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

	// Ajouter une réduction
	const handleAddDiscount = () => {
		if (!discountType || !discountReason) {
			Alert.alert("Erreur", "Sélectionnez un type et une raison");
			return;
		}

		if (discountType === "percentage") {
			const val = parseFloat(discountValue);
			if (isNaN(val) || val <= 0 || val > 100) {
				Alert.alert("Erreur", "Pourcentage entre 1 et 100");
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

	const handleRemoveDiscount = (index) => {
		setDiscounts(discounts.filter((_, i) => i !== index));
	};

	if (!visible) return null;

	// ─── PAGE PRINCIPALE ──────────────────────────────────────────────────
	const renderMainPage = () => {
		const isZero = finalTotal === 0;

		return (
			<View style={dynamicStyles.card}>
				<Text style={dynamicStyles.title}>💳 Encaissement</Text>

				{/* Total */}
				<View style={dynamicStyles.totalBox}>
					<View style={dynamicStyles.totalRow}>
						<Text style={dynamicStyles.totalLabel}>
							Montant à encaisser :
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

					{/* Si réductions appliquées → afficher détail */}
					{discounts.length > 0 && (
						<>
							<View style={dynamicStyles.separator} />
							<View style={dynamicStyles.detailRow}>
								<Text style={dynamicStyles.detailLabel}>
									Sous-total :
								</Text>
								<Text style={dynamicStyles.detailValue}>
									{total.toFixed(2)}€
								</Text>
							</View>
							<View style={dynamicStyles.detailRow}>
								<Text style={dynamicStyles.discountLabel}>
									Réductions ({discounts.length}) :
								</Text>
								<Text style={dynamicStyles.discountValue}>
									-{(total - finalTotal).toFixed(2)}€
								</Text>
							</View>
						</>
					)}
				</View>

				{/* Bouton Réductions */}
				<TouchableOpacity
					onPress={() => setPage("discounts")}
					style={dynamicStyles.discountButton}
				>
					<Ionicons
						name="pricetag-outline"
						size={20}
						color={THEME.colors.primary.amber}
					/>
					<Text style={dynamicStyles.discountButtonText}>
						{discounts.length > 0
							? `Modifier les réductions (${discounts.length})`
							: "Ajouter une réduction (optionnel)"}
					</Text>
					<Ionicons
						name="chevron-forward"
						size={18}
						color={THEME.colors.text.muted}
					/>
				</TouchableOpacity>

				{/* Modes de paiement (si total > 0€) */}
				{!isZero && (
					<>
						<Text style={dynamicStyles.modeLabel}>
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
								size={28}
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
								size={28}
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
						onPress={handleClose}
						disabled={isProcessing}
						style={dynamicStyles.cancelButton}
					>
						<Text style={dynamicStyles.cancelButtonText}>
							Annuler
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

	// ─── PAGE RÉDUCTIONS ──────────────────────────────────────────────────
	const renderDiscountsPage = () => (
		<View style={dynamicStyles.card}>
			<View style={dynamicStyles.header}>
				<TouchableOpacity
					onPress={() => setPage("main")}
					style={dynamicStyles.backButton}
				>
					<Ionicons
						name="arrow-back"
						size={24}
						color={THEME.colors.text.primary}
					/>
				</TouchableOpacity>
				<Text style={dynamicStyles.title}>💸 Réductions</Text>
				<View style={{ width: 24 }} />
			</View>

			{/* Liste des réductions */}
			{discounts.length > 0 && (
				<ScrollView
					style={{ maxHeight: 200, marginBottom: 16 }}
					showsVerticalScrollIndicator={false}
				>
					{discounts.map((d, idx) => {
						let label = "";
						if (d.type === "percentage") {
							label = `-${d.value}%`;
						} else if (d.type === "fixed_amount") {
							label = `-${d.value.toFixed(2)}€`;
						} else {
							const order = orders.find(
								(o) => o._id === d.orderId,
							);
							const item =
								order?.items[d.itemIndex];
							label = item
								? `${item.name} supprimé`
								: "Plat supprimé";
						}

						return (
							<View
								key={idx}
								style={dynamicStyles.discountItem}
							>
								<View style={{ flex: 1 }}>
									<Text
										style={
											dynamicStyles.discountItemLabel
										}
									>
										{label}
									</Text>
									<Text
										style={
											dynamicStyles.discountItemReason
										}
									>
										{DISCOUNT_REASONS.find(
											(r) =>
												r.id === d.reason,
										)?.emoji || "📝"}{" "}
										{DISCOUNT_REASONS.find(
											(r) =>
												r.id === d.reason,
										)?.label || d.reason}
									</Text>
								</View>
								<TouchableOpacity
									onPress={() =>
										handleRemoveDiscount(idx)
									}
								>
									<Ionicons
										name="close-circle"
										size={28}
										color="#EF4444"
									/>
								</TouchableOpacity>
							</View>
						);
					})}
				</ScrollView>
			)}

			{/* Formulaire d'ajout */}
			{!addingDiscount ? (
				<TouchableOpacity
					onPress={() => setAddingDiscount(true)}
					style={dynamicStyles.addButton}
				>
					<Ionicons
						name="add-circle-outline"
						size={24}
						color={THEME.colors.primary.amber}
					/>
					<Text style={dynamicStyles.addButtonText}>
						Ajouter une réduction
					</Text>
				</TouchableOpacity>
			) : (
				<View style={dynamicStyles.form}>
					{/* Type de réduction */}
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
					{discountType &&
						discountType !== "item_removal" && (
							<>
								<Text style={dynamicStyles.formLabel}>
									Valeur :
								</Text>
								<TextInput
									style={dynamicStyles.input}
									placeholder={
										discountType ===
										"percentage"
											? "Ex: 10"
											: "Ex: 5.00"
									}
									placeholderTextColor={
										THEME.colors.text.muted
									}
									keyboardType="decimal-pad"
									value={discountValue}
									onChangeText={
										setDiscountValue
									}
								/>
							</>
						)}

					{/* Sélection de plat (si item_removal) */}
					{discountType === "item_removal" && (
						<ScrollView
							style={{ maxHeight: 150 }}
							showsVerticalScrollIndicator={false}
						>
							{orders.flatMap((order) =>
								order.items.map(
									(item, idx) => {
										const isSelected =
											selectedOrder ===
												order._id &&
											selectedItemIndex ===
												idx;
										return (
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
													isSelected &&
														dynamicStyles.itemButtonActive,
												]}
											>
												<Text
													style={
														dynamicStyles.itemButtonText
													}
												>
													{
														item.name
													}{" "}
													(
													{
														item.quantity
													}
													x){" "}
													-{" "}
													{item.price.toFixed(
														2,
													)}
													€
												</Text>
												{isSelected && (
													<Ionicons
														name="checkmark-circle"
														size={
															20
														}
														color={
															THEME
																.colors
																.background
																.dark
														}
													/>
												)}
											</TouchableOpacity>
										);
									},
								),
							)}
						</ScrollView>
					)}

					{/* Raison */}
					{discountType && (
						<>
							<Text style={dynamicStyles.formLabel}>
								Raison :
							</Text>
							<ScrollView
								style={{ maxHeight: 200 }}
								showsVerticalScrollIndicator={
									false
								}
							>
								{DISCOUNT_REASONS.map((r) => {
									const isSelected =
										discountReason ===
										r.id;
									return (
										<TouchableOpacity
											key={r.id}
											onPress={() =>
												setDiscountReason(
													r.id,
												)
											}
											style={[
												dynamicStyles.reasonButton,
												isSelected &&
													dynamicStyles.reasonButtonActive,
											]}
										>
											<Text
												style={
													dynamicStyles.reasonEmoji
												}
											>
												{r.emoji}
											</Text>
											<Text
												style={[
													dynamicStyles.reasonLabel,
													isSelected &&
														dynamicStyles.reasonLabelActive,
												]}
											>
												{r.label}
											</Text>
											{isSelected && (
												<Ionicons
													name="checkmark-circle"
													size={
														20
													}
													color={
														THEME
															.colors
															.background
															.dark
													}
												/>
											)}
										</TouchableOpacity>
									);
								})}
							</ScrollView>

							{/* Description si "Autre" */}
							{discountReason === "autre" && (
								<>
									<Text
										style={
											dynamicStyles.formLabel
										}
									>
										Description :
									</Text>
									<TextInput
										style={
											dynamicStyles.input
										}
										placeholder="Ex: Plat brûlé"
										placeholderTextColor={
											THEME.colors.text
												.muted
										}
										value={
											discountDescription
										}
										onChangeText={
											setDiscountDescription
										}
									/>
								</>
							)}
						</>
					)}

					{/* Buttons */}
					<View style={dynamicStyles.formButtons}>
						<TouchableOpacity
							onPress={() => {
								setAddingDiscount(false);
								setDiscountType(null);
								setDiscountValue("");
								setDiscountReason(null);
								setDiscountDescription("");
								setSelectedOrder(null);
								setSelectedItemIndex(null);
							}}
							style={dynamicStyles.formCancelButton}
						>
							<Text
								style={
									dynamicStyles.formCancelButtonText
								}
							>
								Annuler
							</Text>
						</TouchableOpacity>
						<TouchableOpacity
							onPress={handleAddDiscount}
							style={
								dynamicStyles.formConfirmButton
							}
						>
							<Text
								style={
									dynamicStyles.formConfirmButtonText
								}
							>
								Ajouter
							</Text>
						</TouchableOpacity>
					</View>
				</View>
			)}
		</View>
	);

	// ─── PAGE RAISON 0€ ───────────────────────────────────────────────────
	const renderReasonPage = () => (
		<View style={dynamicStyles.card}>
			<Text style={dynamicStyles.title}>⚠️ Total à 0,00 €</Text>
			<Text style={dynamicStyles.subtitle}>
				Pourquoi cette table est-elle à 0€ ?
			</Text>

			<ScrollView
				style={{ maxHeight: 300 }}
				showsVerticalScrollIndicator={false}
			>
				{ZERO_REASONS.map((r) => (
					<TouchableOpacity
						key={r.id}
						onPress={() => setSelectedReason(r.id)}
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
								size={22}
								color={THEME.colors.background.dark}
							/>
						)}
					</TouchableOpacity>
				))}
			</ScrollView>

			<View style={dynamicStyles.buttonsRow}>
				<TouchableOpacity
					onPress={() => setPage("main")}
					disabled={isProcessing}
					style={dynamicStyles.cancelButton}
				>
					<Text style={dynamicStyles.cancelButtonText}>
						Retour
					</Text>
				</TouchableOpacity>

				<TouchableOpacity
					onPress={handleConfirm}
					disabled={!selectedReason || isProcessing}
					style={[
						dynamicStyles.confirmButton,
						(!selectedReason || isProcessing) &&
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

	// ─── RENDER ───────────────────────────────────────────────────────────
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
					{page === "reason"
						? renderReasonPage()
						: page === "discounts"
							? renderDiscountsPage()
							: renderMainPage()}
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
			maxWidth: 440,
			alignSelf: "center",
			paddingVertical: 40,
		},

		card: {
			backgroundColor: THEME.colors.background.dark,
			borderRadius: 16,
			padding: 24,
			borderWidth: 1,
			borderColor: THEME.colors.border.subtle,
		},

		header: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			marginBottom: 16,
		},

		backButton: {
			padding: 4,
		},

		title: {
			fontSize: 22,
			fontWeight: "700",
			color: THEME.colors.text.primary,
			textAlign: "center",
		},

		subtitle: {
			fontSize: 14,
			color: THEME.colors.text.muted,
			marginBottom: 16,
			textAlign: "center",
		},

		totalBox: {
			backgroundColor: THEME.colors.background.card,
			borderRadius: 12,
			padding: 18,
			marginBottom: 16,
			borderWidth: 2,
			borderColor: THEME.colors.primary.amber,
		},

		totalRow: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
		},

		totalLabel: {
			fontSize: 15,
			fontWeight: "600",
			color: THEME.colors.text.secondary,
		},

		totalAmount: {
			fontSize: 28,
			fontWeight: "700",
			color: THEME.colors.primary.amber,
		},

		totalAmountZero: {
			color: "#94A3B8",
		},

		separator: {
			height: 1,
			backgroundColor: THEME.colors.border.subtle,
			marginVertical: 12,
		},

		detailRow: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			marginTop: 6,
		},

		detailLabel: {
			fontSize: 13,
			color: THEME.colors.text.muted,
		},

		detailValue: {
			fontSize: 15,
			fontWeight: "600",
			color: THEME.colors.text.primary,
		},

		discountLabel: {
			fontSize: 13,
			color: "#10B981",
		},

		discountValue: {
			fontSize: 15,
			fontWeight: "600",
			color: "#10B981",
		},

		discountButton: {
			flexDirection: "row",
			alignItems: "center",
			paddingVertical: 14,
			paddingHorizontal: 16,
			backgroundColor: THEME.colors.background.card,
			borderRadius: 10,
			borderWidth: 1,
			borderColor: THEME.colors.border.subtle,
			marginBottom: 16,
			gap: 10,
		},

		discountButtonText: {
			fontSize: 15,
			fontWeight: "600",
			color: THEME.colors.text.primary,
			flex: 1,
		},

		modeLabel: {
			fontSize: 15,
			fontWeight: "600",
			color: THEME.colors.text.secondary,
			marginBottom: 12,
		},

		methodButton: {
			flexDirection: "row",
			alignItems: "center",
			paddingVertical: 16,
			paddingHorizontal: 18,
			backgroundColor: THEME.colors.background.card,
			borderRadius: 10,
			borderWidth: 2,
			borderColor: THEME.colors.border.subtle,
			marginBottom: 12,
			gap: 14,
		},

		methodButtonActive: {
			backgroundColor: THEME.colors.primary.amber,
			borderColor: THEME.colors.primary.amber,
		},

		methodButtonText: {
			fontSize: 16,
			fontWeight: "600",
			color: THEME.colors.text.primary,
		},

		methodButtonTextActive: {
			color: THEME.colors.background.dark,
		},

		buttonsRow: {
			flexDirection: "row",
			gap: 12,
			marginTop: 16,
		},

		cancelButton: {
			flex: 1,
			paddingVertical: 14,
			paddingHorizontal: 20,
			borderRadius: 10,
			borderWidth: 1,
			borderColor: THEME.colors.border.subtle,
			alignItems: "center",
			justifyContent: "center",
		},

		cancelButtonText: {
			fontSize: 15,
			fontWeight: "700",
			color: THEME.colors.text.secondary,
		},

		confirmButton: {
			flex: 1,
			paddingVertical: 14,
			paddingHorizontal: 20,
			borderRadius: 10,
			backgroundColor: THEME.colors.primary.amber,
			alignItems: "center",
			justifyContent: "center",
		},

		confirmButtonDisabled: {
			opacity: 0.5,
		},

		confirmButtonText: {
			fontSize: 15,
			fontWeight: "700",
			color: THEME.colors.background.dark,
		},

		// ── PAGE RÉDUCTIONS ───────────────────────────────────────
		discountItem: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: THEME.colors.background.card,
			borderRadius: 10,
			padding: 14,
			marginBottom: 10,
			borderWidth: 1,
			borderColor: THEME.colors.border.subtle,
		},

		discountItemLabel: {
			fontSize: 16,
			fontWeight: "700",
			color: THEME.colors.text.primary,
			marginBottom: 4,
		},

		discountItemReason: {
			fontSize: 13,
			color: THEME.colors.text.muted,
		},

		addButton: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			paddingVertical: 14,
			borderRadius: 10,
			borderWidth: 2,
			borderStyle: "dashed",
			borderColor: THEME.colors.primary.amber,
			gap: 10,
		},

		addButtonText: {
			fontSize: 15,
			fontWeight: "600",
			color: THEME.colors.primary.amber,
		},

		form: {
			backgroundColor: THEME.colors.background.card,
			borderRadius: 10,
			padding: 16,
			borderWidth: 1,
			borderColor: THEME.colors.border.subtle,
		},

		formLabel: {
			fontSize: 14,
			fontWeight: "600",
			color: THEME.colors.text.secondary,
			marginBottom: 10,
			marginTop: 12,
		},

		typeButtons: {
			flexDirection: "row",
			gap: 10,
		},

		typeButton: {
			flex: 1,
			paddingVertical: 16,
			borderRadius: 8,
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
			fontSize: 16,
			fontWeight: "700",
			color: THEME.colors.text.primary,
		},

		typeButtonTextActive: {
			color: THEME.colors.background.dark,
		},

		input: {
			backgroundColor: THEME.colors.background.dark,
			borderRadius: 8,
			borderWidth: 1,
			borderColor: THEME.colors.border.subtle,
			paddingVertical: 12,
			paddingHorizontal: 14,
			fontSize: 15,
			color: THEME.colors.text.primary,
			marginBottom: 10,
		},

		itemButton: {
			flexDirection: "row",
			alignItems: "center",
			paddingVertical: 12,
			paddingHorizontal: 14,
			backgroundColor: THEME.colors.background.dark,
			borderRadius: 8,
			borderWidth: 1,
			borderColor: THEME.colors.border.subtle,
			marginBottom: 8,
		},

		itemButtonActive: {
			backgroundColor: THEME.colors.primary.amber,
			borderColor: THEME.colors.primary.amber,
		},

		itemButtonText: {
			fontSize: 14,
			color: THEME.colors.text.primary,
			flex: 1,
		},

		reasonButton: {
			flexDirection: "row",
			alignItems: "center",
			paddingVertical: 12,
			paddingHorizontal: 14,
			backgroundColor: THEME.colors.background.dark,
			borderRadius: 8,
			borderWidth: 1,
			borderColor: THEME.colors.border.subtle,
			marginBottom: 8,
		},

		reasonButtonActive: {
			backgroundColor: THEME.colors.primary.amber,
			borderColor: THEME.colors.primary.amber,
		},

		reasonEmoji: {
			fontSize: 18,
			marginRight: 12,
		},

		reasonLabel: {
			fontSize: 14,
			fontWeight: "600",
			color: THEME.colors.text.primary,
			flex: 1,
		},

		reasonLabelActive: {
			color: THEME.colors.background.dark,
		},

		formButtons: {
			flexDirection: "row",
			gap: 10,
			marginTop: 16,
		},

		formCancelButton: {
			flex: 1,
			paddingVertical: 12,
			paddingHorizontal: 16,
			borderRadius: 8,
			borderWidth: 1,
			borderColor: THEME.colors.border.subtle,
			alignItems: "center",
		},

		formCancelButtonText: {
			fontSize: 14,
			fontWeight: "700",
			color: THEME.colors.text.secondary,
		},

		formConfirmButton: {
			flex: 1,
			paddingVertical: 12,
			paddingHorizontal: 16,
			borderRadius: 8,
			backgroundColor: THEME.colors.primary.amber,
			alignItems: "center",
		},

		formConfirmButtonText: {
			fontSize: 14,
			fontWeight: "700",
			color: THEME.colors.background.dark,
		},

		// ── PAGE RAISON 0€ ────────────────────────────────────────
		optionButton: {
			flexDirection: "row",
			alignItems: "center",
			paddingVertical: 14,
			paddingHorizontal: 16,
			backgroundColor: THEME.colors.background.card,
			borderRadius: 10,
			borderWidth: 2,
			borderColor: THEME.colors.border.subtle,
			marginBottom: 10,
		},

		optionButtonActive: {
			backgroundColor: THEME.colors.primary.amber,
			borderColor: THEME.colors.primary.amber,
		},

		optionEmoji: {
			fontSize: 20,
			marginRight: 12,
		},

		optionLabel: {
			fontSize: 15,
			fontWeight: "600",
			color: THEME.colors.text.primary,
			flex: 1,
		},

		optionLabelActive: {
			color: THEME.colors.background.dark,
		},
	});

export default EncaisserModal;
