import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { signStudentNumber, verifySessionCookie, SESSION_COOKIE_NAME } from "@/lib/session";

export const dynamic = "force-dynamic";

// Cookie options shared between set and clear
const COOKIE_BASE = {
  httpOnly: true,        // JS cannot read/modify this cookie
  sameSite: "lax",       // "lax" ensures reliable cookie transmission across Vercel navigations
  path: "/",
  secure: process.env.NODE_ENV === "production", // HTTPS only in prod
} as const;

// ── GET /api/auth/session — check active session ─────────────────────────────

export async function GET() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value ?? "";
  const studentNumber = verifySessionCookie(sessionCookie);

  if (!studentNumber) {
    return NextResponse.json({ authenticated: false, studentNumber: null });
  }

  return NextResponse.json({ authenticated: true, studentNumber });
}

// ── POST /api/auth/session — set session cookie ───────────────────────────────

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
      { success: false, message: "studentNumber is required." },
      { status: 422 }
    );
  }

  const clean = studentNumber.trim().slice(0, 128); // sanity cap

  let signed: string;
  try {
    signed = signStudentNumber(clean);
  } catch (err) {
    console.error("[POST /api/auth/session] Signing error:", err);
    return NextResponse.json(
      { success: false, message: "Session could not be created. Check SESSION_SECRET config." },
      { status: 500 }
    );
  }

  const res = NextResponse.json({ success: true, studentNumber: clean });
  res.cookies.set(SESSION_COOKIE_NAME, signed, {
    ...COOKIE_BASE,
    // 7-day session — long enough for the scheduling window
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}

// ── DELETE /api/auth/session — clear session cookie (logout) ──────────────────

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(SESSION_COOKIE_NAME, "", {
    ...COOKIE_BASE,
    maxAge: 0, // immediately expire
  });
  return res;
}

