import React, { useState, useEffect } from "react";
import { View, Text, Button, StyleSheet } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";

export default function QRCodeScanner({ onScan }) {
	const [permission, requestPermission] = useCameraPermissions();
	const [scanned, setScanned] = useState(false);
	const [tableId, setTableId] = useState(null);

	useEffect(() => {
		(async () => {
			await requestPermission();
		})();
	}, [requestPermission]);

	const handleBarCodeScanned = ({ data }) => {
		setScanned(true);
		setTableId(data);
		if (onScan) onScan(data); // callback pour passer l'ID au parent
	};

	if (!permission) {
		return <Text>Demande de permission pour la caméra...</Text>;
	}
	if (!permission.granted) {
		return <Text>Pas d`accès à la caméra</Text>;
	}

	return (
		<View style={styles.container}>
			{!scanned && (
				<CameraView
					onBarcodeScanned={handleBarCodeScanned}
					style={StyleSheet.absoluteFillObject}
				/>
			)}
			{scanned && (
				<View style={styles.result}>
					<Text>Table ID : {tableId}</Text>
					<Button title="Scanner à nouveau" onPress={() => setScanned(false)} />
				</View>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	result: { flex: 1, justifyContent: "center", alignItems: "center" },
});
