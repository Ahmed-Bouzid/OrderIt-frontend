// components/elements/ActivityComponents/ServiceSection.jsx
import React, { useMemo, useCallback } from "react";
import { View, Text, TouchableOpacity, FlatList } from "react-native";
import styles from "../../styles";

export const ServiceSection = React.memo(
	({
		activeReservation,
		theme,
		servers,
		activeServer,
		showServerOptions,
		setShowServerOptions,
		editField,
		setActiveServer,
	}) => {
		// ⭐ Valeurs sécurisées avec useMemo
		const safeTheme = useMemo(
			() =>
				theme || { cardColor: "#fff", textColor: "#000", borderColor: "#ddd" },
			[theme]
		);
		const safeServers = useMemo(
			() => (Array.isArray(servers) ? servers : []),
			[servers]
		);

		const serverDisplayName = useMemo(() => {
			if (activeServer?.name) {
				return activeServer.name;
			}
			if (activeReservation?.serverId?.name) {
				return activeReservation.serverId.name;
			}
			return "Aucun";
		}, [activeServer, activeReservation?.serverId]);

		const renderServerOption = useCallback(
			({ item: srv }) => {
				if (!srv) return null;
				return (
					<TouchableOpacity
						key={srv._id || Math.random().toString()}
						style={[
							styles.simpleDropdownItem,
							{ backgroundColor: safeTheme.cardColor },
						]}
						onPress={() => {
							editField?.("serverId", srv._id);
							setActiveServer?.(srv);
							setShowServerOptions?.(false);
						}}
					>
						<Text
							style={[
								styles.dropdownOptionText,
								{ color: safeTheme.textColor },
							]}
						>
							{srv.name || "Serveur"}
						</Text>
					</TouchableOpacity>
				);
			},
			[safeTheme, editField, setActiveServer, setShowServerOptions]
		);

		// ⭐ Guard clause APRÈS tous les hooks
		if (!activeReservation) {
			return null;
		}

		return (
			<View style={[styles.block, { backgroundColor: safeTheme.cardColor }]}>
				<Text style={[styles.blockTitle, { color: safeTheme.textColor }]}>
					Service
				</Text>

				<View style={[styles.row, { marginBottom: 4 }]}>
					<Text style={[styles.label, { color: safeTheme.textColor }]}>
						Serveur :
					</Text>
					<View style={{ flex: 1 }}>
						{showServerOptions ? (
							<View
								style={[
									styles.simpleDropdown,
									{
										backgroundColor: safeTheme.cardColor,
										borderColor: safeTheme.borderColor,
									},
								]}
							>
								<FlatList
									data={safeServers}
									renderItem={renderServerOption}
									keyExtractor={(item) => item?._id || Math.random().toString()}
									scrollEnabled={false}
								/>
							</View>
						) : (
							<TouchableOpacity
								style={[
									styles.valueButton,
									{
										backgroundColor: safeTheme.cardColor,
										borderColor: safeTheme.borderColor,
									},
								]}
								onPress={() => setShowServerOptions?.(true)}
							>
								<Text style={[styles.value, { color: safeTheme.textColor }]}>
									{serverDisplayName}
								</Text>
							</TouchableOpacity>
						)}
					</View>
				</View>

				<View style={[styles.row, { backgroundColor: safeTheme.cardColor }]}>
					<Text style={[styles.label, { color: safeTheme.textColor }]}>
						Commande :
					</Text>
					<Text style={[styles.value, { color: safeTheme.textColor }]}>
						{activeReservation?.orderSummary || "Aucune commande"}
					</Text>
				</View>

				<View style={[styles.row, { backgroundColor: safeTheme.cardColor }]}>
					<Text style={[styles.value, { color: safeTheme.textColor }]}>
						{activeReservation?.dishStatus || "En attente"}
					</Text>
				</View>
			</View>
		);
	}
);

ServiceSection.displayName = "ServiceSection";
