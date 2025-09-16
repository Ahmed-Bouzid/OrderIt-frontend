import React, { useState, useEffect } from "react";
import styles from "./styles"; // adapte le chemin si tu l'as mis dans un sous-dossier

import {
	View,
	Text,
	TouchableOpacity,
	ScrollView,
	TextInput,
	Dimensions,
	Modal,
	Alert,
	TouchableWithoutFeedback,
} from "react-native";
// import Animated, { Keyframe } from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";
const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

// const keyframeAppear = new Keyframe({
// 	0: { opacity: 0, transform: [{ scale: 0.5 }] },
// 	50: { opacity: 0.7, transform: [{ scale: 1.05 }] },
// 	100: { opacity: 1, transform: [{ scale: 1 }] },
// }).duration(500);

const EXAMPLE_REAL_TABLES = [40, 41, 42, 43, 44, 45, 60, 61, 62, 70, 71, 72];

// const clearAll = async () => {
// 	try {
// 		await AsyncStorage.clear();
// 		console.log("AsyncStorage vidé, tu peux te reconnecter");
// 	} catch (err) {
// 		console.error("Erreur en vidant AsyncStorage:", err);
// 	}
// };
// clearAll();
export default function Activity() {
	const [showRestrictionsOptions, setShowRestrictionsOptions] = useState(false);
	const [showSettings, setShowSettings] = useState(false);

	const restrictionsOptions = [
		{ label: "Aucune", value: "Aucune" },
		{ label: "Vegan", value: "Vegan" },
		{ label: "Sans gluten", value: "Sans gluten" },
		{ label: "Halal", value: "Halal" },
	];

	const [popups, setPopups] = useState([]);
	const [activeId, setActiveId] = useState(null);
	const [notesValue, setNotesValue] = useState(""); // pas activePopup.notes ici
	const [editingNotes, setEditingNotes] = useState(false);
	const [allergiesValue, setAllergiesValue] = useState("");
	const [editingAllergies, setEditingAllergies] = useState(false);
	const [showServerOptions, setShowServerOptions] = useState(false);
	const serverOptions = ["Alex", "Marie", "John", "Sophie"]; // liste des serveurs possibles

	const makeFakePopup = (id) => {
		const index = (id - 1) % EXAMPLE_REAL_TABLES.length;
		const realTable = EXAMPLE_REAL_TABLES[index];
		const now = new Date();
		const arrivalOffsetMinutes = Math.floor(Math.random() * 60);
		const arrival = new Date(now.getTime() - arrivalOffsetMinutes * 60 * 1000);

		return {
			id,
			internal: `#${id}`,
			realTable: `Table ${realTable}`,
			clientName: `Client ${id}`,
			nbPersonnes: 2 + (id % 4),
			reservationTime: "19:30",
			arrivalTime: arrival.toISOString(),
			allergies: id % 2 === 0 ? "Arachides" : "",
			restrictions: id % 3 === 0 ? "Vegan" : "",
			notes: id % 2 === 0 ? "Anniversaire - gâteau" : "",
			server: "Alex",
			orderSummary: "Entrée + Plat",
			dishStatus: "En préparation",
			paymentMethod: "Carte",
			totalAmount: `${30 + id * 5} €`,
		};
	};

	const addPopup = () => {
		const newId = popups.length + 1;
		const newPopup = makeFakePopup(newId);
		setPopups([...popups, newPopup]);
		setActiveId(newPopup.id);
	};

	const activatePopup = (id) => {
		setActiveId(id);
	};

	const editField = (field, value) => {
		setPopups((prev) =>
			prev.map((p) => (p.id === activeId ? { ...p, [field]: value } : p))
		);
	};

	const activePopup = popups.find((p) => p.id === activeId) || null;

	const getElapsed = (iso) => {
		if (!iso) return "-";
		const diffMs = Date.now() - new Date(iso).getTime();
		const diffMin = Math.floor(diffMs / 60000);
		if (diffMin < 60) return `${diffMin} min`;
		const hours = Math.floor(diffMin / 60);
		const minutes = diffMin % 60;
		return `${hours}h ${minutes}m`;
	};
	useEffect(() => {
		const checkToken = async () => {
			try {
				const token = await AsyncStorage.getItem("token");
				// ici tu peux naviguer vers l'écran de connexion si token est null
			} catch (e) {
				console.error("Erreur AsyncStorage:", e);
			}
		};

		checkToken();
	}, []);

	return (
		<View style={styles.container}>
			{popups.length === 0 && (
				<TouchableOpacity style={styles.button} onPress={addPopup}>
					<Text style={styles.buttonText}>Commencer</Text>
				</TouchableOpacity>
			)}
			<View style={styles.headerRow}>
				<View>
					<Text style={styles.realTableText}>
						{activePopup?.realTable || ""}
					</Text>
					<Text style={styles.internalText}>{activePopup?.internal || ""}</Text>
				</View>
			</View>

			{activePopup && (
				<View style={styles.popupMainWrapper}>
					<View style={styles.popupMain}>
						{/* Header du popup avec la roue */}
						<View style={styles.headerRow}>
							<View>
								<Text style={styles.realTableText}>
									{activePopup.realTable}
								</Text>
								<Text style={styles.internalText}>{activePopup.internal}</Text>
							</View>

							<TouchableOpacity
								style={styles.settingsButton}
								onPress={() => setShowSettings(true)}
							>
								<Text style={{ fontSize: 24 }}>⚙️</Text>
							</TouchableOpacity>
						</View>

						{/* Statut */}
						<View style={styles.statusRow}>
							<View style={[styles.badge, styles.badgeOccupied]}>
								<Text style={styles.badgeText}>Occupée</Text>
							</View>
							<Text style={styles.smallText}>
								Réservée: {activePopup.reservationTime} (
								{activePopup.reservationDate})
							</Text>
							<Text style={styles.smallText}>
								• {activePopup.nbPersonnes} pers.
							</Text>
							<Text style={styles.smallText}>
								• {activePopup.reservationSource || "Sur place"}
							</Text>
						</View>

						<ScrollView
							style={styles.contentScroll}
							contentContainerStyle={{ paddingBottom: 20 }}
						>
							{/* Détails réservation */}
							<View style={styles.block}>
								<Text style={styles.blockTitle}>Détails réservation</Text>
								<View style={styles.row}>
									<Text style={styles.label}>Nom :</Text>
									<Text style={styles.value}>{activePopup.clientName}</Text>
								</View>
								<View style={styles.row}>
									<Text style={styles.label}>Arrivée :</Text>
									<Text style={styles.value}>
										{activePopup.arrivalTime.slice(11, 16)}
									</Text>
									<Text style={styles.hint}>
										({getElapsed(activePopup.arrivalTime)})
									</Text>
								</View>
								<View style={styles.row}>
									<Text style={styles.label}>Date réservation :</Text>
									<Text style={styles.value}>
										{activePopup.reservationDate}
									</Text>
								</View>
							</View>

							{/* Spécificités */}
							<View style={styles.block}>
								<Text style={styles.blockTitle}>Spécificités</Text>

								{/* Allergies éditables */}
								<View style={[styles.row, { marginBottom: 4 }]}>
									<Text style={styles.label}>Allergies :</Text>

									{editingAllergies ? (
										<TextInput
											style={[
												styles.value,
												{
													borderBottomWidth: 1,
													borderColor: "#ccc",
													minHeight: 40,
												},
											]}
											value={allergiesValue}
											onChangeText={setAllergiesValue}
											onBlur={() => {
												editField("allergies", allergiesValue); // sauvegarde la valeur dans activePopup
												setEditingAllergies(false); // repasse en mode texte
											}}
											autoFocus
											multiline
										/>
									) : (
										<TouchableOpacity
											onPress={() => {
												setAllergiesValue(activePopup.allergies || "");
												setEditingAllergies(true);
											}}
										>
											<Text style={styles.value}>
												{activePopup.allergies || "Aucune"}
												{!activePopup.allergies
													? " (toucher pour modifier)"
													: ""}
											</Text>
										</TouchableOpacity>
									)}
								</View>

								{/* Restrictions DROPDOWN en dehors du ScrollView */}
								<View style={[styles.row, { marginBottom: 4 }]}>
									<Text style={styles.label}>Restrictions :</Text>
									<View style={{ flex: 1 }}>
										{showRestrictionsOptions ? (
											<View style={styles.simpleDropdown}>
												{restrictionsOptions.map((opt) => (
													<TouchableOpacity
														key={opt.value}
														style={styles.simpleDropdownItem}
														onPress={() => {
															editField("restrictions", opt.value);
															setShowRestrictionsOptions(false);
														}}
													>
														<Text style={styles.dropdownOptionText}>
															{opt.label}
														</Text>
													</TouchableOpacity>
												))}
											</View>
										) : (
											<TouchableOpacity
												style={styles.valueButton}
												onPress={() => setShowRestrictionsOptions(true)}
											>
												<Text style={styles.value}>
													{activePopup.restrictions || "Aucune"}
												</Text>
											</TouchableOpacity>
										)}
									</View>
								</View>

								{/* Observations */}
								<ScrollView
									style={styles.contentScroll}
									contentContainerStyle={{ paddingBottom: 20 }}
								>
									<View style={[styles.row, { marginBottom: 0 }]}>
										<Text style={styles.label}>Observations :</Text>
										{editingNotes ? (
											<TextInput
												style={[
													styles.value,
													{
														borderBottomWidth: 1,
														borderColor: "#ccc",
														minHeight: 40,
													},
												]}
												value={notesValue}
												onChangeText={setNotesValue}
												onBlur={() => {
													editField("notes", notesValue);
													setEditingNotes(false);
												}}
												autoFocus
												multiline
											/>
										) : (
											<TouchableOpacity
												onPress={() => {
													setNotesValue(activePopup.notes || "");
													setEditingNotes(true);
												}}
											>
												<Text style={styles.value}>
													{activePopup.notes || "Ajouter une observation..."}
												</Text>
											</TouchableOpacity>
										)}
									</View>
								</ScrollView>
							</View>

							{/* Service */}
							<View style={styles.block}>
								<Text style={styles.blockTitle}>Service</Text>

								{/* Serveur éditable via dropdown */}
								<View style={[styles.row, { marginBottom: 4 }]}>
									<Text style={styles.label}>Serveur :</Text>
									<View style={{ flex: 1 }}>
										{showServerOptions ? (
											<View style={styles.simpleDropdown}>
												{serverOptions.map((srv) => (
													<TouchableOpacity
														key={srv}
														style={styles.simpleDropdownItem}
														onPress={() => {
															editField("server", srv);
															setShowServerOptions(false);
														}}
													>
														<Text style={styles.dropdownOptionText}>{srv}</Text>
													</TouchableOpacity>
												))}
											</View>
										) : (
											<TouchableOpacity
												style={styles.valueButton}
												onPress={() => setShowServerOptions(true)}
											>
												<Text style={styles.value}>
													{activePopup.server || "Aucun"}{" "}
													{/* valeur par défaut */}
												</Text>
											</TouchableOpacity>
										)}
									</View>
								</View>

								{/* Les autres champs restent statiques */}
								<View style={styles.row}>
									<Text style={styles.label}>Commande :</Text>
									<Text style={styles.value}>{activePopup.orderSummary}</Text>
								</View>
								<View style={styles.row}>
									<Text style={styles.label}>Statut plats :</Text>
									<Text style={styles.value}>{activePopup.dishStatus}</Text>
								</View>
							</View>

							{/* Paiement */}
							<View style={styles.block}>
								<Text style={styles.blockTitle}>Paiement & notes</Text>
								<View style={styles.row}>
									<Text style={styles.label}>Total :</Text>
									<Text style={styles.value}>{activePopup.totalAmount}</Text>
								</View>
								<View style={styles.row}>
									<Text style={styles.label}>Paiement :</Text>
									<Text style={styles.value}>{activePopup.paymentMethod}</Text>
								</View>
								<View style={styles.row}>
									<Text style={styles.label}>Notes staff :</Text>
									<Text style={styles.value}>—</Text>
								</View>
							</View>
						</ScrollView>
					</View>
				</View>
			)}

			{/* Miniatures */}
			{popups.length > 0 && (
				<View style={styles.miniWrapper}>
					{popups
						.filter((p) => p.id !== activeId)
						.map((p) => (
							<TouchableOpacity
								key={p.id}
								style={styles.popupMini}
								onPress={() => activatePopup(p.id)}
							>
								<Text style={styles.miniTitle}>{p.internal}</Text>
								<Text style={styles.miniSub}>{p.realTable}</Text>
							</TouchableOpacity>
						))}

					<TouchableOpacity
						style={[styles.popupMini, styles.addButton]}
						onPress={addPopup}
					>
						<Text style={styles.addText}>+</Text>
					</TouchableOpacity>
				</View>
			)}
			<Modal
				visible={showSettings}
				transparent
				animationType="fade"
				onRequestClose={() => setShowSettings(false)}
			>
				<TouchableWithoutFeedback onPress={() => setShowSettings(false)}>
					<View style={styles.overlaySettings}>
						<TouchableWithoutFeedback>
							<View style={styles.modalSettings}>
								<Text style={styles.modalTitleSettings}>
									Options de réservation
								</Text>

								{/* Bouton Terminer */}
								<TouchableOpacity
									style={[
										styles.modalButtonSettings,
										{ backgroundColor: "#4285F4" },
									]}
									onPress={() =>
										Alert.alert(
											"Confirmation",
											"Êtes-vous sûr de vouloir terminer cette réservation ?",
											[
												{ text: "Non", style: "cancel" },
												{
													text: "Oui",
													onPress: () => {
														setShowSettings(false);
														console.log(
															"✅ Terminer réservation",
															activePopup?.id
														);
													},
												},
											]
										)
									}
								>
									<Text style={styles.buttonTextSettings}>
										✅ Terminer la réservation
									</Text>
								</TouchableOpacity>

								{/* Bouton Annuler */}
								<TouchableOpacity
									style={[
										styles.modalButtonSettings,
										{ backgroundColor: "#EA4335" },
									]}
									onPress={() =>
										Alert.alert(
											"Confirmation",
											"Êtes-vous sûr de vouloir annuler cette réservation ?",
											[
												{ text: "Non", style: "cancel" },
												{
													text: "Oui",
													onPress: () => {
														setShowSettings(false);
														console.log(
															"❌ Annuler réservation",
															activePopup?.id
														);
													},
												},
											]
										)
									}
								>
									<Text style={styles.buttonTextSettings}>
										❌ Annuler la réservation
									</Text>
								</TouchableOpacity>

								{/* Bouton Fermer */}
								<TouchableOpacity
									style={styles.modalButtonCancel}
									onPress={() => setShowSettings(false)}
								>
									<Text style={styles.buttonTextCancel}>Fermer</Text>
								</TouchableOpacity>
							</View>
						</TouchableWithoutFeedback>
					</View>
				</TouchableWithoutFeedback>
			</Modal>
		</View>
	);
}
