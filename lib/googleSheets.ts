import { google } from "googleapis";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Slot {
  date: string;
  time: string;
  rowIndex: number; // 1-based sheet row (header = row 1, data starts at 2)
}

export interface BookedSlot {
  date: string;
  time: string;
  studentNumber: string;
  studentEmail: string;
  rowIndex: number;
}

export class SlotAlreadyBookedError extends Error {
  constructor(date: string, time: string) {
    super(`Slot on ${date} at ${time} is no longer available.`);
    this.name = "SlotAlreadyBookedError";
  }
}

// ─── Column mapping (0-based within the row array) ──────────────────────────
// Sheet columns: Date | Time | Status | Student Number | Student Email
const COL = {
  DATE: 0,
  TIME: 1,
  STATUS: 2,
  STUDENT_NUMBER: 3,
  STUDENT_EMAIL: 4,
} as const;

const SHEET_NAME = "Sheet1"; // Adjust if your tab has a different name
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID!;

// ─── Auth ────────────────────────────────────────────────────────────────────

function getAuth() {
  // GOOGLE_PRIVATE_KEY is stored with literal \n in env vars; replace them
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY ?? "").replace(
    /\\n/g,
    "\n"
  );

  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return auth;
}

function getSheetsClient() {
  return google.sheets({ version: "v4", auth: getAuth() });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Convert a 1-based row index to an A1 range string for the full data row. */
function rowRange(rowIndex: number): string {
  return `${SHEET_NAME}!A${rowIndex}:E${rowIndex}`;
}

/** Fetch ALL rows (including header). Returns raw 2D array. */
async function getAllRows(): Promise<string[][]> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:E`,
  });
  return (res.data.values ?? []) as string[][];
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Returns all slots whose Status column is exactly "Available".
 * Row 1 is the header; data starts at row 2, so rowIndex = array index + 1 + 1.
 */
export async function getAvailableSlots(): Promise<Slot[]> {
  const rows = await getAllRows();
  const slots: Slot[] = [];

  // Skip row 0 (header)
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const status = (row[COL.STATUS] ?? "").trim();
    if (status === "Available") {
      slots.push({
        date: (row[COL.DATE] ?? "").trim(),
        time: (row[COL.TIME] ?? "").trim(),
        rowIndex: i + 1, // 1-based sheet row
      });
    }
  }

  return slots;
}

/**
 * Returns all slots where Status === "Booked" (used by the cron job).
 */
export async function getAllBookedSlots(): Promise<BookedSlot[]> {
  const rows = await getAllRows();
  const slots: BookedSlot[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const status = (row[COL.STATUS] ?? "").trim();
    if (status === "Booked") {
      slots.push({
        date: (row[COL.DATE] ?? "").trim(),
        time: (row[COL.TIME] ?? "").trim(),
        studentNumber: (row[COL.STUDENT_NUMBER] ?? "").trim(),
        studentEmail: (row[COL.STUDENT_EMAIL] ?? "").trim(),
        rowIndex: i + 1,
      });
    }
  }

  return slots;
}

/**
 * Books a slot. Performs a double-check read immediately before writing
 * to guard against race conditions (two users booking the same slot
 * at the same moment).
 *
 * Throws `SlotAlreadyBookedError` if the slot is no longer available.
 */
export async function bookSlot(
  date: string,
  time: string,
  studentNumber: string,
  studentEmail: string
): Promise<void> {
  const sheets = getSheetsClient();

  // 1. Re-read ALL rows to find the correct rowIndex for date+time
  const rows = await getAllRows();

  let targetRowIndex: number | null = null;
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rowDate = (row[COL.DATE] ?? "").trim();
    const rowTime = (row[COL.TIME] ?? "").trim();
    const rowStatus = (row[COL.STATUS] ?? "").trim();

    if (rowDate === date && rowTime === time) {
      if (rowStatus !== "Available") {
        // Slot exists but is already booked — race condition caught!
        throw new SlotAlreadyBookedError(date, time);
      }
      targetRowIndex = i + 1; // convert to 1-based
      break;
    }
  }

  if (targetRowIndex === null) {
    throw new Error(`Slot not found for date="${date}" time="${time}".`);
  }

  // 2. Double-check: re-read the exact row before writing
  const checkRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: rowRange(targetRowIndex),
  });
  const checkRow = (checkRes.data.values?.[0] ?? []) as string[];
  const currentStatus = (checkRow[COL.STATUS] ?? "").trim();

  if (currentStatus !== "Available") {
    throw new SlotAlreadyBookedError(date, time);
  }

  // 3. Write booking data atomically
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: rowRange(targetRowIndex),
    valueInputOption: "RAW",
    requestBody: {
      values: [[date, time, "Booked", studentNumber, studentEmail]],
    },
  });
}
