import React from "react";
import {
	Modal,
	View,
	Text,
	TouchableOpacity,
	TouchableWithoutFeedback,
} from "react-native";
import styles from "../styles";

const AssignTableModal = React.memo(
	({ visible, onClose, tables, activeReservation, onAssignTable, theme }) => {
		// ⭐ Guard clause
		if (!activeReservation || !visible) return null;

		const safeTheme = theme || { textColor: "#000", cardColor: "#fff" };
		const safeOnClose = onClose || (() => {});
		const safeTables = Array.isArray(tables) ? tables : [];

		return (
			<Modal
				visible={visible}
				transparent
				animationType="fade"
				onRequestClose={safeOnClose}
			>
				<View
					style={[
						styles.overlaySettings,
						{ backgroundColor: "rgba(0,0,0,0.5)" },
					]}
				>
					{/* Zone clicable pour fermer la modal */}
					<TouchableWithoutFeedback onPress={safeOnClose}>
						<View style={{ flex: 1 }} />
					</TouchableWithoutFeedback>

					{/* Carte blanche centrée */}
					<View
						style={{
							width: 300,
							padding: 20,
							backgroundColor: safeTheme.cardColor,
							borderRadius: 10,
							position: "absolute",
							top: "50%",
							left: "50%",
							transform: [{ translateX: -150 }, { translateY: -75 }],
						}}
					>
						<Text
							style={{
								textAlign: "center",
								marginBottom: 10,
								color: safeTheme.textColor,
								fontSize: 16,
								fontWeight: "bold",
							}}
						>
							Choisir une table
						</Text>

						{/* Conteneur des boutons en grille */}
						<View
							style={{
								flexDirection: "row",
								flexWrap: "wrap",
								justifyContent: "center",
								gap: 10,
							}}
						>
							{safeTables.map((table) => {
								if (!table) return null;

								const isAssignedToCurrent =
									table._id === activeReservation?.tableId;
								const isAvailableForSelection =
									table.isAvailable || isAssignedToCurrent;

								return (
									<TouchableOpacity
										key={table._id || Math.random().toString()}
										onPress={async () => {
											if (!isAvailableForSelection || !onAssignTable) return;
											await onAssignTable(activeReservation._id, table._id);
										}}
										disabled={!isAvailableForSelection}
										style={{
											padding: 10,
											backgroundColor: isAssignedToCurrent
												? "#000000" // ⭐ NOIR si assignée à cette résa
												: table.isAvailable
												? "#b3ff00ff" // ⭐ VERT si disponible
												: "#2b10a2ff", // ⭐ ROUGE si occupée par autre résa
											borderRadius: 5,
											width: 60,
											alignItems: "center",
											marginBottom: 10,
											opacity: isAvailableForSelection ? 1 : 0.6,
										}}
									>
										<Text
											style={{
												color: "#fff",
												fontWeight: isAssignedToCurrent ? "bold" : "normal",
											}}
										>
											{table.number || "?"}
										</Text>
									</TouchableOpacity>
								);
							})}
						</View>

						<TouchableOpacity
							onPress={safeOnClose}
							style={{
								marginTop: 15,
								padding: 10,
								backgroundColor: "#666",
								borderRadius: 5,
							}}
						>
							<Text
								style={{
									color: "#fff",
									textAlign: "center",
									fontWeight: "bold",
								}}
							>
								Fermer
							</Text>
						</TouchableOpacity>
					</View>
				</View>
			</Modal>
		);
	}
);

AssignTableModal.displayName = "AssignTableModal";

export default AssignTableModal;
