import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { bookSlot, getStudentBooking, SlotAlreadyBookedError } from "@/lib/googleSheets";
import { sendBookingConfirmationEmail } from "@/lib/email";
import { verifySessionCookie, SESSION_COOKIE_NAME } from "@/lib/session";

export const dynamic = "force-dynamic";

// ─── Validation helpers ───────────────────────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sanitize(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, 256); // cap length as basic sanitization
}

// ─── POST /api/slots/book ─────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON body." },
      { status: 400 }
    );
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json(
      { success: false, message: "Request body must be a JSON object." },
      { status: 400 }
    );
  }

  const { date, time, studentNumber, studentEmail, preferredName } = body as Record<
    string,
    unknown
  >;

  const cleanDate = sanitize(date);
  const cleanTime = sanitize(time);
  const cleanStudentNumber = sanitize(studentNumber);
  const cleanEmail = sanitize(studentEmail);
  const cleanPreferredName = sanitize(preferredName);

  // ── Field presence checks ──
  const errors: Record<string, string> = {};

  if (!cleanDate) errors.date = "Date is required.";
  if (!cleanTime) errors.time = "Time is required.";
  if (!cleanStudentNumber) errors.studentNumber = "Student number is required.";
  if (!cleanPreferredName) errors.preferredName = "Preferred name is required.";
  if (!cleanEmail) {
    errors.studentEmail = "Email is required.";
  } else if (!EMAIL_REGEX.test(cleanEmail)) {
    errors.studentEmail = "Please enter a valid email address.";
  }

  if (Object.keys(errors).length > 0) {
    return NextResponse.json(
      { success: false, message: "Validation failed.", errors },
      { status: 422 }
    );
  }

  // ── Session ownership check ──
  // Verify the signed session cookie proves the caller owns cleanStudentNumber.
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value ?? "";
  const sessionStudentNumber = verifySessionCookie(sessionCookie);

  if (!sessionStudentNumber) {
    return NextResponse.json(
      { success: false, message: "Not authenticated. Please log in and try again." },
      { status: 401 }
    );
  }

  if (sessionStudentNumber.toLowerCase() !== cleanStudentNumber.toLowerCase()) {
    return NextResponse.json(
      { success: false, message: "You may only book under your own student number." },
      { status: 403 }
    );
  }

  // ── Check if student already has an active booking ──
  try {
    const existingBooking = await getStudentBooking(cleanStudentNumber);
    if (existingBooking) {
      return NextResponse.json(
        {
          success: false,
          code: "ALREADY_BOOKED",
          // Security: do not echo back the student number — prevents ID enumeration
          message: `You already have an active interview booking on ${existingBooking.date} at ${existingBooking.time}. Please cancel your existing booking before selecting a new time slot.`,
          existingBooking,
        },
        { status: 400 }
      );
    }
  } catch (err) {
    console.error("[POST /api/slots/book] Check existing booking error:", err);
  }

  // ── Book the slot ──
  try {
    await bookSlot(cleanDate, cleanTime, cleanStudentNumber, cleanEmail, cleanPreferredName);

    // ── Send instant confirmation email ──
    let emailSent = false;
    try {
      const emailResult = await sendBookingConfirmationEmail(
        cleanEmail,
        cleanStudentNumber,
        cleanDate,
        cleanTime,
        cleanPreferredName
      );
      emailSent = emailResult.success;
      if (!emailSent) {
        console.warn("[POST /api/slots/book] Confirmation email not sent:", emailResult.error);
      }
    } catch (emailErr) {
      console.error("[POST /api/slots/book] Email trigger error:", emailErr);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Booking confirmed!",
        emailSent,
        booking: {
          date: cleanDate,
          time: cleanTime,
          studentNumber: cleanStudentNumber,
          studentEmail: cleanEmail,
          preferredName: cleanPreferredName,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[POST /api/slots/book] Error caught:", error);
    if (error instanceof SlotAlreadyBookedError) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This slot was just taken by someone else. Please choose another time.",
          code: "SLOT_TAKEN",
        },
        { status: 409 }
      );
    }

    const msg = error instanceof Error ? error.message : typeof error === "string" ? error : null;
    if (msg === "Cannot book a slot for a date in the past.") {
      return NextResponse.json(
        { success: false, message: msg },
        { status: 422 }
      );
    }

    if (msg?.includes("DECODER routines") || msg?.includes("unsupported")) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid GOOGLE_PRIVATE_KEY in .env.local. Please ensure it is a valid RSA private key in PEM format (wrapped in quotes with \\n for line breaks).",
        },
        { status: 500 }
      );
    }

    if (msg) {
      return NextResponse.json(
        { success: false, message: msg },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong while booking. Please try again.",
      },
      { status: 500 }
    );
  }
}
