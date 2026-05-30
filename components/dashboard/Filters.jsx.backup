import React, { useRef, useEffect, useState, useMemo } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	Animated,
	Platform,
	UIManager,
	StyleSheet,
	TextInput,
	ScrollView,
	Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import useThemeStore from "../../src/stores/useThemeStore";
import { useTheme } from "../../hooks/useTheme";
import { useFeatureLevel } from "../../src/stores/useFeatureLevelStore";

// Enable LayoutAnimation on Android
if (
	Platform.OS === "android" &&
	UIManager.setLayoutAnimationEnabledExperimental
) {
	UIManager.setLayoutAnimationEnabledExperimental(true);
}

const IS_PHONE = Dimensions.get("window").width < 600;

const ALL_FILTERS = [
	{
		key: "actives",
		label: "En attente",
		icon: "time-outline",
		color: "#FBBF24",
	},
	{
		key: "present",
		label: "Présent",
		icon: "checkmark-circle-outline",
		color: "#10B981",
	},
	{
		key: "ouverte",
		label: "Ouverte",
		icon: "restaurant-outline",
		color: "#0EA5E9",
	},
	{
		key: "terminée",
		label: "Terminée",
		icon: "checkmark-done-outline",
		color: "#64748B",
	},
	{
		key: "annulée",
		label: "Annulée",
		icon: "close-circle-outline",
		color: "#F43F5E",
	},
];

const Filters = React.memo(
	({ activeFilter, onFilterChange, searchQuery, onSearchChange }) => {
		const { hasCommandesExpress, hasCuisine } = useFeatureLevel();
		// Affichage des filtres :
		// - foodtruck (express, pas de cuisine) : uniquement Commandes Express
		// - fast-food (cuisine) : filtres classiques + Cuisine
		// - autres : 5 boutons classiques
		let FILTERS;
		if (hasCommandesExpress && !hasCuisine) {
			FILTERS = [
				{
					key: "express",
					label: "COMMANDES EXPRESS",
					icon: "flash-outline",
					color: "#F59E0B",
				},
			];
		} else if (hasCuisine) {
			// Fast-food : UNIQUEMENT le bouton Cuisine
			FILTERS = [
				{
					key: "cuisine",
					label: "Cuisine",
					icon: "restaurant-outline",
					color: "#10B981",
				},
			];
		} else {
			FILTERS = ALL_FILTERS;
		}
		const { themeMode } = useThemeStore();
		const THEME = useTheme(); // Utilise le hook avec multiplicateur de police
		const filterStyles = useMemo(() => createFilterStyles(THEME), [THEME]);

		const [layouts, setLayouts] = useState({});
		const [isReady, setIsReady] = useState(false);
		const [searchExpanded, setSearchExpanded] = useState(false);
		const translateX = useRef(new Animated.Value(0)).current;
		const translateY = useRef(new Animated.Value(0)).current;
		const width = useRef(new Animated.Value(120)).current;

		const getActiveFilterData = () => {
			return FILTERS.find((f) => f.key === activeFilter) || FILTERS[0];
		};

		const activeColor = getActiveFilterData().color;

		const handleLayout = (key, event) => {
			const { x, y, width: w } = event.nativeEvent.layout;
			setLayouts((prev) => {
				const newLayouts = { ...prev, [key]: { x, y, width: w } };
				if (Object.keys(newLayouts).length === FILTERS.length && !isReady) {
					setIsReady(true);
					const initialLayout = newLayouts[activeFilter];
					if (initialLayout) {
						translateX.setValue(initialLayout.x);
						translateY.setValue(initialLayout.y);
						width.setValue(initialLayout.width);
					}
				}
				return newLayouts;
			});
		};

		useEffect(() => {
			if (isReady && layouts[activeFilter]) {
				const layout = layouts[activeFilter];
				Animated.parallel([
					Animated.spring(translateX, {
						toValue: layout.x,
						useNativeDriver: false,
						bounciness: 8,
					}),
					Animated.spring(translateY, {
						toValue: layout.y,
						useNativeDriver: false,
						bounciness: 8,
					}),
					Animated.spring(width, {
						toValue: layout.width,
						useNativeDriver: false,
						bounciness: 8,
					}),
				]).start();
			}
		}, [activeFilter, layouts, isReady]);

		return (
			<View style={filterStyles.container}>
				<View style={filterStyles.row}>
					{/* 🔍 Recherche */}
					{IS_PHONE ? (
						searchExpanded ? (
							<View
								style={[
									filterStyles.searchContainer,
									{ flex: 1, maxWidth: 180, minWidth: 0 },
								]}
							>
								<Ionicons
									name="search-outline"
									size={18}
									color={THEME.colors.primary.amber}
									style={filterStyles.searchIcon}
								/>
								<TextInput
									style={filterStyles.searchInput}
									placeholder="Rechercher..."
									placeholderTextColor={THEME.colors.text.muted}
									value={searchQuery}
									onChangeText={onSearchChange}
									autoCapitalize="none"
									autoCorrect={false}
									autoFocus
								/>
								<TouchableOpacity
									onPress={() => {
										setSearchExpanded(false);
										onSearchChange("");
									}}
									style={filterStyles.clearButton}
								>
									<Ionicons
										name="close-circle"
										size={18}
										color={THEME.colors.text.muted}
									/>
								</TouchableOpacity>
							</View>
						) : (
							<TouchableOpacity
								onPress={() => setSearchExpanded(true)}
								style={filterStyles.searchIconBtn}
								activeOpacity={0.7}
							>
								<Ionicons
									name="search-outline"
									size={20}
									color={THEME.colors.text.muted}
								/>
							</TouchableOpacity>
						)
					) : (
						<View style={filterStyles.searchContainer}>
							<Ionicons
								name="search-outline"
								size={18}
								color={
									searchQuery
										? THEME.colors.primary.amber
										: THEME.colors.text.muted
								}
								style={filterStyles.searchIcon}
							/>
							<TextInput
								style={filterStyles.searchInput}
								placeholder="Rechercher par nom..."
								placeholderTextColor={THEME.colors.text.muted}
								value={searchQuery}
								onChangeText={onSearchChange}
								autoCapitalize="none"
								autoCorrect={false}
							/>
							{searchQuery ? (
								<TouchableOpacity
									onPress={() => onSearchChange("")}
									style={filterStyles.clearButton}
								>
									<Ionicons
										name="close-circle"
										size={18}
										color={THEME.colors.text.muted}
									/>
								</TouchableOpacity>
							) : null}
						</View>
					)}

					{/* Filtres de statut */}
					{IS_PHONE ? (
						<ScrollView
							horizontal
							showsHorizontalScrollIndicator={false}
							style={filterStyles.filtersScrollPhone}
							contentContainerStyle={{ paddingHorizontal: 2 }}
						>
							<View style={[filterStyles.inner, { flex: 0 }]}>
								{isReady && FILTERS.length > 1 && (
									<Animated.View
										style={[
											filterStyles.slider,
											{
												left: translateX,
												top: translateY,
												width: width,
												backgroundColor: searchQuery
													? "transparent"
													: `${activeColor}25`,
												borderColor: searchQuery
													? "transparent"
													: `${activeColor}60`,
											},
										]}
									/>
								)}
								{FILTERS.map(({ key, label, icon, color }) => {
									const isActive = activeFilter === key && !searchQuery;
									return (
										<TouchableOpacity
											key={key}
											onPress={() => {
												onSearchChange("");
												setSearchExpanded(false);
												onFilterChange(key);
											}}
											activeOpacity={0.7}
											onLayout={(e) => handleLayout(key, e)}
										>
											<View style={filterStyles.item}>
												<Ionicons
													name={icon}
													size={16}
													color={isActive ? color : THEME.colors.text.secondary}
													style={{ marginRight: 6 }}
												/>
												<Text
													style={[
														filterStyles.label,
														{
															color: isActive
																? color
																: THEME.colors.text.secondary,
															fontWeight: isActive ? "700" : "500",
														},
													]}
												>
													{label}
												</Text>
											</View>
										</TouchableOpacity>
									);
								})}
							</View>
						</ScrollView>
					) : (
						<View style={filterStyles.inner}>
							{isReady && FILTERS.length > 1 && (
								<Animated.View
									style={[
										filterStyles.slider,
										{
											left: translateX,
											top: translateY,
											width: width,
											backgroundColor: searchQuery
												? "transparent"
												: `${activeColor}25`,
											borderColor: searchQuery
												? "transparent"
												: `${activeColor}60`,
										},
									]}
								/>
							)}
							{FILTERS.map(({ key, label, icon, color }) => {
								const isActive = activeFilter === key && !searchQuery;
								return (
									<TouchableOpacity
										key={key}
										onPress={() => {
											onSearchChange("");
											onFilterChange(key);
										}}
										activeOpacity={0.7}
										onLayout={(e) => handleLayout(key, e)}
									>
										<View style={filterStyles.item}>
											<Ionicons
												name={icon}
												size={16}
												color={isActive ? color : THEME.colors.text.secondary}
												style={{ marginRight: 6 }}
											/>
											<Text
												style={[
													filterStyles.label,
													{
														color: isActive
															? color
															: THEME.colors.text.secondary,
														fontWeight: isActive ? "700" : "500",
													},
												]}
											>
												{label}
											</Text>
										</View>
									</TouchableOpacity>
								);
							})}
						</View>
					)}
				</View>
			</View>
		);
	},
);

Filters.displayName = "Filters";

const createFilterStyles = (THEME) =>
	StyleSheet.create({
		container: {
			marginTop: THEME.spacing.md,
			marginBottom: THEME.spacing.xl,
			paddingHorizontal: THEME.spacing.lg,
		},
		row: {
			flexDirection: "row",
			alignItems: "center",
			gap: THEME.spacing.md,
		},
		searchContainer: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: THEME.colors.background.card,
			borderRadius: THEME.radius.xl,
			paddingHorizontal: THEME.spacing.md,
			paddingVertical: THEME.spacing.sm,
			borderWidth: 1,
			borderColor: THEME.colors.border.default,
			minWidth: 200,
			maxWidth: 250,
		},
		searchIcon: {
			marginRight: THEME.spacing.sm,
		},
		searchInput: {
			flex: 1,
			fontSize: THEME.typography.sizes.sm,
			color: THEME.colors.text.primary,
			paddingVertical: THEME.spacing.xs,
		},
		clearButton: {
			padding: THEME.spacing.xs,
		},
		searchIconBtn: {
			width: 38,
			height: 38,
			borderRadius: THEME.radius.xl,
			backgroundColor: THEME.colors.background.card,
			borderWidth: 1,
			borderColor: THEME.colors.border.default,
			justifyContent: "center",
			alignItems: "center",
		},
		filtersScrollPhone: {
			flex: 1,
		},
		inner: {
			flex: 1,
			flexDirection: "row",
			justifyContent: "center",
			alignItems: "center",
			gap: THEME.spacing.sm,
			flexWrap: "wrap",
			position: "relative",
			backgroundColor: THEME.colors.background.card,
			borderRadius: THEME.radius["2xl"],
			padding: THEME.spacing.sm,
			borderWidth: 1,
			borderColor: THEME.colors.border.default,
		},
		slider: {
			position: "absolute",
			height: 44,
			borderRadius: THEME.radius.xl,
			borderWidth: 2,
			shadowColor: "#F59E0B",
			shadowOffset: { width: 0, height: 0 },
			shadowOpacity: 0.4,
			shadowRadius: 12,
			elevation: 6,
		},
		item: {
			flexDirection: "row",
			alignItems: "center",
			paddingVertical: THEME.spacing.md,
			paddingHorizontal: THEME.spacing.lg,
			borderRadius: THEME.radius.xl,
			gap: THEME.spacing.sm,
			minWidth: 100,
			justifyContent: "center",
			zIndex: 1,
		},
		label: {
			fontSize: THEME.typography.sizes.sm,
			letterSpacing: 0,
		},
	});

export default Filters;
