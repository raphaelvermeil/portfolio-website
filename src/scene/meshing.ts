/**
 * Gear trains that actually mesh.
 *
 * Two external gears mesh when three things hold at once: they share a tooth
 * size, their centres are exactly the sum of their radii apart, and their
 * rotations are phase-locked so a tooth of one always enters a gap of the
 * other. The first two are layout, the third is this file.
 */

const TAU = Math.PI * 2;

/**
 * Tooth size, as radius per tooth in viewport-height units.
 *
 * Every gear in a train has to share it, which is why a gear is specified by
 * its tooth count and has its radius derived, rather than the other way round:
 * a radius chosen by eye gives a fractional tooth count and nothing lines up.
 */
export const MODULE = 0.0105;

/** The tip radius a gear with this many teeth must have to mesh with the rest. */
export function radiusFor(teeth: number): number {
  return teeth * MODULE;
}

/** Root circle as a fraction of tip radius. Mirrors ROOT_RATIO in gearGeometry. */
const ROOT = 0.82;

/**
 * Closest two gears may sit before the taller teeth bottom out in the other's
 * roots. The taller pair governs, which is why this is a max and not a sum.
 */
export function centreDistanceFloor(teethA: number, teethB: number): number {
  const a = radiusFor(teethA);
  const b = radiusFor(teethB);
  return Math.max(a + ROOT * b, b + ROOT * a);
}

/**
 * How far apart two meshing gears' centres sit.
 *
 * Bounded on both sides. Closer than `centreDistanceFloor` and the taller
 * teeth bottom out in the other's roots; further than the tip radii added
 * together and the teeth merely graze, so the pair reads as two gears resting
 * against each other rather than engaged. The midpoint is taken rather than a
 * tuned constant because the band narrows as the tooth ratio grows — at 28:8
 * it is only four percent wide — and one constant that suits a 3:2 pair sits
 * outside the band for a 4:1 one.
 *
 * The midpoint is always valid: the floor is `max + 0.82·min` against a tip sum
 * of `max + min`, so the floor is strictly the smaller for any positive pair.
 *
 * A real involute pair would mesh at exactly the pitch-radius sum; this tooth
 * profile is a drawn trapezoid, so the honest value is whatever engages
 * without collision.
 */
export function centreDistance(teethA: number, teethB: number): number {
  return (centreDistanceFloor(teethA, teethB) + radiusFor(teethA) + radiusFor(teethB)) / 2;
}

/**
 * The rotation a driven gear must be at, given its driver.
 *
 * From the standing mesh condition for two external gears whose centres lie
 * along `alpha`:
 *
 *     Na·(φa − α) + Nb·(φb − α) ≡ π   (mod 2π)
 *
 * Differentiating gives dφb/dφa = −Na/Nb, so solving it afresh each frame
 * delivers the right speed ratio and the right direction for free, and the
 * teeth cannot drift apart over a long scroll the way an independently
 * integrated angle would.
 */
export function meshedAngle(
  driverTeeth: number,
  driverAngle: number,
  drivenTeeth: number,
  alpha: number,
): number {
  return alpha + (Math.PI - driverTeeth * (driverAngle - alpha)) / drivenTeeth;
}

/** Where a tooth tip of a gear points nearest to some direction, as an angle. */
export function nearestToothAngle(teeth: number, angle: number, toward: number): number {
  const pitch = TAU / teeth;
  const k = Math.round((toward - angle) / pitch);
  return angle + k * pitch;
}

/** Where a gap centre of a gear points nearest to some direction, as an angle. */
export function nearestGapAngle(teeth: number, angle: number, toward: number): number {
  const pitch = TAU / teeth;
  const k = Math.round((toward - angle - pitch / 2) / pitch);
  return angle + pitch / 2 + k * pitch;
}
