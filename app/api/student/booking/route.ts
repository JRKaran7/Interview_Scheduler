import { NextRequest, NextResponse } from "next/server";
import { getStudentBooking } from "@/lib/googleSheets";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const studentNumber = searchParams.get("studentNumber");

  if (!studentNumber || !studentNumber.trim()) {
    return NextResponse.json(
      { success: false, message: "studentNumber parameter is required." },
      { status: 400 }
    );
  }

  try {
    const booking = await getStudentBooking(studentNumber.trim());

    // Security: strip the student's email from the response.
    // The email is PII — callers should not be able to harvest it by
    // querying arbitrary student numbers. The frontend only needs the
    // booking presence + date/time/name to display the active-booking banner.
    const safeBooking = booking
      ? {
          date: booking.date,
          time: booking.time,
          studentNumber: booking.studentNumber,
          preferredName: booking.preferredName,
          rowIndex: booking.rowIndex,
        }
      : null;

    return NextResponse.json(
      {
        success: true,
        hasBooking: booking !== null,
        booking: safeBooking,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[GET /api/student/booking] Error:", error);
    return NextResponse.json(
      { success: false, message: "Could not fetch student booking." },
      { status: 500 }
    );
  }
}
