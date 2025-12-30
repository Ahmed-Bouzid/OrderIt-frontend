// components/receipt/ReceiptModal.jsx
import React, { useEffect, useRef } from "react";
import {
	Modal,
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ScrollView,
	Dimensions,
	Animated,
	ActivityIndicator,
} from "react-native";
import { BlurView } from "expo-blur";
import { MaterialIcons } from "@expo/vector-icons";
import { ReceiptTicket } from "./ReceiptTicket";
import { useReceiptExport } from "../../hooks/useReceiptExport";

const { height } = Dimensions.get("window");

// Confetti particle component (outside to avoid recreating on each render)
const ConfettiParticle = ({ delay, left, visible }) => {
	const fallAnim = useRef(new Animated.Value(-50)).current;
	const rotateAnim = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		if (visible) {
			Animated.parallel([
				Animated.timing(fallAnim, {
					toValue: height + 50,
					duration: 3000,
					delay,
					useNativeDriver: true,
				}),
				Animated.loop(
					Animated.timing(rotateAnim, {
						toValue: 1,
						duration: 1000,
						useNativeDriver: true,
					})
				),
			]).start();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [visible]);

	const rotate = rotateAnim.interpolate({
		inputRange: [0, 1],
		outputRange: ["0deg", "360deg"],
	});

	return (
		<Animated.View
			style={[
				styles.confetti,
				{
					left: `${left}%`,
					transform: [{ translateY: fallAnim }, { rotate }],
				},
			]}
		/>
	);
};

export const ReceiptModal = ({
	visible,
	onClose,
	reservation,
	items,
	amount,
	paymentMethod,
	last4Digits,
	theme,
}) => {
	const slideAnim = useRef(new Animated.Value(height)).current;
	const overlayAnim = useRef(new Animated.Value(0)).current;
	const receiptRef = useRef(null);
	const { exportReceipt, isExporting } = useReceiptExport();

	useEffect(() => {
		if (visible) {
			Animated.parallel([
				Animated.timing(slideAnim, {
					toValue: 0,
					duration: 400,
					useNativeDriver: true,
				}),
				Animated.timing(overlayAnim, {
					toValue: 1,
					duration: 300,
					useNativeDriver: true,
				}),
			]).start();
		} else {
			Animated.parallel([
				Animated.timing(slideAnim, {
					toValue: height,
					duration: 300,
					useNativeDriver: true,
				}),
				Animated.timing(overlayAnim, {
					toValue: 0,
					duration: 200,
					useNativeDriver: true,
				}),
			]).start();
		}
	}, [visible, slideAnim, overlayAnim]);

	if (!visible) return null;

	const ticketId = reservation?._id?.slice(-10).toUpperCase() || "XXXXXXXXXXXX";
	const tableNumber = reservation?.tableId?.number || reservation?.tableNumber;
	const restaurantName =
		reservation?.restaurantId?.name || "OrderIt Restaurant";

	const handleExport = async () => {
		const id = ticketId || `${Date.now()}`;
		await exportReceipt(receiptRef, id);
	};

	return (
		<Modal
			visible={visible}
			transparent
			animationType="none"
			onRequestClose={onClose}
		>
			<View style={styles.modalOverlay}>
				{/* Confetti */}
				{Array.from({ length: 50 }).map((_, i) => (
					<ConfettiParticle
						key={i}
						delay={Math.random() * 2000}
						left={Math.random() * 100}
						visible={visible}
					/>
				))}

				{/* Blur background */}
				<Animated.View
					style={[
						StyleSheet.absoluteFill,
						{
							opacity: overlayAnim,
						},
					]}
				>
					<BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill}>
						<TouchableOpacity
							style={styles.backdrop}
							activeOpacity={1}
							onPress={onClose}
						/>
					</BlurView>
				</Animated.View>

				{/* Receipt content */}
				<Animated.View
					style={[
						styles.contentContainer,
						{
							transform: [{ translateY: slideAnim }],
						},
					]}
				>
					{/* Close button */}
					<TouchableOpacity
						style={styles.closeButton}
						onPress={onClose}
						hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
					>
						<MaterialIcons name="close" size={28} color="#ffffff" />
					</TouchableOpacity>

					<ScrollView
						contentContainerStyle={styles.scrollContent}
						showsVerticalScrollIndicator={false}
						bounces={false}
					>
						{/* Receipt Ticket */}
						<ReceiptTicket
							ref={receiptRef}
							ticketId={ticketId}
							amount={amount || 0}
							date={new Date()}
							items={items || []}
							restaurantName={restaurantName}
							tableNumber={tableNumber}
							paymentMethod={paymentMethod || "Card"}
							last4Digits={last4Digits}
							theme={theme}
						/>

						{/* Export button */}
						<TouchableOpacity
							style={styles.exportButton}
							onPress={handleExport}
							disabled={isExporting}
						>
							{isExporting ? (
								<ActivityIndicator color="#ffffff" />
							) : (
								<>
									<MaterialIcons name="ios-share" size={22} color="#ffffff" />
									<Text style={styles.exportButtonText}>
										Enregistrer le reçu
									</Text>
								</>
							)}
						</TouchableOpacity>
					</ScrollView>
				</Animated.View>
			</View>
		</Modal>
	);
};

const styles = StyleSheet.create({
	modalOverlay: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	backdrop: {
		...StyleSheet.absoluteFillObject,
	},
	contentContainer: {
		width: "100%",
		maxHeight: "90%",
		paddingHorizontal: 20,
		paddingVertical: 40,
	},
	scrollContent: {
		alignItems: "center",
		paddingBottom: 30,
	},
	closeButton: {
		position: "absolute",
		top: 10,
		right: 20,
		zIndex: 100,
		backgroundColor: "rgba(0,0,0,0.6)",
		borderRadius: 20,
		width: 40,
		height: 40,
		justifyContent: "center",
		alignItems: "center",
	},
	exportButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "#4CAF50",
		paddingVertical: 16,
		paddingHorizontal: 32,
		borderRadius: 12,
		marginTop: 24,
		gap: 10,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 8,
		elevation: 8,
	},
	exportButtonText: {
		color: "#ffffff",
		fontSize: 16,
		fontWeight: "600",
	},
	confetti: {
		position: "absolute",
		width: 8,
		height: 8,
		backgroundColor: "#FFD700",
		borderRadius: 4,
	},
});
