/**
 * 📨 MessageForm - Formulaire pour envoyer messages de coaching
 * Utilisé dans CRM Performance
 */
import React, { useState } from "react";
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	TextInput,
	Alert,
	ScrollView,
	Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../hooks/useTheme";
import { useMessages } from "../../hooks/useMessages";

const MessageForm = ({ serverId, serverName, onClose, onSuccess }) => {
	const THEME = useTheme();
	const { sendMessage, isLoading } = useMessages();

	const [type, setType] = useState("coaching"); // meeting, planning, zonning, coaching
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [coachingItem, setCoachingItem] = useState("general");
	const [priority, setPriority] = useState("normal");

	const messageTypes = [
		{
			id: "meeting",
			label: "Réunion/Entrevue",
			icon: "calendar-outline",
			color: "#3B82F6",
		},
		{
			id: "planning",
			label: "Changement Planning",
			icon: "time-outline",
			color: "#8B5CF6",
		},
		{
			id: "zonning",
			label: "Zonning",
			icon: "location-outline",
			color: "#EC4899",
		},
		{
			id: "coaching",
			label: "Coaching",
			icon: "school-outline",
			color: "#F59E0B",
		},
	];

	const coachingItems = [
		{ id: "general", label: "Général" },
		{ id: "service_time", label: "Temps de Service" },
		{ id: "add_ons", label: "Add-ons Vendus" },
		{ id: "satisfaction", label: "Note de Satisfaction" },
	];

	const handleSend = async () => {
		// Validation
		if (!title.trim()) {
			Alert.alert("Erreur", "Veuillez entrer un titre");
			return;
		}

		if (!description.trim()) {
			Alert.alert("Erreur", "Veuillez entrer une description");
			return;
		}

		// Envoi
		const message = await sendMessage({
			type,
			title: title.trim(),
			description: description.trim(),
			coachingItem: type === "coaching" ? coachingItem : "general",
			priority,
			serverId,
		});

		if (message) {
			Alert.alert("Succès", `Message envoyé à ${serverName} ✅`, [
				{ text: "OK", onPress: () => onSuccess?.() },
			]);
			onClose?.();
		}
	};

	const selectedType = messageTypes.find((t) => t.id === type);

	return (
		<Modal
			visible={true}
			animationType="slide"
			presentationStyle="pageSheet"
			onRequestClose={onClose}
		>
			<View
				style={[styles.container, { backgroundColor: THEME.colors.background }]}
			>
				{/* Header */}
				<View
					style={[
						styles.header,
						{ backgroundColor: selectedType?.color || "#F59E0B" },
					]}
				>
					<TouchableOpacity onPress={onClose} style={styles.closeButton}>
						<Ionicons name="close" size={24} color="#FFFFFF" />
					</TouchableOpacity>
					<Text style={styles.headerTitle}>Envoyer un Message</Text>
					<View style={{ width: 40 }} />
				</View>

				<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
					{/* À : */}
					<View style={styles.section}>
						<Text style={[styles.label, { color: THEME.colors.text.primary }]}>
							À
						</Text>
						<View
							style={[
								styles.infoBox,
								{ backgroundColor: THEME.colors.background.elevated },
							]}
						>
							<Ionicons
								name="person-circle-outline"
								size={24}
								color="#6B7280"
							/>
							<Text
								style={[styles.infoText, { color: THEME.colors.text.primary }]}
							>
								{serverName}
							</Text>
						</View>
					</View>

					{/* Type de message */}
					<View style={styles.section}>
						<Text style={[styles.label, { color: THEME.colors.text.primary }]}>
							Type
						</Text>
						<View style={styles.typeSelector}>
							{messageTypes.map((t) => (
								<TouchableOpacity
									key={t.id}
									onPress={() => setType(t.id)}
									style={[
										styles.typeButton,
										type === t.id && styles.typeButtonActive,
										{
											borderColor: t.color,
											backgroundColor:
												type === t.id
													? t.color
													: THEME.colors.background.elevated,
										},
									]}
								>
									<Ionicons
										name={t.icon}
										size={16}
										color={type === t.id ? "#FFFFFF" : t.color}
									/>
									<Text
										style={[
											styles.typeButtonText,
											type === t.id && styles.typeButtonTextActive,
											{ color: type === t.id ? "#FFFFFF" : t.color },
										]}
									>
										{t.label}
									</Text>
								</TouchableOpacity>
							))}
						</View>
					</View>

					{/* Priorité */}
					<View style={styles.section}>
						<Text style={[styles.label, { color: THEME.colors.text.primary }]}>
							Priorité
						</Text>
						<View style={styles.prioritySelector}>
							{["normal", "urgent"].map((p) => (
								<TouchableOpacity
									key={p}
									onPress={() => setPriority(p)}
									style={[
										styles.priorityButton,
										priority === p && styles.priorityButtonActive,
										{
											backgroundColor:
												priority === p
													? p === "urgent"
														? "#EF4444"
														: "#10B981"
													: THEME.colors.background.elevated,
										},
									]}
								>
									<Ionicons
										name={p === "urgent" ? "alert-circle" : "checkmark-circle"}
										size={16}
										color={priority === p ? "#FFFFFF" : "#6B7280"}
									/>
									<Text
										style={[
											styles.priorityButtonText,
											priority === p && styles.priorityButtonTextActive,
											{
												color: priority === p ? "#FFFFFF" : "#6B7280",
											},
										]}
									>
										{p === "urgent" ? "Urgent" : "Normal"}
									</Text>
								</TouchableOpacity>
							))}
						</View>
					</View>

					{/* Coaching item (si type = coaching) */}
					{type === "coaching" && (
						<View style={styles.section}>
							<Text
								style={[styles.label, { color: THEME.colors.text.primary }]}
							>
								Item de Coaching
							</Text>
							<View style={styles.itemSelector}>
								{coachingItems.map((item) => (
									<TouchableOpacity
										key={item.id}
										onPress={() => setCoachingItem(item.id)}
										style={[
											styles.itemButton,
											coachingItem === item.id && styles.itemButtonActive,
											{
												backgroundColor:
													coachingItem === item.id
														? "#F59E0B"
														: THEME.colors.background.elevated,
											},
										]}
									>
										<Text
											style={[
												styles.itemButtonText,
												coachingItem === item.id && styles.itemButtonTextActive,
												{
													color:
														coachingItem === item.id ? "#FFFFFF" : "#6B7280",
												},
											]}
										>
											{item.label}
										</Text>
									</TouchableOpacity>
								))}
							</View>
						</View>
					)}

					{/* Titre */}
					<View style={styles.section}>
						<Text style={[styles.label, { color: THEME.colors.text.primary }]}>
							Titre
						</Text>
						<TextInput
							value={title}
							onChangeText={setTitle}
							placeholder="Ex: Améliorer le service client"
							placeholderTextColor="#9CA3AF"
							style={[styles.input, { color: THEME.colors.text.primary }]}
							maxLength={100}
						/>
						<Text
							style={[styles.charCount, { color: THEME.colors.text.secondary }]}
						>
							{title.length}/100
						</Text>
					</View>

					{/* Description */}
					<View style={styles.section}>
						<Text style={[styles.label, { color: THEME.colors.text.primary }]}>
							Description
						</Text>
						<TextInput
							value={description}
							onChangeText={setDescription}
							placeholder="Décrivez les détails du message..."
							placeholderTextColor="#9CA3AF"
							multiline={true}
							numberOfLines={5}
							style={[styles.textArea, { color: THEME.colors.text.primary }]}
							maxLength={500}
						/>
						<Text
							style={[styles.charCount, { color: THEME.colors.text.secondary }]}
						>
							{description.length}/500
						</Text>
					</View>
				</ScrollView>

				{/* Actions */}
				<View
					style={[
						styles.actions,
						{ borderTopColor: THEME.colors.background.elevated },
					]}
				>
					<TouchableOpacity
						onPress={onClose}
						style={[
							styles.button,
							{
								backgroundColor: THEME.colors.background.elevated,
							},
						]}
						disabled={isLoading}
					>
						<Text
							style={[styles.buttonText, { color: THEME.colors.text.primary }]}
						>
							Annuler
						</Text>
					</TouchableOpacity>

					<TouchableOpacity
						onPress={handleSend}
						style={[styles.button, styles.sendButton]}
						disabled={isLoading}
					>
						<Ionicons
							name={isLoading ? "hourglass" : "send"}
							size={18}
							color="#FFFFFF"
						/>
						<Text style={styles.sendButtonText}>
							{isLoading ? "Envoi..." : "Envoyer"}
						</Text>
					</TouchableOpacity>
				</View>
			</View>
		</Modal>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingTop: 60,
		paddingBottom: 20,
		paddingHorizontal: 16,
	},
	closeButton: {
		width: 40,
		height: 40,
		alignItems: "center",
		justifyContent: "center",
	},
	headerTitle: {
		fontSize: 18,
		fontWeight: "bold",
		color: "#FFFFFF",
	},
	content: {
		flex: 1,
		paddingHorizontal: 16,
		paddingVertical: 16,
	},
	section: {
		marginBottom: 24,
	},
	label: {
		fontSize: 14,
		fontWeight: "600",
		marginBottom: 8,
	},
	infoBox: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 12,
		paddingHorizontal: 12,
		borderRadius: 12,
		gap: 12,
	},
	infoText: {
		flex: 1,
		fontSize: 14,
		fontWeight: "500",
	},
	typeSelector: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 8,
	},
	typeButton: {
		flex: 0.48,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 10,
		paddingHorizontal: 8,
		borderRadius: 8,
		borderWidth: 2,
		gap: 6,
	},
	typeButtonActive: {
		borderColor: "transparent",
	},
	typeButtonText: {
		fontSize: 12,
		fontWeight: "600",
	},
	typeButtonTextActive: {
		color: "#FFFFFF",
	},
	prioritySelector: {
		flexDirection: "row",
		gap: 12,
	},
	priorityButton: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 10,
		borderRadius: 8,
		gap: 6,
	},
	priorityButtonActive: {
		backgroundColor: "#F59E0B",
	},
	priorityButtonText: {
		fontSize: 13,
		fontWeight: "600",
	},
	priorityButtonTextActive: {
		color: "#FFFFFF",
	},
	itemSelector: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 6,
	},
	itemButton: {
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderRadius: 8,
	},
	itemButtonActive: {
		backgroundColor: "#F59E0B",
	},
	itemButtonText: {
		fontSize: 12,
		fontWeight: "500",
	},
	itemButtonTextActive: {
		color: "#FFFFFF",
	},
	input: {
		borderWidth: 1,
		borderColor: "rgba(0,0,0,0.1)",
		borderRadius: 8,
		paddingVertical: 10,
		paddingHorizontal: 12,
		fontSize: 14,
	},
	textArea: {
		borderWidth: 1,
		borderColor: "rgba(0,0,0,0.1)",
		borderRadius: 8,
		paddingVertical: 10,
		paddingHorizontal: 12,
		fontSize: 14,
		textAlignVertical: "top",
	},
	charCount: {
		fontSize: 11,
		marginTop: 4,
		textAlign: "right",
	},
	actions: {
		flexDirection: "row",
		gap: 12,
		paddingVertical: 16,
		paddingHorizontal: 16,
		borderTopWidth: 1,
	},
	button: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 12,
		borderRadius: 12,
		gap: 8,
	},
	sendButton: {
		backgroundColor: "#F59E0B",
	},
	buttonText: {
		fontSize: 14,
		fontWeight: "600",
	},
	sendButtonText: {
		color: "#FFFFFF",
		fontSize: 14,
		fontWeight: "600",
	},
});

export default MessageForm;
