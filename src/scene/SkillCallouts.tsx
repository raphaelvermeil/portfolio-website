import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type { Group } from 'three';
import { percent, skillShares } from '../lib/skills';
import { partX } from './axisLayout';
import { placements } from './machine';
import { actProgress, stage } from './timeline';

/** Callouts only earn their place once the parts have separated. */
const APPEAR_AT = 0.35;
const FULL_AT = 0.55;

interface Callout {
  language: string;
  color: string;
  label: string;
  placementIndex: number;
  /** Which way the leader runs, so consecutive callouts do not stack up. */
  side: 1 | -1;
}

/** Spreads the callouts evenly along the assembly so their leaders never cross. */
function planCallouts(): Callout[] {
  const shares = skillShares().slice(0, 5);
  if (placements.length === 0) return [];
  return shares.map((s, i) => ({
    language: s.language,
    color: s.color,
    label: percent(s.share),
    placementIndex: Math.round(((i + 0.5) / shares.length) * (placements.length - 1)),
    side: i % 2 === 0 ? 1 : -1,
  }));
}

function CalloutMarker({ callout }: { callout: Callout }) {
  const group = useRef<Group>(null);
  const label = useRef<HTMLDivElement>(null);
  const placement = placements[callout.placementIndex];

  useFrame(() => {
    const explode = actProgress(stage.current, 'explode');
    if (group.current) group.current.position.x = partX(placement, explode);
    if (label.current) {
      const t = (explode - APPEAR_AT) / (FULL_AT - APPEAR_AT);
      label.current.style.opacity = String(Math.min(1, Math.max(0, t)));
    }
  });

  const lift = (placement.radius + 1.7) * callout.side;

  return (
    <group ref={group}>
      <Html
        position={[0, lift, 0]}
        center
        distanceFactor={13}
        zIndexRange={[6, 0]}
        style={{ pointerEvents: 'none' }}
      >
        <div
          ref={label}
          className={`callout callout--${callout.side === 1 ? 'up' : 'down'}`}
          style={{ opacity: 0 }}
        >
          <span className="callout__stem" style={{ background: callout.color }} />
          <span className="callout__text">
            <span className="callout__dot" style={{ background: callout.color }} />
            {callout.language}
            <span className="callout__share">{callout.label}</span>
          </span>
        </div>
      </Html>
    </group>
  );
}

/** Labels the machine with what the work is made of, drawn out on leader lines. */
export function SkillCallouts() {
  const callouts = useMemo(planCallouts, []);
  return (
    <>
      {callouts.map((c) => (
        <CalloutMarker key={c.language} callout={c} />
      ))}
    </>
  );
}
