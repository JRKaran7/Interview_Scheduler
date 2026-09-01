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
    return NextResponse.json(
      {
        success: true,
        hasBooking: booking !== null,
        booking,
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
