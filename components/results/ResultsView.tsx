"use client";

import { useState } from "react";
import { RotateCcw, Download, Trophy, Sparkles } from "lucide-react";
import type { Face, PersonSignals } from "@/types/analysis";
import { cn, PERSON_COLORS } from "@/lib/utils";
import { FaceStrip } from "./FaceStrip";
import { ComparisonCard } from "./ComparisonCards";
import { SignalBreakdown } from "./SignalBreakdown";
import { VoiceAnnouncement } from "./VoiceAnnouncement";
import { Navbar } from "@/components/ui/Navbar";

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
  // For >2 faces, allow A vs B selection
  const [selectedPair, setSelectedPair] = useState<[string, string]>(() => {
    const sorted = [...persons].sort((a, b) => a.rank - b.rank);
    return [sorted[0]?.faceId ?? "", sorted[1]?.faceId ?? ""];
  });

  const winner = [...persons].sort((a, b) => a.rank - b.rank)[0];
  const runnerUp = [...persons].sort((a, b) => a.rank - b.rank)[1];
  const isTie =
    winner && runnerUp && Math.abs(winner.totalScore - runnerUp.totalScore) < 3;

  // Get selected pair for comparison cards
  const comparisonPersons = persons.length <= 2
    ? persons
    : persons.filter((p) => selectedPair.includes(p.faceId));

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

      <main className="pb-16 min-h-screen">
        <div className="container max-w-3xl py-8 space-y-6">
          {/* ── Winner banner ── */}
          <section className="text-center pt-4 pb-2 animate-scale-in">
            <p className="text-gray-400 text-xs font-medium uppercase tracking-widest mb-4">
              {isTie ? "Analysis Complete" : "Dominates the Frame"}
            </p>

            {!isTie && winner && (
              <>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Trophy size={20} className="text-blue-600" />
                  <h2 className="text-gray-900 text-4xl sm:text-5xl font-bold tracking-tight">
                    {names[winner.faceId] || "Winner"}
                  </h2>
                </div>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-4xl font-bold text-blue-600 tabular-nums">
                    {winner.totalScore}
                  </span>
                  <span className="text-gray-400 text-lg">/100</span>
                </div>
                {runnerUp && (
                  <div className="mt-3">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-medium">
                      <Sparkles size={10} />
                      +{(winner.totalScore - runnerUp.totalScore).toFixed(1)} ahead of {names[runnerUp.faceId] || "Runner-up"}
                    </span>
                  </div>
                )}
              </>
            )}

            {isTie && (
              <>
                <h2 className="text-gray-900 text-4xl sm:text-5xl font-bold tracking-tight mb-2">
                  Tied
                </h2>
                <p className="text-gray-500 text-sm mt-2">
                  Both subjects command equal visual presence
                </p>
              </>
            )}
          </section>

          {/* ── Voice Announcement ── */}
          {winner && (
            <section className="animate-fade-in" style={{ animationDelay: '0.5s' }}>
              <VoiceAnnouncement 
                winnerName={isTie ? "the tied participants" : names[winner.faceId] || "Winner"}
                winnerScore={winner.totalScore}
                explanation={explanation}
              />
            </section>
          )}

          {/* ── Face strip ── */}
          <section className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-gray-500 text-xs font-medium uppercase tracking-widest">
                Detected Faces
              </p>
              {persons.length > 2 && (
                <p className="text-gray-400 text-[10px]">
                  Tap to compare any two
                </p>
              )}
            </div>
            <FaceStrip
              faces={faces}
              names={names}
              selectedIds={persons.length > 2 ? selectedPair : faces.map((f) => f.id)}
              onSelect={persons.length > 2 ? toggleSelect : undefined}
              onNameChange={onNameChange}
            />
          </section>

          {/* ── Comparison cards ── */}
          <section>
            <div
              className={cn(
                "grid gap-4",
                comparisonPersons.length === 1
                  ? "grid-cols-1 max-w-sm mx-auto"
                  : "grid-cols-1 sm:grid-cols-2"
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
                      onNameChange={(n) => onNameChange(p.faceId, n)}
                    />
                  );
                })}
            </div>
          </section>

          {/* ── Radar / Signal breakdown ── */}
          <SignalBreakdown
            entries={comparisonPersons
              .sort((a, b) => a.rank - b.rank)
              .map((p) => ({
                name: names[p.faceId] || "Unknown",
                scores: p.scores,
              }))}
          />

          {/* ── Explanation ── */}
          {explanation && (
            <div className="card p-5 space-y-4">
              <div>
                <p className="text-gray-400 text-xs font-medium uppercase tracking-widest mb-2">
                  Analysis
                </p>
                <p className="text-gray-700 text-sm leading-relaxed">
                  {explanation}
                </p>
              </div>
              <div className="border-t border-gray-100 pt-4">
                <p className="text-gray-400 text-xs leading-relaxed">
                  {disclaimer}
                </p>
              </div>
            </div>
          )}

          {/* ── Actions ── */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={onReset}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <RotateCcw size={14} />
              Analyze another
            </button>
            <button
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-gray-600 text-sm border border-gray-200 hover:bg-gray-50 transition-colors"
              title="Coming soon"
            >
              <Download size={14} />
              Download Report
            </button>
          </div>

          {processingTime && (
            <p className="text-gray-400 text-xs text-center tabular-nums">
              Analyzed in {(processingTime / 1000).toFixed(1)}s
            </p>
          )}
        </div>
      </main>
    </>
  );
}
