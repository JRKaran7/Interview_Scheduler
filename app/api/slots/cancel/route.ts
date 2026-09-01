import { NextRequest, NextResponse } from "next/server";
import { cancelSlot } from "@/lib/googleSheets";
import { sendCancellationEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

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

  const { studentNumber } = body as Record<string, unknown>;

  if (typeof studentNumber !== "string" || !studentNumber.trim()) {
    return NextResponse.json(
      { success: false, message: "Student number is required." },
      { status: 422 }
    );
  }

  try {
    const cancelledBooking = await cancelSlot(studentNumber.trim());

    // Send cancellation email non-blockingly
    if (cancelledBooking.studentEmail) {
      sendCancellationEmail(
        cancelledBooking.studentEmail,
        cancelledBooking.studentNumber,
        cancelledBooking.date,
        cancelledBooking.time
      ).catch((err) =>
        console.error("[POST /api/slots/cancel] Email error:", err)
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Your interview booking has been cancelled.",
        cancelledBooking,
      },
      { status: 200 }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Cancellation failed.";
    console.error("[POST /api/slots/cancel] Error:", error);
    return NextResponse.json(
      { success: false, message: msg },
      { status: 400 }
    );
  }
}
