/**
 * Toaster.jsx — Toast ref-based, inspiré de https://21st.dev/arunachalam0606/toast/default
 *
 * API :
 *   const toasterRef = useRef(null);
 *   toasterRef.current?.show({ title, message, variant, position, duration, actions, onDismiss });
 *   toasterRef.current?.hide(id);
 *   toasterRef.current?.hideAll();
 *
 * Variants  : "default" | "success" | "error" | "warning"
 * Positions : "top-left" | "top-center" | "top-right"
 *           | "bottom-left" | "bottom-center" | "bottom-right"
 */
import React, {
	forwardRef,
	useImperativeHandle,
	useRef,
	useState,
	useCallback,
	useEffect,
} from "react";
import {
	View,
	Text,
	Animated,
	TouchableOpacity,
	StyleSheet,
	Dimensions,
	Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { width: SCREEN_W } = Dimensions.get("window");
const TOAST_W = Math.min(SCREEN_W - 32, 390);
const MARGIN = 16;

// ─── Variantes (identiques au design 21st.dev adapté dark) ───────────────────
const VARIANTS = {
	default: {
		bg: "#1E293B",
		border: "#334155",
		icon: "information-circle",
		iconColor: "#94A3B8",
		titleColor: "#F1F5F9",
		msgColor: "#94A3B8",
	},
	success: {
		bg: "#052E16",
		border: "#166534",
		icon: "checkmark-circle",
		iconColor: "#22C55E",
		titleColor: "#DCFCE7",
		msgColor: "#86EFAC",
	},
	error: {
		bg: "#1C0B0B",
		border: "#7F1D1D",
		icon: "close-circle",
		iconColor: "#EF4444",
		titleColor: "#FEE2E2",
		msgColor: "#FCA5A5",
	},
	warning: {
		bg: "#1A1000",
		border: "#854D0E",
		icon: "warning",
		iconColor: "#F59E0B",
		titleColor: "#FEF3C7",
		msgColor: "#FDE68A",
	},
};

// ─── Position absolue ────────────────────────────────────────────────────────
const getPositionStyle = (position = "bottom-right") => {
	const [v, h] = position.split("-");
	const s = { position: "absolute" };
	if (v === "top") s.top = 56;
	else s.bottom = 24;
	if (h === "left") s.left = MARGIN;
	else if (h === "right") s.right = MARGIN;
	else {
		s.left = (SCREEN_W - TOAST_W) / 2;
	}
	return s;
};

// ─── Toast individuel ────────────────────────────────────────────────────────
const ToastItem = React.memo(({ data, onHide }) => {
	const {
		title,
		message,
		variant = "default",
		position = "bottom-right",
		duration = 3500,
		actions,
		highlightTitle,
		onDismiss,
	} = data;

	const cfg = VARIANTS[variant] || VARIANTS.default;
	const isTop = position.startsWith("top");

	const opacity = useRef(new Animated.Value(0)).current;
	const translateY = useRef(new Animated.Value(isTop ? -16 : 16)).current;
	const scale = useRef(new Animated.Value(0.93)).current;
	const progress = useRef(new Animated.Value(1)).current;
	const timerRef = useRef(null);
	const hiding = useRef(false);

	const hide = useCallback(() => {
		if (hiding.current) return;
		hiding.current = true;
		clearTimeout(timerRef.current);
		Animated.parallel([
			Animated.timing(opacity, {
				toValue: 0,
				duration: 200,
				useNativeDriver: true,
				easing: Easing.out(Easing.ease),
			}),
			Animated.timing(translateY, {
				toValue: isTop ? -16 : 16,
				duration: 200,
				useNativeDriver: true,
			}),
			Animated.timing(scale, {
				toValue: 0.93,
				duration: 200,
				useNativeDriver: true,
			}),
		]).start(() => {
			onDismiss?.();
			onHide();
		});
	}, [onHide, onDismiss, isTop, opacity, scale, translateY]); // Animated.Value stables (useRef)

	useEffect(() => {
		// Entrée
		Animated.parallel([
			Animated.timing(opacity, {
				toValue: 1,
				duration: 300,
				easing: Easing.out(Easing.cubic),
				useNativeDriver: true,
			}),
			Animated.spring(translateY, {
				toValue: 0,
				tension: 130,
				friction: 11,
				useNativeDriver: true,
			}),
			Animated.spring(scale, {
				toValue: 1,
				tension: 130,
				friction: 11,
				useNativeDriver: true,
			}),
		]).start();

		// Progress
		if (duration > 0) {
			Animated.timing(progress, {
				toValue: 0,
				duration,
				easing: Easing.linear,
				useNativeDriver: false,
			}).start();
			timerRef.current = setTimeout(hide, duration);
		}
		return () => clearTimeout(timerRef.current);
	}, [hide, duration, opacity, translateY, scale, progress]);

	return (
		<Animated.View
			style={[
				styles.wrap,
				getPositionStyle(position),
				{
					width: TOAST_W,
					backgroundColor: cfg.bg,
					borderColor: cfg.border,
					opacity,
					transform: [{ translateY }, { scale }],
				},
			]}
		>
			{/* Barre de progression */}
			{duration > 0 && (
				<Animated.View
					style={[
						styles.progressBar,
						{
							backgroundColor: cfg.iconColor + "CC",
							width: progress.interpolate({
								inputRange: [0, 1],
								outputRange: ["0%", "100%"],
							}),
						},
					]}
				/>
			)}

			<View style={styles.inner}>
				{/* Icône */}
				<View
					style={[styles.iconWrap, { backgroundColor: cfg.iconColor + "1F" }]}
				>
					<Ionicons name={cfg.icon} size={19} color={cfg.iconColor} />
				</View>

				{/* Texte */}
				<View style={styles.textWrap}>
					<Text
						style={[
							styles.title,
							{ color: highlightTitle ? cfg.iconColor : cfg.titleColor },
						]}
					>
						{title}
					</Text>
					{!!message && (
						<Text
							style={[styles.message, { color: cfg.msgColor }]}
							numberOfLines={4}
						>
							{message}
						</Text>
					)}
					{actions && (
						<TouchableOpacity
							onPress={() => {
								actions.onClick?.();
								hide();
							}}
							style={[styles.actionBtn, { borderColor: cfg.border }]}
							activeOpacity={0.7}
						>
							<Text style={[styles.actionText, { color: cfg.iconColor }]}>
								{actions.label}
							</Text>
						</TouchableOpacity>
					)}
				</View>

				{/* Fermer */}
				<TouchableOpacity
					onPress={hide}
					hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
				>
					<Ionicons name="close" size={16} color={cfg.msgColor} />
				</TouchableOpacity>
			</View>
		</Animated.View>
	);
});
ToastItem.displayName = "ToastItem";

// ─── Toaster (ref) ───────────────────────────────────────────────────────────
const Toaster = forwardRef((_, ref) => {
	const [items, setItems] = useState([]);
	const counter = useRef(0);

	useImperativeHandle(ref, () => ({
		/** Affiche un toast, retourne son id */
		show(data) {
			const id = ++counter.current;
			setItems((p) => [...p, { ...data, id }]);
			return id;
		},
		/** Cache un toast par id */
		hide(id) {
			setItems((p) => p.filter((t) => t.id !== id));
		},
		/** Cache tous les toasts */
		hideAll() {
			setItems([]);
		},
	}));

	const remove = useCallback(
		(id) => setItems((p) => p.filter((t) => t.id !== id)),
		[],
	);

	if (items.length === 0) return null;

	return (
		<View style={StyleSheet.absoluteFill} pointerEvents="box-none">
			{items.map((t) => (
				<ToastItem key={t.id} data={t} onHide={() => remove(t.id)} />
			))}
		</View>
	);
});
Toaster.displayName = "Toaster";

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
	wrap: {
		borderWidth: 1,
		borderRadius: 16,
		overflow: "hidden",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.4,
		shadowRadius: 20,
		elevation: 14,
		zIndex: 9999,
	},
	progressBar: {
		height: 3,
	},
	inner: {
		flexDirection: "row",
		alignItems: "flex-start",
		padding: 14,
		gap: 12,
	},
	iconWrap: {
		width: 36,
		height: 36,
		borderRadius: 10,
		alignItems: "center",
		justifyContent: "center",
		flexShrink: 0,
	},
	textWrap: { flex: 1 },
	title: {
		fontSize: 13,
		fontWeight: "700",
		letterSpacing: 0.15,
	},
	message: {
		fontSize: 12,
		marginTop: 3,
		lineHeight: 17,
	},
	actionBtn: {
		marginTop: 8,
		alignSelf: "flex-start",
		paddingHorizontal: 12,
		paddingVertical: 5,
		borderRadius: 8,
		borderWidth: 1,
	},
	actionText: {
		fontSize: 12,
		fontWeight: "600",
	},
});

export { Toaster };
export default Toaster;
