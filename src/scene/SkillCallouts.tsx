import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group } from 'three';
import { axisOffset } from './axisLayout';
import { placementById } from './machine';
import { SCATTER_DISTANCE, SKILL_PARTS, type SkillPart } from './skillParts';
import { actProgress, explodeAmount, stage } from './timeline';

/** Labels earn their place once their part is clearly off the axis. */
const APPEAR_AT = 0.25;
/**
 * Where a label sits relative to its layer: outward, with a little lift.
 *
 * Outward does the work. By the time labels appear the camera is 64° overhead,
 * so a world-vertical offset foreshortens to under half its length on screen
 * while a horizontal one projects at nearly full length. The reach has to clear
 * a square plate's half-diagonal, about 1.5 at full size.
 */
const LABEL_OUT = 2.3;
const LABEL_UP = 0.5;
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
        // Out along the layer's own escape direction rather than straight up:
        // stacked vertically the labels land on whichever layer is above.
        position={[part.direction[0] * LABEL_OUT, LABEL_UP, part.direction[1] * LABEL_OUT]}
        center
        zIndexRange={[6, 0]}
        style={{ pointerEvents: 'none' }}
      >
        <div ref={label} className="callout" style={{ opacity: 0 }}>
          <span className="callout__stem" style={{ background: part.color }} />
          <span className="callout__text">
            <span className="callout__name">
              <span className="callout__dot" style={{ background: part.color }} />
              {part.label}
            </span>
            <span className="callout__share">{part.tech.join(' · ')}</span>
          </span>
        </div>
      </Html>
    </group>
  );
}

/** Names each layer of the stack, on the layer that carries it. */
export function SkillCallouts() {
  return (
    <>
      {SKILL_PARTS.map((part) => (
        <CalloutMarker key={part.id} part={part} />
      ))}
    </>
  );
}
