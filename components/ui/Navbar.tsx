"use client";

import { RotateCcw } from "lucide-react";
import { Badge } from "./Badge";

interface NavbarProps {
  onUploadNew?: () => void;
}

export function Navbar({ onUploadNew }: NavbarProps) {
  return (
    <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-40">
      <div className="container flex items-center justify-between h-14">
        <div className="flex items-center gap-2.5">
          <div className="leading-tight">
            <span className="block text-sm font-semibold text-zinc-100 tracking-tight">
              Mog.GPT
            </span>
            <span className="block text-[10px] text-zinc-400">
              inspired by ASU frat leader
            </span>
          </div>
          <Badge variant="muted">Beta</Badge>
        </div>

        {onUploadNew && (
          <button
            onClick={onUploadNew}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-500 transition-all duration-150"
          >
            <RotateCcw size={12} />
            New Upload
          </button>
        )}
      </div>
    </header>
  );
}
