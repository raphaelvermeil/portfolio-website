# Mechanical Brain — design

**Status:** approved, not yet built
**Date:** 2026-10-01
**Replaces:** the layered-stack subject (`redesign/stack-subject`), which itself
replaced the clockwork machine (`feat/parts-library`)

---

## 1. Why

The portfolio's 3D centrepiece was a clockwork machine of eighteen gears.
Shown to real viewers, it consistently prompted the same question: *why is a
software engineer showing gears?*

The cause was specific rather than aesthetic. Of the eighteen parts, only five
carried a label, and `planSkillParts()` pinned those languages to parts **by
array index** — `machine.ts` paired each part with a repo the same way. The
drawing asserted "this gear is TypeScript," which was true of nothing.
Interrogating the metaphor is the correct response to an unverifiable claim.

A layered stack was built as a replacement and works, but it solves the problem
by deleting the mechanical vocabulary the author likes. The mechanical brain
solves it the other way: it gives the mechanism **a reason to exist**. Gears as
cognition is a trope that reads instantly, so "why gears?" answers itself.

**The bar this must clear:** every labelled thing on screen says something true
and checkable. That is what the gear design failed and the stack passed.

---

## 2. The concept

A **cranial assembly**: an engineered skull. A ribbed hemispherical frame with
six mechanical regions mounted inside it, drawn in the existing hidden-line
technical-drawing style. It rotates, the regions separate radially in an
exploded view with labels, and the mechanism quickens the more the viewer
interacts with it.

Form was chosen over two alternatives:

- **Anatomical silhouette** (hemispheres, gyri suggested by curved gear banks) —
  highest payoff, highest risk. Hidden-line rendering has no shading, so organic
  form is hard to convey and the result can read as a lumpy pile.
- **Anatomical plate** (a sagittal cross-section drawn like a 19th-century
  engraving) — safest to read, but nearly flat, which wastes the 3D.

The dome is the balance: genuinely volumetric, native to line-art, and
recognisable as a cranium from any camera angle without needing organic folds.

---

## 3. The six regions

Each region pairs a real brain function with a domain the repos demonstrate.
No pairing is asserted; each is one a reader can check against the project grid.

| Region | Domain | Repos |
|---|---|---|
| **Logic** | Algorithms & data structures | `pathfinding`, `pathfinding2`, `caterpiller`, `quicklink` |
| **Learning** | Machine learning | `NeuralNetwork`, `neural-critters`, `McWicsHackathon`, `pandas-marketingdata-prep` |
| **Vision** | Graphics & simulation | `learn-shaders`, `BridgeOrBust`, `neural-critters` |
| **Motor** | Games & robotics | `BridgeOrBust`, `caterpiller`, `treasurehunt`, `ecse-211-robot`, `GearMeUp` |
| **Language** | Interfaces & APIs | `ECSEGAMES`, `enggames-partners`, `mern-chat-app`, `gen-z-translator`, `GearMeUp`, `fakeCodePolisher` |
| **Memory** | Data & storage | `pandas-marketingdata-prep`, `mern-chat-app`, `gen-z-translator`, `ECSEGAMES` |

### Decisions behind this taxonomy

**"Language" means interfaces, not programming languages.** The original sketch
mapped Language → Java / C++ / Python. On a brain, Language means speech; a
viewer reads the label, expects natural language, and gets a list of compilers.
That is the same unverifiable-assertion failure as the gears. Reframed as
*how the system talks to the world* — Broca's area is output, and web interfaces
are output — the word becomes honest and absorbs the six web repos, which are
the largest single domain here.

**"Learning" replaces "Creativity".** Creativity is not a brain region anyone
can point to, and "Creativity → game development" undersells game work as
non-engineering. Machine learning is four repos and the most brain-adjacent
thing in the account; a mechanical brain without a learning region leaves the
best joke on the table. Games move to Motor, where control and physics belong.

**A repo may belong to several regions**, because it does: `BridgeOrBust` is a
physics engine (Vision) inside a game (Motor). `neural-critters` is three
things at once.

**Hidden repos are excluded.** `neetcode-submissions` is an algorithms practice
log and would belong to Logic, but `content/projects.yml` hides it, so listing
it would make the filter count disagree with the grid. `gearmeup-native` and
`github-slideshow` are likewise excluded.

---

## 4. Architecture

### 4.1 The one real change: scalar placement becomes a point

This is the whole architectural delta; everything else follows from it.

Today a placement is a **scalar offset along one axis**:

```ts
// axisLayout.ts
export function axisOffset(placement: GearPlacement, explode: number): number
```

`Gear.tsx` uses the result as its Y coordinate. A dome needs a **point**, so the
same interpolation moves to 3D:

```ts
// domeLayout.ts — new
export interface SeatPlacement {
  id: string;
  region: RegionId;
  /** Where the part sits in the assembled dome. */
  assembled: [number, number, number];
  /** Where it sits pushed clear, radially outward from the brain's centre. */
  exploded: [number, number, number];
  /** Orients the part's +Z spin axis along its mounting normal. */
  quaternion: [number, number, number, number];
  radius: number;
}

export function seatPosition(
  placement: SeatPlacement,
  explode: number,
  target?: Vector3,
): Vector3;
```

Radial explosion is the natural generalisation of axial explosion and is what an
exploded assembly drawing actually looks like.

`axisLayout.ts` and its test are deleted — nothing else uses them.

### 4.2 What survives untouched

Verified against the current tree:

| File | Why it survives |
|---|---|
| `timeline.ts` | Acts are fractions of scroll; subject-agnostic |
| `motion.ts` | Pure functions of elapsed seconds |
| `theme.ts` | Colours and the edge threshold |
| `cameraPath.ts` | **Verified**: `framingDistance` with `length = 0` returns an identical distance from every pose (16.81 for radius 2.4), which is correct for a sphere. A dome is framed by passing its bounding radius and zero length. |
| `ScrollCamera.tsx` | Only damps toward `cameraStateFor`'s answer |
| `orientation.ts` | The quaternion slerp machinery is reused for the reveal rotation |
| `MachineScene.tsx` | Canvas setup; one line changes (what it maps over) |

### 4.3 Files

```
src/scene/
  domeLayout.ts        NEW  — seats parts on the dome; replaces axisLayout.ts
  brain.ts             NEW  — the design: regions, their parts, their repos
  machine.ts           EDIT — builds each part once, measures, calls domeLayout
  Gear.tsx             EDIT — reads seatPosition (a point) instead of axisOffset
  SkillCallouts.tsx    EDIT — labels anchor to region centroids, not to parts
  skillParts.ts        EDIT — region labels and their escape directions
  parts/builders.ts    EDIT — restore the 18 archetypes; add 3 frame builders
  axisLayout.ts        DELETE
  assembly.ts          DELETE (superseded by brain.ts)

src/lib/
  regionRepos.ts       NEW  — resolves a region's repo ids to projects
  layerRepos.ts        DELETE (tech-string matching cannot see a domain)

src/ui/
  SkillsPanel.tsx      EDIT — lists regions and their repo counts
  sections/Projects.tsx EDIT — filter reads the region's repo ids
```

### 4.4 Why the archetypes come back verbatim

The eighteen archetypes live on `feat/parts-library` and are restored unchanged:
`spurGear`, `ringGear`, `knurledCollar`, `lensBarrel`, `bearing`,
`boltedFlange`, `turbineHub`, `spacerRing`, `spokedWheel`, `castellatedCrown`,
`cylinderBank`, `finnedCollar`, `hexBoss`, `lobedCam`, `slottedDisc`,
`retainingRing`, `lensGroup`, `gearCluster`.

They are tested, they are the thing the author likes, and rebuilding them would
be pure loss. The helpers they need (`lathe`, `ring`, `atAngle`, `toZAxis`,
`between`, `countBetween`) come back with them.

Two helpers from the stack branch are kept because they are strictly better:

- **`assemble(parts, movers)`** — merges a body and shifts its movers by the
  same recentring, so movers cannot drift off their mountings. The stack's
  builders needed this; the frame builders will too.
- **The two-line callout** — name above, technologies below. A centred one-line
  label is wide enough that its left half reaches back over what it names.

---

## 5. Geometry

Three kinds of thing, all in the existing hidden-line style.

### 5.1 The frame — new builders

| Builder | Form |
|---|---|
| `domeRib` | One meridian rib: a flattened arc swept from base ring to crown |
| `mountingRing` | The base ring the ribs land on, with bolt bosses |
| `crownPlate` | A small bolted cap closing the top where the ribs converge |

The ribs are what make the silhouette read as a cranium at any angle, so they
are the first thing built and the first thing reviewed.

### 5.2 The regions

Six clusters of 3–5 restored archetypes, seated at hand-authored spherical
coordinates on the dome's inner surface. Archetype choice carries meaning:

| Region | Parts |
|---|---|
| Logic | `gearCluster`, `spurGear`, `lobedCam`, `spokedWheel` — meshing trains and escapements |
| Learning | `turbineHub`, `finnedCollar`, `slottedDisc` — something being processed |
| Vision | `lensGroup`, `lensBarrel`, `retainingRing` — optics |
| Motor | `cylinderBank`, `castellatedCrown`, `bearing` — pistons and drive |
| Language | `boltedFlange`, `hexBoss`, `knurledCollar`, `spacerRing` — ports and couplings |
| Memory | `slottedDisc`, `spacerRing`, `ringGear`, `retainingRing` — stacked platters |

Positions are authored in `brain.ts`, the way `ASSEMBLY` was. Reordering or
moving a region is a one-array edit.

### 5.3 Wiring

Thin lines from each region's centroid down to the mounting ring, drawn with the
same drei `<Line>` the spindle uses. They tie the regions to the frame so the
exploded view still reads as one assembly.

---

## 6. Choreography

The act *machinery* in `timeline.ts` is kept; the **spans move**, because the
brain's story is the reverse of the stack's.

The stack lay flat as an unreadable row, so it separated first and stood up
after. An intact cranium is the most striking thing in the sequence, so it has
to be seen whole, and turned, **before** it comes apart.

| Act | Span (was) | What happens |
|---|---|---|
| `typeOut` | 0.03 – 0.14 *(same)* | Oversized type clears |
| `machineIn` | 0.09 – 0.22 *(same)* | The dome fades up **intact and dormant** |
| `upright` | **0.22 – 0.42** *(was 0.40–0.56)* | The reveal rotation, still intact, camera held still |
| `explode` | **0.42 – 0.64** *(was 0.18–0.40)* | Regions separate radially out of the frame |
| `scatter` | 0.66 – 0.90 *(same)* | Region labels appear; camera has risen to look in |
| `machineOut` | 0.92 – 1.00 *(same)* | Fades out to the about text |

Two consequences the implementation must handle:

- **`CAMERA_PATH` keys move with them.** The two identical keys that freeze the
  camera through the rotation currently sit at `0.3` and `0.56`; they move to
  `0.22` and `0.42`. The key that lifts the camera to look into the assembly
  stays at `0.66`, now arriving as the regions finish separating rather than
  after a recompaction.
- **`RECOMPACT` is reconsidered.** It currently draws the axial spread back in
  during the scatter so the fanned parts leave a tight column. With the regions
  already fanned radially, pulling them back toward the centre before labelling
  them would be wrong. Expect `RECOMPACT = 0`; the test that pins camera
  monotonicity will confirm.

Act *names* are kept even though `upright` now means "the reveal rotation":
they are referenced across six files and the rename buys nothing. A comment in
`timeline.ts` records this.

The dome starts dormant because stillness is what makes the quickening legible.

---

## 7. Coming alive

The author's request: *the whole thing could slowly come alive as the user
interacts with it.*

`Gear.tsx` already multiplies its own clock by a rate:

```ts
const rate = reduced ? REDUCED_RATE : hovered ? HOVER_RATE : selected ? SELECT_RATE : 1;
```

Two additions:

1. **A global waking level.** The store gains `touched: Set<RegionId>`. The
   scene's base rate rises from `DORMANT_RATE` (0.15) toward 1 as regions are
   touched — `0.15 + 0.85 × (touched.size / 6)`. The reducer must build a *new*
   Set rather than mutating the existing one, or zustand will not notify.
   The rate itself is read inside `useFrame`, not subscribed to, so waking a
   region does not re-render the scene.
2. **Regions stay awake individually.** A region already touched runs at full
   rate even when the pointer leaves, so the brain visibly wakes region by
   region rather than all at once.

Reduced-motion users get `REDUCED_RATE` throughout and no waking ramp; the
choreography is scroll-driven and so remains user-paced either way.

This is a store counter and one multiplier — it is cheap, and it is the only
part of the design that is purely for delight.

---

## 8. Interaction and filtering

Clicking a region filters the project grid to that region's repos. This carries
over from the stack, including the filter chip with its count and "Show all".
Clearing is already wired to Esc and to `onPointerMissed`.

**The matching rule changes.** `layerRepos.ts` matched technology strings
against each repo's languages and readme prose. That cannot work here: no
language field reveals that `treasurehunt` is a game or that `pathfinding` is an
algorithms exercise. Domains are not visible in the data.

So each region declares its repo ids explicitly in `brain.ts`, seeded from the
evidence in §3. Hand-authored, but **verifiable** — and more honest than
pretending a language reveals a domain. Tests enforce that every declared id
exists, is not hidden, and that every region matches at least one visible repo.

`selected` in the store continues to serve as the filter; no new field.

---

## 9. Testing

Existing geometry invariants apply unchanged to the restored archetypes and the
new frame builders: non-empty, centred on the origin, spin axis +Z, deterministic
per seed, movers centred on their own origin, movers flush after recentring.

New:

| Test | Guards |
|---|---|
| Every region's repo ids exist in `projects.json` | A typo silently emptying a filter |
| No region lists a hidden repo | The filter count disagreeing with the grid |
| Every region matches ≥ 1 visible repo | An empty grid the UI has no state for |
| Exploded seats are all further from the centre than assembled seats | Radial explosion actually exploding |
| No two regions' seats overlap on the dome | Clusters colliding |
| Region labels fan to distinct directions | Labels stacking on each other |
| The waking level rises monotonically and clamps at 1 | The rate ramp misbehaving |

---

## 10. Risks

**Silhouette is the real risk and cannot be settled on paper.** A stack of
plates is trivially legible; a dome of gears either reads as a cranium or reads
as a pile, and hidden-line rendering has no shading to help.

**Mitigation — a kill switch.** The frame (§5.1) is built and screenshotted
*before* any region is populated. If the dome does not read as a cranium at
that point, the design is abandoned cheaply, having spent three builders rather
than a full rebuild. Nothing downstream is built until that still is approved.

**Second risk: six regions may crowd the dome.** If the clusters collide, the
fallback is four regions (Logic, Learning, Vision, Language), folding Motor into
Logic and Memory into Language. The overlap test will surface this early.

---

## 11. Out of scope

- Renaming `machine.ts`, `MachineScene.tsx`, `Gear.tsx`, the `.machine` CSS
  class or the `#machine` anchor. They keep their names; `docs/the-machine.md`
  already records that "machine" in an identifier means "the 3D object".
- Any change to the project pages, the about reveal, routing or scroll memory.
- Anatomical accuracy. The regions borrow brain *vocabulary*, not neuroanatomy;
  the spatial arrangement serves legibility.

---

## 12. Definition of done

- The dome reads as a cranium in a still, at three camera angles.
- All six regions labelled, every label true and checkable against the grid.
- Clicking a region filters the grid; counts in the read-out match the grid.
- The brain wakes as regions are touched.
- `pnpm test` green, `tsc --noEmit` clean, `vite build` clean.
- `docs/the-machine.md` updated to describe what is actually on screen.
