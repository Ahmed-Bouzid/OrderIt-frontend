/**
 * dailyLogHelper.js — Utilitaires partagés pour les logs loggables
 *
 * Utilisé par : useDashboardActions, Activity, TableDetailModal, usePinGuard
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const CANCELLATION_LOG_KEY = "dailyLogs_cancellation_entries";

/** Extrait un prénom depuis un email */
const nameFromEmail = (email) => {
  if (!email) return "—";
  const local = email.split("@")[0];
  const first = local.split(".")[0];
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
};

/**
 * Écrit un log d'annulation de réservation dans AsyncStorage.
 * @param {object} params
 * @param {string} params.reservationId   - _id de la réservation
 * @param {string} [params.clientName]    - Nom du client
 * @param {string} [params.tableNumber]   - Numéro de table
 * @param {string} [params.reservationDate] - Date de la réservation (ISO)
 * @param {string} [params.reservationTime] - Heure de la réservation
 */
export const appendCancellationLog = async ({
  reservationId,
  clientName,
  tableNumber,
  reservationDate,
  reservationTime,
} = {}) => {
  try {
    const email = await AsyncStorage.getItem("userEmail");
    const user = nameFromEmail(email);

    const ref = reservationId
      ? `#${String(reservationId).slice(-6).toUpperCase()}`
      : "—";
    const who = clientName || "Client inconnu";
    const table = tableNumber ? ` · T${tableNumber}` : "";
    const when =
      reservationDate
        ? ` · prévu le ${new Date(reservationDate).toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "2-digit",
          })}${reservationTime ? ` à ${reservationTime}` : ""}`
        : "";

    const entry = {
      _logId: `cancel__${Date.now()}__${Math.random().toString(36).slice(2, 7)}`,
      action: "reservation_cancelled",
      timestamp: new Date().toISOString(),
      userName: user,
      reservationLabel: who + table,
      message: `Réservation annulée — ${who}${table}${when} par ${user} (${ref})`,
    };

    const raw = await AsyncStorage.getItem(CANCELLATION_LOG_KEY);
    const existing = raw ? JSON.parse(raw) : [];
    const next = [entry, ...existing].slice(0, 200);
    await AsyncStorage.setItem(CANCELLATION_LOG_KEY, JSON.stringify(next));
  } catch {
    // Ne jamais crasher pour un log
  }
};

export const CANCELLATION_LOG_KEY_EXPORT = CANCELLATION_LOG_KEY;
