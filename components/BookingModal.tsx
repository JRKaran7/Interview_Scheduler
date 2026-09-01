"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Calendar, Clock, User, Mail, AlertCircle, Loader2 } from "lucide-react";
import SuccessView from "./SuccessView";

interface Slot {
  date: string;
  time: string;
}

interface BookingModalProps {
  slot: Slot | null;
  onClose: () => void;
  onBooked: () => void; // called to trigger slot list refresh
}

interface FormErrors {
  studentNumber?: string;
  studentEmail?: string;
  global?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function BookingModal({ slot, onClose, onBooked }: BookingModalProps) {
  const [studentNumber, setStudentNumber] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [booked, setBooked] = useState(false);

  // Reset state whenever a new slot is selected
  useEffect(() => {
    setStudentNumber("");
    setStudentEmail("");
    setErrors({});
    setIsSubmitting(false);
    setBooked(false);
  }, [slot]);

  // Close on Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (slot) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [slot, onClose]);

  // ── Validation ──────────────────────────────────────────────────────────────
  function validate(): boolean {
    const newErrors: FormErrors = {};
    if (!studentNumber.trim()) {
      newErrors.studentNumber = "Student number is required.";
    }
    if (!studentEmail.trim()) {
      newErrors.studentEmail = "Email is required.";
    } else if (!EMAIL_REGEX.test(studentEmail.trim())) {
      newErrors.studentEmail = "Please enter a valid email address.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!slot) return;
    if (!validate()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      const res = await fetch("/api/slots/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: slot.date,
          time: slot.time,
          studentNumber: studentNumber.trim(),
          studentEmail: studentEmail.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setBooked(true);
        onBooked(); // refresh the slot list in background
      } else if (res.status === 409) {
        setErrors({
          global:
            "This slot was just taken by someone else. Please close and pick another time.",
        });
      } else if (res.status === 422 && data.errors) {
        setErrors(data.errors);
      } else {
        setErrors({ global: data.message ?? "Something went wrong. Please try again." });
      }
    } catch {
      setErrors({ global: "Network error. Please check your connection and try again." });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      {slot && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40"
            style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            key="panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md glass-strong flex flex-col"
            style={{ borderLeft: "1px solid var(--border-hover)" }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-5"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <div>
                <h2
                  id="modal-title"
                  className="font-bold text-lg"
                  style={{ color: "var(--text-primary)" }}
                >
                  {booked ? "Booking Confirmed" : "Book Interview Slot"}
                </h2>
                {!booked && (
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                    Fill in your details to confirm your spot
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="btn-ghost p-2"
                aria-label="Close booking panel"
                id="modal-close-btn"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {booked ? (
                <SuccessView
                  date={slot.date}
                  time={slot.time}
                  studentEmail={studentEmail}
                  onDone={onClose}
                />
              ) : (
                <>
                  {/* Selected slot summary */}
                  <div
                    className="rounded-xl p-4 mb-6"
                    style={{
                      background: "rgba(99,102,241,0.08)",
                      border: "1px solid rgba(99,102,241,0.2)",
                    }}
                  >
                    <p
                      className="text-xs font-semibold uppercase tracking-wider mb-3"
                      style={{ color: "var(--brand-400)" }}
                    >
                      Selected Slot
                    </p>
                    <div className="flex gap-4">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} style={{ color: "var(--brand-400)" }} aria-hidden="true" />
                        <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                          {slot.date}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock size={14} style={{ color: "var(--accent-400)" }} aria-hidden="true" />
                        <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                          {slot.time}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Global error */}
                  <AnimatePresence>
                    {errors.global && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        role="alert"
                        className="rounded-xl p-4 mb-5 flex gap-3 items-start"
                        style={{
                          background: "rgba(248,113,113,0.08)",
                          border: "1px solid rgba(248,113,113,0.25)",
                        }}
                      >
                        <AlertCircle
                          size={16}
                          className="flex-shrink-0 mt-0.5"
                          style={{ color: "#f87171" }}
                          aria-hidden="true"
                        />
                        <p className="text-sm" style={{ color: "#fca5a5" }}>
                          {errors.global}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Form */}
                  <form onSubmit={handleSubmit} noValidate id="booking-form">
                    {/* Student Number */}
                    <div className="mb-5">
                      <label
                        htmlFor="studentNumber"
                        className="block text-sm font-medium mb-2"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        <span className="flex items-center gap-2">
                          <User size={14} aria-hidden="true" />
                          Student Number
                        </span>
                      </label>
                      <input
                        id="studentNumber"
                        type="text"
                        value={studentNumber}
                        onChange={(e) => {
                          setStudentNumber(e.target.value);
                          if (errors.studentNumber)
                            setErrors((prev) => ({ ...prev, studentNumber: undefined }));
                        }}
                        placeholder="e.g. STU2024001"
                        className={`input-field ${errors.studentNumber ? "error" : ""}`}
                        autoComplete="off"
                        aria-describedby={errors.studentNumber ? "studentNumber-error" : undefined}
                        aria-invalid={!!errors.studentNumber}
                      />
                      <AnimatePresence>
                        {errors.studentNumber && (
                          <motion.p
                            id="studentNumber-error"
                            role="alert"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="text-xs mt-1.5"
                            style={{ color: "#f87171" }}
                          >
                            {errors.studentNumber}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Student Email */}
                    <div className="mb-6">
                      <label
                        htmlFor="studentEmail"
                        className="block text-sm font-medium mb-2"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        <span className="flex items-center gap-2">
                          <Mail size={14} aria-hidden="true" />
                          Student Email
                        </span>
                      </label>
                      <input
                        id="studentEmail"
                        type="email"
                        value={studentEmail}
                        onChange={(e) => {
                          setStudentEmail(e.target.value);
                          if (errors.studentEmail)
                            setErrors((prev) => ({ ...prev, studentEmail: undefined }));
                        }}
                        placeholder="yourname@student.university.ac.za"
                        className={`input-field ${errors.studentEmail ? "error" : ""}`}
                        autoComplete="email"
                        inputMode="email"
                        aria-describedby={
                          errors.studentEmail
                            ? "studentEmail-error"
                            : "studentEmail-hint"
                        }
                        aria-invalid={!!errors.studentEmail}
                      />
                      <AnimatePresence>
                        {errors.studentEmail ? (
                          <motion.p
                            id="studentEmail-error"
                            role="alert"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="text-xs mt-1.5"
                            style={{ color: "#f87171" }}
                          >
                            {errors.studentEmail}
                          </motion.p>
                        ) : (
                          <p
                            id="studentEmail-hint"
                            className="text-xs mt-1.5"
                            style={{ color: "var(--text-muted)" }}
                          >
                            Use your student Outlook email for reminders
                          </p>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="btn-primary w-full"
                      id="booking-submit-btn"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                          Confirming…
                        </>
                      ) : (
                        "Confirm Booking"
                      )}
                    </button>
                  </form>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
