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
            ? "border-blue-400 bg-blue-900/20"
            : preview
            ? "border-zinc-700 bg-zinc-900/70"
            : "border-dashed border-zinc-600 bg-zinc-900/60 hover:border-zinc-400 hover:bg-zinc-900"
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
              className="w-full max-h-72 object-contain bg-zinc-900"
            />
            <button
              onClick={(e) => { e.stopPropagation(); clear(); }}
              className="absolute top-3 right-3 p-1.5 rounded-lg bg-zinc-900/90 border border-zinc-700 text-zinc-300 hover:text-white transition-colors shadow-sm"
              aria-label="Remove image"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 py-14 px-8">
            <div className="p-3 rounded-lg bg-zinc-800 border border-zinc-700">
              <Upload size={18} className="text-zinc-300" />
            </div>
            <div className="text-center">
              <p className="text-zinc-100 text-sm font-medium">
                {isDragging ? "Drop to upload" : "Drop a photo or click to browse"}
              </p>
              <p className="text-zinc-400 text-xs mt-1">
                2–6 people · JPEG, PNG, WebP · Max 15 MB
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
