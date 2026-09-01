import { NextRequest, NextResponse } from "next/server";
import { getAllBookedSlots } from "@/lib/googleSheets";
import { sendReminderEmail, SendReminderResult } from "@/lib/email";

export const dynamic = "force-dynamic";

// ─── Date helper ─────────────────────────────────────────────────────────────

/**
 * Returns tomorrow's date as a string in multiple common formats so we can
 * match whatever format the Google Sheet uses:
 *   ISO:    "2024-09-16"
 *   UK:     "16/09/2024"
 *   US:     "09/16/2024"
 *   Long:   "September 16, 2024"
 *   Short:  "16 Sep 2024"
 */
function getTomorrowFormats(): string[] {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const y = tomorrow.getFullYear();
  const m = String(tomorrow.getMonth() + 1).padStart(2, "0");
  const d = String(tomorrow.getDate()).padStart(2, "0");

  const monthLong = tomorrow.toLocaleString("en-US", { month: "long" });
  const monthShort = tomorrow.toLocaleString("en-US", { month: "short" });

  return [
    `${y}-${m}-${d}`,                           // ISO
    `${d}/${m}/${y}`,                            // UK / European
    `${m}/${d}/${y}`,                            // US
    `${monthLong} ${Number(d)}, ${y}`,           // "September 16, 2024"
    `${Number(d)} ${monthShort} ${y}`,           // "16 Sep 2024"
    `${monthShort} ${Number(d)}, ${y}`,          // "Sep 16, 2024"
  ];
}

// ─── GET /api/cron/reminders ──────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  // ── Security: validate the cron secret ──
  // Vercel Cron sends the secret as an Authorization header.
  const authHeader = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const tomorrowFmts = getTomorrowFormats();
    const allBooked = await getAllBookedSlots();

    // Filter to only bookings for tomorrow
    const tomorrowBookings = allBooked.filter((slot) =>
      tomorrowFmts.includes(slot.date)
    );

    if (tomorrowBookings.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No bookings for tomorrow. No reminders sent.",
        sent: 0,
        errors: [],
      });
    }

    // Send reminders concurrently
    const results: SendReminderResult[] = await Promise.all(
      tomorrowBookings.map((slot) =>
        sendReminderEmail(slot.studentEmail, slot.date, slot.time)
      )
    );

    const sent = results.filter((r) => r.success).length;
    const errors = results
      .filter((r) => !r.success)
      .map((r) => ({ email: r.email, error: r.error }));

    console.log(
      `[CRON] Reminders sent: ${sent}/${tomorrowBookings.length}. Errors: ${errors.length}`
    );

    return NextResponse.json({
      success: true,
      sent,
      total: tomorrowBookings.length,
      errors,
    });
  } catch (error) {
    console.error("[CRON /api/cron/reminders] Error:", error);
    return NextResponse.json(
      { success: false, message: "Cron job failed.", error: String(error) },
      { status: 500 }
    );
  }
}
