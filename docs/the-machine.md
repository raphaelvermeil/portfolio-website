# The machine: everything about the 3D

A complete guide to the machine — the geometry, the animation, the scroll
mechanism, the DOM around it and the data feeding it.

Read sections 1–4 before changing anything: the file map, how a frame happens,
the scroll mechanism and the coordinate frames. Section 17 is a cookbook.

---

## 1. Every file involved

### The scene — `src/scene/`

| File | Lines | Does |
|---|---|---|
| `timeline.ts` | 123 | **The clock.** Scroll → named acts. Everything reads this. |
| `theme.ts` | 15 | Scene colours + the edge-detection threshold |
| `parts/builders.ts` | 465 | 18 part archetypes, built from three.js primitives |
| `parts/index.ts` | 12 | `buildPart(name, radius, seed)` |
| `gearGeometry.ts` | 41 | The spur-gear tooth profile |
| `assembly.ts` | 42 | **The design.** Which parts, order, size, motion. |
| `machine.ts` | 68 | Wiring: builds every part once, measures, lays out |
| `axisLayout.ts` | 122 | Position of each part along the axis |
| `orientation.ts` | 27 | The flat → upright twist |
| `motion.ts` | 58 | How parts and sub-parts move over time |
| `skillParts.ts` | 60 | Which parts fly off, and which way |
| `cameraPath.ts` | ~190 | Shot list + framing maths + the per-frame camera |
| `MachineScene.tsx` | 101 | The `<Canvas>`; assembles everything |
| `Gear.tsx` | 178 | Renders one part, runs its motion each frame |
| `ScrollCamera.tsx` | 53 | Damps the camera toward the computed pose |
| `SkillCallouts.tsx` | 67 | Floating skill labels |

### The DOM around it — `src/ui/`

| File | Does |
|---|---|
| `MachineSection.tsx` | The `<section>`: sticky frame, WebGL check, keyboard cycling |
| `TitleCard.tsx` | Act 1 — the big type, fades out on scroll |
| `HeroOverlay.tsx` | Nav + the chrome that fades with the machine |
| `SkillsPanel.tsx` | The dark "Built with" read-out |
| `Scrubber.tsx` | The ruler progress bar |
| `DetailPanel.tsx` | Slide-in panel when a part is clicked |

### Supporting — `src/lib/`

Only the files the machine actually touches; `src/lib/` also holds the
router, markdown and reveal code the rest of the page uses.

| File | Does |
|---|---|
| `store.ts` | zustand: `hovered`, `selected`, `hasInteracted` |
| `skills.ts` | Languages by share of bytes → the labels and the read-out |
| `palette.ts` | Language → colour |
| `data.ts` | Loads `projects.json` / `languages.json`, applies the overrides |
| `overrides.ts` | Parses and applies `content/projects.yml` |
| `random.ts` | `hashString` + `mulberry32`, the seeded PRNG |
| `hooks.ts` | `useMediaQuery`, `useReducedMotion` |
| `webgl.ts` | `hasWebGL()` capability check |

### Styles — `src/styles/global.css`

`.machine` (the scroll runway), `.machine__frame` (the sticky viewport),
`.machine__stage` (the canvas wrapper), `.gear-label`, `.callout`, `.readout`,
`.scrubber`, `.titlecard`, `.hero*`. Colours live in `tokens.css`.

---

## 2. How a frame happens

Two sequences worth holding in your head.

### On page load, once

```
lib/data.ts          reads projects.json, applies content/projects.yml
   ↓
scene/machine.ts     ← module-level side effects, runs on import
   for each entry in ASSEMBLY:
     buildPart()     builds the geometry (seeded by repo id)
     axialDepth()    measures it, including piston travel
   axisLayout()      computes assembled + exploded positions
   exports: partById, placements, motionById, lengths, diameter
   ↓
scene/skillParts.ts  picks which 5 parts fly off, and which way
   ↓
MachineSection       hasWebGL() ? <Canvas> : <StaticProjects>
```

Geometry is built **once at import**, not per render. `Gear` looks its geometry
up in `partById` rather than building anything.

### On every scroll event

```
useScrollStage  →  stage.current = scrollStage(scrollY, heroHeight, viewportHeight)
useStageEffect  →  writes opacity straight to the DOM:
                     TitleCard      (typeOut)
                     machine__stage (machineIn × machineOut)
                     hero__chrome   (machineIn × machineOut)
Scrubber        →  writes the marker's position
```

No React re-render. Everything is a direct style write or a ref.

### On every rendered frame (R3F `useFrame`)

```
MachineRoot     root.quaternion  = machineQuaternion(actProgress(stage, 'upright'))
each Gear       clock += dt × rate           ← its own seconds clock
                slider.position = (scatterX, axisOffset, scatterZ)
                spinner.rotation.z = partAngle(motion, t)
                each mover: rotation.z, position.z
                stroke.color = hovered ? language colour : ink
SkillCallouts   follow their part; fade in between scatter 0.25 and 0.5
ScrollCamera    cameraStateFor(stage.current, …) → damp position → lookAt(0,0,0)
```

---

## 3. The scroll mechanism — `MachineSection.tsx` + CSS

This is the part people find surprising. There are three nested elements:

```html
<section class="machine">        <!-- height: 420svh — the scroll runway -->
  <div class="machine__frame">   <!-- sticky, 100svh — stays on screen -->
    <TitleCard/>                 <!-- act 1, fades out -->
    <div class="machine__stage"> <!-- the canvas wrapper, fades in/out -->
      <Canvas/>
    </div>
    <HeroOverlay/>               <!-- nav + chrome -->
    <DetailPanel/>
  </div>
</section>
```

The outer section is **4.2 viewports tall**. The inner frame is `position:
sticky; top: 0` and one viewport tall, so it *stays put* while those 4.2
viewports scroll past. That scrolled-past distance is the runway:

```ts
runway = section.clientHeight - window.innerHeight
stage.current = scrollY / runway          // 0 → 1
```

So "scrolling the animation" is really scrolling the page past a pinned frame.
`overflow: hidden` on the frame keeps the closed `DetailPanel` from spilling
into the section below.

**Making the animation slower or faster = changing `420svh`.** The acts are
fractions, so they stretch with it.

---

## 4. Three coordinate frames

The single biggest source of confusion. Always know which one you're in:

| Frame | Axis meaning | Set where |
|---|---|---|
| **Part-local** | part spins about **+Z** | every builder in `builders.ts` |
| **Machine-local** | parts stack along **+Y** | `axisLayout.ts` rotates +Z→+Y |
| **World** | machine tips between +Y and +X | `orientation.ts`, via `MachineRoot` |

A builder makes a disc lying in the XY plane facing +Z. The layout stands it
up. The root group tips the whole stack over.

**Every builder returns geometry centred on the origin.** `merge()` enforces it
by recentring on the bounding box. An off-centre part orbits instead of spins.

**Units.** Radii 0.6–1.6. 18 parts: 7.6 long closed, 15.2 exploded, 3.2 across.
The camera lands tens of units out, solved per frame rather than fixed.

**Two clocks, don't mix them:**
- `stage.current` — scroll, `0..1`, drives *choreography*
- `t` in `motion.ts` — seconds, drives *mechanism*. Each part has its own, so
  hovering can speed it up without it jumping.

---

## 5. The clock — `timeline.ts`

`ACTS` cuts the master `0..1` into named, deliberately **overlapping** spans:

```
0.03 ─ 0.14  typeOut      big type lifts and fades
0.09 ─ 0.22  machineIn    machine fades up
0.18 ─ 0.40  explode      lying flat, parts separate along the axis
0.40 ─ 0.56  upright      the twist — camera frozen here
      (0.56 ─ 0.66: the camera rises, alone)
0.66 ─ 0.90  scatter      labelled parts fly off the axis
0.92 ─ 1.00  machineOut   fades away
```

`actProgress(stage.current, 'explode')` → `0..1` within that act. That one
function is how every other file reads the clock.

**`explodeAmount()` is special.** It's the axial spread and it *reverses*:
opens to 1 across the explode, then `RECOMPACT` (0.82) draws it back to ~0.18
during the scatter, so the flying parts have a tight column to leave.

> Feed `explodeAmount` only to things about axial spread. Feeding it to the
> camera's shot list was a real bug — the camera ran its whole path by 0.4 and
> then travelled back down it.

Two hooks export the clock:
- `useScrollStage(sel, onEngaged)` — writes `stage.current` (for the scene)
- `useStageEffect(sel, apply)` — calls you with the master value (for DOM)

---

## 6. Geometry — `parts/builders.ts`

### Helpers at the top

- **`lathe(profile, segments)`** — revolves a 2D outline into a solid. Profile
  is `[radius, position-along-axis]` pairs. The workhorse: barrels, collars,
  races, plates.
- **`toZAxis(g)`** — three builds lathes/cylinders/tori around **+Y**; we need
  **+Z**. Needed for every primitive *except* `TorusGeometry` (already in XY)
  and `ExtrudeGeometry`.
- **`ring(count, geometry, place)`** — N copies evenly around the axis.
- **`atAngle(angle, distance, tilt)`** — the placement matrix `ring` wants.
- **`merge(parts)`** — welds sub-forms together and recentres.
- **`between(rand, lo, hi)` / `countBetween(…)`** — a dimension from the seeded
  PRNG. **This is how two parts of the same type differ.**

### `RADIAL_SEGMENTS = 36` and `EDGE_THRESHOLD_DEG = 24` are a pair

36 segments → adjacent facets meet at 10°, below the 24° edge threshold, so
seams aren't drawn. Drop the segments and every seam appears: the part turns
into netting instead of a machined solid. Change one, reconsider the other.

### The 18 archetypes

| Name | Made from |
|---|---|
| `spurGear` | extruded tooth profile |
| `ringGear` | annulus with teeth cut inside |
| `knurledCollar` | waisted lathe + ridge boxes |
| `lensBarrel` | lathe, 2–3 stepped diameters |
| `bearing` | two lathed races + ring of spheres |
| `boltedFlange` | lathed plate + bolt circle |
| `turbineHub` | hub + angled blade boxes |
| `spacerRing` | thin torus |
| `spokedWheel` | rim + teeth + spokes + hub |
| `castellatedCrown` | ring + square merlons *(movers)* |
| `cylinderBank` | case + sleeves + pistons *(movers)* |
| `finnedCollar` | hub + radial fins |
| `hexBoss` | 6-sided prism + collar + washer |
| `lobedCam` | extruded sinusoidal outline + hub |
| `slottedDisc` | plate with a ring of holes |
| `retainingRing` | thin flat annulus |
| `lensGroup` | knurled barrel + dome + grips |
| `gearCluster` | carrier + 4–6 small gears *(movers)* |

### Movers

Most builders return a `BufferGeometry`. Three return `{ body, movers[] }` —
sub-assemblies that move **independently of the part around them**:

```ts
{ geometry,            // centred on its own origin, so it spins about itself
  offset: [x, y, z],   // where it sits within the part
  motion }             // reciprocate | spin
```

That's the engine's pistons and the cluster's meshing gears.

### `parts/index.ts`

```ts
buildPart(name, radius, seed)   // seed is a string: hashed → mulberry32
```

Same seed, same part, forever. The seed is `${name}-${index}-${repoId}`.

---

## 7. The design — `assembly.ts`

**Edit this first.** A plain list, read top to bottom as the machine end to end:

```ts
{ name: 'cylinderBank', radius: 1.5, motion: { kind: 'spin', turnsPerSecond: 0.07 } }
```

Archetype, size, motion. That's the whole vocabulary. Reorder the array and the
machine reorders.

`machine.ts` then wires it up, and does two things worth knowing:

- **Builds each part once**, into `partById`.
- **Measures real depth** (`axialDepth`), including piston travel, so the
  layout can space parts without overlap.

> It also pairs each part with a repo for its hover label. That pairing is
> arbitrary — the machine is a skills showpiece; the grid is the real project list.

---

## 8. Positions — `axisLayout.ts`

Every part gets **two** offsets along the axis:

- `assembled` — faces seated, `(depthA + depthB)/2 + 0.05` apart
- `exploded` — `max(GAP_MIN 0.62, maxDepth × GAP_RATIO 1.6)` apart

`axisOffset(placement, explode)` interpolates. Both sets are centred on the
origin, so the machine never drifts as it opens.

---

## 9. The twist — `orientation.ts`

27 lines. The load-bearing one:

```ts
const START = new Quaternion().setFromUnitVectors(LOCAL_AXIS, LAID_DOWN);
```

+Y onto +X is a quarter turn about Z **and nothing else**, so the machine
stands up in the plane of the screen. `machineQuaternion(p)` slerps to
identity; `MachineRoot` applies it.

**Why the machine turns rather than the camera flying around it:** a
world-vertical line lies in the plane spanned by the camera's forward and up
vectors, so with `up` at world up it projects to a *vertical screen line from
any angle*. The column cannot lean. Three earlier attempts aimed the camera at
a horizontal machine and it leaned every time.

---

## 10. Movement — `motion.ts`

Pure functions of elapsed seconds. No state.

```ts
// whole part, about the machine axis
{ kind: 'still' }
{ kind: 'spin',  turnsPerSecond: 0.5 }             // sign = direction
{ kind: 'tick',  steps: 20, ticksPerSecond: 1 }    // escapement
{ kind: 'rock',  degrees: 16, hz: 0.28 }           // balance wheel

// a mover within a part
{ kind: 'reciprocate', travel: 0.3, hz: 0.55, phase: 0.2 }
{ kind: 'spin', turnsPerSecond: 0.22 }
```

`SNAP_FRACTION = 0.18`: a tick's step lands in the first 18% of the beat, and
the other 82% is **dwell**. That dwell is the whole effect — without it a tick
is just a stuttery spin.

---

## 11. The camera — `cameraPath.ts` + `ScrollCamera.tsx`

No orbit control. Scroll owns the camera.

`CAMERA_PATH` is a shot list in spherical coordinates:

```ts
{ at: 0.56, azimuth: -14, elevation: 8, distance: 1 }
```

- **azimuth** — rotation about the vertical
- **elevation** — how far you look *down into* the stack
- **distance** — a nudge multiplier on the computed framing

Keys at `0.3` and `0.56` are **identical on purpose** — the frozen camera
during the twist.

**`cameraStateFor(master, spread, axial, opts)`** is the whole per-frame
calculation, pulled out as a pure function so it can be tested as the thing
that actually runs. `ScrollCamera` only damps toward its answer.

**`framingDistance()`** works out how far back to stand. It models the machine
as a cylinder and projects its axis onto the camera's right/up/forward. Three
things it gets right that a naive version doesn't:

1. **Which screen dimension binds** — a tilted machine can overflow vertically
   while fitting horizontally.
2. **The near end magnifies** — fit against the close end, not the centre.
3. **The fan widens without lengthening** — scattered parts sit mid-column.

It's called for **both** flat and upright orientations, taking the larger, so
the twist never dollies the camera.

---

## 12. Drawing — `Gear.tsx` + `theme.ts`

The technical-drawing look is two tricks:

**Hidden-line removal.** Each part is filled with a mesh in *exactly the
background colour*, opaque. It adds no tone — it just **hides what's behind
it**. The visible drawing is `EdgesGeometry` line segments on top.
`polygonOffset` stops the fill z-fighting the lines.

**Selective edges.** `EdgesGeometry(geometry, 24)` keeps only edges where faces
meet at more than 24°: profile steps, tooth flanks, box corners. The 10° facets
of revolved surfaces are discarded.

One `MeshBasicMaterial` and one `LineBasicMaterial` per part, shared by the
body and all its movers, so a highlight is a single write.

Hovering a part shows a drei `Html` label and speeds its mechanism up (×3).

### Canvas settings — `MachineScene.tsx`

```tsx
dpr={[1, 2]}                    // cap retina cost
frameloop={hidden ? 'never' : 'always'}   // stop rendering on a hidden tab
camera={{ fov: 22 }}            // long lens; flattens perspective
gl={{ antialias: true, alpha: false }}
onPointerMissed={() => setSelected(null)}   // click empty space to deselect
```

`FOV` here and the `fov` passed to `ScrollCamera` **must match** or the framing
maths is solving for the wrong lens.

---

## 13. Labels and chrome

**`skillParts.ts`** pins the top 5 languages (by bytes) to parts spread along
the assembly, fanning their escape directions evenly. `SCATTER_DISTANCE = 2.5`
is how far they travel. `Gear` reads `scatterById` to move a part;
`SkillCallouts` renders the label `placement.radius + 2.1` above it, fading in
between scatter 0.25 (`APPEAR_AT`) and 0.5 (`FULL_AT`). The `Html` has no
`distanceFactor`, so labels stay **constant screen size** — they are interface,
not scenery.

**`HeroOverlay`** holds the nav (always visible) and `.hero__chrome`, which
fades with the machine. Inside: `SkillsPanel` (the dark read-out) and
`Scrubber`. Nav links scroll their section into view via JS — they deliberately
don't write the hash, which the router owns.

**`TitleCard`** is act 1, fading on `typeOut`.

**`DetailPanel`** watches `selected` in the store.

---

## 14. State — `lib/store.ts`

Deliberately tiny:

```ts
hovered: string | null        // part under the cursor
selected: string | null       // clicked part; drives DetailPanel
hasInteracted: boolean        // retires the scroll hint
```

**Scroll position is *not* in here.** It changes every frame and is read inside
`useFrame`; putting it in the store would re-render the whole scene each frame.
That's why `stage` is a plain mutable ref.

---

## 15. Data feeding it

```
GitHub API → scripts/fetch-github.ts → src/data/projects.json   (committed)
                                     → src/data/languages.json  (committed)
                                            ↓
content/projects.yml ─→ overrides.ts ─→ lib/data.ts   (applied at load, not build)
                                            ↓
                          languageBytes → lib/skills.ts → skillShares()
                                            ↓
                              skillParts.ts + SkillsPanel (the labels)
```

`skillShares()` ranks languages by share of all committed bytes and folds away
anything under `MIN_SHARE` (1%) rather than drawing it as a sliver.
`planSkillParts()` takes the top 5 and pins them to parts spread down the
assembly.

The machine's *shape* comes from `assembly.ts` and owes nothing to the repo
list. Only the **labels** are data-driven.

---

## 16. Fallback, accessibility, performance

- **No WebGL** → `hasWebGL()` fails → `StaticProjects`, a plain linked list.
- **Keyboard** → the stage is focusable; Tab steps through parts, Esc clears.
- **Reduced motion** → `useReducedMotion()` drops mechanism speed to ×0.25.
  Note the *choreography* is scroll-driven, so it's user-paced anyway.
- **Hidden tab** → `frameloop='never'`, rendering stops.
- **Geometry built once** at import; `Gear` never rebuilds.
- **No per-frame allocation** in the hot path — colours use `.copy()`, vectors
  are preallocated with `useMemo`.

---

## 17. Cookbook

| I want to… | Go to |
|---|---|
| Change which parts, or their order | `assembly.ts` — edit the array |
| Make a part bigger | its `radius` in `assembly.ts` |
| Change how a part moves | its `motion` in `assembly.ts` |
| Add a new part type | write the builder in `builders.ts`, add it to `BUILDERS`, use the name in `assembly.ts` |
| Retime the choreography | `ACTS` in `timeline.ts` |
| Make the whole thing slower | `.machine { height: 420svh }` in `global.css` |
| Change the camera's path | `CAMERA_PATH` — keep keys 2 and 3 identical |
| Look further down at the end | last key's `elevation` (64; >80 degenerates) |
| Explode further | `GAP_RATIO` in `axisLayout.ts` |
| Stop it recompacting | `RECOMPACT` in `timeline.ts` → 0 |
| Change fan distance | `SCATTER_DISTANCE` in `skillParts.ts` |
| Label more skills | `MAX_PARTS` in `skillParts.ts` |
| Change colours | `theme.ts` **and** `tokens.css` — WebGL can't read CSS vars |
| Heavier lines | `stroke.opacity` in `Gear.tsx`. `linewidth` does nothing on most platforms — a WebGL limitation |
| Faster hover response | `HOVER_RATE` in `Gear.tsx` |

### Adding a part type, in full

1. Write the builder in `builders.ts`. Return geometry **centred on the
   origin**, spin axis **+Z**. Use `between(rand, …)` for any dimension you
   want to vary between instances.
2. Add it to the `BUILDERS` object at the bottom of the file.
3. Reference the name in `assembly.ts`.

`builders.test.ts` runs over every archetype automatically — it will catch
off-centre geometry, wrong orientation, and movers that aren't centred.

### Working on it

```sh
pnpm dev     # http://localhost:5173
pnpm test    # 310 tests; the maths is all pure functions
```

The geometry, layout, motion, timeline, orientation and camera maths are pure
and covered. **If you change a constant and a test fails, read the test first** —
several encode constraints that aren't obvious from the code:

- the camera must never run backwards, and must hold still through the twist
- the column must stay in frame at every pose
- the tick must never run backwards and must dwell
- parts must be centred on their own origin

Those tests exist because each one is a bug that actually happened.
