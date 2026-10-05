import { ExtrudeGeometry, Path, Shape, Vector2 } from 'three';

/**
 * Involute spur gears.
 *
 * The profile is an involute of a circle, which is the shape that lets two
 * gears roll against each other without their teeth fighting. It is not
 * decoration: a tooth with straight radial flanks — the obvious way to draw a
 * cog — interferes with its neighbour at every angle of rotation, because the
 * contact point wanders instead of tracking a fixed line of action. An
 * involute pair has conjugate action, so the teeth pass through each other's
 * gaps cleanly however far they turn.
 *
 * Proportions are the standard ones, in modules: addendum 1, dedendum 1.25,
 * 20° pressure angle. The quarter-module difference between the two is the
 * clearance that stops a tip bottoming out in the mating root.
 */

const PRESSURE_ANGLE = (20 * Math.PI) / 180;

/**
 * Tooth height above the pitch circle, in modules. A stub tooth, not the
 * textbook 1.
 *
 * A full-height involute tooth needs about 17 teeth on the mating gear before
 * its tip clears the other's flank; below that the tip digs into the region
 * under the base circle, where the flank is radial rather than involute, and
 * the pair interferes however it is spaced. The gears here have 11 to 22
 * teeth, so the addendum is shortened instead — which is what stub-tooth
 * systems exist for. Measured: 1.0 interferes on every pair, 0.8 on none.
 */
const ADDENDUM = 0.8;
const DEDENDUM = 1.25;
/**
 * Circular backlash in modules: thins each tooth so a pair is never a press
 * fit. Pulls a little more clearance out of the low-tooth-count pairs on top
 * of the stub addendum.
 */
const BACKLASH = 0.08;

const FLANK_SAMPLES = 6;
const TIP_SAMPLES = 2;
const ROOT_SAMPLES = 3;

export const GEAR_THICKNESS = 0.12;
/** Bore radius, as a fraction of the pitch radius. */
export const BORE_RATIO = 0.3;

const TAU = Math.PI * 2;
/** The involute function: how far round the base circle has unwound at angle a. */
const involute = (a: number) => Math.tan(a) - a;

/** Where the teeth are sized from; two gears mesh when their pitch circles touch. */
export function pitchRadius(teeth: number, module: number): number {
  return (module * teeth) / 2;
}

export function tipRadius(teeth: number, module: number): number {
  return pitchRadius(teeth, module) + ADDENDUM * module;
}

export function rootRadius(teeth: number, module: number): number {
  return Math.max(module * 0.2, pitchRadius(teeth, module) - DEDENDUM * module);
}

/**
 * One gear's outline, counter-clockwise, with a tooth centred on angle zero.
 *
 * Each flank is the involute traced outward from the base circle. Below the
 * base circle the involute does not exist, so the flank runs radially down to
 * the root — which is what a real cutter leaves behind on a gear with few
 * enough teeth, and every gear here has few enough.
 */
export function gearOutline(teeth: number, module: number): Vector2[] {
  const pitch = pitchRadius(teeth, module);
  const base = pitch * Math.cos(PRESSURE_ANGLE);
  const tip = tipRadius(teeth, module);
  const root = rootRadius(teeth, module);
  const step = TAU / teeth;

  // Angular half-thickness of a tooth at the pitch circle, less half the
  // backlash. Everything else about the flank follows from this one number.
  const halfAtPitch = ((Math.PI / 2 - BACKLASH) * module) / (2 * pitch);

  /**
   * Half-thickness at radius `r`. Clamping the ratio at 1 is what makes the
   * sub-base part of the flank come out radial: below the base circle the
   * unwound angle is simply zero, so the half-angle stops changing.
   */
  const halfAt = (r: number) =>
    halfAtPitch + involute(PRESSURE_ANGLE) - involute(Math.acos(Math.min(1, base / r)));

  const flank: number[] = [];
  if (root < base) flank.push(root);
  for (let i = 0; i <= FLANK_SAMPLES; i++) {
    flank.push(Math.max(root, base) + (tip - Math.max(root, base)) * (i / FLANK_SAMPLES));
  }

  const halfRoot = halfAt(root);
  const halfTip = halfAt(tip);
  const points: Vector2[] = [];

  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    // Up the leading flank.
    for (const r of flank) points.push(polar(r, a - halfAt(r)));
    // Across the tip.
    for (let k = 1; k <= TIP_SAMPLES; k++) {
      points.push(polar(tip, a - halfTip + (2 * halfTip * k) / (TIP_SAMPLES + 1)));
    }
    // Down the trailing flank.
    for (let k = flank.length - 1; k >= 0; k--) points.push(polar(flank[k], a + halfAt(flank[k])));
    // Round the root to the next tooth.
    const gap = step - 2 * halfRoot;
    for (let k = 1; k <= ROOT_SAMPLES; k++) {
      points.push(polar(root, a + halfRoot + (gap * k) / (ROOT_SAMPLES + 1)));
    }
  }
  return points;
}

function polar(r: number, angle: number): Vector2 {
  return new Vector2(Math.cos(angle) * r, Math.sin(angle) * r);
}

/** A ring of lightening holes through the web, as a drafted plate would have. */
export interface BoltHoles {
  count: number;
  /** Centre of the ring, as a fraction of the pitch radius. */
  circle: number;
  /** Each hole's radius, as a fraction of the pitch radius. */
  size: number;
}

export function createGearGeometry(
  teeth: number,
  module: number,
  thickness = GEAR_THICKNESS,
  bolts?: BoltHoles,
): ExtrudeGeometry {
  const pitch = pitchRadius(teeth, module);
  const shape = new Shape(gearOutline(teeth, module));

  const bore = new Path();
  bore.absarc(0, 0, pitch * BORE_RATIO, 0, TAU, true);
  shape.holes.push(bore);

  // Cut as real holes rather than drawn as circles on the face: the edge pass
  // then gives each one a wall, which is most of what makes the plate read as
  // a solid seen slightly off axis.
  if (bolts) {
    for (let i = 0; i < bolts.count; i++) {
      const a = ((i + 0.5) / bolts.count) * TAU;
      const hole = new Path();
      hole.absarc(
        Math.cos(a) * pitch * bolts.circle,
        Math.sin(a) * pitch * bolts.circle,
        pitch * bolts.size,
        0,
        TAU,
        true,
      );
      shape.holes.push(hole);
    }
  }

  const geometry = new ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, curveSegments: 8 });
  geometry.translate(0, 0, -thickness / 2);
  return geometry;
}
