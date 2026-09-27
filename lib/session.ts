import { createHmac, timingSafeEqual } from "crypto";

export const SESSION_COOKIE_NAME = "student_session";

// ── Secret helper ────────────────────────────────────────────────────────────

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET || process.env.GOOGLE_PRIVATE_KEY;
  if (secret) {
    return secret;
  }
  // Safe deterministic fallback when SESSION_SECRET is not explicitly configured
  return "interviews-scheduler-fallback-session-secret-2026";
}

// ── HMAC helpers ─────────────────────────────────────────────────────────────

/**
 * Signs a student number with HMAC-SHA256 using SESSION_SECRET (or fallback secret).
 * Produces a cookie value in the form:  "STU1001.<hex-signature>"
 */
export function signStudentNumber(studentNumber: string): string {
  const secret = getSessionSecret();
  const sig = createHmac("sha256", secret).update(studentNumber).digest("hex");
  return `${studentNumber}.${sig}`;
}

/**
 * Verifies a signed cookie value.
 * Uses constant-time comparison to prevent timing attacks.
 * Returns the student number on success, or null if invalid/tampered.
 */
export function verifySessionCookie(cookieValue: string): string | null {
  if (!cookieValue) return null;

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

