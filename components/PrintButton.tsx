/**
 * 🖨️ PrintButton.tsx
 * Reusable button component to trigger thermal printer via Thermer app.
 */

import React, { useState } from "react";
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from "react-native";
import { printThermerText } from "../services/thermalPrinter";

// ──────────────────────────────────────────────────────────────────────────────

interface PrintButtonProps {
  /** Custom text to print. Defaults to the sample receipt. */
  textToPrint?: string;
  /** Override the press handler entirely (e.g. to use printReceiptTicket) */
  onPress?: () => Promise<void> | void;
  /** Label shown on the button. Defaults to "Test Printer" */
  label?: string;
  /** Optional size variant */
  size?: "sm" | "md";
}

const SAMPLE_TEXT = `SUNNYGO\n\nTest Print\nBurger x2\nFries x1\n\nThank you`;

// ──────────────────────────────────────────────────────────────────────────────

export default function PrintButton({
  textToPrint = SAMPLE_TEXT,
  onPress: onPressProp,
  label = "Test Printer",
  size = "md",
}: PrintButtonProps) {
  const [loading, setLoading] = useState(false);

  const handlePress = async () => {
    if (loading) return;
    setLoading(true);
    try {
      if (onPressProp) {
        await onPressProp();
      } else {
        await printThermerText(textToPrint);
      }
    } finally {
      setLoading(false);
    }
  };

  const isSmall = size === "sm";

  return (
    <Pressable
      onPress={handlePress}
      disabled={loading}
      style={({ pressed }) => [
        styles.button,
        isSmall && styles.buttonSmall,
        pressed && styles.buttonPressed,
        loading && styles.buttonDisabled,
      ]}
    >
      <View style={styles.inner}>
        {loading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={[styles.icon, isSmall && styles.iconSmall]}>🖨️</Text>
        )}
        <Text style={[styles.label, isSmall && styles.labelSmall]}>
          {loading ? "Opening..." : label}
        </Text>
      </View>
    </Pressable>
  );
}

// ──────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#1A1A2E",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#3A3A5C",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonSmall: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  buttonPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.97 }],
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  icon: {
    fontSize: 16,
  },
  iconSmall: {
    fontSize: 13,
  },
  label: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  labelSmall: {
    fontSize: 12,
  },
});
