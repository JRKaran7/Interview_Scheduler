import { google } from "googleapis";
import { createPrivateKey } from "crypto";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Slot {
  date: string;
  time: string;
  rowIndex: number; // 1-based sheet row
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

const SHEET_NAME = "Sheet1";
// Google Sheet: https://docs.google.com/spreadsheets/d/108CN5yesthvwP9eD3KiMwGa5Q1Aan43OZfS86FgFfnk/edit?gid=0#gid=0
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID || "108CN5yesthvwP9eD3KiMwGa5Q1Aan43OZfS86FgFfnk";

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

function hasValidGoogleCredentials(): boolean {
  const email = (process.env.GOOGLE_CLIENT_EMAIL ?? "").trim();
  const key = (process.env.GOOGLE_PRIVATE_KEY ?? "").trim();
  if (!email || !key) return false;
  if (
    email.includes("your_service_account_email") ||
    key.includes("YourPrivateKeyHere") ||
    !key.includes("-----BEGIN PRIVATE KEY-----")
  ) {
    return false;
  }
  try {
    const formattedKey = key.replace(/\\n/g, "\n");
    createPrivateKey(formattedKey);
    return true;
  } catch {
    return false;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Extract DD/MM/YYYY date from string like "09/09/2026 (Wed)" or "09/09/2026". */
function extractDateString(str: string): string | null {
  if (!str) return null;
  const match = str.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
  if (match) return match[1];
  const isoMatch = str.match(/(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1];
  return null;
}

/** Check if string is a time slot like "7:00pm - 7:40pm". */
function isTimeSlotString(str: string): boolean {
  if (!str) return false;
  return /\d{1,2}:\d{2}\s*(?:am|pm)?\s*-\s*\d{1,2}:\d{2}\s*(?:am|pm)?/i.test(str);
}

/**
 * Returns midnight (00:00:00.000) of today in local server time.
 */
function getTodayMidnight(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

/**
 * Parses a date string (DD/MM/YYYY) into a JS Date.
 */
function parseDateFromSheet(dateStr: string): Date | null {
  if (!dateStr) return null;
  const dmyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmyMatch) {
    const d = parseInt(dmyMatch[1], 10);
    const m = parseInt(dmyMatch[2], 10) - 1;
    const y = parseInt(dmyMatch[3], 10);
    const dt = new Date(y, m, d);
    if (dt.getFullYear() === y && dt.getMonth() === m && dt.getDate() === d) {
      return dt;
    }
  }
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
  const loose = new Date(dateStr);
  if (!isNaN(loose.getTime())) {
    return new Date(loose.getFullYear(), loose.getMonth(), loose.getDate());
  }
  return null;
}

/**
 * Returns true if dateStr is strictly before today.
 */
function isBeforeToday(dateStr: string): boolean {
  const parsed = parseDateFromSheet(dateStr);
  if (!parsed) return false;
  return parsed.getTime() < getTodayMidnight().getTime();
}

async function fetchRowsFromGviz(): Promise<string[][]> {
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch sheet via gviz: HTTP ${res.status}`);
  }
  const text = await res.text();
  const jsonStr = text
    .replace(/^\/\*O_o\*\/\s*google\.visualization\.Query\.setResponse\(/, "")
    .replace(/\);?\s*$/, "");
  const data = JSON.parse(jsonStr);
  const rows: string[][] = [];

  if (data.table?.cols) {
    rows.push(data.table.cols.map((c: any) => c?.label || ""));
  }

  if (data.table?.rows) {
    for (const r of data.table.rows) {
      if (!r || !r.c) continue;
      const rowVals = r.c.map((c: any) =>
        c
          ? c.f !== undefined && c.f !== null
            ? String(c.f)
            : c.v !== undefined && c.v !== null
            ? String(c.v)
            : ""
          : ""
      );
      rows.push(rowVals);
    }
  }

  return rows;
}

/** Fetch ALL rows (including headers & date blocks). Range A:H. */
async function getAllRows(): Promise<string[][]> {
  if (hasValidGoogleCredentials()) {
    try {
      const sheets = getSheetsClient();
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A:H`,
      });
      return (res.data.values ?? []) as string[][];
    } catch (err) {
      console.warn("[googleSheets] API fetch failed, falling back to gviz:", err);
    }
  }
  return fetchRowsFromGviz();
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Returns all slots whose candidate column (Col B) is empty / available.
 * Handles both date block format (DAC'26 recruitment sheet) and flat table format.
 */
export async function getAvailableSlots(): Promise<Slot[]> {
  const rows = await getAllRows();
  const slots: Slot[] = [];

  let currentDate: string | null = null;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const colA = (row[0] ?? "").trim();
    if (!colA) continue;

    const extractedDate = extractDateString(colA);

    // Date Block Header check (e.g. "30/08/2026 (Sun)")
    if (extractedDate && !isTimeSlotString(colA)) {
      currentDate = extractedDate;
      continue;
    }

    // Time Slot row inside Date Block (Col A = "7:00pm - 7:40pm")
    if (currentDate && isTimeSlotString(colA)) {
      const candidateCol = (row[1] ?? "").trim();
      const isAvailable =
        !candidateCol ||
        candidateCol.toLowerCase() === "available" ||
        candidateCol.toLowerCase() === "invite sent";

      if (isAvailable) {
        if (isBeforeToday(currentDate)) continue;
        slots.push({
          date: currentDate,
          time: colA,
          rowIndex: i + 1,
        });
      }
      continue;
    }

    // Fallback: Flat Table row format (Col A = Date, Col B = Time, Col C = Status)
    if (!currentDate && extractedDate && isTimeSlotString((row[1] ?? "").trim())) {
      const statusStr = (row[2] ?? "").trim();
      if (statusStr.toLowerCase() === "available") {
        if (!isBeforeToday(extractedDate)) {
          slots.push({
            date: extractedDate,
            time: (row[1] ?? "").trim(),
            rowIndex: i + 1,
          });
        }
      }
    }
  }

  return slots;
}

/**
 * Returns all slots where a student is booked.
 */
export async function getAllBookedSlots(): Promise<BookedSlot[]> {
  const rows = await getAllRows();
  const slots: BookedSlot[] = [];

  let currentDate: string | null = null;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const colA = (row[0] ?? "").trim();
    if (!colA) continue;

    const extractedDate = extractDateString(colA);

    if (extractedDate && !isTimeSlotString(colA)) {
      currentDate = extractedDate;
      continue;
    }

    if (currentDate && isTimeSlotString(colA)) {
      const candidateCol = (row[1] ?? "").trim();
      const isBooked =
        candidateCol !== "" &&
        candidateCol.toLowerCase() !== "available" &&
        candidateCol.toLowerCase() !== "invite sent";

      if (isBooked) {
        slots.push({
          date: currentDate,
          time: colA,
          studentNumber: candidateCol,
          studentEmail: "",
          preferredName: candidateCol,
          rowIndex: i + 1,
        });
      }
      continue;
    }

    // Fallback: Flat Table row format
    if (!currentDate && extractedDate && isTimeSlotString((row[1] ?? "").trim())) {
      const statusStr = (row[2] ?? "").trim();
      if (statusStr.toLowerCase() === "booked") {
        slots.push({
          date: extractedDate,
          time: (row[1] ?? "").trim(),
          studentNumber: (row[3] ?? "").trim(),
          studentEmail: (row[4] ?? "").trim(),
          preferredName: (row[5] ?? "").trim(),
          rowIndex: i + 1,
        });
      }
    }
  }

  return slots;
}

/**
 * Books a slot by writing student details to Candidate Column (Col B).
 */
export async function bookSlot(
  date: string,
  time: string,
  studentNumber: string,
  studentEmail: string,
  preferredName: string = ""
): Promise<void> {
  if (isBeforeToday(date)) {
    throw new Error("Cannot book a slot for a date in the past.");
  }

  if (!hasValidGoogleCredentials()) {
    throw new Error(
      "Google Sheets API write credentials (GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY) are missing or set to placeholders in .env.local."
    );
  }

  const sheets = getSheetsClient();
  const rows = await getAllRows();

  let targetRowIndex: number | null = null;
  let isFlatFormat = false;
  let currentDate: string | null = null;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const colA = (row[0] ?? "").trim();
    if (!colA) continue;

    const extractedDate = extractDateString(colA);

    if (extractedDate && !isTimeSlotString(colA)) {
      currentDate = extractedDate;
      continue;
    }

    if (currentDate && currentDate === date) {
      if (colA === time) {
        const candidateCol = (row[1] ?? "").trim();
        const isAvailable =
          !candidateCol ||
          candidateCol.toLowerCase() === "available" ||
          candidateCol.toLowerCase() === "invite sent";

        if (!isAvailable) {
          throw new SlotAlreadyBookedError(date, time);
        }
        targetRowIndex = i + 1;
        break;
      }
    }

    // Fallback: Flat format
    if (!currentDate && extractedDate === date) {
      if ((row[1] ?? "").trim() === time) {
        const status = (row[2] ?? "").trim();
        if (status.toLowerCase() !== "available") {
          throw new SlotAlreadyBookedError(date, time);
        }
        targetRowIndex = i + 1;
        isFlatFormat = true;
        break;
      }
    }
  }

  if (targetRowIndex === null) {
    throw new Error(`Slot not found for date="${date}" time="${time}".`);
  }

  // Double-check row before updating
  const checkRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A${targetRowIndex}:C${targetRowIndex}`,
  });
  const checkRow = (checkRes.data.values?.[0] ?? []) as string[];

  if (isFlatFormat) {
    const currentStatus = (checkRow[2] ?? "").trim();
    if (currentStatus.toLowerCase() !== "available") {
      throw new SlotAlreadyBookedError(date, time);
    }
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A${targetRowIndex}:F${targetRowIndex}`,
      valueInputOption: "RAW",
      requestBody: {
        values: [[date, time, "Booked", studentNumber, studentEmail, preferredName]],
      },
    });
  } else {
    const currentCandidate = (checkRow[1] ?? "").trim();
    if (
      currentCandidate &&
      currentCandidate.toLowerCase() !== "available" &&
      currentCandidate.toLowerCase() !== "invite sent"
    ) {
      throw new SlotAlreadyBookedError(date, time);
    }

    const nameToUse = preferredName.trim() || studentNumber;
    const bookingValue = `${nameToUse} (${studentNumber})`;

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!B${targetRowIndex}`,
      valueInputOption: "RAW",
      requestBody: {
        values: [[bookingValue]],
      },
    });
  }
}

/**
 * Returns a student's active booking if they have one.
 */
export async function getStudentBooking(
  studentNumber: string
): Promise<BookedSlot | null> {
  const cleanNum = studentNumber.trim().toLowerCase();
  if (!cleanNum) return null;

  const rows = await getAllRows();
  let currentDate: string | null = null;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const colA = (row[0] ?? "").trim();
    if (!colA) continue;

    const extractedDate = extractDateString(colA);

    if (extractedDate && !isTimeSlotString(colA)) {
      currentDate = extractedDate;
      continue;
    }

    if (currentDate && isTimeSlotString(colA)) {
      const candidateCol = (row[1] ?? "").trim();
      if (candidateCol.toLowerCase().includes(cleanNum)) {
        return {
          date: currentDate,
          time: colA,
          studentNumber: studentNumber,
          studentEmail: "",
          preferredName: candidateCol,
          rowIndex: i + 1,
        };
      }
    }

    if (!currentDate && extractedDate) {
      const status = (row[2] ?? "").trim();
      const stuNum = (row[3] ?? "").trim().toLowerCase();
      if (status.toLowerCase() === "booked" && stuNum === cleanNum) {
        return {
          date: extractedDate,
          time: (row[1] ?? "").trim(),
          studentNumber: (row[3] ?? "").trim(),
          studentEmail: (row[4] ?? "").trim(),
          preferredName: (row[5] ?? "").trim(),
          rowIndex: i + 1,
        };
      }
    }
  }

  return null;
}

/**
 * Cancels a student's active booking.
 */
export async function cancelSlot(
  studentNumber: string
): Promise<BookedSlot> {
  const booking = await getStudentBooking(studentNumber);
  if (!booking) {
    throw new Error(`No active booking found for student number "${studentNumber}".`);
  }

  const sheets = getSheetsClient();
  const checkRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A${booking.rowIndex}:C${booking.rowIndex}`,
  });
  const row = (checkRes.data.values?.[0] ?? []) as string[];
  const isFlat = (row[2] ?? "").trim().toLowerCase() === "booked";

  if (isFlat) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A${booking.rowIndex}:F${booking.rowIndex}`,
      valueInputOption: "RAW",
      requestBody: {
        values: [[booking.date, booking.time, "Available", "", "", ""]],
      },
    });
  } else {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!B${booking.rowIndex}`,
      valueInputOption: "RAW",
      requestBody: {
        values: [[""]],
      },
    });
  }

  return booking;
}
