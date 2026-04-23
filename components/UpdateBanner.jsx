import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";

/**
 * Bannière de mise à jour APK disponible.
 * Affiché en bas de l'écran quand useAppUpdate détecte une nouvelle version.
 *
 * Props :
 *   updateInfo         : { version, releaseNotes }
 *   downloading        : boolean
 *   progress           : number 0..1
 *   error              : string | null
 *   onInstall          : () => void
 *   onDismiss          : () => void
 */
export default function UpdateBanner({
	updateInfo,
	downloading,
	progress,
	error,
	onInstall,
	onDismiss,
}) {
	if (!updateInfo) return null;

	return (
		<View style={s.banner}>
			<View style={s.row}>
				<Ionicons name="cloud-download-outline" size={20} color="#C9A84C" style={s.icon} />
				<View style={s.textBlock}>
					<Text style={s.title}>Mise à jour disponible — v{updateInfo.version}</Text>
					{updateInfo.releaseNotes ? (
						<Text style={s.notes} numberOfLines={1}>
							{updateInfo.releaseNotes}
						</Text>
					) : null}
					{error ? <Text style={s.errorText}>{error}</Text> : null}
				</View>

				<TouchableOpacity style={s.dismissBtn} onPress={onDismiss}>
					<Ionicons name="close" size={16} color="#888" />
				</TouchableOpacity>
			</View>

			{downloading ? (
				<View style={s.progressRow}>
					<View style={[s.progressBar, { width: `${Math.round(progress * 100)}%` }]} />
					<Text style={s.progressText}>{Math.round(progress * 100)}%</Text>
				</View>
			) : (
				<TouchableOpacity style={s.installBtn} onPress={onInstall}>
					{downloading ? (
						<ActivityIndicator size="small" color="#000" />
					) : (
						<Text style={s.installText}>Installer maintenant</Text>
					)}
				</TouchableOpacity>
			)}
		</View>
	);
}

const s = StyleSheet.create({
	banner: {
		position: "absolute",
		bottom: 0,
		left: 0,
		right: 0,
		backgroundColor: "#1A1A2E",
		borderTopWidth: 1,
		borderTopColor: "#C9A84C44",
		padding: 14,
		zIndex: 999,
	},
	row: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
	icon: { marginRight: 10 },
	textBlock: { flex: 1 },
	title: { color: "#fff", fontSize: 13, fontWeight: "700" },
	notes: { color: "#888", fontSize: 11, marginTop: 2 },
	errorText: { color: "#EF4444", fontSize: 11, marginTop: 2 },
	dismissBtn: { padding: 6 },
	installBtn: {
		backgroundColor: "#C9A84C",
		borderRadius: 8,
		paddingVertical: 10,
		alignItems: "center",
	},
	installText: { color: "#000", fontWeight: "700", fontSize: 14 },
	progressRow: {
		height: 6,
		backgroundColor: "#2A2A3E",
		borderRadius: 3,
		overflow: "hidden",
		marginTop: 4,
	},
	progressBar: {
		height: "100%",
		backgroundColor: "#C9A84C",
		borderRadius: 3,
	},
	progressText: { color: "#888", fontSize: 10, textAlign: "right", marginTop: 3 },
});
