"use client";

import { useMemo, useState } from "react";
import type { AnalysisResult } from "@/types/analysis";

interface ExplanationPanelProps {
  result?: AnalysisResult;
  explanation?: string;
  disclaimer?: string;
}

export function ExplanationPanel({ result, explanation, disclaimer }: ExplanationPanelProps) {
  const resolvedExplanation = explanation ?? result?.explanation ?? "";
  const resolvedDisclaimer = disclaimer ?? result?.disclaimer ?? "";
  const [expanded, setExpanded] = useState(false);

  const isLong = resolvedExplanation.length > 300;

  const paragraphs = useMemo(
    () =>
      resolvedExplanation
        .split(/\n{2,}/)
        .map((part) => part.trim())
        .filter(Boolean),
    [resolvedExplanation]
  );

  return (
    <div className="rounded-2xl border border-stone-800/80 bg-stone-900/70 backdrop-blur-xl shadow-[0_20px_56px_-28px_rgba(0,0,0,0.9)] p-6 sm:p-7 space-y-6">
      <div>
        <p className="text-stone-400 text-xs font-medium uppercase tracking-widest mb-3">
          Analysis
        </p>

        {paragraphs.length > 0 ? (
          <div
            className={
              expanded
                ? "space-y-3 text-stone-200 text-sm sm:text-[15px] leading-7"
                : "space-y-3 text-stone-200 text-sm sm:text-[15px] leading-7 max-h-[8.5rem] overflow-hidden"
            }
            style={!expanded && isLong ? { maskImage: "linear-gradient(to bottom, black 70%, transparent 100%)" } : undefined}
          >
            {paragraphs.map((paragraph, idx) => (
              <p key={`${paragraph.slice(0, 24)}-${idx}`} className="max-w-3xl">
                {paragraph}
              </p>
            ))}
          </div>
        ) : (
          <p className="text-stone-400 text-sm">No detailed explanation available.</p>
        )}

        {isLong && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-3 text-xs font-medium text-amber-400 hover:text-amber-300 underline underline-offset-2"
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        )}
      </div>

      <div className="border border-stone-700 rounded-xl bg-stone-950/70 px-3.5 py-3">
        <p className="text-stone-400 text-xs leading-relaxed">{resolvedDisclaimer}</p>
      </div>
    </div>
  );
}
