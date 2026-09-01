import SlotPicker from "@/components/SlotPicker";
import { Sparkles } from "lucide-react";

export default function HomePage() {
  return (
    <main className="mesh-bg min-h-dvh flex flex-col items-center px-3 sm:px-6 lg:px-8 py-6 sm:py-10 md:py-14">

      {/* ── Hero Header ──────────────────────────────────────────── */}
      <header className="text-center mb-6 sm:mb-10 max-w-2xl w-full">

        {/* Pill badge */}
        <div
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4 sm:mb-6"
          style={{
            background: "rgba(99,102,241,0.12)",
            border: "1px solid rgba(99,102,241,0.25)",
          }}
        >
          <Sparkles size={13} style={{ color: "var(--brand-400)" }} aria-hidden="true" />
          <span
            className="text-[11px] sm:text-xs font-semibold tracking-wider uppercase"
            style={{ color: "var(--brand-400)" }}
          >
            Interview Scheduler
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight mb-3 sm:mb-4 tracking-tight">
          <span className="gradient-text">Book Your</span>{" "}
          <span style={{ color: "var(--text-primary)" }}>Interview Slot</span>
        </h1>

        <p className="text-xs sm:text-sm md:text-base leading-relaxed px-2 text-slate-400">
          Pick an available date and time slot below. Bookings are saved in real-time
          and an instant confirmation email will be sent to your student email.
        </p>
      </header>

      {/* ── Slot Picker Container ──────────────────────────────────── */}
      <div className="w-full max-w-4xl">
        <div
          className="glass rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8"
          style={{ boxShadow: "0 32px 80px rgba(0,0,0,0.4)" }}
        >
          <SlotPicker />
        </div>

        {/* Footer note */}
        <p
          className="text-center text-[11px] sm:text-xs mt-6 text-slate-500 px-2"
        >
          Real-time availability &bull; 1 Slot per student &bull; Instant email confirmation
        </p>
      </div>

    </main>
  );
}
