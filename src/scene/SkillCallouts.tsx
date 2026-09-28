import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group } from 'three';
import { percent } from '../lib/skills';
import { axisOffset } from './axisLayout';
import { placementById } from './machine';
import { SCATTER_DISTANCE, SKILL_PARTS, type SkillPart } from './skillParts';
import { actProgress, explodeAmount, stage } from './timeline';

/** Labels earn their place once their part is clearly off the axis. */
const APPEAR_AT = 0.25;
const FULL_AT = 0.5;

function CalloutMarker({ part }: { part: SkillPart }) {
  const group = useRef<Group>(null);
  const label = useRef<HTMLDivElement>(null);
  const placement = placementById[part.id];

  useFrame(() => {
    const scatter = actProgress(stage.current, 'scatter');
    const away = scatter * SCATTER_DISTANCE;

    if (group.current) {
      group.current.position.set(
        part.direction[0] * away,
        axisOffset(placement, explodeAmount(stage.current)),
        part.direction[1] * away,
      );
    }
    if (label.current) {
      const t = (scatter - APPEAR_AT) / (FULL_AT - APPEAR_AT);
      label.current.style.opacity = String(Math.min(1, Math.max(0, t)));
    }
  });

  return (
    <group ref={group}>
      <Html
        position={[part.direction[0] * (placement.radius + 0.7), 0, part.direction[1] * (placement.radius + 0.7)]}
        center
        zIndexRange={[6, 0]}
        style={{ pointerEvents: 'none' }}
      >
        <div ref={label} className="callout" style={{ opacity: 0 }}>
          <span className="callout__stem" style={{ background: part.color }} />
          <span className="callout__text">
            <span className="callout__dot" style={{ background: part.color }} />
            {part.language}
            <span className="callout__share">{percent(part.share)}</span>
          </span>
        </div>
      </Html>
    </group>
  );
}

/** Names the skills that make the machine work, on the parts that carry them. */
export function SkillCallouts() {
  return (
    <>
      {SKILL_PARTS.map((part) => (
        <CalloutMarker key={part.language} part={part} />
      ))}
    </>
  );
}
