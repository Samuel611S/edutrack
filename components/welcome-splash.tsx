"use client"

import { GraduationCap } from "lucide-react"

type SplashPhase = "splash" | "exit"

export function WelcomeSplash({ phase }: { phase: SplashPhase }) {
  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden transition-all duration-500 ease-out ${
        phase === "exit" ? "opacity-0 pointer-events-none scale-105" : "opacity-100 scale-100"
      }`}
      aria-hidden={phase === "exit"}
    >
      {/* Deep academic backdrop */}
      <div className="absolute inset-0 bg-[#0c1222]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(59,130,246,0.35),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_100%_100%,rgba(147,51,234,0.2),transparent_45%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_0%_80%,rgba(16,185,129,0.12),transparent_40%)]" />

      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
      />

      {/* Floating orbs */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-blue-500/20 blur-[80px] edu-float-slow" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-violet-500/15 blur-[90px] edu-float-slow-reverse" />

      <div className="relative z-10 flex flex-col items-center px-6 text-center max-w-lg">
        <div
          className={`mb-8 flex h-20 w-20 items-center justify-center rounded-2xl border border-white/10 bg-white/5 shadow-[0_0_40px_-10px_rgba(59,130,246,0.5)] backdrop-blur-sm edu-logo-pulse ${phase === "splash" ? "animate-[eduScaleIn_0.9s_cubic-bezier(0.22,1,0.36,1)_both]" : ""}`}
        >
          <GraduationCap className="h-10 w-10 text-sky-300" strokeWidth={1.5} />
        </div>

        <p className="font-libre text-sm font-normal tracking-[0.25em] uppercase text-slate-400 opacity-0 animate-[eduFadeUp_0.7s_ease-out_0.15s_both]">
          EduTrack+
        </p>
        <h1 className="mt-3 font-libre text-3xl font-bold tracking-tight text-white sm:text-4xl opacity-0 animate-[eduFadeUp_0.75s_ease-out_0.35s_both]">
          Welcome to your campus dashboard
        </h1>
        <p className="mt-4 text-base text-slate-400 edu-reveal-delay-3 opacity-0 animate-[eduFadeUp_0.75s_ease-out_0.55s_both]">
          EduTrack+ — attendance, grades, and campus tools in one place.
        </p>

        <div className="mt-12 flex items-center gap-2 opacity-0 animate-[eduFadeUp_0.6s_ease-out_0.85s_both]">
          <span className="h-1.5 w-1.5 rounded-full bg-sky-400 edu-dot-pulse" style={{ animationDelay: "0ms" }} />
          <span className="h-1.5 w-1.5 rounded-full bg-sky-400 edu-dot-pulse" style={{ animationDelay: "150ms" }} />
          <span className="h-1.5 w-1.5 rounded-full bg-sky-400 edu-dot-pulse" style={{ animationDelay: "300ms" }} />
        </div>
        <p className="mt-6 text-xs text-slate-500 opacity-0 animate-[eduFadeUp_0.5s_ease-out_1s_both]">
          Preparing your session…
        </p>
      </div>
    </div>
  )
}
