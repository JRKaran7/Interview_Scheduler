"use client";

import { useState } from "react";
import { User, LogOut, CheckCircle2, ArrowRight } from "lucide-react";

interface StudentSessionBarProps {
  studentNumber: string;
  onLogin: (id: string) => void;
  onLogout: () => void;
  hasActiveBooking: boolean;
}

export default function StudentSessionBar({
  studentNumber,
  onLogin,
  onLogout,
  hasActiveBooking,
}: StudentSessionBarProps) {
  const [inputVal, setInputVal] = useState("");
  const [isEditing, setIsEditing] = useState(!studentNumber);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputVal.trim()) {
      onLogin(inputVal.trim());
      setIsEditing(false);
    }
  };

  if (!studentNumber || isEditing) {
    return (
      <div className="glass-card p-3.5 sm:p-5 rounded-2xl border border-white/10 mb-6 sm:mb-8 max-w-xl mx-auto shadow-xl">
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 items-center">
          <div className="relative flex-1 w-full">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Enter Student ID (e.g. STU1001)"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-slate-700/60 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 transition active:scale-95 whitespace-nowrap"
          >
            <span>Log In</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
        <p className="text-[11px] sm:text-xs text-slate-400 mt-2 text-center sm:text-left">
          Enter your Student ID to check existing bookings or reserve a slot.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card px-4 sm:px-5 py-3 rounded-2xl border border-white/10 mb-6 sm:mb-8 max-w-xl mx-auto flex items-center justify-between gap-3 shadow-xl flex-wrap sm:flex-nowrap">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-semibold text-xs sm:text-sm flex-shrink-0">
          <User className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">Logged in as</span>
            {hasActiveBooking && (
              <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" /> Booked
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm font-bold text-slate-100 truncate">{studentNumber}</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 ml-auto sm:ml-0">
        <button
          onClick={() => setIsEditing(true)}
          className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg hover:bg-slate-800/60 transition"
        >
          Change
        </button>
        <button
          onClick={onLogout}
          className="text-xs text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl font-medium flex items-center gap-1 transition"
          title="Log out"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Log out</span>
        </button>
      </div>
    </div>
  );
}
