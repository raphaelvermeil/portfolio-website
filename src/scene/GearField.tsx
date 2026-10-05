import { Line } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import { DoubleSide, Vector3, type Group } from 'three';
import { BORE_RATIO, createGearGeometry, gearOutline } from './gearGeometry';
import { BACKGROUND, GEAR_INK } from './theme';

/** Scroll progress of the passage the gears flank, 0 to 1. Written on scroll, read per frame. */
const progress = { current: 0 };

/** How thick a gear is, as a share of its radius. */
const DEPTH = 0.16;
/** Thickness of the drawn outline, in pixels. */
const STROKE = 6;

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
  /** Tooth count. Few and chunky: these are read as a drawing, not a mechanism. */
  teeth: number;
  /** Full turns across the whole passage; sign sets the direction. */
  turns: number;
  /** Where it starts, in turns, so the teeth do not all line up. */
  phase: number;
}

/**
 * Giant gears flanking the passage, mostly off the edges of the frame.
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
  { side: -1, inset: 0.16, y: 0.1, radius: 0.19, teeth: 9, turns: 0.5, phase: 0 },
  { side: -1, inset: 0.05, y: -0.23, radius: 0.145, teeth: 8, turns: -0.74, phase: 0.3 },
  { side: 1, inset: 0.24, y: 0.17, radius: 0.23, teeth: 10, turns: -0.46, phase: 0.15 },
  { side: 1, inset: -0.02, y: 0.05, radius: 0.1, teeth: 7, turns: 0.9, phase: 0.6 },
  { side: 1, inset: 0.07, y: -0.24, radius: 0.15, teeth: 8, turns: 0.62, phase: 0.45 },
];

const TAU = Math.PI * 2;

function OneGear({ spec, unit, halfWidth }: { spec: GearSpec; unit: number; halfWidth: number }) {
  const group = useRef<Group>(null);
  const radius = spec.radius * unit;
  const depth = radius * DEPTH;
  const teeth = spec.teeth;

  const geometry = useMemo(
    () => createGearGeometry(radius, teeth, depth),
    [radius, depth, teeth],
  );

  /**
   * Both faces are outlined rather than the whole extrusion edge-detected: the
   * tilt offsets them slightly on screen, which is what makes a flat-on gear
   * read as a solid rather than a sticker.
   */
  const loops = useMemo(() => {
    const flat = gearOutline(radius, teeth);
    const ring = (z: number) => [...flat.map((p) => new Vector3(p.x, p.y, z)), new Vector3(flat[0].x, flat[0].y, z)];
    const bore = (z: number) =>
      Array.from({ length: 41 }, (_, i) => {
        const a = (i / 40) * TAU;
        return new Vector3(Math.cos(a) * radius * BORE_RATIO, Math.sin(a) * radius * BORE_RATIO, z);
      });
    return [ring(depth / 2), ring(-depth / 2), bore(depth / 2), bore(-depth / 2)];
  }, [radius, depth, teeth]);

  useFrame(() => {
    if (group.current) group.current.rotation.z = (spec.phase + progress.current * spec.turns) * TAU;
  });

  return (
    <group
      position={[spec.side * (halfWidth - spec.inset * unit), spec.y * unit, 0]}
      rotation={[0.22, spec.side * -0.26, 0]}
    >
      <group ref={group}>
        {/* Background-coloured and opaque: it adds no tone, it just hides what
            is behind it, which is what keeps overlapping gears legible. */}
        <mesh geometry={geometry}>
          <meshBasicMaterial color={BACKGROUND} side={DoubleSide} polygonOffset polygonOffsetFactor={1} />
        </mesh>
        {loops.map((points, i) => (
          <Line key={i} points={points} color={GEAR_INK} lineWidth={STROKE} toneMapped={false} />
        ))}
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
 * Orthographic on purpose. The gears sit at the edges of the frame and have to
 * stay there; under perspective their apparent position would drift with the
 * window's aspect, and placing them would mean solving for the frustum instead
 * of naming a fraction of the viewport.
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
