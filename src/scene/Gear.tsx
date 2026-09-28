import { Html, useCursor } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Color,
  DoubleSide,
  EdgesGeometry,
  LineBasicMaterial,
  MeshBasicMaterial,
  type Group,
} from 'three';
import { useReducedMotion } from '../lib/hooks';
import { languageColor } from '../lib/palette';
import { useStore } from '../lib/store';
import type { Project } from '../lib/types';
import { partX, type GearPlacement } from './axisLayout';
import { SCATTER_DISTANCE, scatterById } from './skillParts';
import { actProgress, explodeAmount, stage } from './timeline';
import { partById } from './machine';
import { moverAngle, moverOffset, partAngle, type PartMotion } from './motion';
import { BACKGROUND, EDGE_THRESHOLD_DEG, INK } from './theme';

/** Hovering runs a part's own mechanism faster rather than changing what it does. */
const HOVER_RATE = 3;
const SELECT_RATE = 1.8;
const REDUCED_RATE = 0.25;

interface Props {
  placement: GearPlacement;
  project: Project;
  motion: PartMotion;
}

export function Gear({ placement, project, motion }: Props) {
  const { id, language, radius, quaternion } = placement;
  const pieces = partById[id];
  const escape = scatterById[id];

  const bodyEdges = useMemo(() => new EdgesGeometry(pieces.body, EDGE_THRESHOLD_DEG), [pieces]);
  const moverEdges = useMemo(
    () => pieces.movers.map((m) => new EdgesGeometry(m.geometry, EDGE_THRESHOLD_DEG)),
    [pieces],
  );

  /** One material pair for the whole part, so highlighting is a single write. */
  const fill = useMemo(
    () =>
      new MeshBasicMaterial({
        color: BACKGROUND,
        side: DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1,
      }),
    [],
  );
  const stroke = useMemo(() => new LineBasicMaterial({ transparent: true, toneMapped: false }), []);

  useEffect(
    () => () => {
      fill.dispose();
      stroke.dispose();
      bodyEdges.dispose();
      for (const e of moverEdges) e.dispose();
    },
    [fill, stroke, bodyEdges, moverEdges],
  );

  const idleColor = useMemo(() => new Color(INK), []);
  const activeColor = useMemo(() => new Color(languageColor(project.language)), [project.language]);

  const slider = useRef<Group>(null);
  const spinner = useRef<Group>(null);
  const moverRefs = useRef<(Group | null)[]>([]);
  /** The part's own clock, so speeding it up never makes it jump. */
  const clock = useRef(0);
  const [localHover, setLocalHover] = useState(false);

  const hovered = useStore((s) => s.hovered === id);
  const selected = useStore((s) => s.selected === id);
  const setHovered = useStore((s) => s.setHovered);
  const setSelected = useStore((s) => s.setSelected);
  const reduced = useReducedMotion();

  useCursor(localHover);

  useFrame((_state, dt) => {
    const rate = reduced ? REDUCED_RATE : hovered ? HOVER_RATE : selected ? SELECT_RATE : 1;
    clock.current += dt * rate;
    const t = clock.current;

    if (slider.current) {
      // Labelled parts leave the axis; everything else stays on it.
      const away = escape ? actProgress(stage.current, 'scatter') * SCATTER_DISTANCE : 0;
      slider.current.position.set(
        partX(placement, explodeAmount(stage.current)),
        escape ? escape[0] * away : 0,
        escape ? escape[1] * away : 0,
      );
    }
    if (spinner.current) spinner.current.rotation.z = partAngle(motion, t);

    for (let i = 0; i < pieces.movers.length; i++) {
      const group = moverRefs.current[i];
      if (!group) continue;
      const m = pieces.movers[i].motion;
      group.rotation.z = moverAngle(m, t);
      group.position.z = moverOffset(m, t);
    }

    stroke.color.copy(hovered || selected ? activeColor : idleColor);
    stroke.opacity = 0.9;
  });

  const onOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setLocalHover(true);
    setHovered(id);
  };
  const onOut = () => {
    setLocalHover(false);
    if (useStore.getState().hovered === id) setHovered(null);
  };
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    setSelected(selected ? null : id);
  };

  return (
    <group ref={slider} quaternion={quaternion}>
      <group ref={spinner}>
        {/* Filled in the background colour: the body carries no tone of its own, it just
            hides what is behind it, which is what makes this read as a line drawing. */}
        <mesh
          geometry={pieces.body}
          material={fill}
          onPointerOver={onOver}
          onPointerOut={onOut}
          onClick={onClick}
        />
        <lineSegments geometry={bodyEdges} material={stroke} />

        {pieces.movers.map((mover, i) => (
          <group key={i} position={mover.offset}>
            <group
              ref={(g) => {
                moverRefs.current[i] = g;
              }}
            >
              <mesh
                geometry={mover.geometry}
                material={fill}
                onPointerOver={onOver}
                onPointerOut={onOut}
                onClick={onClick}
              />
              <lineSegments geometry={moverEdges[i]} material={stroke} />
            </group>
          </group>
        ))}
      </group>

      {(hovered || selected) && (
        <Html
          position={[0, radius + 0.3, 0]}
          center
          zIndexRange={[10, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <div className="gear-label">
            <span className="gear-label__name">{project.title}</span>
            <span className="gear-label__lang">{language}</span>
          </div>
        </Html>
      )}
    </group>
  );
}
