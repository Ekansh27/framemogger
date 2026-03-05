"use client";

import { RotateCcw } from "lucide-react";


interface NavbarProps {
  onUploadNew?: () => void;
}

export function Navbar({ onUploadNew }: NavbarProps) {
  return (
    <header className="border-b border-stone-800/80 bg-stone-950/80 backdrop-blur-md sticky top-0 z-40">
      <div className="container flex items-center justify-between h-14">
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-semibold text-stone-100 tracking-tight">
            FrameMogger
          </span>
        </div>

        {onUploadNew && (
          <button
            onClick={onUploadNew}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-stone-300 hover:text-stone-50 bg-stone-900/80 hover:bg-stone-800 border border-stone-700 hover:border-stone-500 transition-all duration-150"
          >
            <RotateCcw size={12} />
            New Upload
          </button>
        )}
      </div>
    </header>
  );
}
