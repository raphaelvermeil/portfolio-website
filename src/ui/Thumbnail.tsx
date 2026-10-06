import { withBase } from '../lib/paths';
import { gearOutline } from '../scene/gearGeometry';

const W = 340;
const H = 190;

const TEETH = 14;
/** Tip radius, in pixels. */
const RADIUS = 56;

// One gear, centred, the same on every card — so it is computed once here
// rather than per render. gearOutline is sized in modules, so solve for the
// pixel radius wanted here.
const GEAR_PATH = `M${gearOutline(TEETH, (2 * RADIUS) / (TEETH + 1.6))
  .map((p) => `${(W / 2 + p.x).toFixed(1)},${(H / 2 + p.y).toFixed(1)}`)
  .join('L')}Z`;

/**
 * A drafted plate standing in for a screenshot.
 *
 * A thumbnail slot filled only with real screenshots would be a grid of holes,
 * so the cards without one get this instead: ruled paper and a single gear.
 *
 * It claims nothing — it is ornament, and reads as ornament. Every plate is
 * identical, so it sits behind the titles as a backdrop rather than reading as
 * a picture *of* the project. The gear is the same involute outline the gears
 * beside the about text are built from, so the page keeps one vocabulary
 * instead of inventing a second one down here.
 *
 * `id` only keeps the grid pattern's id unique across cards.
 */
function Plate({ id }: { id: string }) {
  return (
    <svg className="card__plate" viewBox={`0 0 ${W} ${H}`} role="presentation" focusable="false">
      <defs>
        <pattern id={`grid-${id}`} width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0H0V20" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.18" />
        </pattern>
      </defs>
      <rect width={W} height={H} fill={`url(#grid-${id})`} />
      <g fill="none" stroke="currentColor" strokeWidth="0.9" opacity="0.55">
        <path d={GEAR_PATH} />
        <circle cx={W / 2} cy={H / 2} r={RADIUS * 0.3} />
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
        <Plate id={id} />
      )}
    </span>
  );
}
