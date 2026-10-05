import { useMemo } from 'react';
import { withBase } from '../lib/paths';
import { hashString, mulberry32 } from '../lib/random';
import { gearOutline } from '../scene/gearGeometry';

const W = 340;
const H = 190;

/**
 * A drafted plate standing in for a screenshot.
 *
 * Two of twenty-one repos have a usable image in their readme, so a thumbnail
 * slot filled only with real screenshots would be a grid of holes. This draws
 * something deliberate instead: a fragment of a technical drawing, seeded by
 * the repo id so each card is distinct and stays the same across rebuilds.
 *
 * It claims nothing — it is ornament, and reads as ornament. The gear is the
 * same involute outline the gears beside the about text are built from, so the
 * page keeps one vocabulary instead of inventing a second one down here.
 */
function Plate({ seed }: { seed: string }) {
  const art = useMemo(() => {
    const rand = mulberry32(hashString(seed));
    const between = (lo: number, hi: number) => lo + rand() * (hi - lo);

    const teeth = Math.round(between(9, 20));
    const radius = between(44, 70);
    // gearOutline is sized in modules; solve for the pixel radius wanted here.
    const module = (2 * radius) / (teeth + 1.6);
    const cx = between(0.18, 0.46) * W;
    const cy = between(0.34, 0.72) * H;
    const spin = between(0, Math.PI);

    const points = gearOutline(teeth, module).map((p) => {
      const x = p.x * Math.cos(spin) - p.y * Math.sin(spin);
      const y = p.x * Math.sin(spin) + p.y * Math.cos(spin);
      return `${(cx + x).toFixed(1)},${(cy + y).toFixed(1)}`;
    });

    // Stacked down the right-hand side in bands rather than scattered, so two
    // plates cannot land on top of each other and read as one shape.
    const count = Math.round(between(2, 4));
    const boxes = Array.from({ length: count }, (_, i) => {
      const w = between(46, 100);
      const h = between(24, 46);
      const band = (i + 0.5) / count;
      return {
        x: between(0.54, 0.9) * W - w / 2,
        y: band * H + between(-14, 14) - h / 2,
        w,
        h,
      };
    });

    const ticks = Array.from({ length: Math.round(between(5, 11)) }, (_, i) => ({
      x: between(0.5, 0.96) * W,
      y: 12 + i * 2,
    }));

    return { path: `M${points.join('L')}Z`, cx, cy, bore: radius * 0.3, boxes, ticks };
  }, [seed]);

  return (
    <svg className="card__plate" viewBox={`0 0 ${W} ${H}`} role="presentation" focusable="false">
      <defs>
        <pattern id={`grid-${seed}`} width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0H0V20" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.18" />
        </pattern>
      </defs>
      <rect width={W} height={H} fill={`url(#grid-${seed})`} />
      <g fill="none" stroke="currentColor" strokeWidth="0.9" opacity="0.55">
        <path d={art.path} />
        <circle cx={art.cx} cy={art.cy} r={art.bore} />
      </g>
      {/* Filled in the page colour and drawn last, so where a plate overlaps
          the gear it hides it rather than crossing it — the same hidden-line
          habit the rest of the drawing uses. */}
      <g fill="var(--bg)" stroke="currentColor" strokeWidth="0.9" opacity="0.55">
        {art.boxes.map((b, i) => (
          <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} />
        ))}
      </g>
      <g stroke="currentColor" strokeWidth="0.9" opacity="0.35">
        {art.ticks.map((t, i) => (
          <line key={i} x1={t.x} y1={t.y} x2={t.x} y2={t.y + 7} />
        ))}
      </g>
    </svg>
  );
}

/** A project's thumbnail: its own image where there is one, a drafted plate otherwise. */
export function Thumbnail({ id, image, title }: { id: string; image: string | null; title: string }) {
  return (
    <span className="card__thumb">
      {image ? (
        <img src={withBase(image)} alt={`${title} screenshot`} loading="lazy" decoding="async" />
      ) : (
        <Plate seed={id} />
      )}
    </span>
  );
}
