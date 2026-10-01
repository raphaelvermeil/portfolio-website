# The stack: everything about the 3D

A complete guide to the stack — the geometry, the animation, the scroll
mechanism, the DOM around it and the data feeding it.

> The scene used to draw a clockwork machine of eighteen gears. It was replaced
> because viewers kept asking why a software engineer was showing gears: only
> five of the eighteen parts carried a label, and those labels pinned a language
> to a part by array index, so the drawing asserted something it could not back
> up. The subject is now a five-layer stack, where every layer is labelled and
> the label is true. The engine underneath — timeline, camera, layout, twist,
> renderer — did not change.

Read sections 1–4 before changing anything: the file map, how a frame happens,
the scroll mechanism and the coordinate frames. Section 17 is a cookbook.

---

## 1. Every file involved

> **The files are still called `machine`.** `machine.ts`, `MachineScene.tsx`,
> `MachineSection.tsx`, `Gear.tsx`, the `.machine` CSS class and the `#machine`
> anchor all kept their names through the redesign: renaming them would have
> churned every import and the URL fragment for no behavioural gain. Read
> "machine" in an identifier as "the 3D object", whatever it currently draws.

### The scene — `src/scene/`

| File | Lines | Does |
|---|---|---|
| `timeline.ts` | 123 | **The clock.** Scroll → named acts. Everything reads this. |
| `theme.ts` | 15 | Scene colours + the edge-detection threshold |
| `parts/builders.ts` | 311 | 5 layer forms, built from three.js primitives |
| `parts/index.ts` | 12 | `buildPart(name, radius, seed)` |
| `assembly.ts` | 83 | **The design.** The five layers: form, label, tech, colour. |
| `machine.ts` | 54 | Wiring: builds every layer once, measures, lays out |
| `axisLayout.ts` | 122 | Position of each part along the axis |
| `orientation.ts` | 27 | The flat → upright twist |
| `motion.ts` | 58 | How parts and sub-parts move over time |
| `skillParts.ts` | 51 | Which way each layer flies off |
| `cameraPath.ts` | ~190 | Shot list + framing maths + the per-frame camera |
| `MachineScene.tsx` | 101 | The `<Canvas>`; assembles everything |
| `Gear.tsx` | 177 | Renders one layer, runs its motion each frame |
| `ScrollCamera.tsx` | 53 | Damps the camera toward the computed pose |
| `SkillCallouts.tsx` | 80 | Floating layer labels |

### The DOM around it — `src/ui/`

| File | Does |
|---|---|
| `MachineSection.tsx` | The `<section>`: sticky frame, WebGL check, keyboard cycling |
| `TitleCard.tsx` | Act 1 — the big type, fades out on scroll |
| `HeroOverlay.tsx` | Nav + the chrome that fades with the stack |
| `SkillsPanel.tsx` | The dark "The stack" read-out, with repo counts per layer |
| `Scrubber.tsx` | The ruler progress bar |

### Supporting — `src/lib/`

Only the files the scene actually touches; `src/lib/` also holds the
router, markdown and reveal code the rest of the page uses.

| File | Does |
|---|---|
| `store.ts` | zustand: `hovered`, `selected`, `hasInteracted` |
| `skills.ts` | Languages by share of bytes → the labels and the read-out |
| `palette.ts` | Language → colour |
| `data.ts` | Loads `projects.json` / `languages.json`, applies the overrides |
| `layerRepos.ts` | Which repos belong to a layer, on each repo's own evidence |
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
   for each of the 5 layers in ASSEMBLY:
     buildPart()     builds the geometry (seeded by layer id)
     axialDepth()    measures it, including mover travel
   axisLayout()      computes assembled + exploded positions
   exports: partById, placements, motionById, lengths, diameter
   ↓
scene/skillParts.ts  fans every layer off the axis, each with its label
   ↓
MachineSection       hasWebGL() ? <Canvas> : <StaticProjects>
```

Geometry is built **once at import**, not per render. `Gear` looks its geometry
up in `partById` rather than building anything.

Note what is *not* in this chain: the repo list. The stack's shape owes nothing
to `projects.json` — only the project-grid filter does, and that is computed in
the UI, not here.

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
                stroke.color = hovered ? layer colour : ink
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
| **World** | the stack tips between +Y and +X | `orientation.ts`, via `MachineRoot` |

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

- **`plate(half, thickness)`** — a layer's square base.
- **`block(w, h, d, x, y, z)`** — a box placed in the layer's design space. The
  workhorse: panels, service blocks, rails, lattice nodes, crate walls.
- **`openBox(span, height, thickness)`** — four walls and a floor; a crate.
- **`toZAxis(g)`** — three builds cylinders around **+Y**; we need **+Z**.
- **`ring(count, geometry, place)`** — N copies evenly around the axis.
- **`atAngle(angle, distance, tilt)`** — the placement matrix `ring` wants.
- **`merge(parts)`** — welds sub-forms together and **recentres on the bounding
  box**.
- **`assemble(parts, movers)`** — the one to use. See below.
- **`between(rand, lo, hi)` / `countBetween(…)`** — a dimension from the seeded
  PRNG.

### `assemble()` exists because `merge()` recentres

A layer is built upward off a base plate, so it is never symmetric about its own
bounding box, and `merge` shifts it. Movers are positioned in the *same design
space*, so they need the identical shift or they float off their mountings.
`assemble` measures the body's centre before merging and applies that shift to
every mover.

The error is small enough to survive a visual check — a tile hovering 0.012
above a 0.07-thick plate looks fine — which is exactly why there is a test
(`keeps movers flush with the body after recentring`) rather than an eyeball.

### `RADIAL_SEGMENTS = 36` and `EDGE_THRESHOLD_DEG = 24` are a pair

36 segments → adjacent facets meet at 10°, below the 24° edge threshold, so
seams aren't drawn. Drop the segments and every seam appears: the form turns
into netting instead of a machined solid. Change one, reconsider the other.

**This bites any curved primitive.** The model lattice originally used
`SphereGeometry(r, 10, 8)` for its nodes, whose facets meet at up to 36° — above
the threshold, so every one was drawn and each node rendered as a scribble. They
are boxes now. A sphere needs 16×12 segments before it draws clean.

### `PLATE = 0.72`

Half-width of a layer's plate as a share of its nominal radius. The camera frames
the stack as a *cylinder* of radius `max(radius)`, so a square plate has to fit
inside that circle: at 0.72 its corners reach `0.72·√2 ≈ 1.02` radii, which the
framing margin absorbs. Raise it and the corners clip out of frame.

### The 5 layer forms

| Name | Made from | Movers |
|---|---|---|
| `interfacePlate` | plate + header bar + sidebar + tile grid | 2 tiles lift off the surface |
| `serviceBoard` | plate + 4 blocks + crossed rails | 3 cubes rise off the rails |
| `dataDiscs` | spindle + stacked platters | top platter turns |
| `modelLattice` | plate + radial web + ranks of nodes | 3 ranks, a pulse travelling outward |
| `deliveryCrates` | pallet + open crate | inner container lifts clear |

`dataDiscs` is the only round one. That is deliberate: a stack of platters is
what a database has looked like for fifty years, so the roundness is carrying
meaning rather than inherited from the gear design.

### Movers

Every layer returns `{ body, movers[] }` — sub-assemblies that move
**independently of the layer around them**:

```ts
{ geometry,            // centred on its own origin
  offset: [x, y, z],   // where it sits within the layer
  motion }             // reciprocate | spin
```

**Movers translate along the stack axis only** (`position.z` in part-local
space, which the layout turns into world +Y). That is not a limitation worth
fixing: a mover rising *out of* its layer stays legible from the overhead angle
the animation ends on, where in-plane sliding would be hidden edge-on early and
ambiguous later.

### `parts/index.ts`

```ts
buildPart(name, radius, seed)   // seed is a string: hashed → mulberry32
```

Same seed, same form, forever. The seed is `${name}-${layerId}`.

---

## 7. The design — `assembly.ts`

**Edit this first.** Five entries, bottom of the stack to top:

```ts
{
  id: 'services',
  name: 'serviceBoard',
  label: 'Services',
  tech: ['Node', 'Express', 'Go'],
  color: '#5fd67a',
  radius: 1.42,
  motion: { kind: 'still' },
}
```

`tech` is the load-bearing field. It is what the callout says, what the read-out
lists, **and** what the project grid filters on — so it has to name things your
repos actually contain. `layerRepos.ts` checks it against each repo's languages
and readme; a tech nothing matches silently shrinks that layer's filter to
nothing, which is why there is a test over the real data.

**Index 0 is the bottom** (`axisLayout` places it at the most negative offset),
so the array runs foundation upward: delivery carries the data, the models sit
on the data, the services above them, the interface on top. A test pins that
order, because it is the argument the drawing makes.

**Nothing spins.** `spin` and `tick` are gear verbs; a layer that rotates about
the stack axis reads as a machine again and undoes the whole point of the shape.
Two layers `rock` by 3–4° so the stack is not dead, and everything else is
`still` — the life comes from the movers inside each layer. A test enforces it.

`machine.ts` then wires it up, and does two things worth knowing:

- **Builds each layer once**, into `partById`.
- **Measures real depth** (`axialDepth`), including mover travel, so the layout
  can space layers without overlap.

---

## 8. Positions — `axisLayout.ts`

Every part gets **two** offsets along the axis:

- `assembled` — faces seated, `(depthA + depthB)/2 + 0.05` apart
- `exploded` — `max(GAP_MIN 0.62, maxDepth × GAP_RATIO 1.6)` apart

`axisOffset(placement, explode)` interpolates. Both sets are centred on the
origin, so the stack never drifts as it opens.

---

## 9. The twist — `orientation.ts`

27 lines. The load-bearing one:

```ts
const START = new Quaternion().setFromUnitVectors(LOCAL_AXIS, LAID_DOWN);
```

+Y onto +X is a quarter turn about Z **and nothing else**, so the stack
stands up in the plane of the screen. `machineQuaternion(p)` slerps to
identity; `MachineRoot` applies it.

**Why the stack turns rather than the camera flying around it:** a
world-vertical line lies in the plane spanned by the camera's forward and up
vectors, so with `up` at world up it projects to a *vertical screen line from
any angle*. The column cannot lean. Three earlier attempts aimed the camera at
a horizontal assembly and it leaned every time.

---

## 10. Movement — `motion.ts`

Pure functions of elapsed seconds. No state.

```ts
// whole layer, about the stack axis
{ kind: 'still' }                                  // what layers mostly are
{ kind: 'rock',  degrees: 4, hz: 0.1 }             // a breath, not a rotation
{ kind: 'spin',  turnsPerSecond: 0.5 }             // unused — see below
{ kind: 'tick',  steps: 20, ticksPerSecond: 1 }    // unused — see below

// a mover within a layer
{ kind: 'reciprocate', travel: 0.1, hz: 0.45, phase: 0.33 }
{ kind: 'spin', turnsPerSecond: 0.18 }
```

`spin` and `tick` still work and are still tested; the stack simply doesn't use
them, because a layer that rotates about the stack axis reads as a machine
again. They are kept for movers (the data platter spins) and in case a later
subject wants them.

`SNAP_FRACTION = 0.18`, for `tick`: the step lands in the first 18% of the beat
and the other 82% is **dwell**. That dwell is the whole effect — without it a
tick is just a stuttery spin.

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

**`framingDistance()`** works out how far back to stand. It models the stack
as a cylinder and projects its axis onto the camera's right/up/forward. Three
things it gets right that a naive version doesn't:

1. **Which screen dimension binds** — a tilted stack can overflow vertically
   while fitting horizontally.
2. **The near end magnifies** — fit against the close end, not the centre.
3. **The fan widens without lengthening** — scattered layers sit mid-column.

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

**`skillParts.ts`** fans all five layers off the axis, each with its own label —
nothing on screen is unlabelled. `SCATTER_DISTANCE = 3.4` is how far they
travel; it is larger than the gear design's 2.5 because a layer is a square
roughly 2.1 across where a gear was a disc barely 1 wide, and at 2.5 the corners
overlapped.

`Gear` reads `scatterById` to move a layer; `SkillCallouts` renders the label at
`direction × 2.3` plus `0.5` up, fading in between scatter 0.25 (`APPEAR_AT`)
and 0.5 (`FULL_AT`).

> **Why mostly outward and barely up.** By the time labels appear the camera is
> 64° overhead, so a world-vertical offset foreshortens to under half its length
> on screen while a horizontal one projects at nearly full length. Lifting
> labels vertically looks like the obvious fix and does almost nothing.

The label is two lines — name above, technologies below — because a centred
one-line label is wide enough that its left half reaches back over the plate it
names. The `Html` has no `distanceFactor`, so labels stay **constant screen
size**: they are interface, not scenery.

**`SkillsPanel`** is the dark read-out. It lists the five layers top-down with
their technologies and **how many repos each matches** — the honest number from
`layerRepos.ts`, not a share of bytes.

> It used to show languages by share of committed bytes, which made Jupyter
> Notebook the largest "skill" at 44%. That came from one repo, because
> notebooks embed their output images as base64. Byte share flatters whichever
> language checks in the largest files.

**`HeroOverlay`** holds the nav (always visible) and `.hero__chrome`, which
fades with the stack. Inside: `SkillsPanel` and `Scrubber`. Nav links scroll
their section into view via JS — they deliberately don't write the hash, which
the router owns.

**`TitleCard`** is act 1, fading on `typeOut`.

---

## 14. State — `lib/store.ts`

Deliberately tiny:

```ts
hovered: string | null        // layer under the cursor
selected: string | null       // clicked layer; filters the project grid
hasInteracted: boolean        // retires the scroll hint
```

**Scroll position is *not* in here.** It changes every frame and is read inside
`useFrame`; putting it in the store would re-render the whole scene each frame.
That's why `stage` is a plain mutable ref.

**There is no separate filter field.** Selecting a layer *is* the filter, so
`Projects` reads `selected` directly — and clearing it is already wired to Esc
and to `onPointerMissed` (clicking empty space in the canvas).

---

## 15. Data feeding it

```
GitHub API → scripts/fetch-github.ts → src/data/projects.json   (committed)
                                     → src/data/languages.json  (committed)
                                            ↓
content/projects.yml ─→ overrides.ts ─→ lib/data.ts   (applied at load, not build)
                                            ↓
                   ASSEMBLY[].tech  ─→ lib/layerRepos.ts ─→ reposForLayer()
                                            ↓
                      SkillsPanel (counts)  +  Projects (the filter)
```

**The stack's geometry owes nothing to the repo list.** `assembly.ts` is
hand-written. The data only decides *which repos a layer matches*.

### `layerRepos.ts` — how a repo joins a layer

Two sources of evidence, deliberately different in strictness:

- **Languages** — structured data from the API, so an exact key match either way
  on casing is safe.
- **Readme and blurb prose** — whole-word, and case-insensitive *except* for
  names in `CASE_SENSITIVE_IN_PROSE` (`Go`, `C`, `CI`, `Node`), which are also
  ordinary English.

Both halves of that rule are load-bearing and both are tested. Case-insensitive
everywhere reads "each node of the tree" as Node and "going" as Go.
Case-sensitive everywhere misses `docker-compose`, which is how one repo
actually mentions Docker.

A repo can belong to several layers, because it does — ECSEGAMES is Interface,
Services and Data.

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
| Rename a layer, or change what it claims | its `label` / `tech` in `assembly.ts` |
| Reorder the stack | reorder `ASSEMBLY` (index 0 is the bottom) — update the order test |
| Make a layer bigger | its `radius` in `assembly.ts` |
| Change a layer's colour | its `color` in `assembly.ts` |
| Change how a layer moves | its `motion` in `assembly.ts` (don't use `spin`) |
| Change what moves *inside* a layer | its builder's `movers` in `builders.ts` |
| Add a sixth layer | builder in `builders.ts` → `BUILDERS` → an `ASSEMBLY` entry |
| Fix a layer matching the wrong repos | its `tech` in `assembly.ts`; the rule is in `layerRepos.ts` |
| Retime the choreography | `ACTS` in `timeline.ts` |
| Make the whole thing slower | `.machine { height: 420svh }` in `global.css` |
| Change the camera's path | `CAMERA_PATH` — keep keys 2 and 3 identical |
| Look further down at the end | last key's `elevation` (64; >80 degenerates) |
| Explode further | `GAP_RATIO` in `axisLayout.ts` |
| Stop it recompacting | `RECOMPACT` in `timeline.ts` → 0 |
| Change fan distance | `SCATTER_DISTANCE` in `skillParts.ts` |
| Move the labels | `LABEL_OUT` / `LABEL_UP` in `SkillCallouts.tsx` (outward does the work) |
| Change colours | `theme.ts` **and** `tokens.css` — WebGL can't read CSS vars |
| Heavier lines | `stroke.opacity` in `Gear.tsx`. `linewidth` does nothing on most platforms — a WebGL limitation |
| Faster hover response | `HOVER_RATE` in `Gear.tsx` |

### Adding a layer, in full

1. Write the builder in `builders.ts`. Finish with **`assemble(parts, movers)`**,
   not `merge` — it keeps movers aligned with the recentred body. Keep it
   flat: the test requires depth under half the width.
2. Add it to the `BUILDERS` object at the bottom of the file.
3. Add an `ASSEMBLY` entry with an `id`, `label`, `tech`, `color`, `radius` and
   `motion`.
4. Update the order test in `parts/index.test.ts`, which pins the stack's
   sequence on purpose.

`builders.test.ts` runs over every form automatically — it will catch
off-centre geometry, a layer too thick to read as a layer, geometry overflowing
its framing radius, and movers that aren't centred.

### Working on it

```sh
pnpm dev     # http://localhost:5173
pnpm test    # 242 tests; the maths is all pure functions
```

The geometry, layout, motion, timeline, orientation, camera maths and
repo-matching are pure and covered. **If you change a constant and a test fails,
read the test first** — several encode constraints that aren't obvious from the
code:

- the camera must never run backwards, and must hold still through the twist
- the column must stay in frame at every pose
- no layer may spin about the stack axis
- every layer must match at least one repo, or its filter shows an empty grid
- movers must stay flush with the body after it is recentred
- the tick must never run backwards and must dwell
- parts must be centred on their own origin

Those tests exist because each one is a bug that actually happened.
