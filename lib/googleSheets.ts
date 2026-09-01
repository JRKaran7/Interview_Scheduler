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
      slots.push({
        date: (row[COL.DATE] ?? "").trim(),
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
