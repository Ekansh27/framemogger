"use client";

import { useEffect, useRef, useState } from "react";
import type { PersonWithPose } from "@/lib/bodyDetection";

interface PoseVisualizationProps {
  imageSrc: string;
  personsWithPoses: PersonWithPose[];
}

// Skeleton connections (which keypoints to connect with lines)
const POSE_CONNECTIONS = [
  // Face
  ['nose', 'left_eye'],
  ['nose', 'right_eye'],
  ['left_eye', 'left_ear'],
  ['right_eye', 'right_ear'],
  
  // Torso
  ['left_shoulder', 'right_shoulder'],
  ['left_shoulder', 'left_hip'],
  ['right_shoulder', 'right_hip'],
  ['left_hip', 'right_hip'],
  
  // Left arm
  ['left_shoulder', 'left_elbow'],
  ['left_elbow', 'left_wrist'],
  
  // Right arm
  ['right_shoulder', 'right_elbow'],
  ['right_elbow', 'right_wrist'],
  
  // Left leg
  ['left_hip', 'left_knee'],
  ['left_knee', 'left_ankle'],
  
  // Right leg
  ['right_hip', 'right_knee'],
  ['right_knee', 'right_ankle'],
];

// Neon colors for each person (cycling through vibrant colors)
const NEON_COLORS = [
  '#00ff88', // Neon green
  '#ff00ff', // Neon magenta
  '#00ffff', // Neon cyan
  '#ffff00', // Neon yellow
  '#ff6600', // Neon orange
  '#9933ff', // Neon purple
];

export function PoseVisualization({ imageSrc, personsWithPoses }: PoseVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDims, setImageDims] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageSrc) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      // Set canvas size to match image
      canvas.width = img.width;
      canvas.height = img.height;
      setImageDims({ width: img.width, height: img.height });
      
      // Draw the image
      ctx.drawImage(img, 0, 0);
      
      // Draw poses on top
      drawPoses(ctx, personsWithPoses, img.width, img.height);
      setImageLoaded(true);
    };
    
    img.src = imageSrc;
  }, [imageSrc, personsWithPoses]);

  const drawPoses = (
    ctx: CanvasRenderingContext2D,
    persons: PersonWithPose[],
    width: number,
    height: number
  ) => {
    persons.forEach((person, personIdx) => {
      const color = NEON_COLORS[personIdx % NEON_COLORS.length];
      const pose = person.pose;
      
      // Draw skeleton connections
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      
      POSE_CONNECTIONS.forEach(([start, end]) => {
        const startKp = pose.keypoints.find(kp => kp.name === start);
        const endKp = pose.keypoints.find(kp => kp.name === end);
        
        if (startKp && endKp && 
            startKp.score && startKp.score > 0.3 && 
            endKp.score && endKp.score > 0.3) {
          ctx.beginPath();
          ctx.moveTo(startKp.x, startKp.y);
          ctx.lineTo(endKp.x, endKp.y);
          ctx.stroke();
        }
      });
      
      // Draw keypoints as glowing circles
      ctx.shadowBlur = 15;
      pose.keypoints.forEach(kp => {
        if (kp.score && kp.score > 0.3) {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(kp.x, kp.y, 5, 0, 2 * Math.PI);
          ctx.fill();
        }
      });
      
      // Reset shadow
      ctx.shadowBlur = 0;
      
      // Draw person ID label
      const labelX = person.bbox.x + person.bbox.w / 2;
      const labelY = person.bbox.y - 10;
      
      ctx.fillStyle = color;
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 4;
      ctx.fillText(`Person ${personIdx + 1}`, labelX, labelY);
      ctx.shadowBlur = 0;
    });
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-zinc-950 rounded-xl overflow-hidden">
      <canvas
        ref={canvasRef}
        className="max-w-full max-h-full object-contain animate-fade-in"
        style={{
          filter: 'brightness(1.1) contrast(1.05)',
        }}
      />
      
      {!imageLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-zinc-400 text-sm">Analyzing body poses...</p>
          </div>
        </div>
      )}
      
      {imageLoaded && personsWithPoses.length > 0 && (
        <div className="absolute bottom-4 left-4 bg-zinc-900/90 backdrop-blur-sm rounded-lg px-4 py-2 border border-zinc-800">
          <p className="text-zinc-300 text-xs font-medium">
            🔍 Detected {personsWithPoses.length} {personsWithPoses.length === 1 ? 'person' : 'people'} with full body tracking
          </p>
        </div>
      )}
    </div>
  );
}
