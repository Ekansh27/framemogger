"use client";

import { useState, useCallback, useRef } from "react";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_MB = 10;

export function useImageUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndSet = useCallback((f: File) => {
    setError(null);
    if (!ACCEPTED_TYPES.includes(f.type)) {
      setError("Please upload a JPEG, PNG, or WebP image.");
      return;
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Image must be under ${MAX_SIZE_MB}MB.`);
      return;
    }
    if (file && preview) {
      URL.revokeObjectURL(preview);
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }, [file, preview]);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped) validateAndSet(dropped);
    },
    [validateAndSet]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      if (selected) validateAndSet(selected);
    },
    [validateAndSet]
  );

  const onImageFile = useCallback(
    (selected: File) => {
      validateAndSet(selected);
    },
    [validateAndSet]
  );

  const clear = useCallback(() => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }, [preview]);

  return {
    file,
    preview,
    error,
    isDragging,
    inputRef,
    setIsDragging,
    onDrop,
    onDragOver,
    onDragLeave,
    onInputChange,
    onImageFile,
    clear,
  };
}
