/**
 * 🖨️ thermalPrinter.ts
 * Service d'impression thermique via l'app iOS "Thermer: Bluetooth Mini Thermal Printer"
 * Uses React Native Linking to open the Thermer app via custom URL scheme.
 *
 * ✅ Confirmed format (source: https://github.com/tussharmate/ios-thermer-custom-schema)
 * URL: thermer://?data=<url-encoded-JSON>
 * JSON shape: { "0": PrintEntry, "1": PrintEntry, ... }  ← dict with string keys
 *
 * ⚙️ If the URL scheme changes in the future, update THERMER_BASE_URL below.
 */

import { Linking } from "react-native";

// ──────────────────────────────────────────────────────────────────────────────
// 🔧 CONFIG
// ──────────────────────────────────────────────────────────────────────────────
const THERMER_BASE_URL = "thermer://"; // do NOT add "print"

// ──────────────────────────────────────────────────────────────────────────────
// 📦 PrintEntry type
// ──────────────────────────────────────────────────────────────────────────────

interface PrintEntry {
  type: number;         // 0=text, 1=image, 2=barcode, 3=QR
  content?: string;     // type 0
  bold?: number;        // 0=no, 1=yes
  align?: number;       // 0=left, 1=center, 2=right
  format?: number;      // 0=normal, 1=dblH, 2=dblHW, 3=dblW, 4=small
  path?: string;        // type 1 — image URL
  base64Image?: string; // type 1 — base64 image
  value?: string;       // type 2/3 — barcode/QR value
  height?: number;      // type 2 — barcode height 10-80
  size?: number;        // type 3 — QR size mm (min 40)
}

// ──────────────────────────────────────────────────────────────────────────────

/**
 * Opens the Thermer app without printing.
 */
export async function openThermer(): Promise<boolean> {
  try {
    await Linking.openURL(THERMER_BASE_URL);
    console.log("[ThermalPrinter] ✅ Thermer app opened");
    return true;
  } catch (error) {
    console.error("[ThermalPrinter] ❌ Error opening Thermer app:", error);
    return false;
  }
}

/**
 * Low-level: sends a dict of PrintEntry objects to Thermer.
 */
async function sendEntries(entries: Record<string, PrintEntry>): Promise<boolean> {
  try {
    const jsonString = JSON.stringify(entries);
    const encoded = encodeURIComponent(jsonString);
    const url = `${THERMER_BASE_URL}?data=${encoded}`;
    console.log("[ThermalPrinter] 📤 Sending:", jsonString);
    await Linking.openURL(url);
    console.log("[ThermalPrinter] ✅ Print sent");
    return true;
  } catch (err) {
    console.error("[ThermalPrinter] ❌ Failed:", err);
    return false;
  }
}

/**
 * Sends plain text to Thermer. Each line = one PrintEntry.
 */
export async function printThermerText(text: string): Promise<boolean> {
  const lines = text.split("\n");
  const entries: Record<string, PrintEntry> = {};
  lines.forEach((line, i) => {
    entries[String(i)] = {
      type: 0,
      content: line === "" ? " " : line,
      bold: 0,
      align: 0,
      format: 0,
    };
  });
  return sendEntries(entries);
}

// ──────────────────────────────────────────────────────────────────────────────
// 🎫 Kitchen Ticket
// ──────────────────────────────────────────────────────────────────────────────

export interface OrderItem {
  name: string;
  qty: number;
}

export interface KitchenOrder {
  id: string;
  customerName?: string;
  items: OrderItem[];
  notes?: string;
}

export function formatKitchenTicket(order: KitchenOrder): string {
  const SEP = "----------------";
  const lines: string[] = [
    "SUNNYGO",
    SEP,
    `ORDER #${order.id}`,
    order.customerName || "",
    "",
    ...order.items.map((item) => `${item.qty} x ${item.name}`),
    ...(order.notes ? ["", "Notes:", order.notes] : []),
    "",
    SEP,
  ];
  return lines.join("\n");
}

export async function printKitchenTicket(order: KitchenOrder): Promise<boolean> {
  const ticket = formatKitchenTicket(order);
  console.log("[ThermalPrinter] 🎫 Kitchen ticket:\n", ticket);
  return printThermerText(ticket);
}

// ──────────────────────────────────────────────────────────────────────────────
// 🧾 Rich receipt (matches image format with bold + centered lines)
// ──────────────────────────────────────────────────────────────────────────────

export interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
}

export interface ReceiptData {
  restaurantName: string;
  billNumber: string;
  tableNumber?: string | number;
  clientName?: string;
  items: ReceiptItem[];
  taxRate?: number;   // default 0 — set to e.g. 5 for 5%
  address?: string;
  phone?: string;
  email?: string;
}

/**
 * Prints a full formatted receipt matching the layout:
 * RESTAURANT NAME (bold, centered)
 * separator + Bill # + date
 * Items with qty and price
 * SubTotal / Tax / Grand Total
 * Thank You + address
 */
export async function printReceiptTicket(data: ReceiptData): Promise<boolean> {
  const {
    restaurantName,
    billNumber,
    tableNumber,
    clientName,
    items,
    taxRate = 0,
    address,
    phone,
    email,
  } = data;

  const now = new Date();
  const dateStr = now.toLocaleDateString("fr-FR");
  const timeStr = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const SEP = "----------------------------------------";

  const subTotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const taxAmount = (subTotal * taxRate) / 100;
  const grandTotal = subTotal + taxAmount;

  const entries: Record<string, PrintEntry> = {};
  let idx = 0;

  const add = (content: string, bold = 0, align = 0, format = 0) => {
    entries[String(idx++)] = { type: 0, content: content || " ", bold, align, format };
  };

  // Restaurant name — bold, centered, double width+height
  add(restaurantName.toUpperCase(), 1, 1, 2);
  add(" ");

  // Table / client line
  if (tableNumber) add(`Table ${tableNumber}${clientName ? "  •  " + clientName : ""}`, 0, 1);
  else if (clientName) add(clientName, 0, 1);

  add(" ");
  add(SEP);

  // Bill number + date
  add(`Bill #${billNumber}`, 1, 0);
  add(`${dateStr}  ${timeStr}`, 0, 2);
  add(SEP);

  // Column header — format=0 (normal), bold reset line after to avoid carry-over
  add("Item x Qty                          Rate", 1, 0, 0);
  add(" ", 0, 0, 0); // reset bold before items
  add(SEP);

  // Items — format=0 (normal), bold=0
  for (const item of items) {
    const qty = `${item.name} x ${item.quantity}`;
    const price = `${(item.price * item.quantity).toFixed(2)}`;
    const spaces = Math.max(1, 42 - qty.length - price.length);
    add(qty + " ".repeat(spaces) + price, 0, 0, 0);
  }

  add(SEP);

  // Totals
  const pad = (label: string, value: string) => {
    const spaces = Math.max(1, 42 - label.length - value.length);
    return label + " ".repeat(spaces) + value;
  };

  add(pad("SubTotal", subTotal.toFixed(2)), 1, 0, 0);
  add(" ", 0, 0, 0); // reset bold
  if (taxRate > 0) {
    add(pad(`Tax(${taxRate}%)`, taxAmount.toFixed(2)), 0, 0, 0);
  }
  add(pad("Grand Total", grandTotal.toFixed(2)), 1, 0, 0);
  add(" ", 0, 0, 0); // reset bold
  add(SEP);

  // Thank you
  add(" ");
  add("Thank You", 1, 1);
  add(" ", 0, 0, 0); // reset bold

  // Address / contact
  if (address) add(address, 0, 1, 0);
  if (phone) add(phone, 0, 1, 0);
  if (email) add(`Email: ${email}`, 0, 1, 0);

  add(" ");
  add(" ");

  return sendEntries(entries);
}

