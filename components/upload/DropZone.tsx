"use client";

import { Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DropZoneProps {
  preview: string | null;
  isDragging: boolean;
  error: string | null;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  inputRef: React.RefObject<HTMLInputElement>;
  clear: () => void;
}

export function DropZone({
  preview,
  isDragging,
  error,
  onDrop,
  onDragOver,
  onDragLeave,
  onInputChange,
  inputRef,
  clear,
}: DropZoneProps) {
  return (
    <div className="w-full">
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => !preview && inputRef.current?.click()}
        className={cn(
          "relative rounded-xl border transition-all duration-150 overflow-hidden",
          !preview && "cursor-pointer",
          isDragging
            ? "border-amber-400 bg-amber-900/20"
            : preview
              ? "border-stone-700 bg-stone-900/70"
              : "border-dashed border-stone-600 bg-stone-900/60 hover:border-amber-500/50 hover:bg-stone-900/80"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={onInputChange}
        />

        {preview ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Upload preview"
              className="w-full max-h-72 object-contain bg-stone-950"
            />
            <button
              onClick={(e) => { e.stopPropagation(); clear(); }}
              className="absolute top-3 right-3 p-1.5 rounded-lg bg-stone-900/90 border border-stone-700 text-stone-300 hover:text-stone-50 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              aria-label="Remove image"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 py-14 px-8">
            <div className="p-3 rounded-lg bg-stone-800 border border-stone-700 shadow-sm">
              <Upload size={18} className="text-amber-500/80" />
            </div>
            <div className="text-center">
              <p className="text-stone-100 text-sm font-medium">
                {isDragging ? "Drop to upload" : "Drop a photo or click to browse"}
              </p>
              <p className="text-stone-400 text-xs mt-1">
                2–6 people · JPEG, PNG, WebP · Max 10 MB
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-600 animate-fade-in">{error}</p>
      )}
    </div>
  );
}
