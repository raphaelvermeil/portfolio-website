import { useFrame, useThree } from '@react-three/fiber';
import { useMemo } from 'react';
import { MathUtils, Vector3 } from 'three';
import { cameraStateFor, posePosition } from './cameraPath';
import { SCATTER_DISTANCE } from './skillParts';
import { actProgress, explodeAmount, stage } from './timeline';

/** How quickly the camera catches up to the scroll position. */
const SMOOTHING = 6;

interface Props {
  /** Axial extent closed up. */
  assembledLength: number;
  /** Axial extent pulled fully apart. */
  explodedLength: number;
  /** Widest part, across the axis. */
  diameter: number;
  /** Vertical field of view, in degrees; must match the canvas camera. */
  fov: number;
  /** Extra room left around the machine. */
  margin: number;
}

/**
 * The camera is the story: scroll position alone decides where it looks from.
 *
 * There is no orbit control. The work is all in cameraStateFor, which is pure
 * and tested; this only damps towards its answer so a jumpy scroll wheel still
 * reads as a smooth move.
 */
export function ScrollCamera({ assembledLength, explodedLength, diameter, fov, margin }: Props) {
  const aspect = useThree((s) => s.size.width / s.size.height);
  const desired = useMemo(() => new Vector3(), []);

  useFrame(({ camera }, dt) => {
    const { pose, distance } = cameraStateFor(
      stage.current,
      actProgress(stage.current, 'scatter'),
      explodeAmount(stage.current),
      { assembledLength, explodedLength, diameter, scatterDistance: SCATTER_DISTANCE, fov, aspect, margin },
    );

    const [x, y, z] = posePosition(pose, distance);
    desired.set(x, y, z);

    camera.position.x = MathUtils.damp(camera.position.x, desired.x, SMOOTHING, dt);
    camera.position.y = MathUtils.damp(camera.position.y, desired.y, SMOOTHING, dt);
    camera.position.z = MathUtils.damp(camera.position.z, desired.z, SMOOTHING, dt);
    camera.lookAt(0, 0, 0);
  });

  return null;
}
