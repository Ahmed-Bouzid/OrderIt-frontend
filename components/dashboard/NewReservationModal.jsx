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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import useThemeStore from "../../src/stores/useThemeStore";
import { useTheme } from "../../hooks/useTheme";
import { useAuthFetch } from "../../hooks/useAuthFetch";

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
	)
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
	)
);

// ─────────────── Main Component ───────────────
const NewReservationModal = React.memo(
	({ visible, onClose, onCreate, tables, theme, initialData = null }) => {
		const { themeMode } = useThemeStore();
		const THEME = useTheme(); // Utilise le hook avec multiplicateur de police
		const authFetch = useAuthFetch();

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
			tables || []
		);
		const [loadingTables, setLoadingTables] = useState(false);

		// ⭐ Assistant de réservations
		const [assistantVisible, setAssistantVisible] = useState(false);
		const [assistantResult, setAssistantResult] = useState(null);
		const [assistantLoading, setAssistantLoading] = useState(false);

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

					console.log("🔄 [TABLES] Chargement disponibilité:", {
						date: dateISO,
						time: reservationTime,
						restaurantId,
					});

					const enrichedTables = await authFetch(
						`/tables/restaurant/${restaurantId}/available?date=${dateISO}&time=${reservationTime}`
					);

					console.log("✅ [TABLES] Tables avec disponibilité:", enrichedTables);
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
				console.log("📋 Pré-remplissage avec données:", initialData.clientName);
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
					initialData.tableId?._id || initialData.tableId || null
				);
				setStep(1);
			}
		}, [visible, initialData]);

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

		const validateStep1 = useCallback(() => {
			const newErrors = {};
			if (!clientName.trim()) newErrors.clientName = "Nom requis";
			if (!phone.trim()) newErrors.phone = "Téléphone requis";
			if (nbPersonnes < 1) newErrors.nbPersonnes = "Minimum 1 personne";
			setErrors(newErrors);
			return Object.keys(newErrors).length === 0;
		}, [clientName, phone, nbPersonnes]);

		const validateStep2 = useCallback(() => {
			const newErrors = {};
			if (!reservationDate) newErrors.reservationDate = "Date requise";
			if (!reservationTime) newErrors.reservationTime = "Heure requise";
			setErrors(newErrors);
			return Object.keys(newErrors).length === 0;
		}, [reservationDate, reservationTime]);
		// ⭐ Vérifier la disponibilité avec l'assistant
		const handleCheckAvailability = useCallback(async () => {
			console.log("✨ [ASSISTANT] Début vérification disponibilité");
			console.log("📅 Date:", reservationDate);
			console.log("⏰ Heure:", reservationTime);
			console.log("👥 Personnes:", nbPersonnes);

			if (!reservationDate || !reservationTime) {
				Alert.alert(
					"Informations manquantes",
					"Veuillez renseigner une date et une heure avant de vérifier la disponibilité"
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

				console.log("🏪 Restaurant ID:", restaurantId);

				if (!restaurantId) {
					throw new Error("Restaurant ID manquant");
				}

				console.log("📡 Appel API /assistant/check-availability...");

				const response = await authFetch("/assistant/check-availability", {
					method: "POST",
					body: {
						restaurantId,
						date: reservationDate,
						time: reservationTime,
						people: nbPersonnes,
					},
				});

				console.log("✅ Réponse assistant:", response);
				setAssistantResult(response);
			} catch (error) {
				console.error("❌ Erreur assistant:", error);
				Alert.alert(
					"Erreur",
					error.message || "Erreur lors de la vérification de disponibilité"
				);
				setAssistantResult({
					status: "error",
					reason:
						error.message || "Erreur lors de la vérification de disponibilité",
					alternatives: [],
				});
			} finally {
				setAssistantLoading(false);
				console.log("✨ [ASSISTANT] Fin vérification");
			}
		}, [reservationDate, reservationTime, nbPersonnes, tables, authFetch]);

		// ⭐ Sélectionner une alternative proposée par l'assistant
		const handleSelectAlternative = useCallback((time) => {
			setReservationTime(time);
			setErrors((prev) => ({ ...prev, reservationTime: null }));
		}, []);
		const handleCreate = useCallback(async () => {
			if (!validateStep2()) return;

			try {
				const success = await onCreate({
					clientName: clientName.trim(),
					phone: phone.trim(),
					reservationTime,
					reservationDate,
					nbPersonnes,
					allergies: allergies.trim(),
					restrictions: restrictions.trim(),
					notes: notes.trim(),
					tableId: selectedTableId,
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
			validateStep2,
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
										<Text style={modalStyles.title}>Nouvelle réservation</Text>
										<Text style={modalStyles.subtitle}>
											{step === 1 ? "Informations client" : "Date et table"}
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

								{/* Step Indicator */}
								<StepIndicator
									currentStep={step}
									totalSteps={2}
									modalStyles={modalStyles}
								/>
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
									{/* Step 1: Informations client */}
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
																			selectedDate.getMonth() + 1
																		).padStart(2, "0");
																		const dd = String(
																			selectedDate.getDate()
																		).padStart(2, "0");
																		setReservationDate(`${yyyy}-${mm}-${dd}`);
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
														<View style={modalStyles.timeAssistantRow}>
															<View style={modalStyles.datePickerWrapper}>
																<DateTimePicker
																	mode="time"
																	value={
																		reservationTime
																			? new Date(
																					`1970-01-01T${reservationTime}:00`
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
																					"0"
																				)}:${String(mm).padStart(2, "0")}`
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
																	assistantResult.alternatives.length > 0 && (
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
																								THEME.colors.background.card,
																							marginBottom: 4,
																							borderRadius: 6,
																							flexDirection: "row",
																							justifyContent: "space-between",
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
																									THEME.colors.text.secondary,
																								fontSize: 12,
																							}}
																						>
																							{alt.availableSeats} places
																						</Text>
																					</TouchableOpacity>
																				)
																			)}
																		</View>
																	)}
															</View>
														)}
													</InputField>
												</View>
											</View>
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
								</ScrollView>

								{/* Footer avec boutons */}
								<View style={modalStyles.footer}>
									<TouchableOpacity
										style={modalStyles.cancelButton}
										onPress={step === 1 ? handleClose : prevStep}
									>
										<Ionicons
											name={step === 1 ? "close-outline" : "arrow-back-outline"}
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
								</View>
							</View>
						</View>
					</KeyboardAvoidingView>
				</Modal>
			</>
		);
	}
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
	});

export default NewReservationModal;
