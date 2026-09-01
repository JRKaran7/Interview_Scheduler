"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import SlotCard from "./SlotCard";

interface Slot {
  date: string;
  time: string;
  rowIndex: number;
}

interface CalendarViewProps {
  slots: Slot[];
  onSelectSlot: (slot: Slot) => void;
  disabled?: boolean;
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

export default function CalendarView({
  slots,
  onSelectSlot,
  disabled = false,
}: CalendarViewProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Group slots by date
  const grouped = useMemo(() => {
    return slots.reduce<Record<string, Slot[]>>((acc, slot) => {
      if (!acc[slot.date]) acc[slot.date] = [];
      acc[slot.date].push(slot);
      return acc;
    }, {});
  }, [slots]);

  // Sorted date keys
  const dateKeys = useMemo(() => {
    return Object.keys(grouped).sort((a, b) => {
      const da = parseDDMMYYYY(a)?.getTime() ?? 0;
      const db = parseDDMMYYYY(b)?.getTime() ?? 0;
      return da - db;
    });
  }, [grouped]);

  // Active selected date
  const [selectedDate, setSelectedDate] = useState<string>("");

  const activeDate = selectedDate && dateKeys.includes(selectedDate)
    ? selectedDate
    : dateKeys[0] || "";

  const currentSlots = grouped[activeDate] || [];

  // Scroll left/right helpers for desktop
  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const amount = direction === "left" ? -240 : 240;
      scrollContainerRef.current.scrollBy({ left: amount, behavior: "smooth" });
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Date Selector Tabs / Calendar Ribbon ── */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-indigo-400" />
            <span>Select Interview Date</span>
          </label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 hidden sm:inline">
              {dateKeys.length} dates available
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => scroll("left")}
                className="p-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition text-xs"
                aria-label="Scroll left"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => scroll("right")}
                className="p-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition text-xs"
                aria-label="Scroll right"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Date Pills */}
        <div
          ref={scrollContainerRef}
          className="flex items-center gap-2.5 overflow-x-auto pb-3 pt-1 scrollbar-none snap-x snap-mandatory touch-pan-x"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {dateKeys.map((dateStr) => {
            const isSelected = dateStr === activeDate;
            const parsed = parseDDMMYYYY(dateStr);
            const dayName = parsed
              ? parsed.toLocaleDateString("en-US", { weekday: "short" })
              : "";
            const dayNum = parsed ? parsed.getDate() : dateStr;
            const monthName = parsed
              ? parsed.toLocaleDateString("en-US", { month: "short" })
              : "";

            const slotCount = grouped[dateStr]?.length || 0;

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(dateStr)}
                className={`
                  snap-start relative flex-shrink-0 flex flex-col items-center justify-center p-3 sm:p-3.5 rounded-2xl min-w-[78px] sm:min-w-[88px] border transition-all duration-200 cursor-pointer touch-manipulation
                  ${
                    isSelected
                      ? "bg-gradient-to-b from-indigo-600 to-indigo-700 text-white border-indigo-400/50 shadow-lg shadow-indigo-600/30 scale-[1.02]"
                      : "glass border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/40"
                  }
                `}
              >
                <span className={`text-[10px] sm:text-[11px] font-semibold uppercase ${isSelected ? "text-indigo-200" : "text-slate-400"}`}>
                  {dayName}
                </span>
                <span className="text-base sm:text-lg font-extrabold my-0.5 leading-none">
                  {dayNum}
                </span>
                <span className={`text-[10px] font-medium ${isSelected ? "text-indigo-200" : "text-slate-400"}`}>
                  {monthName}
                </span>

                {/* Slot count badge */}
                <span
                  className={`mt-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                    isSelected
                      ? "bg-white/20 text-white"
                      : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  }`}
                >
                  {slotCount} slots
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Time Slots Panel for Selected Date ── */}
      <AnimatePresence mode="wait">
        {activeDate && (
          <motion.div
            key={activeDate}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 border border-white/10 shadow-2xl"
          >
            {/* Header for selected date */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/80 pb-4 mb-5 sm:mb-6 gap-2">
              <div>
                <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-indigo-400">
                  Available Slots
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-slate-100">
                  {parseDDMMYYYY(activeDate)?.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  }) || activeDate}
                </h3>
              </div>
              <div className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                <Clock className="w-3.5 h-3.5" />
                <span>{currentSlots.length} Open Slots</span>
              </div>
            </div>

            {/* Time Slot Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {currentSlots.map((slot) => (
                <SlotCard
                  key={`${slot.date}-${slot.time}`}
                  date={slot.date}
                  time={slot.time}
                  onSelect={() => onSelectSlot(slot)}
                  disabled={disabled}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
