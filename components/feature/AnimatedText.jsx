import React, { useEffect, useState } from "react";
import { Text, View, StyleSheet } from "react-native";

export default function AnimatedText({ text }) {
	const [displayedText, setDisplayedText] = useState("");

	useEffect(() => {
		if (!text) return;

		let index = 0;
		setDisplayedText("");

		const interval = setInterval(() => {
			if (index >= text.length) {
				clearInterval(interval);
				return;
			}
			const char = text.charAt(index);
			setDisplayedText((prev) => prev + char);
			index++;
		}, 60);

		return () => {
			clearInterval(interval);
		};
	}, [text]);

	return (
		<View style={styles.container}>
			<Text style={styles.text}>{displayedText}</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { alignItems: "center", justifyContent: "center" },
	text: {
		fontSize: 32,
		fontWeight: "bold",
		color: "black",
		textAlign: "center",
	},
});
