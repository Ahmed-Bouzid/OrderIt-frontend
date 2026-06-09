/**
 * TableDetailModal.jsx — Détail table Comptoir
 *
 * Modal centrée (style ServerPickerModal) :
 *   Header : Table X · N pers. · Xmin  +  × fermer
 *   Status pill · Items envoyés · Cart · Total
 *   Actions 2×2
 */

import React, { useState, useMemo } from "react";
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
	TextInput,
	Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../../../hooks/useTheme";
import useCounterTable from "../../../hooks/useCounterTable";
import useUserStore from "../../../src/stores/useUserStore";
import MenuPickerModal from "./MenuPickerModal";

const IS_PHONE = Dimensions.get("window").width < 600;

// ─── Constantes pour réductions ──────────────────────────────────────────
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

// ─── Mapping statuts order → label affiché ───────────────────────────────
const ORDER_STATUS_LABEL = {
	confirmed: "En préparation",
	in_progress: "En préparation",
	ready: "Prêt",
	completed: "Servi",
	cancelled: "Annulé",
};

// ─── Colors par statut d'item ─────────────────────────────────────────────
const ITEM_STATUS_COLORS = {
	"En préparation": { bg: "#E6F1FB", text: "#0C447C" },
	Prêt: { bg: "#EAF3DE", text: "#27500A" },
	Servi: { bg: "#F1EFE8", text: "#5F5E5A" },
	Annulé: { bg: "#FEE2E2", text: "#991B1B" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────
function formatHHMM(dateStr) {
	if (!dateStr) return "--:--";
	return new Date(dateStr).toLocaleTimeString("fr-FR", {
		hour: "2-digit",
		minute: "2-digit",
	});
}

function getElapsedMin(dateStr) {
	if (!dateStr) return 0;
	return Math.max(0, Math.floor((Date.now() - new Date(dateStr)) / 60000));
}

function getStatusConfig(billStatus) {
	if (billStatus === "bill_requested") {
		return {
			label: "🟡 À encaisser",
			dotColor: "#F59E0B",
		};
	}
	if (billStatus === "open") {
		return {
			label: "🟢 En service",
			dotColor: "#22C55E",
		};
	}
	return {
		label: "⚪ Libre",
		dotColor: "#94A3B8",
	};
}

// ─── Main Component ──────────────────────────────────────────────────────
const TableDetailModal = ({ visible, onClose, restaurantId, tableId, table }) => {
	const THEME = useTheme();
	const { email } = useUserStore();
	// Prénom affiché dans les logs : partie avant le "." ou "@", capitalisée
	const displayName = email
		? (() => {
				const local = email.split("@")[0];
				const first = local.split(".")[0];
				return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
			})()
		: "—";
	
	// Navigation : "table" | "menuPicker" | "encaisser" | "discounts" | "reason"
	const [currentView, setCurrentView] = useState("table");
	const [isSending, setIsSending] = useState(false);
	const [isClosing, setIsClosing] = useState(false);
	const [isRequestingBill, setIsRequestingBill] = useState(false);

	// States pour l'encaissement
	const [discounts, setDiscounts] = useState([]);
	const [selectedMethod, setSelectedMethod] = useState(null);
	const [selectedReason, setSelectedReason] = useState(null);
	const [addingDiscount, setAddingDiscount] = useState(false);
	const [discountType, setDiscountType] = useState(null);
	const [discountValue, setDiscountValue] = useState("");
	const [discountReason, setDiscountReason] = useState(null);
	const [discountDescription, setDiscountDescription] = useState("");
	const [selectedOrder, setSelectedOrder] = useState(null);
	const [selectedItemIndex, setSelectedItemIndex] = useState(null);

	const { session, cart, cartTotal, cartItemsCount, isOpening, actions, isTableFree, sessionOrders, sentTotal } =
		useCounterTable(tableId, restaurantId);

	// Total global = envoyé en cuisine + panier en attente
	const grandTotal = sentTotal + cartTotal;

	// Calculer le total final après réductions
	const finalTotal = useMemo(() => {
		let subtotal = grandTotal;

		for (const discount of discounts) {
			if (discount.type === "percentage") {
				const amount = (subtotal * discount.value) / 100;
				subtotal -= amount;
			} else if (discount.type === "fixed_amount") {
				subtotal -= Math.min(discount.value, subtotal);
			} else if (discount.type === "item_removal") {
				const order = sessionOrders.find((o) => o._id === discount.orderId);
				if (order && order.items[discount.itemIndex]) {
					const item = order.items[discount.itemIndex];
					subtotal -= item.price * item.quantity;
				}
			}
		}

		return Math.max(0, subtotal);
	}, [grandTotal, discounts, sessionOrders]);

	const styles = useMemo(() => createStyles(THEME), [THEME]);

	// ─── Log réductions (loggable) ────────────────────────────────────────
	const DISCOUNT_LOG_KEY = "dailyLogs_discount_entries";

	const appendDiscountLog = async (discount) => {
		try {
			const reasonConfig = DISCOUNT_REASONS.find((r) => r.id === discount.reason);
			const reasonLabel = reasonConfig ? reasonConfig.label : discount.reason;
			const tableLabel = table?.number ? `T${table.number}` : tableId;
			const sessionRef = session?._id
				? `#${String(session._id).slice(-6).toUpperCase()}`
				: "—";

			let montantStr = "";
			if (discount.type === "percentage") {
				montantStr = `-${discount.value}%`;
			} else if (discount.type === "fixed_amount") {
				montantStr = `-${discount.value.toFixed(2)}€`;
			} else if (discount.type === "item_removal") {
				const order = sessionOrders.find((o) => o._id === discount.orderId);
				const item = order?.items[discount.itemIndex];
				const itemName = item?.name || "plat";
				montantStr = `Retrait "${itemName}"`;
			}

			const entry = {
				_logId: `discount__${Date.now()}__${Math.random().toString(36).slice(2, 7)}`,
				action: "discount_applied",
				timestamp: new Date().toISOString(),
				userName: displayName,
				reservationLabel: tableLabel,
				message: `Réduction ${montantStr} · ${reasonLabel}${
					discount.description ? ` · "${discount.description}"` : ""
				} · Session ${sessionRef}`,
				// champs structurés pour affichage détaillé
				meta: {
					type: discount.type,
					value: discount.value,
					reason: reasonLabel,
					description: discount.description || "",
					sessionId: session?._id || null,
					sessionRef,
					tableLabel,
					orderId: discount.orderId || null,
					itemIndex: discount.itemIndex ?? null,
				},
			};

			const raw = await AsyncStorage.getItem(DISCOUNT_LOG_KEY);
			const existing = raw ? JSON.parse(raw) : [];
			// Garder 200 entrées max (FIFO)
			const next = [entry, ...existing].slice(0, 200);
			await AsyncStorage.setItem(DISCOUNT_LOG_KEY, JSON.stringify(next));
		} catch {
			// Ne jamais crasher pour un log
		}
	};

	// ─── Handlers ────────────────────────────────────────────────────────
	const handleSendToCook = async () => {
		if (cart.length === 0) {
			Alert.alert("Panier vide", "Ajoutez des plats avant d'envoyer");
			return;
		}
		setIsSending(true);
		try {
			await actions.sendToCook();
		} catch (err) {
			Alert.alert("Erreur", err.message);
		} finally {
			setIsSending(false);
		}
	};

	const handleRequestBill = async () => {
		setIsRequestingBill(true);
		try {
			await actions.requestBill();
			Alert.alert(
				"✓ Addition demandée",
				"L'addition est prête à être encaissée.",
				[{ text: "OK" }]
			);
		} catch (err) {
			Alert.alert("Erreur", err.message);
		} finally {
			setIsRequestingBill(false);
		}
	};

	const handleResetEncaisser = () => {
		setDiscounts([]);
		setSelectedMethod(null);
		setSelectedReason(null);
		setAddingDiscount(false);
		setDiscountType(null);
		setDiscountValue("");
		setDiscountReason(null);
		setDiscountDescription("");
		setSelectedOrder(null);
		setSelectedItemIndex(null);
	};

	const handleEncaisser = async () => {
		// ✅ Si panier non vide → envoyer automatiquement en cuisine d'abord
		if (cart.length > 0) {
			setIsSending(true);
			try {
				await actions.sendToCook();
			} catch (err) {
				Alert.alert("Erreur", "Impossible d'envoyer les plats en cuisine : " + err.message);
				setIsSending(false);
				return;
			} finally {
				setIsSending(false);
			}
		}

		const isZero = finalTotal === 0;

		// Si 0€ → demander la raison
		if (isZero && !selectedReason) {
			setCurrentView("reason");
			return;
		}

		// Si non-0€ → nécessite un mode de paiement
		if (!isZero && !selectedMethod) return;

		setIsClosing(true);
		try {
			const method = isZero ? "cash" : selectedMethod;
			await actions.closeTable(method, discounts);
			handleResetEncaisser();
			setCurrentView("table");
			onClose();
		} catch (err) {
			Alert.alert("Erreur", err.message);
		} finally {
			setIsClosing(false);
		}
	};

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
		appendDiscountLog(newDiscount);
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

	/**
	 * Annuler une commande individuelle déjà envoyée en cuisine.
	 * Guard : statut "cancelled" → skip silencieux.
	 * Pattern identique à handleCancelOrder dans Activity.jsx.
	 */
	const handleCancelOrder = (order) => {
		if (order.orderStatus === "cancelled") return;
		Alert.alert(
			"Annuler cette commande ?",
			"Cette action est irréversible.",
			[
				{ text: "Annuler", style: "cancel" },
				{
					text: "Confirmer",
					style: "destructive",
					onPress: async () => {
						try {
							await actions.cancelOrder(order._id);
						} catch (err) {
							Alert.alert("Erreur", err.message);
						}
					},
				},
			],
		);
	};

	// ─── Fonctions de rendu pour l'encaissement ──────────────────────────
	
	const renderEncaisserMainPage = () => (
		<>
			{/* Header personnalisé */}
			<View style={styles.header}>
				<TouchableOpacity
					onPress={() => setCurrentView("table")}
					style={styles.backButton}
				>
					<Ionicons name="arrow-back" size={24} color="#F8FAFC" />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>💳 Encaissement</Text>
				<View style={{ width: 24 }} />
			</View>

			{/* Contenu d'encaissement */}
			<ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
				{/* Total */}
				<View style={styles.totalBox}>
					<View style={styles.totalRow}>
						<Text style={styles.totalLabel}>Montant à encaisser :</Text>
						<Text style={[styles.totalAmount, finalTotal === 0 && styles.totalAmountZero]}>
							{finalTotal.toFixed(2)}€
						</Text>
					</View>

					{discounts.length > 0 && (
						<>
							<View style={styles.separator} />
							<View style={styles.detailRow}>
								<Text style={styles.detailLabel}>Sous-total :</Text>
								<Text style={styles.detailValue}>{grandTotal.toFixed(2)}€</Text>
							</View>
							<View style={styles.detailRow}>
								<Text style={styles.discountLabel}>Réductions ({discounts.length}) :</Text>
								<Text style={styles.discountValue}>-{(grandTotal - finalTotal).toFixed(2)}€</Text>
							</View>
						</>
					)}
				</View>

				{/* Bouton Réductions */}
				<TouchableOpacity
					onPress={() => setCurrentView("discounts")}
					style={styles.discountButton}
				>
					<Ionicons name="pricetag-outline" size={20} color={THEME.colors.primary.amber} />
					<Text style={styles.discountButtonText}>
						{discounts.length > 0
							? `Modifier réductions (${discounts.length})`
							: "Ajouter réduction (optionnel)"}
					</Text>
					<Ionicons name="chevron-forward" size={18} color={THEME.colors.text.muted} />
				</TouchableOpacity>

				{/* Modes de paiement (si total > 0€) */}
				{finalTotal > 0 && (
					<>
						<Text style={styles.modeLabel}>Mode de paiement :</Text>

						<TouchableOpacity
							onPress={() => setSelectedMethod("cash")}
							style={[
								styles.methodButton,
								selectedMethod === "cash" && styles.methodButtonActive,
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
									styles.methodButtonText,
									selectedMethod === "cash" && styles.methodButtonTextActive,
								]}
							>
								Espèces
							</Text>
						</TouchableOpacity>

						<TouchableOpacity
							onPress={() => setSelectedMethod("card_offline")}
							style={[
								styles.methodButton,
								selectedMethod === "card_offline" && styles.methodButtonActive,
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
									styles.methodButtonText,
									selectedMethod === "card_offline" && styles.methodButtonTextActive,
								]}
							>
								Carte (physique)
							</Text>
						</TouchableOpacity>
					</>
				)}
			</ScrollView>

			{/* Buttons */}
			<View style={styles.buttonsRow}>
				<TouchableOpacity
					onPress={() => setCurrentView("table")}
					disabled={isClosing}
					style={styles.cancelButton}
				>
					<Text style={styles.cancelButtonText}>Retour</Text>
				</TouchableOpacity>

				<TouchableOpacity
					onPress={handleEncaisser}
					disabled={(finalTotal > 0 && !selectedMethod) || isClosing}
					style={[
						styles.confirmButton,
						((finalTotal > 0 && !selectedMethod) || isClosing) && styles.confirmButtonDisabled,
					]}
				>
					{isClosing ? (
						<ActivityIndicator color={THEME.colors.background.dark} size="small" />
					) : (
						<Text style={styles.confirmButtonText}>Confirmer & Libérer</Text>
					)}
				</TouchableOpacity>
			</View>
		</>
	);

	const renderEncaisserDiscountsPage = () => (
		<>
			{/* Header */}
			<View style={styles.header}>
				<TouchableOpacity
					onPress={() => setCurrentView("encaisser")}
					style={styles.backButton}
				>
					<Ionicons name="arrow-back" size={24} color="#F8FAFC" />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>💸 Réductions</Text>
				<View style={{ width: 24 }} />
			</View>

			{/* Contenu */}
			<ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
				{/* Liste des réductions */}
				{discounts.length > 0 && (
					<View style={{ marginBottom: 16 }}>
						{discounts.map((d, idx) => {
							let label = "";
							if (d.type === "percentage") {
								label = `-${d.value}%`;
							} else if (d.type === "fixed_amount") {
								label = `-${d.value.toFixed(2)}€`;
							} else {
								const order = sessionOrders.find((o) => o._id === d.orderId);
								const item = order?.items[d.itemIndex];
								label = item ? `${item.name} supprimé` : "Plat supprimé";
							}

							return (
								<View key={idx} style={styles.discountItem}>
									<View style={{ flex: 1 }}>
										<Text style={styles.discountItemLabel}>{label}</Text>
										<Text style={styles.discountItemReason}>
											{DISCOUNT_REASONS.find((r) => r.id === d.reason)?.emoji || "📝"}{" "}
											{DISCOUNT_REASONS.find((r) => r.id === d.reason)?.label || d.reason}
										</Text>
									</View>
									<TouchableOpacity onPress={() => handleRemoveDiscount(idx)}>
										<Ionicons name="close-circle" size={28} color="#EF4444" />
									</TouchableOpacity>
								</View>
							);
						})}
					</View>
				)}

				{/* Formulaire d'ajout */}
				{!addingDiscount ? (
					<TouchableOpacity
						onPress={() => setAddingDiscount(true)}
						style={styles.addButton}
					>
						<Ionicons name="add-circle-outline" size={24} color={THEME.colors.primary.amber} />
						<Text style={styles.addButtonText}>Ajouter une réduction</Text>
					</TouchableOpacity>
				) : (
					<View style={styles.form}>
						{/* Type */}
						<Text style={styles.formLabel}>Type :</Text>
						<View style={styles.typeButtons}>
							<TouchableOpacity
								onPress={() => setDiscountType("percentage")}
								style={[
									styles.typeButton,
									discountType === "percentage" && styles.typeButtonActive,
								]}
							>
								<Text
									style={[
										styles.typeButtonText,
										discountType === "percentage" && styles.typeButtonTextActive,
									]}
								>
									%
								</Text>
							</TouchableOpacity>
							<TouchableOpacity
								onPress={() => setDiscountType("fixed_amount")}
								style={[
									styles.typeButton,
									discountType === "fixed_amount" && styles.typeButtonActive,
								]}
							>
								<Text
									style={[
										styles.typeButtonText,
										discountType === "fixed_amount" && styles.typeButtonTextActive,
									]}
								>
									€
								</Text>
							</TouchableOpacity>
							<TouchableOpacity
								onPress={() => setDiscountType("item_removal")}
								style={[
									styles.typeButton,
									discountType === "item_removal" && styles.typeButtonActive,
								]}
							>
								<Text
									style={[
										styles.typeButtonText,
										discountType === "item_removal" && styles.typeButtonTextActive,
									]}
								>
									Plat
								</Text>
							</TouchableOpacity>
						</View>

						{/* Valeur (si % ou €) */}
						{discountType && discountType !== "item_removal" && (
							<>
								<Text style={styles.formLabel}>Valeur :</Text>
								<TextInput
									style={styles.input}
									placeholder={discountType === "percentage" ? "Ex: 10" : "Ex: 5.00"}
									placeholderTextColor={THEME.colors.text.muted}
									keyboardType="decimal-pad"
									value={discountValue}
									onChangeText={setDiscountValue}
								/>
							</>
						)}

						{/* Plat (si item_removal) */}
						{discountType === "item_removal" && (
							<View style={{ maxHeight: 150 }}>
								<Text style={styles.formLabel}>Plat à supprimer :</Text>
								<ScrollView showsVerticalScrollIndicator={false}>
									{sessionOrders.flatMap((order) =>
										order.items.map((item, idx) => {
											const isSelected =
												selectedOrder === order._id &&
												selectedItemIndex === idx;
											return (
												<TouchableOpacity
													key={`${order._id}-${idx}`}
													onPress={() => {
														setSelectedOrder(order._id);
														setSelectedItemIndex(idx);
													}}
													style={[
														styles.itemButton,
														isSelected && styles.itemButtonActive,
													]}
												>
													<Text style={styles.itemButtonText}>
														{item.name} ({item.quantity}x) - {item.price.toFixed(2)}€
													</Text>
													{isSelected && (
														<Ionicons name="checkmark-circle" size={20} color={THEME.colors.background.dark} />
													)}
												</TouchableOpacity>
											);
										})
									)}
								</ScrollView>
							</View>
						)}

						{/* Raison */}
						{discountType && (
							<>
								<Text style={styles.formLabel}>Raison :</Text>
								<ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
									{DISCOUNT_REASONS.map((r) => {
										const isSelected = discountReason === r.id;
										return (
											<TouchableOpacity
												key={r.id}
												onPress={() => setDiscountReason(r.id)}
												style={[
													styles.reasonButton,
													isSelected && styles.reasonButtonActive,
												]}
											>
												<Text style={styles.reasonEmoji}>{r.emoji}</Text>
												<Text
													style={[
														styles.reasonLabel,
														isSelected && styles.reasonLabelActive,
													]}
												>
													{r.label}
												</Text>
												{isSelected && (
													<Ionicons name="checkmark-circle" size={20} color={THEME.colors.background.dark} />
												)}
											</TouchableOpacity>
										);
									})}
								</ScrollView>

								{/* Description si "Autre" */}
								{discountReason === "autre" && (
									<>
										<Text style={styles.formLabel}>Description :</Text>
										<TextInput
											style={styles.input}
											placeholder="Ex: Plat brûlé"
											placeholderTextColor={THEME.colors.text.muted}
											value={discountDescription}
											onChangeText={setDiscountDescription}
										/>
									</>
								)}
							</>
						)}

						{/* Buttons */}
						<View style={styles.formButtons}>
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
								style={styles.formCancelButton}
							>
								<Text style={styles.formCancelButtonText}>Annuler</Text>
							</TouchableOpacity>
							<TouchableOpacity
								onPress={handleAddDiscount}
								style={styles.formConfirmButton}
							>
								<Text style={styles.formConfirmButtonText}>Ajouter</Text>
							</TouchableOpacity>
						</View>
					</View>
				)}
			</ScrollView>
		</>
	);

	const renderEncaisserReasonPage = () => (
		<>
			{/* Header */}
			<View style={styles.header}>
				<TouchableOpacity
					onPress={() => setCurrentView("encaisser")}
					style={styles.backButton}
				>
					<Ionicons name="arrow-back" size={24} color="#F8FAFC" />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>⚠️ Total à 0,00 €</Text>
				<View style={{ width: 24 }} />
			</View>

			{/* Contenu */}
			<ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
				<Text style={styles.subtitle}>Pourquoi cette table est-elle à 0€ ?</Text>

				<View style={{ marginTop: 12 }}>
					{ZERO_REASONS.map((r) => (
						<TouchableOpacity
							key={r.id}
							onPress={() => setSelectedReason(r.id)}
							style={[styles.reasonButton, selectedReason === r.id && styles.reasonButtonActive]}
						>
							<Text style={styles.reasonEmoji}>{r.emoji}</Text>
							<Text
								style={[styles.reasonLabel, selectedReason === r.id && styles.reasonLabelActive]}
							>
								{r.label}
							</Text>
							{selectedReason === r.id && (
								<Ionicons name="checkmark-circle" size={20} color={THEME.colors.background.dark} />
							)}
						</TouchableOpacity>
					))}
				</View>
			</ScrollView>

			{/* Buttons */}
			<View style={styles.buttonsRow}>
				<TouchableOpacity
					onPress={() => setCurrentView("encaisser")}
					disabled={isClosing}
					style={styles.cancelButton}
				>
					<Text style={styles.cancelButtonText}>Retour</Text>
				</TouchableOpacity>

				<TouchableOpacity
					onPress={handleEncaisser}
					disabled={!selectedReason || isClosing}
					style={[styles.confirmButton, (!selectedReason || isClosing) && styles.confirmButtonDisabled]}
				>
					{isClosing ? (
						<ActivityIndicator color={THEME.colors.background.dark} size="small" />
					) : (
						<Text style={styles.confirmButtonText}>Confirmer & Libérer</Text>
					)}
				</TouchableOpacity>
			</View>
		</>
	);

	if (!visible) return null;

	// ─── Render : Table en cours d'ouverture (transition) ────────────────
	if (isTableFree || isOpening) {
		return (
			<Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
				<Pressable style={styles.overlay} onPress={onClose}>
					<Pressable onPress={() => {}} style={[styles.sheet, styles.loadingSheet]}>
						<ActivityIndicator size="large" color="#FBBF24" />
						<Text style={styles.loadingText}>Ouverture de la table…</Text>
					</Pressable>
				</Pressable>
			</Modal>
		);
	}

	// ─── Render : Session active ──────────────────────────────────────────
	const statusConfig = getStatusConfig(session?.billStatus);
	const elapsedMin = getElapsedMin(session?.openedAt);
	const tableLabel = table?.number ?? "—";
	const tableCapacity = table?.capacity ?? "?";

		return (
			<Modal
				visible={visible}
				transparent
				animationType="fade"
				onRequestClose={onClose}
			>
				<Pressable style={styles.overlay} onPress={onClose}>
					<Pressable onPress={() => {}} style={styles.sheet}>
						{currentView === "table" ? (
							<>
								{/* ── HEADER ────────────────────────────────────── */}
								<View style={styles.header}>
									<View style={styles.headerLeft}>
										<Text style={styles.headerTitle}>Table {tableLabel}</Text>
										<Text style={styles.headerSub}>
											{tableCapacity} pers. · ouverte depuis {elapsedMin} min
										</Text>
										{session?.serverId?.name ? (
											<Text style={styles.headerServer}>
												👤 {session.serverId.name}
											</Text>
										) : null}
									</View>
									<TouchableOpacity onPress={onClose} style={styles.closeBtn}>
										<Ionicons name="close" size={20} color="#94A3B8" />
									</TouchableOpacity>
								</View>

								{/* ── STATUS PILL ──────────────────────────────────── */}
								<View style={styles.statusRow}>
									<View style={[
										styles.statusPillWrap,
										session?.billStatus === "bill_requested"
											? styles.statusPillBill
											: styles.statusPillOpen,
									]}>
										<View style={[
											styles.statusDot,
											{ backgroundColor: statusConfig.dotColor },
										]} />
										<Text style={[
											styles.statusPillLabel,
											{ color: statusConfig.dotColor },
										]}>
											{session?.billStatus === "bill_requested" ? "À encaisser" : "En service"}
										</Text>
									</View>
								</View>

								{/* ── SCROLLABLE CONTENT ────────────────────────────── */}
								<ScrollView
									style={styles.scroll}
									contentContainerStyle={styles.scrollContent}
									showsVerticalScrollIndicator={false}
								>
									{/* Envoyés en cuisine */}
									<Text style={styles.subsectionLabel}>ENVOYÉS EN CUISINE</Text>
								{sessionOrders.length === 0 ? (
									<Text style={styles.emptyHint}>Aucun plat encore envoyé</Text>
								) : (
									sessionOrders.map((order) =>
										(order.items || []).map((item, idx) => {
											const orderLabel = ORDER_STATUS_LABEL[order.orderStatus] ?? "En préparation";
											const colors = ITEM_STATUS_COLORS[orderLabel] || ITEM_STATUS_COLORS["Servi"];
											const isCancelled = order.orderStatus === "cancelled";
											return (
												<View key={`${order._id}-${idx}`} style={styles.sentRow}>
													<View style={styles.sentNameBlock}>
														<Text style={[styles.sentName, isCancelled && styles.sentNameCancelled]}>
															{item.quantity}× {item.name}
														</Text>
														{item.notes ? <Text style={styles.sentNotes}>{item.notes}</Text> : null}
													</View>
													<Text style={[styles.sentPrice, isCancelled && styles.sentNameCancelled]}>
														{(item.price * item.quantity).toFixed(2)} €
													</Text>
													<View style={[styles.statusPillItem, { backgroundColor: colors.bg }]}>
														<Text style={[styles.statusPillItemText, { color: colors.text }]}>
															{orderLabel}
														</Text>
													</View>
													{/* Bouton annuler (visible seulement sur le premier item de la commande) */}
													{idx === 0 && !isCancelled && (
														<TouchableOpacity
															onPress={() => handleCancelOrder(order)}
															style={styles.cancelOrderBtn}
															hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
														>
															<Ionicons name="close-circle-outline" size={18} color="#EF4444" />
														</TouchableOpacity>
													)}
												</View>
											);
										})
									)
								)}
									{cart.length > 0 && (
										<>
											<Text style={[styles.subsectionLabel, { marginTop: 12 }]}>EN ATTENTE D'ENVOI</Text>
											{cart.map((item) => (
												<View key={item.tempId} style={styles.cartRow}>
													<View style={styles.sentNameBlock}>
														<Text style={styles.sentName} numberOfLines={1}>
															{item.quantity}× {item.name}
														</Text>
														{item.notes ? <Text style={styles.sentNotes}>{item.notes}</Text> : null}
													</View>
													<Text style={styles.sentPrice}>
														{(item.price * item.quantity).toFixed(2)} €
													</Text>
													<View style={styles.qtyControls}>
														<TouchableOpacity
															onPress={() => actions.setQty(item.tempId, item.quantity - 1)}
															style={styles.qtyBtn}
														>
															<Text style={styles.qtyBtnText}>−</Text>
														</TouchableOpacity>
														<Text style={styles.qtyValue}>{item.quantity}</Text>
														<TouchableOpacity
															onPress={() => actions.setQty(item.tempId, item.quantity + 1)}
															style={styles.qtyBtn}
														>
															<Text style={styles.qtyBtnText}>+</Text>
														</TouchableOpacity>
														<TouchableOpacity
															onPress={() => actions.removeItem(item.tempId)}
															style={styles.trashBtn}
														>
															<Ionicons name="trash-outline" size={16} color="#EF4444" />
														</TouchableOpacity>
													</View>
												</View>
											))}
										</>
									)}

									{/* Divider + Total */}
									<View style={styles.divider} />
								{sentTotal > 0 && (
									<View style={styles.subTotalRow}>
										<Text style={styles.subTotalLabel}>Envoyé en cuisine</Text>
										<Text style={styles.subTotalValue}>{sentTotal.toFixed(2)} €</Text>
									</View>
								)}
								{cartTotal > 0 && (
									<View style={styles.subTotalRow}>
										<Text style={styles.subTotalLabel}>En attente d'envoi</Text>
										<Text style={styles.subTotalValue}>{cartTotal.toFixed(2)} €</Text>
									</View>
								)}
								<View style={styles.totalRow}>
									<Text style={styles.totalLabel}>Total</Text>
									<Text style={styles.totalValue}>{grandTotal.toFixed(2)} €</Text>
									</View>
								</ScrollView>

								{/* ── ACTIONS 2×2 ──────────────────────────────────── */}
								<View style={styles.actionsGrid}>
									<TouchableOpacity
										onPress={() => setCurrentView("menuPicker")}
										style={styles.actionBtn}
									>
										<Text style={styles.actionBtnText}>+ Ajouter des plats</Text>
									</TouchableOpacity>

									<TouchableOpacity
										onPress={handleSendToCook}
										disabled={isSending || cart.length === 0}
										style={[styles.actionBtn, (isSending || cart.length === 0) && styles.actionDisabled]}
									>
										{isSending ? (
											<ActivityIndicator size="small" color="#F8FAFC" />
										) : (
											<Text style={styles.actionBtnText}>✈ Envoyer en cuisine</Text>
										)}
									</TouchableOpacity>

									<TouchableOpacity
										onPress={handleRequestBill}
										disabled={isRequestingBill || session?.billStatus === "bill_requested"}
										style={[
											styles.actionBtn,
											(isRequestingBill || session?.billStatus === "bill_requested") && styles.actionDisabled,
										]}
									>
										{isRequestingBill ? (
											<ActivityIndicator size="small" color="#F8FAFC" />
										) : (
											<Text style={styles.actionBtnText}>
												{session?.billStatus === "bill_requested" ? "✓ Addition demandée" : "€ Demander addition"}
											</Text>
										)}
									</TouchableOpacity>

									<TouchableOpacity
										onPress={() => setCurrentView("encaisser")}
										disabled={isClosing}
										style={[styles.actionBtn, styles.actionBtnEncaisser, isClosing && styles.actionDisabled]}
									>
										{isClosing || isSending ? (
											<ActivityIndicator size="small" color="#fff" />
										) : (
											<Text style={[styles.actionBtnText, styles.actionBtnEncaisserText]}>
												{cart.length > 0 ? "✓ Envoyer + Encaisser" : "✓ Encaisser & libérer"}
											</Text>
										)}
									</TouchableOpacity>
								</View>
							</>
						) : currentView === "encaisser" ? (
							renderEncaisserMainPage()
						) : currentView === "discounts" ? (
							renderEncaisserDiscountsPage()
						) : currentView === "reason" ? (
							renderEncaisserReasonPage()
						) : null}

						{/* ── SUB-MODAL MenuPicker ─────────────────────────────── */}
						{currentView === "menuPicker" && (
							<MenuPickerModal
								visible={true}
								onClose={() => setCurrentView("table")}
								tableId={tableId}
								restaurantId={restaurantId}
							/>
						)}
					</Pressable>
				</Pressable>
			</Modal>
		);
};

// ─── Styles ───────────────────────────────────────────────────────────────
const createStyles = (THEME) =>
	StyleSheet.create({
		// ── Overlay centré ───────────────────────────────────────
		overlay: {
			flex: 1,
			backgroundColor: "rgba(0,0,0,0.70)",
			justifyContent: "center",
			alignItems: "center",
			paddingHorizontal: 16,
			paddingVertical: 12,
		},
		sheet: {
			backgroundColor: "#1E293B",
			borderRadius: 20,
			width: "100%",
			maxWidth: 520,
			flex: 0,
			flexShrink: 1,
			minHeight: "78%",
			borderWidth: 1,
			borderColor: "rgba(255,255,255,0.08)",
			overflow: "hidden",
		},

		// ── Loading ───────────────────────────────────────────────
		loadingSheet: {
			paddingVertical: 48,
			alignItems: "center",
			justifyContent: "center",
			gap: 16,
		},
		loadingText: {
			color: "#94A3B8",
			fontSize: 14,
			fontWeight: "500",
		},

		// ── Header ───────────────────────────────────────────────
		header: {
			flexDirection: "row",
			alignItems: "flex-start",
			paddingHorizontal: 20,
			paddingTop: 20,
			paddingBottom: 14,
			borderBottomWidth: 1,
			borderBottomColor: "rgba(255,255,255,0.07)",
		},
		headerLeft: { flex: 1 },
		headerTitle: {
			fontSize: 20,
			fontWeight: "700",
			color: "#F8FAFC",
			marginBottom: 3,
		},
		headerSub: {
			fontSize: 13,
			color: "#64748B",
			fontWeight: "400",
		},
		headerServer: {
			fontSize: 12,
			color: "#94A3B8",
			fontWeight: "400",
			marginTop: 2,
		},
		closeBtn: {
			width: 32,
			height: 32,
			borderRadius: 16,
			backgroundColor: "rgba(255,255,255,0.07)",
			alignItems: "center",
			justifyContent: "center",
			marginLeft: 12,
		},

		// ── Status pill ───────────────────────────────────────────
		statusRow: {
			paddingHorizontal: 20,
			paddingVertical: 12,
			borderBottomWidth: 1,
			borderBottomColor: "rgba(255,255,255,0.07)",
		},
		statusPillWrap: {
			flexDirection: "row",
			alignItems: "center",
			alignSelf: "flex-start",
			borderRadius: 20,
			paddingHorizontal: 12,
			paddingVertical: 5,
			gap: 6,
			borderWidth: 1,
		},
		statusPillOpen: {
			backgroundColor: "rgba(34,197,94,0.12)",
			borderColor: "rgba(34,197,94,0.3)",
		},
		statusPillBill: {
			backgroundColor: "rgba(245,158,11,0.12)",
			borderColor: "rgba(245,158,11,0.3)",
		},
		statusDot: {
			width: 8,
			height: 8,
			borderRadius: 4,
		},
		statusPillLabel: {
			fontSize: 13,
			fontWeight: "600",
		},

		// ── Scroll ───────────────────────────────────────────────
		scroll: { flex: 1, minHeight: 80 },
		scrollContent: {
			paddingHorizontal: 20,
			paddingTop: 14,
			paddingBottom: 10,
		},

		// ── Section label ─────────────────────────────────────────
		subsectionLabel: {
			fontSize: 11,
			fontWeight: "700",
			letterSpacing: 0.8,
			color: "#475569",
			marginBottom: 8,
		},

		// ── Sent items ───────────────────────────────────────────
		sentRow: {
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
			paddingVertical: 10,
			borderBottomWidth: 1,
			borderBottomColor: "rgba(255,255,255,0.05)",
		},
		sentNameBlock: {
			flex: 1,
			minWidth: 0,
		},
		sentNotes: {
			fontSize: 11,
			fontStyle: "italic",
			color: "#94A3B8",
			marginTop: 1,
		},
		sentName: {
			fontSize: 14,
			fontWeight: "600",
			color: "#F8FAFC",
		},
		sentPrice: {
			fontSize: 13,
			fontWeight: "600",
			color: "#94A3B8",
			minWidth: 58,
			textAlign: "right",
		},
		statusPillItem: {
			borderRadius: 12,
			paddingHorizontal: 8,
			paddingVertical: 3,
		},
		statusPillItemText: {
			fontSize: 10,
			fontWeight: "700",
		},

		// ── Cart items ────────────────────────────────────────────
		cartRow: {
			flexDirection: "row",
			alignItems: "center",
			gap: 6,
			paddingVertical: 9,
			borderBottomWidth: 1,
			borderBottomColor: "rgba(255,255,255,0.05)",
		},
		qtyControls: {
			flexDirection: "row",
			alignItems: "center",
			gap: 4,
		},
		qtyBtn: {
			width: 28,
			height: 28,
			borderRadius: 6,
			borderWidth: 1,
			borderColor: "rgba(255,255,255,0.12)",
			alignItems: "center",
			justifyContent: "center",
			backgroundColor: "rgba(255,255,255,0.05)",
		},
		qtyBtnText: {
			fontSize: 16,
			fontWeight: "700",
			color: "#F8FAFC",
			lineHeight: 20,
		},
		qtyValue: {
			minWidth: 22,
			textAlign: "center",
			fontSize: 13,
			fontWeight: "700",
			color: "#F8FAFC",
		},
		trashBtn: { padding: 4, marginLeft: 2 },

		// ── Cancel order (envoyé en cuisine) ─────────────────────
		cancelOrderBtn: {
			padding: 2,
			marginLeft: 6,
		},
		sentNameCancelled: {
			opacity: 0.4,
			textDecorationLine: "line-through",
		},

		// ── Divider + Total ───────────────────────────────────────
		divider: {
			height: 1,
			backgroundColor: "rgba(255,255,255,0.07)",
			marginVertical: 12,
		},
		totalRow: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			paddingBottom: 4,
		},
		subTotalRow: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			paddingBottom: 6,
		},
		subTotalLabel: {
			fontSize: 13,
			color: "#94A3B8",
		},
		subTotalValue: {
			fontSize: 13,
			color: "#94A3B8",
		},
		emptyHint: {
			fontSize: 13,
			color: "#64748B",
			fontStyle: "italic",
			paddingVertical: 8,
		},
		totalLabel: {
			fontSize: 16,
			fontWeight: "700",
			color: "#F8FAFC",
		},
		totalValue: {
			fontSize: 18,
			fontWeight: "700",
			color: "#F8FAFC",
		},

		// ── Actions 2×2 ───────────────────────────────────────────
		actionsGrid: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: 8,
			padding: 16,
			borderTopWidth: 1,
			borderTopColor: "rgba(255,255,255,0.07)",
		},
		actionBtn: {
			width: "48%",
			height: 52,
			borderRadius: 10,
			borderWidth: 1,
			borderColor: "rgba(255,255,255,0.12)",
			backgroundColor: "rgba(255,255,255,0.05)",
			alignItems: "center",
			justifyContent: "center",
			paddingHorizontal: 8,
		},
		actionBtnText: {
			fontSize: 13,
			fontWeight: "600",
			color: "#F8FAFC",
			textAlign: "center",
		},
		actionBtnEncaisser: {
			backgroundColor: "rgba(34,197,94,0.15)",
			borderColor: "rgba(34,197,94,0.35)",
		},
		actionBtnEncaisserText: {
			color: "#4ADE80",
		},
		actionDisabled: {
			opacity: 0.4,
		},

		// ── Styles pour pages d'encaissement ──────────────────────
		backButton: {
			padding: 8,
		},
		scrollContent: {
			paddingHorizontal: 20,
			paddingVertical: 16,
		},
		scroll: {
			flex: 1,
		},
		subtitle: {
			fontSize: 14,
			color: "#94A3B8",
			textAlign: "center",
			marginBottom: 16,
		},

		// Total box
		totalBox: {
			backgroundColor: "rgba(251, 191, 36, 0.08)",
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
			color: "#94A3B8",
		},
		totalAmount: {
			fontSize: 28,
			fontWeight: "700",
			color: THEME.colors.primary.amber,
		},
		totalAmountZero: {
			color: "#64748B",
		},
		separator: {
			height: 1,
			backgroundColor: "rgba(255,255,255,0.07)",
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
			color: "#94A3B8",
		},
		detailValue: {
			fontSize: 15,
			fontWeight: "600",
			color: "#F8FAFC",
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

		// Discount button
		discountButton: {
			flexDirection: "row",
			alignItems: "center",
			paddingVertical: 14,
			paddingHorizontal: 16,
			backgroundColor: "rgba(255,255,255,0.05)",
			borderRadius: 10,
			borderWidth: 1,
			borderColor: "rgba(255,255,255,0.12)",
			marginBottom: 16,
			gap: 10,
		},
		discountButtonText: {
			fontSize: 15,
			fontWeight: "600",
			color: "#F8FAFC",
			flex: 1,
		},

		// Payment methods
		modeLabel: {
			fontSize: 15,
			fontWeight: "600",
			color: "#94A3B8",
			marginBottom: 12,
		},
		methodButton: {
			flexDirection: "row",
			alignItems: "center",
			paddingVertical: 16,
			paddingHorizontal: 18,
			backgroundColor: "rgba(255,255,255,0.05)",
			borderRadius: 10,
			borderWidth: 2,
			borderColor: "rgba(255,255,255,0.12)",
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
			color: "#F8FAFC",
		},
		methodButtonTextActive: {
			color: THEME.colors.background.dark,
		},

		// Buttons row
		buttonsRow: {
			flexDirection: "row",
			gap: 12,
			paddingHorizontal: 20,
			paddingBottom: 20,
		},
		cancelButton: {
			flex: 1,
			paddingVertical: 14,
			paddingHorizontal: 20,
			borderRadius: 10,
			borderWidth: 1,
			borderColor: "rgba(255,255,255,0.12)",
			alignItems: "center",
			justifyContent: "center",
		},
		cancelButtonText: {
			fontSize: 15,
			fontWeight: "700",
			color: "#94A3B8",
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

		// Discount items
		discountItem: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: "rgba(255,255,255,0.05)",
			borderRadius: 10,
			padding: 14,
			marginBottom: 10,
			borderWidth: 1,
			borderColor: "rgba(255,255,255,0.12)",
		},
		discountItemLabel: {
			fontSize: 16,
			fontWeight: "700",
			color: "#F8FAFC",
			marginBottom: 4,
		},
		discountItemReason: {
			fontSize: 13,
			color: "#94A3B8",
		},

		// Add button
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

		// Form
		form: {
			backgroundColor: "rgba(255,255,255,0.05)",
			borderRadius: 10,
			padding: 16,
			borderWidth: 1,
			borderColor: "rgba(255,255,255,0.12)",
		},
		formLabel: {
			fontSize: 14,
			fontWeight: "600",
			color: "#94A3B8",
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
			borderColor: "rgba(255,255,255,0.12)",
			alignItems: "center",
			justifyContent: "center",
			backgroundColor: "rgba(255,255,255,0.05)",
		},
		typeButtonActive: {
			backgroundColor: THEME.colors.primary.amber,
			borderColor: THEME.colors.primary.amber,
		},
		typeButtonText: {
			fontSize: 16,
			fontWeight: "700",
			color: "#F8FAFC",
		},
		typeButtonTextActive: {
			color: THEME.colors.background.dark,
		},

		// Input
		input: {
			backgroundColor: "rgba(255,255,255,0.05)",
			borderRadius: 8,
			borderWidth: 1,
			borderColor: "rgba(255,255,255,0.12)",
			paddingVertical: 12,
			paddingHorizontal: 14,
			fontSize: 15,
			color: "#F8FAFC",
			marginBottom: 10,
		},

		// Item button
		itemButton: {
			flexDirection: "row",
			alignItems: "center",
			paddingVertical: 12,
			paddingHorizontal: 14,
			backgroundColor: "rgba(255,255,255,0.05)",
			borderRadius: 8,
			borderWidth: 1,
			borderColor: "rgba(255,255,255,0.12)",
			marginBottom: 8,
		},
		itemButtonActive: {
			backgroundColor: THEME.colors.primary.amber,
			borderColor: THEME.colors.primary.amber,
		},
		itemButtonText: {
			fontSize: 14,
			color: "#F8FAFC",
			flex: 1,
		},

		// Reason button
		reasonButton: {
			flexDirection: "row",
			alignItems: "center",
			paddingVertical: 12,
			paddingHorizontal: 14,
			backgroundColor: "rgba(255,255,255,0.05)",
			borderRadius: 8,
			borderWidth: 1,
			borderColor: "rgba(255,255,255,0.12)",
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
			color: "#F8FAFC",
			flex: 1,
		},
		reasonLabelActive: {
			color: THEME.colors.background.dark,
		},

		// Form buttons
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
			borderColor: "rgba(255,255,255,0.12)",
			alignItems: "center",
		},
		formCancelButtonText: {
			fontSize: 14,
			fontWeight: "700",
			color: "#94A3B8",
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
	});

export default TableDetailModal;
