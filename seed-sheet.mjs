import { google } from "googleapis";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Load .env.local ───────────────────────────────────────────────────────────

function loadEnv() {
  const envPath = path.resolve(__dirname, ".env.local");
  if (!fs.existsSync(envPath)) {
    console.warn("⚠️  .env.local not found. Reading environment directly.");
    return;
  }
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...val] = trimmed.split("=");
    if (key && val.length > 0) {
      const v = val.join("=").trim().replace(/^["']|["']$/g, "");
      if (!process.env[key.trim()]) {
        process.env[key.trim()] = v;
      }
    }
  }
}

loadEnv();

// ── Config ────────────────────────────────────────────────────────────────────

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID || "108CN5yesthvwP9eD3KiMwGa5Q1Aan43OZfS86FgFfnk";
const CLIENT_EMAIL   = process.env.GOOGLE_CLIENT_EMAIL;
const PRIVATE_KEY    = (process.env.GOOGLE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");
const SHEET_NAME     = "Sheet1";

// ── All confirmed dates (DD/MM/YYYY) ─────────────────────────────────────────

const DATES = [
  "30/08/2026", "31/08/2026", "01/09/2026", "02/09/2026", "03/09/2026",
  "04/09/2026", "05/09/2026", "06/09/2026", "07/09/2026", "08/09/2026",
  "09/09/2026", "10/09/2026", "11/09/2026", "12/09/2026", "13/09/2026",
  "14/09/2026", "15/09/2026", "16/09/2026", "17/09/2026", "18/09/2026",
  "19/09/2026", "20/09/2026", "21/09/2026", "22/09/2026", "23/09/2026",
  "24/09/2026", "25/09/2026", "26/09/2026", "27/09/2026", "28/09/2026",
  "29/09/2026", "30/09/2026",
];

const TIME_SLOTS = [
  "7:00pm - 7:40pm",
  "7:40pm - 8:20pm",
  "8:20pm - 9:00pm",
  "9:00pm - 9:40pm",
  "9:40pm - 10:20pm",
  "10:20pm - 11:00pm",
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getDayLabel(dmyStr) {
  const parts = dmyStr.split("/");
  if (parts.length !== 3) return "";
  const dt = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
  return DAYS[dt.getDay()] || "";
}

// ── Build rows (Block format) ────────────────────────────────────────────────

const allRows = [
  ["Date & Time", "Interviewer (max 3)", "", "", "", "", "", ""],
  ["", "", "", "", "", "", "", ""],
  ["CONFIRMED DATES", "", "", "", "", "", "", ""],
  ["", "", "", "", "", "", "", ""],
];

for (const date of DATES) {
  const dayStr = getDayLabel(date);
  const dateHeader = dayStr ? `${date} (${dayStr})` : date;
  
  // Date block header
  allRows.push([dateHeader, "invite sent", "", "Interviewer", "", "Timing:", "Interview", "Zoom Link"]);

  // 6 time slots
  for (let idx = 0; idx < TIME_SLOTS.length; idx++) {
    const slotTime = TIME_SLOTS[idx];
    allRows.push([
      slotTime,
      "", // Candidate name (empty = Available)
      "",
      "", // Interviewers
      "",
      slotTime,
      idx + 1,
      "https://us05web.zoom.us/j/example",
    ]);
  }

  // Separator row
  allRows.push(["", "", "", "", "", "", "", ""]);
}

// ── Write to sheet ────────────────────────────────────────────────────────────

async function seedSheet() {
  if (!CLIENT_EMAIL || !PRIVATE_KEY) {
    console.error("❌ GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY must be set in .env.local to seed.");
    process.exit(1);
  }

  const auth = new google.auth.JWT({
    email: CLIENT_EMAIL,
    key: PRIVATE_KEY,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  console.log(`📋 Clearing sheet "${SHEET_NAME}"...`);

  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:H`,
  });

  console.log(`✍️  Writing ${allRows.length} block rows...`);

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A1`,
    valueInputOption: "RAW",
    requestBody: { values: allRows },
  });

  console.log(`\n✅  Done! ${DATES.length} date blocks seeded to Google Sheet.`);
  console.log(`   📊  Sheet: https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}`);
}

seedSheet().catch((err) => {
  console.error("❌ Error seeding sheet:", err.message);
  process.exit(1);
});
