// hooks/useReceiptExport.js
import { useCallback, useState } from "react";
import { Alert } from "react-native";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";

export const useReceiptExport = () => {
	const [isExporting, setIsExporting] = useState(false);

	const exportReceipt = useCallback(async (viewRef, ticketId) => {
		if (!viewRef || !viewRef.current) {
			Alert.alert("Erreur", "Impossible de générer le reçu");
			return;
		}

		setIsExporting(true);

		try {
			// Capturer la vue en tant qu'image
			const uri = await captureRef(viewRef, {
				format: "png",
				quality: 1,
				result: "tmpfile",
			});

			console.log("✅ Reçu capturé:", uri);

			// Vérifier si le partage est disponible
			const isAvailable = await Sharing.isAvailableAsync();

			if (!isAvailable) {
				Alert.alert(
					"Partage non disponible",
					"Le partage n'est pas disponible sur cet appareil"
				);
				setIsExporting(false);
				return;
			}

			// Partager directement le fichier temporaire (pas besoin de copier)
			await Sharing.shareAsync(uri, {
				mimeType: "image/png",
				dialogTitle: "Enregistrer le reçu",
				UTI: "public.png",
			});

			console.log("✅ Reçu partagé avec succès");
		} catch (error) {
			console.error("❌ Erreur lors de l'export du reçu:", error);
			Alert.alert(
				"Erreur",
				"Impossible d'exporter le reçu. Veuillez réessayer."
			);
		} finally {
			setIsExporting(false);
		}
	}, []);

	return {
		exportReceipt,
		isExporting,
	};
};
