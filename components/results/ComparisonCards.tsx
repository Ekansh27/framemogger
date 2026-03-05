"use client";

import { useState, useEffect } from "react";
import type { PersonSignals } from "@/types/analysis";
import { cn } from "@/lib/utils";
import { Crown } from "lucide-react";

const SIGNALS: { key: keyof PersonSignals; label: string }[] = [
  { key: "spatial_presence", label: "Spatial" },
  { key: "posture_dominance", label: "Posture" },
  { key: "facial_intensity", label: "Facial" },
  { key: "attention_capture", label: "Attention" },
];

interface ComparisonCardProps {
  name: string;
  scores: PersonSignals;
  totalScore: number;
  rank: number;
  colorIndex: number;
  isWinner: boolean;
  isSelected?: boolean;
}

export function ComparisonCard({
  name,
  scores,
  totalScore,
  rank,
  colorIndex,
  isWinner,
}: ComparisonCardProps) {
  const [ready, setReady] = useState(false);
  const colors = DARK_PERSON_COLORS[colorIndex % DARK_PERSON_COLORS.length];

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 80 + colorIndex * 60);
    return () => clearTimeout(t);
  }, [colorIndex]);

  return (
    <div
      className={cn(
        "relative flex-shrink-0 w-48 rounded-xl border border-stone-800/80 bg-stone-900/70 backdrop-blur-xl shadow-[0_12px_32px_-16px_rgba(0,0,0,0.8)] transition-all duration-400",
        isWinner && "border-amber-500/50 ring-1 ring-amber-500/30",
        ready ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
      )}
      style={{ transitionDelay: `${colorIndex * 80}ms` }}
    >
      <div className="absolute inset-0 pointer-events-none rounded-xl bg-gradient-to-br from-amber-500/8 via-transparent to-transparent" />

      <div className="relative z-10 p-4 space-y-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-stone-100 text-sm font-semibold truncate leading-tight">{name}</p>
            <span
              className={cn(
                "inline-block mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border",
                isWinner
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                  : "bg-stone-800 border-stone-700 text-stone-400"
              )}
            >
              {toOrdinal(rank)}
            </span>
          </div>
          {isWinner && <Crown size={13} className="text-amber-400 shrink-0 mt-0.5" />}
        </div>

        {/* Score */}
        <div className="flex items-baseline gap-1">
          <span className={cn("text-3xl font-semibold tabular-nums tracking-tight", isWinner ? "text-amber-300" : colors.text)}>
            {totalScore}
          </span>
          <span className="text-stone-600 text-xs">/100</span>
        </div>

        {/* Signal bars */}
        <div className="space-y-2">
          {SIGNALS.map((s) => {
            const val = scores[s.key];
            return (
              <div key={s.key}>
                <div className="flex justify-between mb-0.5">
                  <span className="text-stone-500 text-[10px] uppercase tracking-wide">{s.label}</span>
                  <span className={cn("text-[10px] font-medium tabular-nums", isWinner ? "text-amber-300" : colors.text)}>{val}</span>
                </div>
                <div className="h-1.5 bg-stone-800 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-600 ease-out", isWinner ? "bg-amber-500" : colors.bar)}
                    style={{ width: ready ? `${val}%` : "0%", transitionDelay: `${colorIndex * 80 + 160}ms` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const DARK_PERSON_COLORS = [
  { bar: "bg-amber-500",  text: "text-amber-200",  border: "border-amber-400/70",  bg: "bg-amber-500/10"  },
  { bar: "bg-rose-500",   text: "text-rose-200",   border: "border-rose-400/70",   bg: "bg-rose-500/10"   },
  { bar: "bg-orange-500", text: "text-orange-200", border: "border-orange-400/70", bg: "bg-orange-500/10" },
  { bar: "bg-red-500",    text: "text-red-200",    border: "border-red-400/70",    bg: "bg-red-500/10"    },
  { bar: "bg-yellow-500", text: "text-yellow-200", border: "border-yellow-400/70", bg: "bg-yellow-500/10" },
  { bar: "bg-amber-600",  text: "text-amber-300",  border: "border-amber-500/70",  bg: "bg-amber-600/10"  },
] as const;

function toOrdinal(rank: number): string {
  if (rank % 10 === 1 && rank % 100 !== 11) return `${rank}st`;
  if (rank % 10 === 2 && rank % 100 !== 12) return `${rank}nd`;
  if (rank % 10 === 3 && rank % 100 !== 13) return `${rank}rd`;
  return `${rank}th`;
}
