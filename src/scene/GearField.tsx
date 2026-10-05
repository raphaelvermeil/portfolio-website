import { Line } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import { DoubleSide, Vector3, type Group } from 'three';
import { BORE_RATIO, createGearGeometry, gearOutline } from './gearGeometry';
import { BACKGROUND, INK } from './theme';

/** Scroll progress of the passage the gears flank, 0 to 1. Written on scroll, read per frame. */
const progress = { current: 0 };

/** Just enough extrusion to sit the fill behind the drawing; the gears are seen face on. */
const DEPTH = 0.04;
/** Hairline, like a drafted plate. */
const STROKE = 1;
const TAU = Math.PI * 2;

interface GearSpec {
  /** -1 puts it against the left edge, 1 the right. */
  side: -1 | 1;
  /** How far the centre sits inside that edge, as a share of viewport height.
   *  Small values let the edge crop the gear; negative pushes it fully out. */
  inset: number;
  /** Height above centre, as a share of viewport height. */
  y: number;
  /** Radius, as a share of viewport height. */
  radius: number;
  /** Tooth count. */
  teeth: number;
  /** Spokes between hub and rim; also sets how many bolt holes are drawn. */
  spokes: number;
  /** Full turns across the whole passage; sign sets the direction. */
  turns: number;
  /** Where it starts, in turns, so the teeth do not all line up. */
  phase: number;
}

/**
 * Giant gears flanking the passage, cropped by the edges of the frame.
 *
 * Everything is a share of viewport height rather than a world unit, so the
 * composition holds at any window size: a gear sized in absolute units is
 * either tiny on a monitor or swallows a laptop screen.
 *
 * Neighbours turn in opposite directions. They are too far apart to really
 * mesh, but same-direction neighbours read as a conveyor rather than a
 * mechanism.
 */
const GEARS: GearSpec[] = [
  { side: -1, inset: 0.16, y: 0.1, radius: 0.19, teeth: 18, spokes: 5, turns: 0.5, phase: 0 },
  { side: -1, inset: 0.05, y: -0.23, radius: 0.145, teeth: 14, spokes: 4, turns: -0.74, phase: 0.3 },
  { side: 1, inset: 0.24, y: 0.17, radius: 0.23, teeth: 22, spokes: 6, turns: -0.46, phase: 0.15 },
  { side: 1, inset: -0.02, y: 0.05, radius: 0.1, teeth: 11, spokes: 3, turns: 0.9, phase: 0.6 },
  { side: 1, inset: 0.07, y: -0.24, radius: 0.15, teeth: 15, spokes: 5, turns: 0.62, phase: 0.45 },
];

/** Concentric detail as fractions of the radius: rim, web, hub. */
const RINGS = [0.68, 0.52, 0.42];
/** Where the bolt circle sits, and how big each hole is. */
const BOLT_CIRCLE = 0.47;
const BOLT_HOLE = 0.045;

function OneGear({ spec, unit, halfWidth }: { spec: GearSpec; unit: number; halfWidth: number }) {
  const group = useRef<Group>(null);
  const radius = spec.radius * unit;

  const geometry = useMemo(
    () => createGearGeometry(radius, spec.teeth, radius * DEPTH),
    [radius, spec.teeth],
  );

  /**
   * The drawing, as flat loops in the gear's own plane.
   *
   * Seen face on there is no extrusion to show, so the depth the old machine
   * got from its silhouette has to come from draughting instead: root circle,
   * web, hub, bolt circle and spokes. At hairline weight a bare tooth outline
   * is a cog symbol, not a drawing.
   */
  const { loops, arms } = useMemo(() => {
    const z = (radius * DEPTH) / 2 + 0.002;
    const circle = (r: number, segments = 72) =>
      Array.from({ length: segments + 1 }, (_, i) => {
        const a = (i / segments) * TAU;
        return new Vector3(Math.cos(a) * r, Math.sin(a) * r, z);
      });

    const flat = gearOutline(radius, spec.teeth);
    const teeth = [...flat.map((p) => new Vector3(p.x, p.y, z)), new Vector3(flat[0].x, flat[0].y, z)];

    const holes = Array.from({ length: spec.spokes * 2 }, (_, i) => {
      const a = ((i + 0.5) / (spec.spokes * 2)) * TAU;
      const cx = Math.cos(a) * radius * BOLT_CIRCLE;
      const cy = Math.sin(a) * radius * BOLT_CIRCLE;
      return circle(radius * BOLT_HOLE, 20).map((p) => new Vector3(p.x + cx, p.y + cy, z));
    });

    // Paired points: drei draws these as separate segments, not one polyline.
    const spokeEnds: Vector3[] = [];
    for (let i = 0; i < spec.spokes; i++) {
      const a = (i / spec.spokes) * TAU;
      spokeEnds.push(new Vector3(Math.cos(a) * radius * RINGS[2], Math.sin(a) * radius * RINGS[2], z));
      spokeEnds.push(new Vector3(Math.cos(a) * radius * RINGS[0], Math.sin(a) * radius * RINGS[0], z));
    }

    return {
      // No root circle: the tooth outline already traces it between the teeth,
      // and a second line there cuts across the tooth bases, which makes them
      // read as loose rectangles sitting on a disc.
      loops: [teeth, ...RINGS.map((r) => circle(radius * r)), circle(radius * BORE_RATIO), ...holes],
      arms: spokeEnds,
    };
  }, [radius, spec.teeth, spec.spokes]);

  useFrame(() => {
    if (group.current) group.current.rotation.z = (spec.phase + progress.current * spec.turns) * TAU;
  });

  return (
    <group position={[spec.side * (halfWidth - spec.inset * unit), spec.y * unit, 0]}>
      <group ref={group}>
        {/* Background-coloured and opaque: it adds no tone, it just hides what
            is behind it, which is what keeps overlapping gears legible. */}
        <mesh geometry={geometry}>
          <meshBasicMaterial color={BACKGROUND} side={DoubleSide} polygonOffset polygonOffsetFactor={1} />
        </mesh>
        {loops.map((points, i) => (
          <Line key={i} points={points} color={INK} lineWidth={STROKE} toneMapped={false} />
        ))}
        <Line points={arms} segments color={INK} lineWidth={STROKE} toneMapped={false} />
      </group>
    </group>
  );
}

function Gears() {
  const { width, height } = useThree((s) => s.viewport);
  return (
    <>
      {GEARS.map((spec, i) => (
        <OneGear key={i} spec={spec} unit={height} halfWidth={width / 2} />
      ))}
    </>
  );
}

/** Tracks how far the reader has moved through the passage. */
function useSectionProgress(selector: string) {
  useEffect(() => {
    const read = () => {
      const node = document.querySelector(selector);
      if (!node) return;
      const { top, height } = node.getBoundingClientRect();
      const runway = height - window.innerHeight;
      progress.current = runway <= 0 ? (top <= 0 ? 1 : 0) : Math.min(1, Math.max(0, -top / runway));
    };
    read();
    window.addEventListener('scroll', read, { passive: true });
    window.addEventListener('resize', read);
    return () => {
      window.removeEventListener('scroll', read);
      window.removeEventListener('resize', read);
    };
  }, [selector]);
}

/**
 * The gears beside the about passage, turning as it is read.
 *
 * Orthographic and face on. The gears sit at the edges of the frame and have to
 * stay there; under perspective their apparent position would drift with the
 * window's aspect, and placing them would mean solving for the frustum instead
 * of naming a fraction of the viewport. Face on also keeps them in the plane of
 * the text, so they read as part of the page rather than a render behind it.
 */
export function GearField({ section }: { section: string }) {
  const [running, setRunning] = useState<'always' | 'never'>('always');
  useSectionProgress(section);

  useEffect(() => {
    const onVisibility = () => setRunning(document.hidden ? 'never' : 'always');
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  return (
    <div className="gearfield" aria-hidden="true">
      <Canvas
        orthographic
        dpr={[1, 2]}
        frameloop={running}
        camera={{ position: [0, 0, 10], zoom: 100, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: true }}
      >
        <Gears />
      </Canvas>
    </div>
  );
}
