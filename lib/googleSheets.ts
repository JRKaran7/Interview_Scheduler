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
  preferredName?: string;
  rowIndex: number;
}

export class SlotAlreadyBookedError extends Error {
  constructor(date: string, time: string) {
    super(`Slot on ${date} at ${time} is no longer available.`);
    this.name = "SlotAlreadyBookedError";
  }
}

// ─── Column mapping (0-based within the row array) ──────────────────────────
// Sheet columns: Date | Time | Status | Student Number | Student Email | Preferred Name
const COL = {
  DATE: 0,
  TIME: 1,
  STATUS: 2,
  STUDENT_NUMBER: 3,
  STUDENT_EMAIL: 4,
  PREFERRED_NAME: 5,
} as const;

const SHEET_NAME = "Sheet1"; // Adjust if your tab has a different name
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID!;

// ─── Auth ────────────────────────────────────────────────────────────────────

function getAuth() {
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
  return `${SHEET_NAME}!A${rowIndex}:F${rowIndex}`;
}

/**
 * Returns midnight (00:00:00.000) of today in local server time.
 * Used for past-date filtering — slots strictly before this timestamp are excluded.
 */
function getTodayMidnight(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

/**
 * Parses a date string from the Google Sheet into a JS Date.
 * Handles the following formats:
 *   DD/MM/YYYY  — "04/09/2026"
 *   YYYY-MM-DD  — "2026-09-04"  (ISO)
 *   MM/DD/YYYY  — "09/04/2026"  (US — only attempted as last resort)
 *   "September 4, 2026"         (long)
 *   "4 Sep 2026"                (short)
 *   "Sep 4, 2026"               (short alt)
 * Returns null if the string cannot be reliably parsed.
 */
function parseDateFromSheet(dateStr: string): Date | null {
  if (!dateStr) return null;

  // DD/MM/YYYY
  const dmyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmyMatch) {
    const d = parseInt(dmyMatch[1], 10);
    const m = parseInt(dmyMatch[2], 10) - 1;
    const y = parseInt(dmyMatch[3], 10);
    const dt = new Date(y, m, d);
    // Validate: day must be <= 31, month <= 11
    if (dt.getFullYear() === y && dt.getMonth() === m && dt.getDate() === d) {
      return dt;
    }
  }

  // YYYY-MM-DD (ISO without time)
  const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10) - 1;
    const d = parseInt(isoMatch[3], 10);
    const dt = new Date(y, m, d);
    if (dt.getFullYear() === y && dt.getMonth() === m && dt.getDate() === d) {
      return dt;
    }
  }

  // "Month D, YYYY" or "D Month YYYY" or "Month D YYYY"
  const loose = new Date(dateStr);
  if (!isNaN(loose.getTime())) {
    // new Date() parses these as UTC midnight; convert to local
    return new Date(loose.getFullYear(), loose.getMonth(), loose.getDate());
  }

  return null;
}

/**
 * Returns true if the given date string represents a date strictly before today.
 * Dates that cannot be parsed are kept (shown) to avoid hiding real slots.
 */
function isBeforeToday(dateStr: string): boolean {
  const parsed = parseDateFromSheet(dateStr);
  if (!parsed) return false; // can't determine — don't hide
  return parsed.getTime() < getTodayMidnight().getTime();
}

/** Fetch ALL rows (including header). Returns raw 2D array. */
async function getAllRows(): Promise<string[][]> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:F`,
  });
  return (res.data.values ?? []) as string[][];
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Returns all slots whose Status column is exactly "Available".
 */
export async function getAvailableSlots(): Promise<Slot[]> {
  const rows = await getAllRows();
  const slots: Slot[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const status = (row[COL.STATUS] ?? "").trim();
    if (status === "Available") {
      const dateStr = (row[COL.DATE] ?? "").trim();
      // ── Security: never surface past-date slots ──
      if (isBeforeToday(dateStr)) continue;
      slots.push({
        date: dateStr,
        time: (row[COL.TIME] ?? "").trim(),
        rowIndex: i + 1,
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
        preferredName: (row[COL.PREFERRED_NAME] ?? "").trim(),
        rowIndex: i + 1,
      });
    }
  }

  return slots;
}

/**
 * Books a slot. Performs a double-check read immediately before writing
 * to guard against race conditions.
 */
export async function bookSlot(
  date: string,
  time: string,
  studentNumber: string,
  studentEmail: string,
  preferredName: string = ""
): Promise<void> {
  // ── Security: reject bookings for past dates ──
  if (isBeforeToday(date)) {
    throw new Error("Cannot book a slot for a date in the past.");
  }

  const sheets = getSheetsClient();

  const rows = await getAllRows();

  let targetRowIndex: number | null = null;
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rowDate = (row[COL.DATE] ?? "").trim();
    const rowTime = (row[COL.TIME] ?? "").trim();
    const rowStatus = (row[COL.STATUS] ?? "").trim();

    if (rowDate === date && rowTime === time) {
      if (rowStatus !== "Available") {
        throw new SlotAlreadyBookedError(date, time);
      }
      targetRowIndex = i + 1;
      break;
    }
  }

  if (targetRowIndex === null) {
    throw new Error(`Slot not found for date="${date}" time="${time}".`);
  }

  // Double-check row status
  const checkRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: rowRange(targetRowIndex),
  });
  const checkRow = (checkRes.data.values?.[0] ?? []) as string[];
  const currentStatus = (checkRow[COL.STATUS] ?? "").trim();

  if (currentStatus !== "Available") {
    throw new SlotAlreadyBookedError(date, time);
  }

  // Write booking data including Preferred Name
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: rowRange(targetRowIndex),
    valueInputOption: "RAW",
    requestBody: {
      values: [[date, time, "Booked", studentNumber, studentEmail, preferredName]],
    },
  });
}

/**
 * Returns a student's active booking if they have one, or null.
 */
export async function getStudentBooking(
  studentNumber: string
): Promise<BookedSlot | null> {
  const cleanNum = studentNumber.trim().toLowerCase();
  if (!cleanNum) return null;

  const rows = await getAllRows();
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const status = (row[COL.STATUS] ?? "").trim();
    const stuNum = (row[COL.STUDENT_NUMBER] ?? "").trim().toLowerCase();

    if (status === "Booked" && stuNum === cleanNum) {
      return {
        date: (row[COL.DATE] ?? "").trim(),
        time: (row[COL.TIME] ?? "").trim(),
        studentNumber: (row[COL.STUDENT_NUMBER] ?? "").trim(),
        studentEmail: (row[COL.STUDENT_EMAIL] ?? "").trim(),
        preferredName: (row[COL.PREFERRED_NAME] ?? "").trim(),
        rowIndex: i + 1,
      };
    }
  }

  return null;
}

/**
 * Cancels a student's active booking by setting Status back to "Available".
 */
export async function cancelSlot(
  studentNumber: string
): Promise<BookedSlot> {
  const booking = await getStudentBooking(studentNumber);
  if (!booking) {
    throw new Error(`No active booking found for student number "${studentNumber}".`);
  }

  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: rowRange(booking.rowIndex),
    valueInputOption: "RAW",
    requestBody: {
      values: [[booking.date, booking.time, "Available", "", "", ""]],
    },
  });

  return booking;
}
