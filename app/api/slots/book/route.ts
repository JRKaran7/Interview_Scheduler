import { NextRequest, NextResponse } from "next/server";
import { bookSlot, getStudentBooking, SlotAlreadyBookedError } from "@/lib/googleSheets";
import { sendBookingConfirmationEmail } from "@/lib/email";

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

  // ── Check if student already has an active booking ──
  try {
    const existingBooking = await getStudentBooking(cleanStudentNumber);
    if (existingBooking) {
      return NextResponse.json(
        {
          success: false,
          code: "ALREADY_BOOKED",
          message: `Student number "${cleanStudentNumber}" already has an active interview booking on ${existingBooking.date} at ${existingBooking.time}. Please cancel your existing booking before selecting a new time slot.`,
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
    try {
      await sendBookingConfirmationEmail(
        cleanEmail,
        cleanStudentNumber,
        cleanDate,
        cleanTime,
        cleanPreferredName
      );
    } catch (emailErr) {
      console.error("[POST /api/slots/book] Email trigger error:", emailErr);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Booking confirmed!",
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

    console.error("[POST /api/slots/book] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong while booking. Please try again.",
      },
      { status: 500 }
    );
  }
}
