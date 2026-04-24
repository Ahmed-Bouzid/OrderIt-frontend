/**
 * 🖨️ print-test.tsx
 * Test screen for the Thermer thermal printer integration.
 * Navigate to this screen via /print-test
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from "react-native";
import PrintButton from "../components/PrintButton";
import { printKitchenTicket } from "../services/thermalPrinter";

// ──────────────────────────────────────────────────────────────────────────────
// Demo order for the kitchen ticket test
// ──────────────────────────────────────────────────────────────────────────────

const DEMO_ORDER = {
  id: "1245",
  customerName: "Ahmed",
  items: [
    { name: "Burger", qty: 2 },
    { name: "Fries", qty: 1 },
  ],
  notes: "No onions",
};

// ──────────────────────────────────────────────────────────────────────────────

export default function PrintTestScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.title}>🖨️ Thermal Printer</Text>
          <Text style={styles.subtitle}>
            Test your Thermer Bluetooth connection
          </Text>
        </View>

        {/* ── Section: Basic print ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Basic Print Test</Text>
          <Text style={styles.cardDesc}>
            Opens Thermer and prints a sample receipt.
          </Text>
          <PrintButton />
        </View>

        {/* ── Section: Kitchen ticket ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Demo Kitchen Ticket</Text>
          <Text style={styles.cardDesc}>
            Prints a formatted kitchen order ticket.
          </Text>

          {/* Preview */}
          <View style={styles.ticketPreview}>
            <Text style={styles.ticketText}>SUNNYGO</Text>
            <Text style={styles.ticketText}>----------------</Text>
            <Text style={styles.ticketText}>ORDER #{DEMO_ORDER.id}</Text>
            <Text style={styles.ticketText}>{DEMO_ORDER.customerName}</Text>
            <Text style={styles.ticketText}> </Text>
            {DEMO_ORDER.items.map((item, i) => (
              <Text key={i} style={styles.ticketText}>
                {item.qty} x {item.name}
              </Text>
            ))}
            <Text style={styles.ticketText}> </Text>
            <Text style={styles.ticketText}>Notes:</Text>
            <Text style={styles.ticketText}>{DEMO_ORDER.notes}</Text>
            <Text style={styles.ticketText}>----------------</Text>
          </View>

          <PrintButton
            label="Print Demo Order"
            textToPrint=""
            // We pass empty string and override onPress below via wrapper
          />
          {/* Note: for kitchen ticket we use a dedicated wrapper */}
          <KitchenPrintButton order={DEMO_ORDER} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Internal wrapper that uses printKitchenTicket
// ──────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { Pressable, ActivityIndicator } from "react-native";

function KitchenPrintButton({ order }: { order: typeof DEMO_ORDER }) {
  const [loading, setLoading] = useState(false);

  const handlePress = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await printKitchenTicket(order);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={loading}
      style={({ pressed }) => [
        styles.kitchenBtn,
        pressed && { opacity: 0.75 },
        loading && { opacity: 0.6 },
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        {loading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={{ fontSize: 15 }}>🎫</Text>
        )}
        <Text style={styles.kitchenBtnLabel}>
          {loading ? "Opening..." : "Print Kitchen Ticket"}
        </Text>
      </View>
    </Pressable>
  );
}

// ──────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#0D0D1A",
  },
  container: {
    padding: 20,
    gap: 20,
  },
  header: {
    marginBottom: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.4,
  },
  subtitle: {
    fontSize: 14,
    color: "#9E9E9E",
    marginTop: 4,
  },
  card: {
    backgroundColor: "#161625",
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: "#2A2A45",
    gap: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  cardDesc: {
    fontSize: 13,
    color: "#9E9E9E",
    lineHeight: 19,
  },
  ticketPreview: {
    backgroundColor: "#0A0A12",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#1E1E35",
    fontFamily: "monospace",
  },
  ticketText: {
    color: "#BDBDBD",
    fontSize: 12,
    fontFamily: "monospace",
    lineHeight: 18,
  },
  kitchenBtn: {
    backgroundColor: "#2D2B55",
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 16,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#4A47A3",
  },
  kitchenBtnLabel: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
