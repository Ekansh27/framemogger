"use client";

import type { Face } from "@/types/analysis";
import { EditNameButton } from "@/components/steps/FaceLabelStep";
import { cn } from "@/lib/utils";
import { PERSON_COLORS } from "@/lib/utils";

interface FaceStripProps {
  faces: Face[];
  names: Record<string, string>;
  selectedIds?: string[];
  onSelect?: (id: string) => void;
  onNameChange?: (id: string, name: string) => void;
  compact?: boolean;
}

export function FaceStrip({
  faces,
  names,
  selectedIds = [],
  onSelect,
  onNameChange,
  compact = false,
}: FaceStripProps) {
  if (faces.length === 0) return null;

  return (
    <div className="w-full relative">
      <div className="pointer-events-none absolute left-0 top-0 bottom-2 w-8 bg-gradient-to-r from-zinc-900/95 to-transparent z-10" />
      <div className="pointer-events-none absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-zinc-900/95 to-transparent z-10" />

      <div
        className={cn(
          "flex gap-3 overflow-x-auto pb-2 scrollbar-hide",
          compact ? "justify-center" : "justify-start px-1"
        )}
      >
        {faces.map((face, i) => {
          const isSelected = selectedIds.includes(face.id);
          const colors = PERSON_COLORS[i % PERSON_COLORS.length];

          return (
            <button
              key={face.id}
              onClick={() => onSelect?.(face.id)}
              className={cn(
                "flex-shrink-0 flex flex-col items-center gap-1.5 p-2.5 rounded-2xl transition-all duration-200 border",
                onSelect && "cursor-pointer",
                isSelected
                  ? "bg-blue-500/10 border-blue-500/40 shadow-[0_8px_24px_-16px_rgba(37,99,235,0.55)]"
                  : "bg-zinc-900/80 border-zinc-700 hover:border-zinc-600 hover:-translate-y-0.5"
              )}
              aria-label={`Select ${names[face.id] || `Person ${i + 1}`} for comparison`}
            >
              {/* Face image */}
              <div className="relative">
                <div
                  className={cn(
                    "rounded-2xl overflow-hidden border-2 transition-all duration-200",
                    compact ? "w-12 h-12" : "w-[68px] h-[68px]",
                    isSelected ? colors.border : "border-zinc-700",
                    isSelected && "ring-4 ring-blue-500/20"
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={face.cropUrl}
                    alt={names[face.id] || `Person ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Selection indicator */}
                {isSelected && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-600 border-2 border-zinc-900 flex items-center justify-center">
                    <svg
                      width="8"
                      height="8"
                      viewBox="0 0 8 8"
                      fill="none"
                    >
                      <path
                        d="M1 4L3 6L7 2"
                        stroke="white"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                )}

                {/* Confidence dot */}
                <div
                  className={cn(
                    "absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full border border-white",
                    face.confidence > 0.8
                      ? "bg-emerald-500"
                      : face.confidence > 0.6
                        ? "bg-amber-500"
                        : "bg-red-500"
                  )}
                />
              </div>

              {/* Name */}
              <div className="flex items-center gap-1 max-w-[96px]">
                <span
                  className={cn(
                    "text-xs font-medium truncate",
                    isSelected ? "text-blue-200" : "text-zinc-300"
                  )}
                >
                  {names[face.id] || `Person ${i + 1}`}
                </span>
                {onNameChange && !compact && (
                  <span title={`Edit name for ${names[face.id] || `Person ${i + 1}`}`}>
                    <EditNameButton
                      name={names[face.id] || `Person ${i + 1}`}
                      onSave={(n) => onNameChange(face.id, n)}
                    />
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
