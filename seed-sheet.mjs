/**
 * seed-sheet.mjs
 * One-time script to populate the Google Sheet with all interview slots.
 * Run with: node seed-sheet.mjs
 */

import { google } from "googleapis";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load .env.local manually (no dotenv needed) ──────────────────────────────
function loadEnv() {
  try {
    const envPath = resolve(__dirname, ".env.local");
    const lines = readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let value = trimmed.slice(eqIdx + 1).trim();
      // Strip surrounding quotes
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  } catch (e) {
    console.error("Could not load .env.local:", e.message);
    process.exit(1);
  }
}

loadEnv();

// ── Config ────────────────────────────────────────────────────────────────────

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const CLIENT_EMAIL   = process.env.GOOGLE_CLIENT_EMAIL;
const PRIVATE_KEY    = (process.env.GOOGLE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");
const SHEET_NAME     = "Sheet1";

// ── All confirmed dates (DD/MM/YYYY) ─────────────────────────────────────────

const DATES = [
  "30/08/2026",
  "31/08/2026",
  "01/09/2026",
  "02/09/2026",
  "03/09/2026",
  "04/09/2026",
  "05/09/2026",
  "06/09/2026",
  "07/09/2026",
  "08/09/2026",
  "09/09/2026",
  "10/09/2026",
  "11/09/2026",
  "12/09/2026",
  "13/09/2026",
  "14/09/2026",
  "15/09/2026",
  "16/09/2026",
  "17/09/2026",
  "18/09/2026",
  "19/09/2026",
  "20/09/2026",
  "21/09/2026",
  "22/09/2026",
  "23/09/2026",
  "24/09/2026",
  "25/09/2026",
  "26/09/2026",
  "27/09/2026",
  "28/09/2026",
  "29/09/2026",
  "30/09/2026",
];

const TIME_SLOTS = [
  "7:00pm - 7:40pm",
  "7:40pm - 8:20pm",
  "8:20pm - 9:00pm",
  "9:00pm - 9:40pm",
  "9:40pm - 10:20pm",
  "10:20pm - 11:00pm",
];

// ── Build rows ────────────────────────────────────────────────────────────────

const header = [["Date", "Time", "Status", "Student Number", "Student Email"]];

const dataRows = [];
for (const date of DATES) {
  for (const time of TIME_SLOTS) {
    dataRows.push([date, time, "Available", "", ""]);
  }
}

const allRows = [...header, ...dataRows];

// ── Write to sheet ────────────────────────────────────────────────────────────

async function seedSheet() {
  const auth = new google.auth.JWT({
    email: CLIENT_EMAIL,
    key: PRIVATE_KEY,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  console.log(`📋 Clearing sheet "${SHEET_NAME}"...`);

  // Clear existing content
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:E`,
  });

  console.log(`✍️  Writing ${dataRows.length} slot rows (+ 1 header)...`);

  // Write all rows at once
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A1`,
    valueInputOption: "RAW",
    requestBody: { values: allRows },
  });

  console.log(`\n✅  Done! ${dataRows.length} slots written to Google Sheet.`);
  console.log(`   📅  ${DATES.length} dates × ${TIME_SLOTS.length} time slots = ${dataRows.length} rows`);
  console.log(`   📊  Sheet: https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}`);
}

seedSheet().catch((err) => {
  console.error("❌ Error seeding sheet:", err.message);
  process.exit(1);
});
