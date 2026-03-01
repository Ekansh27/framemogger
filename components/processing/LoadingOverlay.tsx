"use client";

import { useEffect, useState } from "react";
import type { Face } from "@/types/analysis";

const DETECT_PHASES = [
  "Scanning for faces…",
  "Mapping facial boundaries…",
  "Extracting face crops…",
  "Preparing analysis…",
];

const ANALYZE_PHASES = [
  "Mapping spatial boundaries…",
  "Analyzing posture vectors…",
  "Calculating facial intensity…",
  "Computing attention capture…",
  "Determining frame dominance…",
];

interface LoadingOverlayProps {
  preview: string | null;
  mode: "detecting" | "analyzing";
  faces?: Face[];
}

export function LoadingOverlay({ preview, mode, faces = [] }: LoadingOverlayProps) {
  const phases = mode === "detecting" ? DETECT_PHASES : ANALYZE_PHASES;
  const [phase, setPhase] = useState(0);
  const [progress, setProgress] = useState(0);

  // Check for reduced motion preference
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, []);

  useEffect(() => {
    setPhase(0);
    setProgress(0);

    const phaseMs = mode === "detecting" ? 800 : 1300;
    const total = phases.length * phaseMs;
    const tick = setInterval(() => {
      setProgress((p) => Math.min(p + (50 / total) * 100, 96));
    }, 50);
    const timers = phases.map((_, i) =>
      setTimeout(() => setPhase(i), i * phaseMs)
    );
    return () => {
      clearInterval(tick);
      timers.forEach(clearTimeout);
    };
  }, [mode, phases]);

  return (
    <div className="fixed inset-0 bg-zinc-950 z-50 flex flex-col items-center justify-center overflow-hidden">
      {/* Blurred backdrop */}
      {preview && (
        <div className="absolute inset-0 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt=""
            className="w-full h-full object-cover opacity-[0.12] blur-2xl scale-110"
          />
        </div>
      )}

      <div className="pointer-events-none absolute -top-28 left-1/2 -translate-x-1/2 w-[42rem] h-[42rem] rounded-full bg-blue-600/20 blur-3xl" />
      <div className="pointer-events-none absolute top-44 -left-24 w-[24rem] h-[24rem] rounded-full bg-violet-600/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-10 right-0 w-[20rem] h-[20rem] rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:32px_32px]" />

      {/* Original scan line animation */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className="scan-line" />
      </div>

      <div className="relative z-10 w-full max-w-4xl px-6 sm:px-8 flex flex-col items-center gap-8 animate-fade-in">
        <div className="w-full rounded-2xl border border-zinc-800/80 bg-zinc-900/70 backdrop-blur-xl shadow-[0_20px_56px_-28px_rgba(0,0,0,0.9)] p-4 sm:p-6 animate-scale-in">
          <div className="flex items-center justify-between mb-3">
            <p className="text-zinc-300 text-xs font-medium uppercase tracking-widest">Detected faces</p>
            <p className="text-zinc-500 text-xs tabular-nums">{faces.length} found</p>
          </div>

          {faces.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {faces.slice(0, 6).map((face, index) => (
                <FaceScanThumb
                  key={face.id}
                  face={face}
                  preview={preview}
                  progress={progress}
                  prefersReducedMotion={prefersReducedMotion}
                  delayMs={index * 60}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`skeleton-${index}`}
                  className="relative aspect-[4/5] rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden animate-pulse"
                  style={{ animationDelay: `${index * 120}ms` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-zinc-800/30 via-zinc-900 to-zinc-900" />
                  <div className="absolute inset-x-0 top-1/2 h-[2px] bg-gradient-to-r from-transparent via-cyan-300/30 to-transparent" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Spinner ring */}
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border-2 border-zinc-700" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-400 animate-spin" />
        </div>

        {/* Phase label */}
        <div className="text-center">
          <p
            key={`${mode}-${phase}`}
            className="text-zinc-100 text-base font-semibold animate-fade-in mb-1"
          >
            {phases[phase]}
          </p>
          <p className="text-zinc-400 text-xs tabular-nums">
            Step {phase + 1} of {phases.length}
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-full max-w-sm">
          <div className="relative h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-blue-500 rounded-full transition-all duration-200 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Mode label */}
        <p className="text-zinc-400 text-xs uppercase tracking-widest">
          {mode === "detecting" ? "Face Detection" : "Frame Analysis"}
        </p>
      </div>
    </div>
  );
}

function FaceScanThumb({
  face,
  preview,
  progress,
  prefersReducedMotion,
  delayMs,
}: {
  face: Face;
  preview: string | null;
  progress: number;
  prefersReducedMotion: boolean;
  delayMs: number;
}) {
  const [fallbackCrop, setFallbackCrop] = useState<string | null>(null);

  useEffect(() => {
    if (face.cropUrl || !preview) return;

    let alive = true;
    const img = new Image();
    img.onload = () => {
      if (!alive) return;

      const sx = Math.max(0, Math.floor(face.bbox.x));
      const sy = Math.max(0, Math.floor(face.bbox.y));
      const maxW = Math.max(1, img.width - sx);
      const maxH = Math.max(1, img.height - sy);
      const sw = Math.max(1, Math.min(Math.floor(face.bbox.w), maxW));
      const sh = Math.max(1, Math.min(Math.floor(face.bbox.h), maxH));

      const canvas = document.createElement("canvas");
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      setFallbackCrop(canvas.toDataURL("image/jpeg", 0.92));
    };
    img.src = preview;

    return () => {
      alive = false;
    };
  }, [face.bbox.h, face.bbox.w, face.bbox.x, face.bbox.y, face.cropUrl, preview]);

  const source = face.cropUrl || fallbackCrop || preview;

  return (
    <div
      className="relative aspect-[4/5] rounded-2xl overflow-hidden border border-zinc-700 bg-zinc-900 shadow-[0_12px_30px_-18px_rgba(0,0,0,0.85)]"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      {source ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={source}
          alt="Detected face"
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-zinc-900" />
      )}

      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:16px_16px]" />
        <div
          className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent transition-transform duration-200"
          style={{ transform: `translateY(${Math.max(4, Math.min(96, progress))}%)` }}
        />
        <div className="absolute inset-0 rounded-2xl ring-1 ring-cyan-300/25 shadow-[inset_0_0_22px_rgba(56,189,248,0.2)]" />
      </div>

      <div className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full bg-zinc-950/70 border border-zinc-700 text-zinc-300 tabular-nums">
        {Math.round(face.confidence * 100)}%
      </div>

      {!prefersReducedMotion && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
      )}
    </div>
  );
}
