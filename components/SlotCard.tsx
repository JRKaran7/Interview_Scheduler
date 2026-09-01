"use client";

import { motion } from "framer-motion";
import { Clock } from "lucide-react";

interface SlotCardProps {
  date?: string;
  time: string;
  onClick?: () => void;
  onSelect?: () => void;
  disabled?: boolean;
}

export default function SlotCard({ time, onClick, onSelect, disabled = false }: SlotCardProps) {
  const handleClick = onSelect || onClick || (() => {});
  return (
    <motion.button
      id={`slot-${time.replace(/[\s:]/g, "-")}`}
      onClick={handleClick}
      disabled={disabled}
      whileHover={disabled ? {} : { y: -3, scale: 1.02 }}
      whileTap={disabled ? {} : { scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={`
        relative w-full text-left rounded-xl p-4 border transition-all duration-200
        focus-visible:outline-none
        ${
          disabled
            ? "bg-[var(--bg-surface)] border-[var(--border)] opacity-40 cursor-not-allowed"
            : "glass slot-glow border-[var(--border)] cursor-pointer hover:border-[var(--brand-500)/50]"
        }
      `}
      aria-label={`Book slot at ${time}${disabled ? " (unavailable)" : ""}`}
    >
      {/* Available pulse indicator */}
      {!disabled && (
        <span className="absolute top-3 right-3 flex items-center gap-1.5">
          <span className="pulse-dot" aria-hidden="true" />
          <span
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--accent-400)" }}
          >
            Open
          </span>
        </span>
      )}

      <div className="flex items-center gap-3 pr-16">
        <div
          className={`flex-shrink-0 p-2 rounded-lg ${
            disabled
              ? "bg-[var(--bg-elevated)]"
              : "bg-[rgba(99,102,241,0.12)]"
          }`}
        >
          <Clock
            size={16}
            className={disabled ? "text-[var(--text-muted)]" : "text-[var(--brand-400)]"}
            aria-hidden="true"
          />
        </div>
        <div>
          <p
            className={`font-semibold text-base leading-tight ${
              disabled ? "text-[var(--text-muted)]" : "text-[var(--text-primary)]"
            }`}
          >
            {time}
          </p>
          <p
            className="text-xs mt-0.5"
            style={{ color: disabled ? "var(--text-muted)" : "var(--text-secondary)" }}
          >
            {disabled ? "Unavailable" : "Click to book"}
          </p>
        </div>
      </div>
    </motion.button>
  );
}
