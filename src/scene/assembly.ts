import type { PartMotion } from './motion';
import type { PartName } from './parts';

export interface AssemblyLayer {
  /** Stable key for the layer, used to look up its geometry, label and filter. */
  id: string;
  /** Which form the layer is drawn as. */
  name: PartName;
  /** What the layer is called on screen. */
  label: string;
  /** What occupies it. These are the words a reader is here for, so keep them real. */
  tech: string[];
  /** Highlight colour when hovered or selected. */
  color: string;
  radius: number;
  motion: PartMotion;
}

/**
 * The stack, bottom to top.
 *
 * Index 0 sits at the far -Y end, so the array runs foundation upward:
 * delivery carries the data, the models sit on the data, the services sit above
 * them, and the interface is the surface a user actually touches.
 *
 * Nothing rotates. A stack that spins reads as a machine again, and the whole
 * point of this layer being a slab rather than a gear is that it is a layer. The
 * life comes from the movers inside each one — tiles mounting, work crossing the
 * service rails, a platter turning, a pulse crossing the lattice, a container
 * lifting clear — all of which travel along the stack axis, so they stay legible
 * from the overhead angle the animation ends on.
 */
export const ASSEMBLY: AssemblyLayer[] = [
  {
    id: 'delivery',
    name: 'deliveryCrates',
    label: 'Delivery',
    tech: ['Docker', 'Vercel', 'CI'],
    color: '#3fbfb0',
    radius: 1.18,
    motion: { kind: 'still' },
  },
  {
    id: 'data',
    name: 'dataDiscs',
    label: 'Data',
    tech: ['MongoDB', 'Redis'],
    color: '#c58cff',
    radius: 1.28,
    motion: { kind: 'still' },
  },
  {
    id: 'models',
    name: 'modelLattice',
    label: 'Models',
    tech: ['Python', 'NumPy', 'pandas'],
    color: '#ffa64d',
    radius: 1.38,
    motion: { kind: 'rock', degrees: 4, hz: 0.1 },
  },
  {
    id: 'services',
    name: 'serviceBoard',
    label: 'Services',
    tech: ['Node', 'Express', 'Go'],
    color: '#5fd67a',
    radius: 1.42,
    motion: { kind: 'still' },
  },
  {
    id: 'interface',
    name: 'interfacePlate',
    label: 'Interface',
    tech: ['TypeScript', 'React', 'Next.js'],
    color: '#4fa3ff',
    radius: 1.5,
    motion: { kind: 'rock', degrees: 3, hz: 0.14 },
  },
];

export const layerById: Record<string, AssemblyLayer> = Object.fromEntries(
  ASSEMBLY.map((layer) => [layer.id, layer]),
);
