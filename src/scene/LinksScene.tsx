import { Line } from '@react-three/drei';
import { useMemo } from 'react';
import { CatmullRomCurve3, Vector3 } from 'three';
import { languageColor } from '../lib/palette';
import { useStore } from '../lib/store';
import type { Belt, Shaft } from './links';
import { links, placementById } from './machine';

const ACCENT = '#5ee1ff';

function useLinkState(a: string, b: string) {
  const highlighted = useStore((s) => s.hovered === a || s.hovered === b || s.selected === a || s.selected === b);
  const filter = useStore((s) => s.filter);
  const dimmed = filter !== null && (placementById[a].language !== filter || placementById[b].language !== filter);
  return { highlighted, dimmed };
}

function ShaftLine({ shaft }: { shaft: Shaft }) {
  const { highlighted, dimmed } = useLinkState(shaft.a, shaft.b);
  const points = useMemo(() => [placementById[shaft.a].position, placementById[shaft.b].position], [shaft]);
  const color = languageColor(shaft.language);
  return <Line points={points} color={color} lineWidth={highlighted ? 1.5 : 1} transparent opacity={dimmed ? 0.05 : highlighted ? 0.8 : 0.35} toneMapped={false} />;
}

function BeltTube({ belt }: { belt: Belt }) {
  const { highlighted, dimmed } = useLinkState(belt.a, belt.b);
  const curve = useMemo(
    () => new CatmullRomCurve3([new Vector3(...placementById[belt.a].position), new Vector3(...belt.mid), new Vector3(...placementById[belt.b].position)]),
    [belt],
  );
  return (
    <mesh>
      <tubeGeometry args={[curve, 32, 0.03, 6, false]} />
      <meshBasicMaterial color={ACCENT} transparent opacity={dimmed ? 0.04 : highlighted ? 0.8 : 0.25} toneMapped={false} depthWrite={false} />
    </mesh>
  );
}

export function Links() {
  return (
    <group>
      {links.shafts.map((s) => (
        <ShaftLine key={`${s.a}-${s.b}`} shaft={s} />
      ))}
      {links.belts.map((b) => (
        <BeltTube key={`${b.a}-${b.b}`} belt={b} />
      ))}
    </group>
  );
}
