"use client";

import { useEffect, useMemo, useState } from "react";
import {
  RotateCcw,
  Download,
  Trophy,
  Sparkles,
  Clock3,
  Target,
  Wand2,
  ChevronRight,
  PencilLine,
} from "lucide-react";
import type { Face, PersonSignals } from "@/types/analysis";
import { cn } from "@/lib/utils";
import { FaceStrip } from "./FaceStrip";
import { ComparisonCard } from "./ComparisonCards";
import { SignalBreakdown } from "./SignalBreakdown";
import { VoiceAnnouncement } from "./VoiceAnnouncement";
import { ExplanationPanel } from "./ExplanationPanel";
import { Navbar } from "@/components/ui/Navbar";
import type { AgentContextResults } from "@/lib/elevenlabsContext";

interface PersonData {
  faceId: string;
  name: string;
  scores: PersonSignals;
  totalScore: number;
  rank: number;
}

interface ResultsViewProps {
  faces: Face[];
  names: Record<string, string>;
  persons: PersonData[];
  explanation: string;
  disclaimer: string;
  processingTime?: number;
  originalImage: string | null;
  onReset: () => void;
  onNameChange: (faceId: string, name: string) => void;
}

export function ResultsView({
  faces,
  names,
  persons,
  explanation,
  disclaimer,
  processingTime,
  originalImage,
  onReset,
  onNameChange,
}: ResultsViewProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [revealStep, setRevealStep] = useState(0);

  // For >2 faces, allow A vs B selection
  const [selectedPair, setSelectedPair] = useState<[string, string]>(() => {
    const sorted = [...persons].sort((a, b) => a.rank - b.rank);
    return [sorted[0]?.faceId ?? "", sorted[1]?.faceId ?? ""];
  });

  const winner = [...persons].sort((a, b) => a.rank - b.rank)[0];
  const runnerUp = [...persons].sort((a, b) => a.rank - b.rank)[1];
  const isTie =
    winner && runnerUp && Math.abs(winner.totalScore - runnerUp.totalScore) < 3;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) {
      setRevealStep(4);
      return;
    }

    setRevealStep(0);
    const timers = [
      setTimeout(() => setRevealStep(1), 120),
      setTimeout(() => setRevealStep(2), 360),
      setTimeout(() => setRevealStep(3), 620),
      setTimeout(() => setRevealStep(4), 900),
    ];
    return () => timers.forEach(clearTimeout);
  }, [persons, explanation, prefersReducedMotion]);

  // Get selected pair for comparison cards
  const comparisonPersons = persons.length <= 2
    ? persons
    : persons.filter((p) => selectedPair.includes(p.faceId));

  const heroSubject = winner ?? persons[0];
  const heroName = heroSubject ? names[heroSubject.faceId] || "Top Subject" : "Top Subject";
  const heroFace = heroSubject ? faces.find((f) => f.id === heroSubject.faceId) : undefined;

  const insightTarget = heroSubject;

  const SIGNAL_META: Record<
    keyof PersonSignals,
    { label: string; strength: string; upgrade: string; quick: string; medium: string; long: string }
  > = {
    spatial_presence: {
      label: "Spatial Presence",
      strength: "Strong framing and occupied space. Keep this camera distance.",
      upgrade: "Expand framing intent: adjust crop to command more of the scene.",
      quick: "Move 8–12% closer to camera while keeping headroom clean.",
      medium: "Use asymmetric composition and anchor your body in a rule-of-thirds lane.",
      long: "Build repeatable shot presets for distance and focal length.",
    },
    posture_dominance: {
      label: "Posture Dominance",
      strength: "Posture reads confident and structured.",
      upgrade: "Add shoulder-back posture cue and stronger stance width.",
      quick: "Roll shoulders back and ground feet before capture.",
      medium: "Practice three dominant poses and rotate by scene type.",
      long: "Develop a pre-shot posture checklist for consistency.",
    },
    facial_intensity: {
      label: "Facial Intensity",
      strength: "Facial expression and gaze create clear intent.",
      upgrade: "Increase eye focus and expression precision for stronger impact.",
      quick: "Relax jaw and lock gaze at lens level for two seconds.",
      medium: "Use mirror reps to tune expression strength without overdoing it.",
      long: "Create a personal expression guide for different moods.",
    },
    attention_capture: {
      label: "Attention Capture",
      strength: "Eye-line and visual pull attract attention quickly.",
      upgrade: "Improve contrast between subject and background for stronger pull.",
      quick: "Turn body 10° and align eye-line to primary light direction.",
      medium: "Simplify background and remove competing visual hotspots.",
      long: "Build a controlled lighting setup emphasizing facial contours.",
    },
  };

  const rankedDimensions = useMemo(() => {
    if (!insightTarget) return [] as Array<{ key: keyof PersonSignals; value: number }>;
    return (Object.entries(insightTarget.scores) as Array<[keyof PersonSignals, number]>)
      .map(([key, value]) => ({ key, value }))
      .sort((a, b) => b.value - a.value);
  }, [insightTarget]);

  const topStrengths = rankedDimensions.slice(0, 3).map(({ key, value }) => {
    const tone = value >= 80 ? "elite" : value >= 65 ? "strong" : "solid";
    return {
      label: SIGNAL_META[key].label,
      text: `${SIGNAL_META[key].strength} (${tone} at ${value}/100)` ,
    };
  });

  const biggestUpgrades = [...rankedDimensions]
    .reverse()
    .slice(0, 3)
    .map(({ key, value }) => ({
      label: SIGNAL_META[key].label,
      text: `${SIGNAL_META[key].upgrade} (${value}/100 today).`,
      key,
    }));

  const recommendationGroups = {
    quick: biggestUpgrades.slice(0, 2).map(({ key }) => SIGNAL_META[key].quick),
    medium: biggestUpgrades.slice(0, 2).map(({ key }) => SIGNAL_META[key].medium),
    long: biggestUpgrades.slice(0, 2).map(({ key }) => SIGNAL_META[key].long),
  };

  const voiceContextResults: AgentContextResults = {
    persons: persons.map((person) => ({
      faceId: person.faceId,
      name: names[person.faceId] || person.name || "Unknown",
      rank: person.rank,
      totalScore: person.totalScore,
      scores: person.scores,
    })),
    winnerFaceId: winner?.faceId || "",
    processingTime,
    explanation,
  };

  const strongestDimension = rankedDimensions[0]?.key;
  const verdict = strongestDimension
    ? `${heroName} leads with ${SIGNAL_META[strongestDimension].label.toLowerCase()} and balanced composure.`
    : "Analysis complete with a clear dominance profile.";

  const surfacePanel =
    "rounded-2xl border border-zinc-800/80 bg-zinc-900/70 backdrop-blur-xl shadow-[0_20px_56px_-28px_rgba(0,0,0,0.9)]";

  // Toggle face selection for comparison
  function toggleSelect(faceId: string) {
    if (persons.length <= 2) return;
    setSelectedPair((prev) => {
      if (prev.includes(faceId)) {
        return prev;
      }
      return [prev[1], faceId];
    });
  }

  return (
    <>
      <Navbar onUploadNew={onReset} />

      <main className="pb-20 min-h-screen bg-zinc-950 relative overflow-hidden">
        <div className="pointer-events-none absolute -top-28 left-1/2 -translate-x-1/2 w-[42rem] h-[42rem] rounded-full bg-blue-600/20 blur-3xl" />
        <div className="pointer-events-none absolute top-44 -left-24 w-[24rem] h-[24rem] rounded-full bg-violet-600/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-10 right-0 w-[20rem] h-[20rem] rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:32px_32px]" />

        <div className="sticky top-14 z-30 border-y border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl">
          <div className="container max-w-5xl py-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-lg overflow-hidden border border-zinc-700 bg-zinc-900 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={originalImage || heroFace?.cropUrl || ""}
                  alt="Result preview"
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-sm font-medium text-zinc-100 truncate">{heroName}</p>
            </div>

            <div className="px-3 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-200 text-xs font-semibold tabular-nums">
              {heroSubject?.totalScore ?? 0}/100
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onReset}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/30"
              >
                <RotateCcw size={12} />
                Analyze another
              </button>
              <button
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 text-zinc-200 text-xs border border-zinc-700 hover:bg-zinc-800 transition-colors"
                title="Coming soon"
              >
                <Download size={12} />
                Download
              </button>

              <button
                onClick={onReset}
                className="sm:hidden inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 text-white shadow-lg shadow-blue-900/30"
                aria-label="Analyze another"
              >
                <RotateCcw size={13} />
              </button>
              <button
                className="sm:hidden inline-flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-200"
                aria-label="Download report"
                title="Coming soon"
              >
                <Download size={13} />
              </button>
            </div>
          </div>
        </div>

        <div className="container relative z-10 max-w-5xl py-10 sm:py-12 space-y-8">
          <section
            className={cn(
              `relative overflow-hidden p-7 sm:p-9 ${surfacePanel}`,
              revealStep >= 1 ? "animate-scale-in" : "opacity-0"
            )}
          >
            <div className="pointer-events-none absolute -top-20 -right-20 h-52 w-52 rounded-full bg-blue-500/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 -left-16 h-44 w-44 rounded-full bg-cyan-500/20 blur-3xl" />

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-200 text-xs font-semibold uppercase tracking-wide">
                  <Sparkles size={11} />
                  {isTie ? "Analysis Complete" : "Top Mog"}
                </div>

                <div>
                  <h2 className="text-zinc-100 text-3xl sm:text-5xl font-semibold tracking-tight leading-tight">
                    {isTie ? "Tie at the top" : heroName}
                  </h2>
                  <p className="mt-3 text-sm sm:text-base text-zinc-300 max-w-2xl leading-relaxed">
                    {verdict}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 text-xs text-zinc-400">
                  {!isTie && runnerUp && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-200 font-medium">
                      <Trophy size={12} />
                      +{(winner!.totalScore - runnerUp.totalScore).toFixed(1)} ahead of {names[runnerUp.faceId] || "runner-up"}
                    </span>
                  )}
                  {processingTime && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-900/80 border border-zinc-700 text-zinc-300 font-medium">
                      <Clock3 size={12} />
                      {(processingTime / 1000).toFixed(1)}s processing
                    </span>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-700/80 bg-zinc-950/70 px-5 py-4 w-full sm:w-auto">
                <p className="text-[11px] uppercase tracking-[0.16em] font-medium text-zinc-400 mb-1">
                  Overall Score
                </p>
                <div className="flex items-end gap-1.5">
                  <AnimatedScore value={heroSubject?.totalScore ?? 0} reducedMotion={prefersReducedMotion} />
                  <span className="text-zinc-500 text-lg mb-1">/100</span>
                </div>
                <p className="text-xs text-zinc-400 mt-1.5">Composite visual dominance score.</p>
              </div>
            </div>
          </section>

          {winner && (
            <section className={cn(revealStep >= 1 ? "animate-fade-in" : "opacity-0")}>
              <VoiceAnnouncement
                winnerName={isTie ? "the tied participants" : names[winner.faceId] || "Winner"}
                winnerScore={winner.totalScore}
                explanation={explanation}
                analysisResults={voiceContextResults}
              />
            </section>
          )}

          <section className={cn(`${surfacePanel} p-5 sm:p-6`, revealStep >= 2 ? "animate-fade-in" : "opacity-0")}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-zinc-400 text-xs font-medium uppercase tracking-widest">
                Compare Faces
              </p>
              <button
                onClick={() => document.getElementById("face-strip")?.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "center" })}
                className="inline-flex items-center gap-1 text-[11px] text-blue-300 hover:text-blue-200 font-medium"
              >
                <PencilLine size={11} />
                Edit names
              </button>
            </div>
            <div id="face-strip">
              <FaceStrip
                faces={faces}
                names={names}
                selectedIds={persons.length > 2 ? selectedPair : faces.map((f) => f.id)}
                onSelect={persons.length > 2 ? toggleSelect : undefined}
                onNameChange={onNameChange}
              />
            </div>
          </section>

          <section className={cn(revealStep >= 2 ? "animate-fade-in" : "opacity-0")}>
            {revealStep < 2 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className={`${surfacePanel} h-64 animate-pulse`} />
                <div className={`${surfacePanel} h-64 animate-pulse`} />
              </div>
            ) : (
              <div
                className={cn(
                  "grid gap-4",
                  comparisonPersons.length === 1
                    ? "grid-cols-1 max-w-md mx-auto"
                    : "grid-cols-1 lg:grid-cols-2"
                )}
              >
                {comparisonPersons
                  .sort((a, b) => a.rank - b.rank)
                  .map((p, i) => {
                    const face = faces.find((f) => f.id === p.faceId);
                    if (!face) return null;
                    return (
                      <ComparisonCard
                        key={p.faceId}
                        face={face}
                        name={names[p.faceId] || `Person ${i + 1}`}
                        scores={p.scores}
                        totalScore={p.totalScore}
                        rank={p.rank}
                        colorIndex={i}
                        isWinner={p.rank === 1 && !isTie}
                        isSelected={persons.length > 2 ? selectedPair.includes(p.faceId) : true}
                        onNameChange={(n) => onNameChange(p.faceId, n)}
                      />
                    );
                  })}
              </div>
            )}
          </section>

          <section className={cn("grid grid-cols-1 xl:grid-cols-[1.3fr_1fr] gap-5", revealStep >= 3 ? "animate-fade-in" : "opacity-0")}>
            <SignalBreakdown
              entries={comparisonPersons
                .sort((a, b) => a.rank - b.rank)
                .map((p) => ({
                  name: names[p.faceId] || "Unknown",
                  scores: p.scores,
                }))}
            />

            <div className="space-y-5">
              <div className={`${surfacePanel} p-6`}>
                <p className="text-xs uppercase tracking-widest text-zinc-400 font-medium mb-3 inline-flex items-center gap-1.5">
                  <Target size={12} className="text-blue-300" />
                  Top 3 Wins
                </p>
                <ul className="space-y-2.5">
                  {topStrengths.map((item) => (
                    <li key={item.label} className="text-sm text-zinc-300 leading-relaxed flex gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0" />
                      <span><strong className="text-zinc-100">{item.label}:</strong> {item.text}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className={`${surfacePanel} p-6`}>
                <p className="text-xs uppercase tracking-widest text-zinc-400 font-medium mb-3 inline-flex items-center gap-1.5">
                  <Wand2 size={12} className="text-violet-300" />
                  Top 3 Fixes
                </p>
                <ul className="space-y-2.5">
                  {biggestUpgrades.map((item) => (
                    <li key={item.label} className="text-sm text-zinc-300 leading-relaxed flex gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-violet-400 shrink-0" />
                      <span><strong className="text-zinc-100">{item.label}:</strong> {item.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <section className={cn("grid grid-cols-1 lg:grid-cols-3 gap-5", revealStep >= 3 ? "animate-fade-in" : "opacity-0")}>
            <RecommendationColumn
              title="Quick wins"
              items={recommendationGroups.quick}
              tone="blue"
            />
            <RecommendationColumn
              title="Medium effort"
              items={recommendationGroups.medium}
              tone="violet"
            />
            <RecommendationColumn
              title="Long-term"
              items={recommendationGroups.long}
              tone="slate"
            />
          </section>

          <section className={cn(revealStep >= 4 ? "animate-fade-in" : "opacity-0")}>
            <ExplanationPanel explanation={explanation} disclaimer={disclaimer} />
          </section>

          <div className={cn("flex flex-wrap items-center justify-between gap-3 pt-2", revealStep >= 4 ? "animate-fade-in" : "opacity-0")}>
            <button
              onClick={onReset}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 active:scale-[0.99] transition-all shadow-lg shadow-blue-900/30"
            >
              <RotateCcw size={14} />
              Analyze another
            </button>

            <div className="flex items-center gap-2">
              <button
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 text-zinc-200 text-sm border border-zinc-700 hover:bg-zinc-800 transition-all"
                title="Coming soon"
              >
                <Download size={14} />
                Download Report
              </button>
              <button
                onClick={() => document.getElementById("face-strip")?.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "center" })}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 text-zinc-200 text-sm border border-zinc-700 hover:bg-zinc-800 transition-all"
              >
                <PencilLine size={14} />
                Edit names
              </button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

function AnimatedScore({ value, reducedMotion }: { value: number; reducedMotion: boolean }) {
  const [displayValue, setDisplayValue] = useState(reducedMotion ? value : 0);

  useEffect(() => {
    if (reducedMotion) {
      setDisplayValue(value);
      return;
    }

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
    <span className="text-5xl sm:text-6xl font-semibold tracking-tight leading-none text-cyan-300 tabular-nums animate-pulse-glow">
      {displayValue}
    </span>
  );
}

function RecommendationColumn({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "blue" | "violet" | "slate";
}) {
  const toneClasses = {
    blue: "bg-blue-500/10 border-blue-500/30 text-blue-200",
    violet: "bg-violet-500/10 border-violet-500/30 text-violet-200",
    slate: "bg-zinc-800/90 border-zinc-700 text-zinc-200",
  };

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/70 backdrop-blur-xl shadow-[0_20px_56px_-28px_rgba(0,0,0,0.9)] p-6">
      <p className={cn("inline-flex px-2.5 py-1 rounded-full border text-xs font-medium uppercase tracking-wide mb-3", toneClasses[tone])}>
        {title}
      </p>
      <ul className="space-y-2.5">
        {items.map((item) => (
          <li key={item} className="text-sm text-zinc-300 leading-relaxed flex gap-2">
            <ChevronRight size={14} className="mt-0.5 text-zinc-500 shrink-0" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
