import { useFrame, useThree } from '@react-three/fiber';
import { useMemo } from 'react';
import { MathUtils, Vector3 } from 'three';
import { CAMERA_PATH, cameraAt, framingDistance, posePosition } from './cameraPath';
import { SCATTER_DISTANCE } from './skillParts';
import { actProgress, explodeAmount, stage } from './timeline';

/** How quickly the camera catches up to the scroll position. */
const SMOOTHING = 6;

/** The two orientations the machine passes between as it stands up. */
const FLAT = { x: 1, y: 0, z: 0 };
const UPRIGHT = { x: 0, y: 1, z: 0 };

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
 * There is no orbit control — the pose comes from the shot list in cameraPath,
 * and the distance is derived from how wide the machine actually reads from that
 * angle, so it holds its size in frame whether it is closed up and broadside or
 * spread out and near end-on. Positions are damped rather than set outright, so a
 * jumpy scroll wheel still reads as a smooth move.
 */
export function ScrollCamera({ assembledLength, explodedLength, diameter, fov, margin }: Props) {
  const aspect = useThree((s) => s.size.width / s.size.height);
  const desired = useMemo(() => new Vector3(), []);

  useFrame(({ camera }, dt) => {
    const progress = explodeAmount(stage.current);
    const pose = cameraAt(CAMERA_PATH, progress);
    const length = assembledLength + (explodedLength - assembledLength) * progress;
    // The fan widens the machine around its middle; the frame has to allow for
    // it without treating it as extra length.
    const spread = SCATTER_DISTANCE * actProgress(stage.current, 'scatter') + diameter / 2;
    // Framed for whichever way round the machine needs more room, rather than
    // for the way it happens to be facing. Otherwise the twist would dolly the
    // camera in and out, and standing up would stop reading as one rotation.
    const distance = Math.max(
      framingDistance(pose, FLAT, length, diameter, fov, aspect, margin, spread),
      framingDistance(pose, UPRIGHT, length, diameter, fov, aspect, margin, spread),
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
