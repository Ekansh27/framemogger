"use client";

import { useState, useEffect } from "react";
import type { Face, PersonSignals } from "@/types/analysis";
import { cn } from "@/lib/utils";
import { Sparkles, Crown } from "lucide-react";
import { EditNameButton } from "@/components/steps/FaceLabelStep";

const SIGNALS: { key: keyof PersonSignals; label: string }[] = [
  { key: "spatial_presence", label: "Spatial" },
  { key: "posture_dominance", label: "Posture" },
  { key: "facial_intensity", label: "Facial" },
  { key: "attention_capture", label: "Attention" },
];

interface ComparisonCardProps {
  face: Face;
  name: string;
  scores: PersonSignals;
  totalScore: number;
  rank: number;
  colorIndex: number;
  isWinner: boolean;
  isSelected?: boolean;
  onNameChange?: (name: string) => void;
}

export function ComparisonCard({
  face,
  name,
  scores,
  totalScore,
  rank,
  colorIndex,
  isWinner,
  isSelected = true,
  onNameChange,
}: ComparisonCardProps) {
  const [ready, setReady] = useState(false);
  const colors = DARK_PERSON_COLORS[colorIndex % DARK_PERSON_COLORS.length];

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 120 + colorIndex * 80);
    return () => clearTimeout(t);
  }, [colorIndex]);

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/70 backdrop-blur-xl shadow-[0_20px_56px_-28px_rgba(0,0,0,0.9)] transition-all duration-500 hover:-translate-y-0.5 hover:shadow-[0_26px_56px_-28px_rgba(0,0,0,0.95)]",
        isWinner && "border-blue-500/50",
        isSelected ? "ring-1 ring-blue-500/40" : "opacity-95",
        ready ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      )}
      style={{
        transitionDelay: `${colorIndex * 100}ms`,
      }}
    >
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-blue-500/12 via-transparent to-transparent" />

      {/* Winner badge */}
      {isWinner && (
        <div className="absolute top-3 right-3 z-10">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-200 text-[10px] font-semibold uppercase tracking-wider">
            <Crown size={9} />
            Top Mog
          </span>
        </div>
      )}

      {/* Top section: face + name + score */}
      <div className="relative z-10 p-6 pb-4">
        <div className="flex items-start gap-4">
          {/* Face crop */}
          <div className="relative flex-shrink-0">
            <div
              className={cn(
                "w-24 h-24 rounded-2xl overflow-hidden border-2 transition-all duration-300 shadow-[0_10px_30px_-18px_rgba(37,99,235,0.7)] group-hover:shadow-[0_12px_30px_-16px_rgba(37,99,235,0.85)]",
                isWinner ? "border-blue-400/80" : `${colors.border}`,
                isSelected ? "ring-4 ring-blue-500/20" : "ring-0"
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={face.cropUrl}
                alt={name}
                className="w-full h-full object-cover scale-[1.02]"
              />
            </div>
            {/* Rank badge */}
            <div
              className={cn(
                "absolute -bottom-2 -right-2 min-w-9 h-8 px-2 rounded-full flex items-center justify-center text-[11px] font-semibold shadow-sm border border-zinc-900",
                isWinner ? "bg-blue-600 text-white" : `${colors.bg} ${colors.text} ${colors.border}`
              )}
            >
              {toOrdinal(rank)}
            </div>
          </div>

          {/* Name + score */}
          <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-center gap-1.5 mb-1.5">
              <h4 className="text-zinc-100 text-lg font-semibold truncate">{name}</h4>
              {onNameChange && (
                <EditNameButton name={name} onSave={onNameChange} />
              )}
            </div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500 mb-1">Overall Score</p>
            <div className="flex items-baseline gap-1.5">
              <span
                className={cn(
                  "text-4xl font-semibold tabular-nums tracking-tight",
                  isWinner ? "text-blue-300" : colors.text
                )}
              >
                {totalScore}
              </span>
              <span className="text-zinc-500 text-base">/100</span>
            </div>
            <p className="mt-1 text-xs text-zinc-500">Visual dominance composite</p>
          </div>
        </div>
      </div>

      {/* Signal bars */}
      <div className="relative z-10 px-6 pb-6 space-y-3.5">
        {SIGNALS.map((s) => {
          const val = scores[s.key];
          return (
            <div key={s.key}>
              <div className="flex justify-between mb-1">
                <span className="text-zinc-500 text-xs uppercase tracking-wide">{s.label}</span>
                <span
                  className={cn(
                    "text-xs font-medium tabular-nums",
                    isWinner ? "text-blue-300" : colors.text
                  )}
                >
                  {val}
                </span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700/80">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-700 ease-out",
                    isWinner ? "bg-blue-500" : colors.bar
                  )}
                  style={{
                    width: ready ? `${val}%` : "0%",
                    transitionDelay: `${colorIndex * 100 + 200}ms`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const DARK_PERSON_COLORS = [
  { bar: "bg-blue-500", text: "text-blue-200", border: "border-blue-400/70", bg: "bg-blue-500/10" },
  { bar: "bg-slate-400", text: "text-slate-200", border: "border-slate-400/70", bg: "bg-slate-500/10" },
  { bar: "bg-emerald-500", text: "text-emerald-200", border: "border-emerald-400/70", bg: "bg-emerald-500/10" },
  { bar: "bg-orange-500", text: "text-orange-200", border: "border-orange-400/70", bg: "bg-orange-500/10" },
  { bar: "bg-indigo-500", text: "text-indigo-200", border: "border-indigo-400/70", bg: "bg-indigo-500/10" },
  { bar: "bg-rose-500", text: "text-rose-200", border: "border-rose-400/70", bg: "bg-rose-500/10" },
] as const;

function toOrdinal(rank: number): string {
  if (rank % 10 === 1 && rank % 100 !== 11) return `${rank}st`;
  if (rank % 10 === 2 && rank % 100 !== 12) return `${rank}nd`;
  if (rank % 10 === 3 && rank % 100 !== 13) return `${rank}rd`;
  return `${rank}th`;
}
