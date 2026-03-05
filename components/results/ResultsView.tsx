"use client";

import { useEffect, useState } from "react";
import { RotateCcw, Trophy, Sparkles, Clock3 } from "lucide-react";
import type { Face, PersonSignals } from "@/types/analysis";
import { cn } from "@/lib/utils";
import { ComparisonCard } from "./ComparisonCards";
import { SignalBreakdown } from "./SignalBreakdown";
import { ExplanationPanel } from "./ExplanationPanel";
import { Navbar } from "@/components/ui/Navbar";
import { BackgroundVisuals } from "@/components/ui/BackgroundVisuals";

interface PersonData {
  faceId: string;
  name: string;
  scores: PersonSignals;
  totalScore: number;
  rank: number;
}

interface ResultsViewProps {
  faces: Face[];
  persons: PersonData[];
  explanation: string;
  disclaimer: string;
  processingTime?: number;
  originalImage: string | null;
  onReset: () => void;
}

export function ResultsView({
  persons,
  explanation,
  disclaimer,
  processingTime,
  originalImage,
  onReset,
}: ResultsViewProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [revealStep, setRevealStep] = useState(0);

  const sorted = [...persons].sort((a, b) => a.rank - b.rank);
  const winner = sorted[0];
  const runnerUp = sorted[1];
  const isTie = winner && runnerUp && Math.abs(winner.totalScore - runnerUp.totalScore) < 3;

  const heroName = winner?.name ?? "Top Subject";

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) { setRevealStep(3); return; }
    setRevealStep(0);
    const timers = [
      setTimeout(() => setRevealStep(1), 120),
      setTimeout(() => setRevealStep(2), 360),
      setTimeout(() => setRevealStep(3), 620),
    ];
    return () => timers.forEach(clearTimeout);
  }, [persons, explanation, prefersReducedMotion]);

  const surfacePanel =
    "rounded-2xl border border-stone-800/80 bg-stone-900/70 backdrop-blur-xl shadow-[0_20px_56px_-28px_rgba(0,0,0,0.9)]";

  return (
    <>
      <Navbar onUploadNew={onReset} />

      <main className="pb-20 min-h-screen bg-stone-950 relative overflow-hidden">
        <BackgroundVisuals />

        {/* Sticky mini-header */}
        <div className="sticky top-14 z-30 border-y border-stone-800/80 bg-stone-950/80 backdrop-blur-xl">
          <div className="container max-w-5xl py-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              {originalImage && (
                <div className="w-9 h-9 rounded-lg overflow-hidden border border-stone-700 bg-stone-900 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={originalImage} alt="Result preview" className="w-full h-full object-cover" />
                </div>
              )}
              <p className="text-sm font-medium text-stone-100 truncate">{heroName}</p>
            </div>

            <div className="px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-200 text-xs font-semibold tabular-nums">
              {winner?.totalScore ?? 0}/100
            </div>

            <button
              onClick={onReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 text-stone-50 text-xs font-medium hover:bg-amber-500 transition-colors shadow-lg shadow-amber-900/30"
            >
              <RotateCcw size={12} />
              <span className="hidden sm:inline">New photo</span>
            </button>
          </div>
        </div>

        <div className="container relative z-10 max-w-5xl py-10 sm:py-12 space-y-6">

          {/* Hero */}
          <section className={cn(`relative overflow-hidden p-6 sm:p-8 ${surfacePanel}`, revealStep >= 1 ? "animate-scale-in" : "opacity-0")}>
            <div className="pointer-events-none absolute -top-20 -right-20 h-52 w-52 rounded-full bg-amber-500/20 blur-3xl animate-pulse" />
            <div className="pointer-events-none absolute -bottom-16 -left-16 h-44 w-44 rounded-full bg-rose-500/20 blur-3xl animate-pulse" />

            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs font-semibold uppercase tracking-wide">
                  <Sparkles size={11} />
                  {isTie ? "Analysis Complete" : "Frame Leader"}
                </div>

                <h2 className="text-stone-100 text-3xl sm:text-4xl font-semibold tracking-tight">
                  {isTie ? "Tie at the top" : heroName}
                </h2>

                <div className="flex flex-wrap items-center gap-2">
                  {!isTie && runnerUp && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs font-medium">
                      <Trophy size={11} />
                      +{(winner!.totalScore - runnerUp.totalScore).toFixed(1)} ahead of {runnerUp.name}
                    </span>
                  )}
                  {processingTime && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-900/80 border border-stone-700 text-stone-400 text-xs">
                      <Clock3 size={11} />
                      {(processingTime / 1000).toFixed(1)}s
                    </span>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-stone-700/80 bg-stone-950/70 px-5 py-3 shrink-0">
                <p className="text-[10px] uppercase tracking-[0.16em] font-medium text-stone-500 mb-0.5">Overall Score</p>
                <div className="flex items-baseline gap-1">
                  <AnimatedScore value={winner?.totalScore ?? 0} reducedMotion={prefersReducedMotion} />
                  <span className="text-stone-500 text-base">/100</span>
                </div>
              </div>
            </div>
          </section>

          {/* Person cards — horizontal scroll row */}
          <section className={cn(revealStep >= 2 ? "animate-fade-in" : "opacity-0")}>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory">
              {sorted.map((p, i) => (
                <div key={p.faceId} className="snap-start">
                  <ComparisonCard
                    name={p.name}
                    scores={p.scores}
                    totalScore={p.totalScore}
                    rank={p.rank}
                    colorIndex={i}
                    isWinner={p.rank === 1 && !isTie}
                    isSelected={true}
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Signal Profile + Analysis side by side */}
          <section className={cn("grid grid-cols-1 lg:grid-cols-2 gap-5", revealStep >= 3 ? "animate-fade-in" : "opacity-0")}>
            <SignalBreakdown
              entries={sorted.map((p) => ({ name: p.name, scores: p.scores }))}
            />
            <ExplanationPanel explanation={explanation} disclaimer={disclaimer} />
          </section>

          {/* Footer CTA */}
          <div className={cn("flex items-center justify-center pt-2", revealStep >= 3 ? "animate-fade-in" : "opacity-0")}>
            <button
              onClick={onReset}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-stone-800 border border-stone-700 text-stone-300 text-sm hover:bg-stone-700 hover:text-stone-100 transition-all"
            >
              <RotateCcw size={13} />
              Analyze another frame
            </button>
          </div>
        </div>
      </main>
    </>
  );
}

function AnimatedScore({ value, reducedMotion }: { value: number; reducedMotion: boolean }) {
  const [displayValue, setDisplayValue] = useState(reducedMotion ? value : 0);

  useEffect(() => {
    if (reducedMotion) { setDisplayValue(value); return; }

    let frame = 0;
    const start = performance.now();
    const duration = 900;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(value * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, reducedMotion]);

  return (
    <span className="text-4xl sm:text-5xl font-semibold tracking-tight leading-none text-amber-500 tabular-nums">
      {displayValue}
    </span>
  );
}
