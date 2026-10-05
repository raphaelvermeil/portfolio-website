import { ExtrudeGeometry, Path, Shape, Vector2 } from 'three';

export const TEETH_PER_UNIT = 14;
export const TEETH_MIN = 8;
export const TEETH_MAX = 28;
export const GEAR_THICKNESS = 0.12;
const ROOT_RATIO = 0.82;
export const BORE_RATIO = 0.3;

export function teethFor(radius: number): number {
  return Math.min(TEETH_MAX, Math.max(TEETH_MIN, Math.round(radius * TEETH_PER_UNIT)));
}

/** Spur-gear outline: per tooth → root, root, tip, tip (flanks slope between). */
export function gearOutline(radius: number, teeth: number): Vector2[] {
  const root = radius * ROOT_RATIO;
  const step = (Math.PI * 2) / teeth;
  const pts: Vector2[] = [];
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    pts.push(polar(root, a));
    pts.push(polar(root, a + step * 0.4));
    pts.push(polar(radius, a + step * 0.5));
    pts.push(polar(radius, a + step * 0.9));
  }
  return pts;
}

function polar(r: number, angle: number): Vector2 {
  return new Vector2(Math.cos(angle) * r, Math.sin(angle) * r);
}

export function createGearGeometry(radius: number, teeth: number, thickness = GEAR_THICKNESS): ExtrudeGeometry {
  const shape = new Shape(gearOutline(radius, teeth));
  const bore = new Path();
  bore.absarc(0, 0, radius * BORE_RATIO, 0, Math.PI * 2, true);
  shape.holes.push(bore);
  const geometry = new ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, curveSegments: 4 });
  geometry.translate(0, 0, -thickness / 2);
  return geometry;
}
