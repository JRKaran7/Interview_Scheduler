import { createHmac, timingSafeEqual } from "crypto";

export const SESSION_COOKIE_NAME = "student_session";

// ── HMAC helpers ─────────────────────────────────────────────────────────────

/**
 * Signs a student number with HMAC-SHA256 using SESSION_SECRET.
 * Produces a cookie value in the form:  "STU1001.<hex-signature>"
 */
export function signStudentNumber(studentNumber: string): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET env var is not set.");
  }
  const sig = createHmac("sha256", secret).update(studentNumber).digest("hex");
  return `${studentNumber}.${sig}`;
}

/**
 * Verifies a signed cookie value.
 * Uses constant-time comparison to prevent timing attacks.
 * Returns the student number on success, or null if invalid/tampered.
 */
export function verifySessionCookie(cookieValue: string): string | null {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;

  const lastDot = cookieValue.lastIndexOf(".");
  if (lastDot === -1) return null;

  const studentNumber = cookieValue.slice(0, lastDot);
  if (!studentNumber) return null;

  // Recompute expected signature for the extracted student number
  const expected = signStudentNumber(studentNumber);

  try {
    // Both buffers must be the same length for timingSafeEqual
    const a = Buffer.from(cookieValue);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return null;
    if (!timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }

  return studentNumber;
}
