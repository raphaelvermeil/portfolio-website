const TAU = Math.PI * 2;

/** How a whole part moves about the machine axis. */
export type PartMotion =
  | { kind: 'still' }
  /** Continuous rotation, in turns per second; sign sets the direction. */
  | { kind: 'spin'; turnsPerSecond: number }
  /** Escapement: holds, then snaps on by one step. */
  | { kind: 'tick'; steps: number; ticksPerSecond: number; direction?: 1 | -1 }
  /** Rocks back and forth, like a balance wheel. */
  | { kind: 'rock'; degrees: number; hz: number };

/** How one sub-assembly moves within its part. */
export type MoverMotion =
  /** Slides along the machine axis, driven like a crank throw. */
  | { kind: 'reciprocate'; travel: number; hz: number; phase: number }
  /** Turns about its own centre. */
  | { kind: 'spin'; turnsPerSecond: number };

/**
 * A tick holds still then snaps: the step lands early in the beat and the
 * remainder of the beat is dwell, which is what makes it read as a clock
 * rather than a slow spin.
 */
const SNAP_FRACTION = 0.18;

function snap(progress: number): number {
  return progress >= SNAP_FRACTION ? 1 : progress / SNAP_FRACTION;
}

/** Rotation of a part about the machine axis, in radians, at time `t` seconds. */
export function partAngle(motion: PartMotion, t: number): number {
  switch (motion.kind) {
    case 'still':
      return 0;
    case 'spin':
      return motion.turnsPerSecond * TAU * t;
    case 'rock':
      return ((motion.degrees * Math.PI) / 180) * Math.sin(TAU * motion.hz * t);
    case 'tick': {
      const beat = t * motion.ticksPerSecond;
      const whole = Math.floor(beat);
      const step = TAU / motion.steps;
      return (whole + snap(beat - whole)) * step * (motion.direction ?? 1);
    }
  }
}

/** Rotation of a mover about its own centre, in radians. */
export function moverAngle(motion: MoverMotion, t: number): number {
  return motion.kind === 'spin' ? motion.turnsPerSecond * TAU * t : 0;
}

/** Offset of a mover along the machine axis, in scene units. */
export function moverOffset(motion: MoverMotion, t: number): number {
  if (motion.kind !== 'reciprocate') return 0;
  return motion.travel * Math.sin(TAU * (motion.hz * t + motion.phase));
}
