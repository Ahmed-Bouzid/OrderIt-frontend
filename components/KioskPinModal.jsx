import React, { useState } from "react";
import {
	Modal,
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

/**
 * Modal PIN administrateur pour quitter le Kiosk Mode.
 * Affiché après 5 taps dans le coin secret de l'écran.
 *
 * Props :
 *   visible       : boolean
 *   onUnlock      : async (pin: string) => boolean  — retourne true si PIN correct
 *   onDismiss     : () => void
 */
export default function KioskPinModal({ visible, onUnlock, onDismiss }) {
	const [pin, setPin] = useState("");
	const [shaking, setShaking] = useState(false);

	const handleKey = (key) => {
		if (key === "del") {
			setPin((p) => p.slice(0, -1));
		} else if (pin.length < 6) {
			setPin((p) => p + key);
		}
	};

	const handleSubmit = async () => {
		if (pin.length < 4) return;
		const success = await onUnlock(pin);
		if (!success) {
			setShaking(true);
			setPin("");
			setTimeout(() => setShaking(false), 800);
		}
	};

	const handleClose = () => {
		setPin("");
		setShaking(false);
		onDismiss?.();
	};

	return (
		<Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
			<View style={s.overlay}>
				<View style={s.box}>
					<Ionicons name="lock-closed" size={36} color="#C9A84C" style={s.icon} />
					<Text style={s.title}>Code administrateur</Text>
					<Text style={s.subtitle}>Entrez le PIN pour quitter le mode kiosque</Text>

					{/* Indicateurs de saisie */}
					<View style={s.dotsRow}>
						{Array.from({ length: 6 }).map((_, i) => (
							<View
								key={i}
								style={[
									s.dot,
									i < pin.length && s.dotFilled,
									shaking && s.dotError,
								]}
							/>
						))}
					</View>
					{shaking && <Text style={s.errorText}>Code incorrect</Text>}

					{/* Clavier numérique */}
					<View style={s.keypad}>
						{["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map(
							(key, i) => (
								<TouchableOpacity
									key={i}
									style={[s.key, key === "" && s.keyEmpty]}
									onPress={() => key && handleKey(key)}
									disabled={key === ""}
									activeOpacity={0.7}
								>
									{key === "del" ? (
										<Ionicons name="backspace-outline" size={22} color="#fff" />
									) : (
										<Text style={s.keyText}>{key}</Text>
									)}
								</TouchableOpacity>
							),
						)}
					</View>

					<TouchableOpacity
						style={[s.submitBtn, pin.length < 4 && s.submitBtnDisabled]}
						onPress={handleSubmit}
						disabled={pin.length < 4}
					>
						<Text style={s.submitText}>Déverrouiller</Text>
					</TouchableOpacity>

					<TouchableOpacity style={s.cancelBtn} onPress={handleClose}>
						<Text style={s.cancelText}>Annuler</Text>
					</TouchableOpacity>
				</View>
			</View>
		</Modal>
	);
}

const s = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.88)",
		alignItems: "center",
		justifyContent: "center",
	},
	box: {
		backgroundColor: "#12122A",
		borderRadius: 20,
		padding: 32,
		alignItems: "center",
		width: 340,
		borderWidth: 1,
		borderColor: "#C9A84C33",
	},
	icon: { marginBottom: 12 },
	title: { color: "#fff", fontSize: 20, fontWeight: "700", marginBottom: 6 },
	subtitle: {
		color: "#888",
		fontSize: 13,
		textAlign: "center",
		marginBottom: 24,
		lineHeight: 18,
	},
	dotsRow: { flexDirection: "row", gap: 12, marginBottom: 6 },
	dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: "#555" },
	dotFilled: { backgroundColor: "#C9A84C", borderColor: "#C9A84C" },
	dotError: { borderColor: "#EF4444", backgroundColor: "#EF4444" },
	errorText: { color: "#EF4444", fontSize: 12, marginBottom: 4, height: 18 },
	keypad: {
		flexDirection: "row",
		flexWrap: "wrap",
		width: 252,
		gap: 12,
		marginVertical: 20,
		justifyContent: "center",
	},
	key: {
		width: 72,
		height: 72,
		borderRadius: 36,
		backgroundColor: "#1E1E3A",
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 1,
		borderColor: "#333",
	},
	keyEmpty: { backgroundColor: "transparent", borderColor: "transparent" },
	keyText: { color: "#fff", fontSize: 24, fontWeight: "600" },
	submitBtn: {
		backgroundColor: "#C9A84C",
		paddingHorizontal: 44,
		paddingVertical: 14,
		borderRadius: 12,
		marginBottom: 10,
		width: "100%",
		alignItems: "center",
	},
	submitBtnDisabled: { opacity: 0.4 },
	submitText: { color: "#000", fontWeight: "700", fontSize: 16 },
	cancelBtn: { paddingVertical: 10 },
	cancelText: { color: "#666", fontSize: 14 },
});
