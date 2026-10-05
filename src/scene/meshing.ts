import { pitchRadius } from './gearGeometry';

/**
 * Gear trains that actually mesh.
 *
 * Two involute gears mesh when two things hold: they share a module, so their
 * teeth are the same size, and their pitch circles touch. The first is a
 * matter of specifying a gear by its tooth count and deriving its size; the
 * second gives the centre distance exactly, with nothing to tune. What is left
 * is keeping them in step as they turn, which is the rest of this file.
 */

const TAU = Math.PI * 2;

/**
 * Tooth size, as viewport-height units per module.
 *
 * Every gear in a train has to share it, which is why a gear is specified by
 * its tooth count and has its radius derived, rather than the other way round:
 * a radius chosen by eye gives a fractional tooth count and nothing lines up.
 */
export const MODULE = 0.019;

/** The pitch radius of a gear with this many teeth. */
export function radiusFor(teeth: number): number {
  return pitchRadius(teeth, MODULE);
}

/**
 * How far apart two meshing gears' centres sit: their pitch circles touch.
 *
 * Exact rather than tuned. An earlier trapezoidal profile had no pitch circle
 * to speak of and needed a fudged separation picked from a band, which is the
 * sort of constant that works for the pairs in front of you and fails for the
 * next one. An involute pair has one correct answer.
 */
export function centreDistance(teethA: number, teethB: number): number {
  return radiusFor(teethA) + radiusFor(teethB);
}

/**
 * The rotation a driven gear must be at, given its driver.
 *
 * The standing mesh condition for two external gears whose centres lie along
 * `alpha`. Writing the driver as having a tooth on the line of centres and the
 * driven a gap, and letting both turn, the quantity that stays fixed is:
 *
 *     Na·(φa − α) + Nb·(φb − α) ≡ π·(Nb − 1)   (mod 2π)
 *
 * The `Nb − 1` matters. Against a bare `π` the pair is half a tooth out
 * whenever the driven gear has an odd number of teeth, which lands tooth on
 * tooth instead of tooth in gap — the gears look plausible while standing
 * still and grind straight through each other as soon as they turn.
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
  return alpha + (Math.PI * (drivenTeeth - 1) - driverTeeth * (driverAngle - alpha)) / drivenTeeth;
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
