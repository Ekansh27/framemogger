"use client";

import { Camera, Sun, Users, RefreshCw } from "lucide-react";

interface EmptyFaceStateProps {
  onRetry: () => void;
}

export function EmptyFaceState({ onRetry }: EmptyFaceStateProps) {
  return (
    <div className="rounded-2xl border border-stone-800/80 bg-stone-900/70 backdrop-blur-xl shadow-[0_20px_56px_-28px_rgba(0,0,0,0.9)] p-8 text-center max-w-md mx-auto animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-stone-900 border border-stone-700 flex items-center justify-center mx-auto mb-5">
        <Camera size={28} className="text-stone-400" />
      </div>

      <h3 className="text-stone-100 text-lg font-semibold mb-2">
        No faces detected
      </h3>
      <p className="text-stone-400 text-sm mb-6 max-w-xs mx-auto leading-relaxed">
        We couldn&apos;t find any faces in this photo. Try a different image with
        clear, well-lit faces.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {[
          { icon: Sun, tip: "Good lighting" },
          { icon: Users, tip: "Faces visible" },
          { icon: Camera, tip: "Clear photo" },
        ].map(({ icon: Icon, tip }) => (
          <div
            key={tip}
            className="flex items-center gap-2 p-2.5 rounded-lg bg-stone-900 border border-stone-700"
          >
            <Icon size={14} className="text-stone-400 flex-shrink-0" />
            <span className="text-stone-300 text-xs">{tip}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-600 text-stone-50 text-sm font-medium hover:bg-amber-500 transition-colors shadow-lg shadow-amber-900/30"
      >
        <RefreshCw size={14} />
        Try another photo
      </button>
    </div>
  );
}
