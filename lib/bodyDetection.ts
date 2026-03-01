"use client";

import * as poseDetection from '@tensorflow-models/pose-detection';
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';

export interface Keypoint {
  x: number;
  y: number;
  score?: number;
  name?: string;
}

export interface Pose {
  keypoints: Keypoint[];
  score?: number;
}

export interface PersonWithPose {
  faceId: string;
  pose: Pose;
  bbox: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
}

// Cache the detector
let cachedDetector: poseDetection.PoseDetector | null = null;

/**
 * Load the MoveNet pose detection model
 * MoveNet is fast and accurate for detecting body poses
 */
async function loadPoseDetector(): Promise<poseDetection.PoseDetector> {
  if (cachedDetector) return cachedDetector;
  
  try {
    // Ensure WebGL backend is ready
    await tf.ready();
    await tf.setBackend('webgl');
    
    console.log('[PoseDetection] Loading MoveNet model...');
    
    const detectorConfig: poseDetection.MoveNetModelConfig = {
      modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
      enableSmoothing: true,
    };
    
    cachedDetector = await poseDetection.createDetector(
      poseDetection.SupportedModels.MoveNet,
      detectorConfig
    );
    
    console.log('[PoseDetection] Model loaded successfully');
    return cachedDetector;
  } catch (error) {
    console.error('[PoseDetection] Failed to load model:', error);
    throw error;
  }
}

/**
 * Detect body poses for all people in the image
 * Returns pose keypoints (17 points: nose, eyes, ears, shoulders, elbows, wrists, hips, knees, ankles)
 */
export async function detectPoses(imageSrc: string): Promise<Pose[]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    
    img.onload = async () => {
      try {
        const detector = await loadPoseDetector();
        
        console.log('[PoseDetection] Detecting poses...');
        const poses = await detector.estimatePoses(img);
        console.log(`[PoseDetection] Detected ${poses.length} poses`);
        
        // Filter poses with low confidence
        const validPoses = poses.filter(pose => 
          pose.score && pose.score > 0.3
        );
        
        console.log(`[PoseDetection] ${validPoses.length} valid poses after filtering`);
        resolve(validPoses as Pose[]);
      } catch (error) {
        console.error('[PoseDetection] Error detecting poses:', error);
        resolve([]);
      }
    };
    
    img.onerror = () => {
      console.error('[PoseDetection] Error loading image');
      resolve([]);
    };
    
    img.src = imageSrc;
  });
}

/**
 * Match detected faces to detected poses based on proximity
 * Matches face bounding boxes to pose head keypoints
 */
export function matchFacesToPoses(
  faces: Array<{ id: string; bbox: { x: number; y: number; w: number; h: number } }>,
  poses: Pose[]
): PersonWithPose[] {
  const matched: PersonWithPose[] = [];
  const usedPoses = new Set<number>();
  
  // For each face, find the closest pose
  for (const face of faces) {
    const faceCenterX = face.bbox.x + face.bbox.w / 2;
    const faceCenterY = face.bbox.y + face.bbox.h / 2;
    
    let closestPoseIdx = -1;
    let minDistance = Infinity;
    
    poses.forEach((pose, idx) => {
      if (usedPoses.has(idx)) return;
      
      // Find nose keypoint (or eyes if nose not available)
      const nose = pose.keypoints.find(kp => kp.name === 'nose');
      const leftEye = pose.keypoints.find(kp => kp.name === 'left_eye');
      const rightEye = pose.keypoints.find(kp => kp.name === 'right_eye');
      
      const headPoint = nose || leftEye || rightEye;
      if (!headPoint) return;
      
      const distance = Math.sqrt(
        Math.pow(headPoint.x - faceCenterX, 2) +
        Math.pow(headPoint.y - faceCenterY, 2)
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        closestPoseIdx = idx;
      }
    });
    
    if (closestPoseIdx >= 0 && minDistance < 150) {
      usedPoses.add(closestPoseIdx);
      
      // Calculate body bounding box from keypoints
      const keypoints = poses[closestPoseIdx].keypoints;
      const xs = keypoints.map(kp => kp.x);
      const ys = keypoints.map(kp => kp.y);
      
      matched.push({
        faceId: face.id,
        pose: poses[closestPoseIdx],
        bbox: {
          x: Math.min(...xs),
          y: Math.min(...ys),
          w: Math.max(...xs) - Math.min(...xs),
          h: Math.max(...ys) - Math.min(...ys),
        },
      });
    }
  }
  
  return matched;
}

/**
 * Analyze body language from pose keypoints
 * Returns metrics like openness, confidence, space occupation
 */
export function analyzeBodyLanguage(pose: Pose): {
  openness: number;
  confidence: number;
  spaceOccupation: number;
} {
  const kp = pose.keypoints;
  
  // Find key body parts
  const leftShoulder = kp.find(k => k.name === 'left_shoulder');
  const rightShoulder = kp.find(k => k.name === 'right_shoulder');
  const leftHip = kp.find(k => k.name === 'left_hip');
  const rightHip = kp.find(k => k.name === 'right_hip');
  const leftWrist = kp.find(k => k.name === 'left_wrist');
  const rightWrist = kp.find(k => k.name === 'right_wrist');
  
  // Calculate shoulder width (openness indicator)
  let openness = 50;
  if (leftShoulder && rightShoulder) {
    const shoulderWidth = Math.abs(rightShoulder.x - leftShoulder.x);
    openness = Math.min(95, Math.max(20, shoulderWidth / 2));
  }
  
  // Calculate vertical alignment (confidence/posture indicator)
  let confidence = 50;
  if (leftShoulder && rightShoulder && leftHip && rightHip) {
    const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2;
    const hipMidY = (leftHip.y + rightHip.y) / 2;
    const torsoHeight = Math.abs(hipMidY - shoulderMidY);
    confidence = Math.min(95, Math.max(25, torsoHeight / 2));
  }
  
  // Calculate space occupation (arms extended = more space)
  let spaceOccupation = 50;
  if (leftWrist && rightWrist && leftShoulder && rightShoulder) {
    const armSpan = Math.abs(rightWrist.x - leftWrist.x);
    const shoulderSpan = Math.abs(rightShoulder.x - leftShoulder.x);
    const armExtension = armSpan / (shoulderSpan || 1);
    spaceOccupation = Math.min(95, Math.max(20, armExtension * 40));
  }
  
  return {
    openness: Math.round(openness),
    confidence: Math.round(confidence),
    spaceOccupation: Math.round(spaceOccupation),
  };
}
