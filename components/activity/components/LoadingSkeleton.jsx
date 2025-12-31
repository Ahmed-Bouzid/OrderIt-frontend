// components/elements/ActivityComponents/LoadingSkeleton.jsx
import React, { useMemo } from "react";
import { View, ActivityIndicator, StyleSheet, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import useThemeStore from "../../../src/stores/useThemeStore";
import { getTheme } from "../../../utils/themeUtils";

export const LoadingSkeleton = ({ theme }) => {
	const { themeMode } = useThemeStore();
	const THEME = useMemo(() => getTheme(themeMode), [themeMode]);
	const loadingStyles = useMemo(() => createStyles(THEME), [THEME]);

	return (
		<View style={loadingStyles.container}>
			<LinearGradient
				colors={[THEME.colors.background.dark, THEME.colors.background.card]}
				style={StyleSheet.absoluteFill}
			/>
			<ActivityIndicator size="large" color={THEME.colors.primary.amber} />
			<Text style={loadingStyles.loadingText}>Chargement...</Text>
		</View>
	);
};

const createStyles = (THEME) =>
	StyleSheet.create({
		container: {
			flex: 1,
			justifyContent: "center",
			alignItems: "center",
			backgroundColor: THEME.colors.background.dark,
		},
		loadingText: {
			marginTop: THEME.spacing.lg,
			fontSize: 14,
			fontWeight: "500",
			color: THEME.colors.text.secondary,
		},
	});
