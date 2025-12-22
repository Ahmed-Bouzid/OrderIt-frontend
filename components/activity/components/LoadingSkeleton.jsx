// components/elements/ActivityComponents/LoadingSkeleton.jsx
import React from "react";
import { View, ActivityIndicator } from "react-native";
import styles from "../../styles";

export const LoadingSkeleton = ({ theme }) => {
	const safeTheme = theme || { backgroundColor: "#fff", textColor: "#000" };

	return (
		<View
			style={[
				styles.container,
				{
					backgroundColor: safeTheme.backgroundColor,
					justifyContent: "center",
					alignItems: "center",
				},
			]}
		>
			<ActivityIndicator size="large" color={safeTheme.textColor} />
		</View>
	);
};
