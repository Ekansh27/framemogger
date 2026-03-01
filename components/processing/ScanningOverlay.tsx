"use client";

import { useEffect, useRef, useState } from "react";
import type { Face } from "@/types/analysis";
import {
  generateFaceMeshFromBBox,
  animateMesh,
  type FaceMesh,
} from "@/lib/faceMeshGeometry";

interface ScanningOverlayProps {
  preview: string | null;
  faces: Face[];
  isScanning: boolean;
  progress: number; // 0-100
  prefersReducedMotion?: boolean;
}

/**
 * Cinematic 3D face scanning overlay with animated wireframe mesh
 * Renders to canvas with glow effects, scanlines, and HUD elements
 * Handles multiple faces with staggered animations
 */
export function ScanningOverlay({
  preview,
  faces,
  isScanning,
  progress,
  prefersReducedMotion = false,
}: ScanningOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef(Date.now());
  const opacityRef = useRef(1);
  const meshesRef = useRef<FaceMesh[]>([]);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Fade in/out smoothly
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    if (isScanning && preview) {
      // Fade in
      const fadeInTimer = setTimeout(() => {
        setOpacity(1);
      }, 50);
      return () => clearTimeout(fadeInTimer);
    } else if (!isScanning) {
      // Fade out
      setOpacity(0);
    }
  }, [isScanning, preview]);

  // Generate face meshes from bounding boxes (only when scanning starts)
  useEffect(() => {
    if (!isScanning || !preview || faces.length === 0) {
      meshesRef.current = [];
      return;
    }

    // Load preview image dimensions
    if (!imgRef.current || !imgRef.current.complete) {
      const img = new Image();
      img.onload = () => {
        imgRef.current = img;
        meshesRef.current = faces.map((face) =>
          generateFaceMeshFromBBox(face.bbox, img.width, img.height)
        );
      };
      img.src = preview;
    } else {
      meshesRef.current = faces.map((face) =>
        generateFaceMeshFromBBox(face.bbox, imgRef.current!.width, imgRef.current!.height)
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview, isScanning]);

  // Main animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !preview || !isScanning) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size accounting for device pixel ratio
    const rect = canvas.parentElement?.getBoundingClientRect();
    if (!rect) return;

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio : 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const canvasWidth = rect.width;
    const canvasHeight = rect.height;

    // Prefers reduced motion
    const animationIntensity = prefersReducedMotion ? 0.3 : 1.0;

    let lastFrameTime = Date.now();

    const animate = () => {
      const now = Date.now();
      const elapsedMs = now - startTimeRef.current;
      const deltaMs = now - lastFrameTime;
      lastFrameTime = now;

      // Clear canvas with slight trail effect
      ctx.fillStyle = "rgba(0, 0, 0, 0.04)";
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Draw background elements
      drawScanline(ctx, canvasWidth, canvasHeight, elapsedMs);

      // Draw HUD elements
      drawHUD(ctx, canvasWidth, canvasHeight, progress, elapsedMs);

      // Draw face meshes with animation
      meshesRef.current.forEach((mesh, idx) => {
        const animatedMesh = animateMesh(
          mesh,
          elapsedMs + idx * 150, // stagger animations
          animationIntensity
        );
        drawFaceMesh(ctx, animatedMesh, elapsedMs + idx * 150, prefersReducedMotion);
      });

      // If no faces yet (detecting phase), draw generic scanning indicator
      if (faces.length === 0) {
        drawGenericScanIndicator(ctx, canvasWidth, canvasHeight, elapsedMs);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isScanning, preview, prefersReducedMotion, progress]);

  // Stop animation when done scanning
  useEffect(() => {
    if (!isScanning && animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, [isScanning]);

  return (
    <div
      className="absolute inset-0 pointer-events-none transition-opacity duration-300"
      style={{ opacity }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />
    </div>
  );
}

/**
 * Draw sweeping scanline effect
 */
function drawScanline(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  elapsedMs: number
) {
  const scanlineY = ((elapsedMs % 4000) / 4000) * height;
  const gradient = ctx.createLinearGradient(0, scanlineY - 20, 0, scanlineY + 20);

  gradient.addColorStop(0, "rgba(100, 200, 255, 0)");
  gradient.addColorStop(0.5, "rgba(100, 200, 255, 0.4)");
  gradient.addColorStop(1, "rgba(100, 200, 255, 0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, scanlineY - 20, width, 40);
}

/**
 * Draw HUD elements: corner brackets, progress %, scanning label
 */
function drawHUD(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  progress: number,
  elapsedMs: number
) {
  const padding = 20;
  const bracketSize = 25;
  const bracketThickness = 2;

  // Corner brackets (cyan/bright color)
  ctx.strokeStyle = "rgba(100, 200, 255, 0.6)";
  ctx.lineWidth = bracketThickness;

  // Top-left
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding + bracketSize, padding);
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, padding + bracketSize);
  ctx.stroke();

  // Top-right
  ctx.beginPath();
  ctx.moveTo(width - padding, padding);
  ctx.lineTo(width - padding - bracketSize, padding);
  ctx.moveTo(width - padding, padding);
  ctx.lineTo(width - padding, padding + bracketSize);
  ctx.stroke();

  // Bottom-left
  ctx.beginPath();
  ctx.moveTo(padding, height - padding);
  ctx.lineTo(padding + bracketSize, height - padding);
  ctx.moveTo(padding, height - padding);
  ctx.lineTo(padding, height - padding - bracketSize);
  ctx.stroke();

  // Bottom-right
  ctx.beginPath();
  ctx.moveTo(width - padding, height - padding);
  ctx.lineTo(width - padding - bracketSize, height - padding);
  ctx.moveTo(width - padding, height - padding);
  ctx.lineTo(width - padding, height - padding - bracketSize);
  ctx.stroke();

  // Center HUD: "SCANNING..." label and progress
  const centerX = width / 2;
  const centerY = height / 2;

  // Scanning label with pulsing glow
  ctx.font = "16px monospace";
  ctx.textAlign = "center";
  const glow = 0.4 + 0.3 * Math.abs(Math.sin(elapsedMs / 300));
  ctx.fillStyle = `rgba(100, 200, 255, ${0.6 + glow * 0.2})`;
  ctx.fillText("SCANNING...", centerX, centerY - 20);

  // Progress bar background
  const barWidth = 120;
  const barHeight = 6;
  ctx.fillStyle = "rgba(100, 200, 255, 0.15)";
  ctx.fillRect(centerX - barWidth / 2, centerY, barWidth, barHeight);

  // Progress bar fill
  const fill = (progress / 100) * barWidth;
  const fillGradient = ctx.createLinearGradient(
    centerX - barWidth / 2,
    centerY,
    centerX - barWidth / 2 + fill,
    centerY
  );
  fillGradient.addColorStop(0, "rgba(100, 200, 255, 0.4)");
  fillGradient.addColorStop(1, "rgba(100, 200, 255, 0.8)");
  ctx.fillStyle = fillGradient;
  ctx.fillRect(centerX - barWidth / 2, centerY, fill, barHeight);

  // Progress percentage
  ctx.font = "12px monospace";
  ctx.fillStyle = "rgba(100, 200, 255, 0.7)";
  ctx.fillText(`${Math.floor(progress)}%`, centerX, centerY + 25);
}

/**
 * Draw animated face mesh with glowing neon wireframe
 */
function drawFaceMesh(
  ctx: CanvasRenderingContext2D,
  mesh: FaceMesh,
  elapsedMs: number,
  prefersReducedMotion: boolean
) {
  const time = elapsedMs / 1000;

  // Draw edges with glow and depth-based styling
  for (const [v1Idx, v2Idx] of mesh.edges) {
    const v1 = mesh.vertices[v1Idx];
    const v2 = mesh.vertices[v2Idx];

    // Depth-based styling: closer = brighter and thicker
    const avgDepth = (v1.z + v2.z) / 2;
    const thickness = 0.5 + avgDepth * 1.5; // 0.5-2px
    const alpha = 0.3 + avgDepth * 0.6; // 0.3-0.9

    // Flowing animation along edges
    const edgeFlow =
      prefersReducedMotion ? 0 : Math.sin(time * 2 + v1Idx * 0.3) * 0.15 + 0.5;

    // Draw with glow
    ctx.shadowColor = `rgba(100, 200, 255, ${alpha * 0.8})`;
    ctx.shadowBlur = 8 + edgeFlow * 4; // pulsing glow
    ctx.lineWidth = thickness;
    ctx.strokeStyle = `rgba(100, 200, 255, ${alpha})`;

    ctx.beginPath();
    ctx.moveTo(v1.x, v1.y);
    ctx.lineTo(v2.x, v2.y);
    ctx.stroke();
  }

  // Draw vertices as small glowing points
  ctx.shadowBlur = 0;
  mesh.vertices.forEach((v, idx) => {
    const depth = v.z;
    const pointSize = 1 + depth * 1.5; // 1-2.5px

    // Vertex pulse
    const pulse =
      prefersReducedMotion ? 0 : Math.sin(time * 3 + idx * 0.2) * 0.3 + 0.7;
    const radius = pointSize * pulse;

    ctx.fillStyle = `rgba(100, 200, 255, ${depth})`;
    ctx.shadowColor = `rgba(100, 200, 255, 0.8)`;
    ctx.shadowBlur = 6;

    ctx.beginPath();
    ctx.arc(v.x, v.y, radius, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.shadowBlur = 0;
}

/**
 * Draw generic scanning indicator when no faces detected yet
 */
function drawGenericScanIndicator(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  elapsedMs: number
) {
  const centerX = width / 2;
  const centerY = height / 2;
  const time = elapsedMs / 1000;

  // Pulsing circle
  const radius = 40 + Math.sin(time * 2) * 10;
  const alpha = 0.4 + Math.sin(time * 3) * 0.2;

  ctx.strokeStyle = `rgba(100, 200, 255, ${alpha})`;
  ctx.lineWidth = 2;
  ctx.shadowColor = `rgba(100, 200, 255, 0.6)`;
  ctx.shadowBlur = 10;

  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.stroke();

  // Rotating lines
  for (let i = 0; i < 3; i++) {
    const angle = time * 2 + (i / 3) * Math.PI * 2;
    const lineLength = 50;

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(
      centerX + Math.cos(angle) * lineLength,
      centerY + Math.sin(angle) * lineLength
    );
    ctx.stroke();
  }

  ctx.shadowBlur = 0;
}
