"use client";

import { useState, useCallback, useRef } from "react";
import { useImageUpload } from "@/hooks/useImageUpload";
import { DropZone } from "@/components/upload/DropZone";
import { LoadingOverlay } from "@/components/processing/LoadingOverlay";
import { FaceLabelStep } from "@/components/steps/FaceLabelStep";
import { ResultsView } from "@/components/results/ResultsView";
import { EmptyFaceState } from "@/components/results/EmptyFaceState";
import { Navbar } from "@/components/ui/Navbar";
import { BackgroundVisuals } from "@/components/ui/BackgroundVisuals";
import { Button } from "@/components/ui/Button";
import { detectFaces } from "@/lib/faceDetection";
import type { Face, Person, AppStep, AnalysisResult } from "@/types/analysis";

const SIGNALS = [
  { label: "Spatial Presence", desc: "Frame area occupied" },
  { label: "Posture", desc: "Body orientation" },
  { label: "Facial Intensity", desc: "Gaze & expression" },
  { label: "Attention Capture", desc: "Compositional pull" },
];

export default function HomePage() {
  const { file, preview, error: uploadError, clear: clearUpload, ...uploadProps } = useImageUpload();

  const [step, setStep] = useState<AppStep>("upload");
  const [faces, setFaces] = useState<Face[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [persons, setPersons] = useState<Person[]>([]);
  const [apiResult, setApiResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processingTime, setProcessingTime] = useState<number | undefined>();
  const startTimeRef = useRef(0);

  const resetAll = useCallback(() => {
    clearUpload();
    setStep("upload");
    setFaces([]);
    setNames({});
    setPersons([]);
    setApiResult(null);
    setError(null);
    setProcessingTime(undefined);
  }, [clearUpload]);

  const handleAnalyze = useCallback(async () => {
    if (!file || !preview) return;
    setError(null);
    setStep("detecting");
    startTimeRef.current = Date.now();

    try {
      let detected: Face[] = [];
      try {
        detected = await detectFaces(preview);
        setFaces(detected);
      } catch {
        // Face detection crashed (e.g. OOM on large image) — treat as 0 faces
        detected = [];
        setFaces([]);
      }

      if (detected.length === 0) {
        setStep("results");
        return;
      }

      // Go to labeling so user can name people
      const defaultNames: Record<string, string> = {};
      detected.forEach((f, i) => { defaultNames[f.id] = `Person ${i + 1}`; });
      setNames(defaultNames);
      setStep("labeling");
    } catch (err) {
      console.error("handleAnalyze crash:", err);
      setError("Something went wrong. Please try a smaller image.");
      setStep("upload");
    }
  }, [file, preview]);

  const handleRemoveFace = useCallback((faceId: string) => {
    setFaces((prev) => prev.filter((f) => f.id !== faceId));
    setNames((prev) => { const u = { ...prev }; delete u[faceId]; return u; });
  }, []);

  const handleNamesConfirmed = useCallback(async (confirmedNames: Record<string, string>) => {
    setNames(confirmedNames);
    setStep("analyzing");

    try {
      // Sort faces left-to-right; send all names to Claude for scoring
      const sortedFaceIds = [...faces].sort((a, b) => a.bbox.x - b.bbox.x).map((f) => f.id);
      const allNames = sortedFaceIds.map((id, i) => confirmedNames[id] || `Person ${i + 1}`);

      const { data: base64, mimeType } = await fileToBase64(file!);
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mimeType, names: allNames }),
      });
      const result = await response.json();

      if (!result.success) {
        setError(result.error || "Analysis failed. Please try again.");
        setStep("upload");
        return;
      }

      // Map Claude's scored people back to face IDs (both are in left-to-right order)
      const apiPeople = result.data.people as AnalysisResult["people"];
      const personData: Person[] = sortedFaceIds.map((faceId, i) => {
        const api = apiPeople[i];
        return {
          faceId,
          name: confirmedNames[faceId] || `Person ${i + 1}`,
          scores: api?.signals ?? { posture_dominance: 50, spatial_presence: 50, attention_capture: 50, facial_intensity: 50 },
          totalScore: api?.composite_score ?? 50,
        };
      });

      setPersons(personData);
      setApiResult(result.data);
      setProcessingTime(Date.now() - startTimeRef.current);
      setStep("results");
    } catch {
      setError("Analysis failed. Please try again.");
      setStep("upload");
    }
  }, [faces, file]);

  if (step === "detecting") {
    return <LoadingOverlay preview={preview} mode="detecting" faces={faces} />;
  }

  if (step === "analyzing") {
    return <LoadingOverlay preview={preview} mode="analyzing" faces={faces} />;
  }

  if (step === "labeling") {
    return (
      <FaceLabelStep
        faces={faces}
        preview={preview}
        onConfirm={handleNamesConfirmed}
        onRemove={handleRemoveFace}
        onBack={() => { setStep("upload"); setFaces([]); }}
      />
    );
  }

  if (step === "results") {
    if (faces.length === 0) {
      return (
        <>
          <Navbar onUploadNew={resetAll} />
          <main className="min-h-[calc(100vh-56px)] flex items-center justify-center px-6">
            <EmptyFaceState onRetry={resetAll} />
          </main>
        </>
      );
    }

    const sorted = [...persons].sort((a, b) => b.totalScore - a.totalScore);
    const rankedPersons = sorted.map((p, i) => ({ ...p, rank: i + 1 }));

    return (
      <ResultsView
        faces={faces}
        persons={rankedPersons}
        explanation={apiResult?.explanation || ""}
        disclaimer={apiResult?.disclaimer || "Analysis covers photographic composition only — not attractiveness or personal qualities."}
        processingTime={processingTime}
        originalImage={preview}
        onReset={resetAll}
      />
    );
  }

  // Upload step
  return (
    <>
      <Navbar />

      <main className="min-h-[calc(100vh-56px)] flex flex-col bg-stone-950 relative overflow-hidden">
        <BackgroundVisuals />

        <section className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-8">
          <div className="w-full max-w-md flex flex-col items-center gap-5 animate-fade-in">

            <div className="text-center space-y-2">
              <h1 className="text-stone-50 text-3xl font-semibold tracking-tight animate-float">
                Who Commands This Frame?
              </h1>
              <p className="text-stone-400 text-sm max-w-xs mx-auto leading-relaxed">
                Upload a photo with 2–6 people. AI scores who commands the frame.
              </p>
            </div>

            <div className="w-full grid grid-cols-4 gap-px bg-stone-800 rounded-xl overflow-hidden border border-stone-800">
              {SIGNALS.map((s) => (
                <div key={s.label} className="bg-stone-900 px-3 py-2.5">
                  <p className="text-stone-100 text-[10px] font-medium leading-tight">{s.label}</p>
                  <p className="text-stone-500 text-[10px] mt-0.5 leading-tight">{s.desc}</p>
                </div>
              ))}
            </div>

            <div className="w-full">
              <DropZone preview={preview} error={uploadError} clear={clearUpload} {...uploadProps} />
            </div>

            {file && !error && (
              <Button size="lg" onClick={handleAnalyze} className="w-full">
                Analyze Frame
              </Button>
            )}

            {error && (
              <div className="w-full p-4 rounded-xl border border-red-900/60 bg-red-950/30 text-center animate-fade-in">
                <p className="text-red-400 text-sm">{error}</p>
                <button
                  onClick={resetAll}
                  className="mt-2 text-xs text-stone-400 hover:text-stone-200 transition-colors underline"
                >
                  Try a different image
                </button>
              </div>
            )}

            <p className="text-stone-600 text-[10px] text-center">
              Composition only — not attractiveness or personal qualities.
            </p>

          </div>
        </section>
      </main>
    </>
  );
}

function fileToBase64(file: File): Promise<{ data: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const MAX_SIDE = 1024;
        let w = img.width, h = img.height;
        if (w > MAX_SIDE || h > MAX_SIDE) {
          if (w > h) { h = Math.round(h * MAX_SIDE / w); w = MAX_SIDE; }
          else { w = Math.round(w * MAX_SIDE / h); h = MAX_SIDE; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, w, h);
        const compressed = canvas.toDataURL("image/jpeg", 0.85);
        resolve({ data: compressed.split(",")[1], mimeType: "image/jpeg" });
      };
      img.onerror = reject;
      img.src = dataUrl;
    };
    reader.onerror = reject;
  });
}
