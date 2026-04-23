// components/payments-command-center/PaymentsFAB.jsx
//
// Bouton flottant (FAB) pour ouvrir le PaymentsCommandCenter
// ─ Toujours visible au-dessus du contenu
// ─ Badge d'alertes non lues
// ─ Animation pulse quand nouveau paiement

import React, { memo, useEffect, useRef } from "react";
import {
	TouchableOpacity,
	View,
	Text,
	StyleSheet,
	Animated,
	Platform,
	PanResponder,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import usePaymentMonitorStore from "../../src/stores/usePaymentMonitorStore";
import T from "./theme";

const PaymentsFAB = memo(() => {
	const isOpen = usePaymentMonitorStore((s) => s.isOpen);
	const open = usePaymentMonitorStore((s) => s.open);
	const alerts = usePaymentMonitorStore((s) => s.alerts);
	const kpis = usePaymentMonitorStore((s) => s.kpis);

	const unreadAlerts = alerts.filter((a) => !a.read).length;
	const pulseAnim = useRef(new Animated.Value(1)).current;
	const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
	const didDragRef = useRef(false);
	const prevTotal = useRef(kpis?.totalToday);

	const panResponder = useRef(
		PanResponder.create({
			onStartShouldSetPanResponder: () => false,
			onMoveShouldSetPanResponder: (_, gestureState) =>
				Math.abs(gestureState.dx) > 4 || Math.abs(gestureState.dy) > 4,
			onPanResponderGrant: () => {
				didDragRef.current = false;
				pan.setOffset({ x: pan.x._value, y: pan.y._value });
				pan.setValue({ x: 0, y: 0 });
			},
			onPanResponderMove: (_, gestureState) => {
				didDragRef.current = true;
				pan.setValue({ x: gestureState.dx, y: gestureState.dy });
			},
			onPanResponderRelease: () => {
				pan.flattenOffset();
			},
			onPanResponderTerminate: () => {
				pan.flattenOffset();
			},
		}),
	).current;

	// Pulse quand le total change (nouveau paiement)
	useEffect(() => {
		if (kpis?.totalToday !== prevTotal.current) {
			prevTotal.current = kpis?.totalToday;
			Animated.sequence([
				Animated.timing(pulseAnim, {
					toValue: 1.15,
					duration: 150,
					useNativeDriver: true,
				}),
				Animated.timing(pulseAnim, {
					toValue: 1,
					duration: 200,
					useNativeDriver: true,
				}),
			]).start();
		}
	}, [kpis?.totalToday, pulseAnim]);

	// Invisible si le centre est déjà ouvert
	if (isOpen) return null;

	const handlePress = () => {
		if (didDragRef.current) {
			didDragRef.current = false;
			return;
		}
		open();
	};

	return (
		<Animated.View
			{...panResponder.panHandlers}
			style={[
				s.container,
				{ transform: [{ translateX: pan.x }, { translateY: pan.y }, { scale: pulseAnim }] },
			]}
		>
			<TouchableOpacity
				onPress={handlePress}
				activeOpacity={0.8}
				style={s.fab}
			>
				<View style={s.iconContainer}>
					<Ionicons name="stats-chart" size={22} color={T.accent.cyan} />
				</View>

				{/* Badge alertes */}
				{unreadAlerts > 0 && (
					<View style={s.badge}>
						<Text style={s.badgeText}>{unreadAlerts}</Text>
					</View>
				)}
			</TouchableOpacity>
		</Animated.View>
	);
});

PaymentsFAB.displayName = "PaymentsFAB";

const s = StyleSheet.create({
	container: {
		position: "absolute",
		bottom: Platform.OS === "ios" ? 100 : 80,
		right: 16,
		zIndex: 8999,
	},
	fab: {
		width: 54,
		height: 54,
		borderRadius: 27,
		backgroundColor: T.bg.primary,
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 1.5,
		borderColor: T.accent.cyanDim,
		...T.shadow.card,
	},
	iconContainer: {
		alignItems: "center",
		justifyContent: "center",
	},
	badge: {
		position: "absolute",
		top: -4,
		right: -4,
		backgroundColor: T.accent.red,
		borderRadius: 10,
		minWidth: 18,
		height: 18,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 4,
		borderWidth: 2,
		borderColor: T.bg.primary,
	},
	badgeText: {
		fontSize: 9,
		fontWeight: "800",
		color: "#fff",
	},
});

export default PaymentsFAB;
