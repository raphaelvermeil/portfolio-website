# The machine: how the 3D works

A guide to everything under `src/scene/`. Read the first three sections before
changing anything — the conventions explain why the rest is shaped the way it
is. The last section is a cookbook for common changes.

---

## 1. The map

```
src/scene/
  timeline.ts        the clock: scroll position → named acts. Everything reads this.
  theme.ts           scene colours + the edge-detection threshold

  parts/
    builders.ts      18 part archetypes, built from three.js primitives
    index.ts         buildPart(name, radius, seed) → geometry
  gearGeometry.ts    the spur-gear tooth profile, used by several archetypes

  assembly.ts        WHICH parts, in what order, at what size, moving how
  machine.ts         wiring: builds every part once, measures it, lays it out
  axisLayout.ts      where each part sits along the axis (assembled + exploded)
  orientation.ts     the flat → upright twist
  motion.ts          how parts and sub-parts move over time
  skillParts.ts      which parts fly off the axis, and in which direction
  cameraPath.ts      the shot list + the framing maths

  MachineScene.tsx   the <Canvas>: assembles all of the above
  Gear.tsx           renders one part; runs its motion every frame
  ScrollCamera.tsx   positions the camera every frame
  SkillCallouts.tsx  the floating skill labels
```

Roughly: **data flows one way.** `assembly.ts` (your design) → `machine.ts`
(builds and measures) → `axisLayout.ts` (positions) → `Gear.tsx` (draws). The
timeline feeds everything sideways.

---

## 2. Conventions you must know

**Three coordinate frames, nested.** This trips people up, so be clear which one
you're in:

| Frame | Axis meaning | Set where |
|---|---|---|
| **Part-local** | part spins about **+Z** | every builder in `builders.ts` |
| **Machine-local** | parts stack along **+Y** | `axisLayout.ts` rotates +Z→+Y |
| **World** | machine tips between +Y and +X | `orientation.ts` via `MachineRoot` |

So a builder always makes a disc lying in the XY plane, facing +Z. The layout
stands that disc up. The root group then tips the whole stack over.

**Every builder returns geometry centred on the origin.** `merge()` enforces it
by recentring on the bounding box. If a part is off-centre it will orbit instead
of spin.

**Scene units.** Part radii run 0.6–1.6. The machine is ~7.5 units long closed
up, ~14.9 exploded, ~3.2 across. Camera distances come out around 20–45.

**Two different clocks.** Don't confuse them:
- `stage.current` — scroll position, `0..1`, drives *choreography* (explode,
  twist, scatter, camera).
- `t` in `motion.ts` — seconds, drives *mechanism* (spin, tick, pistons). Each
  part keeps its own `t` so hovering can speed it up without it jumping.

---

## 3. The clock — `timeline.ts`

`stage.current` is scroll progress through the pinned hero, `0` at the top to
`1` when the sticky frame releases. `scrollStage()` computes it; the hero's
height (`.machine { height: 420svh }` in `global.css`) is the runway.

`ACTS` cuts that into named, **overlapping** spans:

```
0.03 ─ 0.14  typeOut      big type lifts and fades
0.09 ─ 0.22  machineIn    machine fades up
0.18 ─ 0.40  explode      lying flat, parts separate along the axis
0.40 ─ 0.56  upright      the twist. Camera is frozen here.
0.66 ─ 0.90  scatter      labelled parts fly off the axis
0.92 ─ 1.00  machineOut   fades away
```

`actProgress(stage.current, 'explode')` → `0..1` within that act. That one
function is how every other file reads the clock.

The gap at **0.56–0.66** is deliberate: the camera rises there, alone.

**`explodeAmount()`** is the exception to "one act, one value". It's the axial
spread, and it *reverses*: it opens to 1 across the explode, then `RECOMPACT`
(0.82) pulls it back to ~0.18 during the scatter. That's so the parts flying
off have a tight column to fly off *from*.

---

## 4. Building a part — `parts/builders.ts`

### The helpers (top of the file)

- **`lathe(profile, segments)`** — revolves a 2D outline into a solid. The
  profile is `[radius, position-along-axis]` pairs. This is the workhorse:
  barrels, collars, races, plates.
- **`toZAxis(g)`** — three.js builds lathes/cylinders/tori around **+Y**; we
  need **+Z**. Every primitive except `TorusGeometry` and `ExtrudeGeometry`
  needs this. (Torus already lies in XY — a test caught me getting this wrong.)
- **`ring(count, geometry, place)`** — N copies evenly around the axis.
- **`atAngle(angle, distance, tilt)`** — the placement matrix `ring` usually wants.
- **`merge(parts)`** — welds sub-forms into one geometry and recentres it.
- **`between(rand, lo, hi)` / `countBetween(...)`** — pull a dimension from the
  seeded random. **This is how two parts of the same type differ.**

### `RADIAL_SEGMENTS = 36` — do not lower casually

36 segments means adjacent facets meet at 10°. `EDGE_THRESHOLD_DEG` in
`theme.ts` is 24°, so those seams are *not* drawn. Drop the segments to 20 and
every seam appears — the part turns into netting instead of a machined solid.
The two numbers are a pair.

### The 18 archetypes

| Name | Made from |
|---|---|
| `spurGear` | extruded tooth profile |
| `ringGear` | annulus with teeth cut inside |
| `knurledCollar` | waisted lathe + ridge boxes around the rim |
| `lensBarrel` | lathe with 2–3 stepped diameters |
| `bearing` | two lathed races + a ring of spheres |
| `boltedFlange` | lathed plate + bolt circle |
| `turbineHub` | cylinder hub + angled blade boxes |
| `spacerRing` | thin torus |
| `spokedWheel` | rim + teeth + spokes + hub boss |
| `castellatedCrown` | ring + square merlons *(movers)* |
| `cylinderBank` | case + sleeves + pistons *(movers)* |
| `finnedCollar` | hub + radial fin plates |
| `hexBoss` | 6-sided prism + collar + washer |
| `lobedCam` | extruded sinusoidal outline + hub |
| `slottedDisc` | plate with a ring of holes |
| `retainingRing` | thin flat annulus |
| `lensGroup` | knurled barrel + dome + grips |
| `gearCluster` | carrier + 4–6 small gears *(movers)* |

### Movers

Most builders return a plain `BufferGeometry`. Three return
`{ body, movers[] }` — sub-assemblies that move **independently of the part
around them**:

```ts
{ geometry,            // centred on its own origin, so it can spin about itself
  offset: [x, y, z],   // where it sits within the part
  motion }             // reciprocate | spin
```

That's how the engine's pistons pump and the cluster's little gears mesh.

---

## 5. The design — `assembly.ts`

**This is the file to edit first.** It's a plain list, read top to bottom as the
machine from one end to the other:

```ts
{ name: 'cylinderBank', radius: 1.5, motion: { kind: 'spin', turnsPerSecond: 0.07 } }
```

That's the whole vocabulary: which archetype, how big, how it moves. Reorder the
array and the machine reorders. The rhythm is deliberate — heavy/light
alternating so the silhouette never flattens.

`machine.ts` then does the wiring, and it's worth knowing two things it does:

- **Builds each part once** and stores it in `partById`. `Gear` reads geometry
  back rather than rebuilding.
- **Measures each part's real depth** (`axialDepth`), including piston travel,
  so the layout can space them without overlap.

> `machine.ts` also pairs each part with a repo for its label. That pairing is
> arbitrary right now — the machine is a skills showpiece, the project grid is
> the real project list.

---

## 6. Positions — `axisLayout.ts`

Every part gets **two** positions along the axis:

- `assembled` — faces seated, `(depthA + depthB)/2 + 0.05` apart
- `exploded` — pulled apart, `max(0.62, maxDepth × 1.6)` apart

`axisOffset(placement, explode)` interpolates between them. Both sets are
centred on the origin, so the machine never drifts as it opens.

Knobs: `GAP_RATIO` (1.6) and `GAP_MIN` (0.62) control how far apart it explodes.

---

## 7. The twist — `orientation.ts`

27 lines, and the most load-bearing of them is this:

```ts
const START = new Quaternion().setFromUnitVectors(LOCAL_AXIS, LAID_DOWN);
```

Turning **+Y onto +X is a quarter turn about Z and nothing else**, so the
machine stands up in the plane of the screen. `machineQuaternion(progress)`
slerps from that to identity. `MachineRoot` in `MachineScene.tsx` applies it.

**Why the machine stands upright rather than the camera flying around it:** a
world-vertical line lies in the plane spanned by the camera's forward and up
vectors, so with the camera's `up` left at world up, that line projects to a
*vertical screen line from any angle*. The column can't lean, at any pose. I
tried three times to get this by aiming the camera at a horizontal machine and
it leaned every time.

---

## 8. Movement — `motion.ts`

Pure functions of elapsed seconds. No state, fully tested.

**Part motions** (the whole part, about the machine axis):

```ts
{ kind: 'still' }
{ kind: 'spin',  turnsPerSecond: 0.5 }            // sign = direction
{ kind: 'tick',  steps: 20, ticksPerSecond: 1 }   // escapement
{ kind: 'rock',  degrees: 16, hz: 0.28 }          // balance wheel
```

**Mover motions** (sub-assemblies within a part):

```ts
{ kind: 'reciprocate', travel: 0.3, hz: 0.55, phase: 0.2 }   // pistons
{ kind: 'spin', turnsPerSecond: 0.22 }                        // cluster gears
```

The tick is the interesting one. `SNAP_FRACTION = 0.18` means the step lands in
the first 18% of each beat and the remaining 82% is **dwell**. That dwell is
what makes it read as a clock rather than a slow spin — remove it and it just
looks like a stuttery rotation.

---

## 9. The camera — `cameraPath.ts` + `ScrollCamera.tsx`

There is **no orbit control**. Scroll owns the camera completely.

`CAMERA_PATH` is a shot list of poses in spherical coordinates:

```ts
{ at: 0.56, azimuth: -14, elevation: 8, distance: 1 }
```

- **azimuth** — rotation about the vertical
- **elevation** — how far above the machine's plane; this is what decides how
  far you look *down into* the stack
- **distance** — a multiplier on the computed framing, for nudging

`cameraAt()` interpolates with smoothstep so the camera eases through each key.

**Keys 2 and 3 are identical on purpose** (`0.3` and `0.56`, both `-14°/8°`).
That's the frozen camera during the twist.

### `framingDistance()` — the fiddly bit

Works out how far back to stand. It models the machine as a cylinder and
projects its axis onto the camera's own right/up/forward vectors. Three things
it accounts for that a naive version misses:

1. **Which screen dimension binds.** A tilted machine can overflow vertically
   even when it fits horizontally.
2. **The near end magnifies.** On a tilted machine the close end is much nearer
   than the centre; fit against *that* or the top overflows.
3. **The fan widens without lengthening.** Scattered parts sit around the
   middle, so they don't stack with the column's ends.

`ScrollCamera` calls it for **both** the flat and upright orientations and takes
the larger, so the twist never dollies the camera.

---

## 10. Drawing — `Gear.tsx` + `theme.ts`

The "technical drawing" look is two tricks:

**Hidden-line removal.** Each part is filled with a mesh in **exactly the
background colour**, opaque. It contributes no tone — it just *hides what's
behind it*. The visible drawing is `EdgesGeometry` line segments over the top.
`polygonOffset` keeps the fill from z-fighting the lines.

**Selective edges.** `EdgesGeometry(geometry, 24)` draws an edge only where
faces meet at more than 24°. That keeps profile steps, tooth flanks and box
corners, and discards the 10° facets of revolved surfaces.

Per frame, `Gear` does four things:

```ts
clock.current += dt * rate;                        // its own clock; hover = ×3
slider.position.set(scatterX, axisOffset, scatterZ);
spinner.rotation.z = partAngle(motion, t);
// then each mover's own rotation + axial offset
```

One `MeshBasicMaterial` and one `LineBasicMaterial` per part, shared by the body
and all its movers, so highlighting is a single write.

---

## 11. Labels — `skillParts.ts` + `SkillCallouts.tsx`

`planSkillParts()` pins the top 5 languages (by bytes, from `lib/skills.ts`) to
parts spread along the assembly, and fans their escape directions evenly around
the axis. `SCATTER_DISTANCE = 2.5` is how far they travel.

`Gear` reads `scatterById` to move a part; `SkillCallouts` renders a drei `Html`
label above it. Labels are **constant size on screen** (no `distanceFactor`) —
they're interface, not scenery.

---

## 12. Cookbook

**Change the machine's parts or order** → `assembly.ts`. Edit the array.

**Make a part bigger** → its `radius` in `assembly.ts`.

**Change how a part moves** → its `motion` in `assembly.ts`. Try swapping a
`spin` for `{ kind: 'tick', steps: 24, ticksPerSecond: 2 }`.

**Add a new part type** →
1. Write the builder in `builders.ts`, returning geometry centred on origin,
   spin axis +Z.
2. Add it to the `BUILDERS` object at the bottom.
3. Use its name in `assembly.ts`.
Tests in `builders.test.ts` run over every archetype automatically — they'll
catch off-centre or wrongly-oriented geometry.

**Retime the choreography** → `ACTS` in `timeline.ts`. Keep them in order;
`timeline.test.ts` checks that.

**Change the camera's path** → `CAMERA_PATH` in `cameraPath.ts`. Framing adapts
automatically. Keep keys 2 and 3 identical or the twist stops being clean.

**Look further down into the stack at the end** → raise the final key's
`elevation` (currently 64). Above ~80 the maths degenerates.

**Explode further apart** → `GAP_RATIO` in `axisLayout.ts`.

**Have it stay exploded instead of recompacting** → `RECOMPACT` in
`timeline.ts`, currently 0.82. Set to 0 to disable.

**Change how far labelled parts fly out** → `SCATTER_DISTANCE` in
`skillParts.ts`. Wider isn't better: the camera has to frame the whole fan.

**Label more skills** → `MAX_PARTS` in `skillParts.ts`.

**Change the colours** → `theme.ts` *and* `styles/tokens.css`. WebGL materials
can't read CSS custom properties, so the two must move together.

**Make the lines heavier/lighter** → `stroke.opacity` in `Gear.tsx`. Note that
`LineBasicMaterial` ignores `linewidth` on most platforms — that's a WebGL
limitation, not a bug here.

**Slow everything down** → the `turnsPerSecond` values in `assembly.ts`, or
`HOVER_RATE` / `SELECT_RATE` in `Gear.tsx`.

**Lengthen the scroll** → `.machine { height: 420svh }` in `global.css`. The
acts are fractions, so they stretch with it.

### Working on it

```sh
pnpm dev     # http://localhost:5173
pnpm test    # the maths is all pure functions and well covered — run this
```

The geometry, layout, motion, timeline and camera maths are pure functions with
tests. If you change a constant and a test fails, read the test first: several
of them encode a constraint that isn't obvious from the code (the camera must
not lean, the column must stay in frame at every pose, the tick must never run
backwards).
