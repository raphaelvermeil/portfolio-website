import { PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { CAMERA_PATH, cameraAt, framingDistance, posePosition, type CameraKey } from './cameraPath';
import { ACTS } from './timeline';

const path: CameraKey[] = [
  { at: 0, azimuth: 0, elevation: 0, distance: 1 },
  { at: 0.5, azimuth: 90, elevation: 20, distance: 2 },
  { at: 1, azimuth: 180, elevation: 0, distance: 1 },
];

describe('cameraAt', () => {
  it('sits exactly on a key at its own progress', () => {
    expect(cameraAt(path, 0)).toEqual({ azimuth: 0, elevation: 0, distance: 1 });
    expect(cameraAt(path, 0.5)).toEqual({ azimuth: 90, elevation: 20, distance: 2 });
    expect(cameraAt(path, 1)).toEqual({ azimuth: 180, elevation: 0, distance: 1 });
  });

  it('interpolates between keys', () => {
    const mid = cameraAt(path, 0.25);
    expect(mid.azimuth).toBeGreaterThan(0);
    expect(mid.azimuth).toBeLessThan(90);
    expect(mid.distance).toBeGreaterThan(1);
  });

  it('eases rather than running linearly', () => {
    // Smoothstep is flat at the ends, so a quarter in covers less than a quarter of the way.
    expect(cameraAt(path, 0.0625).azimuth).toBeLessThan(90 * 0.125);
  });

  it('clamps outside the range', () => {
    expect(cameraAt(path, -3)).toEqual(cameraAt(path, 0));
    expect(cameraAt(path, 7)).toEqual(cameraAt(path, 1));
  });

  it('moves continuously across key boundaries', () => {
    let previous = cameraAt(path, 0);
    for (let p = 0.01; p <= 1; p += 0.01) {
      const pose = cameraAt(path, p);
      expect(Math.abs(pose.azimuth - previous.azimuth)).toBeLessThan(6);
      expect(Math.abs(pose.elevation - previous.elevation)).toBeLessThan(6);
      previous = pose;
    }
  });

  it('survives a degenerate path', () => {
    expect(cameraAt([], 0.4)).toEqual({ azimuth: 0, elevation: 0, distance: 1 });
    const single: CameraKey[] = [{ at: 0, azimuth: 5, elevation: 5, distance: 1 }];
    expect(cameraAt(single, 0.9)).toEqual({ azimuth: 5, elevation: 5, distance: 1 });
  });
});

describe('CAMERA_PATH', () => {
  it('runs from 0 to 1 in order', () => {
    expect(CAMERA_PATH[0].at).toBe(0);
    expect(CAMERA_PATH[CAMERA_PATH.length - 1].at).toBe(1);
    for (let i = 1; i < CAMERA_PATH.length; i++) expect(CAMERA_PATH[i].at).toBeGreaterThan(CAMERA_PATH[i - 1].at);
  });

  it('turns the machine a long way without ever facing straight down the axis', () => {
    const azimuths = CAMERA_PATH.map((k) => k.azimuth);
    expect(Math.max(...azimuths) - Math.min(...azimuths)).toBeGreaterThan(60);
    // 90 degrees is exactly end-on, where the assembly collapses to a single disc.
    for (const a of azimuths) expect(Math.abs(a)).toBeLessThan(90);
  });

  it('swings and rises without ever running backwards', () => {
    const azimuths = CAMERA_PATH.map((k) => k.azimuth);
    const elevations = CAMERA_PATH.map((k) => k.elevation);
    expect(azimuths).toEqual([...azimuths].sort((a, b) => a - b));
    expect(elevations).toEqual([...elevations].sort((a, b) => a - b));
  });

  it('starts broadside and low', () => {
    expect(Math.abs(CAMERA_PATH[0].azimuth)).toBeLessThan(45);
    expect(CAMERA_PATH[0].elevation).toBeLessThan(15);
  });

  it('finishes looking down into the stack, short of straight overhead', () => {
    const last = CAMERA_PATH[CAMERA_PATH.length - 1];
    expect(last.elevation).toBeGreaterThan(45);
    // At 90 the column foreshortens to a point and the camera's up vector
    // lines up with the axis it is trying to look along.
    expect(last.elevation).toBeLessThan(80);
  });

  it('is already looking down into the stack when the parts step off it', () => {
    expect(cameraAt(CAMERA_PATH, ACTS.scatter[0]).elevation).toBeGreaterThan(45);
  });

  it('holds that view for the whole separation, never dropping back level', () => {
    for (let p = ACTS.scatter[0]; p <= ACTS.scatter[1]; p += 0.02) {
      expect(cameraAt(CAMERA_PATH, p).elevation).toBeGreaterThan(45);
    }
  });

  it('leaves the column standing vertical on screen at every pose', () => {
    // Projected through a real camera: two points on the machine's upright axis
    // must land on the same screen x, or the column leans.
    const camera = new PerspectiveCamera(22, 1.6, 0.1, 500);
    const top = new Vector3();
    const bottom = new Vector3();

    for (let p = 0; p <= 1; p += 0.02) {
      const pose = cameraAt(CAMERA_PATH, p);
      camera.position.set(...posePosition(pose, 30));
      camera.lookAt(0, 0, 0);
      camera.updateMatrixWorld(true);

      top.set(0, 6, 0).project(camera);
      bottom.set(0, -6, 0).project(camera);

      expect(top.x).toBeCloseTo(bottom.x, 6);
      expect(top.y).toBeGreaterThan(bottom.y);
    }
  });
});

describe('posePosition', () => {
  it('places the camera broadside at zero azimuth', () => {
    const [x, y, z] = posePosition({ azimuth: 0, elevation: 0, distance: 1 }, 10);
    expect(x).toBeCloseTo(0, 6);
    expect(y).toBeCloseTo(0, 6);
    expect(z).toBeCloseTo(10, 6);
  });

  it('places it on the machine axis at ninety degrees', () => {
    const [x, y, z] = posePosition({ azimuth: 90, elevation: 0, distance: 1 }, 10);
    expect(x).toBeCloseTo(10, 6);
    expect(z).toBeCloseTo(0, 6);
    expect(y).toBeCloseTo(0, 6);
  });

  it('raises the camera with elevation and keeps the distance', () => {
    const [, y] = posePosition({ azimuth: 0, elevation: 30, distance: 1 }, 10);
    expect(y).toBeCloseTo(5, 6);
    const [x2, y2, z2] = posePosition({ azimuth: 40, elevation: -20, distance: 1 }, 12);
    expect(Math.hypot(x2, y2, z2)).toBeCloseTo(12, 6);
    expect(y2).toBeLessThan(0);
  });
});

describe('framingDistance', () => {
  const LENGTH = 15;
  const DIAMETER = 3.2;
  const FOV = 22;
  const ASPECT = 1.6;
  const pose = (azimuth: number, elevation = 0, distance = 1) => ({ azimuth, elevation, distance });
  const fit = (p: ReturnType<typeof pose>) => framingDistance(p, LENGTH, DIAMETER, FOV, ASPECT, 1);

  /**
   * Half-extents of the upright machine on screen, as fractions of the frame,
   * measured at the closest the geometry comes to the camera — which is what
   * actually decides whether it overflows.
   */
  function onScreen(p: ReturnType<typeof pose>, distance: number, spread = 0) {
    const el = (p.elevation * Math.PI) / 180;
    const tanV = Math.tan((FOV * Math.PI) / 180 / 2);
    const halfH =
      Math.max((LENGTH / 2) * Math.abs(Math.cos(el)), spread * Math.abs(Math.sin(el))) + DIAMETER / 2;
    const halfW = Math.max(spread, DIAMETER / 2);
    const near = distance - ((LENGTH / 2) * Math.abs(Math.sin(el)) + DIAMETER / 2);
    return {
      widthRatio: halfW / (near * tanV * ASPECT),
      heightRatio: halfH / (near * tanV),
    };
  }

  it('fits the machine exactly at margin 1, level with the stack', () => {
    const p = pose(0);
    const { widthRatio, heightRatio } = onScreen(p, fit(p));
    expect(Math.max(widthRatio, heightRatio)).toBeCloseTo(1, 6);
  });

  it('stands further back than foreshortening alone would suggest', () => {
    // Fitting only the flattened height would let the camera creep in until the
    // near end of the tilted column magnified past the top of the frame.
    const el = (60 * Math.PI) / 180;
    const flattened = ((LENGTH / 2) * Math.cos(el) + DIAMETER / 2) / Math.tan((FOV * Math.PI) / 360);
    expect(fit(pose(0, 60))).toBeGreaterThan(flattened);
  });

  it('keeps the machine inside the frame at every pose on the path', () => {
    for (let t = 0; t <= 1; t += 0.02) {
      const p = cameraAt(CAMERA_PATH, t);
      const d = framingDistance(p, LENGTH, DIAMETER, FOV, ASPECT);
      const { widthRatio, heightRatio } = onScreen(p, d);
      expect(Math.max(widthRatio, heightRatio)).toBeLessThanOrEqual(1);
    }
  });

  it('keeps the fanned-out parts in frame too', () => {
    const SPREAD = 4.1;
    for (let t = 0; t <= 1; t += 0.02) {
      const p = cameraAt(CAMERA_PATH, t);
      const d = framingDistance(p, LENGTH, DIAMETER, FOV, ASPECT, 1.12, SPREAD);
      const { widthRatio, heightRatio } = onScreen(p, d, SPREAD);
      expect(Math.max(widthRatio, heightRatio)).toBeLessThanOrEqual(1);
    }
  });

  it('does not treat the fan as extra length', () => {
    // A fan around the middle must cost less than the same reach added to the ends.
    const withFan = framingDistance(pose(0, 60), LENGTH, DIAMETER, FOV, ASPECT, 1, 4);
    const asLength = framingDistance(pose(0, 60), LENGTH + 8, DIAMETER, FOV, ASPECT, 1);
    expect(withFan).toBeLessThan(asLength);
  });

  it('ignores azimuth, since an upright column is the same width all round', () => {
    expect(fit(pose(70, 20))).toBeCloseTo(fit(pose(-15, 20)), 9);
  });

  it('never collapses onto the machine when looking straight down it', () => {
    expect(fit(pose(0, 90))).toBeGreaterThan(DIAMETER / 2);
  });

  it('scales with the pose distance multiplier and the margin', () => {
    expect(fit(pose(0, 0, 2))).toBeCloseTo(fit(pose(0)) * 2, 6);
    expect(framingDistance(pose(0), LENGTH, DIAMETER, FOV, ASPECT, 1.5)).toBeCloseTo(fit(pose(0)) * 1.5, 6);
  });
});
