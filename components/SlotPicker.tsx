"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, AlertCircle, Calendar, Inbox } from "lucide-react";
import SlotCard from "./SlotCard";
import BookingModal from "./BookingModal";

// ─── Types ─────────────────────────────────────────────────────────────────

interface Slot {
  date: string;
  time: string;
  rowIndex: number;
}

type GroupedSlots = Record<string, Slot[]>;

// ─── Helpers ───────────────────────────────────────────────────────────────

function groupByDate(slots: Slot[]): GroupedSlots {
  return slots.reduce<GroupedSlots>((acc, slot) => {
    if (!acc[slot.date]) acc[slot.date] = [];
    acc[slot.date].push(slot);
    return acc;
  }, {});
}

function parseDDMMYYYY(dateStr: string): Date | null {
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      return new Date(year, month, day);
    }
  }
  const fallback = new Date(dateStr);
  return isNaN(fallback.getTime()) ? null : fallback;
}

function formatDateHeader(dateStr: string): string {
  const parsed = parseDDMMYYYY(dateStr);
  if (parsed) {
    return parsed.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
  return dateStr;
}

// ─── Loading skeleton ──────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div
      className="shimmer rounded-xl h-[76px]"
      style={{ border: "1px solid var(--border)" }}
      aria-hidden="true"
    />
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-8" aria-label="Loading slots…" role="status">
      {[0, 1].map((g) => (
        <div key={g}>
          <div className="shimmer h-5 w-48 rounded-lg mb-4" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 30_000; // refresh every 30 s

export default function SlotPicker() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchSlots = useCallback(async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/slots", { cache: "no-store" });
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
    const interval = setInterval(() => fetchSlots(false), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchSlots]);

  const grouped = groupByDate(slots);
  const dateKeys = Object.keys(grouped).sort((a, b) => {
    const da = parseDDMMYYYY(a)?.getTime() ?? 0;
    const db = parseDDMMYYYY(b)?.getTime() ?? 0;
    return da - db;
  });

  return (
    <>
      {/* Live indicator + refresh */}
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
          onClick={() => fetchSlots(true)}
          disabled={isLoading}
          className="btn-ghost"
          aria-label="Refresh slot availability"
          id="refresh-slots-btn"
        >
          <RefreshCw
            size={13}
            className={isLoading ? "animate-spin" : ""}
            aria-hidden="true"
          />
          Refresh
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : error ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          role="alert"
          className="rounded-xl p-6 flex flex-col items-center text-center gap-3"
          style={{
            background: "rgba(248,113,113,0.06)",
            border: "1px solid rgba(248,113,113,0.2)",
          }}
        >
          <AlertCircle size={32} style={{ color: "#f87171" }} aria-hidden="true" />
          <p className="font-semibold" style={{ color: "#fca5a5" }}>
            Failed to load slots
          </p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {error}
          </p>
          <button
            onClick={() => fetchSlots(true)}
            className="btn-ghost mt-1"
            id="retry-fetch-btn"
          >
            Try again
          </button>
        </motion.div>
      ) : dateKeys.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl p-10 flex flex-col items-center text-center gap-3"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
        >
          <Inbox size={40} style={{ color: "var(--text-muted)" }} aria-hidden="true" />
          <p className="font-semibold" style={{ color: "var(--text-secondary)" }}>
            No slots available right now
          </p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Check back later — new slots may open up.
          </p>
        </motion.div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="space-y-8">
            {dateKeys.map((date, groupIdx) => (
              <motion.section
                key={date}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ delay: groupIdx * 0.06 }}
                aria-labelledby={`date-header-${date}`}
              >
                {/* Date header */}
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="p-1.5 rounded-lg"
                    style={{ background: "rgba(99,102,241,0.12)" }}
                  >
                    <Calendar
                      size={14}
                      style={{ color: "var(--brand-400)" }}
                      aria-hidden="true"
                    />
                  </div>
                  <h2
                    id={`date-header-${date}`}
                    className="font-semibold text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {formatDateHeader(date)}
                  </h2>
                  <span
                    className="ml-auto text-xs px-2 py-0.5 rounded-full"
                    style={{
                      background: "var(--bg-elevated)",
                      color: "var(--text-muted)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    {grouped[date].length} slot{grouped[date].length !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Slot grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {grouped[date].map((slot, slotIdx) => (
                    <motion.div
                      key={`${slot.date}-${slot.time}`}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: groupIdx * 0.06 + slotIdx * 0.04 }}
                    >
                      <SlotCard
                        time={slot.time}
                        onClick={() => setSelectedSlot(slot)}
                      />
                    </motion.div>
                  ))}
                </div>
              </motion.section>
            ))}
          </div>
        </AnimatePresence>
      )}

      {/* Booking modal */}
      <BookingModal
        slot={selectedSlot}
        onClose={() => setSelectedSlot(null)}
        onBooked={() => {
          // Immediately remove the slot from local state (optimistic update)
          if (selectedSlot) {
            setSlots((prev) =>
              prev.filter(
                (s) =>
                  !(s.date === selectedSlot.date && s.time === selectedSlot.time)
              )
            );
          }
          // Then re-fetch in the background to sync with the sheet
          fetchSlots(false);
        }}
      />
    </>
  );
}
