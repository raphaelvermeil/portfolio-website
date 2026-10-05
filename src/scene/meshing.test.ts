import { describe, expect, it } from 'vitest';
import { gearOutline, pitchRadius, tipRadius } from './gearGeometry';
import { MODULE, centreDistance, meshedAngle, nearestGapAngle, nearestToothAngle, radiusFor } from './meshing';

const TAU = Math.PI * 2;

/**
 * How deeply two meshing gears overlap, in modules, over a full turn.
 *
 * A gear outline is star-shaped about its centre — exactly one boundary point
 * per direction — so "is this point inside that gear" reduces to comparing a
 * radius against the boundary radius at that angle, which is what makes
 * sweeping a whole rotation cheap enough for a test.
 *
 * This is the check that matters. Asserting things *about* the phase formula
 * is easy to get vacuously right; driving two real outlines through each other
 * and looking for overlap is not.
 */
function deepestOverlap(
  driverTeeth: number,
  drivenTeeth: number,
  alpha: number,
  steps = 180,
  phase: (a: number, pa: number, b: number, al: number) => number = meshedAngle,
): number {
  const outlineOf = (teeth: number) => gearOutline(teeth, MODULE).map((p) => [p.x, p.y] as const);

  /** Boundary radius of a gear at a given angle in its own frame. */
  const boundary = (teeth: number) => {
    const polar = outlineOf(teeth)
      .map(([x, y]) => [Math.atan2(y, x), Math.hypot(x, y)] as const)
      .sort((a, b) => a[0] - b[0]);
    return (angle: number) => {
      let a = ((angle % TAU) + TAU) % TAU;
      if (a > Math.PI) a -= TAU;
      if (a <= polar[0][0] || a >= polar[polar.length - 1][0]) {
        return Math.min(polar[0][1], polar[polar.length - 1][1]);
      }
      let lo = 0;
      let hi = polar.length - 1;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (polar[mid][0] <= a) lo = mid;
        else hi = mid;
      }
      const [a0, r0] = polar[lo];
      const [a1, r1] = polar[hi];
      return r0 + ((r1 - r0) * (a - a0)) / (a1 - a0 || 1);
    };
  };

  const distance = centreDistance(driverTeeth, drivenTeeth);
  const driver = outlineOf(driverTeeth);
  const driven = outlineOf(drivenTeeth);
  const onDriver = boundary(driverTeeth);
  const onDriven = boundary(drivenTeeth);
  const cx = Math.cos(alpha) * distance;
  const cy = Math.sin(alpha) * distance;
  let deepest = 0;

  for (let s = 0; s < steps; s++) {
    const a = (s / steps) * TAU;
    const b = phase(driverTeeth, a, drivenTeeth, alpha);
    for (const [x, y] of driver) {
      const wx = x * Math.cos(a) - y * Math.sin(a) - cx;
      const wy = x * Math.sin(a) + y * Math.cos(a) - cy;
      const surface = onDriven(Math.atan2(wy, wx) - b);
      deepest = Math.max(deepest, (surface - Math.hypot(wx, wy)) / MODULE);
    }
    for (const [x, y] of driven) {
      const wx = x * Math.cos(b) - y * Math.sin(b) + cx;
      const wy = x * Math.sin(b) + y * Math.cos(b) + cy;
      const surface = onDriver(Math.atan2(wy, wx) - a);
      deepest = Math.max(deepest, (surface - Math.hypot(wx, wy)) / MODULE);
    }
  }
  return deepest;
}

/** Exactly the pairs and angles the gear field lays out. */
const IN_USE = [
  [18, 13, 250],
  [22, 11, -50],
  [11, 15, -120],
] as const;

describe('radiusFor', () => {
  it('ties radius to tooth count, so every gear shares a tooth size', () => {
    expect(radiusFor(20) / 20).toBeCloseTo(MODULE / 2, 12);
    expect(radiusFor(11) / 11).toBeCloseTo(radiusFor(29) / 29, 12);
  });
});

describe('centreDistance', () => {
  it('sits the pitch circles exactly touching', () => {
    expect(centreDistance(18, 13)).toBeCloseTo(pitchRadius(18, MODULE) + pitchRadius(13, MODULE), 12);
  });

  it('is symmetric, since a pair has one spacing however it is named', () => {
    expect(centreDistance(18, 13)).toBeCloseTo(centreDistance(13, 18), 12);
  });

  it('overlaps the tip circles, so the teeth interleave rather than graze', () => {
    for (const [a, b] of IN_USE) {
      expect(centreDistance(a, b)).toBeLessThan(tipRadius(a, MODULE) + tipRadius(b, MODULE));
    }
  });
});

describe('meshedAngle', () => {
  it('turns the driven gear the opposite way', () => {
    const a = meshedAngle(20, 0, 12, 0.4);
    const b = meshedAngle(20, 0.01, 12, 0.4);
    expect(b - a).toBeLessThan(0);
  });

  it('gears the speeds by the inverse tooth ratio', () => {
    const step = 0.01;
    const a = meshedAngle(24, 0, 8, 1.1);
    const b = meshedAngle(24, step, 8, 1.1);
    expect((b - a) / step).toBeCloseTo(-3, 9);
  });

  it('is reversible, once the line of centres is reversed with it', () => {
    // Swapping driver and driven also swaps which way the centres lie, so the
    // return trip is along alpha + pi. With the same alpha it does not come
    // back, and that is correct rather than a bug: the formula is written from
    // the driver's end of the line.
    const driven = meshedAngle(16, 0.55, 10, 2.1);
    const back = meshedAngle(10, driven, 16, 2.1 + Math.PI);
    expect((back - 0.55) / TAU).toBeCloseTo(Math.round((back - 0.55) / TAU), 9);
  });

  it('puts a tooth of the driver into a gap of the driven', () => {
    // The phase constant is pi*(Nb - 1), not pi. Against a bare pi the pair is
    // half a tooth out whenever the driven gear has an odd tooth count, which
    // lands tooth on tooth. All three pairs in use have odd driven counts.
    for (const [Na, Nb, degrees] of IN_USE) {
      const alpha = (degrees * Math.PI) / 180;
      for (let driver = 0; driver < TAU; driver += 0.11) {
        const driven = meshedAngle(Na, driver, Nb, alpha);
        const toothOffset = nearestToothAngle(Na, driver, alpha) - alpha;
        const gapOffset = nearestGapAngle(Nb, driven, alpha + Math.PI) - (alpha + Math.PI);
        // Where the driver's tooth sits relative to the line of centres, the
        // driven's gap sits by the same amount the other way: that is what
        // keeps one inside the other instead of alongside it.
        const drift = toothOffset * Na + gapOffset * Nb;
        expect(Math.abs(drift)).toBeLessThan(0.02);
      }
    }
  });
});

describe('teeth do not clip', () => {
  it.each(IN_USE)('%i against %i stays out of its neighbour', (a, b, degrees) => {
    expect(deepestOverlap(a, b, (degrees * Math.PI) / 180)).toBeLessThanOrEqual(1e-9);
  });

  it('catches a phase that is half a tooth out', () => {
    // A check on the check. The previous phase formula used a bare pi, which
    // is right only for an even driven tooth count; every pair here has an odd
    // one. Run with it and the gears must drive straight through each other,
    // or passing the test above means nothing.
    const bare = (a: number, pa: number, b: number, al: number) =>
      al + (Math.PI - a * (pa - al)) / b;
    for (const [a, b, degrees] of IN_USE) {
      const overlap = deepestOverlap(a, b, (degrees * Math.PI) / 180, 90, bare);
      // Tooth tip against tooth tip is the full two addenda of overlap.
      expect(overlap, `${a}x${b}`).toBeGreaterThan(1);
    }
  });

  it('stays clear for tooth counts the layout does not use yet', () => {
    // Loose tolerance on purpose: a few extreme ratios touch by a few
    // hundredths of a module, which is far under a pixel on screen. The point
    // is that nothing grinds, not that every pair is perfect.
    for (const [a, b] of [[9, 26], [26, 9], [12, 12], [20, 14], [16, 25]] as const) {
      expect(deepestOverlap(a, b, 0.65, 90), `${a}x${b}`).toBeLessThan(0.05);
    }
  });
});
