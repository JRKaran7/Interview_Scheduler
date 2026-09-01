import SlotPicker from "@/components/SlotPicker";
import { Sparkles } from "lucide-react";

export default function HomePage() {
  return (
    <main className="mesh-bg min-h-dvh flex flex-col items-center px-4 py-12 sm:py-16">

      {/* ── Hero Header ──────────────────────────────────────────── */}
      <header className="text-center mb-12 max-w-xl w-full">

        {/* Pill badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6"
          style={{
            background: "rgba(99,102,241,0.12)",
            border: "1px solid rgba(99,102,241,0.25)",
          }}
        >
          <Sparkles size={13} style={{ color: "var(--brand-400)" }} aria-hidden="true" />
          <span className="text-xs font-semibold tracking-wider uppercase"
            style={{ color: "var(--brand-400)" }}>
            Interview Scheduler
          </span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight mb-4">
          <span className="gradient-text">Book Your</span>
          <br />
          <span style={{ color: "var(--text-primary)" }}>Interview Slot</span>
        </h1>

        <p className="text-base leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          Choose an available time slot below. Your booking is confirmed instantly
          and you&apos;ll receive a reminder email the day before.
        </p>
      </header>

      {/* ── Slot Picker Card ──────────────────────────────────────── */}
      <div className="w-full max-w-2xl">
        <div
          className="glass rounded-2xl p-6 sm:p-8"
          style={{ boxShadow: "0 32px 80px rgba(0,0,0,0.4)" }}
        >
          <SlotPicker />
        </div>

        {/* Footer note */}
        <p
          className="text-center text-xs mt-6"
          style={{ color: "var(--text-muted)" }}
        >
          Slots update in real-time · Each slot can only be booked once
        </p>
      </div>

    </main>
  );
}
