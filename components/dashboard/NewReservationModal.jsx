/**
 * NewReservationModal.jsx - Modal de création de réservation Premium
 * Design spatial inspiré par shadcn/ui mais adapté à React Native
 */
import React, {
	useState,
	useCallback,
	useRef,
	useEffect,
	useMemo,
} from "react";
import {
	Modal,
	View,
	Text,
	TouchableOpacity,
	TextInput,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	StyleSheet,
	Animated,
	Dimensions,
	Alert,
	ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import useThemeStore from "../../src/stores/useThemeStore";
import useUserStore from "../../src/stores/useUserStore";
import { useTheme } from "../../hooks/useTheme";
import { useAuthFetch } from "../../hooks/useAuthFetch";
import { isFastService } from "../../utils/categoryUtils";
import { useFeatureLevel } from "../../src/stores/useFeatureLevelStore";
import { useReservationAI } from "../../hooks/useReservationAI";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ─────────────── InputField Component ───────────────
const InputField = React.memo(
	({ label, icon, required, error, children, THEME, modalStyles }) => (
		<View style={modalStyles.inputWrapper}>
			<View style={modalStyles.labelRow}>
				<Ionicons name={icon} size={16} color={THEME.colors.text.muted} />
				<Text style={modalStyles.label}>
					{label}
					{required && (
						<Text style={{ color: THEME.colors.primary.amber }}> *</Text>
					)}
				</Text>
			</View>
			{children}
			{error && <Text style={modalStyles.errorText}>{error}</Text>}
		</View>
	),
);

// ─────────────── StepIndicator Component ───────────────
const StepIndicator = React.memo(({ currentStep, totalSteps, modalStyles }) => (
	<View style={modalStyles.stepContainer}>
		{[...Array(totalSteps)].map((_, index) => {
			const isActive = index + 1 === currentStep;
			const isCompleted = index + 1 < currentStep;
			return (
				<View key={index} style={modalStyles.stepItem}>
					<View
						style={[
							modalStyles.stepDot,
							isActive && modalStyles.stepDotActive,
							isCompleted && modalStyles.stepDotCompleted,
						]}
					>
						{isCompleted ? (
							<Ionicons name="checkmark" size={12} color="#FFF" />
						) : (
							<Text
								style={[
									modalStyles.stepNumber,
									isActive && modalStyles.stepNumberActive,
								]}
							>
								{index + 1}
							</Text>
						)}
					</View>
					{index < totalSteps - 1 && (
						<View
							style={[
								modalStyles.stepLine,
								isCompleted && modalStyles.stepLineCompleted,
							]}
						/>
					)}
				</View>
			);
		})}
	</View>
));

// ─────────────── PersonSelector Component ───────────────
const PersonSelector = React.memo(({ value, onChange, THEME, modalStyles }) => {
	const decrementDisabled = value <= 1;
	const incrementDisabled = value >= 20;

	return (
		<View style={modalStyles.personSelector}>
			<TouchableOpacity
				style={[
					modalStyles.personButton,
					decrementDisabled && modalStyles.personButtonDisabled,
				]}
				onPress={() => !decrementDisabled && onChange(value - 1)}
				disabled={decrementDisabled}
			>
				<Ionicons
					name="remove"
					size={20}
					color={
						decrementDisabled
							? THEME.colors.text.muted
							: THEME.colors.text.primary
					}
				/>
			</TouchableOpacity>
			<View style={modalStyles.personValueContainer}>
				<Text style={modalStyles.personValue}>{value}</Text>
				<Text style={modalStyles.personLabel}>personnes</Text>
			</View>
			<TouchableOpacity
				style={[
					modalStyles.personButton,
					incrementDisabled && modalStyles.personButtonDisabled,
				]}
				onPress={() => !incrementDisabled && onChange(value + 1)}
				disabled={incrementDisabled}
			>
				<Ionicons
					name="add"
					size={20}
					color={
						incrementDisabled
							? THEME.colors.text.muted
							: THEME.colors.text.primary
					}
				/>
			</TouchableOpacity>
		</View>
	);
});

// ─────────────── TableSelector Component ───────────────
const TableSelector = React.memo(
	({ tables, selectedId, onSelect, THEME, modalStyles }) => (
		<View style={modalStyles.tableGrid}>
			<TouchableOpacity
				style={[
					modalStyles.tableItem,
					!selectedId && modalStyles.tableItemSelected,
				]}
				onPress={() => onSelect(null)}
			>
				<Text
					style={[
						modalStyles.tableText,
						!selectedId && modalStyles.tableTextSelected,
					]}
				>
					Aucune
				</Text>
			</TouchableOpacity>
			{tables?.map((table) => {
				const isSelected = selectedId === table._id;
				const isAvailable = table.isAvailable !== false;
				return (
					<TouchableOpacity
						key={table._id}
						style={[
							modalStyles.tableItem,
							isSelected && modalStyles.tableItemSelected,
							!isAvailable && modalStyles.tableItemUnavailable,
						]}
						onPress={() => isAvailable && onSelect(table._id)}
						disabled={!isAvailable}
					>
						<Text
							style={[
								modalStyles.tableText,
								isSelected && modalStyles.tableTextSelected,
								!isAvailable && modalStyles.tableTextUnavailable,
							]}
						>
							{table.number}
						</Text>
						{!isAvailable && (
							<Text style={modalStyles.tableOccupied}>Occupée</Text>
						)}
					</TouchableOpacity>
				);
			})}
		</View>
	),
);

// ─────────────── Main Component ───────────────
const NewReservationModal = React.memo(
	({ visible, onClose, onCreate, tables, theme, initialData = null }) => {
		const { themeMode } = useThemeStore();
		const THEME = useTheme(); // Utilise le hook avec multiplicateur de police
		const authFetch = useAuthFetch();

		// 🍔 Mode snack: formulaire simplifié
		const category = useUserStore((state) => state.category);
		const isSnackMode = isFastService(category);

		// ── IA ─────────────────────────────────────────────────────────────
		const { hasAiSmartDuration, hasAiSlotSuggestions } = useFeatureLevel();
		const {
			getSmartDuration,
			getAlternatives,
			loading: aiLoading,
		} = useReservationAI();
		const [smartDuration, setSmartDuration] = useState(null);
		const [aiAlternatives, setAiAlternatives] = useState(null);

		const [step, setStep] = useState(1);
		const [clientName, setClientName] = useState("");
		const [phone, setPhone] = useState("");
		const [reservationTime, setReservationTime] = useState("");
		const [reservationDate, setReservationDate] = useState("");
		const [nbPersonnes, setNbPersonnes] = useState(2);
		const [allergies, setAllergies] = useState("");
		const [restrictions, setRestrictions] = useState("");
		const [notes, setNotes] = useState("");
		const [selectedTableId, setSelectedTableId] = useState(null);
		const [errors, setErrors] = useState({});

		// ⭐ Tables avec disponibilité calculée dynamiquement
		const [tablesWithAvailability, setTablesWithAvailability] = useState(
			tables || [],
		);
		const [loadingTables, setLoadingTables] = useState(false);

		// ⭐ Assistant de réservations
		const [assistantVisible, setAssistantVisible] = useState(false);
		const [assistantResult, setAssistantResult] = useState(null);
		const [assistantLoading, setAssistantLoading] = useState(false);

		// ⭐ Créneaux disponibles
		const [availableSlots, setAvailableSlots] = useState([]);
		const [loadingSlots, setLoadingSlots] = useState(false);

		// ✨ Assistant suggestion de créneaux
		const [suggestionResult, setSuggestionResult] = useState(null);
		const [suggestionLoading, setSuggestionLoading] = useState(false);

		// ⭐ Charger les tables avec disponibilité quand date/heure change
		useEffect(() => {
			const fetchTablesWithAvailability = async () => {
				if (!visible) return;

				// Si pas de date/heure, utiliser les tables par défaut
				if (!reservationDate || !reservationTime) {
					setTablesWithAvailability(tables || []);
					return;
				}

				setLoadingTables(true);
				try {
					const restaurantId = tables[0]?.restaurantId;
					if (!restaurantId) {
						setTablesWithAvailability(tables || []);
						return;
					}

					// Formater la date en ISO
					const dateISO = new Date(reservationDate).toISOString().split("T")[0];

					const enrichedTables = await authFetch(
						`/tables/restaurant/${restaurantId}/available?date=${dateISO}&time=${reservationTime}`,
					);

					setTablesWithAvailability(enrichedTables || tables || []);
				} catch (error) {
					console.error("❌ [TABLES] Erreur chargement disponibilité:", error);
					setTablesWithAvailability(tables || []);
				} finally {
					setLoadingTables(false);
				}
			};

			fetchTablesWithAvailability();
		}, [visible, reservationDate, reservationTime, tables, authFetch]);

		useEffect(() => {
			if (visible && initialData) {
				setClientName(initialData.clientName || "");
				setPhone(initialData.phone || "");
				setNbPersonnes(initialData.nbPersonnes || 2);
				setAllergies(initialData.allergies || "");
				setRestrictions(initialData.restrictions || "");
				setNotes(initialData.notes || "");
				// Ne pas pré-remplir date/heure - l'utilisateur doit les choisir
				setReservationTime("");
				setReservationDate("");
				setSelectedTableId(
					initialData.tableId?._id || initialData.tableId || null,
				);
				setStep(1);
			}
		}, [visible, initialData]);

		// ⭐ Charger les créneaux disponibles quand la date ou le nb de personnes change (step 2, hors snack)
		useEffect(() => {
			if (!reservationDate || step !== 2 || isSnackMode) {
				setAvailableSlots([]);
				setSuggestionResult(null);
				return;
			}
			const restaurantId = tables?.[0]?.restaurantId;
			if (!restaurantId) return;
			setLoadingSlots(true);
			authFetch(
				`/reservations/restaurant/${restaurantId}/available-slots?date=${reservationDate}&guests=${nbPersonnes}`,
			)
				.then((data) => {
					if (Array.isArray(data)) setAvailableSlots(data);
					else setAvailableSlots([]);
				})
				.catch(() => setAvailableSlots([]))
				.finally(() => setLoadingSlots(false));
		}, [reservationDate, nbPersonnes, step, isSnackMode, tables, authFetch]);

		// ⭐ IA Smart Duration : recalcul quand nbPersonnes change
		useEffect(() => {
			if (!visible || !hasAiSmartDuration || nbPersonnes < 1) {
				setSmartDuration(null);
				return;
			}
			let cancelled = false;
			getSmartDuration(nbPersonnes).then((result) => {
				if (!cancelled) setSmartDuration(result);
			});
			return () => {
				cancelled = true;
			};
		}, [nbPersonnes, visible, hasAiSmartDuration, getSmartDuration]);

		// Effacer alternatives IA si l'heure ou la date change
		useEffect(() => {
			setAiAlternatives(null);
		}, [reservationDate, reservationTime]);

		const handleGetAlternatives = useCallback(async () => {
			if (!reservationDate || !reservationTime) return;
			const result = await getAlternatives(
				reservationDate,
				reservationTime,
				nbPersonnes,
			);
			setAiAlternatives(Array.isArray(result) ? result : []);
		}, [reservationDate, reservationTime, nbPersonnes, getAlternatives]);

		const modalStyles = useMemo(() => createStyles(THEME), [THEME]);

		// Animation
		const slideAnim = useRef(new Animated.Value(0)).current;

		useEffect(() => {
			Animated.timing(slideAnim, {
				toValue: step,
				duration: 300,
				useNativeDriver: true,
			}).start();
		}, [step]);

		const resetForm = useCallback(() => {
			setStep(1);
			setClientName("");
			setPhone("");
			setReservationTime("");
			setReservationDate("");
			setNbPersonnes(2);
			setAllergies("");
			setRestrictions("");
			setNotes("");
			setSelectedTableId(null);
			setErrors({});
		}, []);

		const handleClose = useCallback(() => {
			resetForm();
			onClose?.();
		}, [resetForm, onClose]);

		// 🍔 Mode snack: validation simplifiée (juste nom + nb personnes)
		const validateStep1 = useCallback(() => {
			const newErrors = {};
			if (!clientName.trim()) newErrors.clientName = "Nom requis";
			// En mode snack, pas besoin de téléphone
			if (!isSnackMode && !phone.trim()) newErrors.phone = "Téléphone requis";
			if (nbPersonnes < 1) newErrors.nbPersonnes = "Minimum 1 personne";
			setErrors(newErrors);
			return Object.keys(newErrors).length === 0;
		}, [clientName, phone, nbPersonnes, isSnackMode]);

		// 🍔 Mode snack: pas de validation date/heure (utilise maintenant)
		const validateStep2 = useCallback(() => {
			if (isSnackMode) return true; // Pas de step 2 en mode snack
			const newErrors = {};
			if (!reservationDate) newErrors.reservationDate = "Date requise";
			if (!reservationTime) newErrors.reservationTime = "Heure requise";
			setErrors(newErrors);
			return Object.keys(newErrors).length === 0;
		}, [reservationDate, reservationTime, isSnackMode]);
		// ⭐ Vérifier la disponibilité avec l'assistant
		const handleCheckAvailability = useCallback(async () => {
			if (!reservationDate || !reservationTime) {
				Alert.alert(
					"Informations manquantes",
					"Veuillez renseigner une date et une heure avant de vérifier la disponibilité",
				);
				setErrors({
					reservationDate: !reservationDate ? "Date requise" : null,
					reservationTime: !reservationTime ? "Heure requise" : null,
				});
				return;
			}

			setAssistantLoading(true);
			setAssistantVisible(true);
			setAssistantResult(null);

			try {
				// Récupérer le restaurantId depuis les tables ou le contexte
				const restaurantId =
					tables[0]?.restaurantId || localStorage.getItem("restaurantId");

				if (!restaurantId) {
					throw new Error("Restaurant ID manquant");
				}

				const response = await authFetch("/assistant/check-availability", {
					method: "POST",
					body: {
						restaurantId,
						date: reservationDate,
						time: reservationTime,
						people: nbPersonnes,
					},
				});

				setAssistantResult(response);
			} catch (error) {
				console.error("❌ Erreur assistant:", error);
				Alert.alert(
					"Erreur",
					error.message || "Erreur lors de la vérification de disponibilité",
				);
				setAssistantResult({
					status: "error",
					reason:
						error.message || "Erreur lors de la vérification de disponibilité",
					alternatives: [],
				});
			} finally {
				setAssistantLoading(false);
			}
		}, [reservationDate, reservationTime, nbPersonnes, tables, authFetch]);

		// ✨ Demande de suggestion intelligente à l'assistant
		const handleSuggest = useCallback(async () => {
			if (!reservationDate) {
				Alert.alert(
					"Date manquante",
					"Sélectionnez d'abord une date pour obtenir des suggestions.",
				);
				return;
			}
			const restaurantId = tables?.[0]?.restaurantId;
			if (!restaurantId) return;
			setSuggestionLoading(true);
			setSuggestionResult(null);
			try {
				const data = await authFetch("/assistant/suggest", {
					method: "POST",
					body: {
						restaurantId,
						date: reservationDate,
						people: nbPersonnes,
					},
				});
				setSuggestionResult(data);
			} catch (e) {
				setSuggestionResult({
					summary: "Impossible d'analyser les créneaux pour ce jour.",
					suggestions: [],
				});
			} finally {
				setSuggestionLoading(false);
			}
		}, [reservationDate, nbPersonnes, tables, authFetch]);

		// ⭐ Sélectionner une alternative proposée par l'assistant
		const handleSelectAlternative = useCallback((time) => {
			setReservationTime(time);
			setErrors((prev) => ({ ...prev, reservationTime: null }));
		}, []);

		// 🍔 Création de commande/réservation
		const handleCreate = useCallback(async () => {
			// En mode snack, valider step1 directement
			if (isSnackMode) {
				if (!validateStep1()) return;
			} else {
				if (!validateStep2()) return;
			}

			try {
				// 🍔 Mode snack: date/heure = maintenant, pas de table
				const now = new Date();
				const snackDate = now.toISOString().split("T")[0];
				const snackTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

				const success = await onCreate({
					clientName: clientName.trim(),
					phone: isSnackMode ? "" : phone.trim(), // Pas de tel en snack
					reservationTime: isSnackMode ? snackTime : reservationTime,
					reservationDate: isSnackMode ? snackDate : reservationDate,
					nbPersonnes,
					allergies: allergies.trim(),
					restrictions: restrictions.trim(),
					notes: notes.trim(),
					tableId: isSnackMode ? null : selectedTableId, // Pas de table en snack
				});

				if (success) {
					resetForm();
					onClose?.();
				}
			} catch (error) {
				console.error("Erreur création réservation:", error);
			}
		}, [
			clientName,
			phone,
			reservationDate,
			reservationTime,
			nbPersonnes,
			allergies,
			restrictions,
			notes,
			selectedTableId,
			onCreate,
			resetForm,
			onClose,
			validateStep1,
			validateStep2,
			isSnackMode,
		]);

		const nextStep = useCallback(() => {
			if (validateStep1()) setStep(2);
		}, [validateStep1]);

		const prevStep = useCallback(() => setStep(1), []);

		return (
			<>
				<Modal
					visible={visible}
					transparent
					animationType="fade"
					onRequestClose={handleClose}
				>
					<KeyboardAvoidingView
						behavior={Platform.OS === "ios" ? "padding" : "height"}
						style={{ flex: 1 }}
					>
						<View style={modalStyles.overlay}>
							{/* Card principale */}
							<View style={modalStyles.card}>
								{/* Header */}
								<View style={modalStyles.header}>
									<View>
										<Text style={modalStyles.title}>
											{isSnackMode
												? "Nouvelle commande"
												: "Nouvelle réservation"}
										</Text>
										<Text style={modalStyles.subtitle}>
											{isSnackMode
												? "Informations commande"
												: step === 1
													? "Informations client"
													: "Date et table"}
										</Text>
									</View>
									<TouchableOpacity
										style={modalStyles.closeButton}
										onPress={handleClose}
									>
										<Ionicons
											name="close"
											size={22}
											color={THEME.colors.text.secondary}
										/>
									</TouchableOpacity>
								</View>

								{/* Step Indicator - masqué en mode snack */}
								{!isSnackMode && (
									<StepIndicator
										currentStep={step}
										totalSteps={2}
										modalStyles={modalStyles}
									/>
								)}
								{/* Divider */}
								<LinearGradient
									colors={[
										"transparent",
										THEME.colors.border.subtle,
										"transparent",
									]}
									start={{ x: 0, y: 0 }}
									end={{ x: 1, y: 0 }}
									style={modalStyles.divider}
								/>

								{/* Content */}
								<ScrollView
									showsVerticalScrollIndicator={false}
									contentContainerStyle={{ paddingBottom: THEME.spacing.xl }}
								>
									{/* 🍔 Mode Snack: formulaire simplifié (nom + nb personnes) */}
									{isSnackMode ? (
										<View style={modalStyles.stepContent}>
											<InputField
												label="Nom du client"
												icon="person-outline"
												required
												error={errors.clientName}
												THEME={THEME}
												modalStyles={modalStyles}
											>
												<TextInput
													placeholder="Ex: Jean"
													value={clientName}
													onChangeText={setClientName}
													style={[
														modalStyles.input,
														errors.clientName && modalStyles.inputError,
													]}
													placeholderTextColor={THEME.colors.text.muted}
												/>
											</InputField>

											<InputField
												label="Nombre de personnes"
												icon="people-outline"
												required
												THEME={THEME}
												modalStyles={modalStyles}
											>
												<PersonSelector
													value={nbPersonnes}
													onChange={setNbPersonnes}
													THEME={THEME}
													modalStyles={modalStyles}
												/>
											</InputField>

											{/* ⭐ IA Smart Duration hint — mode snack */}
											{hasAiSmartDuration && smartDuration && (
												<View style={modalStyles.smartDurationHint}>
													<Ionicons
														name="time-outline"
														size={13}
														color="#F59E0B"
													/>
													<Text style={modalStyles.smartDurationText}>
														IA · {smartDuration.recommendedMinutes} min
														recommandées
														{smartDuration.reason
															? ` — ${smartDuration.reason}`
															: ""}
													</Text>
												</View>
											)}

											{/* Notes optionnelles */}
											<InputField
												label="Notes (optionnel)"
												icon="chatbubble-outline"
												THEME={THEME}
												modalStyles={modalStyles}
											>
												<TextInput
													placeholder="Ex: Sans oignon, bien cuit..."
													value={notes}
													onChangeText={setNotes}
													multiline
													numberOfLines={2}
													style={[modalStyles.input, { minHeight: 60 }]}
													placeholderTextColor={THEME.colors.text.muted}
												/>
											</InputField>
										</View>
									) : (
										<>
											{/* Step 1: Informations client (mode restaurant) */}
											{step === 1 && (
												<View style={modalStyles.stepContent}>
													<InputField
														label="Nom du client"
														icon="person-outline"
														required
														error={errors.clientName}
														THEME={THEME}
														modalStyles={modalStyles}
													>
														<TextInput
															placeholder="Ex: Jean Dupont"
															value={clientName}
															onChangeText={setClientName}
															style={[
																modalStyles.input,
																errors.clientName && modalStyles.inputError,
															]}
															placeholderTextColor={THEME.colors.text.muted}
														/>
													</InputField>

													<InputField
														label="Téléphone"
														icon="call-outline"
														required
														error={errors.phone}
														THEME={THEME}
														modalStyles={modalStyles}
													>
														<TextInput
															placeholder="Ex: 06 12 34 56 78"
															value={phone}
															onChangeText={setPhone}
															keyboardType="phone-pad"
															style={[
																modalStyles.input,
																errors.phone && modalStyles.inputError,
															]}
															placeholderTextColor={THEME.colors.text.muted}
														/>
													</InputField>

													<InputField
														label="Nombre de personnes"
														icon="people-outline"
														required
														THEME={THEME}
														modalStyles={modalStyles}
													>
														<PersonSelector
															value={nbPersonnes}
															onChange={setNbPersonnes}
															THEME={THEME}
															modalStyles={modalStyles}
														/>
													</InputField>

													{/* ⭐ IA Smart Duration hint — step 1 restaurant */}
													{hasAiSmartDuration && smartDuration && (
														<View style={modalStyles.smartDurationHint}>
															<Ionicons
																name="time-outline"
																size={13}
																color="#F59E0B"
															/>
															<Text style={modalStyles.smartDurationText}>
																IA · {smartDuration.recommendedMinutes} min
																recommandées
																{smartDuration.reason
																	? ` — ${smartDuration.reason}`
																	: ""}
															</Text>
														</View>
													)}
												</View>
											)}

											{/* Step 2: Date, heure et table */}
											{step === 2 && (
												<View style={modalStyles.stepContent}>
													{/* Date et Heure côte à côte */}
													<View style={modalStyles.dateTimeRow}>
														<View
															style={{ flex: 1, marginRight: THEME.spacing.md }}
														>
															<InputField
																label="Date"
																icon="calendar-outline"
																required
																error={errors.reservationDate}
																THEME={THEME}
																modalStyles={modalStyles}
															>
																<View style={modalStyles.datePickerWrapper}>
																	<DateTimePicker
																		mode="date"
																		value={
																			reservationDate
																				? new Date(reservationDate)
																				: new Date()
																		}
																		minimumDate={new Date()}
																		onChange={(event, selectedDate) => {
																			if (selectedDate) {
																				const yyyy = selectedDate.getFullYear();
																				const mm = String(
																					selectedDate.getMonth() + 1,
																				).padStart(2, "0");
																				const dd = String(
																					selectedDate.getDate(),
																				).padStart(2, "0");
																				setReservationDate(
																					`${yyyy}-${mm}-${dd}`,
																				);
																			}
																		}}
																		themeVariant="dark"
																		style={{ flex: 1 }}
																	/>
																</View>
															</InputField>
														</View>

														<View style={{ flex: 1 }}>
															<InputField
																label="Heure"
																icon="time-outline"
																required
																error={errors.reservationTime}
																THEME={THEME}
																modalStyles={modalStyles}
															>
																{/* ✨ Bouton assistant suggestion */}
																{reservationDate && (
																	<TouchableOpacity
																		style={modalStyles.suggestButton}
																		onPress={handleSuggest}
																		disabled={suggestionLoading}
																	>
																		{suggestionLoading ? (
																			<ActivityIndicator
																				size="small"
																				color={THEME.colors.primary.amber}
																			/>
																		) : (
																			<>
																				<Ionicons
																					name="sparkles-outline"
																					size={13}
																					color={THEME.colors.primary.amber}
																				/>
																				<Text
																					style={modalStyles.suggestButtonText}
																				>
																					Suggérer un créneau
																				</Text>
																			</>
																		)}
																	</TouchableOpacity>
																)}
																{/* Résultats suggestion */}
																{suggestionResult && (
																	<View style={modalStyles.suggestionPanel}>
																		<Text style={modalStyles.suggestionSummary}>
																			{suggestionResult.summary}
																		</Text>
																		{suggestionResult.suggestions?.map(
																			(s, i) => (
																				<TouchableOpacity
																					key={i}
																					style={modalStyles.suggestionItem}
																					onPress={() => {
																						setReservationTime(s.time);
																						setSuggestionResult(null);
																					}}
																				>
																					<View style={{ flex: 1 }}>
																						<Text
																							style={
																								modalStyles.suggestionLabel
																							}
																						>
																							{s.label} · {s.time}
																						</Text>
																						<Text
																							style={
																								modalStyles.suggestionReason
																							}
																						>
																							{s.reason}
																						</Text>
																					</View>
																					<View
																						style={modalStyles.suggestionBadge}
																					>
																						<Text
																							style={
																								modalStyles.suggestionBadgeText
																							}
																						>
																							{`${s.availableTables} table${s.availableTables > 1 ? "s" : ""}`}
																						</Text>
																					</View>
																				</TouchableOpacity>
																			),
																		)}
																	</View>
																)}
																{loadingSlots ? (
																	<View
																		style={{
																			alignItems: "center",
																			paddingVertical: 12,
																		}}
																	>
																		<ActivityIndicator
																			size="small"
																			color={THEME.colors.primary.amber}
																		/>
																	</View>
																) : availableSlots.length > 0 ? (
																	<View style={modalStyles.slotsContainer}>
																		{availableSlots.map((slot) => (
																			<TouchableOpacity
																				key={slot.time}
																				style={[
																					modalStyles.slotChip,
																					reservationTime === slot.time &&
																						modalStyles.slotChipSelected,
																				]}
																				onPress={() =>
																					setReservationTime(slot.time)
																				}
																			>
																				<Text
																					style={[
																						modalStyles.slotChipText,
																						reservationTime === slot.time &&
																							modalStyles.slotChipTextSelected,
																					]}
																				>
																					{slot.time}
																				</Text>
																			</TouchableOpacity>
																		))}
																	</View>
																) : (
																	<View style={modalStyles.timeAssistantRow}>
																		<View style={modalStyles.datePickerWrapper}>
																			<DateTimePicker
																				mode="time"
																				value={
																					reservationTime
																						? new Date(
																								`1970-01-01T${reservationTime}:00`,
																							)
																						: new Date()
																				}
																				is24Hour={true}
																				display="compact"
																				onChange={(event, selectedTime) => {
																					if (selectedTime) {
																						let hh = selectedTime.getHours();
																						let mm = selectedTime.getMinutes();
																						mm = mm < 30 ? 0 : 30;
																						setReservationTime(
																							`${String(hh).padStart(
																								2,
																								"0",
																							)}:${String(mm).padStart(2, "0")}`,
																						);
																					}
																				}}
																				themeVariant="dark"
																				style={{ flex: 1 }}
																			/>
																		</View>
																		{/* Bouton Info Assistant */}
																		<TouchableOpacity
																			style={modalStyles.infoButton}
																			onPress={handleCheckAvailability}
																		>
																			<Ionicons
																				name="information-circle-outline"
																				size={24}
																				color={THEME.colors.text.secondary}
																			/>
																		</TouchableOpacity>
																	</View>
																)}
																{/* Résultats Assistant inline */}
																{assistantResult && (
																	<View
																		style={{
																			marginTop: 10,
																			padding: 12,
																			backgroundColor:
																				THEME.colors.background.elevated,
																			borderRadius: 8,
																		}}
																	>
																		<Text
																			style={{
																				color: THEME.colors.text.primary,
																				fontSize: 14,
																				fontWeight: "600",
																				marginBottom: 8,
																			}}
																		>
																			{assistantResult.status === "ok" &&
																				"✅ Créneau disponible"}
																			{assistantResult.status === "warning" &&
																				"⚠️ Créneau risqué"}
																			{assistantResult.status === "refused" &&
																				"❌ Pas de disponibilité"}
																		</Text>
																		<Text
																			style={{
																				color: THEME.colors.text.secondary,
																				fontSize: 12,
																				marginBottom: 8,
																			}}
																		>
																			{assistantResult.reason}
																		</Text>
																		{assistantResult.alternatives &&
																			assistantResult.alternatives.length >
																				0 && (
																				<View>
																					<Text
																						style={{
																							color: THEME.colors.text.primary,
																							fontSize: 12,
																							fontWeight: "600",
																							marginBottom: 6,
																						}}
																					>
																						Autres horaires disponibles :
																					</Text>
																					{assistantResult.alternatives.map(
																						(alt, idx) => (
																							<TouchableOpacity
																								key={idx}
																								onPress={() => {
																									setReservationTime(alt.time);
																									setAssistantResult(null);
																								}}
																								style={{
																									padding: 8,
																									backgroundColor:
																										THEME.colors.background
																											.card,
																									marginBottom: 4,
																									borderRadius: 6,
																									flexDirection: "row",
																									justifyContent:
																										"space-between",
																								}}
																							>
																								<Text
																									style={{
																										color:
																											THEME.colors.text.primary,
																										fontSize: 13,
																									}}
																								>
																									{alt.time}
																								</Text>
																								<Text
																									style={{
																										color:
																											THEME.colors.text
																												.secondary,
																										fontSize: 12,
																									}}
																								>
																									{alt.availableSeats} places
																								</Text>
																							</TouchableOpacity>
																						),
																					)}
																				</View>
																			)}
																	</View>
																)}
															</InputField>
														</View>
													</View>

													{/* ⭐ IA Alternatives créneaux */}
													{hasAiSlotSuggestions &&
														reservationDate &&
														reservationTime && (
															<TouchableOpacity
																style={[
																	modalStyles.aiAltButton,
																	aiLoading.alternatives && { opacity: 0.6 },
																]}
																onPress={handleGetAlternatives}
																disabled={!!aiLoading.alternatives}
															>
																{aiLoading.alternatives ? (
																	<ActivityIndicator
																		size="small"
																		color="#F59E0B"
																	/>
																) : (
																	<>
																		<Ionicons
																			name="git-branch-outline"
																			size={13}
																			color="#F59E0B"
																		/>
																		<Text style={modalStyles.aiAltButtonText}>
																			Créneaux alternatifs IA
																		</Text>
																	</>
																)}
															</TouchableOpacity>
														)}
													{aiAlternatives && aiAlternatives.length > 0 && (
														<View style={modalStyles.aiAltPanel}>
															<Text style={modalStyles.aiAltTitle}>
																Suggestions IA
															</Text>
															<View style={modalStyles.aiAltRow}>
																{aiAlternatives.slice(0, 6).map((alt, idx) => (
																	<TouchableOpacity
																		key={idx}
																		style={modalStyles.aiAltChip}
																		onPress={() => {
																			if (alt.date)
																				setReservationDate(alt.date);
																			setReservationTime(alt.time);
																			setAiAlternatives(null);
																		}}
																	>
																		<Text style={modalStyles.aiAltChipTime}>
																			{alt.dayOffset
																				? `+${alt.dayOffset}j `
																				: ""}
																			{alt.time}
																		</Text>
																		<Text style={modalStyles.aiAltChipSub}>
																			{alt.availableTables}T
																		</Text>
																	</TouchableOpacity>
																))}
															</View>
														</View>
													)}

													{/* Table */}
													<InputField
														label="Table (optionnel)"
														icon="grid-outline"
														THEME={THEME}
														modalStyles={modalStyles}
													>
														{loadingTables ? (
															<Text
																style={{
																	color: THEME.colors.text.secondary,
																	fontSize: 12,
																}}
															>
																Chargement des disponibilités...
															</Text>
														) : (
															<TableSelector
																tables={tablesWithAvailability}
																selectedId={selectedTableId}
																onSelect={setSelectedTableId}
																THEME={THEME}
																modalStyles={modalStyles}
															/>
														)}
													</InputField>
													{/* Notes additionnelles */}
													<InputField
														label="Allergies / Restrictions"
														icon="warning-outline"
														THEME={THEME}
														modalStyles={modalStyles}
													>
														<TextInput
															placeholder="Ex: Sans gluten, allergie aux fruits de mer..."
															value={allergies}
															onChangeText={setAllergies}
															style={[
																modalStyles.input,
																modalStyles.inputMultiline,
															]}
															placeholderTextColor={THEME.colors.text.muted}
															multiline
															numberOfLines={2}
														/>
													</InputField>
													<InputField
														label="Notes supplémentaires"
														icon="document-text-outline"
														THEME={THEME}
														modalStyles={modalStyles}
													>
														<TextInput
															placeholder="Ex: Anniversaire, demande spéciale..."
															value={notes}
															onChangeText={setNotes}
															style={[
																modalStyles.input,
																modalStyles.inputMultiline,
															]}
															placeholderTextColor={THEME.colors.text.muted}
															multiline
															numberOfLines={2}
														/>
													</InputField>
												</View>
											)}
										</>
									)}
								</ScrollView>

								{/* Footer avec boutons */}
								<View style={modalStyles.footer}>
									{/* 🍔 Mode snack: boutons simplifiés */}
									{isSnackMode ? (
										<>
											<TouchableOpacity
												style={modalStyles.cancelButton}
												onPress={handleClose}
											>
												<Ionicons
													name="close-outline"
													size={18}
													color={THEME.colors.text.secondary}
												/>
												<Text style={modalStyles.cancelButtonText}>
													Annuler
												</Text>
											</TouchableOpacity>

											<TouchableOpacity
												style={modalStyles.confirmButton}
												onPress={handleCreate}
											>
												<LinearGradient
													colors={[
														THEME.colors.primary.amber,
														THEME.colors.primary.amberDark,
													]}
													start={{ x: 0, y: 0 }}
													end={{ x: 1, y: 0 }}
													style={modalStyles.confirmGradient}
												>
													<Text style={modalStyles.confirmButtonText}>
														Créer
													</Text>
													<Ionicons
														name="checkmark-outline"
														size={18}
														color="#FFF"
													/>
												</LinearGradient>
											</TouchableOpacity>
										</>
									) : (
										<>
											<TouchableOpacity
												style={modalStyles.cancelButton}
												onPress={step === 1 ? handleClose : prevStep}
											>
												<Ionicons
													name={
														step === 1 ? "close-outline" : "arrow-back-outline"
													}
													size={18}
													color={THEME.colors.text.secondary}
												/>
												<Text style={modalStyles.cancelButtonText}>
													{step === 1 ? "Annuler" : "Retour"}
												</Text>
											</TouchableOpacity>

											<TouchableOpacity
												style={modalStyles.confirmButton}
												onPress={step === 1 ? nextStep : handleCreate}
											>
												<LinearGradient
													colors={[
														THEME.colors.primary.amber,
														THEME.colors.primary.amberDark,
													]}
													start={{ x: 0, y: 0 }}
													end={{ x: 1, y: 0 }}
													style={modalStyles.confirmGradient}
												>
													<Text style={modalStyles.confirmButtonText}>
														{step === 1 ? "Suivant" : "Confirmer"}
													</Text>
													<Ionicons
														name={
															step === 1
																? "arrow-forward-outline"
																: "checkmark-outline"
														}
														size={18}
														color="#FFF"
													/>
												</LinearGradient>
											</TouchableOpacity>
										</>
									)}
								</View>
							</View>
						</View>
					</KeyboardAvoidingView>
				</Modal>
			</>
		);
	},
);

NewReservationModal.displayName = "NewReservationModal";

// ─────────────── Styles ───────────────
const createStyles = (THEME) =>
	StyleSheet.create({
		overlay: {
			flex: 1,
			backgroundColor: "rgba(12, 15, 23, 0.9)",
			justifyContent: "center",
			alignItems: "center",
			padding: THEME.spacing.xl,
		},
		card: {
			width: Math.min(SCREEN_WIDTH - 48, 500),
			maxHeight: "90%",
			backgroundColor: THEME.colors.background.card,
			borderRadius: THEME.radius["2xl"],
			borderWidth: 1,
			borderColor: THEME.colors.border.subtle,
			overflow: "hidden",
		},
		header: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "flex-start",
			padding: THEME.spacing.xl,
			paddingBottom: THEME.spacing.lg,
		},
		title: {
			fontSize: 22,
			fontWeight: "700",
			color: THEME.colors.text.primary,
			marginBottom: THEME.spacing.xs,
		},
		subtitle: {
			fontSize: 14,
			color: THEME.colors.text.muted,
		},
		closeButton: {
			width: 36,
			height: 36,
			borderRadius: 18,
			backgroundColor: THEME.colors.background.elevated,
			alignItems: "center",
			justifyContent: "center",
		},
		stepContainer: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			paddingHorizontal: THEME.spacing.xl,
			paddingBottom: THEME.spacing.lg,
		},
		stepItem: {
			flexDirection: "row",
			alignItems: "center",
		},
		stepDot: {
			width: 28,
			height: 28,
			borderRadius: 14,
			backgroundColor: THEME.colors.background.elevated,
			borderWidth: 2,
			borderColor: THEME.colors.border.default,
			alignItems: "center",
			justifyContent: "center",
		},
		stepDotActive: {
			borderColor: THEME.colors.primary.amber,
			backgroundColor: `${THEME.colors.primary.amber}20`,
		},
		stepDotCompleted: {
			backgroundColor: THEME.colors.primary.amber,
			borderColor: THEME.colors.primary.amber,
		},
		stepNumber: {
			fontSize: 12,
			fontWeight: "600",
			color: THEME.colors.text.muted,
		},
		stepNumberActive: {
			color: THEME.colors.primary.amber,
		},
		stepLine: {
			width: 60,
			height: 2,
			backgroundColor: THEME.colors.border.default,
			marginHorizontal: THEME.spacing.sm,
		},
		stepLineCompleted: {
			backgroundColor: THEME.colors.primary.amber,
		},
		divider: {
			height: 1,
			marginHorizontal: THEME.spacing.xl,
		},
		stepContent: {
			padding: THEME.spacing.xl,
			paddingTop: THEME.spacing.lg,
		},
		inputWrapper: {
			marginBottom: THEME.spacing.lg,
		},
		labelRow: {
			flexDirection: "row",
			alignItems: "center",
			marginBottom: THEME.spacing.sm,
		},
		label: {
			fontSize: 14,
			fontWeight: "600",
			color: THEME.colors.text.secondary,
			marginLeft: THEME.spacing.sm,
		},
		input: {
			backgroundColor: THEME.colors.background.elevated,
			borderRadius: THEME.radius.lg,
			padding: THEME.spacing.lg,
			fontSize: 16,
			color: THEME.colors.text.primary,
			borderWidth: 1,
			borderColor: THEME.colors.border.subtle,
		},
		inputError: {
			borderColor: THEME.colors.status.error,
		},
		inputMultiline: {
			minHeight: 70,
			textAlignVertical: "top",
		},
		errorText: {
			fontSize: 12,
			color: THEME.colors.status.error,
			marginTop: THEME.spacing.xs,
			marginLeft: THEME.spacing.sm,
		},
		personSelector: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			backgroundColor: THEME.colors.background.elevated,
			borderRadius: THEME.radius.lg,
			padding: THEME.spacing.sm,
			borderWidth: 1,
			borderColor: THEME.colors.border.subtle,
		},
		personButton: {
			width: 44,
			height: 44,
			borderRadius: 22,
			backgroundColor: THEME.colors.background.card,
			alignItems: "center",
			justifyContent: "center",
			borderWidth: 1,
			borderColor: THEME.colors.border.subtle,
		},
		personButtonDisabled: {
			opacity: 0.4,
		},
		personValueContainer: {
			alignItems: "center",
			paddingHorizontal: THEME.spacing["2xl"],
		},
		personValue: {
			fontSize: 28,
			fontWeight: "700",
			color: THEME.colors.primary.amber,
		},
		personLabel: {
			fontSize: 12,
			color: THEME.colors.text.muted,
			marginTop: 2,
		},
		dateTimeRow: {
			flexDirection: "row",
		},
		datePickerWrapper: {
			backgroundColor: THEME.colors.background.elevated,
			borderRadius: THEME.radius.lg,
			borderWidth: 1,
			borderColor: THEME.colors.border.subtle,
			overflow: "hidden",
			minHeight: 50,
			justifyContent: "center",
			flex: 1,
		},
		timeAssistantRow: {
			flexDirection: "row",
			alignItems: "center",
			gap: THEME.spacing.sm,
		},
		assistantButton: {
			width: 44,
			height: 44,
			borderRadius: 22,
			backgroundColor: `${THEME.colors.primary.amber}20`,
			alignItems: "center",
			justifyContent: "center",
			borderWidth: 2,
			borderColor: `${THEME.colors.primary.amber}40`,
		},
		infoButton: {
			width: 44,
			height: 44,
			borderRadius: 22,
			backgroundColor: `${THEME.colors.text.secondary}10`,
			alignItems: "center",
			justifyContent: "center",
			borderWidth: 1,
			borderColor: `${THEME.colors.text.secondary}30`,
		},
		slotsContainer: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: THEME.spacing.sm,
			paddingVertical: THEME.spacing.sm,
		},
		slotChip: {
			paddingVertical: THEME.spacing.sm,
			paddingHorizontal: THEME.spacing.md,
			borderRadius: THEME.radius.full || 99,
			borderWidth: 1,
			borderColor: THEME.colors.border.subtle,
			backgroundColor: THEME.colors.background.elevated,
		},
		slotChipSelected: {
			borderColor: THEME.colors.primary.amber,
			backgroundColor: `${THEME.colors.primary.amber}20`,
		},
		slotChipText: {
			fontSize: 13,
			fontWeight: "500",
			color: THEME.colors.text.secondary,
		},
		slotChipTextSelected: {
			color: THEME.colors.primary.amber,
			fontWeight: "700",
		},
		suggestButton: {
			flexDirection: "row",
			alignItems: "center",
			gap: 6,
			paddingVertical: THEME.spacing.sm,
			paddingHorizontal: THEME.spacing.md,
			marginBottom: THEME.spacing.sm,
			borderRadius: THEME.radius.full || 99,
			backgroundColor: `${THEME.colors.primary.amber}12`,
			borderWidth: 1,
			borderColor: `${THEME.colors.primary.amber}30`,
			alignSelf: "flex-start",
		},
		suggestButtonText: {
			fontSize: 12,
			fontWeight: "600",
			color: THEME.colors.primary.amber,
		},
		suggestionPanel: {
			marginTop: THEME.spacing.sm,
			marginBottom: THEME.spacing.sm,
			padding: THEME.spacing.md,
			backgroundColor: THEME.colors.background.elevated,
			borderRadius: THEME.radius.md,
			borderWidth: 1,
			borderColor: `${THEME.colors.primary.amber}25`,
		},
		suggestionSummary: {
			fontSize: 12,
			color: THEME.colors.text.secondary,
			marginBottom: THEME.spacing.sm,
		},
		suggestionItem: {
			flexDirection: "row",
			alignItems: "center",
			padding: THEME.spacing.md,
			marginBottom: THEME.spacing.xs,
			backgroundColor: THEME.colors.background.card,
			borderRadius: THEME.radius.sm,
			borderWidth: 1,
			borderColor: THEME.colors.border.subtle,
		},
		suggestionLabel: {
			fontSize: 13,
			fontWeight: "700",
			color: THEME.colors.text.primary,
			marginBottom: 2,
		},
		suggestionReason: {
			fontSize: 11,
			color: THEME.colors.text.secondary,
		},
		suggestionBadge: {
			paddingVertical: 4,
			paddingHorizontal: 8,
			backgroundColor: `${THEME.colors.primary.amber}20`,
			borderRadius: THEME.radius.full || 99,
			marginLeft: THEME.spacing.sm,
		},
		suggestionBadgeText: {
			fontSize: 11,
			fontWeight: "700",
			color: THEME.colors.primary.amber,
		},
		tableGrid: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: THEME.spacing.sm,
		},
		tableItem: {
			minWidth: 60,
			paddingVertical: THEME.spacing.md,
			paddingHorizontal: THEME.spacing.lg,
			backgroundColor: THEME.colors.background.elevated,
			borderRadius: THEME.radius.md,
			borderWidth: 1,
			borderColor: THEME.colors.border.subtle,
			alignItems: "center",
		},
		tableItemSelected: {
			borderColor: THEME.colors.primary.amber,
			backgroundColor: `${THEME.colors.primary.amber}15`,
		},
		tableItemUnavailable: {
			opacity: 0.5,
			backgroundColor: THEME.colors.background.dark,
		},
		tableText: {
			fontSize: 14,
			fontWeight: "600",
			color: THEME.colors.text.secondary,
		},
		tableTextSelected: {
			color: THEME.colors.primary.amber,
		},
		tableTextUnavailable: {
			color: THEME.colors.text.muted,
		},
		tableOccupied: {
			fontSize: 10,
			color: THEME.colors.status.error,
			marginTop: 2,
		},
		footer: {
			flexDirection: "row",
			justifyContent: "space-between",
			padding: THEME.spacing.xl,
			paddingTop: THEME.spacing.lg,
			borderTopWidth: 1,
			borderTopColor: THEME.colors.border.subtle,
			backgroundColor: THEME.colors.background.elevated,
		},
		cancelButton: {
			flexDirection: "row",
			alignItems: "center",
			paddingVertical: THEME.spacing.md,
			paddingHorizontal: THEME.spacing.lg,
		},
		cancelButtonText: {
			fontSize: 15,
			fontWeight: "500",
			color: THEME.colors.text.secondary,
			marginLeft: THEME.spacing.sm,
		},
		confirmButton: {
			borderRadius: THEME.radius.lg,
			overflow: "hidden",
		},
		confirmGradient: {
			flexDirection: "row",
			alignItems: "center",
			paddingVertical: THEME.spacing.md,
			paddingHorizontal: THEME.spacing.xl,
		},
		confirmButtonText: {
			fontSize: 15,
			fontWeight: "600",
			color: "#FFF",
			marginRight: THEME.spacing.sm,
		},
		// ── IA Styles ──────────────────────────────────────────────────
		smartDurationHint: {
			flexDirection: "row",
			alignItems: "center",
			gap: 6,
			backgroundColor: "rgba(245, 158, 11, 0.08)",
			borderRadius: THEME.radius.sm,
			paddingVertical: 6,
			paddingHorizontal: THEME.spacing.sm,
			marginTop: THEME.spacing.sm,
		},
		smartDurationText: {
			flex: 1,
			fontSize: 12,
			color: "#F59E0B",
			fontWeight: "500",
		},
		// ── IA Alternatives Créneaux ───────────────────────────────────
		aiAltButton: {
			flexDirection: "row",
			alignItems: "center",
			gap: 6,
			backgroundColor: "rgba(245, 158, 11, 0.10)",
			borderWidth: 1,
			borderColor: "rgba(245, 158, 11, 0.25)",
			borderRadius: THEME.radius.md,
			paddingVertical: THEME.spacing.sm,
			paddingHorizontal: THEME.spacing.md,
			alignSelf: "flex-start",
			marginBottom: THEME.spacing.sm,
		},
		aiAltButtonText: {
			fontSize: 12,
			fontWeight: "600",
			color: "#F59E0B",
		},
		aiAltPanel: {
			marginBottom: THEME.spacing.md,
			paddingVertical: THEME.spacing.sm,
			paddingHorizontal: THEME.spacing.sm,
			backgroundColor: "rgba(245, 158, 11, 0.06)",
			borderRadius: THEME.radius.md,
			borderWidth: 1,
			borderColor: "rgba(245, 158, 11, 0.18)",
		},
		aiAltTitle: {
			fontSize: 11,
			fontWeight: "600",
			color: "#F59E0B",
			marginBottom: 4,
		},
		aiAltRow: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: 6,
		},
		aiAltChip: {
			alignItems: "center",
			backgroundColor: "rgba(245, 158, 11, 0.12)",
			borderRadius: THEME.radius.sm,
			paddingVertical: 5,
			paddingHorizontal: 10,
		},
		aiAltChipTime: {
			fontSize: 13,
			fontWeight: "700",
			color: "#F59E0B",
		},
		aiAltChipSub: {
			fontSize: 10,
			color: THEME.colors.text.muted,
			marginTop: 1,
		},
	});

export default NewReservationModal;
