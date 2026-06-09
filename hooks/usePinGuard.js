/**
 * usePinGuard — Hook + Modale PIN manager réutilisable
 *
 * Usage :
 *   const { PinModal, requirePin } = usePinGuard();
 *
 *   // Dans le render :
 *   <PinModal />
 *
 *   // Pour protéger une action :
 *   const handleDelete = () => {
 *     requirePin(() => actuallyDelete());
 *   };
 *
 * Si aucun PIN n'est configuré, l'action est exécutée directement.
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Pressable,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PIN_KEY = "managerPin";
const PIN_LENGTH_MAX = 6;
const PIN_LOG_KEY = "dailyLogs_pin_entries";

/** Extrait un prénom depuis un email (ex: ahmed.waraiotoko@... → Ahmed) */
const nameFromEmail = (email) => {
  if (!email) return "—";
  const local = email.split("@")[0];
  const first = local.split(".")[0];
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
};

/** Persiste un log d'usage PIN dans AsyncStorage */
const appendPinLog = async (action) => {
  try {
    const email = await AsyncStorage.getItem("userEmail");
    const entry = {
      _logId: `pin__${Date.now()}__${Math.random().toString(36).slice(2, 7)}`,
      action: "pin_used",
      timestamp: new Date().toISOString(),
      userName: nameFromEmail(email),
      reservationLabel: "—",
      message: `PIN manager utilisé par ${nameFromEmail(email)} — accès "${action || "portail manager"}"`,
    };
    const raw = await AsyncStorage.getItem(PIN_LOG_KEY);
    const existing = raw ? JSON.parse(raw) : [];
    const next = [entry, ...existing].slice(0, 200);
    await AsyncStorage.setItem(PIN_LOG_KEY, JSON.stringify(next));
  } catch {
    // Ne jamais crasher pour un log
  }
};

export function usePinGuard(action) {
  const [visible, setVisible] = useState(false);
  const [digits, setDigits] = useState([]);
  const [error, setError] = useState(false);
  const [pendingCallback, setPendingCallback] = useState(null);

  /**
   * Demande le PIN avant d'exécuter `callback`.
   * Si aucun PIN n'est configuré → exécute directement.
   */
  const requirePin = useCallback(async (callback) => {
    const saved = await AsyncStorage.getItem(PIN_KEY);
    if (!saved) {
      // Pas de PIN configuré → exécution libre
      callback();
      return;
    }
    setPendingCallback(() => callback);
    setDigits([]);
    setError(false);
    setVisible(true);
  }, []);

  const handleDigit = useCallback(
    async (d) => {
      const next = [...digits, d];
      setDigits(next);
      setError(false);

      if (next.length >= PIN_LENGTH_MAX) {
        // Vérification
        const saved = await AsyncStorage.getItem(PIN_KEY);
        if (next.join("") === saved) {
          setVisible(false);
          setDigits([]);
          appendPinLog(action);
          pendingCallback?.();
        } else {
          setError(true);
          setTimeout(() => setDigits([]), 500);
        }
        return;
      }

      // Auto-vérification dès 4 chiffres si le PIN enregistré fait 4 chiffres
      if (next.length === 4) {
        const saved = await AsyncStorage.getItem(PIN_KEY);
        if (saved && saved.length === 4) {
          if (next.join("") === saved) {
            setVisible(false);
            setDigits([]);
            appendPinLog(action);
            pendingCallback?.();
          } else {
            setError(true);
            setTimeout(() => setDigits([]), 500);
          }
        }
      }
    },
    [digits, pendingCallback]
  );

  const handleDelete = useCallback(() => {
    setDigits((d) => d.slice(0, -1));
    setError(false);
  }, []);

  const handleClose = useCallback(() => {
    setVisible(false);
    setDigits([]);
    setError(false);
    setPendingCallback(null);
  }, []);

  const PinModal = useCallback(
    () => (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
        statusBarTranslucent
      >
        <Pressable style={styles.overlay} onPress={handleClose}>
          <Pressable onPress={() => {}} style={styles.card}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.iconWrap}>
                <Ionicons name="lock-closed" size={22} color="#FBBF24" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.title}>Code PIN manager</Text>
                <Text style={styles.subtitle}>Entrez votre PIN pour continuer</Text>
              </View>
              <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Dots */}
            <View style={styles.dotsRow}>
              {[0, 1, 2, 3].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    digits[i] !== undefined && styles.dotFilled,
                    error && styles.dotError,
                  ]}
                />
              ))}
            </View>

            {error && (
              <Text style={styles.errorText}>PIN incorrect</Text>
            )}

            {/* Keypad */}
            <View style={styles.keypad}>
              {["1","2","3","4","5","6","7","8","9","","0","⌫"].map((k, idx) => {
                if (k === "") return <View key={idx} style={styles.keyEmpty} />;
                const isDelete = k === "⌫";
                return (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => isDelete ? handleDelete() : handleDigit(k)}
                    style={[styles.key, isDelete && styles.keyDelete]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.keyText, isDelete && styles.keyDeleteText]}>
                      {k}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    ),
    [visible, digits, error, handleClose, handleDigit, handleDelete]
  );

  return { PinModal, requirePin };
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: "#1E293B",
    borderRadius: 20,
    width: "100%",
    maxWidth: 340,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
    paddingBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.07)",
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(251,191,36,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "700",
  },
  subtitle: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginTop: 28,
    marginBottom: 8,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#334155",
    backgroundColor: "transparent",
  },
  dotFilled: {
    backgroundColor: "#FBBF24",
    borderColor: "#FBBF24",
  },
  dotError: {
    backgroundColor: "#EF4444",
    borderColor: "#EF4444",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 4,
    fontWeight: "600",
  },
  keypad: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 10,
  },
  key: {
    width: "30%",
    aspectRatio: 1.6,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  keyEmpty: {
    width: "30%",
    aspectRatio: 1.6,
  },
  keyDelete: {
    backgroundColor: "rgba(239,68,68,0.08)",
    borderColor: "rgba(239,68,68,0.2)",
  },
  keyText: {
    color: "#F8FAFC",
    fontSize: 22,
    fontWeight: "600",
  },
  keyDeleteText: {
    color: "#EF4444",
    fontSize: 20,
  },
});
