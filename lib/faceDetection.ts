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
  const ax1 = a.box.x;
  const ay1 = a.box.y;
  const ax2 = a.box.x + a.box.width;
  const ay2 = a.box.y + a.box.height;

  const bx1 = b.box.x;
  const by1 = b.box.y;
  const bx2 = b.box.x + b.box.width;
  const by2 = b.box.y + b.box.height;

  const interX1 = Math.max(ax1, bx1);
  const interY1 = Math.max(ay1, by1);
  const interX2 = Math.min(ax2, bx2);
  const interY2 = Math.min(ay2, by2);

  const interW = Math.max(0, interX2 - interX1);
  const interH = Math.max(0, interY2 - interY1);
  const interArea = interW * interH;

  const areaA = a.box.width * a.box.height;
  const areaB = b.box.width * b.box.height;
  const union = areaA + areaB - interArea;

  return union <= 0 ? 0 : interArea / union;
}

function dedupeDetections(detections: RawDetection[]): RawDetection[] {
  const sorted = [...detections].sort((a, b) => b.score - a.score);
  const kept: RawDetection[] = [];

  for (const candidate of sorted) {
    const isDuplicate = kept.some((existing) => iou(existing, candidate) > 0.35);
    if (!isDuplicate) kept.push(candidate);
  }

  return kept;
}

async function runTinyFacePass(
  source: HTMLImageElement | HTMLCanvasElement,
  inputSize: 320 | 416 | 512 | 608,
  scoreThreshold: number,
  scaleToOriginal = 1
): Promise<RawDetection[]> {
  const options = new faceapi.TinyFaceDetectorOptions({
    inputSize,
    scoreThreshold,
  });

  const detections = await faceapi.detectAllFaces(source, options);

  return detections.map((d) => ({
    box: {
      x: d.box.x / scaleToOriginal,
      y: d.box.y / scaleToOriginal,
      width: d.box.width / scaleToOriginal,
      height: d.box.height / scaleToOriginal,
    },
    score: d.score,
  }));
}

function cropFace(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  bbox: BBox
): string {
  const PAD = 0.35; // 35% padding around face
  const padX = bbox.w * PAD;
  const padY = bbox.h * PAD;
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
 * Detect faces in an image using face-api.js TinyFaceDetector
 * Uses very sensitive parameters to detect all faces including small or partially visible ones
 */
export async function detectFaces(imageSrc: string): Promise<Face[]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = async () => {
      try {
        // Load the face-api.js model
        await loadModels();
        
        // Run face detection in multiple passes to improve recall
        console.log('[FaceAPI] Running face detection...');

        const upscaleCanvas = document.createElement("canvas");
        const scaleFactor = 1.5;
        upscaleCanvas.width = Math.round(img.width * scaleFactor);
        upscaleCanvas.height = Math.round(img.height * scaleFactor);
        const upscaleCtx = upscaleCanvas.getContext("2d");
        if (upscaleCtx) {
          upscaleCtx.imageSmoothingEnabled = true;
          upscaleCtx.imageSmoothingQuality = "high";
          upscaleCtx.drawImage(img, 0, 0, upscaleCanvas.width, upscaleCanvas.height);
        }

        const [passA, passB, passC, passUpscaled] = await Promise.all([
          runTinyFacePass(img, 608, 0.25),
          runTinyFacePass(img, 512, 0.22),
          runTinyFacePass(img, 416, 0.18),
          runTinyFacePass(upscaleCanvas, 512, 0.15, scaleFactor),
        ]);

        const merged = dedupeDetections([...passA, ...passB, ...passC, ...passUpscaled])
          .filter((d) => d.box.width >= 18 && d.box.height >= 18)
          .slice(0, 12);

        console.log(`[FaceAPI] Pass counts A:${passA.length} B:${passB.length} C:${passC.length} U:${passUpscaled.length}`);
        console.log(`[FaceAPI] Merged to ${merged.length} unique faces`);
        
        if (merged.length === 0) {
          resolve([]);
          return;
        }
        
        // Convert face-api.js detections to our Face format
        const cropCanvas = document.createElement("canvas");
        const faces: Face[] = merged.map((detection, i) => {
          const box = detection.box;
          
          const bbox: BBox = {
            x: box.x,
            y: box.y,
            w: box.width,
            h: box.height,
          };
          
          const cropUrl = cropFace(cropCanvas, img, bbox);
          
          return {
            id: `face_${i}`,
            bbox,
            cropUrl,
            confidence: detection.score,
          };
        });
        
        // Sort faces left-to-right
        faces.sort((a, b) => a.bbox.x - b.bbox.x);
        // Re-number IDs after sorting
        faces.forEach((f, i) => (f.id = `face_${i}`));
        
        console.log(`[detectFaces] Detected ${faces.length} faces:`, faces.map(f => ({
          id: f.id,
          position: `(${Math.round(f.bbox.x)}, ${Math.round(f.bbox.y)})`,
          size: `${Math.round(f.bbox.w)}x${Math.round(f.bbox.h)}`,
          confidence: f.confidence.toFixed(2)
        })));
        
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
 * Stable across refreshes for the same image.
 */
export function generateScores(face: Face, imgWidth: number, imgHeight: number) {
  // Simple hash from bbox
  const seed = face.bbox.x * 7 + face.bbox.y * 13 + face.bbox.w * 31 + face.bbox.h * 37;
  const hash = (v: number) => ((Math.sin(v) * 10000) % 1 + 1) % 1; // 0-1

  const frameRatio = (face.bbox.w * face.bbox.h) / (imgWidth * imgHeight);
  const centerX = (face.bbox.x + face.bbox.w / 2) / imgWidth;
  const centerDist = Math.abs(centerX - 0.5);

  const spatial = Math.round(
    Math.min(95, Math.max(30, frameRatio * 400 + hash(seed + 1) * 20 + 35))
  );
  const posture = Math.round(
    Math.min(95, Math.max(25, 50 + hash(seed + 2) * 30 + (1 - centerDist) * 15))
  );
  const facial = Math.round(
    Math.min(95, Math.max(30, face.confidence * 60 + hash(seed + 3) * 25 + 15))
  );
  const attention = Math.round(
    Math.min(95, Math.max(25, (1 - centerDist) * 50 + hash(seed + 4) * 25 + 20))
  );

  const total =
    Math.round(
      (spatial * 0.3 + posture * 0.25 + facial * 0.25 + attention * 0.2) * 10
    ) / 10;

  return {
    scores: {
      spatial_presence: spatial,
      posture_dominance: posture,
      facial_intensity: facial,
      attention_capture: attention,
    },
    totalScore: total,
  };
}
