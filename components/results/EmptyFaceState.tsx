"use client";

import { Camera, Sun, Users, RefreshCw } from "lucide-react";

interface EmptyFaceStateProps {
  onRetry: () => void;
}

export function EmptyFaceState({ onRetry }: EmptyFaceStateProps) {
  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/70 backdrop-blur-xl shadow-[0_20px_56px_-28px_rgba(0,0,0,0.9)] p-8 text-center max-w-md mx-auto animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-700 flex items-center justify-center mx-auto mb-5">
        <Camera size={28} className="text-zinc-400" />
      </div>

      <h3 className="text-zinc-100 text-lg font-semibold mb-2">
        No faces detected
      </h3>
      <p className="text-zinc-400 text-sm mb-6 max-w-xs mx-auto leading-relaxed">
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
            className="flex items-center gap-2 p-2.5 rounded-lg bg-zinc-900 border border-zinc-700"
          >
            <Icon size={14} className="text-zinc-400 flex-shrink-0" />
            <span className="text-zinc-300 text-xs">{tip}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/30"
      >
        <RefreshCw size={14} />
        Try another photo
      </button>
    </div>
  );
}
