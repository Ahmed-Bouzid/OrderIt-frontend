/**
 * 🎨 SunnyGo Frontend - Global Styles
 * Design System moderne inspiré par 21st.dev
 * Animations spatiales, effets de profondeur, ambiance premium
 */
import { StyleSheet, Dimensions, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ==================== DESIGN TOKENS ====================
const COLORS = {
	primary: {
		50: '#FFFBEB',
		100: '#FEF3C7',
		200: '#FDE68A',
		300: '#FCD34D',
		400: '#FBBF24',
		500: '#F59E0B',
		600: '#D97706',
		700: '#B45309',
	},
	secondary: {
		600: '#475569',
		700: '#334155',
		800: '#1E293B',
		900: '#0F172A',
		950: '#020617',
	},
	status: {
		waiting: '#FBBF24',
		present: '#10B981',
		open: '#0EA5E9',
		finished: '#64748B',
		cancelled: '#F43F5E',
	},
	accent: {
		emerald: '#10B981',
		sky: '#0EA5E9',
		rose: '#F43F5E',
		violet: '#8B5CF6',
	},
	background: {
		dark: '#0C0F17',
		card: '#151923',
		cardHover: '#1C2130',
		elevated: '#1E2433',
	},
	text: {
		primary: '#F8FAFC',
		secondary: '#94A3B8',
		muted: '#64748B',
	},
	border: {
		default: 'rgba(148, 163, 184, 0.12)',
		light: 'rgba(148, 163, 184, 0.08)',
	},
};

const SPACING = {
	xs: 4, sm: 8, md: 12, lg: 16, xl: 20, '2xl': 24, '3xl': 32, '4xl': 40, '5xl': 48,
};

const RADIUS = {
	sm: 6, md: 10, lg: 14, xl: 18, '2xl': 24, full: 9999,
};

const SHADOWS = {
	sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 3, elevation: 2 },
	md: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
	lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 8 },
	xl: { shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.3, shadowRadius: 24, elevation: 12 },
	glow: { shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 10 },
	glowSoft: { shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 6 },
};

const styles = StyleSheet.create({
// ==================== LAYOUT GLOBAL ====================
container: {
flex: 1,
backgroundColor: COLORS.background.dark,
},
containerCentered: {
flex: 1,
backgroundColor: COLORS.background.dark,
justifyContent: 'center',
alignItems: 'center',
},
screenContainer: {
flex: 1,
backgroundColor: COLORS.background.dark,
paddingHorizontal: SPACING.lg,
},

// ==================== CARDS ====================
card: {
backgroundColor: COLORS.background.card,
borderRadius: RADIUS.xl,
padding: SPACING.xl,
borderWidth: 1,
borderColor: COLORS.border.default,
...SHADOWS.md,
},
cardGlass: {
backgroundColor: 'rgba(21, 25, 35, 0.85)',
borderRadius: RADIUS.xl,
padding: SPACING.xl,
borderWidth: 1,
borderColor: COLORS.border.light,
...SHADOWS.lg,
},

// ==================== RESERVATION CARD ====================
reservationCardContainer: {
width: '48%',
margin: '1%',
borderRadius: RADIUS.xl,
backgroundColor: COLORS.background.card,
borderWidth: 1,
borderColor: COLORS.border.default,
overflow: 'hidden',
...SHADOWS.md,
},
reservationCardHeader: {
flexDirection: 'row',
justifyContent: 'space-between',
alignItems: 'center',
marginBottom: SPACING.md,
paddingBottom: SPACING.md,
borderBottomWidth: 1,
borderBottomColor: COLORS.border.light,
},
reservationCardName: {
fontSize: 20,
fontWeight: '700',
color: COLORS.text.primary,
letterSpacing: 0.5,
textTransform: 'uppercase',
},
reservationCardSettingsIcon: {
fontSize: 24,
opacity: 0.6,
},
reservationCardContent: {
flexDirection: 'row',
gap: SPACING.md,
},
reservationCardLeftCol: {
flex: 1,
},
reservationCardRightCol: {
flex: 1,
alignItems: 'flex-end',
},
reservationCardInfoRow: {
flexDirection: 'row',
alignItems: 'center',
marginBottom: SPACING.sm,
},
reservationCardIcon: {
fontSize: 16,
marginRight: SPACING.sm,
opacity: 0.8,
},
reservationCardInfoText: {
fontSize: 13,
fontWeight: '500',
color: COLORS.text.secondary,
},
reservationCardStatusDot: {
width: 8,
height: 8,
borderRadius: 4,
marginRight: SPACING.xs,
},
reservationCardChairTouchable: {
padding: SPACING.xs,
borderRadius: RADIUS.sm,
backgroundColor: COLORS.border.light,
},
greenStripe: {
position: 'absolute',
left: 0,
top: 0,
bottom: 0,
width: 4,
borderTopLeftRadius: RADIUS.xl,
borderBottomLeftRadius: RADIUS.xl,
},

// ==================== FILTERS ====================
morphingNavContainer: {
marginBottom: SPACING.xl,
paddingHorizontal: SPACING.lg,
},
morphingNavInner: {
flexDirection: 'row',
justifyContent: 'center',
alignItems: 'center',
gap: SPACING.sm,
flexWrap: 'wrap',
position: 'relative',
backgroundColor: COLORS.background.card,
borderRadius: RADIUS['2xl'],
padding: SPACING.sm,
borderWidth: 1,
borderColor: COLORS.border.default,
},
morphingNavSlider: {
position: 'absolute',
height: 44,
borderRadius: RADIUS.xl,
borderWidth: 2,
...SHADOWS.glow,
},
morphingNavItem: {
flexDirection: 'row',
alignItems: 'center',
paddingVertical: SPACING.md,
paddingHorizontal: SPACING.lg,
borderRadius: RADIUS.xl,
gap: SPACING.sm,
minWidth: 100,
justifyContent: 'center',
zIndex: 1,
},
morphingNavIcon: {
fontSize: 16,
},
morphingNavLabel: {
fontSize: 14,
fontWeight: '500',
letterSpacing: 0,
},

// ==================== BUTTONS ====================
button: {
borderRadius: RADIUS.lg,
paddingVertical: SPACING.md,
paddingHorizontal: SPACING['2xl'],
alignItems: 'center',
justifyContent: 'center',
backgroundColor: COLORS.primary[500],
...SHADOWS.sm,
},
buttonText: {
fontSize: 17,
fontWeight: '600',
color: COLORS.text.primary,
letterSpacing: 0.5,
},
fabContainer: {
position: 'absolute',
bottom: SPACING['3xl'],
right: SPACING['2xl'],
zIndex: 100,
},
fab: {
width: 60,
height: 60,
borderRadius: 30,
justifyContent: 'center',
alignItems: 'center',
...SHADOWS.glow,
},
newReservationButton: {
position: 'absolute',
bottom: SPACING['3xl'],
right: SPACING['2xl'],
width: 60,
height: 60,
borderRadius: 30,
justifyContent: 'center',
alignItems: 'center',
...SHADOWS.glow,
},
nextButton: {
backgroundColor: COLORS.accent.emerald,
paddingVertical: SPACING.md,
paddingHorizontal: SPACING['3xl'],
borderRadius: RADIUS.lg,
alignItems: 'center',
minWidth: 160,
alignSelf: 'center',
...SHADOWS.sm,
},
prevButton: {
flex: 1,
backgroundColor: COLORS.primary[600],
paddingVertical: SPACING.md,
borderRadius: RADIUS.lg,
alignItems: 'center',
},
buttonRow: {
flexDirection: 'row',
justifyContent: 'space-between',
marginTop: SPACING.xl,
gap: SPACING.md,
},
buttonTextSettings: {
color: COLORS.text.primary,
fontWeight: '600',
fontSize: 17,
textAlign: 'center',
},
buttonTextCancel: {
color: COLORS.text.primary,
fontWeight: '600',
fontSize: 17,
textAlign: 'center',
},

// ==================== MODALS ====================
modalOverlay: {
flex: 1,
backgroundColor: 'rgba(12, 15, 23, 0.85)',
justifyContent: 'center',
alignItems: 'center',
padding: SPACING.xl,
},
overlaySettings: {
flex: 1,
backgroundColor: 'rgba(12, 15, 23, 0.85)',
justifyContent: 'center',
alignItems: 'center',
padding: SPACING.xl,
},
modalSettings: {
width: 340,
backgroundColor: COLORS.background.elevated,
borderRadius: RADIUS['2xl'],
paddingVertical: SPACING['2xl'],
paddingHorizontal: SPACING.xl,
borderWidth: 1,
borderColor: COLORS.border.default,
...SHADOWS.xl,
},
modalTitleSettings: {
fontSize: 24,
fontWeight: '700',
marginBottom: SPACING['2xl'],
textAlign: 'center',
color: COLORS.text.primary,
},
modalButtonSettings: {
backgroundColor: COLORS.primary[500],
paddingVertical: SPACING.md,
paddingHorizontal: SPACING['2xl'],
borderRadius: RADIUS.lg,
marginVertical: SPACING.sm,
width: '100%',
alignItems: 'center',
justifyContent: 'center',
...SHADOWS.glowSoft,
},
modalButtonCancel: {
backgroundColor: COLORS.accent.rose,
paddingVertical: SPACING.md,
paddingHorizontal: SPACING['2xl'],
borderRadius: RADIUS.lg,
marginVertical: SPACING.sm,
width: '100%',
alignItems: 'center',
justifyContent: 'center',
},
modalForm: {
width: '60%',
maxWidth: 500,
maxHeight: '85%',
backgroundColor: COLORS.background.elevated,
borderRadius: RADIUS['2xl'],
padding: SPACING['2xl'],
borderWidth: 1,
borderColor: COLORS.border.default,
...SHADOWS.xl,
},
modalTitle: {
fontSize: 22,
fontWeight: '700',
marginBottom: 20,
textAlign: 'center',
color: COLORS.text.primary,
},

// ==================== INPUTS ====================
input: {
borderWidth: 1,
borderColor: COLORS.border.default,
borderRadius: RADIUS.lg,
paddingHorizontal: SPACING.lg,
paddingVertical: SPACING.md,
fontSize: 17,
color: COLORS.text.primary,
backgroundColor: COLORS.background.card,
marginBottom: SPACING.md,
},

// ==================== TEXT ====================
title: {
fontSize: 24,
fontWeight: '700',
color: COLORS.text.primary,
marginBottom: SPACING.lg,
letterSpacing: -0.5,
},
label: {
fontWeight: '700',
width: 230,
fontSize: 18,
color: COLORS.text.secondary,
},
value: {
color: COLORS.text.primary,
fontSize: 18,
flexShrink: 1,
},
hint: {
color: COLORS.text.muted,
marginLeft: SPACING.sm,
fontSize: 14,
},
text: {
fontSize: 16,
color: COLORS.text.secondary,
textAlign: 'center',
},
realTableText: {
fontSize: 38,
fontWeight: '700',
color: COLORS.text.primary,
},
internalText: {
fontSize: 23,
color: COLORS.text.secondary,
},
smallText: {
color: COLORS.text.secondary,
fontSize: 17,
marginRight: SPACING.sm,
},

// ==================== SEPARATORS ====================
separator: {
height: 1,
backgroundColor: COLORS.border.default,
marginHorizontal: SPACING.md,
},
separatorHorizontal: {
height: 1,
backgroundColor: COLORS.border.default,
marginBottom: SPACING.md,
width: '100%',
},
separatorThin: {
height: 1,
backgroundColor: COLORS.border.light,
alignSelf: 'center',
width: '99%',
marginVertical: 5,
},

// ==================== FLOOR ====================
floorSectionTitle: {
fontSize: 16,
fontWeight: '600',
color: COLORS.text.primary,
marginBottom: SPACING.md,
paddingVertical: SPACING.sm,
paddingHorizontal: SPACING.md,
borderRadius: RADIUS.md,
backgroundColor: COLORS.background.elevated,
},
floorMenuItemText: {
fontSize: 14,
fontWeight: '500',
color: COLORS.text.secondary,
paddingVertical: SPACING.md,
paddingHorizontal: SPACING.md,
},
groupBox: {
backgroundColor: COLORS.background.card,
borderRadius: RADIUS.xl,
paddingVertical: SPACING.md,
paddingHorizontal: SPACING.lg,
marginTop: SPACING.md,
borderWidth: 1,
borderColor: COLORS.border.default,
},
textFloor: {
marginTop: SPACING.md,
fontSize: 20,
color: COLORS.text.primary,
fontWeight: 'bold',
marginHorizontal: SPACING.xl,
},

// ==================== BADGES ====================
badge: {
paddingHorizontal: SPACING.md,
paddingVertical: SPACING.sm,
borderRadius: 15,
marginRight: SPACING.md,
},
badgeOccupied: {
backgroundColor: COLORS.primary[400],
},
badgeText: {
color: COLORS.text.primary,
fontWeight: '600',
fontSize: 13,
},

// ==================== POPUP ====================
popupMainWrapper: {
position: 'absolute',
top: 40,
left: 0,
right: 0,
bottom: 120,
justifyContent: 'center',
alignItems: 'center',
},
popupMain: {
width: SCREEN_WIDTH * 0.91,
height: SCREEN_HEIGHT * 0.7,
backgroundColor: COLORS.background.elevated,
borderRadius: 20,
paddingTop: 0,
paddingHorizontal: 15,
paddingBottom: 15,
borderWidth: 1,
borderColor: COLORS.border.default,
...SHADOWS.xl,
},
miniWrapper: {
position: 'absolute',
bottom: 40,
width: '100%',
zIndex: 5,
},
popupMini: {
width: 110,
height: 110,
backgroundColor: COLORS.background.card,
borderRadius: 13,
padding: 12,
justifyContent: 'center',
alignItems: 'center',
borderWidth: 1,
borderColor: COLORS.border.default,
marginVertical: 5,
...SHADOWS.md,
},
miniTitle: {
fontWeight: '700',
color: COLORS.text.primary,
fontSize: 16,
textAlign: 'center',
},
miniSub: {
fontSize: 13,
color: COLORS.text.secondary,
textAlign: 'center',
marginTop: 4,
},
miniArrive: {
fontSize: 12,
color: COLORS.text.muted,
textAlign: 'center',
marginTop: 4,
},
addButton: {
justifyContent: 'center',
alignItems: 'center',
width: 110,
height: 110,
borderRadius: 13,
...SHADOWS.glow,
},
addText: {
color: COLORS.text.primary,
fontSize: 32,
fontWeight: '700',
},

// ==================== ROWS ====================
headerRow: {
flexDirection: 'row',
justifyContent: 'space-between',
alignItems: 'center',
paddingTop: 8,
paddingBottom: 0,
paddingHorizontal: 0,
},
statusRow: {
flexDirection: 'row',
alignItems: 'center',
marginTop: 4,
marginBottom: 10,
},
row: {
flexDirection: 'row',
alignItems: 'center',
marginBottom: 8,
flexWrap: 'wrap',
},

// ==================== CONTENT ====================
contentScroll: {
flex: 1,
marginTop: 8,
},
block: {
backgroundColor: COLORS.background.card,
borderRadius: 15,
padding: 16,
marginBottom: 10,
borderWidth: 1,
borderColor: COLORS.border.default,
},
blockTitle: {
fontSize: 16,
fontWeight: '600',
marginBottom: 10,
color: COLORS.text.primary,
},

// ==================== PRODUCTS ====================
productRow: {
flexDirection: 'row',
alignItems: 'center',
justifyContent: 'space-between',
marginVertical: 4,
},
categoryTitle: {
fontSize: 18,
fontWeight: '700',
marginBottom: 8,
color: COLORS.text.primary,
},
quantityText: {
marginHorizontal: 8,
fontSize: 16,
fontWeight: '500',
color: COLORS.text.primary,
},
counterButton: {
width: 32,
height: 32,
borderRadius: 8,
borderWidth: 1,
borderColor: COLORS.border.default,
justifyContent: 'center',
alignItems: 'center',
backgroundColor: COLORS.background.card,
},
scrollContainer: {
paddingBottom: 20,
},

// ==================== TIME SLOT ====================
timeSlot: {
backgroundColor: COLORS.background.card,
padding: 10,
marginTop: 10,
flexDirection: 'row',
justifyContent: 'space-between',
alignItems: 'center',
borderRadius: 6,
borderWidth: 1,
borderColor: COLORS.border.default,
},
timeText: {
fontSize: 18,
fontWeight: '600',
color: COLORS.text.primary,
},
totalText: {
fontSize: 14,
color: COLORS.text.secondary,
},

// ==================== DROPDOWN ====================
dropdown: {
backgroundColor: COLORS.background.card,
borderRadius: 8,
borderWidth: 1,
borderColor: COLORS.border.default,
},
dropdownContainer: {
backgroundColor: COLORS.background.card,
borderRadius: 8,
borderWidth: 1,
borderColor: COLORS.border.default,
marginTop: 2,
},
dropdownButton: {
padding: 10,
borderRadius: 8,
marginBottom: 10,
borderWidth: 1,
borderColor: COLORS.border.default,
backgroundColor: COLORS.background.card,
},
dropdownButtonText: {
fontSize: 14,
fontWeight: '500',
color: COLORS.text.primary,
},
simpleDropdown: {
backgroundColor: COLORS.background.card,
borderWidth: 1,
borderColor: COLORS.border.default,
borderRadius: 8,
marginTop: 4,
},
simpleDropdownItem: {
paddingVertical: 10,
paddingHorizontal: 12,
borderBottomWidth: 1,
borderBottomColor: COLORS.border.light,
},
dropdownOptionText: {
fontSize: 14,
fontWeight: '500',
color: COLORS.text.primary,
},
valueButton: {
paddingVertical: 10,
paddingHorizontal: 8,
borderWidth: 1,
borderColor: COLORS.border.default,
borderRadius: 8,
backgroundColor: COLORS.background.card,
},
settingsButton: {
marginLeft: 'auto',
padding: 4,
},

// ==================== FILTER BUTTONS (Legacy) ====================
filterButtonRow: {
flexDirection: 'row',
marginBottom: 15,
paddingHorizontal: 10,
gap: 8,
},
filterButton: {
paddingVertical: 6,
paddingHorizontal: 12,
borderRadius: 6,
backgroundColor: COLORS.background.card,
},
activeButton: {
backgroundColor: COLORS.primary[500],
},
filterButtonActives: {
paddingVertical: 12,
paddingHorizontal: 16,
borderRadius: 10,
backgroundColor: 'rgba(251, 191, 36, 0.1)',
alignItems: 'center',
justifyContent: 'center',
minWidth: 90,
borderWidth: 2,
borderColor: COLORS.status.waiting,
},
filterButtonActivesActive: {
backgroundColor: COLORS.status.waiting,
},
filterButtonOuverte: {
paddingVertical: 12,
paddingHorizontal: 16,
borderRadius: 10,
backgroundColor: 'rgba(14, 165, 233, 0.1)',
alignItems: 'center',
justifyContent: 'center',
minWidth: 90,
borderWidth: 2,
borderColor: COLORS.status.open,
},
filterButtonOuverteActive: {
backgroundColor: COLORS.status.open,
},
filterButtonTermine: {
paddingVertical: 12,
paddingHorizontal: 16,
borderRadius: 10,
backgroundColor: 'rgba(100, 116, 139, 0.1)',
alignItems: 'center',
justifyContent: 'center',
minWidth: 90,
borderWidth: 2,
borderColor: COLORS.status.finished,
},
filterButtonTermineActive: {
backgroundColor: COLORS.status.finished,
},
filterButtonAnnulee: {
paddingVertical: 12,
paddingHorizontal: 16,
borderRadius: 10,
backgroundColor: 'rgba(244, 63, 94, 0.1)',
alignItems: 'center',
justifyContent: 'center',
minWidth: 90,
borderWidth: 2,
borderColor: COLORS.status.cancelled,
},
filterButtonAnnuleeActive: {
backgroundColor: COLORS.status.cancelled,
},
filterButtonText: {
color: COLORS.text.secondary,
fontSize: 13,
fontWeight: '600',
textAlign: 'center',
},
filterButtonTextActive: {
color: COLORS.text.primary,
fontSize: 13,
fontWeight: '700',
textAlign: 'center',
},

// ==================== RESERVATION (Legacy) ====================
reservationContainer: {
flexDirection: 'row',
alignItems: 'center',
marginVertical: 5,
backgroundColor: COLORS.background.card,
borderRadius: 8,
overflow: 'hidden',
borderWidth: 1,
borderColor: COLORS.border.default,
...SHADOWS.sm,
},
reservationInfo: {
fontSize: 15,
color: COLORS.text.secondary,
fontWeight: '500',
marginBottom: 2,
},

// ==================== FAKE BUTTON ====================
fakeButton: {
backgroundColor: COLORS.secondary[600],
paddingVertical: 10,
paddingHorizontal: 15,
borderRadius: 9999,
marginVertical: 6,
},
fakeButtonText: {
color: COLORS.text.primary,
fontWeight: '400',
marginLeft: 10,
fontSize: 20,
},
});

export default styles;
