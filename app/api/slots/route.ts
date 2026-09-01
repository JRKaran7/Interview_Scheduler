import { NextResponse } from "next/server";
import { getAvailableSlots } from "@/lib/googleSheets";

export const dynamic = "force-dynamic"; // Never cache; always fresh from Sheets

export async function GET() {
  try {
    const slots = await getAvailableSlots();
    return NextResponse.json(
      { success: true, slots },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error("[GET /api/slots] Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch available slots." },
      { status: 500 }
    );
  }
}
