"use client";

import { Calendar, Clock, Mail, Trash2 } from "lucide-react";
import { BookedSlot } from "@/lib/googleSheets";

interface ActiveBookingBannerProps {
  booking: BookedSlot;
  onCancelClick: () => void;
}

export default function ActiveBookingBanner({
  booking,
  onCancelClick,
}: ActiveBookingBannerProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-slate-900/90 via-emerald-950/20 to-slate-900/90 p-6 shadow-2xl mb-8">
      {/* Background glow accent */}
      <div className="absolute -right-16 -top-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Your Confirmed Interview
          </div>
          <h3 className="text-xl font-bold text-slate-100">
            Interview Slot Reserved
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            You are scheduled for an interview. Only 1 slot per student is allowed.
          </p>

          <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-slate-200">
            <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-xl">
              <Calendar className="w-4 h-4 text-indigo-400" />
              <span className="font-semibold">{booking.date}</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-xl">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold">{booking.time}</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-xl">
              <Mail className="w-4 h-4 text-purple-400" />
              <span>{booking.studentEmail}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onCancelClick}
            className="w-full md:w-auto px-5 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 hover:border-rose-500/50 text-rose-400 hover:text-rose-300 font-semibold text-sm rounded-xl flex items-center justify-center gap-2 transition active:scale-95 shadow-lg shadow-rose-950/20"
          >
            <Trash2 className="w-4 h-4" />
            <span>Cancel Booking</span>
          </button>
        </div>
      </div>
    </div>
  );
}
