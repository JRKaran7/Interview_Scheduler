"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { User, ArrowRight, ShieldCheck, CalendarCheck, Sparkles } from "lucide-react";

interface LoginHeroProps {
  onLogin: (studentId: string) => void;
}

export default function LoginHero({ onLogin }: LoginHeroProps) {
  const [studentId, setStudentId] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (studentId.trim()) {
      onLogin(studentId.trim());
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-xl mx-auto"
    >
      <div className="glass-card rounded-3xl p-8 sm:p-10 border border-white/10 shadow-2xl relative overflow-hidden text-center">
        {/* Glow decoration */}
        <div className="absolute -right-20 -top-20 w-56 h-56 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-56 h-56 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-6">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Student Portal</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight mb-3">
          Book Your Interview Slot
        </h2>
        <p className="text-sm text-slate-400 max-w-md mx-auto mb-8 leading-relaxed">
          Please enter your Student ID to check live availability, manage your booking, or reserve an interview slot.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto">
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Enter Student ID (e.g. STU1001)"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-slate-900/80 border border-slate-700/70 rounded-2xl text-base text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition shadow-inner"
              required
              autoFocus
            />
          </div>

          <button
            type="submit"
            className="w-full py-3.5 px-6 bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-base rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-indigo-500/25 transition active:scale-[0.98]"
          >
            <span>View Available Slots</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>

        {/* Features footer */}
        <div className="grid grid-cols-2 gap-4 mt-8 pt-8 border-t border-slate-800/80 text-left">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-slate-200">1 Slot Per Student</p>
              <p className="text-[11px] text-slate-400">Guarantees fair access for everyone</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <CalendarCheck className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-slate-200">Instant Confirmation</p>
              <p className="text-[11px] text-slate-400">Automated email details & reminders</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
