"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X, Loader2 } from "lucide-react";
import { BookedSlot } from "@/lib/googleSheets";

interface CancelConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: BookedSlot;
  onConfirmCancel: () => Promise<void>;
}

export default function CancelConfirmModal({
  isOpen,
  onClose,
  booking,
  onConfirmCancel,
}: CancelConfirmModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleCancel = async () => {
    setIsSubmitting(true);
    setError("");
    try {
      await onConfirmCancel();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel booking.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-md glass-card rounded-2xl border border-white/10 p-6 shadow-2xl z-10 text-slate-100"
          >
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-200 transition p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 text-rose-400 mb-4">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-100">
                Cancel Interview Booking?
              </h3>
            </div>

            <p className="text-sm text-slate-300 mb-4 leading-relaxed">
              Are you sure you want to cancel your interview reservation for{" "}
              <strong className="text-white">{booking.date}</strong> at{" "}
              <strong className="text-white">{booking.time}</strong>?
            </p>

            <p className="text-xs text-slate-400 mb-6 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              Once cancelled, this slot will instantly become available for other students to book.
            </p>

            {error && (
              <div className="mb-4 text-xs text-rose-400 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
                {error}
              </div>
            )}

            <div className="flex items-center gap-3 justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-xl transition"
              >
                Keep Booking
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl transition flex items-center gap-2 shadow-lg shadow-rose-600/30 active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Cancelling…</span>
                  </>
                ) : (
                  <span>Yes, Cancel Interview</span>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
