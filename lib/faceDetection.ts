"use client";

import * as faceapi from 'face-api.js';
import type { Face, BBox } from "@/types/analysis";

// Cache the model loading state
let modelLoaded = false;

async function loadModels(): Promise<void> {
  if (modelLoaded) return;

  try {
    console.log('[FaceAPI] Loading TinyFaceDetector model...');
    await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
    modelLoaded = true;
    console.log('[FaceAPI] Model loaded successfully');
  } catch (error) {
    console.error('[FaceAPI] Failed to load model:', error);
    throw error;
  }
}

interface RawDetection {
  box: { x: number; y: number; width: number; height: number };
  score: number;
}

function iou(a: RawDetection, b: RawDetection): number {
  const ax1 = a.box.x, ay1 = a.box.y;
  const ax2 = a.box.x + a.box.width, ay2 = a.box.y + a.box.height;
  const bx1 = b.box.x, by1 = b.box.y;
  const bx2 = b.box.x + b.box.width, by2 = b.box.y + b.box.height;

  const interW = Math.max(0, Math.min(ax2, bx2) - Math.max(ax1, bx1));
  const interH = Math.max(0, Math.min(ay2, by2) - Math.max(ay1, by1));
  const interArea = interW * interH;
  const union = a.box.width * a.box.height + b.box.width * b.box.height - interArea;

  return union <= 0 ? 0 : interArea / union;
}

function dedupeDetections(detections: RawDetection[]): RawDetection[] {
  const sorted = [...detections].sort((a, b) => b.score - a.score);
  const kept: RawDetection[] = [];
  for (const candidate of sorted) {
    if (!kept.some((existing) => iou(existing, candidate) > 0.25)) {
      kept.push(candidate);
    }
  }
  return kept;
}

async function runTinyFacePass(
  source: HTMLImageElement | HTMLCanvasElement,
  inputSize: 320 | 416 | 512 | 608,
  scoreThreshold: number,
): Promise<RawDetection[]> {
  const options = new faceapi.TinyFaceDetectorOptions({ inputSize, scoreThreshold });
  const detections = await faceapi.detectAllFaces(source, options);
  return detections.map((d) => ({
    box: { x: d.box.x, y: d.box.y, width: d.box.width, height: d.box.height },
    score: d.score,
  }));
}

function cropFace(canvas: HTMLCanvasElement, img: HTMLImageElement, bbox: BBox): string {
  const PAD = 0.35;
  const padX = bbox.w * PAD, padY = bbox.h * PAD;
  const sx = Math.max(0, bbox.x - padX);
  const sy = Math.max(0, bbox.y - padY);
  const sw = Math.min(img.width - sx, bbox.w + padX * 2);
  const sh = Math.min(img.height - sy, bbox.h + padY * 2);

  const size = 200;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, size, size);
  return canvas.toDataURL("image/jpeg", 0.92);
}

/**
 * Detect faces in an image using face-api.js TinyFaceDetector.
 * Downscales large images before detection to avoid OOM crashes on mobile.
 * Runs passes sequentially (not parallel) to keep peak memory low.
 */
export async function detectFaces(imageSrc: string): Promise<Face[]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = async () => {
      try {
        await loadModels();

        // Downscale to max 800px for detection — prevents OOM on 20MP phone photos.
        // Detection accuracy is not meaningfully affected at this resolution.
        const MAX_DETECT_PX = 800;
        let detectSource: HTMLImageElement | HTMLCanvasElement = img;
        let coordScale = 1; // multiply detection coords by this to get original-image coords

        if (img.width > MAX_DETECT_PX || img.height > MAX_DETECT_PX) {
          const scale = MAX_DETECT_PX / Math.max(img.width, img.height);
          const w = Math.round(img.width * scale);
          const h = Math.round(img.height * scale);
          const downCanvas = document.createElement("canvas");
          downCanvas.width = w;
          downCanvas.height = h;
          const ctx = downCanvas.getContext("2d")!;
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, 0, 0, w, h);
          detectSource = downCanvas;
          coordScale = 1 / scale;
        }

        // Run passes sequentially to reduce peak memory (critical on mobile)
        console.log('[FaceAPI] Running face detection (sequential passes)...');
        const passA = await runTinyFacePass(detectSource, 608, 0.65);
        const passB = await runTinyFacePass(detectSource, 512, 0.60);
        const passC = await runTinyFacePass(detectSource, 416, 0.55);

        // Scale coords back to original-image space if we downscaled
        const toOriginal = (dets: RawDetection[]): RawDetection[] =>
          coordScale === 1
            ? dets
            : dets.map((d) => ({
                ...d,
                box: {
                  x: d.box.x * coordScale,
                  y: d.box.y * coordScale,
                  width: d.box.width * coordScale,
                  height: d.box.height * coordScale,
                },
              }));

        const merged = dedupeDetections([
          ...toOriginal(passA),
          ...toOriginal(passB),
          ...toOriginal(passC),
        ])
          .filter((d) => {
            const { width, height } = d.box;
            // Minimum size: ignore tiny blobs
            if (width < 45 || height < 45) return false;
            // Aspect ratio: faces are roughly square (0.5–2.0).
            // Bottles, signs, etc. are typically very tall/narrow (< 0.5).
            const ratio = width / height;
            if (ratio < 0.5 || ratio > 2.0) return false;
            return true;
          })
          .slice(0, 6);

        console.log(`[FaceAPI] Passes A:${passA.length} B:${passB.length} C:${passC.length} → ${merged.length} unique`);

        if (merged.length === 0) {
          resolve([]);
          return;
        }

        const cropCanvas = document.createElement("canvas");
        const faces: Face[] = merged.map((detection, i) => {
          const bbox: BBox = {
            x: detection.box.x,
            y: detection.box.y,
            w: detection.box.width,
            h: detection.box.height,
          };
          return {
            id: `face_${i}`,
            bbox,
            cropUrl: cropFace(cropCanvas, img, bbox),
            confidence: detection.score,
          };
        });

        faces.sort((a, b) => a.bbox.x - b.bbox.x);
        faces.forEach((f, i) => (f.id = `face_${i}`));

        console.log(`[detectFaces] Detected ${faces.length} faces`);
        resolve(faces);
      } catch (error) {
        console.error('[FaceAPI] Error detecting faces:', error);
        resolve([]);
      }
    };
    img.onerror = () => {
      console.error('[FaceAPI] Error loading image');
      resolve([]);
    };
    img.src = imageSrc;
  });
}

/**
 * Generate deterministic pseudo-scores from a face's bounding box.
 */
export function generateScores(face: Face, imgWidth: number, imgHeight: number) {
  const seed = face.bbox.x * 7 + face.bbox.y * 13 + face.bbox.w * 31 + face.bbox.h * 37;
  const hash = (v: number) => ((Math.sin(v) * 10000) % 1 + 1) % 1;

  const frameRatio = (face.bbox.w * face.bbox.h) / (imgWidth * imgHeight);
  const centerX = (face.bbox.x + face.bbox.w / 2) / imgWidth;
  const centerDist = Math.abs(centerX - 0.5);

  const spatial = Math.round(Math.min(95, Math.max(30, frameRatio * 400 + hash(seed + 1) * 20 + 35)));
  const posture = Math.round(Math.min(95, Math.max(25, 50 + hash(seed + 2) * 30 + (1 - centerDist) * 15)));
  const facial = Math.round(Math.min(95, Math.max(30, face.confidence * 60 + hash(seed + 3) * 25 + 15)));
  const attention = Math.round(Math.min(95, Math.max(25, (1 - centerDist) * 50 + hash(seed + 4) * 25 + 20)));

  const total = Math.round((spatial * 0.3 + posture * 0.25 + facial * 0.25 + attention * 0.2) * 10) / 10;

  return {
    scores: { spatial_presence: spatial, posture_dominance: posture, facial_intensity: facial, attention_capture: attention },
    totalScore: total,
  };
}
