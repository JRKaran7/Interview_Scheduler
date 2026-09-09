"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, AlertCircle, Inbox, Lock } from "lucide-react";
import BookingModal from "./BookingModal";
import StudentSessionBar from "./StudentSessionBar";
import ActiveBookingBanner from "./ActiveBookingBanner";
import CancelConfirmModal from "./CancelConfirmModal";
import LoginHero from "./LoginHero";
import CalendarView from "./CalendarView";
import { BookedSlot } from "@/lib/googleSheets";

// ─── Types ─────────────────────────────────────────────────────────────────

interface Slot {
  date: string;
  time: string;
  rowIndex: number;
}

// ─── Loading Skeleton ──────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-6" aria-label="Loading slots…" role="status">
      <div className="shimmer h-16 w-full rounded-2xl mb-4" />
      <div className="glass-card rounded-3xl p-8 border border-white/10 space-y-4">
        <div className="shimmer h-6 w-48 rounded-lg mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="shimmer h-20 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 30_000; // refresh every 30 s
const SESSION_STORAGE_KEY = "student_id_session";

export default function SlotPicker() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Student Session & Booking state
  const [studentNumber, setStudentNumber] = useState<string>("");
  const [activeBooking, setActiveBooking] = useState<BookedSlot | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  // Sync session with server on mount
  useEffect(() => {
    const saved = localStorage.getItem(SESSION_STORAGE_KEY);
    fetch("/api/auth/session", { cache: "no-store", credentials: "include" })
      .then((res) => res.json())
      .then(async (data) => {
        if (data.authenticated && data.studentNumber) {
          setStudentNumber(data.studentNumber);
          localStorage.setItem(SESSION_STORAGE_KEY, data.studentNumber);
        } else if (saved) {
          // Cookie missing or expired: re-establish session for stored student number
          try {
            const reauth = await fetch("/api/auth/session", {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ studentNumber: saved }),
            });
            if (reauth.ok) {
              setStudentNumber(saved);
            } else {
              localStorage.removeItem(SESSION_STORAGE_KEY);
              setStudentNumber("");
            }
          } catch {
            setStudentNumber(saved);
          }
        }
      })
      .catch(() => {
        if (saved) setStudentNumber(saved);
      });
  }, []);

  // Fetch student's existing booking whenever studentNumber changes
  const checkStudentBooking = useCallback(async (stuNum: string) => {
    if (!stuNum.trim()) {
      setActiveBooking(null);
      return;
    }
    try {
      const res = await fetch(
        `/api/student/booking?studentNumber=${encodeURIComponent(stuNum.trim())}`,
        { cache: "no-store", credentials: "include" }
      );
      if (res.ok) {
        const data = await res.json();
        setActiveBooking(data.booking ?? null);
      }
    } catch (err) {
      console.error("Failed to check student booking:", err);
    }
  }, []);

  useEffect(() => {
    if (studentNumber) checkStudentBooking(studentNumber);
  }, [studentNumber, checkStudentBooking]);

  const handleLogin = async (id: string) => {
    // Set the signed server-side session cookie first
    try {
      const res = await fetch("/api/auth/session", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentNumber: id }),
      });
      if (!res.ok) {
        const errText = await res.text();
        console.error("[Login] Session API failed:", errText);
        alert("Failed to log in: Server session could not be created. Please try again.");
        return;
      }
    } catch (err) {
      console.error("[Login] Could not reach session API:", err);
      alert("Could not connect to session server. Please check your network.");
      return;
    }
    setStudentNumber(id);
    localStorage.setItem(SESSION_STORAGE_KEY, id);
  };

  const handleLogout = async () => {
    // Clear the server-side session cookie
    try {
      await fetch("/api/auth/session", { method: "DELETE", credentials: "include" });
    } catch (err) {
      console.error("[Logout] Could not reach session API:", err);
    }
    setStudentNumber("");
    setActiveBooking(null);
    localStorage.removeItem(SESSION_STORAGE_KEY);
  };

  const fetchSlots = useCallback(async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/slots", { cache: "no-store", credentials: "include" });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setSlots(data.slots ?? []);
      setLastUpdated(new Date());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load available slots."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchSlots(true);
  }, [fetchSlots]);

  // Polling every 30 s
  useEffect(() => {
    const interval = setInterval(() => {
      fetchSlots(false);
      if (studentNumber) checkStudentBooking(studentNumber);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchSlots, studentNumber, checkStudentBooking]);

  const handleCancelBooking = async () => {
    if (!studentNumber) return;
    try {
      await fetch("/api/auth/session", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentNumber }),
      });
    } catch {}

    const res = await fetch("/api/slots/cancel", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentNumber }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || "Could not cancel booking.");
    }

    setActiveBooking(null);
    fetchSlots(false);
  };

  // ── Step 1: Login Gate (If not logged in, show Login Hero) ──
  if (!studentNumber) {
    return <LoginHero onLogin={handleLogin} />;
  }

  // ── Step 2: Logged In Portal ──
  return (
    <>
      {/* Student Session Bar */}
      <StudentSessionBar
        studentNumber={studentNumber}
        onLogin={handleLogin}
        onLogout={handleLogout}
        hasActiveBooking={activeBooking !== null}
      />

      {/* Active Booking Banner */}
      {activeBooking && (
        <ActiveBookingBanner
          booking={activeBooking}
          onCancelClick={() => setIsCancelModalOpen(true)}
        />
      )}

      {/* Cancel Confirmation Modal */}
      {activeBooking && (
        <CancelConfirmModal
          isOpen={isCancelModalOpen}
          onClose={() => setIsCancelModalOpen(false)}
          booking={activeBooking}
          onConfirmCancel={handleCancelBooking}
        />
      )}

      {/* Live availability bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <span className="pulse-dot" aria-hidden="true" />
          <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
            Live availability
          </span>
          {lastUpdated && (
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              · Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>

        <button
          onClick={() => fetchSlots(false)}
          className="btn-ghost text-xs flex items-center gap-1.5 px-3 py-1.5"
          aria-label="Refresh availability"
          id="refresh-slots-btn"
        >
          <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} aria-hidden="true" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Single Booking Restriction Notice */}
      {activeBooking && (
        <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-sm flex items-center gap-3 mb-6">
          <Lock className="w-5 h-5 flex-shrink-0 text-amber-400" />
          <span>
            You already have a confirmed interview on <strong>{activeBooking.date}</strong> at <strong>{activeBooking.time}</strong>. If you want to change your date or time, please cancel your active booking above first.
          </span>
        </div>
      )}

      {/* Loading state */}
      {isLoading && slots.length === 0 && <LoadingSkeleton />}

      {/* Error state */}
      {error && slots.length === 0 && (
        <div
          className="rounded-2xl p-8 text-center"
          style={{
            background: "rgba(248,113,113,0.06)",
            border: "1px solid rgba(248,113,113,0.2)",
          }}
          role="alert"
        >
          <AlertCircle
            size={36}
            className="mx-auto mb-3"
            style={{ color: "#f87171" }}
            aria-hidden="true"
          />
          <h3 className="font-semibold text-base mb-1" style={{ color: "var(--text-primary)" }}>
            Failed to Load Slots
          </h3>
          <p className="text-sm mb-5" style={{ color: "var(--text-secondary)" }}>
            {error}
          </p>
          <button
            onClick={() => fetchSlots(true)}
            className="btn-primary inline-flex items-center gap-2"
          >
            <RefreshCw size={14} aria-hidden="true" />
            Try Again
          </button>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && slots.length === 0 && (
        <div
          className="glass-card rounded-2xl p-12 text-center"
          style={{ border: "1px solid var(--border)" }}
        >
          <div
            className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: "rgba(99,102,241,0.1)", color: "var(--brand-400)" }}
          >
            <Inbox size={32} aria-hidden="true" />
          </div>
          <h3 className="font-bold text-lg mb-2" style={{ color: "var(--text-primary)" }}>
            No Slots Available
          </h3>
          <p className="text-sm max-w-sm mx-auto" style={{ color: "var(--text-secondary)" }}>
            All interview slots are currently booked. Please check back later or contact your coordinator.
          </p>
        </div>
      )}

      {/* Calendar Slot View (Shown when student has NO active booking) */}
      {!isLoading && slots.length > 0 && !activeBooking && (
        <CalendarView
          slots={slots}
          onSelectSlot={(slot) => setSelectedSlot(slot)}
          disabled={activeBooking !== null}
        />
      )}

      {/* Booking Drawer */}
      <BookingModal
        slot={selectedSlot}
        initialStudentNumber={studentNumber}
        onClose={() => setSelectedSlot(null)}
        onBooked={() => {
          setSelectedSlot(null);
          fetchSlots(false);
          if (studentNumber) checkStudentBooking(studentNumber);
        }}
      />
    </>
  );
}
