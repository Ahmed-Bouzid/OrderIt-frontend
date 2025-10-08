import { useRef } from "react";
import { Animated, PanResponder, Text } from "react-native";

const DraggableButton = ({ onPress }) => {
	const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

	const panResponder = useRef(
		PanResponder.create({
			onStartShouldSetPanResponder: () => true,
			onPanResponderGrant: () => {
				pan.setOffset({ x: pan.x._value, y: pan.y._value });
				pan.setValue({ x: 0, y: 0 });
			},
			onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
				useNativeDriver: false,
			}),
			onPanResponderRelease: (e, gestureState) => {
				pan.flattenOffset();

				// Si le déplacement est très petit, considérer comme un appui
				if (Math.abs(gestureState.dx) < 5 && Math.abs(gestureState.dy) < 5) {
					onPress();
				}
			},
		})
	).current;

	return (
		<Animated.View
			style={[
				{
					position: "absolute",
					bottom: 50,
					right: 20,
					zIndex: 100,
					width: 60,
					height: 60,
					borderRadius: 30,
					backgroundColor: "#007AFF",
					justifyContent: "center",
					alignItems: "center",
				},
				pan.getLayout(),
			]}
			{...panResponder.panHandlers}
		>
			<Text style={{ fontSize: 26, color: "#fff" }}>＋</Text>
		</Animated.View>
	);
};

export default DraggableButton;
