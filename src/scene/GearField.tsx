import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import { DoubleSide, EdgesGeometry, MathUtils, type Group } from 'three';
import { createGearGeometry } from './gearGeometry';
import { MODULE } from './meshing';
import { centreDistance, meshedAngle, radiusFor } from './meshing';
import { BACKGROUND, EDGE_THRESHOLD_DEG, INK } from './theme';

/** Scroll progress of the passage the gears flank, 0 to 1. Written on scroll, read per frame. */
const progress = { current: 0 };

/** Plate thickness, as a share of radius. */
const DEPTH = 0.17;

/**
 * How quickly a train catches up to the scroll. Lower is heavier.
 *
 * Mass is read from lag as much as from speed: something weighty does not
 * track its input instantly, it takes a moment to come up to speed and a
 * moment to stop. Only the first gear of a train is damped — the rest are
 * solved from it, so they inherit the lag and stay meshed. Damping each gear
 * on its own would let the teeth drift apart whenever the scroll changed pace.
 */
const INERTIA = 2;
const TAU = Math.PI * 2;
const rad = (deg: number) => (deg * Math.PI) / 180;

interface GearSpec {
  teeth: number;
  /** Lightening holes through the web. */
  bolts: number;
  /** Direction from the previous gear's centre, in degrees. Omitted on the first. */
  alpha?: number;
}

interface ChainSpec {
  /** -1 anchors the train against the left edge, 1 the right. */
  side: -1 | 1;
  /** How far the first gear's centre sits inside that edge, as a share of viewport height. */
  inset: number;
  /** Height of the first gear above centre, as a share of viewport height. */
  y: number;
  /** Turns of the *first* gear across the whole passage; the rest follow from
   *  the ratios. Kept low: these are meant to read as heavy plates. */
  turns: number;
  phase: number;
  gears: GearSpec[];
}

/**
 * Two gear trains, flanking the passage and cropped by the edges of the frame.
 *
 * A gear is specified by its tooth count, never its radius: radius is derived
 * from the shared module so neighbours actually mesh. Each gear after the first
 * is placed by the direction from its driver, at the centre distance that puts
 * their teeth into each other rather than tip to tip.
 *
 * Sizes and positions are shares of viewport height, so the composition holds
 * at any window size rather than being tuned to one screen.
 */
const CHAINS: ChainSpec[] = [
  {
    side: -1,
    inset: 0.17,
    y: 0.12,
    turns: 1.15,
    phase: 0.1,
    gears: [
      { teeth: 18, bolts: 5 },
      { teeth: 13, bolts: 4, alpha: 250 },
    ],
  },
  {
    side: 1,
    inset: 0.25,
    y: 0.18,
    turns: -0.9,
    phase: 0.35,
    gears: [
      { teeth: 22, bolts: 6 },
      { teeth: 11, bolts: 3, alpha: -50 },
      { teeth: 15, bolts: 5, alpha: -120 },
    ],
  },
];

function Plate({ teeth, bolts, unit }: { teeth: number; bolts: number; unit: number }) {
  const radius = radiusFor(teeth) * unit;

  const { solid, edges } = useMemo(() => {
    const geometry = createGearGeometry(teeth, MODULE * unit, radius * DEPTH, {
      count: bolts,
      circle: 0.62,
      size: 0.12,
    });
    return { solid: geometry, edges: new EdgesGeometry(geometry, EDGE_THRESHOLD_DEG) };
  }, [radius, teeth, bolts]);

  return (
    <>
      {/* Background-coloured and opaque: it adds no tone, it only hides what is
          behind it, which is what turns a wireframe into a drawn solid. */}
      <mesh geometry={solid}>
        <meshBasicMaterial color={BACKGROUND} side={DoubleSide} polygonOffset polygonOffsetFactor={1} />
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color={INK} toneMapped={false} />
      </lineSegments>
    </>
  );
}

function Chain({ spec, unit, halfWidth }: { spec: ChainSpec; unit: number; halfWidth: number }) {
  const refs = useRef<(Group | null)[]>([]);
  /** The driver's actual angle, which trails the one the scroll is asking for. */
  const driver = useRef<number | null>(null);

  /** Centres, walked along the train: each sits radii-sum away from its driver. */
  const placed = useMemo(() => {
    let x = spec.side * (halfWidth - spec.inset * unit);
    let y = spec.y * unit;
    return spec.gears.map((gear, i) => {
      if (i > 0) {
        const gap = centreDistance(spec.gears[i - 1].teeth, gear.teeth) * unit;
        x += Math.cos(rad(gear.alpha!)) * gap;
        y += Math.sin(rad(gear.alpha!)) * gap;
      }
      return { gear, position: [x, y, 0] as [number, number, number] };
    });
  }, [spec, unit, halfWidth]);

  useFrame((_state, dt) => {
    const target = (spec.phase + progress.current * spec.turns) * TAU;
    // Snapped on the first frame, so the train does not wind up from zero when
    // the reader arrives partway down the passage.
    driver.current =
      driver.current === null ? target : MathUtils.damp(driver.current, target, INERTIA, dt);

    let angle = driver.current;
    for (let i = 0; i < spec.gears.length; i++) {
      if (i > 0) {
        // Re-solved from the driver every frame rather than integrated per
        // gear, so a long scroll cannot let the teeth drift out of step.
        angle = meshedAngle(spec.gears[i - 1].teeth, angle, spec.gears[i].teeth, rad(spec.gears[i].alpha!));
      }
      const node = refs.current[i];
      if (node) node.rotation.z = angle;
    }
  });

  return (
    <>
      {placed.map(({ gear, position }, i) => (
        <group key={i} position={position}>
          <group
            ref={(node) => {
              refs.current[i] = node;
            }}
          >
            <Plate teeth={gear.teeth} bolts={gear.bolts} unit={unit} />
          </group>
        </group>
      ))}
    </>
  );
}

function Trains() {
  const { width, height } = useThree((s) => s.viewport);
  return (
    <>
      {CHAINS.map((spec, i) => (
        <Chain key={i} spec={spec} unit={height} halfWidth={width / 2} />
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
 * The gear trains beside the about passage, turning as it is read.
 *
 * Perspective rather than orthographic, which is what lets them read as solid.
 * The gears stay flat in the plane of the text — none of them is tilted — but
 * they sit near the edges of the frame, so the camera sees them off axis and
 * their rims and hole walls come into view. Orthographic would show a face and
 * nothing else however thick the plate was.
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
        dpr={[1, 2]}
        frameloop={running}
        camera={{ position: [0, 0, 10], fov: 50, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: true }}
      >
        <Trains />
      </Canvas>
    </div>
  );
}
