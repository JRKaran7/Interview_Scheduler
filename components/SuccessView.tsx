"use client";

import { motion } from "framer-motion";
import { CheckCircle, Calendar, Clock, ArrowRight } from "lucide-react";

interface SuccessViewProps {
  date: string;
  time: string;
  studentEmail: string;
  onDone: () => void;
}

export default function SuccessView({
  date,
  time,
  studentEmail,
  onDone,
}: SuccessViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className="flex flex-col items-center text-center py-4"
    >
      {/* Animated check icon */}
      <motion.div
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 20, delay: 0.1 }}
        className="relative mb-6"
        aria-hidden="true"
      >
        {/* Glow ring */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.25 }}
          className="absolute inset-0 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(16,185,129,0.3) 0%, transparent 70%)",
            width: "88px",
            height: "88px",
            top: "-8px",
            left: "-8px",
          }}
        />
        <CheckCircle
          size={72}
          strokeWidth={1.5}
          style={{ color: "var(--accent-400)" }}
        />
      </motion.div>

      {/* Headline */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2
          className="text-2xl font-bold mb-2"
          style={{ color: "var(--text-primary)" }}
        >
          You&apos;re booked! 🎉
        </h2>
        <p
          className="text-sm leading-relaxed mb-6"
          style={{ color: "var(--text-secondary)" }}
        >
          Your interview slot has been confirmed. A reminder will be sent to
          <br />
          <span className="font-medium" style={{ color: "var(--brand-300)" }}>
            {studentEmail}
          </span>{" "}
          the day before.
        </p>
      </motion.div>

      {/* Booking detail card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="w-full rounded-xl p-5 mb-6"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className="p-2 rounded-lg"
            style={{ background: "rgba(99,102,241,0.12)" }}
          >
            <Calendar size={16} style={{ color: "var(--brand-400)" }} aria-hidden="true" />
          </div>
          <div className="text-left">
            <p className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "var(--text-muted)" }}>Date</p>
            <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
              {date}
            </p>
          </div>
        </div>

        <div
          className="my-3"
          style={{ height: "1px", background: "var(--border)" }}
          role="separator"
        />

        <div className="flex items-center gap-3">
          <div
            className="p-2 rounded-lg"
            style={{ background: "rgba(16,185,129,0.12)" }}
          >
            <Clock size={16} style={{ color: "var(--accent-400)" }} aria-hidden="true" />
          </div>
          <div className="text-left">
            <p className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "var(--text-muted)" }}>Time</p>
            <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
              {time}
            </p>
          </div>
        </div>
      </motion.div>

      {/* CTA */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.45 }}
        onClick={onDone}
        className="btn-primary w-full"
        id="success-done-btn"
      >
        Done
        <ArrowRight size={16} aria-hidden="true" />
      </motion.button>
    </motion.div>
  );
}
