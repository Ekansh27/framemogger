/**
 * Face Mesh Geometry Generator
 * Creates parametric face landmarks from bounding boxes for scanning overlay
 * Generates an approximate 3D face mesh suitable for visualization
 */

export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D {
  x: number;
  y: number;
  z: number; // 0-1, for depth ordering
}

export interface FaceMesh {
  vertices: Point3D[];
  edges: Array<[number, number]>; // vertex indices
  triangles: Array<[number, number, number]>; // vertex indices (optional, for fill)
}

/**
 * Generate approximate 3D face mesh from bounding box
 * Creates a wireframe using parametric curves (ellipse-based face contour)
 * with internal facial features (eyes, nose, mouth grid)
 */
export function generateFaceMeshFromBBox(
  bbox: { x: number; y: number; w: number; h: number },
  imageWidth: number,
  imageHeight: number
): FaceMesh {
  const cx = bbox.x + bbox.w / 2; // center x
  const cy = bbox.y + bbox.h / 2; // center y
  const w = bbox.w;
  const h = bbox.h;
  const aspect = w / h; // width-to-height ratio

  const vertices: Point3D[] = [];
  const edges: Array<[number, number]> = [];

  // 1. Face contour (outer boundary) - 32 points around face ellipse
  const contourPoints = 32;
  const contourIndices: number[] = [];
  for (let i = 0; i < contourPoints; i++) {
    const angle = (i / contourPoints) * Math.PI * 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    // Ellipse with slight chin tapering (cheek to jaw narrowing)
    const xScale = w * 0.5 * (0.9 + 0.1 * Math.cos(angle * 2));
    const yScale = h * 0.45;

    const vx = cx + xScale * cos;
    const vy = cy + yScale * sin * (sin > 0 ? 1.1 : 1); // jaw is slightly wider

    // Simple depth: front-center is closer (z ~0.8-1), edges further back (z ~0.4-0.6)
    const depthFromEdge = Math.pow(1 - Math.abs(cos), 1.5);
    const z = 0.4 + depthFromEdge * 0.6;

    const idx = vertices.length;
    contourIndices.push(idx);
    vertices.push({ x: vx, y: vy, z });
  }

  // Connect contour points in a loop
  for (let i = 0; i < contourPoints; i++) {
    edges.push([contourIndices[i], contourIndices[(i + 1) % contourPoints]]);
  }

  // 2. Inner face divisions - vertical and horizontal grid lines
  const vMidIdx = vertices.length;
  vertices.push({ x: cx, y: cy - h * 0.15, z: 0.85 }); // center top
  vertices.push({ x: cx, y: cy + h * 0.2, z: 0.9 }); // center bottom

  // Left and right inner verticals
  const leftInnerIdx = vertices.length;
  vertices.push({ x: cx - w * 0.25, y: cy - h * 0.15, z: 0.7 });
  const leftInnerIdx2 = vertices.length;
  vertices.push({ x: cx - w * 0.25, y: cy + h * 0.2, z: 0.75 });

  const rightInnerIdx = vertices.length;
  vertices.push({ x: cx + w * 0.25, y: cy - h * 0.15, z: 0.7 });
  const rightInnerIdx2 = vertices.length;
  vertices.push({ x: cx + w * 0.25, y: cy + h * 0.2, z: 0.75 });

  // Connect vertical lines through face center
  edges.push([vMidIdx, vMidIdx + 1]); // center
  edges.push([leftInnerIdx, leftInnerIdx2]); // left
  edges.push([rightInnerIdx, rightInnerIdx2]); // right

  // Connect verts to nearby contour points (radial)
  edges.push([contourIndices[0], vMidIdx]); // top center to top contour
  edges.push([contourIndices[16], vMidIdx + 1]); // bottom to bottom contour
  edges.push([contourIndices[8], leftInnerIdx]); // left to left contour
  edges.push([contourIndices[24], rightInnerIdx]); // right to right contour

  // 3. Eye region (2 ellipses)
  const eyeDistance = w * 0.2;
  const eyeWidth = w * 0.1;
  const eyeHeight = h * 0.08;
  const eyeY = cy - h * 0.12;

  // Left eye
  const leftEyeCenter = vertices.length;
  vertices.push({ x: cx - eyeDistance, y: eyeY, z: 0.9 });
  const leftEyePoints = generateEllipseVertices(
    cx - eyeDistance,
    eyeY,
    eyeWidth,
    eyeHeight,
    8,
    0.92,
    vertices
  );
  edges.push([leftEyeCenter, leftEyePoints[0]]);
  for (let i = 0; i < leftEyePoints.length; i++) {
    edges.push([leftEyePoints[i], leftEyePoints[(i + 1) % leftEyePoints.length]]);
  }

  // Right eye
  const rightEyeCenter = vertices.length;
  vertices.push({ x: cx + eyeDistance, y: eyeY, z: 0.9 });
  const rightEyePoints = generateEllipseVertices(
    cx + eyeDistance,
    eyeY,
    eyeWidth,
    eyeHeight,
    8,
    0.92,
    vertices
  );
  edges.push([rightEyeCenter, rightEyePoints[0]]);
  for (let i = 0; i < rightEyePoints.length; i++) {
    edges.push([rightEyePoints[i], rightEyePoints[(i + 1) % rightEyePoints.length]]);
  }

  // 4. Nose region (simple bridge + tip)
  const noseBridgeIdx = vertices.length;
  vertices.push({ x: cx, y: cy - h * 0.02, z: 0.95 });
  const noseTipIdx = vertices.length;
  vertices.push({ x: cx, y: cy + h * 0.05, z: 0.93 });

  edges.push([noseBridgeIdx, noseTipIdx]); // nose bridge to tip
  edges.push([contourIndices[5], noseBridgeIdx]); // connect to contour
  edges.push([contourIndices[27], noseTipIdx]); // connect to contour

  // 5. Mouth region (subtle curve)
  const mouthWidth = w * 0.2;
  const mouthY = cy + h * 0.15;
  const mouthPoints = generateEllipseVertices(cx, mouthY, mouthWidth, h * 0.04, 12, 0.85, vertices);
  for (let i = 0; i < mouthPoints.length; i++) {
    edges.push([mouthPoints[i], mouthPoints[(i + 1) % mouthPoints.length]]);
  }

  // Connect mouth to nearby contour
  edges.push([contourIndices[16], mouthPoints[0]]);
  edges.push([contourIndices[16], mouthPoints[6]]);

  return { vertices, edges, triangles: [] };
}

/**
 * Generate ellipse vertices and add to vertex list
 * Returns indices of added vertices
 */
function generateEllipseVertices(
  cx: number,
  cy: number,
  radiusX: number,
  radiusY: number,
  segments: number,
  depth: number,
  vertices: Point3D[]
): number[] {
  const indices: number[] = [];
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const vx = cx + radiusX * Math.cos(angle);
    const vy = cy + radiusY * Math.sin(angle);

    indices.push(vertices.length);
    vertices.push({ x: vx, y: vy, z: depth });
  }
  return indices;
}

/**
 * Apply time-based animation to mesh (vertex pulsing, jitter)
 * Returns new vertices with animated positions based on elapsed time
 */
export function animateMesh(mesh: FaceMesh, elapsedMs: number, intensity: number = 1): FaceMesh {
  const timeS = elapsedMs / 1000;

  const animatedVertices = mesh.vertices.map((v, idx) => {
    // Subtle oscillation based on depth (farther back = slower oscillation)
    const depthFreq = 1 + v.z * 2; // 0.4-1.0 z → 1.4-3.0 freq
    const pulse = Math.sin(timeS * depthFreq * Math.PI) * 0.3 * intensity * (1 - v.z);

    // Spatial jitter (subtle wiggle)
    const jitterX =
      Math.sin(timeS * 2.5 + idx * 0.5) * 0.4 * intensity * (1 - v.z) * v.z;
    const jitterY =
      Math.cos(timeS * 2.0 + idx * 0.7) * 0.3 * intensity * (1 - v.z) * v.z;

    return {
      x: v.x + jitterX,
      y: v.y + jitterY + pulse,
      z: v.z,
    };
  });

  return { ...mesh, vertices: animatedVertices };
}
