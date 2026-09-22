import { Html, useCursor } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import { Color, DoubleSide, EdgesGeometry, type Group, type LineBasicMaterial, type Mesh } from 'three';
import { useReducedMotion } from '../lib/hooks';
import { languageColor } from '../lib/palette';
import { useStore } from '../lib/store';
import type { Project } from '../lib/types';
import type { GearPlacement } from './layout';
import { createPart } from './parts';

/**
 * Edges are only drawn where faces meet at more than this angle. It sits above the
 * 10° facets of a revolved surface (so seams stay hidden) and below the profile
 * steps, tooth flanks and box corners that define a part's silhouette.
 */
const EDGE_THRESHOLD_DEG = 24;
const BASE_SPEED = 0.15;
const HOVER_MULT = 4;
const SELECT_MULT = 2;

interface Props {
  placement: GearPlacement;
  project: Project;
  spinDir: 1 | -1;
}

export function Gear({ placement, project, spinDir }: Props) {
  const { id, language, radius, position, quaternion } = placement;
  const geometry = useMemo(() => createPart({ id, language, radius }), [id, language, radius]);
  const edges = useMemo(() => new EdgesGeometry(geometry, EDGE_THRESHOLD_DEG), [geometry]);
  const baseColor = useMemo(() => new Color(languageColor(project.language)), [project.language]);
  /** Revolved parts have no hard edges along their axis, so a solid body carries the
   *  silhouette and occludes what is behind it; the bright edges draw the detail. */
  const fillColor = useMemo(() => baseColor.clone().multiplyScalar(0.14), [baseColor]);

  const spinner = useRef<Group>(null);
  const ring = useRef<Mesh>(null);
  const edgeMat = useRef<LineBasicMaterial>(null);
  const angle = useRef(0);
  const [localHover, setLocalHover] = useState(false);

  const hovered = useStore((s) => s.hovered === id);
  const selected = useStore((s) => s.selected === id);
  const filter = useStore((s) => s.filter);
  const setHovered = useStore((s) => s.setHovered);
  const setSelected = useStore((s) => s.setSelected);
  const reduced = useReducedMotion();

  const dimmed = filter !== null && filter !== placement.language;
  useCursor(localHover && !dimmed);

  useFrame((state, dt) => {
    const base = reduced ? BASE_SPEED * 0.25 : BASE_SPEED;
    const mult = hovered ? HOVER_MULT : selected ? SELECT_MULT : 1;
    const speed = dimmed ? 0 : base * mult;
    angle.current += dt * speed * spinDir;
    if (spinner.current) spinner.current.rotation.z = angle.current;
    if (edgeMat.current) {
      const target = dimmed ? 0.6 : hovered || selected ? 2.4 : 1.5;
      edgeMat.current.color.copy(baseColor).multiplyScalar(target);
    }
    if (ring.current) {
      const s = 1 + 0.03 * Math.sin(state.clock.elapsedTime * 2);
      ring.current.scale.set(s, s, 1);
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
    <group position={position} quaternion={quaternion}>
      <group ref={spinner}>
        <mesh geometry={geometry} onPointerOver={onOver} onPointerOut={onOut} onClick={onClick}>
          <meshBasicMaterial
            color={fillColor}
            transparent={dimmed}
            opacity={dimmed ? 0.12 : 1}
            depthWrite={!dimmed}
            side={DoubleSide}
            polygonOffset
            polygonOffsetFactor={1}
            polygonOffsetUnits={1}
          />
        </mesh>
        <lineSegments geometry={edges}>
          <lineBasicMaterial ref={edgeMat} transparent opacity={dimmed ? 0.15 : 1} toneMapped={false} />
        </lineSegments>
        {project.featured && (
          <mesh ref={ring}>
            <ringGeometry args={[radius * 1.12, radius * 1.15, 64]} />
            <meshBasicMaterial color="#5ee1ff" transparent opacity={dimmed ? 0.1 : 0.7} side={DoubleSide} toneMapped={false} />
          </mesh>
        )}
      </group>
      {(hovered || selected) && !dimmed && (
        <Html position={[0, radius + 0.35, 0]} center distanceFactor={12} zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
          <div className="gear-label">
            <span className="gear-label__name">{project.title}</span>
            <span className="gear-label__lang">{placement.language}</span>
          </div>
        </Html>
      )}
    </group>
  );
}
