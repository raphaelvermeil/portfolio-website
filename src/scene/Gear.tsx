import { Html, useCursor } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import { Color, DoubleSide, EdgesGeometry, type Group, type LineBasicMaterial } from 'three';
import { useReducedMotion } from '../lib/hooks';
import { languageColor } from '../lib/palette';
import { useStore } from '../lib/store';
import type { Project } from '../lib/types';
import { partX, type GearPlacement } from './axisLayout';
import { explode } from './explode';
import { partById } from './machine';
import { BACKGROUND, EDGE_THRESHOLD_DEG, INK, INK_DIM } from './theme';

const BASE_SPEED = 0.15;
const HOVER_MULT = 4;
const SELECT_MULT = 2;

interface Props {
  placement: GearPlacement;
  project: Project;
  spinDir: 1 | -1;
}

export function Gear({ placement, project, spinDir }: Props) {
  const { id, language, radius, quaternion } = placement;
  const geometry = partById[id];
  const edges = useMemo(() => new EdgesGeometry(geometry, EDGE_THRESHOLD_DEG), [geometry]);

  /** Monochrome at rest, so the assembly reads as one drawing; colour marks attention. */
  const idleColor = useMemo(() => new Color(INK), []);
  const activeColor = useMemo(() => new Color(languageColor(project.language)), [project.language]);
  const dimColor = useMemo(() => new Color(INK_DIM), []);

  const slider = useRef<Group>(null);
  const spinner = useRef<Group>(null);
  const edgeMat = useRef<LineBasicMaterial>(null);
  const angle = useRef(0);
  const [localHover, setLocalHover] = useState(false);

  const hovered = useStore((s) => s.hovered === id);
  const selected = useStore((s) => s.selected === id);
  const filter = useStore((s) => s.filter);
  const setHovered = useStore((s) => s.setHovered);
  const setSelected = useStore((s) => s.setSelected);
  const reduced = useReducedMotion();

  const dimmed = filter !== null && filter !== language;
  useCursor(localHover && !dimmed);

  useFrame((_state, dt) => {
    const base = reduced ? BASE_SPEED * 0.25 : BASE_SPEED;
    const mult = hovered ? HOVER_MULT : selected ? SELECT_MULT : 1;
    const speed = dimmed ? 0 : base * mult;
    angle.current += dt * speed * spinDir;
    if (spinner.current) spinner.current.rotation.z = angle.current;
    if (slider.current) slider.current.position.x = partX(placement, explode.current);
    if (edgeMat.current) {
      edgeMat.current.color.copy(dimmed ? dimColor : hovered || selected ? activeColor : idleColor);
    }
  });

  const onOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (dimmed) return;
    setLocalHover(true);
    setHovered(id);
  };
  const onOut = () => {
    setLocalHover(false);
    if (useStore.getState().hovered === id) setHovered(null);
  };
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (dimmed) return;
    setSelected(selected ? null : id);
  };

  return (
    <group ref={slider} quaternion={quaternion}>
      <group ref={spinner}>
        {/* Filled in the background colour: the body carries no tone of its own, it just
            hides the parts behind it, which is what makes this read as a line drawing. */}
        <mesh geometry={geometry} onPointerOver={onOver} onPointerOut={onOut} onClick={onClick}>
          <meshBasicMaterial
            color={BACKGROUND}
            side={DoubleSide}
            polygonOffset
            polygonOffsetFactor={1}
            polygonOffsetUnits={1}
          />
        </mesh>
        <lineSegments geometry={edges}>
          <lineBasicMaterial ref={edgeMat} transparent opacity={dimmed ? 0.4 : 0.9} toneMapped={false} />
        </lineSegments>
      </group>
      {(hovered || selected) && !dimmed && (
        <Html position={[0, radius + 0.3, 0]} center distanceFactor={14} zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
          <div className="gear-label">
            <span className="gear-label__name">{project.title}</span>
            <span className="gear-label__lang">{language}</span>
          </div>
        </Html>
      )}
    </group>
  );
}
